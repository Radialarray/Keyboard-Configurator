//! Tap Dance Editor Component
//!
//! Provides UI for creating, editing, and selecting tap dance actions.

use crate::models::{Layout, TapDanceAction};
use crate::tui::theme::Theme;
use crate::tui::Component;
use crossterm::event::{KeyCode, KeyEvent};
use ratatui::{
    layout::{Constraint, Direction, Layout as RatatuiLayout, Rect},
    style::{Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, List, ListItem, ListState, Paragraph, Wrap},
    Frame,
};

/// Events emitted by the tap dance editor
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum TapDanceEditorEvent {
    /// User selected a tap dance (returns the name)
    Selected(String),
    /// User cancelled the operation
    Cancelled,
    /// User wants to delete the selected tap dance
    Delete(String),
}

/// Editor mode
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum EditorMode {
    /// Selecting from existing tap dances
    Select,
    /// Creating/editing a tap dance
    Edit,
}

/// Field being edited in edit mode
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum EditField {
    Name,
    SingleTap,
    DoubleTap,
    Hold,
}

/// Tap Dance Editor component state
#[derive(Debug)]
pub struct TapDanceEditor {
    /// Current editor mode
    mode: EditorMode,
    /// List selection state
    list_state: ListState,
    /// Tap dances from the layout
    tap_dances: Vec<TapDanceAction>,
    /// Tap dance being edited (in Edit mode)
    editing: Option<TapDanceAction>,
    /// Currently focused field (in Edit mode)
    edit_field: EditField,
    /// Input buffer for text entry
    input_buffer: String,
    /// Status message
    status: String,
}

impl TapDanceEditor {
    /// Creates a new tap dance editor with tap dances from the layout
    pub fn new(layout: &Layout) -> Self {
        let tap_dances = layout.tap_dances.clone();
        let mut list_state = ListState::default();
        
        // Select first item if any exist
        if !tap_dances.is_empty() {
            list_state.select(Some(0));
        }
        
        Self {
            mode: EditorMode::Select,
            list_state,
            tap_dances,
            editing: None,
            edit_field: EditField::Name,
            input_buffer: String::new(),
            status: "Select a tap dance or press 'n' to create new".to_string(),
        }
    }

    /// Get the currently selected tap dance name
    fn selected_name(&self) -> Option<String> {
        self.list_state
            .selected()
            .and_then(|idx| self.tap_dances.get(idx))
            .map(|td| td.name.clone())
    }

    /// Handle input in Select mode
    fn handle_select_mode(&mut self, key: KeyEvent) -> Option<TapDanceEditorEvent> {
        match key.code {
            KeyCode::Up | KeyCode::Char('k') => {
                if let Some(selected) = self.list_state.selected() {
                    if selected > 0 {
                        self.list_state.select(Some(selected - 1));
                    }
                }
            }
            KeyCode::Down | KeyCode::Char('j') => {
                if let Some(selected) = self.list_state.selected() {
                    if selected < self.tap_dances.len().saturating_sub(1) {
                        self.list_state.select(Some(selected + 1));
                    }
                }
            }
            KeyCode::Enter => {
                if let Some(name) = self.selected_name() {
                    return Some(TapDanceEditorEvent::Selected(name));
                }
            }
            KeyCode::Char('n') => {
                // Start creating new tap dance
                self.mode = EditorMode::Edit;
                self.editing = Some(TapDanceAction {
                    name: String::new(),
                    single_tap: String::new(),
                    double_tap: None,
                    hold: None,
                });
                self.edit_field = EditField::Name;
                self.input_buffer.clear();
                self.status = "Enter tap dance name (alphanumeric + underscore)".to_string();
            }
            KeyCode::Char('d') => {
                if let Some(name) = self.selected_name() {
                    return Some(TapDanceEditorEvent::Delete(name));
                }
            }
            KeyCode::Esc => {
                return Some(TapDanceEditorEvent::Cancelled);
            }
            _ => {}
        }
        None
    }

