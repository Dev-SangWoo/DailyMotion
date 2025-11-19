/**
 * 경로 검색 서비스 (ODSAY API 연동)
 *
 * 온보딩 GoalTimeScreen에서 실제 경로 데이터를 조회합니다.
 * 백엔드의 /api/v1/briefings/routes/search 엔드포인트를 호출하여 ODSAY 경로 데이터를 반환합니다.
 *
 * 헌법 준수:
 * - CLAUDE.md: React Query 활용 권장 (현재는 직접 호출)
 * - AGENTS.md 제2장: OpenAPI 스펙 기반 (docs/openapi/v1.yaml 참조)
 */

import apiClient from './api';

/**
 * ODSAY 경로 세그먼트 타입
 */
export interface RouteSegment {
  trafficType: number; // 1=지하철, 2=버스, 3=택시 등
  startName: string;
  endName: string;
  duration: number; // 초 단위
  busNo?: string;
  subwayName?: string;
  subwayCode?: number;
}

/**
 * ODSAY 경로 타입
 * 
 * 참고: 백엔드에서 반환하는 실제 ODSAY 응답 구조
 * - subPath: 경로 세그먼트 배열 (각 세그먼트는 trafficType을 가짐)
 * - id: 경로 ID (pathId 대신 id로 반환됨)
 */
export interface OdsayPath {
  id?: string; // 경로 ID (백엔드 응답에서는 id로 옴)
  pathId?: string; // 경로 ID (호환성을 위해 유지)
  totalTime: number; // 초 단위
  totalTimeMinutes?: number; // 분 단위 (백엔드에서 제공)
  totalDistance: number; // 미터 단위
  totalDistanceKm?: string; // 킬로미터 단위 (백엔드에서 제공)
  transferCount: number; // 환승 횟수
  fare?: number | null; // 🆕 요금 (원)
  segments?: RouteSegment[]; // 호환성을 위해 유지
  subPath?: Array<{ // 실제 백엔드 응답 구조
    trafficType: number; // 1=지하철, 2=버스, 3=도보 등
    distance?: number;
    sectionTime?: number;
    stationCount?: number;
    lane?: Array<{
      busNo?: string;
      subwayName?: string;
      subwayCode?: number;
    }>;
    [key: string]: any; // 기타 필드 허용
  }>;
}

/**
 * ODSAY 경로 데이터 응답
 */
export interface OdsayRoutesData {
  paths: OdsayPath[];
}

/**
 * 경로 세그먼트 (버스, 지하철, 도보 등)
 */
export interface RouteSegmentInfo {
  type: string;                    // 'SUBWAY' | 'BUS' | 'WALK' 등
  line?: string;                   // 노선명 또는 버스번호 (예: "2호선", "80번")
  startStation?: string;           // 시작역/정류장명 (예: "덕정고.한국병원")
  endStation?: string;             // 종료역/정류장명 (예: "양주역")
  duration?: string;               // 소요시간 (예: "64분", "6초")
  distance?: string;               // 거리 (예: "18.3km", "388m")
  icon?: string;                   // 이모지 아이콘 (🚇, 🚌, 🚶 등)
  stationCount?: string;           // 경유 정류장 수 (예: "46개 정류장")
}

/**
 * GoalTimeScreen에서 사용하는 추천 경로 타입 (상세 정보)
 */
export interface RecommendedRoute {
  id: string;
  mode: string;                    // 교통수단 조합 (예: "지하철 · 도보")
  duration: string;                // 소요시간 (분)
  transfers: number;               // 환승 횟수
  icon: string;                    // 주요 교통수단 아이콘
  distance?: string;               // 총 거리 (km)
  fare?: number | null;            // 요금 (원)
  segments?: RouteSegmentInfo[];    // 🆕 세그먼트 상세 정보

  // 🆕 ODSAY 원본 데이터 (DailyBriefingScreen에서 세그먼트 렌더링용)
  pathId?: string;
  totalTime?: number;              // 초 단위
  totalDistance?: number;          // 미터 단위
  transferCount?: number;
  subPath?: Array<{                // ODSAY 원본 세그먼트
    trafficType: number;
    distance?: number;
    sectionTime?: number;
    lane?: Array<{
      busNo?: string;
      subwayName?: string;
      subwayCode?: number;
    }>;
    startName?: string;
    endName?: string;
    startTime?: string;
    endTime?: string;
    [key: string]: any;
  }>;
}

