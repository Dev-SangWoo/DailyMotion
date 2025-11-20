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
    // expo-location v19 API: getForegroundPermissionsAsync 사용
    const permissionResponse = await Location.getForegroundPermissionsAsync();
    console.log('[Location Service] 위치 권한 상태:', {
      status: permissionResponse.status,
      canAskAgain: permissionResponse.canAskAgain,
      granted: permissionResponse.status === 'granted',
    });
    return permissionResponse.status === 'granted';
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
    console.log('[Location Service] 위치 권한 요청 시작...');

    // expo-location v19 API: requestForegroundPermissionsAsync 사용
    console.log('[Location Service] requestForegroundPermissionsAsync 호출 중...');
    const permissionResponse = await Location.requestForegroundPermissionsAsync();
    console.log('[Location Service] 위치 권한 요청 결과:', {
      status: permissionResponse.status,
      canAskAgain: permissionResponse.canAskAgain,
      granted: permissionResponse.status === 'granted',
    });
    
    if (permissionResponse.status === 'granted') {
      console.log('[Location Service] ✅ 위치 권한 허용됨');
      return true;
    } else if (permissionResponse.status === 'denied') {
      console.warn('[Location Service] ⚠️ 위치 권한 거부됨');
      return false;
    } else {
      console.warn('[Location Service] ⚠️ 위치 권한 상태:', permissionResponse.status);
      return false;
    }
  } catch (error: any) {
    console.error('[Location Service] 위치 권한 요청 실패:', {
      error: error.message,
      stack: error.stack,
      errorType: error.constructor?.name,
    });
    
    // 에러 메시지가 있으면 그대로 전달
    if (error.message) {
      throw error;
    }
    
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
      try {
        hasPermission = await requestLocationPermission();
        console.log('[Location Service] 권한 요청 후 상태:', hasPermission);
      } catch (permissionError: any) {
        console.error('[Location Service] 권한 요청 중 에러:', permissionError);
        // 권한 요청 실패 시 더 명확한 에러 메시지
        throw new Error(
          permissionError.message || 
          '위치 권한 요청에 실패했습니다. Expo Go에서는 일부 기능이 제한될 수 있습니다. 설정에서 위치 권한을 수동으로 허용해주세요.'
        );
      }
    }

    // 3. 권한 확인 실패
    if (!hasPermission) {
      throw new Error('위치 권한이 거부되었습니다. 설정에서 위치 접근을 허용해주세요.');
    }

    // 4. 위치 서비스 활성화 상태 확인 (경고만, 실제 위치 가져오기는 시도)
    // Expo Go 환경에서는 hasServicesEnabledAsync()가 부정확할 수 있으므로
    // 실제 위치 가져오기를 시도하고, 실패하면 그때 에러를 던집니다.
    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        console.warn('[Location Service] 위치 서비스가 비활성화되어 있을 수 있습니다. 위치 가져오기를 시도합니다...');
        // 경고만 하고 계속 진행 (실제 위치 가져오기 시도)
      }
    } catch (serviceCheckError) {
      console.warn('[Location Service] 위치 서비스 확인 실패 (무시하고 계속 진행):', serviceCheckError);
      // 위치 서비스 확인 실패해도 위치 가져오기는 시도
    }

    // 5. 위치 정보 가져오기 (실제 시도)
    console.log('[Location Service] getCurrentPositionAsync 호출 중...');
    let location;
    try {
      location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced, // 배터리와 정확도의 균형
      });
    } catch (locationError: any) {
      // 위치 가져오기 실패 시 명확한 에러 메시지
      if (locationError.message && locationError.message.includes('location services are enabled')) {
        throw new Error('위치 서비스가 비활성화되어 있습니다. 기기의 설정 > 위치 서비스에서 위치 서비스를 켜주세요.');
      }
      if (locationError.message && locationError.message.includes('permission')) {
        throw new Error('위치 권한이 필요합니다. 앱 설정에서 위치 권한을 허용해주세요.');
      }
      // 기타 에러는 그대로 전달
      throw locationError;
    }

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
  } catch (error: any) {
    console.error('[Location Service] 위치 가져오기 실패:', {
      error: error.message,
      code: error.code,
      stack: error.stack,
    });
    
    // 에러 메시지 개선
    if (error.message && error.message.includes('location services are enabled')) {
      throw new Error('위치 서비스가 비활성화되어 있습니다. 기기의 설정 > 위치 서비스에서 위치 서비스를 켜주세요.');
    }
    
    if (error.message && error.message.includes('permission')) {
      throw new Error('위치 권한이 필요합니다. 앱 설정에서 위치 권한을 허용해주세요.');
    }
    
    // 기타 에러는 원본 메시지 유지
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
