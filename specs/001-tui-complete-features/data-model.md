# Data Model: TUI Keyboard Layout Editor

**Feature**: Complete TUI Keyboard Layout Editor  
**Phase**: 1 - Design  
**Date**: 2024-11-24

## Entity Relationship Overview

```text
Layout (1) ─────► (N) Layer
  │                 │
  │                 └─────► (N) KeyDefinition
  │                           │
  └─────► (N) Category ◄──────┘
            (reused across keys/layers)

KeyboardGeometry (1) ─────► (N) KeyGeometry
                                 (physical positions)

VisualLayoutMapping
  (coordinate transformations: visual ↔ matrix ↔ LED)

AppState (singleton)
  ├─► Layout (current editing)
  ├─► KeyboardGeometry (loaded from QMK)
  ├─► VisualLayoutMapping (computed from geometry)
  ├─► Config (persistent settings)
  └─► KeycodeDatabase (embedded static data)
```

## Core Data Entities

### Layout

Represents a complete keyboard mapping with metadata and multiple layers.

**Fields**:
- `metadata: LayoutMetadata` - File metadata (name, author, tags, timestamps)
- `layers: Vec<Layer>` - Ordered list of layers (0-N, typically 0-11)
- `categories: Vec<Category>` - User-defined categories for organization

**Validation Rules**:
- At least one layer required (layer 0)
- Layer numbers must be sequential without gaps
- All layers must have same number of keys (determined by keyboard layout)
- Category IDs must be unique within layout

**State Transitions**:
- New → Editing (user modifies keys/layers)
- Editing → Dirty (unsaved changes flag set)
- Dirty → Clean (file saved successfully)

**Relationships**:
- Has many: Layer, Category
- Referenced by: AppState (current_layout)

---

### Layer

A single layer of the keyboard with color and key assignments.

**Fields**:
- `number: u8` - Layer number (0-based, max 255)
- `name: String` - Human-readable name (e.g., "Base", "Lower", "Raise")
- `default_color: RgbColor` - Base color for all keys on this layer
- `category_id: Option<String>` - Optional category assignment for entire layer
- `keys: Vec<KeyDefinition>` - Key assignments for all positions (fixed size per layout)

**Validation Rules**:
- Name must be non-empty, max 50 characters
- Number must be unique within parent Layout
- Keys vec size must match keyboard layout (e.g., 42 for split_3x6_3)
- All positions must be present (no gaps in coordinate space)
- Category ID must exist in parent Layout.categories if Some

**Color Resolution** (four-level priority):
1. KeyDefinition.color_override (highest)
2. KeyDefinition.category_id → Category.color
3. Layer.category_id → Category.color
4. Layer.default_color (lowest/fallback)

**Relationships**:
- Belongs to: Layout
- Has many: KeyDefinition
- References: Category (optional)

---

### KeyDefinition

Individual key assignment with position, keycode, and optional overrides.

**Fields**:
- `position: Position` - Visual position (row: u8, col: u8)
- `keycode: String` - QMK keycode (e.g., "KC_A", "KC_TRNS", "MO(1)")
- `label: Option<String>` - Optional display label (currently unused, future feature)
- `color_override: Option<RgbColor>` - Individual key color (highest priority)
- `category_id: Option<String>` - Category assignment for this key
- `combo_participant: bool` - Flag for combo feature (future use)

**Validation Rules**:
- Position must be within keyboard geometry bounds
- Keycode must exist in KeycodeDatabase (600+ valid codes)
- Keycode "KC_TRNS" (transparent) is always valid
- Keycode format: uppercase, underscore-separated
- Category ID must exist in parent Layout.categories if Some
- Position must be unique within parent Layer

**Special Keycodes**:
- `KC_TRNS` or `KC_TRANSPARENT` - Pass-through to lower layer
- `KC_NO` - No key at this position
- `MO(n)` - Momentary layer activation
- `TG(n)` - Toggle layer
- Layer switch codes validated for layer number in range

**Relationships**:
- Belongs to: Layer
- References: Position, Category (optional)
- Validated against: KeycodeDatabase

---

### Category

User-defined grouping for organizing keys by logical function.

