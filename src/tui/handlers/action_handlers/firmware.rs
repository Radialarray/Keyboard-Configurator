// Firmware action handlers

use crate::tui::AppState;
use crate::tui::handlers::actions::{handle_firmware_build, handle_firmware_generation};
use anyhow::Result;

/// Handle build firmware action
pub fn handle_build_firmware(state: &mut AppState) -> Result<bool> {
    handle_firmware_build(state)?;
    Ok(false)
}

/// Handle generate firmware action
pub fn handle_generate_firmware(state: &mut AppState) -> Result<bool> {
    handle_firmware_generation(state)?;
    Ok(false)
}
