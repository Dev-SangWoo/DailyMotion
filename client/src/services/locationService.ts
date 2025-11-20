/**
 * GPS 위치 서비스
 *
 * expo-location을 사용하여 사용자의 현재 위치를 가져옵니다.
 * - 위치 권한 확인 및 요청
 * - GPS 위치 가져오기
 * - 위치 정보에서 주소로 역지오코딩
 *
 * 헌법 준수:
 * - CLAUDE.md: 외부 서비스와의 연동은 서비스 계층에서 관리
 */

import * as Location from 'expo-location';
import { coordToAddress, searchPlace } from './kakaoMapService';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export interface LocationWithAddress extends LocationCoordinates {
  address: string;
  placeName: string;
  roadAddress: string;
}

/**
 * 위치 권한 상태 확인
 */
export async function checkLocationPermission(): Promise<boolean> {
  try {
    const { status } = await Location.getForegroundPermissionAsync();
    console.log('[Location Service] 위치 권한 상태:', status);
    return status === 'granted';
  } catch (error) {
    console.error('[Location Service] 위치 권한 확인 실패:', error);
    return false;
  }
}

/**
 * 위치 권한 요청
 */
export async function requestLocationPermission(): Promise<boolean> {
  try {
    const { status } = await Location.requestForegroundPermissionAsync();
    console.log('[Location Service] 위치 권한 요청 결과:', status);
    return status === 'granted';
  } catch (error) {
    console.error('[Location Service] 위치 권한 요청 실패:', error);
    return false;
  }
}

/**
 * 현재 위치 가져오기 (권한 요청 포함)
 *
 * @returns 위치 좌표 (latitude, longitude, accuracy)
 * @throws 위치 권한이 거부되면 에러 발생
 */
export async function getCurrentLocation(): Promise<LocationCoordinates> {
  try {
    console.log('[Location Service] 현재 위치 가져오기 시작...');

    // 1. 권한 확인
    let hasPermission = await checkLocationPermission();

    // 2. 권한이 없으면 요청
    if (!hasPermission) {
      console.log('[Location Service] 위치 권한 없음 - 요청 중...');
      hasPermission = await requestLocationPermission();
    }

    // 3. 권한 확인 실패
    if (!hasPermission) {
      throw new Error('위치 권한이 거부되었습니다. 설정에서 위치 접근을 허용해주세요.');
    }

    // 4. 위치 정보 가져오기
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced, // 배터리와 정확도의 균형
      timeout: 10000, // 10초 timeout
    });

    const { latitude, longitude, accuracy } = location.coords;
    console.log('[Location Service] 위치 획득 성공:', {
      latitude,
      longitude,
      accuracy,
    });

    return {
      latitude,
      longitude,
      accuracy: accuracy || 0,
    };
  } catch (error) {
    console.error('[Location Service] 위치 가져오기 실패:', error);
    throw error;
  }
}

/**
 * 위치 좌표를 주소로 변환 (카카오 맵 역지오코딩)
 *
 * @param latitude 위도
 * @param longitude 경도
 * @returns 주소 정보
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<LocationWithAddress> {
  try {
    console.log('[Location Service] 역지오코딩 시작:', { latitude, longitude });

    // 카카오 맵 API로 좌표를 주소로 변환
    const x = longitude.toString();
    const y = latitude.toString();

    // 1. coordToAddress로 주소 변환
    const addressData = await coordToAddress(x, y);
    const address = addressData.address.address_name;
    const roadAddress = addressData.road_address?.address_name || address;

    console.log('[Location Service] 역지오코딩 성공:', {
      address,
      roadAddress,
    });

    // 2. 대체 placeName 설정 (주소의 마지막 부분 사용)
    const addressParts = address.split(' ');
    const placeName = addressParts[addressParts.length - 1] || address;

    return {
      latitude,
      longitude,
      accuracy: 0,
      address: roadAddress, // 도로명 주소 우선
      placeName,
      roadAddress,
    };
  } catch (error) {
    console.error('[Location Service] 역지오코딩 실패:', error);
    throw error;
  }
}

/**
 * 현재 위치 전체 조회 (권한 요청 + 위치 가져오기 + 주소 변환)
 *
 * @returns 위치와 주소 정보
 */
export async function getCurrentLocationWithAddress(): Promise<LocationWithAddress> {
  try {
    console.log('[Location Service] 현재 위치 + 주소 조회 시작...');

    // 1. 위치 좌표 가져오기
    const coordinates = await getCurrentLocation();

    // 2. 좌표를 주소로 변환
    const locationWithAddress = await reverseGeocode(
      coordinates.latitude,
      coordinates.longitude
    );

    console.log('[Location Service] 위치 + 주소 조회 완료:', locationWithAddress);
    return locationWithAddress;
  } catch (error) {
    console.error('[Location Service] 위치 + 주소 조회 실패:', error);
    throw error;
  }
}

export default {
  checkLocationPermission,
  requestLocationPermission,
  getCurrentLocation,
  reverseGeocode,
  getCurrentLocationWithAddress,
};
