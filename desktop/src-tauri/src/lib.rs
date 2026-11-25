//! Bunny AI desktop shell.
//!
//! The shell is deliberately thin: it hosts the deployed web app in two
//! windows (the full app and a floating companion) and adds the things a
//! browser tab can't do: an always-on-top transparent window, a tray icon and
//! remembered window positions. Chat, memory and voice all stay in the web app.

use tauri::{
    menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, LogicalPosition, LogicalSize, Manager, WebviewUrl, WebviewWindow,
    WebviewWindowBuilder, WindowEvent,
};
use tauri_plugin_window_state::{Builder as WindowState, StateFlags};

/// Where the web app is hosted. Set BUNNY_APP_URL when building; it is also
/// what the generated capability (build.rs) trusts.
const APP_URL: &str = match option_env!("BUNNY_APP_URL") {
    Some(url) => url,
    None => "http://localhost:3000",
};

const COMPACT: (f64, f64) = (220.0, 260.0);
const EXPANDED: (f64, f64) = (380.0, 560.0);
const MARGIN: f64 = 24.0;

fn page_url(path: &str) -> WebviewUrl {
    let base = APP_URL.trim_end_matches('/');
    WebviewUrl::External(format!("{base}{path}").parse().expect("BUNNY_APP_URL must be a valid URL"))
}

fn show_main(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

fn toggle_companion(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("companion") {
        if window.is_visible().unwrap_or(false) {
            let _ = window.hide();
        } else {
            let _ = window.show();
            let _ = window.set_focus();
        }
    }
}

/// Grows or shrinks the companion while keeping its bottom-right corner
/// fixed, so it expands up and to the left, away from the screen edge.
#[tauri::command]
fn set_companion_expanded(app: AppHandle, expanded: bool) -> Result<(), String> {
    let window = app.get_webview_window("companion").ok_or("companion window missing")?;
    let scale = window.scale_factor().map_err(|e| e.to_string())?;
    let pos = window.outer_position().map_err(|e| e.to_string())?.to_logical::<f64>(scale);
    let size = window.outer_size().map_err(|e| e.to_string())?.to_logical::<f64>(scale);
    let (w, h) = if expanded { EXPANDED } else { COMPACT };

    window.set_size(LogicalSize::new(w, h)).map_err(|e| e.to_string())?;
    window
        .set_position(LogicalPosition::new(pos.x + size.width - w, pos.y + size.height - h))
        .map_err(|e| e.to_string())?;
    if expanded {
        window.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn open_main_window(app: AppHandle) {
    show_main(&app);
}

#[tauri::command]
fn hide_companion(app: AppHandle) {
    if let Some(window) = app.get_webview_window("companion") {
        let _ = window.hide();
    }
}

fn create_windows(app: &AppHandle) -> tauri::Result<WebviewWindow> {
    WebviewWindowBuilder::new(app, "main", page_url("/"))
        .title("Bunny AI")
        .inner_size(1100.0, 760.0)
        .min_inner_size(420.0, 520.0)
        .build()?;

    let companion = WebviewWindowBuilder::new(app, "companion", page_url("/companion"))
        .title("Bunny")
        .inner_size(COMPACT.0, COMPACT.1)
        .decorations(false)
        .transparent(true)
        .shadow(false)
        .always_on_top(true)
        .skip_taskbar(true)
        .resizable(false)
        .build()?;

    // Start in the bottom-right corner of the primary screen.
    if let Some(monitor) = app.primary_monitor()? {
        let scale = monitor.scale_factor();
        let screen = monitor.size().to_logical::<f64>(scale);
        let origin = monitor.position().to_logical::<f64>(scale);
        companion.set_position(LogicalPosition::new(
            origin.x + screen.width - COMPACT.0 - MARGIN,
            origin.y + screen.height - COMPACT.1 - MARGIN - 40.0, // clear of the taskbar
        ))?;
    }
    Ok(companion)
}

fn create_tray(app: &AppHandle, companion: WebviewWindow) -> tauri::Result<()> {
    let open = MenuItem::with_id(app, "open", "Open Bunny AI", true, None::<&str>)?;
    let toggle = MenuItem::with_id(app, "toggle", "Show / hide companion", true, None::<&str>)?;
    let on_top = CheckMenuItem::with_id(app, "on_top", "Keep companion on top", true, true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(
        app,
        &[&open, &toggle, &on_top, &PredefinedMenuItem::separator(app)?, &quit],
    )?;

    let mut tray = TrayIconBuilder::new()
        .tooltip("Bunny AI")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(move |app, event| match event.id().as_ref() {
            "open" => show_main(app),
            "toggle" => toggle_companion(app),
            "on_top" => {
                let _ = companion.set_always_on_top(on_top.is_checked().unwrap_or(true));
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            // Left click on the tray icon toggles the companion.
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                toggle_companion(tray.app_handle());
            }
        });
    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }
    tray.build(app)?;
    Ok(())
}

pub fn run() {
    tauri::Builder::default()
        // Remember the main window's size and position. The companion manages
        // its own geometry (corner placement, compact/expanded sizes).
        .plugin(
            WindowState::default()
                .with_state_flags(StateFlags::SIZE | StateFlags::POSITION | StateFlags::MAXIMIZED)
                .with_denylist(&["companion"])
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            set_companion_expanded,
            open_main_window,
            hide_companion
        ])
        .setup(|app| {
            let companion = create_windows(app.handle())?;
            create_tray(app.handle(), companion)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            // Closing the main window keeps Bunny in the tray; Quit is in the tray menu.
            if window.label() == "main" {
                if let WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Bunny AI desktop");
}
