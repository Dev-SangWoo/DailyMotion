/**
 * API 클라이언트 설정
 *
 * axios 인스턴스를 생성하고, 인증 처리, 인터셉터 등을 설정합니다.
 *
 * Phase 8: 목업 데이터 지원
 * - 개발/Expo 환경에서 목업 데이터 사용 가능
 * - 환경 변수 또는 __DEV__ 플래그로 제어
 * - 실제 HTTP 요청 대신 목업 데이터 반환
 */
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { mockResponseGoNow, mockScenarios, getRandomMockResponse } from './mockData';

// TODO: 환경 변수에서 가져오도록 변경
const API_BASE_URL = 'http://localhost:8000/api/v1';

// 목업 데이터 사용 여부 결정
// - REACT_APP_USE_MOCK_API='true': 항상 목업 사용
// - REACT_APP_USE_MOCK_API='false': 항상 실제 API 사용
// - 미설정 && __DEV__: 개발 환경에서 목업 사용 (기본값)
const USE_MOCK_API =
  process.env.REACT_APP_USE_MOCK_API === 'true' ||
  (process.env.REACT_APP_USE_MOCK_API !== 'false' && __DEV__);

/**
 * 목업 데이터 제공 함수
 * Phase 8: Expo 환경에서 실시간 UI 테스트를 위해 지연 포함
 */
const provideMockData = async (endpoint: string) => {
  // 네트워크 지연 시뮬레이션 (300-800ms)
  // 실제 API 호출과 동일한 사용자 경험 제공
  const delay = Math.random() * 500 + 300;
  await new Promise((resolve) => setTimeout(resolve, delay));

  // 엔드포인트별 목업 데이터 매핑
  switch (endpoint) {
    case '/briefings/commute':
      // GO_NOW, LAST_CHANCE, NO_ACTION 중 랜덤 선택
      // 여러 번 테스트할 때 다양한 상황 확인 가능
      return getRandomMockResponse();
    default:
      // 목업 데이터가 정의되지 않으면 에러
      throw new Error(`Mock data not found for endpoint: ${endpoint}`);
  }
};

// axios 인스턴스 생성
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터: 인증 토큰 추가 & 목업 데이터 처리
apiClient.interceptors.request.use(
  async (config) => {
    // TODO: Zustand store에서 토큰 가져오기
    // const token = useAuthStore.getState().token;
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }

    // 목업 데이터 모드: 요청을 가로채서 목업 데이터 준비
    if (USE_MOCK_API) {
      try {
        const mockData = await provideMockData(config.url || '');
        // config에 목업 데이터 저장 (response interceptor에서 사용)
        (config as any).__mockData = mockData;
      } catch (error) {
        // 목업 데이터를 찾을 수 없으면 실제 요청 진행
        console.warn('[Mock API] No mock data found, proceeding with real request:', error);
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터: 목업 데이터 또는 실제 응답 처리
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // 목업 데이터가 준비되었으면 반환
    if (USE_MOCK_API && (error.config as any)?.__mockData) {
      console.log('[Mock API] Returning mock data for:', error.config.url);
      return Promise.resolve({
        data: (error.config as any).__mockData,
        status: 200,
        statusText: 'Mock OK',
        headers: {},
        config: error.config as AxiosRequestConfig,
      } as any);
    }

    // 실제 에러 처리
    if (error.response?.status === 401) {
      // TODO: 로그아웃 처리
    }
    return Promise.reject(error);
  }
);

export default apiClient;

/**
 * 목업 데이터 모드 상태 export
 * 앱 상단에서 목업 모드 여부를 표시할 때 사용
 */
export const isUsingMockApi = (): boolean => USE_MOCK_API;

