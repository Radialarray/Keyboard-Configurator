// API Types matching Rust backend

export interface HealthResponse {
	status: string;
	version: string;
}

export interface LayoutSummary {
	filename: string;
	name: string;
	description: string;
	modified: string;
}

export interface LayoutListResponse {
	layouts: LayoutSummary[];
}

export interface Layout {
	metadata: LayoutMetadata;
	layers: Layer[];
	tap_dances?: TapDance[];
	combos?: Combo[];
	// RGB settings
	rgb_enabled?: boolean;
	rgb_brightness?: number;
	rgb_saturation?: number;
	rgb_timeout_ms?: number;
	uncolored_key_behavior?: number;
	// Idle effect settings
	idle_effect_settings?: IdleEffectSettings;
	// Tap-hold settings
	tap_hold_settings?: TapHoldSettings;
	// Categories
	categories?: Category[];
}

export interface LayoutMetadata {
	name: string;
	description: string;
	author: string;
	keyboard: string;
	layout: string;
	created: string;
	modified: string;
	idle_effect?: IdleEffect;
	layout_variant?: string;
	keymap_name?: string;
	output_format?: string;
	tags?: string[];
	is_template?: boolean;
	version?: string;
}

export interface IdleEffect {
	timeout: number;
	duration: number;
	effect: string;
}

export interface IdleEffectSettings {
	enabled: boolean;
	idle_timeout_ms: number;
	idle_effect_duration_ms: number;
	idle_effect_mode: string;
}

export interface TapHoldSettings {
	tapping_term: number;
	quick_tap_term?: number;
	hold_mode: string;
	retro_tapping: boolean;
	tapping_toggle: number;
	flow_tap_term?: number;
	chordal_hold: boolean;
	preset: string;
}

export interface Category {
	id: string;
	name: string;
	color: RgbColor;
	description?: string;
}

export interface RgbColor {
	r: number;
	g: number;
	b: number;
}

export interface Layer {
	name: string;
	number?: number;
	id?: string;
	default_color?: RgbColor;
	category_id?: string;
	layer_colors_enabled?: boolean;
	color: string;
	keys: KeyAssignment[];
}

export interface KeyAssignment {
	keycode: string;
	matrix_position: [number, number];
	visual_index: number;
	led_index: number;
	position?: { row: number; col: number };
	color_override?: RgbColor;
	category_id?: string;
}

export interface TapDance {
	id?: string;
	name: string;
	single_tap: string;
	tap?: string; // alias for single_tap
	hold?: string;
	double_tap?: string;
	tap_hold?: string;
}

export interface Combo {
	id: string;
	name: string;
	keys: string[];
	output: string;
}

export interface KeycodeInfo {
	code: string;
	name: string;
	category: string;
	description?: string;
}

export interface KeycodeListResponse {
	keycodes: KeycodeInfo[];
	total: number;
}

export interface CategoryInfo {
	id: string;
	name: string;
	description: string;
}

export interface CategoryListResponse {
	categories: CategoryInfo[];
}

export interface ConfigResponse {
	qmk_firmware_path?: string;
	output_dir: string;
}

export interface ConfigUpdateRequest {
	qmk_firmware_path?: string;
}

export interface ApiError {
	error: string;
	details?: string;
}

export interface KeyGeometryInfo {
	matrix_row: number;
	matrix_col: number;
	x: number;
	y: number;
	width: number;
	height: number;
	rotation: number;
	led_index?: number;
}

export interface GeometryResponse {
	keyboard: string;
	layout: string;
	keys: KeyGeometryInfo[];
	matrix_rows: number;
	matrix_cols: number;
	encoder_count: number;
}

// Validation response
export interface ValidationResponse {
	valid: boolean;
	error?: string;
	warnings: string[];
}

// Inspect response
export interface InspectResponse {
	metadata: InspectMetadata;
	layers: InspectLayer[];
	tap_dances: InspectTapDance[];
	settings: InspectSettings;
}

export interface InspectMetadata {
	name: string;
	description: string;
	author: string;
	keyboard?: string;
	layout_variant?: string;
	created: string;
	modified: string;
	layer_count: number;
	key_count: number;
	category_count: number;
	tap_dance_count: number;
}

export interface InspectLayer {
	number: number;
	name: string;
	key_count: number;
	default_color: string;
	colors_enabled: boolean;
}

export interface InspectTapDance {
	name: string;
	single_tap: string;
	double_tap?: string;
	hold?: string;
	used_in_layers: number[];
}

export interface InspectSettings {
	rgb_enabled: boolean;
	rgb_brightness: number;
	rgb_saturation: number;
	idle_effect_enabled: boolean;
	idle_timeout_ms: number;
	idle_effect_mode: string;
	tapping_term: number;
	tap_hold_preset: string;
}

// Export response
export interface ExportResponse {
	markdown: string;
	suggested_filename: string;
}

// Generate response
export interface GenerateResponse {
	status: string;
	message: string;
	job_id?: string;
}

// Effects list
export interface EffectsListResponse {
	effects: EffectInfo[];
}

export interface EffectInfo {
	id: string;
	name: string;
}
