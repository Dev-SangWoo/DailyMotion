/**
 * 실시간 경로 추적 Hook
 *
 * DailyBriefingScreen에서 GPS 위치를 모니터링하고 경로 추적 상태를 업데이트합니다.
 *
 * 헌법 준수:
 * - CLAUDE.md: React Hook 패턴 사용
 * - AGENTS.md 제3장: 데이터 페칭과 상태 업데이트
 */

import { useEffect, useRef } from 'react';
import { getLocationTrackingManager } from '../services/locationTrackingService';
import {
  detectUserTrackingStatus,
  GPSPoint,
  TrackingState,
  formatDistance,
  formatTime,
} from '../services/routeTrackingService';
import {
  useTrackingActions,
  useCurrentLocation,
  useIsTrackingActive,
} from '../stores/useTrackingStore';
import { useOnboardingData } from '../screens/Onboarding/stores/useOnboardingStore';
import { RecommendedRoute } from '../services/routeSearchService';

interface UseRealTimeTrackingOptions {
  enabled?: boolean;
  onStatusChange?: (status: TrackingState) => void;
}

/**
 * 실시간 경로 추적 Hook
 *
 * @param route 선택된 경로 정보
 * @param options 설정 옵션
 */
export function useRealTimeTracking(
  route: RecommendedRoute | null,
  options: UseRealTimeTrackingOptions = {}
) {
  const { enabled = true, onStatusChange } = options;
  const trackingManager = getLocationTrackingManager();
  const actions = useTrackingActions();
  const currentLocation = useCurrentLocation();
  const isTrackingActive = useIsTrackingActive();

  const previousLocationRef = useRef<GPSPoint | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!enabled || !route || !isTrackingActive) {
      return;
    }

    console.log('[useRealTimeTracking] 실시간 추적 시작:', {
      routeId: route.id,
      enabled,
      isActive: isTrackingActive,
    });

    // 위치 추적 시작
    const startTracking = async () => {
      try {
        // 포그라운드 추적 시작
        await trackingManager.startForegroundTracking();

        // 위치 업데이트 리스너 등록
        unsubscribeRef.current = trackingManager.subscribe((location: GPSPoint) => {
          console.log('[useRealTimeTracking] GPS 업데이트:', {
            lat: location.latitude.toFixed(6),
            lon: location.longitude.toFixed(6),
          });

          // Zustand 스토어에 위치 업데이트
          actions.updateCurrentLocation(location);

          // 경로 추적 상태 업데이트
          if (previousLocationRef.current && route) {
            const trackingState = detectUserTrackingStatus(
              location,
              route,
              previousLocationRef.current
            );

            // 추적 상태 로깅
            console.log('[useRealTimeTracking] 추적 상태 업데이트:', {
              status: trackingState.status,
              speed: trackingState.movementSpeed.toFixed(2),
              message: trackingState.message,
            });

            // Zustand 스토어에 상태 업데이트
            actions.updateTrackingState(trackingState);

            // 콜백 실행
            if (onStatusChange) {
              onStatusChange(trackingState);
            }
          }

          // 이전 위치 업데이트
          previousLocationRef.current = location;
        });
      } catch (error) {
        console.error('[useRealTimeTracking] 추적 시작 실패:', error);
      }
    };

    startTracking();

    // 정리
    return () => {
      console.log('[useRealTimeTracking] 추적 정지');
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      trackingManager.stopForegroundTracking();
      previousLocationRef.current = null;
    };
  }, [enabled, route, isTrackingActive]);

  return {
    currentLocation,
    isTracking: isTrackingActive,
    trackingManager,
  };
}

export default useRealTimeTracking;
