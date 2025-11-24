# Implementation Plan: Complete TUI Keyboard Layout Editor

**Branch**: `001-tui-complete-features` | **Date**: 2024-11-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-tui-complete-features/spec.md`

**Note**: This plan follows the architecture defined in TUI_ARCHITECTURE_GUIDE.md and feature list from QUICKSTART.md.

## Summary

Build a terminal-based keyboard layout editor that allows users to visually edit mechanical keyboard layouts, assign keycodes to keys, manage colors and categories for visual organization, save layouts as human-readable Markdown files, and generate/compile QMK firmware. The application uses immediate-mode rendering with Ratatui, centralized state management, three-coordinate mapping system for keyboard geometry, and background threads for firmware compilation.

## Technical Context

**Language/Version**: Rust 1.75+  
**Primary Dependencies**: Ratatui 0.26 (TUI framework), Crossterm 0.27 (terminal backend), Serde 1.0 (serialization)  
**Storage**: Markdown files for layouts (YAML frontmatter + tables), TOML for configuration (~/.config/layout_tools/config.toml), templates in ~/.config/layout_tools/templates/  
**Testing**: cargo test (unit tests for parsers/models/transforms), integration tests for file I/O and firmware generation, contract tests for QMK compatibility  
**Target Platform**: Cross-platform terminal (Unix/Linux/macOS/Windows) with ANSI escape sequence and Unicode support, minimum 80×24 terminal size  
**Project Type**: Single Rust binary application with modular crate structure  
**Performance Goals**: 60fps rendering (16ms/frame), <100ms keycode search response, <2s firmware generation, <100MB memory footprint  
**Constraints**: Event-driven rendering only on state changes, background threads for blocking operations, read-only access to QMK submodule  
**Scale/Scope**: Support 600+ QMK keycodes, handle keyboards with up to 46 keys per layer, 12 layers max recommended, three-coordinate system (visual/matrix/LED)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. User-Centered Design
- ✅ **Compliant**: VIM-inspired keyboard shortcuts (hjkl, arrow keys)
- ✅ **Compliant**: Help overlay accessible via '?' key with organized documentation
- ✅ **Compliant**: Status bar with contextual messages and mode indicators
- ✅ **Compliant**: First-run onboarding wizard for configuration
- ✅ **Compliant**: Visual feedback for all actions (color coding, dirty flag asterisk)

### II. Human-Readable Persistence
- ✅ **Compliant**: Layouts stored as Markdown with YAML frontmatter
- ✅ **Compliant**: Configuration in TOML format
- ✅ **Compliant**: Generated keymap.c and vial.json are readable/editable
- ✅ **Compliant**: Color syntax {#RRGGBB} and category syntax @category-id in Markdown

### III. Modular Architecture
- ✅ **Compliant**: Separate modules for models/, parser/, tui/, keycode_db/
- ✅ **Compliant**: Data models isolated from UI (Layout, Layer, KeyDefinition)
- ✅ **Compliant**: Parsers independent of rendering (layout.rs, table.rs, keyboard_json.rs)
- ✅ **Compliant**: Coordinate transformations in dedicated VisualLayoutMapping module
- ✅ **Compliant**: UI widgets stateless, reading from centralized AppState

### IV. State Management Discipline
- ✅ **Compliant**: Single AppState object as source of truth
- ✅ **Compliant**: Immutable reads from UI components
- ✅ **Compliant**: Explicit state mutations in event handlers
- ✅ **Compliant**: Dirty flag tracked in AppState
- ✅ **Compliant**: No hidden state in widgets (immediate-mode rendering)

### V. Testing Strategy
- ✅ **Compliant**: Unit tests for parsers, models, coordinate transformations
- ✅ **Compliant**: Integration tests for file I/O (Markdown round-trip)
- ✅ **Compliant**: Integration tests for firmware generation
- ✅ **Compliant**: Test coverage for edge cases (invalid keycodes, malformed files)
- ✅ **Compliant**: Validation tests for geometry transformations

### VI. Performance Awareness
- ✅ **Compliant**: Target 60fps (16ms/frame) with event-driven rendering
- ✅ **Compliant**: 100ms poll timeout for event loop
- ✅ **Compliant**: Background thread for firmware compilation
- ✅ **Compliant**: Caching for keycode database and geometry lookups
- ✅ **Compliant**: Viewport culling for keys outside terminal bounds

### VII. Firmware Integration Safety
- ✅ **Compliant**: Validation before generation (invalid keycodes, matrix coverage)
- ✅ **Compliant**: Clear error messages with specific key positions
- ✅ **Compliant**: Build log captured with color-coded levels (INFO/OK/ERROR)
- ✅ **Compliant**: Manual flashing only (no automatic flash, user confirmation required)
- ✅ **Compliant**: Recovery instructions in help documentation

**Gate Status**: ✅ **PASSED** - All constitution principles satisfied

## Project Structure

### Documentation (this feature)

```text
specs/001-tui-complete-features/
├── plan.md              # This file
├── research.md          # Phase 0: Architecture patterns, best practices
├── data-model.md        # Phase 1: Entity relationships and validation
├── quickstart.md        # Phase 1: Getting started guide
├── contracts/           # Phase 1: File format schemas
│   ├── layout-markdown-schema.md
│   ├── config-toml-schema.md
│   └── qmk-info-json-schema.md
└── tasks.md             # Phase 2: Implementation task breakdown (NOT in this command)
```

### Source Code (repository root)

```text
src/
├── main.rs                      # Entry point, CLI argument parsing (clap)
├── config.rs                    # Configuration management (TOML persistence)
├── models/                      # Data structures (no business logic)
│   ├── mod.rs
│   ├── layout.rs                # Layout, LayoutMetadata
│   ├── layer.rs                 # Layer, KeyDefinition, Position
│   ├── category.rs              # Category system
│   ├── rgb.rs                   # RgbColor handling
│   ├── keyboard_geometry.rs     # KeyboardGeometry, KeyGeometry
│   ├── matrix_mapping.rs        # MatrixMapping (electrical wiring)
│   └── visual_layout_mapping.rs # VisualLayoutMapping (coordinate transforms)
├── parser/                      # File parsing and generation (independent of UI)
│   ├── mod.rs
│   ├── layout.rs                # Main layout parser (Markdown → Layout)
│   ├── layer.rs                 # Layer parsing from Markdown tables
│   ├── table.rs                 # Markdown table parsing logic
│   ├── keyboard_json.rs         # QMK info.json parser
│   ├── template_gen.rs          # Markdown layout generator
│   └── vial_config.rs           # Vial JSON generation
├── tui/                         # UI components (stateless widgets)
│   ├── mod.rs                   # Main TUI loop, AppState, event routing
│   ├── keyboard.rs              # Keyboard widget (renders keys)
│   ├── keycode_picker.rs        # Keycode selection dialog
│   ├── color_picker.rs          # RGB color picker
│   ├── category_picker.rs       # Category selection dialog
│   ├── category_manager.rs      # Category CRUD interface
│   ├── template_browser.rs      # Template selection dialog
│   ├── help_overlay.rs          # Help documentation overlay
│   ├── build_log.rs             # Build log viewer
│   ├── onboarding_wizard.rs     # First-run setup wizard
│   ├── metadata_editor.rs       # Layout metadata editor
│   └── status_bar.rs            # Status bar widget
├── keycode_db/                  # Keycode database (embedded data)
│   ├── mod.rs
│   └── keycodes.json            # 600+ QMK keycodes with categories
└── firmware/                    # Firmware generation and building
    ├── mod.rs
    ├── generator.rs             # Generate keymap.c and vial.json
    ├── builder.rs               # Background build process with channels
    └── validator.rs             # Pre-generation validation

