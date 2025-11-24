/**
 * Context Awareness 서비스
 *
 * GPS 위치를 서버로 전송하여 사용자 상태(걷는지, 버스/지하철 타는지)를 감지합니다.
 *
 * 헌법 준수:
 * - CLAUDE.md: 외부 서비스와의 연동은 서비스 계층에서 관리
 */

import apiClient from './api';
import { GPSPoint } from './routeTrackingService';

export interface ContextAwarenessResult {
  state: 'WAITING' | 'WALKING' | 'ON_TRIP' | 'UNKNOWN';
  currentVehicle?: 'BUS' | 'SUBWAY' | null;
  distanceToWork?: number;
  estimatedArrivalTime?: string;
  estimatedMinutes?: number;
  screenSwitchNeeded?: boolean;
  switchMessage?: string;
}

/**
 * 서버에 GPS 위치를 전송하고 사용자 상태를 받아옵니다.
 *
 * @param location 현재 GPS 위치
 * @param userId 사용자 ID (기본값: 'user_001')
 * @param mode 현재 모드 (COMMUTE/RETREAT, 기본값: 'COMMUTE')
 * @returns 사용자 상태 및 컨텍스트 정보
 */
export async function sendLocationToServer(
  location: GPSPoint,
  userId: string = 'user_001',
  mode: 'COMMUTE' | 'RETREAT' = 'COMMUTE'
): Promise<ContextAwarenessResult | null> {
  try {
    console.log('[Context Service] GPS 위치 서버 전송:', {
      lat: location.latitude.toFixed(6),
      lon: location.longitude.toFixed(6),
      accuracy: location.accuracy,
    });

    const response = await apiClient.get('/context/mode-switch', {
      params: {
        userId,
        currentLatitude: location.latitude,
        currentLongitude: location.longitude,
        currentAccuracy: location.accuracy,
        mode,
      },
    });

    if (response.data?.data) {
      const result = response.data.data;
      console.log('[Context Service] 서버 응답:', {
        state: result.state,
        currentVehicle: result.currentVehicle,
        estimatedMinutes: result.estimatedMinutes,
      });
      return result as ContextAwarenessResult;
    }

    return null;
  } catch (error: any) {
    console.error('[Context Service] GPS 전송 실패:', {
      error: error.message,
      status: error.response?.status,
    });
    return null;
  }
}

export default {
  sendLocationToServer,
};

