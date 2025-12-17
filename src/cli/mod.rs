//! CLI command handlers for LazyQMK.
//!
//! This module provides headless, scriptable access to LazyQMK's core functionality
//! for automation, testing, and CI/CD integration.

pub mod common;
pub mod generate;
pub mod inspect;
pub mod keycode;
pub mod layer_refs;
pub mod tap_dance;
pub mod validate;

// Re-export types used by main.rs and tests
pub use common::ExitCode;
pub use generate::GenerateArgs;
pub use inspect::InspectArgs;
pub use keycode::KeycodeArgs;
pub use layer_refs::LayerRefsArgs;
pub use tap_dance::TapDanceArgs;
pub use validate::ValidateArgs;
