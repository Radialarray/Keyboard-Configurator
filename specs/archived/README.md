# Archived Specifications

This directory contains all completed specification documents from the keyboard-configurator project development.

## Purpose

These specifications document the development history and architectural decisions made during the project. They are archived here for reference but are no longer actively used. The key information from these specs has been consolidated into the main documentation in the `docs/` directory.

## Consolidated Documentation

For current documentation, please refer to:

- **`../../docs/FEATURES.md`** - Complete feature list and capabilities
- **`../../docs/ARCHITECTURE.md`** - Technical architecture and design patterns
- **`../../README.md`** - Project overview and getting started guide
- **`../../TUI_ARCHITECTURE_GUIDE.md`** - In-depth TUI architecture reference

## Archived Specs

### Foundation & Core Features
- **001-tui-complete-features** - Initial TUI implementation
- **002-fix-startup-warnings** - Compiler warning fixes and code cleanup
- **003-theme-consistency** - Theme system implementation

### Configuration & Validation
- **004-config-merger-fix** - Configuration merging improvements
- **004-variant-path-fix** - Layout variant path handling

### Visual Features
- **008-layer-aware-rgb** - Layer-specific RGB lighting configuration
- **012-color-palette** - Color palette system

### Keycode System
- **009-complete-qmk-keycodes** - Complete QMK keycode database
- **010-parameterized-keycodes** - Parameterized keycode support
- **011-tap-hold-settings** - Tap-hold configuration

### User Experience
- **013-key-clipboard** - Key copy/paste functionality
- **014-key-editor-dialog** - Key editor dialog interface

### Code Quality
- **015-hardcoded-values-refactor** - Removal of hardcoded values
- **018-reduce-cognitive-complexity** - Code complexity reduction

### Major Refactoring
- **016-migrate-to-standard-qmk** - Migration to standard QMK firmware structure
- **017-tui-architecture-refactor** - Component trait pattern implementation (Wave 8 foundation)

### Other
- **startup_errors.md** - Historical error log from early development

## Note

These specifications are kept for historical reference. When working on new features, refer to the consolidated documentation in the `docs/` directory instead.
