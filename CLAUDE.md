# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Tasks

### Development
- **Run in Dev Mode**: `npm run dev` (starts the Tauri development environment)
- **Build for Production**: `npm run build`
- **Tauri CLI**: `npm run tauri`

### Project Structure
- `src/`: Contains the frontend application (HTML, CSS, and JavaScript).
- `src-tauri/`: Contains the Rust backend logic, Tauri configuration, and build scripts.
- `tauri.conf.json`: The main configuration file for the Tauri application.
- `main.rs`: The entry point for the Rust backend.

## Architecture Overview
- **Frontend**: A standard web frontend (HTML/JS/CSS) located in the `src/` directory.
- **Backend**: A Rust-based backend managed by the Tauri framework, located in the `src-tauri/` directory.
- **Communication**: The frontend interacts with the backend via Tauri's IPC (Inter-Process Communication) system, allowing for native OS functionality (like file system access or shell commands) to be triggered from the web UI.
- **Configuration**: Tauri's `allowlist` in `tauri.conf.json` defines the permissions available to the frontend.