**Fields**:
- `id: String` - Unique identifier in kebab-case (e.g., "navigation", "symbols")
- `name: String` - Display name (e.g., "Navigation", "Symbols")
- `color: RgbColor` - RGB color for visual identification

**Validation Rules**:
- ID must be unique within Layout
- ID format: lowercase, hyphens only, no spaces (kebab-case)
- Name must be non-empty, max 50 characters
- Color must be valid RGB (0-255 per channel)

**Common Categories** (examples):
- navigation: Arrow keys, Home/End, Page Up/Down
- symbols: Punctuation, brackets, operators
- numbers: 0-9, numpad keys
- function: F1-F12 keys
- media: Play, pause, volume, brightness
- modifiers: Shift, Ctrl, Alt, GUI

**Relationships**:
- Belongs to: Layout
- Referenced by: Layer (optional category_id), KeyDefinition (optional category_id)

---

### Position

Simple value object for visual grid coordinates.

**Fields**:
- `row: u8` - Visual row (0-3 for most keyboards)
- `col: u8` - Visual column (0-13 for 46-key split layouts, 0-11 for 36-key)

**Validation Rules**:
- Row and col must be within geometry bounds
- Position must map to valid matrix position via VisualLayoutMapping

**Usage**:
- User's mental model (how keys appear in Markdown tables)
- Cursor navigation (arrow keys move between positions)
- Rendering coordinates (converted to terminal x/y)

**Relationships**:
- Part of: KeyDefinition
- Mapped by: VisualLayoutMapping

---

### RgbColor

RGB color value with hex string representation.

**Fields**:
- `r: u8` - Red channel (0-255)
- `g: u8` - Green channel (0-255)
- `b: u8` - Blue channel (0-255)

**Derived Fields**:
- `hex: String` - Computed hex representation "#RRGGBB"

**Validation Rules**:
- All channels 0-255 (validated by type system)
- Hex format: # followed by exactly 6 hex digits (uppercase)

**Parsing**:
- From hex string: "#FF0000" → RgbColor { r: 255, g: 0, b: 0 }
- Strip # prefix if present
- Case-insensitive hex parsing
- Invalid format returns error with specific problem

**Serialization**:
- Markdown: `{#RRGGBB}` syntax in table cells
- TOML: hex string "#RRGGBB"
- Display: colored terminal output using Ratatui Color

**Relationships**:
- Used by: Layer (default_color), KeyDefinition (color_override), Category (color)

---

## Geometry Entities

### KeyboardGeometry

Physical keyboard definition loaded from QMK info.json.

**Fields**:
- `keyboard_name: String` - QMK keyboard identifier (e.g., "crkbd")
- `layout_name: String` - Specific layout variant (e.g., "LAYOUT_split_3x6_3")
- `matrix_rows: u8` - Electrical matrix row count (e.g., 8 for split Corne)
- `matrix_cols: u8` - Electrical matrix column count (e.g., 7)
- `keys: Vec<KeyGeometry>` - Physical key definitions (one per key)

**Validation Rules**:
- keyboard_name must match QMK directory structure
- layout_name must exist in keyboard's info.json layouts section
- matrix dimensions must match info.json
- keys vec size determines supported key count

**Loading Process**:
1. Read `vial-qmk-keebart/keyboards/{keyboard}/info.json`
2. Parse JSON with serde_json
3. Extract layout definition by layout_name
4. Build KeyGeometry for each key in layout.layout array
5. Create VisualLayoutMapping from geometry

**Relationships**:
- Has many: KeyGeometry
- Used by: VisualLayoutMapping (to build coordinate maps)
- Referenced by: AppState (current_geometry)

---

### KeyGeometry

Individual key's physical properties from QMK layout definition.

**Fields**:
- `matrix_position: (u8, u8)` - Electrical matrix (row, col)
- `led_index: u8` - Sequential LED index (0-based)
- `visual_x: f32` - Physical X position in keyboard units (1u = key width)
- `visual_y: f32` - Physical Y position in keyboard units
- `width: f32` - Key width in keyboard units (default 1.0)
- `height: f32` - Key height in keyboard units (default 1.0)
- `rotation: f32` - Rotation in degrees (default 0.0, future use)

