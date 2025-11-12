/**
 * 인증 상태 관리 스토어
 * 
 * Zustand를 사용하여 사용자 인증 상태를 전역으로 관리합니다.
 * 서버 데이터가 아닌, 클라이언트 전역 상태만 관리합니다.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  user: {
    id: string;
    email: string;
    name: string;
  } | null;
  isAuthenticated: boolean;
  login: (token: string, user: AuthState['user']) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      login: (token, user) => {
        set({
          token,
          user,
          isAuthenticated: true,
        });
      },
      logout: () => {
        set({
          token: null,
          user: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: 'auth-storage', // 로컬 스토리지 키
    }
  )
);

