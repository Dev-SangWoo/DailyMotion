/**
 * 위치 추적 서비스 (연속 GPS 모니터링)
 *
 * - 백그라운드 GPS 추적 설정
 * - 위치 업데이트 콜백
 * - 위치 히스토리 관리
 * - 상태 구독 시스템
 *
 * 헌법 준수:
 * - CLAUDE.md: 외부 서비스와의 연동은 서비스 계층에서 관리
 * - TaskManager 또는 expo-background-fetch 사용
 */

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { GPSPoint } from './routeTrackingService';

/**
 * 백그라운드 위치 추적 태스크 이름
 */
const LOCATION_TRACKING_TASK = 'location-tracking-background';

/**
 * 위치 추적 이벤트 리스너
 */
type LocationUpdateListener = (location: GPSPoint) => void;

/**
 * 위치 추적 구독 취소 함수
 */
type UnsubscribeFunction = () => void;

/**
 * 위치 추적 매니저 (싱글톤)
 */
class LocationTrackingManager {
  private isTracking = false;
  private listeners: LocationUpdateListener[] = [];
  private locationHistory: GPSPoint[] = [];
  private maxHistorySize = 50; // 최근 50개 위치만 유지
  private foregroundSubscription: Location.LocationSubscription | null = null;

  /**
   * 위치 업데이트 구독
   * @param listener 위치 업데이트 콜백
   * @returns 구독 취소 함수
   */
  subscribe(listener: LocationUpdateListener): UnsubscribeFunction {
    this.listeners.push(listener);

    // 현재 히스토리가 있으면 즉시 콜백 실행
    if (this.locationHistory.length > 0) {
      listener(this.locationHistory[this.locationHistory.length - 1]);
    }

    // 구독 취소 함수 반환
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * 모든 리스너에게 위치 업데이트 브로드캐스트
   * @param location GPS 위치
   */
  private broadcastLocationUpdate(location: GPSPoint) {
    console.log('[Location Tracking] 위치 업데이트 브로드캐스트:', {
      lat: location.latitude.toFixed(6),
      lon: location.longitude.toFixed(6),
      listeners: this.listeners.length,
    });

    this.listeners.forEach((listener) => {
      try {
        listener(location);
      } catch (error) {
        console.error('[Location Tracking] 리스너 콜백 에러:', error);
      }
    });
  }

  /**
   * 위치 히스토리에 추가
   * @param location GPS 위치
   */
  private addToHistory(location: GPSPoint) {
    this.locationHistory.push(location);

    // 히스토리 크기 제한
    if (this.locationHistory.length > this.maxHistorySize) {
      this.locationHistory.shift();
    }

    console.log('[Location Tracking] 위치 히스토리 업데이트:', {
      historySize: this.locationHistory.length,
      mostRecent: {
        lat: location.latitude.toFixed(6),
        lon: location.longitude.toFixed(6),
      },
    });
  }

  /**
   * 포그라운드 위치 추적 시작
   * @throws 위치 권한이 없으면 에러
   */
  async startForegroundTracking(): Promise<void> {
    try {
      console.log('[Location Tracking] 포그라운드 추적 시작...');

      // 권한 확인 (expo-location v19 API)
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('위치 권한이 필요합니다.');
      }

      // 기존 구독 취소
      if (this.foregroundSubscription) {
        this.foregroundSubscription.remove();
      }

      // 지속적인 위치 업데이트 구독
      this.foregroundSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation, // 최고 정확도
          timeInterval: 1000, // 1초마다 업데이트
          distanceInterval: 5, // 5m 이상 이동했을 때만 업데이트
        },
        (location) => {
          const gpsPoint: GPSPoint = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            timestamp: location.timestamp,
            accuracy: location.coords.accuracy || undefined,
          };

          this.addToHistory(gpsPoint);
          this.broadcastLocationUpdate(gpsPoint);
        }
      );

      this.isTracking = true;
      console.log('[Location Tracking] ✅ 포그라운드 추적 시작 완료');
    } catch (error) {
      console.error('[Location Tracking] 포그라운드 추적 시작 실패:', error);
      throw error;
    }
  }

  /**
   * 포그라운드 위치 추적 중지
   */
  stopForegroundTracking(): void {
    try {
      console.log('[Location Tracking] 포그라운드 추적 중지...');

      if (this.foregroundSubscription) {
        this.foregroundSubscription.remove();
        this.foregroundSubscription = null;
      }

      this.isTracking = false;
      console.log('[Location Tracking] ✅ 포그라운드 추적 중지 완료');
    } catch (error) {
      console.error('[Location Tracking] 포그라운드 추적 중지 실패:', error);
    }
  }

  /**
   * 백그라운드 위치 추적 시작 (TaskManager 사용)
   * 주의: Expo Go에서는 제한적으로 지원됨
   */
  async startBackgroundTracking(): Promise<void> {
    try {
      console.log('[Location Tracking] 백그라운드 추적 시작...');

      // 권한 확인 (expo-location v19 API)
      // 백그라운드 권한은 별도로 요청 필요
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log(
          '[Location Tracking] 위치 권한 없음 - 포그라운드 추적만 사용 가능'
        );
        return;
      }
      
      // 백그라운드 권한 별도 확인 (Expo Go에서는 제한적)
      try {
        const bgStatus = await Location.getBackgroundPermissionsAsync();
        if (bgStatus.status !== 'granted') {
          console.log(
            '[Location Tracking] 백그라운드 위치 권한 없음 - 포그라운드 추적만 사용 가능'
          );
          return;
        }
      } catch (error) {
        // Expo Go에서는 백그라운드 권한 API가 지원되지 않을 수 있음
        console.log(
          '[Location Tracking] 백그라운드 권한 확인 실패 (Expo Go 제한) - 포그라운드 추적만 사용'
        );
        return;
      }

      // 백그라운드 위치 추적 시작
      await Location.startLocationUpdatesAsync(LOCATION_TRACKING_TASK, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5000, // 5초마다
        distanceInterval: 10, // 10m 이상 이동했을 때
        foregroundService: {
          notificationTitle: '경로 추적 중...',
          notificationBody: '실시간 경로 추적이 진행 중입니다.',
          notificationColor: '#007AFF',
        },
      });

      console.log('[Location Tracking] ✅ 백그라운드 추적 시작 완료');
    } catch (error) {
      console.error('[Location Tracking] 백그라운드 추적 시작 실패:', error);
      // 백그라운드 추적 실패해도 포그라운드는 계속 동작
    }
  }

  /**
   * 백그라운드 위치 추적 중지
   */
  async stopBackgroundTracking(): Promise<void> {
    try {
      console.log('[Location Tracking] 백그라운드 추적 중지...');

      const isTaskDefined = TaskManager.isTaskDefined(LOCATION_TRACKING_TASK);
      if (isTaskDefined) {
        await Location.stopLocationUpdatesAsync(LOCATION_TRACKING_TASK);
      }

      console.log('[Location Tracking] ✅ 백그라운드 추적 중지 완료');
    } catch (error) {
      console.error('[Location Tracking] 백그라운드 추적 중지 실패:', error);
    }
  }

  /**
   * 현재 위치 히스토리 반환
   * @returns 최근 위치들의 배열
   */
  getLocationHistory(): GPSPoint[] {
    return [...this.locationHistory];
  }

  /**
   * 현재 위치 반환
   * @returns 가장 최근의 GPS 위치 (없으면 null)
   */
  getCurrentLocation(): GPSPoint | null {
    if (this.locationHistory.length === 0) {
      return null;
    }
    return this.locationHistory[this.locationHistory.length - 1];
  }

  /**
   * 추적 상태 반환
   * @returns 추적 중인지 여부
   */
  isLocationTracking(): boolean {
    return this.isTracking;
  }

  /**
   * 모든 추적 중지 및 초기화
   */
  async cleanup(): Promise<void> {
    try {
      console.log('[Location Tracking] 정리 중...');

      this.stopForegroundTracking();
      await this.stopBackgroundTracking();

      this.listeners = [];
      this.locationHistory = [];

      console.log('[Location Tracking] ✅ 정리 완료');
    } catch (error) {
      console.error('[Location Tracking] 정리 실패:', error);
    }
  }
}

