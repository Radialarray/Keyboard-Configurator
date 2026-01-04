# Layout Export Format Specification

**Version:** 1.0  
**Purpose:** Define the structure for visual keyboard layout exports

## Overview

The export functionality generates a richly-formatted markdown document that provides a complete visual representation of a keyboard layout. The document is designed to be:
- **Human-readable** - Easy to understand at a glance
- **Printable** - Suitable for reference sheets
- **Shareable** - Can be viewed on GitHub, in editors, or converted to PDF
- **Self-contained** - Includes all necessary context and legends

## Document Structure

### 1. Header Section
```markdown
# [Layout Name]

**Keyboard:** [keyboard name]  
**Variant:** [layout variant]  
**Author:** [author]  
**Created:** [creation date]  
**Modified:** [modification date]

[Description if present]
```

### 2. Quick Reference
```markdown
## Quick Reference

- **Layers:** [count]
- **Categories:** [count]
- **Tap Dances:** [count]
- **Color System:** [Individual > Category > Layer > Default]
```

### 3. Keyboard Overview
Visual diagram showing the base layer (layer 0) with all keys rendered using Unicode box-drawing:

```
## Keyboard Layout

Layer 0: Base
┌────────┬────────┬────────┬────────┬────────┬────────┐                    ┌────────┬────────┬────────┬────────┬────────┬────────┐
│  Q [1] │  W [2] │  E [3] │  R [4] │  T [5] │  Y [6] │                    │  U [7] │  I [8] │  O [9] │  P [0] │  [ [-] │  ] [=] │
└────────┴────────┴────────┴────────┴────────┴────────┘                    └────────┴────────┴────────┴────────┴────────┴────────┘
```

**Legend format:**
- Keycode is shown (e.g., "Q")
- Color reference in brackets (e.g., "[1]") maps to color legend below
- Split keyboards show left/right halves with spacing

### 4. Layer-by-Layer Diagrams

Each layer gets its own visual representation:

```markdown
## Layer 1: Symbols

[Full keyboard diagram for layer 1]

**Purpose:** [Description if available]
**Default Color:** #RRGGBB
**Categories Used:** [List of categories on this layer]
```

### 5. Color Legend

```markdown
## Color System

### Color Priority
1. **Individual Key Color** (highest) - Manually assigned to specific key
2. **Key Category Color** - Color from assigned category
3. **Layer Category Color** - Category assigned to entire layer
4. **Layer Default Color** (lowest) - Fallback color for layer

### Color Reference
[1] #FF0000 - delete (individual)
[2] #00FF00 - navigation (category)
[3] #0000FF - space (category)
...

### Categories
- **delete** (#DC2626) - Delete and backspace keys
- **space** (#22D3EE) - Space and enter keys
- **navigation** (#4ADE80) - Arrow keys and navigation
- **macos** (#F97316) - macOS-specific shortcuts
```

### 6. Layer Navigation Map

Visual representation of layer relationships:

```markdown
## Layer Navigation

Shows how layers are accessed via LT (Layer Tap) and layer switching keys.

Layer 0 (Base)
  ├─→ LT(1) on Tab → Layer 1 (Symbols)
  ├─→ LT(2) on Esc → Layer 2 (Navigation)
  └─→ LT(3) on W   → Layer 3 (Numbers)

Layer 1 (Symbols)
  └─→ [No outbound references]

Layer 2 (Navigation)
  └─→ [No outbound references]
```

### 7. Tap Dance Reference

```markdown
## Tap Dance Actions

### TD(0): quote_tap_dance
- **Single Tap:** KC_QUOT (')
- **Double Tap:** KC_DQUO (")

### TD(1): bracket_tap_dance
- **Single Tap:** KC_LBRC ([)
- **Double Tap:** KC_RBRC (])
- **Hold:** KC_LSFT (Shift)

**Keys Using Tap Dance:**
- Layer 0, Position (2,3): TD(0)
- Layer 1, Position (1,5): TD(1)
```

### 8. Settings Summary

```markdown
## Configuration

### RGB Settings
- **Saturation:** 200%
- **Brightness (uncolored keys):** 40%
- **Timeout:** 1 min

### Idle Effect
- **Enabled:** Yes
- **Timeout:** 1 min (60000 ms)
- **Effect:** Breathing
- **Duration:** 5 min (300000 ms)

### Firmware
- **Keyboard:** keebart/corne_choc_pro/standard
- **Keymap Name:** corne_choc_pro
- **Output Format:** uf2
```

### 9. Key Descriptions

```markdown
## Key Descriptions

Manual descriptions for specific keys:

- **Layer 0, Position (0,0):** MacOS Lock - Locks the screen on macOS
- **Layer 1, Position (2,5):** App Switcher - Cmd+Tab equivalent
```

### 10. Notes Section (Optional)

```markdown
## Notes

[Any additional user notes or context about the layout]
```

## Rendering Details

### Key Representation

Each key is rendered as:
```
┌────────────┐
│  KC_NAME   │  ← Keycode (centered, truncated if too long)
│    [N]     │  ← Color reference (bottom line, optional)
└────────────┘
```

For tap-hold keys:
```
┌────────────┐
│ HOLD / TAP │  ← Split display (e.g., "L1 / A")
│    [N]     │  ← Color reference
└────────────┘
```

### Split Keyboard Layout

Split keyboards show left and right halves with spacing:
```
LEFT HALF                      RIGHT HALF
┌──┬──┬──┐                    ┌──┬──┬──┐
│  │  │  │                    │  │  │  │
└──┴──┴──┘                    └──┴──┴──┘
```

The spacing is calculated based on the visual_x gap in the geometry.

### Key Sizing

- Default key: 12 chars wide × 3 lines tall
- Wide keys (1.5u, 2u): Proportionally wider
- Thumb keys: May be taller or wider based on geometry
- All keys maintain Unicode box borders

### Color Notation

Colors are represented by:
1. **Color reference number** in brackets: `[1]`, `[2]`, etc.
2. **Legend at bottom** mapping numbers to hex colors and categories
3. **Optional ANSI codes** in terminal-compatible code blocks (future enhancement)

## File Naming Convention

Exported files follow this pattern:
```
[layout_name]_export_[YYYY-MM-DD].md
```

Example: `corne_choc_pro_export_2026-01-04.md`

## Markdown Compatibility

The exported document uses:
- ✅ Standard markdown headers (#, ##, ###)
- ✅ Code blocks for keyboard diagrams (```)
- ✅ Bold, italic, lists
- ✅ Unicode box-drawing characters (├─┤┌┐└┘│─)
- ✅ Compatible with GitHub, GitLab, editors, markdown viewers
- ✅ Convertible to PDF via pandoc, markdown-pdf, etc.

## Example Output

See `examples/corne_choc_pro_export.md` for a complete example of the export format.
