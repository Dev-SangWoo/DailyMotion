/**
 * 경로 추적 상태 관리 (Zustand)
 *
 * - 현재 GPS 위치
 * - 사용자 추적 상태
 * - 현재 세그먼트 정보
 * - 목적지까지의 예상 시간
 *
 * 헌법 준수:
 * - CLAUDE.md: Zustand 사용, 서버 상태 저장 금지 (로컬 UI 상태만)
 * - AGENTS.md 제1장: actions 객체에 명시적 액션 정의
 */

import { create } from 'zustand';
import { GPSPoint, UserTrackingStatus, TrackingState } from '../services/routeTrackingService';

/**
 * 추적 스토어 상태
 */
interface TrackingStoreState {
  // 현재 상태
  isTrackingActive: boolean;
  currentLocation: GPSPoint | null;
  trackingState: TrackingState | null;

  // 경로 정보
  selectedRouteId: string | null;

  // 액션들
  actions: {
    // 추적 시작
    startTracking: (routeId: string) => void;

    // 추적 중지
    stopTracking: () => void;

    // 현재 위치 업데이트
    updateCurrentLocation: (location: GPSPoint) => void;

    // 추적 상태 업데이트
    updateTrackingState: (state: TrackingState) => void;

    // 현재 위치 초기화
    resetLocation: () => void;

    // 전체 상태 초기화
    reset: () => void;
  };
}

/**
 * 경로 추적 Zustand 스토어
 */
export const useTrackingStore = create<TrackingStoreState>((set) => ({
  // 초기 상태
  isTrackingActive: false,
  currentLocation: null,
  trackingState: null,
  selectedRouteId: null,

  // 액션들
  actions: {
    // 추적 시작
    startTracking: (routeId: string) => {
      console.log('[useTrackingStore] 추적 시작:', routeId);
      set({ isTrackingActive: true, selectedRouteId: routeId });
    },

    // 추적 중지
    stopTracking: () => {
      console.log('[useTrackingStore] 추적 중지');
      set({ isTrackingActive: false, selectedRouteId: null });
    },

    // 현재 위치 업데이트
    updateCurrentLocation: (location: GPSPoint) => {
      console.log('[useTrackingStore] 위치 업데이트:', {
        lat: location.latitude.toFixed(6),
        lon: location.longitude.toFixed(6),
      });
      set({ currentLocation: location });
    },

    // 추적 상태 업데이트
    updateTrackingState: (state: TrackingState) => {
      console.log('[useTrackingStore] 추적 상태 업데이트:', state.status);
      set({ trackingState: state });
    },

    // 현재 위치 초기화
    resetLocation: () => {
      console.log('[useTrackingStore] 위치 초기화');
      set({ currentLocation: null });
    },

    // 전체 상태 초기화
    reset: () => {
      console.log('[useTrackingStore] 전체 상태 초기화');
      set({
        isTrackingActive: false,
        currentLocation: null,
        trackingState: null,
        selectedRouteId: null,
      });
    },
  },
}));

/**
 * 추적 활성화 여부 선택자
 */
export const useIsTrackingActive = () =>
  useTrackingStore((state) => state.isTrackingActive);

/**
 * 현재 위치 선택자
 */
export const useCurrentLocation = () =>
  useTrackingStore((state) => state.currentLocation);

/**
 * 추적 상태 선택자
 */
export const useTrackingState = () =>
  useTrackingStore((state) => state.trackingState);

/**
 * 선택된 경로 ID 선택자
 */
export const useSelectedRouteId = () =>
  useTrackingStore((state) => state.selectedRouteId);

/**
 * 추적 액션들 선택자
 */
export const useTrackingActions = () =>
  useTrackingStore((state) => state.actions);

export default useTrackingStore;
