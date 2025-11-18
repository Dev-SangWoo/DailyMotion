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
 */
export interface OdsayPath {
  pathId: string;
  totalTime: number; // 초 단위
  totalDistance: number;
  transferCount: number;
  segments: RouteSegment[];
}

/**
 * ODSAY 경로 데이터 응답
 */
export interface OdsayRoutesData {
  paths: OdsayPath[];
}

/**
 * GoalTimeScreen에서 사용하는 추천 경로 타입
 */
export interface RecommendedRoute {
  id: string;
  mode: string;
  duration: string;
  transfers: number;
  icon: string;
}

/**
 * 경로 검색 서비스 - 백엔드 API 호출
 *
 * @param userId - 사용자 ID
 * @returns 추천 경로 배열
 * @throws Error 경로 검색 실패 시
 */
export async function searchRoutes(userId: string = 'user_001'): Promise<RecommendedRoute[]> {
  try {
    // 백엔드 API 호출: GET /api/v1/briefings/routes/search?userId={userId}
    // 참고: OpenAPI 스펙 (docs/openapi/v1.yaml)에서 정의한 엔드포인트
    const response = await apiClient.get('/briefings/routes/search', {
      params: { userId },
    });

    // 응답 구조: { data: { paths: [...] }, error?: { ... } }
    if (response.data?.error) {
      throw new Error(response.data.error.message || '경로 검색 실패');
    }

    // ODSAY 경로 데이터 추출
    const paths: OdsayPath[] | undefined = response.data?.data?.paths;

    if (!paths || paths.length === 0) {
      // 경로 데이터가 없는 경우 빈 배열 반환
      console.warn('[Route Search] No routes data received from backend');
      return [];
    }

    // ODSAY 응답을 UI용 형식으로 변환
    const recommendedRoutes = transformOdsayPaths(paths);

    console.log(`[Route Search] Found ${recommendedRoutes.length} routes`);
    return recommendedRoutes;
  } catch (error) {
    console.error('[Route Search] Failed to search routes:', error);
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
    // 세그먼트에서 교통수단 추출
    const transportModes = extractTransportModes(path.segments);
    const modeLabel = generateModeLabel(transportModes);
    const icon = selectIconForRoute(transportModes);

    // 소요 시간을 분 단위로 변환
    const durationMinutes = Math.round(path.totalTime / 60);
    const durationLabel = formatDuration(durationMinutes);

    return {
      id: path.pathId || `route_${index}`,
      mode: modeLabel,
      duration: durationLabel,
      transfers: path.transferCount,
      icon,
    };
  });
}

/**
 * 세그먼트에서 교통수단 종류 추출
 *
 * @param segments - 경로 세그먼트 배열
 * @returns 교통수단 타입 배열
 */
function extractTransportModes(segments: RouteSegment[]): number[] {
  const modes = new Set<number>();
  for (const segment of segments) {
    if (segment.trafficType && segment.trafficType !== 0) {
      modes.add(segment.trafficType);
    }
  }
  return Array.from(modes).sort();
}

/**
 * 교통수단 타입을 한글 레이블로 변환
 *
 * @param modes - 교통수단 타입 배열
 * @returns 교통수단 레이블 (예: "버스 + 지하철")
 */
function generateModeLabel(modes: number[]): string {
  const modeNames: { [key: number]: string } = {
    1: '지하철',
    2: '버스',
    3: '택시',
    4: '자동차',
    5: '기차',
  };

  const labels = modes
    .filter((mode) => modeNames[mode])
    .map((mode) => modeNames[mode]);

  if (labels.length === 0) {
    return '기타';
  }

  if (labels.length === 1) {
    return labels[0];
  }

  return labels.join(' + ');
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

export default searchRoutes;
