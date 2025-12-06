# Layout Markdown Format Schema

**Version**: 1.0  
**Purpose**: Define the structure of keyboard layout Markdown files for version control and manual editing

## File Structure

```markdown
---
[YAML Frontmatter - Metadata]
---

# [Layout Title]

## Layer N: [Layer Name]
**Color**: [#RRGGBB]
[Optional: **Category**: category-id]

| Key1 | Key2 | ... | KeyN |
|------|------|-----|------|
| Key1 | Key2 | ... | KeyN |
| Key1 | Key2 | ... | KeyN |
| [Thumb row - optional empty cells] |

[Repeat for each layer]

---

## Categories

- category-id: [Category Name] (#RRGGBB)
- another-id: [Another Category] (#00FF00)
```

## YAML Frontmatter Schema

**Required Fields**:
```yaml
name: string             # Layout name, max 100 chars
description: string      # Long description
author: string           # Creator name
created: datetime        # ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ)
modified: datetime       # ISO 8601 format, >= created
tags: array<string>      # Searchable keywords, lowercase-hyphenated
is_template: boolean     # Template flag (saves to templates/ dir)
version: string          # Schema version, currently "1.0"
```

**Example**:
```yaml
---
name: "QWERTY Programming Layout"
description: "Optimized for programming with symbols easily accessible on layer 1"
author: "username"
created: "2024-01-15T10:30:00Z"
modified: "2024-01-20T15:45:00Z"
tags: ["qwerty", "programming", "vim", "symbols"]
is_template: false
version: "1.0"
---
```

**Validation Rules**:
- All required fields must be present
- `created` must be valid ISO 8601 datetime
- `modified` must be >= `created`
- `tags` entries must match pattern: `^[a-z0-9-]+$`
- `version` must be "1.0" (only supported version)

## Layer Section Schema

### Layer Header

**Format**: `## Layer N: [Name]`

**Rules**:
- `N` must be non-negative integer (0-255)
- Layer numbers must be sequential without gaps (0, 1, 2, ...)
- `[Name]` must be non-empty, max 50 characters
- First layer must be layer 0

### Layer Color

**Format**: `**Color**: #RRGGBB`

**Rules**:
- Must appear after layer header, before table
- Color in hex format: `#` + 6 hex digits (case-insensitive)
- Each channel (RR, GG, BB) represents 0-255 in hex

### Layer Category (Optional)

**Format**: `**Category**: category-id`

**Rules**:
- Must appear after color, before table
- `category-id` must be defined in Categories section
- If present, provides fallback color for all keys on layer

### Layer Table

**Format**: Markdown table with pipes

**12-Column Format** (standard layouts):
```markdown
| C0  | C1  | C2  | C3  | C4  | C5  | C6  | C7  | C8  | C9  | C10 | C11 |
|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|
| K00 | K01 | K02 | K03 | K04 | K05 | K06 | K07 | K08 | K09 | K10 | K11 |
| K12 | K13 | K14 | K15 | K16 | K17 | K18 | K19 | K20 | K21 | K22 | K23 |
| K24 | K25 | K26 | K27 | K28 | K29 | K30 | K31 | K32 | K33 | K34 | K35 |
|     |     | K36 | K37 | K38 | K39 | K40 | K41 |     |     |     |     |
```

**14-Column Format** (layouts with EX keys):
```markdown
| EX1 | C0  | C1  | C2  | C3  | C4  | C5  | C6  | C7  | C8  | C9  | C10 | C11 | EX2 |
|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|
| ... | ... | ... | ... | ... | ... | ... | ... | ... | ... | ... | ... | ... | ... |
```

**Rules**:
- Table must have header row, separator row (dashes), then data rows
- Number of columns must be 12 or 14 (determined by keyboard layout)
- Number of rows must match keyboard layout (usually 4 for split keyboards)
- Empty cells represent absent keys (thumb row corners, etc.)
- All non-empty cells must contain valid keycode syntax

## Keycode Syntax

### Basic Keycode

**Format**: `KC_X`

**Examples**:
- `KC_A` - Letter A
- `KC_1` - Number 1
- `KC_ESC` - Escape key
- `KC_TRNS` - Transparent (pass-through to lower layer)

