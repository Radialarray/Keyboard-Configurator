//! Backend spawning and management for Tauri desktop app.
//!
//! This module handles spawning the LazyQMK backend server as a child process
//! and managing its lifecycle.

use anyhow::{Context, Result};
use std::process::Stdio;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::{Child, Command};

/// Handle to a spawned backend process
pub struct BackendHandle {
    /// The child process
    child: Child,
    /// Port the backend is listening on
    pub port: u16,
}

impl BackendHandle {
    /// Stop the backend server
    pub async fn stop(mut self) -> Result<()> {
        // Try graceful shutdown first
        #[cfg(unix)]
        {
            use tokio::process::Command;
            if let Some(pid) = self.child.id() {
                let _ = Command::new("kill")
                    .args(["-TERM", &pid.to_string()])
                    .status()
                    .await;
            }
        }

        // Wait a bit for graceful shutdown
        tokio::time::sleep(std::time::Duration::from_millis(500)).await;

        // Force kill if still running
        let _ = self.child.kill().await;
        let _ = self.child.wait().await;

        Ok(())
    }
}

/// Find an available port for the backend
fn find_available_port() -> Result<u16> {
    // Try to bind to port 0 to get an available port
    let listener =
        std::net::TcpListener::bind("127.0.0.1:0").context("Failed to find available port")?;
    let port = listener.local_addr()?.port();
    drop(listener);
    Ok(port)
}

/// Spawn the backend server as a child process
///
/// This looks for the `lazyqmk-web` binary in several locations:
/// 1. Bundled with the app (in Resources on macOS, etc.)
/// 2. In PATH
/// 3. Built locally in target/release or target/debug
pub async fn spawn_backend(workspace_path: &str) -> Result<BackendHandle> {
    let port = find_available_port()?;

    // Find the backend binary
    let binary_path = find_backend_binary()?;

    // Spawn the backend process
    let mut child = Command::new(&binary_path)
        .args([
            "--host",
            "127.0.0.1",
            "--port",
            &port.to_string(),
            "--workspace",
            workspace_path,
        ])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .context(format!(
            "Failed to spawn backend process: {}",
            binary_path.display()
        ))?;

    // Wait for the backend to be ready
    wait_for_backend_ready(&mut child, port).await?;

    Ok(BackendHandle { child, port })
}

/// Find the backend binary in various locations
fn find_backend_binary() -> Result<std::path::PathBuf> {
    // First, try the bundled location (for packaged app)
    #[cfg(target_os = "macos")]
    {
        if let Ok(exe) = std::env::current_exe() {
            let bundled = exe
                .parent()
                .and_then(|p| p.parent())
                .map(|p| p.join("Resources/lazyqmk-web"));
            if let Some(path) = bundled {
                if path.exists() {
                    return Ok(path);
                }
            }
        }
    }

    #[cfg(target_os = "linux")]
    {
        if let Ok(exe) = std::env::current_exe() {
            let bundled = exe.parent().map(|p| p.join("lazyqmk-web"));
            if let Some(path) = bundled {
                if path.exists() {
                    return Ok(path);
                }
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        if let Ok(exe) = std::env::current_exe() {
            let bundled = exe.parent().map(|p| p.join("lazyqmk-web.exe"));
            if let Some(path) = bundled {
                if path.exists() {
                    return Ok(path);
                }
            }
        }
    }

    // Try PATH
    if let Ok(which) = which::which("lazyqmk-web") {
        return Ok(which);
    }

    // Try local development builds (relative to project root)
    let local_paths = [
        "../../target/release/lazyqmk-web",
        "../../target/debug/lazyqmk-web",
        "../../../target/release/lazyqmk-web",
        "../../../target/debug/lazyqmk-web",
    ];

    for path in local_paths {
        let path = std::path::PathBuf::from(path);
        if path.exists() {
            return Ok(path);
        }
    }

    anyhow::bail!(
        "Could not find lazyqmk-web binary. \
         Please build it with: cargo build --release --features web --bin lazyqmk-web"
    )
}

/// Wait for the backend to be ready to accept connections
async fn wait_for_backend_ready(child: &mut Child, port: u16) -> Result<()> {
    let stderr = child.stderr.take().context("No stderr available")?;
    let mut reader = BufReader::new(stderr).lines();

    let timeout = std::time::Duration::from_secs(10);
    let start = std::time::Instant::now();

    // Read stderr looking for startup message
    while start.elapsed() < timeout {
        tokio::select! {
            line = reader.next_line() => {
                match line {
                    Ok(Some(line)) => {
                        // Look for the "Starting" message
                        if line.contains("Starting") || line.contains(&format!(":{port}")) {
                            // Give it a moment to actually bind
                            tokio::time::sleep(std::time::Duration::from_millis(100)).await;
                            return Ok(());
                        }
                    }
                    Ok(None) => break,
                    Err(_) => break,
                }
            }
            _ = tokio::time::sleep(std::time::Duration::from_millis(100)) => {
                // Check if process is still running
                if child.try_wait().ok().flatten().is_some() {
                    anyhow::bail!("Backend process exited unexpectedly");
                }

                // Try to connect to see if it's ready
                if tokio::net::TcpStream::connect(format!("127.0.0.1:{port}")).await.is_ok() {
                    return Ok(());
                }
            }
        }
    }

    // Final check - try to connect
    if tokio::net::TcpStream::connect(format!("127.0.0.1:{port}"))
        .await
        .is_ok()
    {
        return Ok(());
    }

    anyhow::bail!("Backend failed to start within timeout")
}