    /// Handle input in Edit mode
    fn handle_edit_mode(&mut self, key: KeyEvent) -> Option<TapDanceEditorEvent> {
        match key.code {
            KeyCode::Char(c) if key.modifiers.is_empty() => {
                self.input_buffer.push(c);
            }
            KeyCode::Backspace => {
                self.input_buffer.pop();
            }
            KeyCode::Enter => {
                // Apply current field and move to next
                if let Some(ref mut td) = self.editing {
                    match self.edit_field {
                        EditField::Name => {
                            if self.input_buffer.is_empty() {
                                self.status = "Error: Name cannot be empty".to_string();
                                return None;
                            }
                            // Validate C identifier
                            if !self.input_buffer.chars().all(|c| c.is_ascii_alphanumeric() || c == '_') {
                                self.status = "Error: Name must be alphanumeric with underscores only".to_string();
                                return None;
                            }
                            td.name = self.input_buffer.clone();
                            self.edit_field = EditField::SingleTap;
                            self.input_buffer.clear();
                            self.status = "Enter single tap keycode (required)".to_string();
                        }
                        EditField::SingleTap => {
                            if self.input_buffer.is_empty() {
                                self.status = "Error: Single tap keycode cannot be empty".to_string();
                                return None;
                            }
                            td.single_tap = self.input_buffer.clone();
                            self.edit_field = EditField::DoubleTap;
                            self.input_buffer.clear();
                            self.status = "Enter double tap keycode (optional, Enter to skip)".to_string();
                        }
                        EditField::DoubleTap => {
                            if !self.input_buffer.is_empty() {
                                td.double_tap = Some(self.input_buffer.clone());
                            }
                            self.edit_field = EditField::Hold;
                            self.input_buffer.clear();
                            self.status = "Enter hold keycode (optional, Enter to finish)".to_string();
                        }
                        EditField::Hold => {
                            if !self.input_buffer.is_empty() {
                                td.hold = Some(self.input_buffer.clone());
                            }
                            
                            // Validation and save
                            if let Err(e) = td.validate() {
                                self.status = format!("Validation error: {e}");
                                return None;
                            }
                            
                            // Add to list and return to select mode
                            let name = td.name.clone();
                            self.tap_dances.push(td.clone());
                            self.mode = EditorMode::Select;
                            self.editing = None;
                            self.input_buffer.clear();
                            self.status = format!("Created tap dance: {name}");
                            
                            // Select the newly created item
                            self.list_state.select(Some(self.tap_dances.len() - 1));
                        }
                    }
                }
            }
            KeyCode::Esc => {
                // Cancel editing
                self.mode = EditorMode::Select;
                self.editing = None;
                self.input_buffer.clear();
                self.status = "Editing cancelled".to_string();
            }
            _ => {}
        }
        None
    }

    /// Render the select mode UI
    fn render_select_mode(&mut self, frame: &mut Frame, area: Rect, theme: &Theme) {
        let chunks = RatatuiLayout::default()
            .direction(Direction::Vertical)
            .constraints([Constraint::Min(3), Constraint::Length(3)])
            .split(area);

        // List of tap dances
        let items: Vec<ListItem> = self
            .tap_dances
            .iter()
            .map(|td| {
                let mut parts = vec![format!("{}: {}", td.name, td.single_tap)];
                if let Some(ref double) = td.double_tap {
                    parts.push(format!(" → {double}"));
                }
                if let Some(ref hold) = td.hold {
                    parts.push(format!(" (hold: {hold})"));
                }
                ListItem::new(parts.join(""))
            })
            .collect();

        let list = List::new(items)
            .block(
                Block::default()
                    .borders(Borders::ALL)
                    .title("Tap Dances")
                    .style(Style::default().bg(theme.background)),
            )
            .highlight_style(
                Style::default()
                    .bg(theme.highlight_bg)
                    .fg(theme.text)
                    .add_modifier(Modifier::BOLD),
            )
            .style(Style::default().bg(theme.background).fg(theme.text));

        frame.render_stateful_widget(list, chunks[0], &mut self.list_state);

        // Help text
        let help = Paragraph::new(vec![
            Line::from(vec![
                Span::styled("↑/↓", Style::default().fg(theme.accent).add_modifier(Modifier::BOLD)),
                Span::raw(" Navigate  "),
                Span::styled("Enter", Style::default().fg(theme.accent).add_modifier(Modifier::BOLD)),
                Span::raw(" Select  "),
                Span::styled("n", Style::default().fg(theme.accent).add_modifier(Modifier::BOLD)),
                Span::raw(" New  "),
                Span::styled("d", Style::default().fg(theme.accent).add_modifier(Modifier::BOLD)),
                Span::raw(" Delete  "),
                Span::styled("Esc", Style::default().fg(theme.accent).add_modifier(Modifier::BOLD)),
                Span::raw(" Cancel"),
            ]),
        ])
        .block(
            Block::default()
                .borders(Borders::ALL)
                .title("Help")
                .style(Style::default().bg(theme.background)),
        )
        .style(Style::default().bg(theme.background).fg(theme.text));

        frame.render_widget(help, chunks[1]);
    }

