/**
 * API 클라이언트 설정
 * 
 * axios 인스턴스를 생성하고, 인증 처리, 인터셉터 등을 설정합니다.
 */
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

// TODO: 환경 변수에서 가져오도록 변경
const API_BASE_URL = 'http://localhost:8000/api/v1';

// axios 인스턴스 생성
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터: 인증 토큰 추가
apiClient.interceptors.request.use(
  (config) => {
    // TODO: Zustand store에서 토큰 가져오기
    // const token = useAuthStore.getState().token;
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터: 에러 처리
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // TODO: 에러 처리 로직 (예: 401 시 로그아웃)
    if (error.response?.status === 401) {
      // 로그아웃 처리
    }
    return Promise.reject(error);
  }
);

export default apiClient;

