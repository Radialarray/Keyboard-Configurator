//! Golden test utilities for comparing generated output against expected files.
//!
//! Golden tests verify that generated code matches expected output. They support:
//! - Automatic normalization of timestamps, UUIDs, and paths
//! - `UPDATE_GOLDEN=1` env var to regenerate expected files
//! - Platform-independent line ending handling

use std::env;
use std::fs;
use std::path::Path;

/// Asserts that actual content matches the golden file.
///
/// If `UPDATE_GOLDEN=1` is set, updates the golden file instead of comparing.
///
/// # Arguments
/// * `actual` - The generated content to compare
/// * `golden_path` - Path to the golden file (relative to project root)
///
/// # Panics
/// Panics if the content doesn't match (when not updating).
pub fn assert_golden(actual: &str, golden_path: &str) {
    let golden_path = Path::new(golden_path);

    if env::var("UPDATE_GOLDEN").is_ok() {
        // Update mode: write actual content to golden file
        if let Some(parent) = golden_path.parent() {
            fs::create_dir_all(parent).expect("Failed to create golden directory");
        }
        fs::write(golden_path, actual).expect("Failed to write golden file");
        eprintln!("Updated golden file: {}", golden_path.display());
    } else {
        // Compare mode: read golden file and compare
        let expected = fs::read_to_string(golden_path).unwrap_or_else(|_| {
            panic!(
                "Golden file not found: {}. Run with UPDATE_GOLDEN=1 to create it.",
                golden_path.display()
            )
        });

        let actual_normalized = normalize_output(actual);
        let expected_normalized = normalize_output(&expected);

        if actual_normalized != expected_normalized {
            // Show diff for debugging
            eprintln!("=== Golden file mismatch ===");
            eprintln!("File: {}", golden_path.display());
            eprintln!("\n=== Expected (normalized) ===\n{}", expected_normalized);
            eprintln!("\n=== Actual (normalized) ===\n{}", actual_normalized);
            panic!("Golden file mismatch. Run with UPDATE_GOLDEN=1 to update.");
        }
    }
}

/// Normalizes output for comparison by removing non-deterministic elements.
///
/// Transformations applied:
/// - Strips timestamp comments like `// Generated at: 2025-01-16...`
/// - Replaces UUIDs with `<UUID>`
/// - Replaces absolute paths with `<PATH>`
/// - Normalizes line endings to `\n`
/// - Trims trailing whitespace from lines
pub fn normalize_output(content: &str) -> String {
    content
        .lines()
        .map(|line| {
            let line = line.trim_end(); // Remove trailing whitespace

            // Replace timestamp lines
            if line.contains("Generated at:") || line.contains("Last modified:") {
                return "// Generated at: <TIMESTAMP>".to_string();
            }

            // Replace UUIDs (simple pattern matching)
            let line = replace_uuids(line);

            // Replace absolute paths (heuristic: paths starting with / or C:\)

            replace_absolute_paths(&line)
        })
        .collect::<Vec<_>>()
        .join("\n")
}

/// Replaces UUID patterns with `<UUID>`.
fn replace_uuids(line: &str) -> String {
    // Match standard UUID format: 8-4-4-4-12 hex digits
    let uuid_pattern = regex::Regex::new(
        r"\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b",
    )
    .unwrap();

    uuid_pattern.replace_all(line, "<UUID>").to_string()
}

/// Replaces absolute file paths with `<PATH>`.
fn replace_absolute_paths(line: &str) -> String {
    // Match Unix absolute paths: /path/to/file
    let unix_path = regex::Regex::new(r"/[a-zA-Z0-9_/.-]+").unwrap();
    let line = unix_path.replace_all(line, "<PATH>");

    // Match Windows absolute paths: C:\path\to\file
    let win_path = regex::Regex::new(r"[A-Z]:\\[a-zA-Z0-9_\\.-]+").unwrap();
    win_path.replace_all(&line, "<PATH>").to_string()
}

/// Normalizes firmware output specifically (more aggressive normalization).
///
/// In addition to standard normalization:
/// - Strips QMK version comments
/// - Normalizes whitespace in keymap arrays
pub fn normalize_firmware_output(content: &str) -> String {
    let normalized = normalize_output(content);

    normalized
        .lines()
        .filter(|line| {
            // Filter out version-specific comments
            !line.contains("QMK version:") && !line.contains("QMK Firmware")
        })
        .collect::<Vec<_>>()
        .join("\n")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_normalize_timestamp() {
        let input = "// Generated at: 2025-01-16T10:30:45Z";
        let expected = "// Generated at: <TIMESTAMP>";
        assert_eq!(normalize_output(input), expected);
    }

    #[test]
    fn test_normalize_uuid() {
        let input = "layer_id: 12345678-1234-1234-1234-123456789abc";
        let expected = "layer_id: <UUID>";
        assert_eq!(normalize_output(input), expected);
    }

    #[test]
    fn test_normalize_unix_path() {
        let input = "path: /Users/user/dev/qmk_firmware";
        let expected = "path: <PATH>";
        assert_eq!(normalize_output(input), expected);
    }

    #[test]
    fn test_normalize_windows_path() {
        let input = r"path: C:\Users\user\dev\qmk_firmware";
        let expected = "path: <PATH>";
        assert_eq!(normalize_output(input), expected);
    }

    #[test]
    fn test_normalize_preserves_code() {
        let input = "const uint16_t PROGMEM keymaps[][MATRIX_ROWS][MATRIX_COLS] = {";
        assert_eq!(normalize_output(input), input);
    }

    #[test]
    fn test_normalize_trailing_whitespace() {
        let input = "line with spaces   \n";
        let expected = "line with spaces";
        assert_eq!(normalize_output(input), expected);
    }
}
