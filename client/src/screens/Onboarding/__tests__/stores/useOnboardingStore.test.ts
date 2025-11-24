/**
 * useOnboardingStore 테스트 (TDD)
 *
 * 테스트 방법론: 상태 변경 확인, 액션 메서드 확인
 * Zustand 직접 테스트 (React Component 테스트 제외)
 */

import { useOnboardingStore, useOnboardingActions, useOnboardingData } from '../../stores/useOnboardingStore';

describe('useOnboardingStore', () => {
  beforeEach(() => {
    // 각 테스트 전에 스토어 초기화
    useOnboardingStore.setState((state) => ({
      ...state,
      journeySetup: { origin: '', destination: '' },
      pathSelection: { selectedPathIndex: 0, customPath: undefined },
      goalTime: { arrivalTime: '09:00', firstMileMinutes: 5 },
      schedule: { daysOfWeek: ['MON', 'TUE', 'WED', 'THU', 'FRI'], isCustom: false },
      permissions: { notificationGranted: false, locationGranted: false },
      currentStep: 1,
      isCompleted: false,
    }));
  });

  describe('[초기 상태]', () => {
    it('초기 상태가 올바르게 설정되어야 한다', () => {
      const state = useOnboardingStore.getState();

      expect(state.journeySetup.origin).toBe('');
      expect(state.journeySetup.destination).toBe('');
      expect(state.currentStep).toBe(1);
      expect(state.isCompleted).toBe(false);
      expect(state.goalTime.arrivalTime).toBe('09:00');
      expect(state.goalTime.firstMileMinutes).toBe(5);
    });
  });

  describe('[여정 설정 액션]', () => {
    it('updateOrigin으로 출발지를 업데이트할 수 있어야 한다', () => {
      const state = useOnboardingStore.getState();
      state.actions.updateOrigin('집');

      expect(useOnboardingStore.getState().journeySetup.origin).toBe('집');
    });

    it('updateDestination으로 도착지를 업데이트할 수 있어야 한다', () => {
      const state = useOnboardingStore.getState();
      state.actions.updateDestination('회사');

      expect(useOnboardingStore.getState().journeySetup.destination).toBe('회사');
    });

    it('출발지와 도착지를 동시에 업데이트할 수 있어야 한다', () => {
      const state = useOnboardingStore.getState();
      state.actions.updateOrigin('집');
      state.actions.updateDestination('회사');

      const newState = useOnboardingStore.getState();
      expect(newState.journeySetup.origin).toBe('집');
      expect(newState.journeySetup.destination).toBe('회사');
    });

    it('resetJourneySetup으로 여정 설정을 초기화할 수 있어야 한다', () => {
      const state = useOnboardingStore.getState();
      state.actions.updateOrigin('집');
      state.actions.updateDestination('회사');
      state.actions.resetJourneySetup();

      const newState = useOnboardingStore.getState();
      expect(newState.journeySetup.origin).toBe('');
      expect(newState.journeySetup.destination).toBe('');
    });
  });

  describe('[경로 선택 액션]', () => {
    it('selectPath로 경로를 선택할 수 있어야 한다', () => {
      const state = useOnboardingStore.getState();
      state.actions.selectPath(1);

      const newState = useOnboardingStore.getState();
      expect(newState.pathSelection.selectedPathIndex).toBe(1);
      expect(newState.pathSelection.customPath).toBeUndefined();
    });

    it('setCustomPath로 커스텀 경로를 설정할 수 있어야 한다', () => {
      const state = useOnboardingStore.getState();
      state.actions.setCustomPath('123번 버스 → 2호선');

      expect(useOnboardingStore.getState().pathSelection.customPath).toBe('123번 버스 → 2호선');
    });
  });

  describe('[목표 시간 액션]', () => {
    it('updateArrivalTime으로 도착 시간을 업데이트할 수 있어야 한다', () => {
      const state = useOnboardingStore.getState();
      state.actions.updateArrivalTime('08:30');

      expect(useOnboardingStore.getState().goalTime.arrivalTime).toBe('08:30');
    });

    it('updateFirstMileMinutes로 도보 시간을 업데이트할 수 있어야 한다', () => {
      const state = useOnboardingStore.getState();
      state.actions.updateFirstMileMinutes(10);

      expect(useOnboardingStore.getState().goalTime.firstMileMinutes).toBe(10);
    });

    it('updateFirstMileMinutes는 1분 이상 15분 이하만 허용해야 한다', () => {
      const state = useOnboardingStore.getState();

      // 0분 입력 → 1분으로 조정
      state.actions.updateFirstMileMinutes(0);
      expect(useOnboardingStore.getState().goalTime.firstMileMinutes).toBe(1);

      // 20분 입력 → 15분으로 조정
      state.actions.updateFirstMileMinutes(20);
      expect(useOnboardingStore.getState().goalTime.firstMileMinutes).toBe(15);

      // 7분 입력 → 정상
      state.actions.updateFirstMileMinutes(7);
      expect(useOnboardingStore.getState().goalTime.firstMileMinutes).toBe(7);
    });
  });

  describe('[스케줄 액션]', () => {
    it('setSchedule로 스케줄을 설정할 수 있어야 한다', () => {
      const state = useOnboardingStore.getState();
      const weekdays = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
      state.actions.setSchedule(weekdays, false);

      const newState = useOnboardingStore.getState();
      expect(newState.schedule.daysOfWeek).toEqual(weekdays);
      expect(newState.schedule.isCustom).toBe(false);
    });

    it('커스텀 스케줄을 설정할 수 있어야 한다', () => {
      const state = useOnboardingStore.getState();
      const customDays = ['MON', 'WED', 'FRI'];
      state.actions.setSchedule(customDays, true);

      const newState = useOnboardingStore.getState();
      expect(newState.schedule.daysOfWeek).toEqual(customDays);
      expect(newState.schedule.isCustom).toBe(true);
    });
  });

  describe('[권한 액션]', () => {
    it('grantNotificationPermission으로 알림 권한을 부여할 수 있어야 한다', () => {
      const state = useOnboardingStore.getState();
      expect(state.permissions.notificationGranted).toBe(false);

      state.actions.grantNotificationPermission();
      expect(useOnboardingStore.getState().permissions.notificationGranted).toBe(true);
    });

    it('grantLocationPermission으로 위치 권한을 부여할 수 있어야 한다', () => {
      const state = useOnboardingStore.getState();
      expect(state.permissions.locationGranted).toBe(false);

      state.actions.grantLocationPermission();
      expect(useOnboardingStore.getState().permissions.locationGranted).toBe(true);
    });

    it('두 권한을 독립적으로 관리할 수 있어야 한다', () => {
      const state = useOnboardingStore.getState();
      state.actions.grantNotificationPermission();

      const newState = useOnboardingStore.getState();
      expect(newState.permissions.notificationGranted).toBe(true);
      expect(newState.permissions.locationGranted).toBe(false);
    });
  });

  describe('[진행 상태 액션]', () => {
    it('goToStep으로 특정 스텝으로 이동할 수 있어야 한다', () => {
      const state = useOnboardingStore.getState();
      state.actions.goToStep(5);

      expect(useOnboardingStore.getState().currentStep).toBe(5);
    });

    it('goToStep은 1-9 범위만 허용해야 한다', () => {
      const state = useOnboardingStore.getState();

      // 0 입력 → 1로 조정
      state.actions.goToStep(0);
      expect(useOnboardingStore.getState().currentStep).toBe(1);

      // 10 입력 → 9로 조정
      state.actions.goToStep(10);
      expect(useOnboardingStore.getState().currentStep).toBe(9);
    });

    it('nextStep으로 다음 스텝으로 이동할 수 있어야 한다', () => {
      const state = useOnboardingStore.getState();
      expect(state.currentStep).toBe(1);

      state.actions.nextStep();
      expect(useOnboardingStore.getState().currentStep).toBe(2);
    });

    it('nextStep은 스텝 9를 넘지 않아야 한다', () => {
      const state = useOnboardingStore.getState();
      state.actions.goToStep(9);
      state.actions.nextStep();

      expect(useOnboardingStore.getState().currentStep).toBe(9);
    });

    it('previousStep으로 이전 스텝으로 이동할 수 있어야 한다', () => {
      const state = useOnboardingStore.getState();
      state.actions.goToStep(5);
      state.actions.previousStep();

      expect(useOnboardingStore.getState().currentStep).toBe(4);
    });

    it('previousStep은 스텝 1 아래로 내려가지 않아야 한다', () => {
      const state = useOnboardingStore.getState();
      state.actions.previousStep();

      expect(useOnboardingStore.getState().currentStep).toBe(1);
    });

    it('completeOnboarding으로 온보딩을 완료할 수 있어야 한다', () => {
      const state = useOnboardingStore.getState();
      state.actions.completeOnboarding();

      const newState = useOnboardingStore.getState();
      expect(newState.isCompleted).toBe(true);
      expect(newState.currentStep).toBe(9);
    });
  });

  describe('[전체 초기화]', () => {
    it('reset으로 모든 상태를 초기화할 수 있어야 한다', () => {
      const state = useOnboardingStore.getState();

      // 여러 상태를 변경
      state.actions.updateOrigin('집');
      state.actions.updateDestination('회사');
      state.actions.updateArrivalTime('07:00');
      state.actions.goToStep(5);

      // 초기화
      state.actions.reset();

      const resetState = useOnboardingStore.getState();
      expect(resetState.journeySetup.origin).toBe('');
      expect(resetState.journeySetup.destination).toBe('');
      expect(resetState.goalTime.arrivalTime).toBe('09:00');
      expect(resetState.currentStep).toBe(1);
      expect(resetState.isCompleted).toBe(false);
    });
  });

  // NOTE: 편의 훅 (useOnboardingActions, useOnboardingData)은 React component context가 필요하므로
  // 컴포넌트 테스트에서 별도로 검증합니다.
});
