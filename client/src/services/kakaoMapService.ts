/**
 * 카카오 MAP API 서비스
 *
 * 카카오 Local API를 사용하여 주소 검색, 좌표 변환 등을 제공합니다.
 *
 * 헌법 준수:
 * - AGENTS.md [제3장]: React Query를 통한 서버 상태 관리
 * - 보안: API 키는 환경 변수 또는 백엔드 프록시를 통해 관리
 *
 * ⚠️ 보안 주의사항:
 * - REST API 키는 클라이언트에 노출되면 안 됩니다.
 * - 프로덕션에서는 백엔드 프록시 API를 사용하는 것을 권장합니다.
 * - 현재는 개발 환경을 위해 클라이언트에서 직접 호출하지만,
 *   실제 배포 시에는 백엔드로 이동해야 합니다.
 */

import axios, { AxiosInstance } from 'axios';

// TODO: 환경 변수에서 가져오도록 변경
// 개발 환경에서는 .env 파일에 KAKAO_REST_API_KEY 추가
const KAKAO_REST_API_KEY = process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY || '';

// 카카오 Local API base URL
const KAKAO_API_BASE_URL = 'https://dapi.kakao.com/v2/local';

/**
 * 카카오 API 클라이언트 인스턴스
 */
const kakaoApiClient: AxiosInstance = axios.create({
  baseURL: KAKAO_API_BASE_URL,
  timeout: 10000,
  headers: {
    'Authorization': `KakaoAK ${KAKAO_REST_API_KEY}`,
    'Content-Type': 'application/json',
  },
});

/**
 * 주소 검색 결과 타입
 */
export interface AddressSearchResult {
  address_name: string; // 전체 지번 주소 또는 도로명 주소
  y: string; // Y 좌표 (위도)
  x: string; // X 좌표 (경도)
  address_type: 'REGION' | 'ROAD' | 'REGION_ADDR' | 'ROAD_ADDR';
  address: {
    address_name: string;
    region_1depth_name: string; // 시/도
    region_2depth_name: string; // 시/군/구
    region_3depth_name: string; // 동/읍/면
    region_3depth_h_name: string; // 행정동명
    h_code: string; // 행정 코드
    b_code: string; // 법정 코드
    mountain_yn: string; // 산 여부
    main_address_no: string; // 지번 주번지
    sub_address_no: string; // 지번 부번지
    x: string; // X 좌표
    y: string; // Y 좌표
  };
  road_address?: {
    address_name: string; // 전체 도로명 주소
    region_1depth_name: string; // 시/도
    region_2depth_name: string; // 시/군/구
    region_3depth_name: string; // 읍/면/동
    road_name: string; // 도로명
    underground_yn: string; // 지하 여부
    main_building_no: string; // 건물 본번
    sub_building_no: string; // 건물 부번
    building_name: string; // 건물명
    zone_no: string; // 우편번호
    x: string; // X 좌표
    y: string; // Y 좌표
  };
}

/**
 * 장소 검색 결과 타입
 */
export interface PlaceSearchResult {
  id: string; // 장소 ID
  place_name: string; // 장소명
  category_name: string; // 카테고리명
  category_group_code: string; // 카테고리 그룹 코드
  category_group_name: string; // 카테고리 그룹명
  phone: string; // 전화번호
  address_name: string; // 전체 지번 주소
  road_address_name: string; // 전체 도로명 주소
  x: string; // X 좌표 (경도)
  y: string; // Y 좌표 (위도)
  place_url: string; // 장소 상세페이지 URL
  distance: string; // 중심좌표까지의 거리 (단위: meter)
}

/**
 * 주소 검색 API 응답 타입
 */
interface AddressSearchResponse {
  meta: {
    total_count: number; // 검색된 문서 수
    pageable_count: number; // total_count 중 노출 가능 문서 수
    is_end: boolean; // 현재 페이지가 마지막 페이지인지 여부
  };
  documents: AddressSearchResult[];
}

/**
 * 장소 검색 API 응답 타입
 */
interface PlaceSearchResponse {
  meta: {
    total_count: number;
    pageable_count: number;
    is_end: boolean;
  };
  documents: PlaceSearchResult[];
}

/**
 * 좌표 → 주소 변환 결과 타입
 */
export interface CoordToAddressResult {
  address: AddressSearchResult;
  road_address?: AddressSearchResult['road_address'];
}

/**
 * 주소 검색 옵션
 */
export interface AddressSearchOptions {
  query: string; // 검색할 주소 키워드
  page?: number; // 결과 페이지 번호 (1-45)
  size?: number; // 한 페이지에 보여질 문서 수 (1-30)
}

/**
 * 장소 검색 옵션
 */
export interface PlaceSearchOptions {
  query: string; // 검색할 장소 키워드
  x?: string; // 중심 좌표 X (경도)
  y?: string; // 중심 좌표 Y (위도)
  radius?: number; // 중심 좌표부터의 반경 거리 (미터 단위, 0-20000)
  page?: number; // 결과 페이지 번호 (1-45)
  size?: number; // 한 페이지에 보여질 문서 수 (1-15)
  category_group_code?: string; // 카테고리 그룹 코드 필터링
}

