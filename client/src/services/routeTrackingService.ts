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
 * 현재 위치에서 다음 환승지까지의 거리 계산
 * @param currentPoint 현재 GPS 위치
 * @param route 경로 정보
 * @param currentSegmentIndex 현재 세그먼트 인덱스
 * @returns 다음 환승지까지의 거리 (미터)
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

  // 🆕 다음 세그먼트의 시작점(환승지)까지의 거리 계산
  const nextSegmentIndex = currentSegmentIndex + 1;
  
  if (nextSegmentIndex >= subPath.length) {
    // 마지막 세그먼트인 경우, 현재 세그먼트의 종료점까지 거리
    const currentSegment = subPath[currentSegmentIndex];
    if (currentSegment?.endX && currentSegment?.endY) {
      const distance = calculateHaversineDistance(
        currentPoint.latitude,
        currentPoint.longitude,
        currentSegment.endY, // ODSAY는 Y가 위도
        currentSegment.endX  // ODSAY는 X가 경도
      );
      console.log('[Route Tracking] 목적지까지 거리:', {
        distance: distance.toFixed(0),
        endName: currentSegment.endName,
      });
      return distance;
    }
    // 좌표가 없으면 세그먼트 거리 사용
    return currentSegment?.distance || 0;
  }

  // 다음 세그먼트의 시작점(환승지) 좌표 사용
  const nextSegment = subPath[nextSegmentIndex];
  if (nextSegment?.startX && nextSegment?.startY) {
    // ODSAY API: startX=경도, startY=위도
    const distance = calculateHaversineDistance(
      currentPoint.latitude,
      currentPoint.longitude,
      nextSegment.startY, // 위도
      nextSegment.startX  // 경도
    );
    console.log('[Route Tracking] 다음 환승지까지 거리:', {
      distance: distance.toFixed(0),
      stopName: nextSegment.startName,
      segment: nextSegmentIndex,
    });
    return distance;
  }

  // 좌표가 없으면 현재 세그먼트의 종료점까지 거리 추정
  const currentSegment = subPath[currentSegmentIndex];
  if (currentSegment?.endX && currentSegment?.endY) {
    const distance = calculateHaversineDistance(
      currentPoint.latitude,
      currentPoint.longitude,
      currentSegment.endY,
      currentSegment.endX
    );
    return distance;
  }

  // 좌표가 전혀 없으면 세그먼트 거리 사용 (부정확)
  return currentSegment?.distance || 0;
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
/**
 * 현재 위치가 어떤 세그먼트에 있는지 판단
 * @param currentPoint 현재 GPS 위치
 * @param subPath 경로 세그먼트 배열
 * @returns 현재 세그먼트 인덱스 (없으면 -1)
 */
function detectCurrentSegment(
  currentPoint: GPSPoint,
  subPath: Array<any>
): number {
  if (!subPath || subPath.length === 0) {
    return -1;
  }

  // 각 세그먼트의 시작점/종료점과 현재 위치의 거리 계산
  let minDistance = Infinity;
  let closestSegmentIndex = 0;

  for (let i = 0; i < subPath.length; i++) {
    const segment = subPath[i];
    
    // 세그먼트의 시작점과 종료점 좌표 확인
    if (segment.startX && segment.startY && segment.endX && segment.endY) {
      // 시작점까지의 거리
      const distToStart = calculateHaversineDistance(
        currentPoint.latitude,
        currentPoint.longitude,
        segment.startY,
        segment.startX
      );
      
      // 종료점까지의 거리
      const distToEnd = calculateHaversineDistance(
        currentPoint.latitude,
        currentPoint.longitude,
        segment.endY,
        segment.endX
      );
      
      // 세그먼트의 중간점까지의 거리 (간단한 추정)
      const avgLat = (segment.startY + segment.endY) / 2;
      const avgLon = (segment.startX + segment.endX) / 2;
      const distToMid = calculateHaversineDistance(
        currentPoint.latitude,
        currentPoint.longitude,
        avgLat,
        avgLon
      );
      
      // 가장 가까운 거리
      const minDist = Math.min(distToStart, distToEnd, distToMid);
      
      if (minDist < minDistance) {
        minDistance = minDist;
        closestSegmentIndex = i;
      }
    }
  }

  // 300m 이내에 있으면 해당 세그먼트로 판단
  if (minDistance <= 300) {
    return closestSegmentIndex;
  }

  // 경로에서 벗어났으면 가장 가까운 세그먼트 반환
  return closestSegmentIndex;
}

