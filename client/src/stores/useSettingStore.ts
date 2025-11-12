/**
 * 앱 설정 상태 관리 스토어
 * 
 * 앱의 전역 설정(테마, 알림 설정 등)을 관리합니다.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingState {
  theme: 'light' | 'dark';
  notifications: boolean;
  language: 'ko' | 'en';
  setTheme: (theme: SettingState['theme']) => void;
  setNotifications: (enabled: boolean) => void;
  setLanguage: (language: SettingState['language']) => void;
}

export const useSettingStore = create<SettingState>()(
  persist(
    (set) => ({
      theme: 'light',
      notifications: true,
      language: 'ko',
      setTheme: (theme) => set({ theme }),
      setNotifications: (notifications) => set({ notifications }),
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'setting-storage',
    }
  )
);

