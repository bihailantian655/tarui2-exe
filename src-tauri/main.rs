#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::process::Command;

#[derive(Serialize, Deserialize)]
struct DirEntry {
    name: String,
    is_dir: bool,
}

#[derive(Serialize)]
struct ExecuteResult {
    pid: u32,
}

#[tauri::command]
fn read_dir(path: String) -> Result<Vec<DirEntry>, String> {
    let dir_path = Path::new(&path);

    if !dir_path.exists() {
        return Err(format!("路径不存在: {}", path));
    }

    if !dir_path.is_dir() {
        return Err(format!("不是文件夹: {}", path));
    }

    let entries = fs::read_dir(dir_path)
        .map_err(|e| format!("读取文件夹失败: {}", e))?;

    let mut result = Vec::new();

    for entry in entries {
        if let Ok(entry) = entry {
            let name = entry.file_name().to_string_lossy().to_string();
            let is_dir = entry.path().is_dir();
            result.push(DirEntry { name, is_dir });
        }
    }

    Ok(result)
}

#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path)
        .map_err(|e| format!("读取文件失败: {}", e))
}

#[tauri::command]
fn write_text_file(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content)
        .map_err(|e| format!("写入文件失败: {}", e))
}

#[tauri::command]
fn remove_file(path: String) -> Result<(), String> {
    fs::remove_file(&path)
        .map_err(|e| format!("删除文件失败: {}", e))
}

#[tauri::command]
fn execute_script(path: String) -> Result<ExecuteResult, String> {
    let script_path = Path::new(&path);

    if !script_path.exists() {
        return Err(format!("脚本文件不存在: {}", path));
    }

    let child = Command::new("cmd")
        .args(["/c", "start", "", &path])
        .spawn()
        .map_err(|e| format!("启动脚本失败: {}", e))?;

    Ok(ExecuteResult { pid: child.id() })
}

#[tauri::command]
fn get_exe_dir() -> Result<String, String> {
    std::env::current_exe()
        .map(|p| p.parent().unwrap_or(Path::new(".")).to_string_lossy().to_string())
        .map_err(|e| format!("获取程序目录失败: {}", e))
}

#[tauri::command]
fn kill_process(pid: u32) -> Result<(), String> {
    let output = Command::new("taskkill")
        .arg("/F")
        .arg("/T")
        .arg("/PID")
        .arg(pid.to_string())
        .output()
        .map_err(|e| format!("终止进程失败: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("终止进程失败: {}", stderr));
    }

    Ok(())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            read_dir,
            read_text_file,
            write_text_file,
            remove_file,
            execute_script,
            kill_process,
            get_exe_dir
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
