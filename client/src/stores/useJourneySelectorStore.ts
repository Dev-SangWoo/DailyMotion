/**
 * 여정 선택기 상태 관리 스토어 (Journey Selector Store)
 *
 * 헌법 준수:
 * - AGENTS.md 프론트엔드 헌법 [제2장] 상태 관리 (Zustand)
 * - CLAUDE.md: 서버 상태는 절대 저장 금지, 클라이언트 UI 상태만 관리
 * - DESIGN.md 3: 비서 모드 vs 탐색 모드 상태 관리
 *
 * 관리 대상:
 * - isExpanded: 여정 선택기 확장/축소 상태 (UI 상태)
 * - selectedTab: 현재 선택된 탭 (출근/귀가/헬스장)
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface JourneySelectorState {
  // State properties
  isExpanded: boolean;
  selectedTab: 'commute' | 'retreat' | 'gym';

  // Actions (explicitly defined)
  setExpanded: (expanded: boolean) => void;
  toggleExpanded: () => void;
  setSelectedTab: (tab: 'commute' | 'retreat' | 'gym') => void;
}

export const useJourneySelectorStore = create<JourneySelectorState>()(
  persist(
    (set) => ({
      // Initial state
      isExpanded: false, // 기본: 축소 상태 (비서 모드 기본값)
      selectedTab: 'commute', // 기본: 출근 탭

      // Actions implementation
      setExpanded: (expanded) => {
        set({ isExpanded: expanded });
      },

      toggleExpanded: () => {
        set((state) => ({ isExpanded: !state.isExpanded }));
      },

      setSelectedTab: (tab) => {
        set({ selectedTab: tab });
      },
    }),
    {
      name: 'journey-selector-storage', // Local storage key
    }
  )
);
