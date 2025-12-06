# Implementation Tasks

## Phase 1: State Management

### Task 1.1: Add PendingKeycodeState
**File:** `src/tui/mod.rs`
**Priority:** High
**Effort:** Small

Add new state struct for tracking multi-stage keycode building:

```rust
/// State for building parameterized keycodes
#[derive(Debug, Clone, Default)]
pub struct PendingKeycodeState {
    /// The keycode type being built (e.g., "LT", "MT", "LM")
    pub keycode_type: Option<ParameterizedKeycodeType>,
    /// First parameter (layer UUID for LT/LM, modifier bits for MT)
    pub param1: Option<String>,
    /// Second parameter (tap keycode for LT/MT, modifier for LM)
    pub param2: Option<String>,
}

#[derive(Debug, Clone, PartialEq)]
pub enum ParameterizedKeycodeType {
    LayerTap,      // LT(layer, kc) - needs layer then keycode
    ModTap,        // MT(mod, kc) - needs modifier then keycode  
    LayerMod,      // LM(layer, mod) - needs layer then modifier
    SwapHandsTap,  // SH_T(kc) - needs keycode only
}
```

Add to AppState:
```rust
pub pending_keycode: PendingKeycodeState,
```

### Task 1.2: Add New PopupTypes
**File:** `src/tui/mod.rs`
**Priority:** High
**Effort:** Small

```rust
pub enum PopupType {
    // ... existing ...
    TapKeycodePicker,   // Second-stage keycode picker for tap action
    ModifierPicker,     // Picker for selecting modifier(s)
}
```

---

## Phase 2: Keycode Database Updates

### Task 2.1: Add Parameterized Keycode Entries
**File:** `src/keycode_db/keycodes.json`
**Priority:** High
**Effort:** Small

Add placeholder entries that trigger multi-stage flow:

```json
{
  "code": "LT()",
  "name": "Layer-Tap",
  "category": "layers",
  "description": "Hold for layer, tap for keycode"
},
{
  "code": "MT()",
  "name": "Mod-Tap (Custom)",
  "category": "mod_tap",
  "description": "Hold for modifier, tap for keycode"
},
{
  "code": "LM()",
  "name": "Layer-Mod",
  "category": "layers",
  "description": "Layer with modifier active"
},
{
  "code": "SH_T()",
  "name": "Swap Hands Tap",
  "category": "advanced",
  "description": "Hold to swap hands, tap for keycode"
}
```

---

## Phase 3: Keycode Picker Entry Point

### Task 3.1: Detect Parameterized Keycodes
**File:** `src/tui/keycode_picker.rs`
**Priority:** High
**Effort:** Medium

Update Enter handler to detect parameterized keycodes and start appropriate flow:

```rust
KeyCode::Enter => {
    let keycodes = get_filtered_keycodes(state);
    if let Some(kc) = keycodes.get(state.keycode_picker_state.selected) {
        match kc.code.as_str() {
            "LT()" => {
                state.pending_keycode.keycode_type = Some(ParameterizedKeycodeType::LayerTap);
                state.layer_picker_state = LayerPickerState::with_prefix("LT");
                state.active_popup = Some(PopupType::LayerPicker);
                state.keycode_picker_state.reset();
                state.set_status("Select layer for LT (Layer-Tap)");
            }
            "MT()" => {
                state.pending_keycode.keycode_type = Some(ParameterizedKeycodeType::ModTap);
                state.active_popup = Some(PopupType::ModifierPicker);
                state.keycode_picker_state.reset();
                state.set_status("Select modifier(s) for MT");
            }
            // ... etc
        }
    }
}
```

---

## Phase 4: Layer Picker Enhancement

### Task 4.1: Handle Next-Stage Transitions
**File:** `src/tui/mod.rs` (handle_layer_picker_input)
**Priority:** High
**Effort:** Medium

Update layer picker completion to check for pending parameterized keycode:

