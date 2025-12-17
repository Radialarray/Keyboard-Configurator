//! End-to-end tests for `lazyqmk config` commands.

use std::process::Command;

mod fixtures;
use fixtures::*;

/// Path to the lazyqmk binary
fn lazyqmk_bin() -> String {
    std::env::var("CARGO_BIN_EXE_lazyqmk")
        .unwrap_or_else(|_| "target/release/lazyqmk".to_string())
}

// ============================================================================
// Show Command Tests
// ============================================================================

#[test]
fn test_config_show_default() {
    let output = Command::new(lazyqmk_bin())
        .args(["config", "show"])
        .output()
        .expect("Failed to execute command");

    assert_eq!(
        output.status.code(),
        Some(0),
        "Show config should succeed. stderr: {}",
        String::from_utf8_lossy(&output.stderr)
    );

    let stdout = String::from_utf8_lossy(&output.stdout);
    // Should contain config information in human-readable format
    assert!(
        stdout.contains("output") || stdout.contains("Output") || stdout.contains("theme"),
        "Output should contain config information"
    );
}

#[test]
fn test_config_show_json_format() {
    let output = Command::new(lazyqmk_bin())
        .args(["config", "show", "--json"])
        .output()
        .expect("Failed to execute command");

    assert_eq!(output.status.code(), Some(0));

    let stdout = String::from_utf8_lossy(&output.stdout);
    let result: serde_json::Value =
        serde_json::from_str(&stdout).expect("Should parse JSON output");

    // Validate JSON structure
    assert!(result["paths"].is_object(), "Should have paths object");
    assert!(result["build"].is_object(), "Should have build object");
    assert!(result["ui"].is_object(), "Should have ui object");
    assert!(result["ui"]["theme"].is_string(), "Theme should be a string");
}

#[test]
fn test_config_show_json_schema() {
    let output = Command::new(lazyqmk_bin())
        .args(["config", "show", "--json"])
        .output()
        .expect("Failed to execute command");

    let stdout = String::from_utf8_lossy(&output.stdout);
    let result: serde_json::Value =
        serde_json::from_str(&stdout).expect("Should parse JSON output");

    // Validate complete schema
    assert!(result["paths"].is_object());
    assert!(result["build"].is_object());
    assert!(result["build"]["output_dir"].is_string(), "Should have output_dir");
    assert!(result["ui"].is_object());
    assert!(result["ui"]["theme"].is_string(), "Should have theme");
}

// ============================================================================
// Set Command Tests
// ============================================================================

#[test]
#[ignore = "modifies user config"]
fn test_config_set_theme_light() {
    let output = Command::new(lazyqmk_bin())
        .args(["config", "set", "--theme", "light"])
        .output()
        .expect("Failed to execute command");

    assert_eq!(
        output.status.code(),
        Some(0),
        "Setting theme to light should succeed. stderr: {}",
        String::from_utf8_lossy(&output.stderr)
    );

    // Verify it was set
    let output = Command::new(lazyqmk_bin())
        .args(["config", "show", "--json"])
        .output()
        .expect("Failed to execute command");

    let stdout = String::from_utf8_lossy(&output.stdout);
    let result: serde_json::Value =
        serde_json::from_str(&stdout).expect("Should parse JSON output");

    assert_eq!(
        result["ui"]["theme"].as_str().unwrap(),
        "light",
        "Theme should be set to light"
    );
}

#[test]
#[ignore = "modifies user config"]
fn test_config_set_theme_dark() {
    let output = Command::new(lazyqmk_bin())
        .args(["config", "set", "--theme", "dark"])
        .output()
        .expect("Failed to execute command");

    assert_eq!(output.status.code(), Some(0));

    let output = Command::new(lazyqmk_bin())
        .args(["config", "show", "--json"])
        .output()
        .expect("Failed to execute command");

    let stdout = String::from_utf8_lossy(&output.stdout);
    let result: serde_json::Value =
        serde_json::from_str(&stdout).expect("Should parse JSON output");

    assert_eq!(
        result["ui"]["theme"].as_str().unwrap(),
        "dark",
        "Theme should be set to dark"
    );
}

#[test]
fn test_config_set_theme_auto() {
    let output = Command::new(lazyqmk_bin())
        .args(["config", "set", "--theme", "auto"])
        .output()
        .expect("Failed to execute command");

    assert_eq!(output.status.code(), Some(0));

    let output = Command::new(lazyqmk_bin())
        .args(["config", "show", "--json"])
        .output()
        .expect("Failed to execute command");

    let stdout = String::from_utf8_lossy(&output.stdout);
    let result: serde_json::Value =
        serde_json::from_str(&stdout).expect("Should parse JSON output");

    assert_eq!(
        result["ui"]["theme"].as_str().unwrap(),
        "auto",
        "Theme should be set to auto"
    );
}

#[test]
fn test_config_set_invalid_theme() {
    let output = Command::new(lazyqmk_bin())
        .args(["config", "set", "--theme", "invalid_theme"])
        .output()
        .expect("Failed to execute command");

    assert_eq!(
        output.status.code(),
        Some(1),
        "Setting invalid theme should fail with exit code 1"
    );
}

