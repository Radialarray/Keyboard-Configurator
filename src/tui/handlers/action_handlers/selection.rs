// Selection action handlers

use crate::tui::{AppState, SelectionMode};
use anyhow::Result;

/// Handle toggle selection mode action
pub fn handle_toggle_selection_mode(state: &mut AppState) -> Result<bool> {
    if state.selection_mode.is_some() {
        // Exit selection mode
        state.selection_mode = None;
        state.selected_keys.clear();
        state.set_status("Selection mode cancelled");
    } else {
        // Enter selection mode with current key selected
        state.selection_mode = Some(SelectionMode::Normal);
        state.selected_keys.clear();
        state.selected_keys.push(state.selected_position);
        state.set_status("Selection mode - Space: toggle key, y: copy, d: cut, Esc: cancel");
    }
    Ok(false)
}

/// Handle start rectangle select action
pub fn handle_start_rectangle_select(state: &mut AppState) -> Result<bool> {
    if state.selection_mode.is_some() {
        // Start rectangle selection from current position
        state.selection_mode = Some(SelectionMode::Rectangle {
            start: state.selected_position,
        });
        state.selected_keys.clear();
        state.selected_keys.push(state.selected_position);
        state.set_status("Rectangle select - move to opposite corner, Enter to confirm");
    } else {
        // Enter rectangle selection mode
        state.selection_mode = Some(SelectionMode::Rectangle {
            start: state.selected_position,
        });
        state.selected_keys.clear();
        state.selected_keys.push(state.selected_position);
        state.set_status("Rectangle select - move to opposite corner, Enter to confirm");
    }
    Ok(false)
}