```rust
KeyCode::Enter => {
    if let Some(layer) = state.layout.layers.get(selected_idx) {
        let layer_ref = format!("@{}", layer.id);
        
        match &state.pending_keycode.keycode_type {
            Some(ParameterizedKeycodeType::LayerTap) => {
                // Store layer, open tap keycode picker
                state.pending_keycode.param1 = Some(layer_ref);
                state.active_popup = Some(PopupType::TapKeycodePicker);
                state.keycode_picker_state = KeycodePickerState::new();
                state.set_status("Select tap keycode for LT");
            }
            Some(ParameterizedKeycodeType::LayerMod) => {
                // Store layer, open modifier picker
                state.pending_keycode.param1 = Some(layer_ref);
                state.active_popup = Some(PopupType::ModifierPicker);
                state.set_status("Select modifier(s) for LM");
            }
            _ => {
                // Simple layer keycode - assign directly (existing logic)
            }
        }
    }
}
```

---

## Phase 5: Tap Keycode Picker

### Task 5.1: Render TapKeycodePicker
**File:** `src/tui/mod.rs`
**Priority:** High
**Effort:** Small

Reuse keycode picker rendering with modified title:

```rust
PopupType::TapKeycodePicker => {
    keycode_picker::render_keycode_picker(f, state);
    // Could add custom title overlay: "Select Tap Keycode"
}
```

### Task 5.2: Handle TapKeycodePicker Input
**File:** `src/tui/mod.rs` or `src/tui/keycode_picker.rs`
**Priority:** High
**Effort:** Medium

```rust
fn handle_tap_keycode_picker_input(state: &mut AppState, key: KeyEvent) -> Result<bool> {
    match key.code {
        KeyCode::Esc => {
            state.pending_keycode = PendingKeycodeState::default();
            state.active_popup = None;
            state.set_status("Cancelled");
        }
        KeyCode::Enter => {
            let keycodes = get_filtered_keycodes(state);
            if let Some(kc) = keycodes.get(state.keycode_picker_state.selected) {
                if is_basic_keycode(&kc.code) {
                    state.pending_keycode.param2 = Some(kc.code.clone());
                    let final_keycode = build_pending_keycode(&state.pending_keycode);
                    assign_keycode(state, &final_keycode);
                    state.pending_keycode = PendingKeycodeState::default();
                    state.active_popup = None;
                } else {
                    state.set_status("Only basic keycodes allowed for tap action");
                }
            }
        }
        _ => { /* delegate to standard keycode picker navigation */ }
    }
}
```

### Task 5.3: Filter Basic Keycodes Only
**File:** `src/tui/keycode_picker.rs`
**Priority:** Medium
**Effort:** Small

Add function to check if keycode is basic:

```rust
fn is_basic_keycode(code: &str) -> bool {
    // Basic keycodes: KC_A-Z, KC_0-9, KC_F1-24, navigation, symbols
    // Exclude: layer keycodes, mod-taps, parameterized
    !code.contains('(') && !code.contains('@')
}
```

---

## Phase 6: Modifier Picker

### Task 6.1: Create ModifierPickerState
**File:** `src/tui/modifier_picker.rs` (new file)
**Priority:** Medium
**Effort:** Medium

```rust
pub struct ModifierPickerState {
    pub selected_mods: u8,  // Bitfield of selected modifiers
    pub focus: usize,       // Current focus position (0-7 for 8 modifiers)
}

impl ModifierPickerState {
    pub fn new() -> Self { ... }
    pub fn reset(&mut self) { ... }
    pub fn toggle_mod(&mut self, mod_bit: u8) { ... }
    pub fn to_mod_string(&self) -> String { ... }  // "MOD_LCTL | MOD_LSFT"
}
```

### Task 6.2: Render Modifier Picker UI
**File:** `src/tui/modifier_picker.rs`
**Priority:** Medium
**Effort:** Medium

```
┌─ Select Modifier(s) ─────────────────┐
│                                      │
│  Left Hand        Right Hand         │
│  [x] Ctrl         [ ] Ctrl           │
│  [ ] Shift        [ ] Shift          │
│  [ ] Alt          [ ] Alt            │
│  [ ] GUI          [ ] GUI            │
│                                      │
│  Presets:                            │
│  [ ] Meh (C+S+A)  [ ] Hyper (C+S+A+G)│
│                                      │
│  Selected: MOD_LCTL                  │
│                                      │
│  Space=Toggle  Enter=Confirm  Esc=Cancel │
└──────────────────────────────────────┘
```

### Task 6.3: Handle Modifier Picker Input
**File:** `src/tui/modifier_picker.rs`
**Priority:** Medium
**Effort:** Medium