/**
 * 경로 검색 서비스 - 백엔드 API 호출 (사용자 설정 기반)
 *
 * @param userId - 사용자 ID
 * @returns 추천 경로 배열
 * @throws Error 경로 검색 실패 시
 */
export async function searchRoutes(userId: string = 'user_001'): Promise<RecommendedRoute[]> {
  try {
    console.log('[Route Search] ===== API 호출 시작 =====');
    console.log(`[Route Search] 사용자 ID: ${userId}`);
    console.log(`[Route Search] 엔드포인트: GET /briefings/routes/search`);
    console.log(`[Route Search] 요청 파라미터:`, { userId });

    // 백엔드 API 호출: GET /api/v1/briefings/routes/search?userId={userId}
    // 참고: OpenAPI 스펙 (docs/openapi/v1.yaml)에서 정의한 엔드포인트
    const response = await apiClient.get('/briefings/routes/search', {
      params: { userId },
    });

    console.log('[Route Search] API 응답 수신 완료');
    console.log('[Route Search] 응답 상태 코드:', response.status);
    console.log('[Route Search] 응답 헤더:', JSON.stringify(response.headers, null, 2));
    console.log('[Route Search] 응답 데이터 (전체):', JSON.stringify(response.data, null, 2));

    // 응답 구조: { data: { paths: [...] }, error?: { ... } }
    if (response.data?.error) {
      console.error('[Route Search] 응답에 에러 포함:', response.data.error);
      throw new Error(response.data.error.message || '경로 검색 실패');
    }

    // ODSAY 경로 데이터 추출
    const paths: OdsayPath[] | undefined = response.data?.data?.paths;

    console.log('[Route Search] 경로 데이터 추출 시도');
    console.log(`[Route Search] paths 존재 여부: ${paths !== undefined}`);
    console.log(`[Route Search] paths 타입: ${typeof paths}`);
    console.log(`[Route Search] paths 길이: ${paths?.length ?? 'undefined'}`);

    if (!paths || paths.length === 0) {
      // 경로 데이터가 없는 경우 빈 배열 반환
      console.warn('[Route Search] ⚠️ 경로 데이터 없음 - 빈 배열 반환');
      console.warn('[Route Search] response.data 구조:', {
        hasData: !!response.data,
        hasDataData: !!response.data?.data,
        hasPaths: !!response.data?.data?.paths,
        pathsType: typeof response.data?.data?.paths,
        pathsIsArray: Array.isArray(response.data?.data?.paths),
      });
      return [];
    }

    console.log(`[Route Search] ${paths.length}개 경로 데이터 발견`);
    console.log('[Route Search] 경로 데이터 상세:', JSON.stringify(paths, null, 2));

    // ODSAY 응답을 UI용 형식으로 변환
    const recommendedRoutes = transformOdsayPaths(paths);

    console.log(`[Route Search] ✅ 변환 완료: ${recommendedRoutes.length}개 추천 경로`);
    console.log('[Route Search] 추천 경로 상세:', JSON.stringify(recommendedRoutes, null, 2));
    console.log('[Route Search] ===== API 호출 종료 =====');
    
    return recommendedRoutes;
  } catch (error) {
    console.error('[Route Search] ===== API 호출 실패 =====');
    console.error('[Route Search] 사용자 ID:', userId);
    console.error('[Route Search] 에러 타입:', error?.constructor?.name);
    console.error('[Route Search] 에러 객체:', error);
    
    if (error instanceof Error) {
      console.error('[Route Search] 에러 메시지:', error.message);
      console.error('[Route Search] 에러 스택:', error.stack);
    }
    
    // Axios 에러인 경우 상세 정보 출력
    if ((error as any)?.isAxiosError) {
      const axiosError = error as any;
      console.error('[Route Search] Axios 에러 상세:');
      console.error('[Route Search] - 요청 URL:', axiosError.config?.url);
      console.error('[Route Search] - 요청 메서드:', axiosError.config?.method);
      console.error('[Route Search] - 요청 파라미터:', axiosError.config?.params);
      console.error('[Route Search] - 응답 상태:', axiosError.response?.status);
      console.error('[Route Search] - 응답 데이터:', axiosError.response?.data);
      console.error('[Route Search] - 응답 헤더:', axiosError.response?.headers);
    }
    
    console.error('[Route Search] ===== API 호출 실패 종료 =====');
    throw error;
  }
}

/**
 * ODSAY 경로 데이터를 UI용 형식으로 변환
 *
 * @param paths - ODSAY 경로 배열
 * @returns 추천 경로 배열
 */
