import { invoke } from '@tauri-apps/api/core';

export async function registerGlobalHotkey(): Promise<void> {
  try {
    await invoke('register_global_hotkey', { hotkey: 'Ctrl+Shift+J' });
  } catch (error) {
    console.error('Hotkey registration failed:', error);
  }
}
