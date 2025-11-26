# Spec: Per-Key RGB Export from Layout Colors

**Feature ID:** 005-per-key-rgb-export  
**Status:** Implemented (v1)  
**Created:** 2025-11-26  
**Updated:** 2025-11-26  
**Priority:** High

## Problem Statement

The TUI provides a rich color system for organizing layouts (layer defaults, categories, per-key overrides) and persists those colors in Markdown. However, generated QMK firmware ignores this color information:

- `keymap.c` contains only keycodes and encoder defaults, no LED color data.
- `vial.json` hardcodes `"lighting": "none"`, so Vial does not expose lighting controls for generated keymaps.
- `config.h` only includes generic comments and optional Vial unlock combo macros.

As a result, when users flash the generated firmware, the keyboard boots with whatever RGB matrix defaults the underlying QMK keyboard provides (typically an animated rainbow effect), instead of a static color scheme matching the layout they designed in the TUI.

## Goals

- Use the existing layout color model (layer defaults, categories, per-key overrides) to drive **on-device per-key RGB lighting**.
- Keep all behavior configurable **through the TUI and its config**, with no manual edits inside the QMK submodule.
- Avoid modifying any core files in the `vial-qmk-keebart` submodule; all integration must happen via generated keymap files.
- Preserve backward compatibility: by default, builds should continue to behave exactly as they do today unless a lighting mode is explicitly enabled.

## Non-Goals

- Implementing fully dynamic lighting editors or animation authoring inside the TUI.
- Replacing or forking the QMK RGB matrix implementation.
- Changing Vial's core behavior or protocol.

## Current Behavior (Before v1)

- TUI renders key colors using `Layout::resolve_key_color` and displays source indicators (`i`, `k`, `L`, `d`) purely for visualization.
- Layout colors are stored in Markdown syntax (`{#RRGGBB}` and `@category-id`) and parsed back correctly.
- Firmware generation (`src/firmware/generator.rs`):
  - Generates `keymap.c` with `keymaps[][MATRIX_ROWS][MATRIX_COLS]` and a default encoder map using RGB modifier keys.
  - Generates `vial.json` with geometry and layout but `"lighting": "none"`.
  - Generates a minimal `config.h` which may copy Vial unlock macros from a base keymap.
- The bundled QMK fork under `vial-qmk-keebart/` supports RGB matrix, Vial, and VialRGB, but the generated keymaps do not take advantage of this to express layout colors.

## Implemented Behavior (v1)

When a user enables layout-driven lighting (via TUI/config):

- The generator computes static per-key colors in **LED index order** from the current layout and keyboard geometry using `generate_layer_colors_by_led`.
- The generated `keymap.c` contains an additional static RGB matrix section that:
  - Defines a `layout_colors[RGB_MATRIX_LED_COUNT][3]` array in LED index order derived from layer 0 colors.
  - Implements `rgb_matrix_indicators_user()` to set each LED to its layout color when RGB Matrix is active.
- `vial.json` advertises lighting support when `lighting_mode = "layout_static"` by setting an appropriate value in the `"lighting"` field (currently `"qmk_rgblight"`).
- All of this is controlled by an opt-in **lighting mode** in the `Config`, defaulting to current behavior (no layout-driven lighting).

## Design Overview

### Lighting Mode

Configuration now includes an explicit `lighting_mode` option in `Config.build` with the following values:

- `"qmk_default"` (default): do not generate any extra lighting code; preserve existing RGB behavior.
- `"layout_static"`: generate a static per-key RGB scheme based on layout colors and apply it via QMK hooks.

This option:

- Is serialized in `config.toml` via `Config` / `BuildConfig`.
- Has a default of `qmk_default` for backward compatibility.
- Is editable via:
  - The onboarding wizard (confirmation step, `L` to toggle before saving).
  - A runtime lighting configuration dialog in the main TUI (opened with `Ctrl+R`).
  - A one-time suggestion popup that appears before firmware generation/build when the base layer has non-default colors but `lighting_mode` is still `qmk_default`.

### Color-to-LED Mapping

The implementation uses existing primitives:

- `Layout::resolve_key_color(layer_idx, key)` for final color decision per key.
- `VisualLayoutMapping::visual_to_led_index(row, col)` to map visual coordinates to LED indices.

A new helper in firmware generation:

- `generate_layer_colors_by_led(layer_idx)`:
  - Iterates keys for the specified layer.
  - Resolves each key's color via `resolve_key_color`.
  - Maps each key's visual position to LED index.
  - Produces `Vec<RgbColor>` where `index == LED index`.

This function is used to build the static C color array and can be reused by future lighting integrations.

### QMK Integration (v1: Static RGB Matrix Effect)

In the generated `keymap.c`, v1 adds a conditional static RGB section:

- Wrapped in `#ifdef RGB_MATRIX_ENABLE` so it only applies when RGB Matrix is configured for the keyboard.
- Declares:
  - `static const uint8_t PROGMEM layout_colors[RGB_MATRIX_LED_COUNT][3];` where each entry is `[R, G, B]` for that LED.
