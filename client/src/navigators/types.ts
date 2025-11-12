/**
 * 네비게이션 타입 정의
 * 
 * React Navigation의 스크린 파라미터 타입을 정의합니다.
 * 타입 안정성을 보장하기 위해 모든 네비게이션 파라미터를 여기서 관리합니다.
 */

export type RootStackParamList = {
  // TODO: 실제 스크린 파라미터 타입 정의
  // DailyBriefing: undefined;
  // SafetyGuard: { userId: string };
  // VideoDetail: { videoId: string };
  [key: string]: any;
};

// 네비게이션 prop 타입
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

