/**
 * 전역 타입 정의
 * 
 * 프로젝트 전반에서 사용되는 공통 타입들을 정의합니다.
 */

// 예시: API 응답 타입
export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: number;
}

// 예시: 사용자 타입
export interface User {
  id: string;
  email: string;
  name: string;
}

// 네비게이션 타입은 navigators/types.ts에서 정의됩니다.

