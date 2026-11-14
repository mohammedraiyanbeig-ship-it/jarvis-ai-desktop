import { listen, emit } from '@tauri-apps/api/event';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';

const appWindow = getCurrentWebviewWindow();

export async function setupTray(): Promise<void> {
  try {
    await listen('tray-click', () => {
      appWindow.show();
      appWindow.setFocus();
    });
    await listen('hotkey-open', () => {
      appWindow.show();
      appWindow.setFocus();
    });
    await emit('app-ready', { ready: true });
  } catch (error) {
    console.error('Tray setup failed:', error);
  }
}
