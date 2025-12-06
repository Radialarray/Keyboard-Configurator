// File operations action handlers

use crate::services::LayoutService;
use crate::tui::{AppState, PopupType, TemplateSaveDialogState};
use anyhow::Result;

/// Handle quit action
pub fn handle_quit(state: &mut AppState) -> Result<bool> {
    if state.dirty {
        state.active_popup = Some(PopupType::UnsavedChangesPrompt);
        Ok(false)
    } else {
        Ok(true)
    }
}

/// Handle save action
pub fn handle_save(state: &mut AppState) -> Result<bool> {
    if let Some(path) = &state.source_path.clone() {
        LayoutService::save(&state.layout, path)?;
        state.mark_clean();
        state.set_status("Saved");
    } else {
        state.set_error("No file path set");
    }
    Ok(false)
}

/// Handle save as template action
pub fn handle_save_as_template(state: &mut AppState) -> Result<bool> {
    state.template_save_dialog_state =
        TemplateSaveDialogState::new(state.layout.metadata.name.clone());
    state.active_popup = Some(PopupType::TemplateSaveDialog);
    state.set_status("Save as Template - Tab: next field, Enter: save");
    Ok(false)
}
