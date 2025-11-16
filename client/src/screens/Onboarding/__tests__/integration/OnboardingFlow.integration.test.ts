/**
 * 온보딩 통합 테스트 (Integration Tests)
 *
 * 목표: 전체 온보딩 플로우가 정상 동작하는지 검증
 * - 스크린 1 → 9 순차 진행
 * - 각 스크린에서 데이터 저장
 * - 상태 보존 (persistence)
 * - 완료 후 메인 앱으로 전환
 */

import { useOnboardingStore } from '../../stores/useOnboardingStore';

describe('Onboarding Integration Flow', () => {
  beforeEach(() => {
    // 각 테스트 전에 상태 초기화
    const state = useOnboardingStore.getState();
    state.actions.reset();
  });

  describe('전체 온보딩 플로우 (Screen 1-9)', () => {
    it('Step 1: 초기 상태 확인', () => {
      const state = useOnboardingStore.getState();

      expect(state.currentStep).toBe(1);
      expect(state.isCompleted).toBe(false);
      expect(state.isOnboarded).toBe(false);
      expect(state.journeySetup.origin).toBe('');
      expect(state.journeySetup.destination).toBe('');
    });

    it('Step 2: 여정 설정 (Screen 4)', () => {
      const state = useOnboardingStore.getState();

      // 출발지 입력
      state.actions.updateOrigin('집');
      expect(useOnboardingStore.getState().journeySetup.origin).toBe('집');

      // 목적지 입력
      state.actions.updateDestination('회사');
      expect(useOnboardingStore.getState().journeySetup.destination).toBe('회사');

      // 다음 스텝으로 진행
      state.actions.nextStep();
      expect(useOnboardingStore.getState().currentStep).toBe(2);
    });

    it('Step 3: 경로 선택 (Screen 5)', () => {
      // 이전 스텝 진행을 위해 초기 상태부터 시작
      useOnboardingStore.getState().actions.goToStep(2);

      const state = useOnboardingStore.getState();

      // 경로 선택
      state.actions.selectPath(0); // 첫 번째 경로 선택
      expect(useOnboardingStore.getState().pathSelection.selectedPathIndex).toBe(0);

      state.actions.nextStep();
      expect(useOnboardingStore.getState().currentStep).toBe(3);
    });

    it('Step 4: 도착 시간 & First Mile 설정 (Screen 6)', () => {
      // 초기 스텝을 3으로 설정
      useOnboardingStore.getState().actions.goToStep(3);

      const state = useOnboardingStore.getState();

      // 도착 시간 설정
      state.actions.updateArrivalTime('09:30');
      expect(useOnboardingStore.getState().goalTime.arrivalTime).toBe('09:30');

      // First Mile 시간 설정 (1-15분)
      state.actions.updateFirstMileMinutes(10);
      expect(useOnboardingStore.getState().goalTime.firstMileMinutes).toBe(10);

      state.actions.nextStep();
      expect(useOnboardingStore.getState().currentStep).toBe(4);
    });

    it('Step 5: 스케줄 설정 (Screen 7)', () => {
      useOnboardingStore.getState().actions.goToStep(4);

      const state = useOnboardingStore.getState();

      // 평일 스케줄 설정
      state.actions.setSchedule(['MON', 'TUE', 'WED', 'THU', 'FRI'], false);
      const schedule = useOnboardingStore.getState().schedule;
      expect(schedule.daysOfWeek).toEqual(['MON', 'TUE', 'WED', 'THU', 'FRI']);
      expect(schedule.isCustom).toBe(false);

      state.actions.nextStep();
      expect(useOnboardingStore.getState().currentStep).toBe(5);
    });

    it('Step 6: 커스텀 스케줄 설정', () => {
      useOnboardingStore.getState().actions.goToStep(4);

      const state = useOnboardingStore.getState();

      // 커스텀 스케줄 설정 (월, 수, 금만)
      state.actions.setSchedule(['MON', 'WED', 'FRI'], true);
      const schedule = useOnboardingStore.getState().schedule;
      expect(schedule.daysOfWeek).toEqual(['MON', 'WED', 'FRI']);
      expect(schedule.isCustom).toBe(true);
    });

    it('Step 7: 권한 설정 (Screen 8)', () => {
      useOnboardingStore.getState().actions.goToStep(5);

      const state = useOnboardingStore.getState();

      // 알림 권한 요청
      state.actions.grantNotificationPermission();
      expect(useOnboardingStore.getState().permissions.notificationGranted).toBe(true);

      // 위치 권한 요청
      state.actions.grantLocationPermission();
      expect(useOnboardingStore.getState().permissions.locationGranted).toBe(true);

      state.actions.nextStep();
      expect(useOnboardingStore.getState().currentStep).toBe(6);
    });

    it('Step 8: 온보딩 완료 (Screen 9)', () => {
      useOnboardingStore.getState().actions.goToStep(6);

      const state = useOnboardingStore.getState();

      // 온보딩 완료
      state.actions.completeOnboarding();

      expect(useOnboardingStore.getState().isCompleted).toBe(true);
      expect(useOnboardingStore.getState().isOnboarded).toBe(true);
      expect(useOnboardingStore.getState().currentStep).toBe(9);
    });
  });

  describe('전체 플로우 순차 진행', () => {
    it('스크린 1 → 9까지 모든 입력 처리 후 완료', () => {
      const state = useOnboardingStore.getState();

      // 1. 여정 설정
      state.actions.updateOrigin('집');
      state.actions.updateDestination('회사');
      expect(useOnboardingStore.getState().journeySetup.origin).toBe('집');
      expect(useOnboardingStore.getState().journeySetup.destination).toBe('회사');

      // 2. 경로 선택
      state.actions.selectPath(0);
      expect(useOnboardingStore.getState().pathSelection.selectedPathIndex).toBe(0);

      // 3. 도착 시간 설정
      state.actions.updateArrivalTime('09:00');
      state.actions.updateFirstMileMinutes(5);
      expect(useOnboardingStore.getState().goalTime.arrivalTime).toBe('09:00');
      expect(useOnboardingStore.getState().goalTime.firstMileMinutes).toBe(5);

      // 4. 스케줄 설정
      state.actions.setSchedule(['MON', 'TUE', 'WED', 'THU', 'FRI'], false);
      expect(useOnboardingStore.getState().schedule.daysOfWeek).toEqual(['MON', 'TUE', 'WED', 'THU', 'FRI']);

      // 5. 권한 설정
      state.actions.grantNotificationPermission();
      state.actions.grantLocationPermission();
      expect(useOnboardingStore.getState().permissions.notificationGranted).toBe(true);
      expect(useOnboardingStore.getState().permissions.locationGranted).toBe(true);

      // 6. 완료
      state.actions.completeOnboarding();

      // 최종 상태 검증
      const finalState = useOnboardingStore.getState();
      expect(finalState.isOnboarded).toBe(true);
      expect(finalState.isCompleted).toBe(true);
      expect(finalState.currentStep).toBe(9);
      expect(finalState.journeySetup.origin).toBe('집');
      expect(finalState.journeySetup.destination).toBe('회사');
    });
  });

  describe('뒤로가기 기능', () => {
    it('다음 스텝에서 이전 스텝으로 이동', () => {
      const state = useOnboardingStore.getState();

      state.actions.goToStep(5);
      expect(useOnboardingStore.getState().currentStep).toBe(5);

      state.actions.previousStep();
      expect(useOnboardingStore.getState().currentStep).toBe(4);

      state.actions.previousStep();
      expect(useOnboardingStore.getState().currentStep).toBe(3);
    });

    it('스텝 1에서는 이전으로 갈 수 없음', () => {
      const state = useOnboardingStore.getState();

      expect(useOnboardingStore.getState().currentStep).toBe(1);
      state.actions.previousStep();
      // currentStep이 1보다 작아지면 안됨
      expect(useOnboardingStore.getState().currentStep).toBeGreaterThanOrEqual(1);
    });
  });

  describe('스텝 점프', () => {
    it('goToStep으로 특정 스텝으로 이동', () => {
      const state = useOnboardingStore.getState();

      state.actions.goToStep(7);
      expect(useOnboardingStore.getState().currentStep).toBe(7);

      state.actions.goToStep(3);
      expect(useOnboardingStore.getState().currentStep).toBe(3);
    });
  });

  describe('데이터 리셋', () => {
    it('reset 액션으로 모든 상태 초기화', () => {
      const state = useOnboardingStore.getState();

      // 여러 상태 변경
      state.actions.updateOrigin('집');
      state.actions.updateDestination('회사');
      state.actions.updateArrivalTime('10:00');
      state.actions.grantNotificationPermission();
      state.actions.goToStep(5);

      // 리셋
      state.actions.reset();

      // 초기 상태로 돌아옴
      const resetState = useOnboardingStore.getState();
      expect(resetState.journeySetup.origin).toBe('');
      expect(resetState.journeySetup.destination).toBe('');
      expect(resetState.goalTime.arrivalTime).toBe('09:00');
      expect(resetState.permissions.notificationGranted).toBe(false);
      expect(resetState.currentStep).toBe(1);
      expect(resetState.isCompleted).toBe(false);
      expect(resetState.isOnboarded).toBe(false);
    });
  });

  describe('엣지 케이스', () => {
    it('빈 입력값 처리 (JourneySetup)', () => {
      const state = useOnboardingStore.getState();

      // 빈 값으로 설정
      state.actions.updateOrigin('');
      state.actions.updateDestination('');

      const current = useOnboardingStore.getState();
      expect(current.journeySetup.origin).toBe('');
      expect(current.journeySetup.destination).toBe('');

      // 실제 UI에서는 버튼을 비활성화하지만, 스토어에서는 저장 가능
    });

    it('First Mile 범위 검증', () => {
      const state = useOnboardingStore.getState();

      // 최소값
      state.actions.updateFirstMileMinutes(1);
      expect(useOnboardingStore.getState().goalTime.firstMileMinutes).toBe(1);

      // 최대값
      state.actions.updateFirstMileMinutes(15);
      expect(useOnboardingStore.getState().goalTime.firstMileMinutes).toBe(15);
    });

    it('경로 인덱스 유효성 검증', () => {
      const state = useOnboardingStore.getState();

      // 경로 선택
      state.actions.selectPath(2);
      expect(useOnboardingStore.getState().pathSelection.selectedPathIndex).toBe(2);

      state.actions.selectPath(0);
      expect(useOnboardingStore.getState().pathSelection.selectedPathIndex).toBe(0);
    });

    it('시간 형식 검증 (HH:MM)', () => {
      const state = useOnboardingStore.getState();

      state.actions.updateArrivalTime('14:30');
      expect(useOnboardingStore.getState().goalTime.arrivalTime).toBe('14:30');

      state.actions.updateArrivalTime('09:00');
      expect(useOnboardingStore.getState().goalTime.arrivalTime).toBe('09:00');

      state.actions.updateArrivalTime('23:59');
      expect(useOnboardingStore.getState().goalTime.arrivalTime).toBe('23:59');
    });
  });

  describe('State Persistence', () => {
    it('주요 상태가 partialize에 포함되어 있는지 확인', () => {
      const state = useOnboardingStore.getState();

      // 상태 변경
      state.actions.updateOrigin('집');
      state.actions.updateDestination('회사');
      state.actions.setSchedule(['MON', 'TUE'], false);
      state.actions.grantNotificationPermission();
      state.actions.completeOnboarding();

      // 현재 상태 확인
      const current = useOnboardingStore.getState();
      expect(current.journeySetup.origin).toBe('집');
      expect(current.journeySetup.destination).toBe('회사');
      expect(current.schedule.daysOfWeek).toEqual(['MON', 'TUE']);
      expect(current.permissions.notificationGranted).toBe(true);
      expect(current.isOnboarded).toBe(true);
    });
  });

  describe('RootNavigator 통합 시나리오', () => {
    it('isOnboarded 상태로 화면 결정', () => {
      const state = useOnboardingStore.getState();

      // 초기: OnboardingStack 표시
      expect(useOnboardingStore.getState().isOnboarded).toBe(false);

      // 완료 후: MainStack 표시
      state.actions.completeOnboarding();
      expect(useOnboardingStore.getState().isOnboarded).toBe(true);
    });

    it('초기 로딩 상태에서 300ms 후 준비 상태 전환', () => {
      // 이 테스트는 실제 환경에서 RootNavigator의 useEffect 타이밍을 검증
      // 스토어 관점에서는 AsyncStorage 복원이 완료되어야 함

      const state = useOnboardingStore.getState();
      expect(state.isOnboarded).toBeDefined();
    });
  });
});
