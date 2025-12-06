# Research: TUI Architecture and Implementation Patterns

**Feature**: Complete TUI Keyboard Layout Editor  
**Phase**: 0 - Research  
**Date**: 2024-11-24

## Overview

This document consolidates research findings for implementing a terminal-based keyboard layout editor using Rust, Ratatui, and QMK firmware integration. All technical decisions are based on the existing TUI_ARCHITECTURE_GUIDE.md and proven patterns.

## Core Architecture Decisions

### Decision: Immediate-Mode Rendering with Ratatui

**Rationale**:
- Entire UI rebuilt every frame from state
- No retained UI state between frames eliminates synchronization bugs
- State is single source of truth
- Simple mental model: state drives rendering, not vice versa
- Ratatui 0.26 provides mature widget system with buffer-based drawing

**Alternatives Considered**:
- **Cursive**: More stateful, harder to reason about state flow
- **tui-rs** (deprecated): No longer maintained, Ratatui is the successor
- **Raw Crossterm**: Too low-level, would require building entire framework

**Implementation Pattern**:
```text
Frame Start → Clear Buffer → Render Main Layout (tabs, keyboard, status)
→ Render Active Popup → Flush Buffer to Terminal
```

### Decision: Centralized State Management (AppState)

**Rationale**:
- Single mutable AppState object owned by main loop
- All UI components read immutably from state
- All user actions modify state explicitly in event handlers
- Dirty flag tracked at top level
- Predictable data flow prevents race conditions

**Alternatives Considered**:
- **Component-local state**: Would cause synchronization issues across widgets
- **Message-passing architecture**: Overkill for single-threaded UI
- **Redux-style reducers**: Unnecessary indirection for Rust ownership model

**State Structure**:
```text
AppState {
  layout: Layout,               // Core data
  current_layer: usize,         // UI state
  selected_position: Position,  // Cursor
  active_popup: Option<PopupType>,
  dirty: bool,                  // Unsaved changes
  keycode_db: KeycodeDatabase,  // System resources
  geometry: KeyboardGeometry,
  config: Config
}
```

### Decision: Three-Coordinate Mapping System

