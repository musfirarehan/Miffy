use std::{env, fs, path::Path};

/// The web UI lives at a URL that is only known at build time (BUNNY_APP_URL,
/// your deployed site). Tauri decides which remote pages may call native
/// commands from a capability file, so that file is generated here from the
/// same variable. That way the permission is scoped to exactly your site.
fn main() {
    println!("cargo:rerun-if-env-changed=BUNNY_APP_URL");
    let url = env::var("BUNNY_APP_URL").unwrap_or_else(|_| "http://localhost:3000".into());
    let origin = url.trim_end_matches('/');

    let capability = format!(
        r#"{{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "bunny-remote",
  "description": "Lets the Bunny web app (and only it) use the few desktop commands it needs.",
  "windows": ["main", "companion"],
  "remote": {{ "urls": ["{origin}/*"] }},
  "permissions": [
    "allow-set-companion-expanded",
    "allow-open-main-window",
    "allow-hide-companion",
    "core:window:allow-start-dragging"
  ]
}}
"#
    );
    let dir = Path::new("capabilities");
    fs::create_dir_all(dir).expect("create capabilities dir");
    fs::write(dir.join("remote.json"), capability).expect("write capability");

    let manifest = tauri_build::AppManifest::new().commands(&[
        "set_companion_expanded",
        "open_main_window",
        "hide_companion",
    ]);
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(manifest))
        .expect("failed to run tauri build script");
}