- Implements:

  ```c
  bool rgb_matrix_indicators_user(void) {
      for (uint8_t i = 0; i < RGB_MATRIX_LED_COUNT; i++) {
          uint8_t r = layout_colors[i][0];
          uint8_t g = layout_colors[i][1];
          uint8_t b = layout_colors[i][2];
          rgb_matrix_set_color(i, r, g, b);
      }
      return true;
  }
  ```

- This section is only emitted when `lighting_mode = layout_static`.

The implementation is intentionally simple and layer-0-only for v1; multi-layer or accent-only behavior can be added in later phases without breaking compatibility.

### Vial Integration (v1)

For v1, `vial.json` is updated to better reflect lighting capability:

- When `lighting_mode = "qmk_default"`, `"lighting"` remains `"none"`.
- When `lighting_mode = "layout_static"`, `"lighting"` is set to `"qmk_rgblight"` to indicate QMK RGB lighting support based on the static effect.

Deeper VialRGB integration (e.g., host-driven per-LED control synchronized with TUI colors) is explicitly left as future work.

## TUI Integration

- **Onboarding wizard** (`src/tui/onboarding_wizard.rs`):
  - The wizard state tracks `lighting_mode`.
  - On the confirmation step, `L` toggles between `qmk_default` and `layout_static`, and the selected mode is shown alongside the chosen keyboard/layout.
  - `build_config()` writes the chosen `lighting_mode` into `Config.build.lighting_mode`.

- **Runtime lighting dialog** (`src/tui/config_dialogs.rs`, `src/tui/mod.rs`):
  - New `LightingConfigDialogState` holds the current mode and provides a human-readable label.
  - `Ctrl+R` opens a small popup that displays the current mode and lets the user toggle with `L` and confirm with `Enter`.
  - On confirmation, the new mode is written back to `Config` and saved atomically; a status message confirms success or reports any error.

- **Lighting suggestion popup** (`src/tui/mod.rs`, `src/tui/status_bar.rs`):
  - Before firmware generation/build, a heuristic checks whether the base layer uses non-default colors while `lighting_mode` is still `qmk_default`.
  - If so, a one-time popup is shown offering:
    - `E` to enable layout static lighting and regenerate.
    - `K` to keep QMK default lighting.
    - `Esc` to dismiss.
  - The popup is only shown once per session, and contextual help/status text explains the choices.

## Design Constraints

- All behavior (including lighting mode) is controlled via the TUI and configuration files that `keyboard_tui` owns; users do not need to manually edit C or JSON in the QMK/Vial tree.
- The implementation does not modify tracked source files in the `vial-qmk-keebart` submodule (e.g., `quantum/*.c`, base keyboard `config.h`, `rules.mk`, or `info.json`).
- All new lighting integration is implemented by generating or updating files only under the keymap-specific directory, e.g. `vial-qmk-keebart/keyboards/{keyboard}/keymaps/{keymap}/` and the timestamped archive directory.
- The design allows the `vial-qmk-keebart` submodule to be updated; regenerating firmware from the TUI re-applies layout and lighting on top of the updated QMK tree.

## Risks and Trade-offs

- **Hardware diversity:** Different boards may have custom RGB configurations; using standard QMK hooks in keymaps is usually safe, but assumptions are kept minimal by relying on `RGB_MATRIX_ENABLE` and existing keyboard geometry.
- **Performance:** Setting every LED's color on each scan may cost CPU time on older MCUs; v1 chooses simplicity over optimization. Future iterations can add caching or change-detection if needed.
- **User expectations:** Some users prefer animated effects. Making layout-based lighting opt-in and surfacing the mode clearly in the TUI avoids surprising changes to default behavior.
- **Schema assumptions:** `"lighting": "qmk_rgblight"` is used as a pragmatic value for Vial; future work may refine this if the upstream schema or capabilities change.

## Acceptance Criteria (v1)

1. With `lighting_mode = "qmk_default"`:
   - Generated `keymap.c`, `vial.json`, and `config.h` match previous behavior (no additional lighting code, `"lighting": "none"`).
   - Firmware builds and runs as before.

2. With `lighting_mode = "layout_static"` and a keyboard that has RGB Matrix support:
   - Firmware generation produces additional C code in the keymap folder implementing a static RGB effect for layer 0.
   - After flashing, the keyboard shows a static color scheme that matches the layout's base layer colors.
   - No core files in `vial-qmk-keebart` have been modified.

3. The TUI exposes and updates `lighting_mode` via:
   - Onboarding wizard (confirmation step).
   - Runtime lighting dialog (`Ctrl+R`).
   - Optional suggestion popup when colored layouts are used with `qmk_default`.

4. Tests cover at least:
   - Correct mapping from layout colors to LED index order (via `generate_layer_colors_by_led`).
   - Presence/absence and basic structure of the generated lighting code when `layout_static` is enabled/disabled.
   - Correct `"lighting"` field values in `vial.json` for each mode.
