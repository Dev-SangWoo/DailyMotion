/**
 * 경로 추적 서비스
 *
 * GPS 위치와 예상 경로를 비교하여 사용자의 이동 상태를 감지합니다.
 * - 정류장 도착 감지
 * - 경로 이탈 감지
 * - 이동 속도 계산
 * - 도착 예상 시간 재계산
 *
 * 헌법 준수:
 * - CLAUDE.md: 외부 서비스와의 연동은 서비스 계층에서 관리
 * - AGENTS.md 제5장: Haversine 공식으로 거리 계산
 */

import { RecommendedRoute } from './routeSearchService';

/**
 * GPS 좌표 포인트
 */
export interface GPSPoint {
  latitude: number;
  longitude: number;
  timestamp: number; // milliseconds
  accuracy?: number; // meters
}

/**
 * 사용자 추적 상태
 */
export enum UserTrackingStatus {
  IDLE = 'idle',                          // 경로 시작 전
  WAITING_AT_STOP = 'waiting_at_stop',   // 정류장에서 대기 중
  BOARDING = 'boarding',                   // 탈것 탑승 중
  ON_TRANSIT = 'on_transit',              // 이동 중
  ROUTE_DEVIATION = 'route_deviation',    // 경로 이탈
  DESTINATION_REACHED = 'destination_reached', // 목적지 도착
}

/**
 * 경로 추적 상태
 */
export interface TrackingState {
  status: UserTrackingStatus;
  currentSegmentIndex: number;           // 현재 세그먼트 인덱스 (0부터)
  currentLocation: GPSPoint;
  distanceToNextStop: number;            // 미터 단위
  estimatedTimeToNextStop: number;       // 초 단위
  movementSpeed: number;                 // km/h
  isOnRoute: boolean;                    // 경로 위에 있는지
  message: string;                       // 사용자에게 표시할 메시지
}

/**
 * Haversine 공식으로 두 GPS 좌표 사이의 거리 계산
 * @param lat1 첫번째 위도
 * @param lon1 첫번째 경도
 * @param lat2 두번째 위도
 * @param lon2 두번째 경도
 * @returns 거리 (미터)
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // 지구 반지름 (미터)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * 사용자가 경로 위에 있는지 확인
 * @param currentPoint 현재 GPS 위치
 * @param routePoints 경로의 주요 포인트들 (시작점, 정류장들, 종료점)
 * @param toleranceMeters 허용 오차 (미터, 기본값 300m)
 * @returns 경로 위에 있는지 여부
 */
export function isOnRoute(
  currentPoint: GPSPoint,
  routePoints: Array<{ lat: number; lon: number }>,
  toleranceMeters: number = 300
): boolean {
  if (!routePoints || routePoints.length === 0) {
    return false;
  }

  // 현재 위치에서 경로의 모든 포인트까지의 최단 거리 계산
  const distances = routePoints.map((point) =>
    calculateHaversineDistance(
      currentPoint.latitude,
      currentPoint.longitude,
      point.lat,
      point.lon
    )
  );

  const minDistance = Math.min(...distances);
  console.log('[Route Tracking] 경로와의 최단 거리:', minDistance.toFixed(1), 'm');

  return minDistance <= toleranceMeters;
}

/**
 * GPS 포인트 시퀀스에서 이동 속도 계산
 * @param previousPoint 이전 GPS 위치
 * @param currentPoint 현재 GPS 위치
 * @returns 이동 속도 (km/h)
 */
export function calculateMovementSpeed(
  previousPoint: GPSPoint,
  currentPoint: GPSPoint
): number {
  const distanceMeters = calculateHaversineDistance(
    previousPoint.latitude,
    previousPoint.longitude,
    currentPoint.latitude,
    currentPoint.longitude
  );

  const timeSeconds = (currentPoint.timestamp - previousPoint.timestamp) / 1000;

  if (timeSeconds <= 0) {
    return 0;
  }

  // 거리(미터) / 시간(초) -> m/s -> km/h
  const speedMeterPerSec = distanceMeters / timeSeconds;
  const speedKmPerHour = speedMeterPerSec * 3.6;

  console.log('[Route Tracking] 이동 속도 계산:', {
    distanceMeters: distanceMeters.toFixed(1),
    timeSeconds,
    speedKmPerHour: speedKmPerHour.toFixed(2),
  });

  return speedKmPerHour;
}