function transformOdsayPaths(paths: OdsayPath[]): RecommendedRoute[] {
  return paths.map((path, index) => {
    // subPath 또는 segments에서 교통수단 추출 (백엔드 응답은 subPath 사용)
    const segments = path.subPath || path.segments || [];
    const transportModes = extractTransportModes(segments);
    const modeLabel = generateModeLabel(transportModes);
    const icon = selectIconForRoute(transportModes);

    // 소요 시간을 분 단위로 변환 (totalTimeMinutes가 있으면 사용, 없으면 totalTime/60)
    const durationMinutes = path.totalTimeMinutes || Math.round(path.totalTime / 60);
    const durationLabel = formatDuration(durationMinutes);

    // 경로 ID 추출 (id 또는 pathId 사용)
    const pathId = path.id || path.pathId || `route_${index}`;

    // 🆕 거리 정보 (km 단위)
    const distance = path.totalDistanceKm ||
      (path.totalDistance ? `${(path.totalDistance / 1000).toFixed(1)}km` : undefined);

    // 🆕 세그먼트 상세 정보 파싱
    const segmentInfos = parseSegments(segments);

    return {
      id: pathId,
      mode: modeLabel,
      duration: durationLabel,
      transfers: path.transferCount,
      icon,
      distance,                // 🆕 총 거리
      fare: path.fare || null, // 🆕 요금
      segments: segmentInfos,  // 🆕 세그먼트 정보

      // 🆕 ODSAY 원본 데이터 (DailyBriefingScreen의 상세 경로 렌더링용)
      pathId,
      totalTime: path.totalTime,
      totalDistance: path.totalDistance,
      transferCount: path.transferCount,
      subPath: path.subPath,
    };
  });
}

/**
 * 경로 세그먼트를 상세 정보로 파싱 (네이버 지도 스타일)
 *
 * @param segments - 경로 세그먼트 배열 (ODSAY subPath 구조)
 * @returns 세그먼트 상세 정보 배열
 */
function parseSegments(segments: any[]): RouteSegmentInfo[] {
  if (!segments || !Array.isArray(segments) || segments.length === 0) {
    return [];
  }

  const trafficTypeMap: { [key: number]: string } = {
    1: 'SUBWAY',
    2: 'BUS',
    3: 'WALK',
    4: 'TAXI',
    5: 'TRAIN',
  };

  const trafficIconMap: { [key: number]: string } = {
    1: '🚇',
    2: '🚌',
    3: '🚶',
    4: '🚖',
    5: '🚆',
  };

  return segments
    .filter((segment) => segment?.trafficType) // trafficType이 있는 세그먼트만
    .map((segment) => {
      const trafficType = segment.trafficType;
      const typeStr = trafficTypeMap[trafficType] || 'OTHER';
      const icon = trafficIconMap[trafficType] || '🚗';

      // 거리 (m -> km, 도보는 m 단위로 표시)
      let distance: string | undefined;
      if (segment.distance) {
        if (trafficType === 3) {
          // 도보는 m 단위
          distance = `${segment.distance}m`;
        } else {
          // 버스/지하철은 km 단위
          distance = `${(segment.distance / 1000).toFixed(1)}km`;
        }
      }

      // 시간 (초 -> 분, 1분 미만은 초로 표시)
      let duration: string | undefined;
      if (segment.sectionTime) {
        const minutes = Math.floor(segment.sectionTime / 60);
        const seconds = segment.sectionTime % 60;
        if (minutes > 0) {
          duration = seconds > 0 ? `${minutes}분 ${seconds}초` : `${minutes}분`;
        } else {
          duration = `${seconds}초`;
        }
      }

      // 노선명 또는 버스번호 (버스/지하철만)
      let line: string | undefined;
      if (segment.lane && Array.isArray(segment.lane) && segment.lane.length > 0) {
        const laneInfo = segment.lane[0];
        if (laneInfo.subwayName) {
          line = laneInfo.subwayName;
        } else if (laneInfo.busNo) {
          line = `${laneInfo.busNo}번`;
        }
      }

      // 시작/종료 정류장명 (ODSAY 응답은 startName, endName 사용)
      const startStation = segment.startName || undefined;
      const endStation = segment.endName || undefined;

      // 경유 정류장 수 (버스/지하철만)
      const stationCount = segment.stationCount || 
        (segment.passStopList?.stations?.length) || 
        undefined;

      return {
        type: typeStr,
        line,
        startStation,
        endStation,
        duration,
        distance,
        icon,
        // 추가 정보 (선택적)
        stationCount: stationCount ? `${stationCount}개 정류장` : undefined,
      };
    });
}