tests/
├── unit/                        # Fast, isolated tests
│   ├── parser_tests.rs          # Markdown parsing round-trip
│   ├── coordinate_tests.rs      # Three-coordinate mapping
│   ├── color_priority_tests.rs  # Four-level color system
│   └── keycode_validation_tests.rs
├── integration/                 # Cross-module tests
│   ├── file_io_tests.rs         # Save/load workflows
│   ├── firmware_gen_tests.rs    # Full generation pipeline
│   └── config_tests.rs          # Configuration persistence
└── contract/                    # External format compatibility
    ├── qmk_info_json_tests.rs   # Parse real QMK info.json files
    └── markdown_compatibility_tests.rs

vial-qmk-keebart/                # Git submodule (read-only)
├── keyboards/                   # Keyboard definitions (info.json files)
└── (rest of QMK firmware)

.config/layout_tools/            # User config directory (runtime)
├── config.toml                  # Application configuration
└── templates/                   # User-created templates
    └── *.md                     # Template Markdown files
```

**Structure Decision**: Single Rust project at repository root. All source code in `src/` with clear module boundaries following MVC pattern: models (data), parser (business logic), tui (views/controllers), firmware (generation). Tests organized by type (unit/integration/contract) to support different execution contexts. QMK submodule tracked but not modified. User data stored in platform-specific config directory (~/.config on Unix).

## Complexity Tracking

No constitution violations. All principles satisfied by architecture design from TUI_ARCHITECTURE_GUIDE.md.
