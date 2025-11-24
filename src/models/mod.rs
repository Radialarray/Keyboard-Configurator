//! Data models for keyboard layouts, layers, and configuration.
//!
//! This module contains all the core data structures used throughout the application.
//! Models are designed to be independent of UI and business logic.

pub mod rgb;
pub mod category;
pub mod layer;
pub mod layout;
pub mod keyboard_geometry;
pub mod visual_layout_mapping;

// Re-export all model types
pub use rgb::RgbColor;
pub use category::Category;
pub use layer::{Position, KeyDefinition, Layer};
pub use layout::{LayoutMetadata, Layout};
pub use keyboard_geometry::{KeyGeometry, KeyboardGeometry};
pub use visual_layout_mapping::VisualLayoutMapping;