**Rationale**:
- Mechanical keyboards have three distinct coordinate spaces:
  1. **Visual** (user's mental model in Markdown tables)
  2. **Matrix** (electrical wiring, row/column connections)
  3. **LED Index** (sequential RGB LED order)
- Each space serves different purpose and transformations needed between them
- VisualLayoutMapping module handles all bidirectional conversions
- Isolating coordinate logic prevents bugs from spreading

**Alternatives Considered**:
- **Single coordinate space**: Impossible, QMK requires matrix positions, users think in visual positions, LEDs are sequential
- **Direct hardcoded mappings**: Not maintainable for multiple keyboard layouts
- **Runtime calculation only**: Too slow for 60fps rendering

**Transformation Methods**:
- led_to_matrix_pos() - For firmware generation
- matrix_to_visual_pos() - For parsing QMK info.json
- visual_to_matrix_pos() - For saving layouts
- visual_to_led_index() - For RGB configuration

### Decision: Human-Readable Markdown File Format

**Rationale**:
- Version control friendly (plain text, meaningful diffs)
- Manually editable without application
- Debugging friendly (can inspect and fix corrupted files)
- Standard format (widely supported tools)
- Supports metadata (YAML frontmatter)

**Format Structure**:
```markdown
---
name: "My Layout"
author: "username"
tags: ["programming", "vim"]
---

## Layer 0: Base
**Color**: #FF0000

| KC_TAB | KC_Q{#00FF00}@navigation | ... |
|--------|--------------------------|-----|
| KC_LCTL | KC_A | ... |
```

**Syntax Extensions**:
- `{#RRGGBB}` - Individual key color override
- `@category-id` - Category assignment
- Combined: `KC_A{#FF0000}@navigation`

**Alternatives Considered**:
- **JSON**: Not human-readable, hard to edit manually
- **YAML**: Ambiguous indentation, harder to parse tables
- **TOML**: Poor support for nested tables with metadata
- **Binary format**: Defeats version control and debugging goals

## UI Component Patterns

### Decision: Popup State Management with Stack

**Rationale**:
- `active_popup: Option<PopupType>` tracks current dialog
- `previous_popup: Option<PopupType>` for nested popups
- Stack pattern allows color picker from category manager
- Each popup has isolated state in AppState

**Popup Lifecycle**:
1. User action sets active_popup
2. Event routing directs input to popup handler
3. Popup modifies state and closes (clears active_popup)
4. Returns to previous popup or main UI

**Popup Types**:
- KeycodePicker { search: String, selected: usize, category: Category }
- ColorPicker { r: u8, g: u8, b: u8, active_channel: RGBChannel }
- CategoryPicker { selected: usize }
- CategoryManager { categories: Vec<Category>, selected: usize }
- TemplateB rowser { templates: Vec<Template>, search: String }
- HelpOverlay { scroll_offset: usize }
- BuildLog { lines: Vec<String>, scroll_offset: usize }

### Decision: Event-Driven Rendering with Poll Timeout

**Rationale**:
- Only render when events occur (keyboard, resize)
- 100ms poll timeout allows checking background channels
- Eliminates wasted CPU cycles redrawing unchanged UI
- Maintains responsiveness for build progress updates

**Main Loop Pattern**:
```text
loop {
  poll_event(100ms_timeout)
  handle_event() → update AppState
  check_build_channel() → update build status
  render_from_state()
  if should_quit { break }
}
```

**Alternatives Considered**:
- **Continuous rendering**: Wastes CPU, unnecessary for terminal UI
- **No timeout**: Can't check background build progress
- **Frame-based (16ms)**: Too fast for terminal, poll overhead too high

## Performance Patterns

### Decision: Background Thread for Firmware Compilation

**Rationale**:
- QMK compilation takes 30-60 seconds
- Cannot block main UI thread
- Use mpsc channel for progress messages
- Thread safety via message passing (no shared state)

**Architecture**:
```text
Main Thread                Build Thread
    │                           │
    ├─ spawn ─────────────────► │
    │                     ┌─────┴─────┐
    │                     │ Generate  │
    │                     │ Compile   │
    │                     │ Report    │
    │                     └─────┬─────┘
    │◄── Progress/Log ──────────┤
    │◄── Complete/Error ────────┤
    └─ update UI
```

**Message Types**:
- BuildProgress { phase: String, percentage: Option<u8> }
- BuildLog { level: LogLevel, message: String }
- BuildComplete { success: bool, firmware_path: Option<PathBuf> }

**Alternatives Considered**:
- **Synchronous build**: Unacceptable UX (frozen UI for 60s)
- **Async/await**: Overkill for single background task, harder to reason about
- **Process spawning without channel**: Can't stream progress updates

### Decision: Lazy Loading and Caching Strategy

**Rationale**:
- Keycode database loaded once at startup (600+ entries)
- Keyboard geometry cached after parsing info.json
- Coordinate mappings built once and reused
- String formatting cached for key labels

**What to Cache**:
- Keycode database HashMap: O(1) lookups by keycode string
- Category HashMap: O(1) lookups by category ID
- Coordinate transformation HashMaps
- Terminal-scaled key positions (recompute only on resize)

**What NOT to Cache**:
- Current key assignments (stored in Layout, modified frequently)
- Active layer index (single u8, overhead not worth it)
- Popup states (short-lived, small data)

## File I/O Patterns

### Decision: Atomic Writes with Temp File + Rename

**Rationale**:
- Prevent data loss if write fails mid-operation
- Ensure file is never in corrupted state
- OS-level atomic rename operation
- Standard pattern for safe persistence

**Algorithm**:
1. Write to temp file: `layout.md.tmp`
2. Verify write success
3. Atomic rename: `layout.md.tmp` → `layout.md`
4. If rename fails, temp file remains for recovery

**Alternatives Considered**:
- **Direct overwrite**: Risky, can lose data if write fails
- **Backup before write**: More disk I/O, requires cleanup logic
- **Write-ahead log**: Overkill for local file editing

### Decision: Markdown Parsing State Machine

**Rationale**:
- Parse line-by-line with context tracking
- State transitions on markers (##, |, ---)
- Accumulate data per section (layer, table row)
- Regex for extracting color/category syntax from cells

**Parser States**:
- InFrontmatter: Reading YAML metadata
- InLayerHeader: Parsing "## Layer N: Name"
- InLayerColor: Parsing "**Color**: #RRGGBB"
- InTable: Parsing markdown table rows
- InCategories: Parsing category definitions

**Error Handling**:
- Preserve line numbers for error messages
- Partial parsing: Load what's valid, report issues
- Validation after parse: Check all keycodes against database

## Coordinate Transformation Patterns

### Decision: Bidirectional HashMap Mappings

**Rationale**:
- Need fast lookups in both directions
- Visual → Matrix for saving layouts
- Matrix → Visual for rendering
- LED → Matrix for firmware generation

**Data Structures**:
```text
VisualLayoutMapping {
  led_to_matrix: Vec<(u8, u8)>,           // Indexed by LED
  matrix_to_led: HashMap<(u8, u8), u8>,  // Matrix → LED
  matrix_to_visual: HashMap<(u8, u8), (u8, u8)>,
  visual_to_matrix: HashMap<(u8, u8), (u8, u8)>
}
```

**Building Mappings**:
1. Parse QMK info.json layout array
2. Extract matrix positions [row, col]
3. Compute visual positions (x, y in keyboard units)
4. Assign sequential LED indices
5. Build all four mappings

### Decision: Split Keyboard Column Reversal

**Rationale**:
- Right half of split keyboards often wired in reverse
- Matrix rows 4-7 map to visual columns 7-13 (reversed)
- Left half: Matrix col 0 = leftmost key
- Right half: Matrix col 0 = rightmost key (reverse in visual)

**Algorithm**:
```text
if matrix.row >= 4:  // Right half
  visual.col = 13 - matrix.col
else:  // Left half
  visual.col = matrix.col
```

## Testing Strategies

### Decision: Three-Tier Test Structure

**Rationale**:
- Unit tests: Fast, isolated, pure functions
- Integration tests: Cross-module, file I/O, firmware generation
- Contract tests: External format compatibility (QMK info.json)

**Unit Test Focus**:
- Markdown table parsing (valid/invalid syntax)
- Color priority resolution (individual > category > layer > default)
- Coordinate transformations (visual ↔ matrix ↔ LED)
- Keycode validation against database

**Integration Test Focus**:
- Full save/load cycle preserves all data
- Firmware generation produces valid C code
- Configuration TOML round-trip
- Template system end-to-end

**Contract Test Focus**:
- Parse actual QMK info.json files from submodule
- Handle various keyboard layouts (36/40/42/46 keys)
- Support split and non-split keyboards

## Configuration Management

### Decision: TOML with Platform-Specific Directories

**Rationale**:
- TOML human-readable and Rust-native (serde support)
- Platform-specific paths via `dirs` crate
- Unix: ~/.config/layout_tools/
- Windows: %APPDATA%\layout_tools\
- Automatic directory creation if missing

**Configuration Schema**:
```toml
[paths]
qmk_firmware = "/path/to/qmk_firmware"

[build]
keyboard = "crkbd"
layout = "LAYOUT_split_3x6_3"
keymap = "default"
output_format = "uf2"
output_dir = ".build"

[ui]
theme = "default"
show_help_on_startup = true
```

## Error Handling Patterns

### Decision: anyhow for Context-Rich Errors

**Rationale**:
- anyhow::Result for application errors
- Context chaining with `.context()` for error paths
- User-friendly error messages with actionable guidance
- ? operator for propagation

**Error Message Design**:
- Include file path and line number for parse errors
- List specific invalid keycodes with suggestions
- Provide recovery steps for build failures
- Show QMK path validation issues with fix instructions

**Status Bar Error Display**:
- Red color for errors
- Specific problem description
- Suggestion for resolution
- Reference to help (?) if needed

## Summary of Key Patterns

1. **Immediate-mode rendering** with centralized AppState
2. **Three-coordinate mapping** (visual/matrix/LED) with bidirectional lookups
3. **Human-readable Markdown** files with YAML frontmatter
4. **Background threads** for blocking operations with message channels
5. **Atomic file writes** via temp + rename pattern
6. **Event-driven rendering** with 100ms poll timeout
7. **Lazy loading and caching** for expensive operations
8. **Three-tier testing** (unit/integration/contract)
9. **TOML configuration** with platform-specific directories
10. **Context-rich errors** with actionable guidance

All patterns selected based on proven approaches from TUI_ARCHITECTURE_GUIDE.md and industry best practices for terminal applications.
