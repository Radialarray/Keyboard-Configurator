# QMK info.json Schema (Subset)

**Version**: QMK 0.20+  
**Purpose**: Define the structure of QMK keyboard info.json files that we parse for geometry data

## Overview

This document describes the **subset** of QMK's info.json schema that the TUI application reads. QMK's full schema is more extensive; we only parse fields needed for keyboard geometry, layout variants, and matrix mapping.

**QMK Documentation**: https://docs.qmk.fm/#/reference_info_json

## File Location

`{qmk_firmware}/keyboards/{keyboard}/info.json`

**Examples**:
- `vial-qmk-keebart/keyboards/crkbd/info.json`
- `vial-qmk-keebart/keyboards/keebart/corne_choc_pro/mini/info.json`

## Required Fields (Subset)

```json
{
  "keyboard_name": "string",
  "manufacturer": "string",
  "layouts": {
    "LAYOUT_name": {
      "layout": [
        {
          "matrix": [row, col],
          "x": float,
          "y": float,
          "w": float,
          "h": float
        }
      ]
    }
  }
}
```

## Field Specifications

### `keyboard_name`

- **Type**: String
- **Required**: Yes
- **Description**: Human-readable keyboard name
- **Usage**: Display in keyboard picker, log messages

**Examples**:
```json
"keyboard_name": "Corne"
"keyboard_name": "Keebart Corne Choc Pro Mini"
"keyboard_name": "ErgoDox EZ"
```

### `manufacturer`

- **Type**: String
- **Required**: Yes
- **Description**: Keyboard manufacturer/designer name
- **Usage**: Display in keyboard picker for grouping

**Examples**:
```json
"manufacturer": "foostan"
"manufacturer": "Keebart"
"manufacturer": "ZSA Technology Labs"
```

### `layouts`

- **Type**: Object (dictionary)
- **Required**: Yes
- **Description**: Map of layout variant names to layout definitions
- **Keys**: Layout macro names (e.g., "LAYOUT_split_3x6_3")
- **Values**: Layout definition objects

**Structure**:
```json
"layouts": {
  "LAYOUT_split_3x6_3": { /* layout def */ },
  "LAYOUT_split_3x6_3_ex2": { /* layout def */ },
  "LAYOUT_split_3x5_3": { /* layout def */ }
}
```

## Layout Definition Object

### `layout` Array

- **Type**: Array of key position objects
- **Required**: Yes
- **Description**: Physical and electrical position of each key
- **Length**: Number of keys in layout (e.g., 42 for split_3x6_3)
- **Order**: Must match firmware LAYOUT macro parameter order

**Example**:
```json
"LAYOUT_split_3x6_3": {
  "layout": [
    {"matrix": [0, 0], "x": 0, "y": 0},
    {"matrix": [0, 1], "x": 1, "y": 0},
    {"matrix": [0, 2], "x": 2, "y": 0},
    ...
  ]
}
```

## Key Position Object

### `matrix`

- **Type**: Array of two integers `[row, col]`
- **Required**: Yes
- **Description**: Electrical matrix position (how key is wired)
- **Range**: `row` in 0-15, `col` in 0-15 (typical)

**Split Keyboard Convention**:
- Rows 0-N: Left half
- Rows N+1 to 2N+1: Right half
- Example (Corne): Rows 0-3 left, rows 4-7 right

**Examples**:
```json
"matrix": [0, 0]   // Left half, first row, first column
"matrix": [4, 0]   // Right half, first row, first column (electrically)
```

### `x` (X Position)

- **Type**: Float
- **Required**: Yes
- **Description**: Horizontal position in keyboard units (1u = standard key width)
- **Origin**: Top-left corner (0, 0)
- **Precision**: Typically 0.25u increments

**Examples**:
```json
"x": 0        // Leftmost position
"x": 1.5      // 1.5 key widths from left (1.5u offset)
"x": 7.5      // Right half start (typical split keyboard)
```

### `y` (Y Position)

