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

    return {
      id: pathId,
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
 * @param segments - 경로 세그먼트 배열 (subPath 또는 segments)
 * @returns 교통수단 타입 배열
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
    if (trafficType && typeof trafficType === 'number' && trafficType !== 0) {
      modes.add(trafficType);
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
