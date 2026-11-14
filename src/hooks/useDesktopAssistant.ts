import { useEffect } from 'react';
import { setupTray } from '../lib/desktop';
import { registerGlobalHotkey } from '../lib/hotkey';

export function useDesktopAssistant() {
  useEffect(() => {
    void setupTray();
    void registerGlobalHotkey();
  }, []);
}
