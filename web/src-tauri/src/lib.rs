//! LazyQMK Desktop Application
//!
//! This is the Tauri entry point that wraps the SvelteKit frontend
//! and provides desktop-specific functionality like spawning the backend.

// Prevents additional console window on Windows in release
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod backend;

use tauri::Manager;
use tokio::sync::Mutex;

/// Application state shared between Tauri commands
pub struct AppState {
    /// Handle to the spawned backend process (if running)
    backend_handle: Mutex<Option<backend::BackendHandle>>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            backend_handle: Mutex::new(None),
        }
    }
}

/// Start the backend server
#[tauri::command]
async fn start_backend(
    state: tauri::State<'_, AppState>,
    workspace_path: String,
) -> Result<String, String> {
    let mut handle = state.backend_handle.lock().await;

    if handle.is_some() {
        return Ok("Backend already running".to_string());
    }

    let new_handle = backend::spawn_backend(&workspace_path)
        .await
        .map_err(|e| e.to_string())?;

    let port = new_handle.port;
    *handle = Some(new_handle);

    Ok(format!("Backend started on port {port}"))
}

/// Stop the backend server
#[tauri::command]
async fn stop_backend(state: tauri::State<'_, AppState>) -> Result<String, String> {
    let mut handle = state.backend_handle.lock().await;

    if let Some(backend) = handle.take() {
        backend.stop().await.map_err(|e| e.to_string())?;
        Ok("Backend stopped".to_string())
    } else {
        Ok("Backend not running".to_string())
    }
}

/// Check if backend is running
#[tauri::command]
async fn is_backend_running(state: tauri::State<'_, AppState>) -> Result<bool, String> {
    let handle = state.backend_handle.lock().await;
    Ok(handle.is_some())
}

/// Get the backend URL
#[tauri::command]
async fn get_backend_url(state: tauri::State<'_, AppState>) -> Result<Option<String>, String> {
    let handle = state.backend_handle.lock().await;
    Ok(handle
        .as_ref()
        .map(|b| format!("http://127.0.0.1:{}", b.port)))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            start_backend,
            stop_backend,
            is_backend_running,
            get_backend_url,
        ])
        .setup(|app| {
            // Open devtools in debug builds
            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        .on_window_event(|_window, event| {
            // Handle window close - stop backend
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                // Backend cleanup is handled by Drop
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
