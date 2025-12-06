# Parameterized Keycodes Implementation

## Overview

Implement a multi-stage picker flow for QMK keycodes that require additional parameters:

- **LT(layer, kc)** - Layer-Tap: Hold for layer, tap for keycode
- **MT(mod, kc)** - Mod-Tap: Hold for modifier, tap for keycode  
- **LM(layer, mod)** - Layer-Mod: Layer with modifier active
- **SH_T(kc)** - Swap Hands Tap: Hold to swap hands, tap for keycode

## Problem Statement

Currently, the keycode picker treats every keycode as a single value. However, QMK supports parameterized keycodes that take 1-2 arguments:

```
Current:  key.keycode = "MO(1)"           // Simple - works
Needed:   key.keycode = "LT(1, KC_SPC)"   // Parameterized - not supported
```

The layer picker already handles simple layer keycodes (MO, TG, TO), but keycodes like LT require both a layer AND a tap keycode.

## Current Flow

```
Keycode Picker → (if MO/TG/TO) → Layer Picker → Assign "MO(@uuid)"
```

## Proposed Flow

```
Keycode Picker → (if LT/MT/LM/SH_T) → Stage 2 Picker(s) → Assign "LT(@uuid, KC_SPC)"
                                           │
                                    Layer Picker (for LT/LM)
                                           │
                                    Keycode Picker (for LT/MT/SH_T)
                                           or
                                    Modifier Picker (for MT/LM)
```

## Parameterized Keycode Types

| Keycode | Syntax | Param 1 | Param 2 | Flow |
|---------|--------|---------|---------|------|
| LT | `LT(layer, kc)` | Layer (0-15) | Basic keycode | Layer Picker → Keycode Picker |
| MT | `MT(mod, kc)` | Modifier bits | Basic keycode | Modifier Picker → Keycode Picker |
| LM | `LM(layer, mod)` | Layer (0-15) | Modifier bits | Layer Picker → Modifier Picker |
| SH_T | `SH_T(kc)` | Basic keycode | - | Keycode Picker only |

## Technical Constraints

From QMK source (quantum_keycodes.h):

1. **LT(layer, kc)**: Layer limited to 0-15 (4 bits), keycode limited to basic keycodes (0x00-0xFF)
2. **MT(mod, kc)**: Modifier uses 5-bit MOD_* constants, keycode limited to basic keycodes
3. **LM(layer, mod)**: Layer 0-15, modifier 5-bit
4. **Basic keycodes**: 0x00-0xFF only - no shifted keycodes, no layer keycodes, no mod-taps

## Visual Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        KEYCODE PICKER                                │
│  User selects: LT()                                                  │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         LAYER PICKER                                 │
│  "Select layer for LT (Layer-Tap)"                                   │
│  > Layer 0: Base                                                     │
│    Layer 1: Navigation                                               │
│    Layer 2: Symbols                                                  │
│  User selects: Layer 1                                               │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      TAP KEYCODE PICKER                              │
│  "Select tap keycode for LT"                                         │
│  (Shows only basic keycodes - no layer keys)                         │
│  User selects: KC_SPC                                                │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  ASSIGNED: LT(@layer-1-uuid, KC_SPC)                                 │
│  Displayed as: "LT(Nav, SPC)"                                        │
│  Generated as: LT(1, KC_SPC)                                         │
└─────────────────────────────────────────────────────────────────────┘
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/tui/mod.rs` | Add PendingKeycodeState, new PopupTypes, routing logic |
| `src/tui/keycode_picker.rs` | Detect parameterized keycodes, start multi-stage flow |
| `src/tui/layer_picker.rs` | Handle next-stage transitions for LT/LM |
| `src/tui/modifier_picker.rs` | **New file** - UI for selecting modifiers |
| `src/keycode_db/keycodes.json` | Add LT(), MT(), LM(), SH_T() placeholder entries |
| `src/tui/help_overlay.rs` | Document new multi-stage flow |
| `src/firmware/generator.rs` | Verify parameterized keycode resolution |

## Success Criteria

1. User can assign `LT(layer, keycode)` via Layer Picker → Keycode Picker flow
2. User can assign `MT(modifier, keycode)` via Modifier Picker → Keycode Picker flow
3. User can assign `LM(layer, modifier)` via Layer Picker → Modifier Picker flow
4. User can assign `SH_T(keycode)` via single Keycode Picker
5. Firmware generation correctly outputs resolved keycodes (e.g., `LT(1, KC_SPC)`)
6. Cancellation at any stage cleans up pending state
7. Only basic keycodes shown for tap keycode selection