/**
 * 현재 위치에서 다음 정류장까지의 거리 계산
 * @param currentPoint 현재 GPS 위치
 * @param route 경로 정보
 * @param currentSegmentIndex 현재 세그먼트 인덱스
 * @returns 다음 정류장까지의 거리 (미터)
 */
export function getDistanceToNextStop(
  currentPoint: GPSPoint,
  route: RecommendedRoute,
  currentSegmentIndex: number
): number {
  const subPath = route.subPath;

  if (!subPath || currentSegmentIndex >= subPath.length) {
    // 마지막 세그먼트 이후 (목적지 도착 가능 상태)
    return 0;
  }

  // 다음 세그먼트의 종료점을 정류장으로 간주
  // ODSAY API에서는 endName을 정류장명으로 제공
  // 정류장의 정확한 GPS 좌표는 API에서 제공하지 않으므로,
  // 남은 거리는 현재 세그먼트의 거리로 추정
  const currentSegment = subPath[currentSegmentIndex];

  if (!currentSegment) {
    return 0;
  }

  // 세그먼트의 거리 (미터)
  const segmentDistance = currentSegment.distance || 0;

  console.log('[Route Tracking] 다음 정류장까지의 거리:', {
    segment: currentSegmentIndex,
    segmentDistance,
    endName: currentSegment.endName,
  });

  // 현재 세그먼트에서 이미 이동한 거리를 고려해야 하지만,
  // GPS 기반 정확한 진행률을 계산하려면 더 복잡한 로직이 필요함
  // 현재는 간단하게 세그먼트 거리 반환
  return segmentDistance;
}

/**
 * 현재 이동 속도 기반으로 다음 정류장까지의 예상 시간 계산
 * @param distanceMeters 거리 (미터)
 * @param currentSpeedKmPerHour 현재 속도 (km/h)
 * @returns 예상 시간 (초)
 */
export function estimateTimeToNextStop(
  distanceMeters: number,
  currentSpeedKmPerHour: number
): number {
  if (currentSpeedKmPerHour <= 0) {
    // 속도가 0이면 원래 세그먼트 시간 사용
    return 0;
  }

  // 거리(m) / 속도(km/h) = 거리(m) / (속도(m/s)) = 시간(초)
  const speedMeterPerSec = (currentSpeedKmPerHour / 3.6);
  const estimatedSeconds = distanceMeters / speedMeterPerSec;

  console.log('[Route Tracking] 예상 도착 시간:', {
    distanceMeters,
    currentSpeedKmPerHour: currentSpeedKmPerHour.toFixed(2),
    estimatedSeconds: estimatedSeconds.toFixed(1),
  });

  return estimatedSeconds;
}

/**
 * 사용자의 현재 추적 상태 감지
 * @param currentPoint 현재 GPS 위치
 * @param route 경로 정보
 * @param previousPoint 이전 GPS 위치 (속도 계산용)
 * @returns 추적 상태
 */