- Arrow keys: Navigate between checkboxes
- Space: Toggle selected modifier
- Enter: Confirm selection, proceed to next stage or assign
- Esc: Cancel

---

## Phase 7: Build Final Keycode

### Task 7.1: Implement build_pending_keycode()
**File:** `src/tui/mod.rs` or new helper
**Priority:** High
**Effort:** Small

```rust
fn build_pending_keycode(pending: &PendingKeycodeState) -> String {
    match pending.keycode_type {
        Some(ParameterizedKeycodeType::LayerTap) => {
            format!("LT({}, {})", 
                pending.param1.as_ref().unwrap(),
                pending.param2.as_ref().unwrap())
        }
        Some(ParameterizedKeycodeType::ModTap) => {
            format!("MT({}, {})",
                pending.param1.as_ref().unwrap(),
                pending.param2.as_ref().unwrap())
        }
        Some(ParameterizedKeycodeType::LayerMod) => {
            format!("LM({}, {})",
                pending.param1.as_ref().unwrap(),
                pending.param2.as_ref().unwrap())
        }
        Some(ParameterizedKeycodeType::SwapHandsTap) => {
            format!("SH_T({})", pending.param1.as_ref().unwrap())
        }
        None => String::new(),
    }
}
```

---

## Phase 8: Firmware Generator Updates

### Task 8.1: Verify Layer Reference Resolution
**File:** `src/models/layout.rs`
**Priority:** Medium
**Effort:** Small

Ensure `resolve_layer_keycode()` handles:
- `LT(@uuid, KC_SPC)` → `LT(1, KC_SPC)`
- `LM(@uuid, MOD_LCTL)` → `LM(1, MOD_LCTL)`

The regex patterns should already support this, but verify and add tests.

### Task 8.2: Add Keycode Resolution Tests
**File:** `tests/firmware_gen_tests.rs`
**Priority:** Medium
**Effort:** Small

```rust
#[test]
fn test_resolve_lt_keycode() {
    // LT(@layer-uuid, KC_SPC) -> LT(1, KC_SPC)
}

#[test]
fn test_resolve_lm_keycode() {
    // LM(@layer-uuid, MOD_LALT) -> LM(1, MOD_LALT)
}
```

---

## Phase 9: Help Overlay Update

### Task 9.1: Document Multi-Stage Flow
**File:** `src/tui/help_overlay.rs`
**Priority:** Low
**Effort:** Small

Add to KEY EDITOR section:

```
  Multi-stage keycodes (LT, MT, LM, SH_T):
    1. Select keycode type from picker
    2. Select layer or modifier (depends on type)
    3. Select tap keycode (if applicable)
```

---

## Phase 10: Testing

### Task 10.1: Unit Tests
**Priority:** High
**Effort:** Medium

- `build_pending_keycode()` for all types
- `is_basic_keycode()` edge cases
- Modifier bitfield operations

### Task 10.2: Integration Tests
**Priority:** High
**Effort:** Medium

- Full LT flow: Select LT → Pick layer → Pick tap keycode → Verify
- Full MT flow: Select MT → Pick modifier → Pick tap keycode → Verify
- Full LM flow: Select LM → Pick layer → Pick modifier → Verify
- Cancellation at each stage
- Edge cases: No layers defined, invalid keycodes

---

## Implementation Order

| Order | Phase | Tasks | Priority | Effort |
|-------|-------|-------|----------|--------|
| 1 | Phase 1 | State Management | High | Small |
| 2 | Phase 2 | Database Updates | High | Small |
| 3 | Phase 3 | Keycode Picker Entry | High | Medium |
| 4 | Phase 4 | Layer Picker Enhancement | High | Medium |
| 5 | Phase 5 | Tap Keycode Picker | High | Medium |
| 6 | Phase 7 | Build Final Keycode | High | Small |
| 7 | Phase 6 | Modifier Picker | Medium | Medium |
| 8 | Phase 8 | Firmware Generator | Medium | Small |
| 9 | Phase 9 | Help Overlay | Low | Small |
| 10 | Phase 10 | Testing | High | Medium |

**MVP (LT support only):** Phases 1, 2, 3, 4, 5, 7 = ~6 tasks
**Full implementation:** All phases = ~15 tasks