**Coordinate Conversion** (to terminal):
- Terminal X = visual_x * 7 characters per keyboard unit
- Terminal Y = visual_y * 2.5 lines per keyboard unit
- Width chars = width * 7 (minimum 3)
- Height lines = height * 2.5 (minimum 3)

**Validation Rules**:
- Matrix position must be within matrix dimensions
- LED index must be unique (sequential 0 to N-1)
- Visual coordinates must be non-negative
- Width and height must be > 0

**Relationships**:
- Belongs to: KeyboardGeometry
- Used by: VisualLayoutMapping (to compute visual positions)

---

### VisualLayoutMapping

Bidirectional coordinate transformation system.

**Fields**:
- `led_to_matrix: Vec<(u8, u8)>` - LED index → matrix position (indexed by LED)
- `matrix_to_led: HashMap<(u8, u8), u8>` - Matrix position → LED index
- `matrix_to_visual: HashMap<(u8, u8), (u8, u8)>` - Matrix → visual position
- `visual_to_matrix: HashMap<(u8, u8), (u8, u8)>` - Visual → matrix position

**Key Methods**:
- `led_to_matrix_pos(led: u8) -> Option<(u8, u8)>` - For firmware generation
- `matrix_to_visual_pos(row: u8, col: u8) -> Option<(u8, u8)>` - For parsing
- `visual_to_matrix_pos(row: u8, col: u8) -> Option<(u8, u8)>` - For saving
- `visual_to_led_index(row: u8, col: u8) -> Option<u8>` - For RGB config

**Building Process**:
1. Iterate through KeyboardGeometry.keys
2. For each KeyGeometry:
   - led_to_matrix[led_index] = matrix_position
   - matrix_to_led[matrix_position] = led_index
   - Compute visual_position from visual_x/visual_y (quantize to grid)
   - matrix_to_visual[matrix_position] = visual_position
   - visual_to_matrix[visual_position] = matrix_position

**Special Handling**:
- Split keyboards: Right half columns reversed (col 0 = rightmost)
- EX keys: Extra column positions (col 6 and 13 for 14-column layouts)
- Thumb keys: Span multiple visual columns but single matrix position

**Relationships**:
- Built from: KeyboardGeometry
- Referenced by: AppState (current_mapping)
- Used by: Parser (file loading), Firmware generator (code generation)

---

## Configuration Entities

### Config

Application configuration persisted to TOML file.

**Fields**:
- `paths: PathConfig` - File system paths
  - `qmk_firmware: Option<PathBuf>` - QMK firmware directory
- `build: BuildConfig` - Firmware build settings
  - `keyboard: String` - Target keyboard (e.g., "crkbd")
  - `layout: String` - Layout variant (e.g., "LAYOUT_split_3x6_3")
  - `keymap: String` - Keymap name (e.g., "default")
  - `output_format: String` - Format: "uf2", "hex", or "bin"
  - `output_dir: PathBuf` - Build output directory
- `ui: UiConfig` - UI preferences
  - `theme: String` - Color theme (future feature)
  - `show_help_on_startup: bool` - Display help on first run

**Validation Rules**:
- qmk_firmware path must exist and contain Makefile, keyboards/ directory
- keyboard must exist in qmk_firmware/keyboards/
- layout must exist in keyboard's info.json
- output_format must be "uf2", "hex", or "bin"
- output_dir parent must exist and be writable

**Default Values**:
- qmk_firmware: None (prompts onboarding wizard)
- keyboard: "crkbd"
- layout: "LAYOUT_split_3x6_3"
- keymap: "default"
- output_format: "uf2"
- output_dir: ".build"
- theme: "default"
- show_help_on_startup: true

**File Location**:
- Unix/Linux/macOS: `~/.config/layout_tools/config.toml`
- Windows: `%APPDATA%\layout_tools\config.toml`

**Relationships**:
- Referenced by: AppState (current_config)
- Used by: Keyboard scanner, firmware builder, onboarding wizard

---

### LayoutMetadata

File metadata embedded in YAML frontmatter.

**Fields**:
- `name: String` - Layout name (e.g., "My Corne Layout")
- `description: String` - Long description
- `author: String` - Creator name
- `created: DateTime<Utc>` - Creation timestamp (ISO 8601)
- `modified: DateTime<Utc>` - Last modification timestamp (ISO 8601)
- `tags: Vec<String>` - Searchable keywords
- `is_template: bool` - Template flag (saves to templates/ directory)
- `version: String` - Schema version (e.g., "1.0")