- **Type**: Float
- **Required**: Yes
- **Description**: Vertical position in keyboard units
- **Origin**: Top-left corner (0, 0)
- **Precision**: Typically 0.25u increments

**Examples**:
```json
"y": 0        // Top row
"y": 1        // Second row (1u down)
"y": 3.5      // Thumb row (3.5u down, common for Corne)
```

### `w` (Width)

- **Type**: Float
- **Required**: No (defaults to 1.0)
- **Description**: Key width in keyboard units
- **Default**: 1.0 (standard key width)

**Examples**:
```json
"w": 1.0      // Standard key
"w": 1.5      // 1.5u key (common for thumb keys)
"w": 2.0      // 2u key (spacebar, enter on some layouts)
```

### `h` (Height)

- **Type**: Float
- **Required**: No (defaults to 1.0)
- **Description**: Key height in keyboard units
- **Default**: 1.0 (standard key height)

**Examples**:
```json
"h": 1.0      // Standard key
"h": 2.0      // 2u vertical key (some ISO enters)
```

### `r` (Rotation) - Not Currently Used

- **Type**: Float
- **Required**: No (defaults to 0.0)
- **Description**: Rotation angle in degrees
- **Note**: Parsed but not used in current implementation
- **Future**: May be used for advanced rendering

## Complete Example

**File**: `vial-qmk-keebart/keyboards/crkbd/info.json`

```json
{
  "keyboard_name": "Corne",
  "manufacturer": "foostan",
  "url": "https://github.com/foostan/crkbd",
  "maintainer": "foostan",
  "usb": {
    "vid": "0x4653",
    "pid": "0x0001",
    "device_version": "0.0.1"
  },
  "matrix_pins": {
    "cols": ["F4", "F5", "F6", "F7", "B1", "B3", "B2"],
    "rows": ["D4", "C6", "D7", "E6"]
  },
  "diode_direction": "COL2ROW",
  "split": {
    "enabled": true,
    "soft_serial_pin": "D2"
  },
  "processor": "atmega32u4",
  "bootloader": "caterina",
  "layouts": {
    "LAYOUT_split_3x6_3": {
      "layout": [
        {"matrix": [0, 0], "x": 0, "y": 0.3},
        {"matrix": [0, 1], "x": 1, "y": 0.1},
        {"matrix": [0, 2], "x": 2, "y": 0},
        {"matrix": [0, 3], "x": 3, "y": 0.1},
        {"matrix": [0, 4], "x": 4, "y": 0.2},
        {"matrix": [0, 5], "x": 5, "y": 0.3},
        {"matrix": [4, 0], "x": 9, "y": 0.3},
        {"matrix": [4, 1], "x": 10, "y": 0.2},
        {"matrix": [4, 2], "x": 11, "y": 0.1},
        {"matrix": [4, 3], "x": 12, "y": 0},
        {"matrix": [4, 4], "x": 13, "y": 0.1},
        {"matrix": [4, 5], "x": 14, "y": 0.3},
        
        {"matrix": [1, 0], "x": 0, "y": 1.3},
        {"matrix": [1, 1], "x": 1, "y": 1.1},
        {"matrix": [1, 2], "x": 2, "y": 1},
        {"matrix": [1, 3], "x": 3, "y": 1.1},
        {"matrix": [1, 4], "x": 4, "y": 1.2},
        {"matrix": [1, 5], "x": 5, "y": 1.3},
        {"matrix": [5, 0], "x": 9, "y": 1.3},
        {"matrix": [5, 1], "x": 10, "y": 1.2},
        {"matrix": [5, 2], "x": 11, "y": 1.1},
        {"matrix": [5, 3], "x": 12, "y": 1},
        {"matrix": [5, 4], "x": 13, "y": 1.1},
        {"matrix": [5, 5], "x": 14, "y": 1.3},
        
        {"matrix": [2, 0], "x": 0, "y": 2.3},
        {"matrix": [2, 1], "x": 1, "y": 2.1},
        {"matrix": [2, 2], "x": 2, "y": 2},
        {"matrix": [2, 3], "x": 3, "y": 2.1},
        {"matrix": [2, 4], "x": 4, "y": 2.2},
        {"matrix": [2, 5], "x": 5, "y": 2.3},
        {"matrix": [6, 0], "x": 9, "y": 2.3},
        {"matrix": [6, 1], "x": 10, "y": 2.2},
        {"matrix": [6, 2], "x": 11, "y": 2.1},
        {"matrix": [6, 3], "x": 12, "y": 2},
        {"matrix": [6, 4], "x": 13, "y": 2.1},
        {"matrix": [6, 5], "x": 14, "y": 2.3},
        
        {"matrix": [3, 3], "x": 3.5, "y": 3.5, "w": 1.5},
        {"matrix": [3, 4], "x": 5, "y": 3.5},
        {"matrix": [3, 5], "x": 6, "y": 3.7, "h": 1.5},
        {"matrix": [7, 0], "x": 8, "y": 3.7, "h": 1.5},
        {"matrix": [7, 1], "x": 9, "y": 3.5},
        {"matrix": [7, 2], "x": 10, "y": 3.5, "w": 1.5}
      ]
    }
  }
}
```

