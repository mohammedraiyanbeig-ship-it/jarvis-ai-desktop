#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
  AppHandle, CustomMenuItem, Manager, RunEvent, SystemTray, SystemTrayEvent, SystemTrayMenu,
};

#[tauri::command]
async fn register_global_hotkey(app: AppHandle, hotkey: &str) -> Result<(), String> {
  let _ = hotkey;
  let _ = app.emit("hotkey-open", "");
  Ok(())
}

fn main() {
  let tray_menu = SystemTrayMenu::new()
    .add_item(CustomMenuItem::new("open", "Open Jarvis"))
    .add_item(CustomMenuItem::new("quit", "Quit"));

  tauri::Builder::default()
    .setup(|app| {
      let handle = app.handle();
      let tray = SystemTray::new().with_menu(tray_menu);
      let _ = tray.on_event(move |app, event| match event {
        SystemTrayEvent::LeftClick { .. } => {
          let _ = app.get_webview_window("main").unwrap().show();
          let _ = app.get_webview_window("main").unwrap().set_focus();
        }
        SystemTrayEvent::MenuItemClick { id, .. } => match id.as_str() {
          "open" => {
            let _ = app.get_webview_window("main").unwrap().show();
            let _ = app.get_webview_window("main").unwrap().set_focus();
          }
          "quit" => {
            app.exit(0);
          }
          _ => {}
        }
        _ => {}
      });
      handle.manage(tray);
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![register_global_hotkey])
    .build(tauri::generate_context!())
    .expect("error while building tauri application")
    .run(|app, event| {
      if let RunEvent::WindowEvent { label, event, .. } = event {
        if let tauri::WindowEvent::CloseRequested { api, .. } = event {
          if label == "main" {
            api.prevent_close();
            app.get_window("main").unwrap().hide().unwrap();
          }
        }
      }
    });
}
