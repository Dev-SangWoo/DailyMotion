/**
 * 날씨 API 조회 Hook
 *
 * React Query (TanStack Query)를 사용한 날씨 데이터 페칭
 * - 헌법 준수: AGENTS.md [제3장] 데이터 페칭
 * - 캐싱: 30분 (freshTime), 5분 (staleTime)
 */

import { useQuery } from '@tanstack/react-query';
import apiClient from '../../services/api';
import { getGoogleWeather } from '../../services/googleWeatherService';

export interface WeatherData {
  temperature: number; // 현재 기온
  feelsLike: number; // 체감 기온
  humidity: number; // 습도 (%)
  windSpeed: number; // 풍속 (m/s)
  windDirection: string; // 바람 방향 (N, NE, E, ...)
  visibility: number; // 가시거리 (km)
  uvIndex: number; // 자외선 지수
  precipitation: number; // 강수확률 (%)
  condition: WeatherCondition; // 날씨 상태
  description: string; // 상세 설명
  forecast: WeatherForecast[];
}

export type WeatherCondition =
  | 'clear'
  | 'cloudy'
  | 'rainy'
  | 'snowy'
  | 'thunderstorm'
  | 'fog';

export interface WeatherForecast {
  time: string; // "오후", "저녁" 등
  condition: WeatherCondition;
  temperature: number;
  precipitation: number;
}

export interface WeatherResponse {
  data: WeatherData;
}

/**
 * 날씨 데이터 조회 Hook
 *
 * @param latitude 위도 (옵션: 없으면 현재 위치)
 * @param longitude 경도 (옵션: 없으면 현재 위치)
 * @returns 날씨 데이터 및 로딩/에러 상태
 */
export function useGetWeatherQuery(latitude?: number, longitude?: number) {
  return useQuery({
    queryKey: ['weather', latitude, longitude],
    queryFn: async (): Promise<WeatherData> => {
      // Google Weather API 키가 있으면 직접 호출, 없으면 백엔드 API 사용
      const googleApiKey = process.env.EXPO_PUBLIC_GOOGLE_WEATHER_API_KEY;
      
      if (googleApiKey && latitude && longitude) {
        try {
          const googleWeather = await getGoogleWeather(latitude, longitude);
          // Google Weather 데이터를 WeatherData 형식으로 변환
          return {
            temperature: googleWeather.temperature,
            feelsLike: googleWeather.feelsLike,
            humidity: googleWeather.humidity,
            windSpeed: googleWeather.windSpeed,
            windDirection: googleWeather.windDirection,
            visibility: googleWeather.visibility,
            uvIndex: googleWeather.uvIndex,
            precipitation: googleWeather.precipitation,
            condition: googleWeather.condition as WeatherCondition,
            description: googleWeather.description,
            forecast: [], // 예보는 별도 API 호출 필요
          };
        } catch (error) {
          console.warn('[useGetWeatherQuery] Google Weather API 실패, 백엔드 API 사용:', error);
          // Google API 실패 시 백엔드 API로 폴백
        }
      }

      // 백엔드 API 사용 (기존 로직)
      const params = new URLSearchParams();
      if (latitude && longitude) {
        params.append('latitude', latitude.toString());
        params.append('longitude', longitude.toString());
      }

      const response = await apiClient.get<WeatherResponse>(
        `/weather?${params.toString()}`
      );
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 30 * 60 * 1000, // 30분 (이전의 cacheTime)
    retry: 2,
  });
}

/**
 * 날씨 상태에 따른 아이콘 반환
 */
export function getWeatherIcon(condition: WeatherCondition): string {
  const iconMap: Record<WeatherCondition, string> = {
    'clear': 'WEATHER_SUNNY', // ☀️ 아이콘 자리
    'cloudy': 'WEATHER_CLOUDY', // ☁️ 아이콘 자리
    'rainy': 'WEATHER_RAINY', // 🌧️ 아이콘 자리
    'snowy': 'WEATHER_SNOWY', // 🌨️ 아이콘 자리
    'thunderstorm': 'WEATHER_STORM', // ⛈️ 아이콘 자리
    'fog': 'WEATHER_FOG', // 🌫️ 아이콘 자리
  };
  return iconMap[condition];
}

/**
 * 날씨 상태와 기온에 따른 권장사항 생성
 */
export function getWeatherRecommendations(
  condition: WeatherCondition,
  temperature: number,
  humidity: number,
  uvIndex: number
): string[] {
  const recommendations: string[] = [];

  // 강수 관련
  if (condition === 'rainy' || condition === 'thunderstorm') {
    recommendations.push('☂️ 우산을 꼭 챙기세요');
  }

  // 기온 관련
  if (temperature < 5) {
    recommendations.push('🧥 두꺼운 옷을 입으세요');
  } else if (temperature < 15) {
    recommendations.push('🧥 얇은 외투를 준비하세요');
  } else if (temperature > 28) {
    recommendations.push('💧 충분한 수분 섭취');
  }

  // 자외선 관련
  if (uvIndex > 7) {
    recommendations.push('🕶️ 선글라스와 썬크림 필수');
  } else if (uvIndex > 5) {
    recommendations.push('🕶️ 자외선 차단 필요');
  }

  // 습도 관련
  if (humidity > 80) {
    recommendations.push('💧 습한 날씨 주의');
  }

  // 눈 관련
  if (condition === 'snowy') {
    recommendations.push('🧣 목도리와 장갑을 챙기세요');
  }

  // 최소 2개 이상의 추천사항
  return recommendations.length > 0 ? recommendations : ['☀️ 좋은 날씨'];
}

/**
 * 날씨 상태 설명 생성
 * @example "맑음 · 강수확률 10% · 체감 18°C"
 */
export function getWeatherDescription(
  condition: WeatherCondition,
  precipitation: number,
  feelsLike: number,
  description?: string
): string {
  const conditionText = {
    'clear': '맑음',
    'cloudy': '흐림',
    'rainy': '비',
    'snowy': '눈',
    'thunderstorm': '천둥번개',
    'fog': '안개',
  }[condition];

  return `${conditionText} · 강수확률 ${precipitation}% · 체감 ${Math.round(feelsLike)}°C`;
}