## Parsing Strategy

### 1. Load and Parse JSON

```rust
use serde_json::Value;

fn load_keyboard_info(qmk_path: &Path, keyboard: &str) -> Result<Value> {
    let info_path = qmk_path
        .join("keyboards")
        .join(keyboard)
        .join("info.json");
    
    let json_str = std::fs::read_to_string(&info_path)?;
    let info: Value = serde_json::from_str(&json_str)?;
    Ok(info)
}
```

### 2. Extract Layout Definition

```rust
fn get_layout_definition(info: &Value, layout_name: &str) -> Result<&Value> {
    info.get("layouts")
        .and_then(|layouts| layouts.get(layout_name))
        .and_then(|layout_def| layout_def.get("layout"))
        .ok_or_else(|| format!("Layout {} not found", layout_name))
}
```

### 3. Build KeyGeometry Vec

```rust
fn build_keyboard_geometry(
    info: &Value,
    layout_name: &str
) -> Result<KeyboardGeometry> {
    let keyboard_name = info["keyboard_name"].as_str().unwrap_or("Unknown");
    let layout_array = get_layout_definition(info, layout_name)?;
    
    let mut keys = Vec::new();
    for (led_index, key) in layout_array.as_array().unwrap().iter().enumerate() {
        let matrix = key["matrix"].as_array().unwrap();
        let matrix_row = matrix[0].as_u64().unwrap() as u8;
        let matrix_col = matrix[1].as_u64().unwrap() as u8;
        
        let x = key["x"].as_f64().unwrap() as f32;
        let y = key["y"].as_f64().unwrap() as f32;
        let w = key.get("w").and_then(|v| v.as_f64()).unwrap_or(1.0) as f32;
        let h = key.get("h").and_then(|v| v.as_f64()).unwrap_or(1.0) as f32;
        
        keys.push(KeyGeometry {
            matrix_position: (matrix_row, matrix_col),
            led_index: led_index as u8,
            visual_x: x,
            visual_y: y,
            width: w,
            height: h,
            rotation: 0.0,  // Default, not parsed currently
        });
    }
    
    Ok(KeyboardGeometry {
        keyboard_name: keyboard_name.to_string(),
        layout_name: layout_name.to_string(),
        matrix_rows: compute_max_row(&keys) + 1,
        matrix_cols: compute_max_col(&keys) + 1,
        keys,
    })
}
```

### 4. Build VisualLayoutMapping

