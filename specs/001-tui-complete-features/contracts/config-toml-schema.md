# Configuration TOML Schema

**Version**: 1.0  
**Purpose**: Define the structure of application configuration file for persistent settings

## File Location

- **Unix/Linux/macOS**: `~/.config/layout_tools/config.toml`
- **Windows**: `%APPDATA%\layout_tools\config.toml`

## Schema

```toml
[paths]
qmk_firmware = "/path/to/qmk_firmware"  # Required: Path to QMK firmware repository

[build]
keyboard = "crkbd"                       # Required: Target keyboard identifier
layout = "LAYOUT_split_3x6_3"           # Required: Layout variant name
keymap = "default"                       # Required: Keymap name for output
output_format = "uf2"                    # Required: "uf2", "hex", or "bin"
output_dir = ".build"                    # Required: Build output directory

[ui]
theme = "default"                        # Optional: Color theme (future feature)
show_help_on_startup = true              # Optional: Display help on first run
```

## Field Specifications

### [paths] Section

#### `qmk_firmware`

- **Type**: String (file path)
- **Required**: Yes
- **Description**: Absolute path to QMK firmware repository root
- **Validation**:
  - Path must exist
  - Must contain `Makefile` in root
  - Must contain `keyboards/` subdirectory
  - Must be readable

**Examples**:
```toml
# macOS/Linux
qmk_firmware = "/Users/username/qmk_firmware"
qmk_firmware = "/home/username/code/qmk_firmware"

# Windows
qmk_firmware = "C:\\Users\\username\\qmk_firmware"
```

**Error Messages**:
```
Error: QMK firmware path '/invalid/path' does not exist
Error: Directory '/path' does not contain Makefile (not a valid QMK repository)
Error: Directory '/path' does not contain keyboards/ subdirectory
```

---

### [build] Section

#### `keyboard`

- **Type**: String
- **Required**: Yes
- **Description**: QMK keyboard identifier (directory name in keyboards/)
- **Format**: Path-like string with slashes for nested directories
- **Validation**:
  - Directory must exist: `{qmk_firmware}/keyboards/{keyboard}/`
  - Must contain `info.json` file
  - info.json must be valid JSON

**Examples**:
```toml
keyboard = "crkbd"                              # Top-level keyboard
keyboard = "keebart/corne_choc_pro/mini"       # Nested keyboard
keyboard = "ergodox_ez"                        # Popular keyboard
```

#### `layout`

- **Type**: String
- **Required**: Yes
- **Description**: Layout variant macro name from keyboard's info.json
- **Format**: Uppercase with underscores (e.g., LAYOUT_split_3x6_3)
- **Validation**:
  - Must exist in `{qmk_firmware}/keyboards/{keyboard}/info.json` under `layouts` key
  - Layout must define key positions in `layout` array

**Examples**:
```toml
layout = "LAYOUT_split_3x6_3"        # 42-key Corne
layout = "LAYOUT_split_3x6_3_ex2"    # 46-key Corne with extra keys
layout = "LAYOUT_split_3x5_3"        # 36-key Corne
layout = "LAYOUT_ergodox"            # Ergodox layout
```

**Related Validation**:
- Markdown files must have matching key count (determined by layout)
- Layer tables must match layout dimensions

#### `keymap`

- **Type**: String
- **Required**: Yes
- **Description**: Keymap name for output directory and generated files
- **Format**: Lowercase with underscores, alphanumeric
- **Default**: "default"
- **Validation**:
  - Must match pattern: `^[a-z0-9_]+$`
  - Used in path: `keyboards/{keyboard}/keymaps/{keymap}/`

**Examples**:
```toml
keymap = "default"          # Standard default keymap
keymap = "my_layout"        # Custom keymap name
keymap = "gaming"           # Specialized keymap
```

#### `output_format`

- **Type**: String (enum)
- **Required**: Yes
- **Description**: Firmware binary output format
- **Valid Values**:
  - `"uf2"` - Universal Flashing Format (RP2040 bootloader)
  - `"hex"` - Intel HEX format (AVR chips)
  - `"bin"` - Raw binary format (ARM chips)
- **Default**: "uf2"
- **Validation**: Must be one of the three valid values

**Examples**:
```toml
output_format = "uf2"   # For RP2040-based keyboards (Corne, etc.)
output_format = "hex"   # For AVR-based keyboards (older models)
output_format = "bin"   # For ARM-based keyboards
```

**Platform Mapping**:
- RP2040 (Pi Pico) → uf2
- ATmega32U4 (AVR) → hex
- STM32 (ARM) → bin

#### `output_dir`

- **Type**: String (directory path)
- **Required**: Yes
- **Description**: Directory for generated firmware files (relative to current working directory or absolute)
- **Default**: ".build"
- **Validation**:
  - Parent directory must exist
  - Must be writable
  - Created automatically if doesn't exist

**Examples**:
```toml
output_dir = ".build"                    # Relative to current directory
output_dir = "build"                     # Another relative path
output_dir = "/tmp/firmware_builds"      # Absolute path (Unix)
output_dir = "C:\\firmware\\builds"      # Absolute path (Windows)
```

**Generated Files**:
- `{output_dir}/keymap.c` - Generated keymap source
- `{output_dir}/vial.json` - Vial configuration
- `{qmk_firmware}/.build/{keyboard}_{keymap}.{format}` - QMK output

---

### [ui] Section

#### `theme`

- **Type**: String
- **Required**: No
- **Description**: Color theme name (future feature)
- **Default**: "default"
- **Valid Values**: Currently only "default" supported
- **Validation**: Must be "default" for now

**Examples**:
```toml
theme = "default"     # Only supported value currently
```

