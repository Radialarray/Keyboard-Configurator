# Keyboard TUI

Terminal-based keyboard layout editor for mechanical keyboards with QMK firmware support.

## Features

- Visual keyboard layout editing in the terminal
- Support for multiple layers and complex layouts
- Color-coded key categories for easy organization
- Human-readable Markdown file format for layouts
- QMK firmware generation and compilation
- Template system for reusable layouts

## Status

🚧 **In Development** - Phase 1 (Setup) Complete

This project is under active development. See the [tasks list](specs/001-tui-complete-features/tasks.md) for current progress.

## Requirements

- Rust 1.75 or higher
- QMK firmware repository (for keyboard definitions and compilation)
- Terminal with ANSI escape sequence support

## Installation

```bash
cargo build --release
```

## Usage

```bash
# Run the editor
keyboard_tui path/to/layout.md

# Initialize configuration
keyboard_tui --init

# Show help
keyboard_tui --help
```

## Project Structure

```
src/
├── models/        # Data structures (Layout, Layer, KeyDefinition)
├── parser/        # File parsing (Markdown, QMK info.json)
├── tui/           # Terminal UI components
├── keycode_db/    # QMK keycode database
├── firmware/      # Firmware generation and building
└── main.rs        # Entry point
```

## Documentation

- [Architecture Guide](TUI_ARCHITECTURE_GUIDE.md) - Technical architecture and design patterns
- [Quickstart](QUICKSTART.md) - Getting started guide
- [Implementation Plan](specs/001-tui-complete-features/plan.md) - Feature implementation details
- [Task Breakdown](specs/001-tui-complete-features/tasks.md) - Development task list

## License

MIT
