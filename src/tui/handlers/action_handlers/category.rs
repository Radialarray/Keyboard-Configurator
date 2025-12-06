// Category assignment action handlers

use crate::tui::{ActiveComponent, AppState, CategoryPickerContext, PopupType};
use anyhow::Result;

/// Handle assign category to key action
pub fn handle_assign_category_to_key(state: &mut AppState) -> Result<bool> {
    // Assign category to individual key (Ctrl+K)
    if state.get_selected_key().is_some() {
        let picker = crate::tui::CategoryPicker::new();
        state.active_component = Some(ActiveComponent::CategoryPicker(picker));
        state.category_picker_context = Some(CategoryPickerContext::IndividualKey);
        state.active_popup = Some(PopupType::CategoryPicker);
        state.set_status("Select category for key - Enter to apply");
        Ok(false)
    } else {
        state.set_error("No key selected");
        Ok(false)
    }
}

/// Handle assign category to layer action
pub fn handle_assign_category_to_layer(state: &mut AppState) -> Result<bool> {
    // Assign category to layer (Shift+L or Ctrl+L)
    let picker = crate::tui::CategoryPicker::new();
    state.active_component = Some(ActiveComponent::CategoryPicker(picker));
    state.category_picker_context = Some(CategoryPickerContext::Layer);
    state.active_popup = Some(PopupType::CategoryPicker);
    state.set_status("Select category for layer - Enter to apply");
    Ok(false)
}