**Rules**:
- Must exist in QMK keycode database (600+ valid codes)
- Format: uppercase, underscore-separated
- Special: `KC_TRNS` or `KC_TRANSPARENT` always valid

### Keycode with Color Override

**Format**: `KC_X{#RRGGBB}`

**Examples**:
- `KC_A{#FF0000}` - Letter A with red color
- `KC_ESC{#00FF00}` - Escape with green color

**Rules**:
- Color must be valid hex: `#` + 6 hex digits
- Overrides all other color sources (highest priority)
- Renders with 'i' indicator in top-right corner

### Keycode with Category

**Format**: `KC_X@category-id`

**Examples**:
- `KC_LEFT@navigation` - Left arrow in navigation category
- `KC_LSFT@modifiers` - Left shift in modifiers category

**Rules**:
- `category-id` must be defined in Categories section
- Category provides color (unless overridden)
- Renders with 'k' indicator in top-right corner

### Keycode with Both

**Format**: `KC_X{#RRGGBB}@category-id`

**Example**:
- `KC_A{#FF0000}@symbols` - Letter A with individual red color and symbols category

**Rules**:
- Color override takes precedence over category color
- Both syntax elements preserved in file
- Category still used for organization even if color overridden

## Categories Section Schema

**Format**:
```markdown
## Categories

- category-id: Category Name (#RRGGBB)
- another-id: Another Name (#00FF00)
```

**Rules**:
- Section is optional (can be absent if no categories used)
- Must appear after all layer sections
- Each line: `- id: Name (#color)`
- `id` must be kebab-case: `^[a-z][a-z0-9-]*$`
- `Name` must be non-empty, max 50 characters
- Color in hex format
- IDs must be unique within file

**Common Categories** (examples, not enforced):
- `navigation`: Arrow keys, Home/End, Page Up/Down
- `symbols`: Punctuation, brackets, operators
- `numbers`: 0-9, numpad keys
- `function`: F1-F12 keys
- `media`: Play, pause, volume, brightness
- `modifiers`: Shift, Ctrl, Alt, GUI

## Color Priority System

When rendering a key, color is determined by first match:

1. **Individual Key Override** - `KC_X{#RRGGBB}` (indicator: 'i')
2. **Key Category Color** - `KC_X@category-id` → Category.color (indicator: 'k')
3. **Layer Category Color** - `**Category**: category-id` → Category.color (indicator: 'L')
4. **Layer Default Color** - `**Color**: #RRGGBB` (indicator: 'd')

## Validation Rules

### Parse-Time Validation

- YAML frontmatter must be valid YAML
- All required metadata fields present
- Layer numbers sequential starting from 0
- Table structure valid (header, separator, data rows)
- Column count consistent (12 or 14)
- Keycode syntax well-formed

### Post-Parse Validation

- All keycodes exist in QMK database
- All category references resolve to defined categories
- All positions filled (no missing keys within layer bounds)
- No duplicate positions
- Layer count reasonable (warning if > 12)

### Pre-Save Validation

- Metadata.modified updated to current timestamp
- No trailing whitespace in cells
- Consistent column widths for readability (optional formatting)

## Error Messages

Error messages must include:
- File path
- Line number
- Specific problem
- Suggested fix

**Examples**:
```
Error: layout.md:15: Invalid keycode 'KC_FOO'
  Layer 0, row 2, col 5
  Suggestion: Did you mean 'KC_F1' or 'KC_F10'?

Error: layout.md:18: Undefined category 'navigation'
  Keycode: KC_LEFT@navigation
  Suggestion: Add category to Categories section or remove @navigation

Warning: layout.md:45: Layer 12 defined
  Recommendation: More than 12 layers may impact usability
```

## Example Complete File