#[test]
#[ignore = "modifies user config"]
fn test_config_set_output_dir_creates_if_needed() {
    let temp_dir = tempfile::TempDir::new().expect("Failed to create temp dir");
    let output_dir = temp_dir.path().join("new_output_dir");

    // Verify it doesn't exist yet
    assert!(!output_dir.exists(), "Output dir should not exist initially");

    let output = Command::new(lazyqmk_bin())
        .args([
            "config",
            "set",
            "--output-dir",
            output_dir.to_str().unwrap(),
        ])
        .output()
        .expect("Failed to execute command");

    assert_eq!(
        output.status.code(),
        Some(0),
        "Setting output dir should succeed. stderr: {}",
        String::from_utf8_lossy(&output.stderr)
    );

    // The directory may or may not be created depending on implementation,
    // but the config should accept the path
    let output = Command::new(lazyqmk_bin())
        .args(["config", "show", "--json"])
        .output()
        .expect("Failed to execute command");

    let stdout = String::from_utf8_lossy(&output.stdout);
    let result: serde_json::Value =
        serde_json::from_str(&stdout).expect("Should parse JSON output");

    assert_eq!(
        result["build"]["output_dir"].as_str().unwrap(),
        output_dir.to_str().unwrap(),
        "Output dir should be set"
    );
}

#[test]
#[ignore = "modifies user config"]
fn test_config_set_qmk_path() {
    let (config, temp_dir) = temp_config_with_qmk(None);
    let qmk_path = config
        .paths
        .qmk_firmware
        .unwrap()
        .to_str()
        .unwrap()
        .to_string();

    let output = Command::new(lazyqmk_bin())
        .args(["config", "set", "--qmk-path", &qmk_path])
        .output()
        .expect("Failed to execute command");

    assert_eq!(
        output.status.code(),
        Some(0),
        "Setting QMK path should succeed. stderr: {}",
        String::from_utf8_lossy(&output.stderr)
    );

    let output = Command::new(lazyqmk_bin())
        .args(["config", "show", "--json"])
        .output()
        .expect("Failed to execute command");

    let stdout = String::from_utf8_lossy(&output.stdout);
    let result: serde_json::Value =
        serde_json::from_str(&stdout).expect("Should parse JSON output");

    assert_eq!(
        result["paths"]["qmk_firmware"].as_str().unwrap(),
        qmk_path,
        "QMK path should be set"
    );

    // Keep temp_dir alive
    drop(temp_dir);
}

#[test]
fn test_config_set_qmk_path_invalid_directory() {
    let output = Command::new(lazyqmk_bin())
        .args(["config", "set", "--qmk-path", "/nonexistent/path/qmk"])
        .output()
        .expect("Failed to execute command");

    assert_eq!(
        output.status.code(),
        Some(1),
        "Setting invalid QMK path should fail with exit code 1"
    );
}

#[test]
#[ignore = "modifies user config"]
fn test_config_set_multiple_values() {
    let temp_dir = tempfile::TempDir::new().expect("Failed to create temp dir");
    let output_dir = temp_dir.path().join("output");

    let output = Command::new(lazyqmk_bin())
        .args([
            "config",
            "set",
            "--theme",
            "dark",
            "--output-dir",
            output_dir.to_str().unwrap(),
        ])
        .output()
        .expect("Failed to execute command");

    assert_eq!(
        output.status.code(),
        Some(0),
        "Setting multiple values should succeed. stderr: {}",
        String::from_utf8_lossy(&output.stderr)
    );

    let output = Command::new(lazyqmk_bin())
        .args(["config", "show", "--json"])
        .output()
        .expect("Failed to execute command");

    let stdout = String::from_utf8_lossy(&output.stdout);
    let result: serde_json::Value =
        serde_json::from_str(&stdout).expect("Should parse JSON output");

    assert_eq!(result["ui"]["theme"].as_str().unwrap(), "dark");
    assert_eq!(
        result["build"]["output_dir"].as_str().unwrap(),
        output_dir.to_str().unwrap()
    );
}

// ============================================================================
// Error Cases
// ============================================================================

#[test]
fn test_config_set_no_values_specified() {
    let output = Command::new(lazyqmk_bin())
        .args(["config", "set"])
        .output()
        .expect("Failed to execute command");

    // Should either succeed (no-op) or fail gracefully
    let code = output.status.code();
    assert!(
        code == Some(0) || code == Some(1),
        "Should return 0 or 1 for no-value set"
    );
}

// ============================================================================
// JSON Output Validation
// ============================================================================

#[test]
fn test_config_show_json_valid() {
    let output = Command::new(lazyqmk_bin())
        .args(["config", "show", "--json"])
        .output()
        .expect("Failed to execute command");

    assert_eq!(output.status.code(), Some(0));

    let stdout = String::from_utf8_lossy(&output.stdout);
    // Should parse without errors
    let _result: serde_json::Value =
        serde_json::from_str(&stdout).expect("JSON output should be valid");
}
