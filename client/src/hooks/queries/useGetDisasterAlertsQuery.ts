/**
 * 재난 문자 API 조회 Hook
 *
 * React Query (TanStack Query)를 사용한 재난 문자 데이터 페칭
 * - 헌법 준수: AGENTS.md [제3장] 데이터 페칭
 * - 캐싱: 10분 (freshTime), 5분 (staleTime)
 */

import { useQuery } from '@tanstack/react-query';
import apiClient from '../../services/api';

export interface DisasterAlert {
  id: number;
  type: string;
  message: string;
  region: string;
  emergencyStep: string;
  date: string; // ISO 8601 형식
  icon: string;
  location: {
    lat: number;
    lng: number;
  } | null;
  distance?: number; // 경로로부터의 거리 (미터)
  hasAccurateLocation?: boolean; // 정확한 좌표인지 여부 (하드코딩된 기본값이 아닌지)
}

export interface DisasterAlertResponse {
  data: DisasterAlert[];
}

export interface DisasterAlertRequest {
  routeCoords: Array<{ lat: number; lng: number }>;
  radius?: number; // 반경 (미터, 기본값: 500)
  days?: number; // 조회할 일수 (기본값: 21일 = 3주)
}

/**
 * 재난 문자 데이터 조회 Hook (경로 기반)
 *
 * @param routeCoords 경로 좌표 배열
 * @param radius 반경 (미터, 기본값: 500)
 * @param days 조회할 일수 (기본값: 21일 = 3주)
 * @returns 재난 문자 데이터 및 로딩/에러 상태
 */
export function useGetDisasterAlertsQuery(
  routeCoords: Array<{ lat: number; lng: number }>,
  radius: number = 500,
  days: number = 21
) {
  return useQuery({
    queryKey: ['disaster-alerts', routeCoords, radius, days],
    queryFn: async (): Promise<DisasterAlert[]> => {
      if (!routeCoords || routeCoords.length === 0) {
        return [];
      }

      const requestBody: DisasterAlertRequest = {
        routeCoords: routeCoords.map(coord => ({
          lat: coord.lat,
          lng: coord.lng,
        })),
        radius,
        days,
      };

      const response = await apiClient.post<DisasterAlertResponse>(
        '/risk-manage/disaster-alerts',
        requestBody
      );
      return response.data.data;
    },
    enabled: routeCoords.length > 0, // 경로 좌표가 있을 때만 쿼리 실행
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분 (이전의 cacheTime)
    retry: 2,
  });
}

/**
 * 전체 재난 문자 데이터 조회 Hook (경로 필터링 없음, 최근 1개월치)
 *
 * @param limit 반환할 최대 개수 (기본값: 1000개)
 * @param days 조회할 일수 (기본값: 30일 = 1개월)
 * @param enabled 쿼리 활성화 여부 (기본값: true)
 * @returns 재난 문자 데이터 및 로딩/에러 상태
 */
export function useGetAllDisasterAlertsQuery(
  limit: number = 1000, 
  days: number = 30,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['disaster-alerts-all', limit, days],
    queryFn: async (): Promise<DisasterAlert[]> => {
      console.log(`[useGetAllDisasterAlertsQuery] API 호출: limit=${limit}, days=${days}`);
      const response = await apiClient.get<DisasterAlertResponse>(
        `/risk-manage/disaster-alerts/all?limit=${limit}&days=${days}`
      );
      
      // API 응답 데이터 형식 확인
      console.log(`[useGetAllDisasterAlertsQuery] API 응답 상태:`, {
        status: response.status,
        dataLength: response.data?.data?.length || 0,
      });
      
      if (response.data?.data && response.data.data.length > 0) {
        const firstItem = response.data.data[0];
        console.log(`[useGetAllDisasterAlertsQuery] 첫 번째 재난 문자 데이터 형식:`, {
          id: firstItem.id,
          type: firstItem.type,
          region: firstItem.region,
          date: firstItem.date,
          location: firstItem.location,
          hasAccurateLocation: firstItem.hasAccurateLocation,
          locationType: typeof firstItem.location,
          locationKeys: firstItem.location ? Object.keys(firstItem.location) : null,
        });
      }
      
      // location 형식 변환 (백엔드: Dict[str, float] -> 프론트엔드: { lat: number; lng: number } | null)
      const transformedData = response.data.data.map((alert: any) => {
        let location = null;
        if (alert.location) {
          // 백엔드에서 {"lat": ..., "lng": ...} 형식으로 보내는지 확인
          if (typeof alert.location === 'object' && 'lat' in alert.location && 'lng' in alert.location) {
            location = {
              lat: alert.location.lat,
              lng: alert.location.lng,
            };
          } else {
            console.warn(`[useGetAllDisasterAlertsQuery] 예상치 못한 location 형식:`, alert.location);
          }
        }
        
        return {
          ...alert,
          location,
        };
      });
      
      return transformedData;
    },
    enabled, // 경로 지역이 결정되면 쿼리 실행
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분
    retry: 2,
  });
}