**Validation Rules**:
- name must be non-empty, max 100 characters
- created must be <= modified
- tags must be lowercase, hyphen/alphanumeric only
- version must match supported versions (currently "1.0")

**YAML Frontmatter Format**:
```yaml
---
name: "QWERTY Programming"
description: "Optimized for programming with symbols on layer 1"
author: "username"
created: "2024-01-15T10:30:00Z"
modified: "2024-01-20T15:45:00Z"
tags: ["qwerty", "programming", "symbols"]
is_template: false
version: "1.0"
---
```

**Relationships**:
- Part of: Layout
- Used by: Template browser (filtering/search), metadata editor

---

## Application State Entity

### AppState

Centralized application state (singleton pattern).

**Fields**:

**Core Data**:
- `layout: Layout` - Current layout being edited
- `source_path: Option<PathBuf>` - File path (None for new layouts)
- `dirty: bool` - Unsaved changes flag

**UI State**:
- `current_layer: usize` - Active layer index (0-based)
- `selected_position: Position` - Cursor position
- `active_popup: Option<PopupType>` - Current dialog
- `status_message: String` - Bottom status bar text

**Component States**:
- `keycode_picker_state: KeycodePickerState`
  - search: String, selected: usize, active_category: Category
- `color_picker_state: ColorPickerState`
  - r: u8, g: u8, b: u8, active_channel: RGBChannel
- `category_picker_state: CategoryPickerState`
  - selected: usize
- `category_manager_state: CategoryManagerState`
  - categories: Vec<Category>, selected: usize, mode: ManagerMode
- `template_browser_state: TemplateBrowserState`
  - templates: Vec<Template>, search: String, selected: usize
- `help_overlay_state: HelpOverlayState`
  - scroll_offset: usize
- `build_log_state: BuildLogState`
  - log_lines: Vec<String>, scroll_offset: usize
- `onboarding_state: OnboardingState`
  - current_step: usize, inputs: HashMap<String, String>
- `metadata_editor_state: MetadataEditorState`
  - active_field: MetadataField, values: HashMap<String, String>

**System State**:
- `keycode_db: KeycodeDatabase` - 600+ QMK keycodes with categories
- `keyboard_geometry: KeyboardGeometry` - Physical key positions
- `visual_layout_mapping: VisualLayoutMapping` - Coordinate transforms
- `config: Config` - User configuration
- `matrix_mapping: MatrixMapping` - Electrical wiring (deprecated, use visual_layout_mapping)

**Build State**:
- `build_state: BuildState` - Idle/Validating/Compiling/Success/Failed
- `build_receiver: Option<Receiver<BuildMessage>>` - Channel from build thread

**Lifecycle**:
1. Initialization: Load config, parse layout file, build geometry/mappings
2. Main loop: Poll events → handle → update state → render
3. Termination: Check dirty flag → prompt save → cleanup

**Relationships**:
- Contains: Layout, Config, KeyboardGeometry, VisualLayoutMapping
- Referenced by: All UI components (immutable reads)
- Modified by: Event handlers (mutable access in main loop)

---

## Validation Summary

All entities follow these validation principles:

1. **Type Safety**: Rust type system enforces basic constraints (u8 for indices, PathBuf for paths)
2. **Parse-Time Validation**: Files validated during parsing (keycode existence, coordinate bounds)
3. **Pre-Save Validation**: Layouts validated before writing (no gaps, all keycodes valid)
4. **Pre-Build Validation**: Matrix coverage checked before firmware generation
5. **User Feedback**: Validation errors include line numbers, specific problems, suggested fixes

**Error Message Examples**:
- "Invalid keycode 'KC_FOO' at layer 0, row 2, col 5. Did you mean 'KC_F1'?"
- "Position (3, 14) out of bounds for layout LAYOUT_split_3x6_3 (max col: 13)"
- "Category 'navigation' referenced but not defined in layout"
- "Duplicate position (0, 0) in layer 1"
- "QMK firmware path '/invalid/path' does not contain keyboards/ directory"
