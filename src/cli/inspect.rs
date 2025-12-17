//! Inspect command for reading layout sections.

use crate::cli::common::{CliError, CliResult};
use crate::services::LayoutService;
use clap::Args;
use serde::Serialize;
use std::path::PathBuf;

/// Inspect specific sections of a layout file
#[derive(Debug, Clone, Args)]
pub struct InspectArgs {
    /// Path to layout markdown file
    #[arg(short, long, value_name = "FILE")]
    pub layout: PathBuf,

    /// Section to inspect: metadata, layers, categories, tap-dances, settings
    #[arg(short, long, value_name = "NAME")]
    pub section: String,

    /// Output as JSON
    #[arg(long)]
    pub json: bool,
}

#[derive(Debug, Serialize)]
struct MetadataSection {
    name: String,
    author: String,
    keyboard: Option<String>,
    layout_variant: Option<String>,
    keymap_name: Option<String>,
    created: String,
    modified: String,
    tags: Vec<String>,
}

#[derive(Debug, Serialize)]
struct LayersSection {
    count: usize,
    layers: Vec<LayerInfo>,
}

#[derive(Debug, Serialize)]
struct LayerInfo {
    number: usize,
    name: String,
    key_count: usize,
}

#[derive(Debug, Serialize)]
struct CategoriesSection {
    count: usize,
    categories: Vec<CategoryInfo>,
}

#[derive(Debug, Serialize)]
struct CategoryInfo {
    id: String,
    name: String,
    color: String,
}

#[derive(Debug, Serialize)]
struct TapDancesSection {
    count: usize,
    tap_dances: Vec<TapDanceInfo>,
}

#[derive(Debug, Serialize)]
struct TapDanceInfo {
    name: String,
    single_tap: String,
    double_tap: Option<String>,
    hold: Option<String>,
    #[serde(rename = "type")]
    td_type: String,
}

#[derive(Debug, Serialize)]
struct SettingsSection {
    rgb_enabled: bool,
    rgb_brightness: u8,
    rgb_timeout_ms: u32,
    idle_effect_enabled: bool,
    idle_effect_timeout_ms: u32,
    idle_effect_duration_ms: u32,
    idle_effect_mode: String,
}

