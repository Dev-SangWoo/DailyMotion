/**
 * Ambient Feedback (배경색 알림) 상태 관리 Store
 *
 * 헌법 준수:
 * - AGENTS.md 프론트엔드 헌법 [제2장] 상태 관리 (Zustand)
 * - CLAUDE.md: Zustand은 UI 상태만 관리 (서버 상태 금지)
 * - DESIGN.md 5: Ambient Feedback 배경색 알림 명세
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 배경색 상태 타입
export type AmbientFeedbackStatus = 'normal' | 'warning' | 'alert';

// Ambient Feedback Store 인터페이스
interface AmbientFeedbackStore {
  // 상태
  status: AmbientFeedbackStatus;
  lastUpdateTime: number; // 마지막 상태 변경 시간 (밀리초)

  // 액션
  setStatus: (status: AmbientFeedbackStatus) => void;
  reset: () => void;
}

/**
 * Ambient Feedback Store
 *
 * [DESIGN.md Phase 5: Ambient Feedback]
 * 역할: 사용자의 여정 상태에 따라 화면 배경색을 변경
 *
 * 상태별 배경색:
 * - 🔵 normal (기본): theme.colors.background (파란색)
 * - 🟠 warning (주의): Logic 3.1 발동 시 주황색
 * - 🔴 alert (위기): Logic 3.2 발동 시 빨간색
 */
export const useAmbientFeedbackStore = create<AmbientFeedbackStore>()(
  persist(
    (set) => ({
      // 초기 상태
      status: 'normal',
      lastUpdateTime: Date.now(),

      // 액션: 배경색 상태 변경
      setStatus: (status: AmbientFeedbackStatus) =>
        set({
          status,
          lastUpdateTime: Date.now(),
        }),

      // 액션: 초기 상태로 리셋
      reset: () =>
        set({
          status: 'normal',
          lastUpdateTime: Date.now(),
        }),
    }),
    {
      name: 'ambient-feedback-store', // localStorage 키
    }
  )
);
