/**
 * 온보딩 전역 상태 관리 (Zustand)
 *
 * 헌법 준수:
 * - AGENTS.md [제1장]: 전역 상태 관리는 Zustand 사용
 * - CLAUDE.md: 상태를 변경하는 로직(Action)은 actions 객체 안에서 명시적으로 정의
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * 온보딩 상태 인터페이스
 */
export interface OnboardingState {
  // 장소 설정 (스크린 4-5)
  places: {
    homeAddress: string | { name: string; icon: string; address?: string; x?: string; y?: string } | null;
    favoritePlaces: Array<{
      name: string;
      icon: string;
      address?: string; // 도로명 주소
      x?: string; // 경도 (Kakao Local API)
      y?: string; // 위도 (Kakao Local API)
    }>;
  };

  // 경로 선택 (스크린 5)
  pathSelection: {
    selectedPathIndex: number;
    customPath?: string;
    journeys?: Array<{
      id: string;
      placeId: string;
      placeName: string;
      placeIcon: string;
      type: 'depart' | 'arrive';
      time: string;
    }>;
  };

  // 목표 시간 (스크린 6)
  goalTime: {
    arrivalTime: string; // HH:MM 형식
    firstMileMinutes: number; // 1-15분
  };

  // 스케줄 (스크린 7)
  schedule: {
    daysOfWeek: string[]; // ['MON', 'TUE', 'WED', 'THU', 'FRI'] 등
    isCustom: boolean;
  };

  // 권한 (스크린 8)
  permissions: {
    notificationGranted: boolean;
    locationGranted: boolean;
  };

  // 진행 상태
  currentStep: number; // 1-9
  isCompleted: boolean;
  isOnboarded: boolean; // RootNavigator에서 사용

  // Actions (명시적으로 정의된 메서드들)
  actions: {
    // 장소 설정
    updateHomeAddress: (address: string | { name: string; icon: string; address?: string }) => void;
    updateFavoritePlaces: (places: Array<{ name: string; icon: string; address?: string }>) => void;
    resetPlaces: () => void;

    // 경로 선택
    selectPath: (pathIndex: number) => void;
    setCustomPath: (path: string) => void;
    setJourneys: (journeys: Array<{
      id: string;
      placeId: string;
      placeName: string;
      placeIcon: string;
      type: 'depart' | 'arrive';
      time: string;
    }>) => void;

    // 목표 시간
    updateArrivalTime: (time: string) => void;
    updateFirstMileMinutes: (minutes: number) => void;

    // 스케줄
    setSchedule: (daysOfWeek: string[], isCustom: boolean) => void;

    // 권한
    grantNotificationPermission: () => void;
    grantLocationPermission: () => void;

    // 진행 상태
    goToStep: (step: number) => void;
    nextStep: () => void;
    previousStep: () => void;
    completeOnboarding: () => void;

    // 전체 초기화
    reset: () => void;
  };
}

/**
 * 온보딩 초기 상태
 */
const initialState = {
  places: {
    homeAddress: '',
    favoritePlaces: [],
  },
  pathSelection: {
    selectedPathIndex: 0,
    customPath: undefined,
  },
  goalTime: {
    arrivalTime: '09:00',
    firstMileMinutes: 5,
  },
  schedule: {
    daysOfWeek: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
    isCustom: false,
  },
  permissions: {
    notificationGranted: false,
    locationGranted: false,
  },
  currentStep: 1,
  isCompleted: false,
  isOnboarded: false,
};

/**
 * Zustand 스토어: useOnboardingStore
 * AsyncStorage로 자동 저장 (persist 미들웨어)
 */
export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      ...initialState,

      actions: {
        // 장소 설정
        updateHomeAddress: (address: string) => {
          set((state) => ({
            places: {
              ...state.places,
              homeAddress: address,
            },
          }));
        },

        updateFavoritePlaces: (favoritePlaces: Array<{ name: string; icon: string; address?: string }>) => {
          set((state) => ({
            places: {
              ...state.places,
              favoritePlaces,
            },
          }));
        },

        resetPlaces: () => {
          set((state) => ({
            places: initialState.places,
          }));
        },

        // 경로 선택
        selectPath: (pathIndex: number) => {
          set({
            pathSelection: {
              selectedPathIndex: pathIndex,
              customPath: undefined,
            },
          });
        },

        setCustomPath: (path: string) => {
          set((state) => ({
            pathSelection: {
              ...state.pathSelection,
              customPath: path,
            },
          }));
        },

        setJourneys: (journeys: Array<{
          id: string;
          placeId: string;
          placeName: string;
          placeIcon: string;
          type: 'depart' | 'arrive';
          time: string;
        }>) => {
          set((state) => ({
            pathSelection: {
              ...state.pathSelection,
              journeys,
            },
          }));
        },

        // 목표 시간
        updateArrivalTime: (time: string) => {
          set((state) => ({
            goalTime: {
              ...state.goalTime,
              arrivalTime: time,
            },
          }));
        },

        updateFirstMileMinutes: (minutes: number) => {
          set((state) => ({
            goalTime: {
              ...state.goalTime,
              firstMileMinutes: Math.max(1, Math.min(15, minutes)),
            },
          }));
        },

        // 스케줄
        setSchedule: (daysOfWeek: string[], isCustom: boolean) => {
          set({
            schedule: {
              daysOfWeek,
              isCustom,
            },
          });
        },

        // 권한
        grantNotificationPermission: () => {
          set((state) => ({
            permissions: {
              ...state.permissions,
              notificationGranted: true,
            },
          }));
        },

        grantLocationPermission: () => {
          set((state) => ({
            permissions: {
              ...state.permissions,
              locationGranted: true,
            },
          }));
        },

        // 진행 상태
        goToStep: (step: number) => {
          set({
            currentStep: Math.max(1, Math.min(9, step)),
          });
        },

        nextStep: () => {
          const currentStep = get().currentStep;
          if (currentStep < 9) {
            set({
              currentStep: currentStep + 1,
            });
          }
        },

        previousStep: () => {
          const currentStep = get().currentStep;
          if (currentStep > 1) {
            set({
              currentStep: currentStep - 1,
            });
          }
        },

        completeOnboarding: () => {
          set({
            isCompleted: true,
            isOnboarded: true,
            currentStep: 9,
          });
        },

        // 전체 초기화
        reset: () => {
          set(initialState);
        },
      },
    }),
    {
      name: 'onboarding-storage', // AsyncStorage 키
      partialize: (state) => ({
        places: state.places,
        pathSelection: state.pathSelection,
        goalTime: state.goalTime,
        schedule: state.schedule,
        permissions: state.permissions,
        currentStep: state.currentStep,
        isCompleted: state.isCompleted,
        isOnboarded: state.isOnboarded,
        // actions는 저장하지 않음
      }),
    }
  )
);

/**
 * 편의 훅: 액션만 추출
 * 사용: const actions = useOnboardingActions();
 */
export const useOnboardingActions = () => {
  const state = useOnboardingStore();
  return state.actions;
};

/**
 * 편의 훅: 상태만 추출 (액션 제외)
 * 사용: const { origin, destination } = useOnboardingData();
 */
export const useOnboardingData = () => {
  const state = useOnboardingStore();
  return {
    places: state.places,
    pathSelection: state.pathSelection,
    goalTime: state.goalTime,
    schedule: state.schedule,
    permissions: state.permissions,
    currentStep: state.currentStep,
    isCompleted: state.isCompleted,
  };
};
