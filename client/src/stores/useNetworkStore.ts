/**
 * 네트워크 상태 관리 (Zustand Store)
 *
 * Phase 7: 예외 상황 처리 (Exception Handling)
 * - GPS/모바일 데이터 수신 상태 추적
 * - 마지막 업데이트 시간 기록
 * - 네트워크 확인 중 상태 관리
 *
 * 헌법 준수:
 * - AGENTS.md 프론트엔드 헌법 [제1장] Zustand 상태 관리
 * - UI 상태만 관리 (서버 상태는 절대 저장 금지)
 * - 액션은 명시적으로 정의
 */

import { create } from 'zustand';

export interface NetworkState {
  // 오프라인 상태 (true: 오프라인, false: 온라인)
  isOffline: boolean;

  // 마지막 업데이트 시간
  lastUpdated: Date;

  // 네트워크 확인 중 상태
  isCheckingNetwork: boolean;

  // 오프라인 상태 설정
  setOffline: (offline: boolean) => void;

  // 마지막 업데이트 시간 설정
  setLastUpdated: (date: Date) => void;

  // 네트워크 확인 중 상태 설정
  setCheckingNetwork: (checking: boolean) => void;
}

export const useNetworkStore = create<NetworkState>((set) => ({
  // 초기 상태: 온라인
  isOffline: false,

  // 마지막 업데이트 시간: 현재 시간
  lastUpdated: new Date(),

  // 네트워크 확인 중: false
  isCheckingNetwork: false,

  // 오프라인 상태 설정
  setOffline: (offline: boolean) => {
    set({ isOffline: offline });
  },

  // 마지막 업데이트 시간 설정
  setLastUpdated: (date: Date) => {
    set({ lastUpdated: date });
  },

  // 네트워크 확인 중 상태 설정
  setCheckingNetwork: (checking: boolean) => {
    set({ isCheckingNetwork: checking });
  },
}));