impl InspectArgs {
    /// Execute the inspect command
    pub fn execute(&self) -> CliResult<()> {
        // Validate section name
        if !matches!(
            self.section.as_str(),
            "metadata" | "layers" | "categories" | "tap-dances" | "settings"
        ) {
            return Err(CliError::validation(format!(
                "Invalid section '{}'. Must be one of: metadata, layers, categories, tap-dances, settings",
                self.section
            )));
        }

        // Load layout
        let layout = LayoutService::load(&self.layout)
            .map_err(|e| CliError::io(format!("Failed to load layout: {e}")))?;

        // Output based on section
        match self.section.as_str() {
            "metadata" => {
                let section = MetadataSection {
                    name: layout.metadata.name.clone(),
                    author: layout.metadata.author.clone(),
                    keyboard: layout.metadata.keyboard.clone(),
                    layout_variant: layout.metadata.layout_variant.clone(),
                    keymap_name: layout.metadata.keymap_name.clone(),
                    created: layout.metadata.created.to_rfc3339(),
                    modified: layout.metadata.modified.to_rfc3339(),
                    tags: layout.metadata.tags,
                };

                if self.json {
                    println!(
                        "{}",
                        serde_json::to_string_pretty(&section)
                            .map_err(|e| CliError::io(format!("Failed to serialize JSON: {e}")))?
                    );
                } else {
                    println!("Metadata:");
                    println!("  Name:           {}", section.name);
                    if !section.author.is_empty() {
                        println!("  Author:         {}", section.author);
                    }
                    if let Some(keyboard) = section.keyboard {
                        println!("  Keyboard:       {}", keyboard);
                    }
                    if let Some(layout_variant) = section.layout_variant {
                        println!("  Layout Variant: {}", layout_variant);
                    }
                    if let Some(keymap_name) = section.keymap_name {
                        println!("  Keymap Name:    {}", keymap_name);
                    }
                    println!("  Created:        {}", section.created);
                    println!("  Modified:       {}", section.modified);
                    if !section.tags.is_empty() {
                        println!("  Tags:           {}", section.tags.join(", "));
                    }
                }
            }
            "layers" => {
                let layers: Vec<LayerInfo> = layout
                    .layers
                    .iter()
                    .enumerate()
                    .map(|(idx, layer)| LayerInfo {
                        number: idx,
                        name: layer.name.clone(),
                        key_count: layer.keys.len(),
                    })
                    .collect();

                let section = LayersSection {
                    count: layers.len(),
                    layers,
                };

                if self.json {
                    println!(
                        "{}",
                        serde_json::to_string_pretty(&section)
                            .map_err(|e| CliError::io(format!("Failed to serialize JSON: {e}")))?
                    );
                } else {
                    println!("Layers ({} total):", section.count);
                    for layer in &section.layers {
                        println!(
                            "  [{}] {} ({} keys)",
                            layer.number, layer.name, layer.key_count
                        );
                    }
                }
            }
            "categories" => {
                let categories: Vec<CategoryInfo> = layout
                    .categories
                    .iter()
                    .map(|cat| CategoryInfo {
                        id: cat.id.clone(),
                        name: cat.name.clone(),
                        color: format!(
                            "#{:02X}{:02X}{:02X}",
                            cat.color.r, cat.color.g, cat.color.b
                        ),
                    })
                    .collect();

                let section = CategoriesSection {
                    count: categories.len(),
                    categories,
                };

                if self.json {
                    println!(
                        "{}",
                        serde_json::to_string_pretty(&section)
                            .map_err(|e| CliError::io(format!("Failed to serialize JSON: {e}")))?
                    );
                } else {
                    println!("Categories ({} total):", section.count);
                    for cat in &section.categories {
                        println!("  {} - {} ({})", cat.id, cat.name, cat.color);
                    }
                }
            }
            "tap-dances" => {
                let tap_dances: Vec<TapDanceInfo> = layout
                    .tap_dances
                    .iter()
                    .map(|td| TapDanceInfo {
                        name: td.name.clone(),
                        single_tap: td.single_tap.clone(),
                        double_tap: td.double_tap.clone(),
                        hold: td.hold.clone(),
                        td_type: if td.hold.is_some() {
                            "three_way".to_string()
                        } else if td.double_tap.is_some() {
                            "two_way".to_string()
                        } else {
                            "single".to_string()
                        },
                    })
                    .collect();

                let section = TapDancesSection {
                    count: tap_dances.len(),
                    tap_dances,
                };

                if self.json {
                    println!(
                        "{}",
                        serde_json::to_string_pretty(&section)
                            .map_err(|e| CliError::io(format!("Failed to serialize JSON: {e}")))?
                    );
                } else {
                    println!("Tap Dances ({} total):", section.count);
                    for td in &section.tap_dances {
                        println!("  {} ({}):", td.name, td.td_type);
                        println!("    Single: {}", td.single_tap);
                        if let Some(double) = &td.double_tap {
                            println!("    Double: {}", double);
                        }
                        if let Some(hold) = &td.hold {
                            println!("    Hold:   {}", hold);
                        }
                    }
                }
            }
            "settings" => {
                let section = SettingsSection {
                    rgb_enabled: layout.rgb_enabled,
                    rgb_brightness: layout.rgb_brightness.as_percent(),
                    rgb_timeout_ms: layout.rgb_timeout_ms,
                    idle_effect_enabled: layout.idle_effect_settings.enabled,
                    idle_effect_timeout_ms: layout.idle_effect_settings.idle_timeout_ms,
                    idle_effect_duration_ms: layout.idle_effect_settings.idle_effect_duration_ms,
                    idle_effect_mode: format!("{:?}", layout.idle_effect_settings.idle_effect_mode),
                };

                if self.json {
                    println!(
                        "{}",
                        serde_json::to_string_pretty(&section)
                            .map_err(|e| CliError::io(format!("Failed to serialize JSON: {e}")))?
                    );
                } else {
                    println!("RGB Settings:");
                    println!("  Enabled:    {}", section.rgb_enabled);
                    println!("  Brightness: {}%", section.rgb_brightness);
                    println!("  Timeout:    {}ms", section.rgb_timeout_ms);
                    println!("\nIdle Effect Settings:");
                    println!("  Enabled:  {}", section.idle_effect_enabled);
                    println!("  Timeout:  {}ms", section.idle_effect_timeout_ms);
                    println!("  Duration: {}ms", section.idle_effect_duration_ms);
                    println!("  Mode:     {}", section.idle_effect_mode);
                }
            }
            _ => unreachable!("Section already validated"),
        }

        Ok(())
    }
}
