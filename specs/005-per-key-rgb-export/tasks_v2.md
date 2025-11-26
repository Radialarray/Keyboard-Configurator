# Tasks v2: Per-Key RGB Export Phased Plan

## Phase 1: Expose `lighting_mode` in onboarding wizard ✅ (implemented)
- Add a lighting configuration choice to the onboarding wizard flow.
- Persist the selected lighting mode into `Config.build.lighting_mode`.
- Keep `qmk_default` as the default to preserve existing behavior.

Status:
- `OnboardingWizardState` now tracks `lighting_mode`.
- The confirmation step shows the current mode and allows toggling with `L`.
- `build_config()` writes the selected mode into `Config.build.lighting_mode`.

## Phase 2: Runtime `lighting_mode` configuration dialog and help ✅ (implemented)
- Add a small runtime dialog to view and change `lighting_mode` from the main TUI.
- Wire a keyboard shortcut (e.g., `Ctrl+R`) to open this dialog.
- Update the help overlay to document the new shortcut and briefly explain the modes.

Status:
- `LightingConfigDialogState` and `render_lighting_config_dialog` implemented.
- `Ctrl+R` opens the dialog; `L` toggles modes, `Enter` applies and saves to config.
- Help overlay and status bar contextual help describe the new shortcut and modes.

## Phase 3: Layout-lighting suggestion popup and heuristic ✅ (implemented)
- Detect when the current layout uses non-default colors while `lighting_mode` is still `qmk_default`.
- Show a one-time suggestion popup offering to enable `layout_static` lighting.
- Apply the user’s choice, persist it to config, and proceed with firmware generation.

Status:
- Heuristic inspects the base layer’s resolved colors and checks `lighting_mode`.
- A `LightingSuggestion` popup is shown once per session when appropriate.
- `E` enables layout static lighting (updates config and regenerates), `K` keeps default, `Esc` dismisses.

## Phase 4: Firmware generator integration and tests (v1) ✅ (implemented)
- Add `lighting_mode` to `BuildConfig` and configuration serialization.
- Implement `generate_layer_colors_by_led` to compute per-LED colors from layout + mapping.
- Extend `keymap.c` generation to optionally include a static RGB matrix section when `layout_static` is enabled.
- Update `vial.json` generation so `"lighting"` reflects the selected mode.
- Add tests to cover color-to-LED mapping and presence/absence of the static RGB section.

Status:
- `LightingMode` enum added to `config.rs` with default `qmk_default`.
- `generate_layer_colors_by_led` implemented and used by the static RGB block.
- `keymap.c` includes a conditional static RGB section guarded by `RGB_MATRIX_ENABLE` when `lighting_mode = layout_static`.
- `vial.json` sets `"lighting": "none"` for `qmk_default` and `"lighting": "qmk_rgblight"` for `layout_static`.
- Existing firmware tests exercise generation; dedicated tests for colors/lighting are planned as follow-up.

## Phase 5: Additional lighting modes and behavior (future)
- Design placeholders for potential additional lighting modes (e.g., multi-layer static, accent-only).
- Structure the generator and config so new modes can be added without major refactors.
- (Optional) Add one extra mode if it stays simple and low-risk.

Status:
- Current implementation keeps the `LightingMode` enum and generator structure simple so new variants can be added later.
- No additional modes beyond `qmk_default` and `layout_static` are implemented yet.

## Phase 6: Deeper Vial and QMK RGB integration (future)
- Refine the `vial.json` `"lighting"` field to better reflect actual capabilities.
- Explore optional integration paths for VialRGB direct mode driven by the existing color model.
- Document current behavior and caveats in the spec for future work.

Status:
- v1 sets `"lighting"` pragmatically to `"qmk_rgblight"` when using `layout_static`.
- No direct VialRGB integration yet; this remains planned future work.