export function detectUserTrackingStatus(
  currentPoint: GPSPoint,
  route: RecommendedRoute,
  previousPoint?: GPSPoint
): TrackingState {
  let status = UserTrackingStatus.IDLE;
  let message = '경로 추적 준비 중...';
  const subPath = route.subPath || [];

  // 🆕 1. 현재 위치가 어떤 세그먼트에 있는지 판단
  let currentSegmentIndex = detectCurrentSegment(currentPoint, subPath);
  if (currentSegmentIndex < 0) {
    currentSegmentIndex = 0; // 기본값
  }

  const currentSegment = subPath[currentSegmentIndex];
  const trafficType = currentSegment?.trafficType || 3; // 기본값: 도보

  // 2. 이동 속도 계산
  let movementSpeed = 0;
  if (previousPoint) {
    movementSpeed = calculateMovementSpeed(previousPoint, currentPoint);
  }

  // 3. 이동 상태 판단 (세그먼트의 trafficType과 속도 기반)
  if (trafficType === 3) {
    // 도보 세그먼트
    if (movementSpeed > 1) {
      status = UserTrackingStatus.BOARDING;
      message = '🚶 도보 이동 중입니다.';
    } else {
      status = UserTrackingStatus.WAITING_AT_STOP;
      message = '⏱️ 대기 중...';
    }
  } else if (trafficType === 2 || trafficType === 1) {
    // 버스/지하철 세그먼트
    if (movementSpeed > 5) {
      status = UserTrackingStatus.ON_TRANSIT;
      message = trafficType === 2 ? '🚌 버스 탑승 중입니다.' : '🚇 지하철 탑승 중입니다.';
    } else if (movementSpeed > 0) {
      status = UserTrackingStatus.WAITING_AT_STOP;
      message = '⏱️ 정류장/역에서 대기 중...';
    } else {
      status = UserTrackingStatus.WAITING_AT_STOP;
      message = '⏱️ 정류장/역에서 대기 중...';
    }
  }

  // 4. 경로 위에 있는지 확인 (간단한 검증)
  const routePoints = extractRoutePoints(route);
  const onRoute = routePoints.length > 0 ? isOnRoute(currentPoint, routePoints, 500) : true;

  if (!onRoute) {
    status = UserTrackingStatus.ROUTE_DEVIATION;
    message = '⚠️ 예상 경로에서 벗어났습니다.';
    console.warn('[Route Tracking] 경로 이탈 감지');
  }

  // 5. 다음 환승지까지의 거리 계산 (정확한 좌표 기반)
  const distanceToNextStop = getDistanceToNextStop(currentPoint, route, currentSegmentIndex);
  
  // 6. 예상 시간 계산 (속도 기반 또는 세그먼트 시간 기반)
  let estimatedTimeToNextStop = 0;
  if (movementSpeed > 0) {
    // 현재 속도 기반 계산
    estimatedTimeToNextStop = estimateTimeToNextStop(distanceToNextStop, movementSpeed);
  } else if (currentSegment?.sectionTime) {
    // 세그먼트의 예상 시간 사용 (초 단위)
    estimatedTimeToNextStop = currentSegment.sectionTime;
  }

  // 7. 목적지 도착 판단
  if (distanceToNextStop < 50 && currentSegmentIndex >= subPath.length - 1) {
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
    segment: currentSegmentIndex,
    trafficType,
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

  // 🆕 ODSAY API의 subPath에서 좌표 추출
  for (const segment of subPath) {
    // 시작점 좌표
    if (segment.startX && segment.startY) {
      points.push({
        lat: segment.startY, // ODSAY: Y가 위도
        lon: segment.startX, // ODSAY: X가 경도
      });
    }
    
    // 종료점 좌표
    if (segment.endX && segment.endY) {
      points.push({
        lat: segment.endY,
        lon: segment.endX,
      });
    }
  }

  console.log('[Route Tracking] 주요 포인트 추출:', {
    segmentCount: subPath.length,
    pointCount: points.length,
  });

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