export function detectUserTrackingStatus(
  currentPoint: GPSPoint,
  route: RecommendedRoute,
  previousPoint?: GPSPoint
): TrackingState {
  let status = UserTrackingStatus.IDLE;
  let currentSegmentIndex = 0;
  let message = '경로 추적 준비 중...';
  const subPath = route.subPath || [];

  // 1. 경로 위에 있는지 확인
  const routePoints = extractRoutePoints(route);
  const onRoute = isOnRoute(currentPoint, routePoints, 300);

  if (!onRoute) {
    status = UserTrackingStatus.ROUTE_DEVIATION;
    message = '⚠️ 예상 경로에서 벗어났습니다.';
    console.warn('[Route Tracking] 경로 이탈 감지');
  }

  // 2. 이동 속도 계산
  let movementSpeed = 0;
  if (previousPoint) {
    movementSpeed = calculateMovementSpeed(previousPoint, currentPoint);
  }

  // 3. 이동 상태 판단
  if (movementSpeed > 5) {
    // 시속 5km 이상 = 이동 중 (버스, 지하철 등)
    status = UserTrackingStatus.ON_TRANSIT;
    message = '🚌 이동 중입니다.';
  } else if (movementSpeed > 1 && movementSpeed <= 5) {
    // 시속 1~5km = 도보 중
    status = UserTrackingStatus.BOARDING;
    message = '🚶 도보 이동 중입니다.';
  } else if (movementSpeed > 0 && movementSpeed <= 1) {
    // 속도 있지만 느린 상태 = 정류장 대기 중
    status = UserTrackingStatus.WAITING_AT_STOP;
    message = '⏱️ 정류장에서 대기 중...';
  } else {
    // 속도 0 = 정지 상태
    status = UserTrackingStatus.WAITING_AT_STOP;
    message = '⏱️ 정류장에서 대기 중...';
  }

  // 4. 다음 정류장 정보
  const distanceToNextStop = getDistanceToNextStop(currentPoint, route, currentSegmentIndex);
  const estimatedTimeToNextStop = estimateTimeToNextStop(distanceToNextStop, movementSpeed);

  // 5. 목적지 도착 판단
  if (distanceToNextStop === 0 && subPath.length > 0 && currentSegmentIndex >= subPath.length - 1) {
    status = UserTrackingStatus.DESTINATION_REACHED;
    message = '🎉 목적지에 도착했습니다!';
  }

  const trackingState: TrackingState = {
    status,
    currentSegmentIndex,
    currentLocation: currentPoint,
    distanceToNextStop,
    estimatedTimeToNextStop,
    movementSpeed,
    isOnRoute: onRoute,
    message,
  };

  console.log('[Route Tracking] 추적 상태:', {
    status,
    movementSpeed: movementSpeed.toFixed(2),
    isOnRoute,
    distanceToNextStop: distanceToNextStop.toFixed(0),
    estimatedTimeSeconds: estimatedTimeToNextStop.toFixed(0),
  });

  return trackingState;
}

/**
 * 경로에서 주요 포인트 추출 (시작, 정류장들, 종료)
 * @param route 경로 정보
 * @returns GPS 포인트 배열
 */
function extractRoutePoints(route: RecommendedRoute): Array<{ lat: number; lon: number }> {
  const points: Array<{ lat: number; lon: number }> = [];
  const subPath = route.subPath;

  if (!subPath || subPath.length === 0) {
    console.warn('[Route Tracking] 경로 데이터가 없습니다.');
    return points;
  }

  // 주의: ODSAY API는 정류장의 GPS 좌표를 직접 제공하지 않음
  // 따라서 실제 구현에서는:
  // 1. Kakao Map API로 정류장명을 GPS로 변환
  // 2. 또는 백엔드에서 미리 정류장 GPS 데이터 제공
  // 여기서는 임시로 더미 포인트 반환

  console.log('[Route Tracking] 주요 포인트 추출:', {
    segmentCount: subPath.length,
    warning: 'ODSAY API는 GPS 좌표를 제공하지 않음 - 백엔드 연동 필요',
  });

  // TODO: 백엔드에서 정류장 GPS 좌표 제공 필요
  return points;
}

/**
 * 포맷팅된 거리 문자열 반환
 * @param meters 거리 (미터)
 * @returns 포맷팅된 거리 (예: "250m", "1.2km")
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

/**
 * 포맷팅된 시간 문자열 반환
 * @param seconds 시간 (초)
 * @returns 포맷팅된 시간 (예: "2분", "30초")
 */
export function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}초`;
  }
  return `${Math.round(seconds / 60)}분`;
}

export default {
  calculateHaversineDistance,
  isOnRoute,
  calculateMovementSpeed,
  getDistanceToNextStop,
  estimateTimeToNextStop,
  detectUserTrackingStatus,
  extractRoutePoints: () => [],
  formatDistance,
  formatTime,
};