    /// Render the edit mode UI
    fn render_edit_mode(&mut self, frame: &mut Frame, area: Rect, theme: &Theme) {
        let chunks = RatatuiLayout::default()
            .direction(Direction::Vertical)
            .constraints([
                Constraint::Length(3),
                Constraint::Min(5),
                Constraint::Length(3),
                Constraint::Length(3),
            ])
            .split(area);

        // Title
        let title = Paragraph::new("Create New Tap Dance")
            .block(
                Block::default()
                    .borders(Borders::ALL)
                    .style(Style::default().bg(theme.background)),
            )
            .style(
                Style::default()
                    .bg(theme.background)
                    .fg(theme.accent)
                    .add_modifier(Modifier::BOLD),
            );
        frame.render_widget(title, chunks[0]);

        // Fields display
        if let Some(ref td) = self.editing {
            let mut lines = vec![];
            
            let name_style = if matches!(self.edit_field, EditField::Name) {
                Style::default().fg(theme.accent).add_modifier(Modifier::BOLD)
            } else {
                Style::default().fg(theme.text)
            };
            lines.push(Line::from(vec![
                Span::styled("Name: ", name_style),
                Span::raw(if matches!(self.edit_field, EditField::Name) {
                    &self.input_buffer
                } else {
                    &td.name
                }),
            ]));

            let single_style = if matches!(self.edit_field, EditField::SingleTap) {
                Style::default().fg(theme.accent).add_modifier(Modifier::BOLD)
            } else {
                Style::default().fg(theme.text)
            };
            lines.push(Line::from(vec![
                Span::styled("Single Tap: ", single_style),
                Span::raw(if matches!(self.edit_field, EditField::SingleTap) {
                    &self.input_buffer
                } else {
                    &td.single_tap
                }),
            ]));

            let double_style = if matches!(self.edit_field, EditField::DoubleTap) {
                Style::default().fg(theme.accent).add_modifier(Modifier::BOLD)
            } else {
                Style::default().fg(theme.text)
            };
            lines.push(Line::from(vec![
                Span::styled("Double Tap: ", double_style),
                Span::raw(if matches!(self.edit_field, EditField::DoubleTap) {
                    &self.input_buffer
                } else {
                    td.double_tap.as_deref().unwrap_or("")
                }),
            ]));

            let hold_style = if matches!(self.edit_field, EditField::Hold) {
                Style::default().fg(theme.accent).add_modifier(Modifier::BOLD)
            } else {
                Style::default().fg(theme.text)
            };
            lines.push(Line::from(vec![
                Span::styled("Hold: ", hold_style),
                Span::raw(if matches!(self.edit_field, EditField::Hold) {
                    &self.input_buffer
                } else {
                    td.hold.as_deref().unwrap_or("")
                }),
            ]));

            let para = Paragraph::new(lines)
                .block(
                    Block::default()
                        .borders(Borders::ALL)
                        .title("Fields")
                        .style(Style::default().bg(theme.background)),
                )
                .style(Style::default().bg(theme.background).fg(theme.text));
            frame.render_widget(para, chunks[1]);
        }

        // Status
        let status = Paragraph::new(self.status.as_str())
            .block(
                Block::default()
                    .borders(Borders::ALL)
                    .title("Status")
                    .style(Style::default().bg(theme.background)),
            )
            .style(Style::default().bg(theme.background).fg(theme.text))
            .wrap(Wrap { trim: true });
        frame.render_widget(status, chunks[2]);

        // Help
        let help = Paragraph::new(vec![
            Line::from(vec![
                Span::styled("Enter", Style::default().fg(theme.accent).add_modifier(Modifier::BOLD)),
                Span::raw(" Next field  "),
                Span::styled("Esc", Style::default().fg(theme.accent).add_modifier(Modifier::BOLD)),
                Span::raw(" Cancel"),
            ]),
        ])
        .block(
            Block::default()
                .borders(Borders::ALL)
                .title("Help")
                .style(Style::default().bg(theme.background)),
        )
        .style(Style::default().bg(theme.background).fg(theme.text));
        frame.render_widget(help, chunks[3]);
    }

}

impl Component for TapDanceEditor {
    type Event = TapDanceEditorEvent;

    fn handle_input(&mut self, key: KeyEvent) -> Option<Self::Event> {
        match self.mode {
            EditorMode::Select => self.handle_select_mode(key),
            EditorMode::Edit => self.handle_edit_mode(key),
        }
    }

    fn render(&self, frame: &mut Frame, area: Rect, theme: &Theme) {
        // Need mutable self for rendering stateful widgets, so use interior mutability pattern
        let mut editor = self.clone();
        match editor.mode {
            EditorMode::Select => editor.render_select_mode(frame, area, theme),
            EditorMode::Edit => editor.render_edit_mode(frame, area, theme),
        }
    }
}

// Implement Clone for TapDanceEditor (needed for render pattern)
impl Clone for TapDanceEditor {
    fn clone(&self) -> Self {
        Self {
            mode: self.mode,
            list_state: ListState::default().with_selected(self.list_state.selected()),
            tap_dances: self.tap_dances.clone(),
            editing: self.editing.clone(),
            edit_field: self.edit_field,
            input_buffer: self.input_buffer.clone(),
            status: self.status.clone(),
        }
    }
}