/**
 * 세그먼트에서 교통수단 종류 추출
 *
 * @param segments - 경로 세그먼트 배열 (subPath 또는 segments)
 * @returns 교통수단 타입 배열 (도보 제외)
 * 
 * 참고: ODSAY trafficType
 * - 1: 지하철
 * - 2: 버스
 * - 3: 도보 (레이블에 포함하지 않음)
 * - 4: 택시
 * - 5: 기차
 */
function extractTransportModes(segments: any[]): number[] {
  if (!segments || !Array.isArray(segments)) {
    console.warn('[Route Search] extractTransportModes: segments가 배열이 아님', segments);
    return [];
  }

  const modes = new Set<number>();
  for (const segment of segments) {
    // subPath 구조: { trafficType: number, ... }
    // segments 구조: { trafficType: number, ... }
    const trafficType = segment?.trafficType;
    // 도보(trafficType: 3)는 경로 레이블에 포함하지 않음
    if (trafficType && typeof trafficType === 'number' && trafficType !== 0 && trafficType !== 3) {
      modes.add(trafficType);
    }
  }
  return Array.from(modes).sort();
}

/**
 * 교통수단 타입을 한글 레이블로 변환
 *
 * @param modes - 교통수단 타입 배열 (도보 제외)
 * @returns 교통수단 레이블 (예: "버스", "지하철", "버스 · 지하철")
 * 
 * 참고: ODSAY trafficType 매핑
 * - 1: 지하철
 * - 2: 버스
 * - 3: 도보 (레이블에 포함하지 않음)
 * - 4: 택시
 * - 5: 기차
 */
function generateModeLabel(modes: number[]): string {
  const modeNames: { [key: number]: string } = {
    1: '지하철',
    2: '버스',
    4: '택시',
    5: '기차',
  };

  const labels = modes
    .filter((mode) => modeNames[mode])
    .map((mode) => modeNames[mode]);

  if (labels.length === 0) {
    return '대중교통';
  }

  if (labels.length === 1) {
    return labels[0];
  }

  // 여러 교통수단은 " · "로 구분 (예: "버스 · 지하철")
  return labels.join(' · ');
}

/**
 * 교통수단에 맞는 이모지 아이콘 선택
 *
 * @param modes - 교통수단 타입 배열
 * @returns 이모지 아이콘
 */
function selectIconForRoute(modes: number[]): string {
  // 버스 우선 표시
  if (modes.includes(2)) {
    return '🚌';
  }

  // 지하철 우선 표시
  if (modes.includes(1)) {
    return '🚇';
  }

  // 택시
  if (modes.includes(3)) {
    return '🚕';
  }

  // 기타
  return '🚗';
}

/**
 * 분 단위 소요 시간을 문자열로 포맷
 *
 * @param minutes - 소요 시간 (분)
 * @returns 포맷된 문자열 (예: "45분", "1시간 15분")
 */
