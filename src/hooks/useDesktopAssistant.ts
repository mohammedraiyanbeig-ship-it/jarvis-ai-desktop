import { useEffect } from 'react';
import { setupTray } from './desktop';
import { registerGlobalHotkey } from './hotkey';

export function useDesktopAssistant() {
  useEffect(() => {
    void setupTray();
    void registerGlobalHotkey();
  }, []);
}
