use tauri::Manager;

/// Obtiene el nombre del dispositivo (hostname) para mostrar en la activación.
#[tauri::command]
fn get_device_info() -> Result<String, String> {
    Ok(hostname::get()
        .map(|h| h.to_string_lossy().into_owned())
        .unwrap_or_else(|_| "DESKTOP-UNKNOWN".to_string()))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_window::init())
        .invoke_handler(tauri::generate_handler![
            get_device_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