```rust
fn build_visual_layout_mapping(geom: &KeyboardGeometry) -> VisualLayoutMapping {
    let mut led_to_matrix = Vec::new();
    let mut matrix_to_led = HashMap::new();
    let mut matrix_to_visual = HashMap::new();
    let mut visual_to_matrix = HashMap::new();
    
    for key in &geom.keys {
        let matrix_pos = key.matrix_position;
        let led_idx = key.led_index;
        
        // LED ↔ Matrix
        led_to_matrix.push(matrix_pos);
        matrix_to_led.insert(matrix_pos, led_idx);
        
        // Compute visual position (quantize to grid)
        let visual_pos = compute_visual_position(key, geom);
        
        // Matrix ↔ Visual
        matrix_to_visual.insert(matrix_pos, visual_pos);
        visual_to_matrix.insert(visual_pos, matrix_pos);
    }
    
    VisualLayoutMapping {
        led_to_matrix,
        matrix_to_led,
        matrix_to_visual,
        visual_to_matrix,
    }
}
```

## Visual Position Computation

### Algorithm

Convert physical position (x, y in keyboard units) to visual grid position (row, col):

```rust
fn compute_visual_position(key: &KeyGeometry, geom: &KeyboardGeometry) -> (u8, u8) {
    // Quantize to nearest grid position
    let visual_row = key.visual_y.round() as u8;
    
    // Split keyboard handling
    let is_right_half = key.matrix_position.0 >= (geom.matrix_rows / 2);
    
    if is_right_half {
        // Right half: Reverse columns and offset
        // Typical: x=9-14 maps to visual cols 7-12
        let right_col = (key.visual_x - 9.0).round() as u8;
        let visual_col = 7 + right_col;  // Offset for split
        (visual_row, visual_col)
    } else {
        // Left half: Direct mapping
        let visual_col = key.visual_x.round() as u8;
        (visual_row, visual_col)
    }
}
```

**Notes**:
- Physical coordinates (x, y) are floats for precise positioning
- Visual coordinates (row, col) are integers for grid-based editing
- Split keyboards: Gap between halves (typically x=6-8 unused)
- Right half offset: Physical x=9-14 → Visual col=7-12

## Validation Rules

### File Level

- File must exist at expected path
- JSON must be syntactically valid
- Must contain required fields: keyboard_name, manufacturer, layouts

### Layout Level

- At least one layout must be defined
- Layout names must match pattern: `^LAYOUT_[a-z0-9_]+$`
- Layout array must be non-empty

### Key Level

- All keys must have matrix positions within reasonable bounds (row <16, col <16)
- Physical positions (x, y) must be non-negative
- Dimensions (w, h) must be positive if present
- No duplicate matrix positions within layout
- LED indices must be sequential 0 to N-1

## Error Handling

**File Errors**:
```
Error: Cannot load keyboard info: /path/to/qmk_firmware/keyboards/invalid/info.json
  File does not exist
  Suggestion: Check keyboard name in configuration (Ctrl+K to change)

Error: Invalid JSON in info.json: /path/to/file
  JSON parse error at line 45: unexpected token '}'
  Suggestion: Validate JSON syntax or report issue to QMK
```

**Layout Errors**:
```
Error: Layout 'LAYOUT_invalid' not found in info.json
  Keyboard: crkbd
  Available layouts: LAYOUT_split_3x6_3, LAYOUT_split_3x6_3_ex2, LAYOUT_split_3x5_3
  Suggestion: Use layout picker (Ctrl+Y) to select valid layout

Warning: Unusual matrix dimensions detected
  Keyboard: custom_board
  Matrix: 10 rows × 15 cols (150 possible positions)
  Layout uses: 42 keys
  Note: Large matrix may indicate wiring issue (verify with keyboard documentation)
```

## Implementation Notes

- Use `serde_json` for parsing (built-in Rust support)
- Cache parsed geometry (expensive to parse repeatedly)
- Reload geometry only when keyboard/layout changes
- Support partial parsing (skip unknown fields for forward compatibility)
- Log warnings for unusual configurations (large matrices, duplicate positions)

## QMK Version Compatibility

- **Tested**: QMK 0.20+, Vial fork
- **Minimum**: QMK 0.15+ (when info.json schema stabilized)
- **Forward Compatible**: Unknown fields ignored
- **Breaking Changes**: Unlikely (info.json is stable API)

**Note**: Full QMK schema includes many more fields (USB IDs, features, RGB config, etc.). We only parse fields required for physical layout geometry.