/**
 * 주소 검색 (키워드로 주소 검색)
 *
 * @param options 검색 옵션
 * @returns 주소 검색 결과 배열
 *
 * @example
 * ```typescript
 * const results = await searchAddress({ query: '강남역' });
 * console.log(results[0].address_name); // "서울 강남구 역삼동"
 * ```
 */
export const searchAddress = async (
  options: AddressSearchOptions
): Promise<AddressSearchResult[]> => {
  try {
    const { query, page = 1, size = 10 } = options;

    const response = await kakaoApiClient.get<AddressSearchResponse>(
      '/search/address.json',
      {
        params: {
          query,
          page,
          size,
        },
      }
    );

    return response.data.documents;
  } catch (error: any) {
    console.error('[Kakao Map API] 주소 검색 실패:', error);
    throw new Error(
      error.response?.data?.message || '주소 검색에 실패했습니다.'
    );
  }
};

/**
 * 장소 검색 (키워드로 장소 검색)
 *
 * @param options 검색 옵션
 * @returns 장소 검색 결과 배열
 *
 * @example
 * ```typescript
 * const results = await searchPlace({ query: '스타벅스 강남점' });
 * console.log(results[0].place_name); // "스타벅스 강남점"
 * ```
 */
export const searchPlace = async (
  options: PlaceSearchOptions
): Promise<PlaceSearchResult[]> => {
  try {
    const {
      query,
      x,
      y,
      radius,
      page = 1,
      size = 15,
      category_group_code,
    } = options;

    const params: any = {
      query,
      page,
      size,
    };

    // 중심 좌표가 있으면 추가
    if (x && y) {
      params.x = x;
      params.y = y;
    }

    // 반경이 있으면 추가
    if (radius) {
      params.radius = radius;
    }

    // 카테고리 그룹 코드가 있으면 추가
    if (category_group_code) {
      params.category_group_code = category_group_code;
    }

    const response = await kakaoApiClient.get<PlaceSearchResponse>(
      '/search/keyword.json',
      {
        params,
      }
    );

    return response.data.documents;
  } catch (error: any) {
    console.error('[Kakao Map API] 장소 검색 실패:', error);
    throw new Error(
      error.response?.data?.message || '장소 검색에 실패했습니다.'
    );
  }
};

/**
 * 좌표 → 주소 변환 (Reverse Geocoding)
 *
 * @param x 경도 (longitude)
 * @param y 위도 (latitude)
 * @returns 주소 정보
 *
 * @example
 * ```typescript
 * const address = await coordToAddress('127.027610', '37.497942');
 * console.log(address.address.address_name); // "서울 강남구 역삼동"
 * ```
 */
export const coordToAddress = async (
  x: string,
  y: string
): Promise<CoordToAddressResult> => {
  try {
    const response = await kakaoApiClient.get<{
      meta: { total_count: number };
      documents: CoordToAddressResult[];
    }>('/geo/coord2address.json', {
      params: {
        x,
        y,
        input_coord: 'WGS84', // 좌표계 (WGS84 또는 WCONGNAMUL)
      },
    });

    if (response.data.documents.length === 0) {
      throw new Error('주소를 찾을 수 없습니다.');
    }

    return response.data.documents[0];
  } catch (error: any) {
    console.error('[Kakao Map API] 좌표 변환 실패:', error);
    throw new Error(
      error.response?.data?.message || '좌표 변환에 실패했습니다.'
    );
  }
};

/**
 * 주소 → 좌표 변환 (Geocoding)
 *
 * @param address 주소 문자열
 * @returns 좌표 정보
 *
 * @example
 * ```typescript
 * const coord = await addressToCoord('서울 강남구 역삼동');
 * console.log(coord.x, coord.y); // "127.027610", "37.497942"
 * ```
 */
export const addressToCoord = async (
  address: string
): Promise<{ x: string; y: string }> => {
  try {
    const results = await searchAddress({ query: address, size: 1 });

    if (results.length === 0) {
      throw new Error('주소를 찾을 수 없습니다.');
    }

    return {
      x: results[0].x,
      y: results[0].y,
    };
  } catch (error: any) {
    console.error('[Kakao Map API] 주소 변환 실패:', error);
    throw new Error(
      error.response?.data?.message || '주소 변환에 실패했습니다.'
    );
  }
};

/**
 * 카카오맵 웹 링크 생성
 *
 * @param placeName 장소명
 * @param x 경도
 * @param y 위도
 * @returns 카카오맵 웹 링크 URL
 *
 * @example
 * ```typescript
 * const mapUrl = getKakaoMapWebLink('강남역', '127.027610', '37.497942');
 * // "https://map.kakao.com/link/map/강남역,37.497942,127.027610"
 * ```
 */
export const getKakaoMapWebLink = (
  placeName: string,
  x: string,
  y: string
): string => {
  return `https://map.kakao.com/link/map/${encodeURIComponent(
    placeName
  )},${y},${x}`;
};

/**
 * 카카오맵 JavaScript API 스크립트 URL 생성
 *
 * @param apiKey REST API 키
 * @returns 스크립트 URL
 */
export const getKakaoMapScriptUrl = (apiKey: string): string => {
  return `//dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}`;
};