/**
 * 싱글톤 인스턴스
 */
let trackingManager: LocationTrackingManager | null = null;

/**
 * 위치 추적 매니저 인스턴스 획득
 */
export function getLocationTrackingManager(): LocationTrackingManager {
  if (!trackingManager) {
    trackingManager = new LocationTrackingManager();
  }
  return trackingManager;
}

/**
 * 백그라운드 위치 추적 태스크 정의 (앱 시작 시 한 번만 실행)
 */
export async function defineLocationTrackingTask() {
  try {
    // 이미 정의되어 있으면 스킵
    if (TaskManager.isTaskDefined(LOCATION_TRACKING_TASK)) {
      console.log('[Location Tracking] 백그라운드 태스크 이미 정의됨');
      return;
    }

    TaskManager.defineTask(LOCATION_TRACKING_TASK, async ({ data, error }) => {
      console.log('[Location Tracking] 백그라운드 태스크 실행...');

      if (error) {
        console.error('[Location Tracking] 백그라운드 위치 조회 에러:', error);
        return;
      }

      if (data) {
        const { locations } = data as { locations: Location.LocationObject[] };
        if (locations && locations.length > 0) {
          const location = locations[locations.length - 1];
          const gpsPoint: GPSPoint = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            timestamp: location.timestamp,
            accuracy: location.coords.accuracy || undefined,
          };

          console.log('[Location Tracking] 백그라운드 위치 수신:', {
            lat: gpsPoint.latitude.toFixed(6),
            lon: gpsPoint.longitude.toFixed(6),
          });

          // 싱글톤 인스턴스에 위치 추가
          const manager = getLocationTrackingManager();
          // @ts-ignore - private 메서드 접근 (테스트용)
          manager.addToHistory(gpsPoint);
          // @ts-ignore - private 메서드 접근 (테스트용)
          manager.broadcastLocationUpdate(gpsPoint);
        }
      }
    });

    console.log('[Location Tracking] ✅ 백그라운드 태스크 정의 완료');
  } catch (error) {
    console.error('[Location Tracking] 백그라운드 태스크 정의 실패:', error);
  }
}

export default {
  getLocationTrackingManager,
  defineLocationTrackingTask,
};