**Future Themes** (planned):
- "solarized-dark"
- "gruvbox"
- "nord"
- "monokai"

#### `show_help_on_startup`

- **Type**: Boolean
- **Required**: No
- **Description**: Display help overlay when application starts
- **Default**: true (show help for first-time users)
- **Validation**: Must be boolean (true/false)

**Examples**:
```toml
show_help_on_startup = true   # Show help on startup
show_help_on_startup = false  # Skip help overlay
```

---

## Complete Example

```toml
[paths]
qmk_firmware = "/Users/username/qmk_firmware"

[build]
keyboard = "keebart/corne_choc_pro/mini"
layout = "LAYOUT_split_3x6_3_ex2"
keymap = "my_custom_layout"
output_format = "uf2"
output_dir = ".build"

[ui]
theme = "default"
show_help_on_startup = false
```

## Default Configuration

If config file doesn't exist, application uses these defaults:

```toml
# No [paths] section - triggers onboarding wizard

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

## Configuration Lifecycle

### Initialization

1. Check if config file exists at platform-specific location
2. If missing:
   - Use defaults
   - Trigger onboarding wizard (sets qmk_firmware path)
3. If present:
   - Parse TOML with serde
   - Validate all fields
   - Report errors with specific field and problem

### Updates

Configuration updated when:
- User completes onboarding wizard (sets qmk_firmware)
- User changes settings via dialogs (Ctrl+P, Ctrl+K, Ctrl+Y, etc.)
- User switches keyboard or layout

### Save Process

1. Serialize Config struct to TOML string
2. Write to temp file: `config.toml.tmp`
3. Atomic rename: `config.toml.tmp` → `config.toml`
4. If rename fails, temp file remains for recovery

### Migration

Future versions may add fields:
- Unknown fields ignored (forward compatible)
- Missing fields use defaults (backward compatible)
- Version field may be added for migration logic

## Validation Rules

### Parse-Time Validation

- File must be valid TOML syntax
- All required sections present ([paths], [build])
- All required fields within sections present
- Field types correct (string, boolean, etc.)

### Post-Parse Validation

- `qmk_firmware` path exists and valid
- `keyboard` exists in QMK repository
- `layout` exists in keyboard's info.json
- `output_format` is valid enum value
- `output_dir` parent exists and writable
- `keymap` matches allowed pattern

### Runtime Validation

- Geometry loads successfully from keyboard's info.json
- Layout key count matches expected (e.g., 42 for split_3x6_3)
- QMK build system accessible (make command available)

## Error Messages

Error messages include:
- Config file path
- Section name
- Field name
- Specific problem
- Suggested fix

**Examples**:
```
Error: ~/.config/layout_tools/config.toml: Missing required field 'qmk_firmware'
  Section: [paths]
  Suggestion: Run onboarding wizard (Ctrl+W) to configure QMK path

Error: ~/.config/layout_tools/config.toml: Invalid value for 'output_format'
  Section: [build]
  Field: output_format = "invalid"
  Valid values: "uf2", "hex", "bin"

Error: ~/.config/layout_tools/config.toml: Keyboard not found
  Section: [build]
  Field: keyboard = "nonexistent"
  Path checked: /path/to/qmk_firmware/keyboards/nonexistent/
  Suggestion: Use keyboard picker (Ctrl+K) to select valid keyboard

Warning: ~/.config/layout_tools/config.toml: Unknown field 'future_field'
  Section: [ui]
  Field: future_field = "value"
  This field is ignored (may be from newer version)
```

## Implementation Notes

### Parsing

```rust
use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize)]
struct Config {
    paths: PathConfig,
    build: BuildConfig,
    ui: UiConfig,
}

#[derive(Deserialize, Serialize)]
struct PathConfig {
    qmk_firmware: Option<PathBuf>,
}

#[derive(Deserialize, Serialize)]
struct BuildConfig {
    keyboard: String,
    layout: String,
    keymap: String,
    output_format: String,
    output_dir: PathBuf,
}

#[derive(Deserialize, Serialize)]
struct UiConfig {
    #[serde(default = "default_theme")]
    theme: String,
    #[serde(default = "default_show_help")]
    show_help_on_startup: bool,
}
```

### Loading

```rust
fn load_config() -> Result<Config> {
    let config_path = dirs::config_dir()
        .ok_or("Cannot determine config directory")?
        .join("layout_tools/config.toml");
    
    if !config_path.exists() {
        return Ok(Config::default());
    }
    
    let toml_str = std::fs::read_to_string(&config_path)?;
    let config: Config = toml::from_str(&toml_str)?;
    validate_config(&config)?;
    Ok(config)
}
```

### Saving

```rust
fn save_config(config: &Config) -> Result<()> {
    let config_dir = dirs::config_dir()
        .ok_or("Cannot determine config directory")?
        .join("layout_tools");
    
    std::fs::create_dir_all(&config_dir)?;
    
    let config_path = config_dir.join("config.toml");
    let temp_path = config_dir.join("config.toml.tmp");
    
    let toml_str = toml::to_string_pretty(config)?;
    std::fs::write(&temp_path, toml_str)?;
    std::fs::rename(temp_path, config_path)?;
    
    Ok(())
}
```

## Future Extensions

Planned additions for future versions:

```toml
[build]
# Firmware compilation settings
make_jobs = 4                    # Parallel jobs for faster compilation
extra_flags = "-j4"              # Additional make flags

[paths]
# Additional paths
templates_dir = "~/.config/layout_tools/templates"
layouts_dir = "~/keyboard_layouts"

[ui]
# More UI preferences
default_layer_color = "#808080"
show_color_indicators = true
vim_mode = true                  # Strict VIM navigation only
```