```markdown
---
name: "My Corne Layout"
description: "QWERTY base with symbols on layer 1 and navigation on layer 2"
author: "username"
created: "2024-01-15T10:30:00Z"
modified: "2024-01-20T15:45:00Z"
tags: ["corne", "qwerty", "programming"]
is_template: false
version: "1.0"
---

# My Corne Layout

## Layer 0: Base
**Color**: #808080

| KC_TAB  | KC_Q  | KC_W  | KC_E  | KC_R  | KC_T  | KC_Y  | KC_U  | KC_I    | KC_O   | KC_P    | KC_BSPC |
|---------|-------|-------|-------|-------|-------|-------|-------|---------|--------|---------|---------|
| KC_LCTL | KC_A  | KC_S  | KC_D  | KC_F  | KC_G  | KC_H  | KC_J  | KC_K    | KC_L   | KC_SCLN | KC_QUOT |
| KC_LSFT | KC_Z  | KC_X  | KC_C  | KC_V  | KC_B  | KC_N  | KC_M  | KC_COMM | KC_DOT | KC_SLSH | KC_ESC  |
|         |       |       | KC_LGUI | MO(1){#00FF00} | KC_SPC | KC_ENT | MO(2){#FF0000} | KC_RALT |        |         |         |

## Layer 1: Lower
**Color**: #00FF00
**Category**: symbols

| KC_TILD | KC_EXLM | KC_AT | KC_HASH | KC_DLR | KC_PERC | KC_CIRC | KC_AMPR | KC_ASTR | KC_LPRN | KC_RPRN | KC_DEL |
|---------|---------|-------|---------|--------|---------|---------|---------|---------|---------|---------|--------|
| KC_TRNS | KC_1    | KC_2  | KC_3    | KC_4   | KC_5    | KC_6    | KC_7    | KC_8    | KC_9    | KC_0    | KC_PIPE |
| KC_TRNS | KC_TRNS | KC_TRNS | KC_TRNS | KC_TRNS | KC_TRNS | KC_PLUS | KC_MINS | KC_EQL | KC_LBRC | KC_RBRC | KC_BSLS |
|         |         |         | KC_TRNS | KC_TRNS | KC_TRNS | KC_TRNS | KC_TRNS | KC_TRNS |         |         |         |

## Layer 2: Raise
**Color**: #FF0000
**Category**: navigation

| KC_GRV | KC_F1 | KC_F2 | KC_F3 | KC_F4 | KC_F5 | KC_F6 | KC_F7 | KC_F8 | KC_F9 | KC_F10 | KC_F11 |
|--------|-------|-------|-------|-------|-------|-------|-------|-------|-------|--------|--------|
| KC_TRNS | KC_TRNS | KC_TRNS | KC_TRNS | KC_TRNS | KC_TRNS | KC_LEFT@navigation | KC_DOWN@navigation | KC_UP@navigation | KC_RGHT@navigation | KC_F12 | KC_INS |
| KC_TRNS | KC_TRNS | KC_TRNS | KC_TRNS | KC_TRNS | KC_TRNS | KC_HOME | KC_PGDN | KC_PGUP | KC_END | KC_PSCR | KC_TRNS |
|        |         |         | KC_TRNS | KC_TRNS | KC_TRNS | KC_TRNS | KC_TRNS | KC_TRNS |         |         |         |

---

## Categories

- navigation: Navigation (#0000FF)
- symbols: Symbols (#00FF00)
- modifiers: Modifiers (#FF00FF)
```

## Implementation Notes

### Parsing Strategy

1. **Split by sections**: Frontmatter, layers, categories
2. **Parse frontmatter**: YAML deserialize to LayoutMetadata
3. **For each layer**:
   - Extract number and name from `## Layer N: Name`
   - Extract color from `**Color**: #RRGGBB`
   - Extract optional category from `**Category**: id`
   - Parse table rows (skip header and separator)
   - For each cell: Extract keycode, color override, category
4. **Parse categories section**: Split by lines, extract id, name, color
5. **Validate**: Keycode existence, category references, position coverage

### Generation Strategy

1. **Serialize metadata**: YAML frontmatter with updated `modified` timestamp
2. **For each layer**:
   - Write layer header with number and name
   - Write color line
   - Write category line (if present)
   - Generate table with consistent column widths
   - For each key: Serialize keycode with optional color/category syntax
   - Handle empty cells for absent keys
3. **Write categories section**: One line per category with name and color
4. **Atomic write**: Temp file + rename for safety

### Compatibility Notes

- Markdown parsers can render file for viewing
- Git diffs show exact key changes
- Manual editing supported (follow syntax)
- Forward compatible: Unknown keycodes pass through with warning
- Backward compatible: Can read older files without optional fields