function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}분`;
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (mins === 0) {
    return `${hours}시간`;
  }

  return `${hours}시간 ${mins}분`;
}

/**
 * 온보딩용 경로 검색 서비스 - 출발지, 목적지, 출발시간 직접 입력
 *
 * @param originAddress - 출발지 주소
 * @param destinationAddress - 목적지 주소
 * @param departureTime - 출발 시간 (ISO 8601 또는 HH:MM 형식)
 * @param originLatitude - 출발지 위도 (선택)
 * @param originLongitude - 출발지 경도 (선택)
 * @param destinationLatitude - 목적지 위도 (선택)
 * @param destinationLongitude - 목적지 경도 (선택)
 * @returns 추천 경로 배열
 * @throws Error 경로 검색 실패 시
 */
export async function searchRoutesForOnboarding(
  originAddress: string,
  destinationAddress: string,
  departureTime: string,
  originLatitude?: number,
  originLongitude?: number,
  destinationLatitude?: number,
  destinationLongitude?: number,
): Promise<RecommendedRoute[]> {
  try {
    console.log('[Route Search Onboarding] ===== API 호출 시작 =====');
    console.log(`[Route Search Onboarding] 출발지: ${originAddress}`);
    console.log(`[Route Search Onboarding] 목적지: ${destinationAddress}`);
    console.log(`[Route Search Onboarding] 출발 시간: ${departureTime}`);
    if (originLatitude && originLongitude) {
      console.log(`[Route Search Onboarding] 출발지 좌표: (${originLongitude}, ${originLatitude})`);
    }
    if (destinationLatitude && destinationLongitude) {
      console.log(`[Route Search Onboarding] 목적지 좌표: (${destinationLongitude}, ${destinationLatitude})`);
    }

    // 요청 파라미터 구성
    const params: Record<string, string | number> = {
      originAddress,
      destinationAddress,
      departureTime,
    };

    // 좌표가 제공된 경우 추가
    if (originLatitude !== undefined && originLongitude !== undefined) {
      params.originLatitude = originLatitude;
      params.originLongitude = originLongitude;
    }
    if (destinationLatitude !== undefined && destinationLongitude !== undefined) {
      params.destinationLatitude = destinationLatitude;
      params.destinationLongitude = destinationLongitude;
    }

    console.log(`[Route Search Onboarding] 엔드포인트: GET /briefings/routes/search/onboarding`);
    console.log(`[Route Search Onboarding] 요청 파라미터:`, params);

    // 백엔드 API 호출: GET /api/v1/briefings/routes/search/onboarding
    const response = await apiClient.get('/briefings/routes/search/onboarding', {
      params,
    });

    console.log('[Route Search Onboarding] API 응답 수신 완료');
    console.log('[Route Search Onboarding] 응답 상태 코드:', response.status);
    console.log('[Route Search Onboarding] 응답 데이터 (전체):', JSON.stringify(response.data, null, 2));

    // 응답 구조: { data: { paths: [...] }, error?: { ... } }
    if (response.data?.error) {
      console.error('[Route Search Onboarding] 응답에 에러 포함:', response.data.error);
      throw new Error(response.data.error.message || '경로 검색 실패');
    }

    // ODSAY 경로 데이터 추출
    const paths: OdsayPath[] | undefined = response.data?.data?.paths;

    console.log('[Route Search Onboarding] 경로 데이터 추출 시도');
    console.log(`[Route Search Onboarding] paths 존재 여부: ${paths !== undefined}`);
    console.log(`[Route Search Onboarding] paths 타입: ${typeof paths}`);
    console.log(`[Route Search Onboarding] paths 길이: ${paths?.length ?? 'undefined'}`);

    if (!paths || paths.length === 0) {
      console.warn('[Route Search Onboarding] ⚠️ 경로 데이터 없음 - 빈 배열 반환');
      return [];
    }

    console.log(`[Route Search Onboarding] ${paths.length}개 경로 데이터 발견`);
    console.log('[Route Search Onboarding] 경로 데이터 상세:', JSON.stringify(paths, null, 2));

    // ODSAY 응답을 UI용 형식으로 변환
    const recommendedRoutes = transformOdsayPaths(paths);

    console.log(`[Route Search Onboarding] ✅ 변환 완료: ${recommendedRoutes.length}개 추천 경로`);
    console.log('[Route Search Onboarding] 추천 경로 상세:', JSON.stringify(recommendedRoutes, null, 2));
    console.log('[Route Search Onboarding] ===== API 호출 종료 =====');
    
    return recommendedRoutes;
  } catch (error) {
    console.error('[Route Search Onboarding] ===== API 호출 실패 =====');
    console.error('[Route Search Onboarding] 출발지:', originAddress);
    console.error('[Route Search Onboarding] 목적지:', destinationAddress);
    console.error('[Route Search Onboarding] 출발 시간:', departureTime);
    console.error('[Route Search Onboarding] 에러 타입:', error?.constructor?.name);
    console.error('[Route Search Onboarding] 에러 객체:', error);
    
    if (error instanceof Error) {
      console.error('[Route Search Onboarding] 에러 메시지:', error.message);
      console.error('[Route Search Onboarding] 에러 스택:', error.stack);
    }
    
    // Axios 에러인 경우 상세 정보 출력
    if ((error as any)?.isAxiosError) {
      const axiosError = error as any;
      console.error('[Route Search Onboarding] Axios 에러 상세:');
      console.error('[Route Search Onboarding] - 요청 URL:', axiosError.config?.url);
      console.error('[Route Search Onboarding] - 요청 메서드:', axiosError.config?.method);
      console.error('[Route Search Onboarding] - 요청 파라미터:', axiosError.config?.params);
      console.error('[Route Search Onboarding] - 응답 상태:', axiosError.response?.status);
      console.error('[Route Search Onboarding] - 응답 데이터:', axiosError.response?.data);
    }
    
    console.error('[Route Search Onboarding] ===== API 호출 실패 종료 =====');
    throw error;
  }
}

export default searchRoutes;
