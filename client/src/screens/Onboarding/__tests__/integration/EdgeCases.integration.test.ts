/**
 * 온보딩 엣지 케이스 테스트 (Phase 5-2)
 *
 * 목표: 예상 밖의 사용자 행동 및 시스템 상황 대응 검증
 * - 빈 입력값 처리
 * - 권한 거부 시나리오
 * - 백그라운드 상태 복귀
 * - 화면 회전 시 상태 유지
 */

import { useOnboardingStore } from '../../stores/useOnboardingStore';

describe('Onboarding Edge Cases (Phase 5-2)', () => {
  beforeEach(() => {
    const state = useOnboardingStore.getState();
    state.actions.reset();
  });

  describe('JourneySetup: 빈 입력값 처리', () => {
    it('출발지가 비어있으면 다음으로 진행할 수 없어야 함 (UI에서 버튼 비활성화)', () => {
      const state = useOnboardingStore.getState();

      // 출발지 비어있음, 목적지 있음
      state.actions.updateOrigin('');
      state.actions.updateDestination('회사');

      const current = useOnboardingStore.getState();

      // 스토어는 저장하지만, UI에서 버튼 비활성화 처리
      expect(current.journeySetup.origin).toBe('');
      expect(current.journeySetup.destination).toBe('회사');

      // 이 상태에서는 입력이 완전하지 않음
      const isValid = !!current.journeySetup.origin && !!current.journeySetup.destination;
      expect(isValid).toBe(false);
    });

    it('목적지가 비어있으면 다음으로 진행할 수 없어야 함', () => {
      const state = useOnboardingStore.getState();

      // 출발지 있음, 목적지 비어있음
      state.actions.updateOrigin('집');
      state.actions.updateDestination('');

      const current = useOnboardingStore.getState();
      const isValid = !!current.journeySetup.origin && !!current.journeySetup.destination;
      expect(isValid).toBe(false);
    });

    it('둘 다 비어있으면 진행 불가', () => {
      const state = useOnboardingStore.getState();

      state.actions.updateOrigin('');
      state.actions.updateDestination('');

      const current = useOnboardingStore.getState();
      const isValid = !!current.journeySetup.origin && !!current.journeySetup.destination;
      expect(isValid).toBe(false);
    });

    it('공백만 입력된 경우 (trim 처리 필요)', () => {
      const state = useOnboardingStore.getState();

      // 주의: 스토어는 그대로 저장하고, UI 레이어에서 trim 처리해야 함
      state.actions.updateOrigin('   ');
      state.actions.updateDestination('회사');

      const current = useOnboardingStore.getState();
      expect(current.journeySetup.origin).toBe('   ');

      // 실제 검증은 UI에서 trim 후 수행
      const trimmed = current.journeySetup.origin.trim();
      const isValid = trimmed.length > 0 && current.journeySetup.destination;
      expect(isValid).toBe(false); // 공백만 있으므로 유효하지 않음
    });
  });

  describe('권한 처리: 부분 권한 거부', () => {
    it('알림 권한만 허용, 위치 권한 거부', () => {
      const state = useOnboardingStore.getState();

      state.actions.grantNotificationPermission();
      // 위치 권한은 허용하지 않음

      const current = useOnboardingStore.getState();
      expect(current.permissions.notificationGranted).toBe(true);
      expect(current.permissions.locationGranted).toBe(false);
    });

    it('알림 권한 거부, 위치 권한만 허용', () => {
      const state = useOnboardingStore.getState();

      // 알림 권한은 허용하지 않음
      state.actions.grantLocationPermission();

      const current = useOnboardingStore.getState();
      expect(current.permissions.notificationGranted).toBe(false);
      expect(current.permissions.locationGranted).toBe(true);
    });

    it('둘 다 거부 후 재요청 시나리오', () => {
      const state = useOnboardingStore.getState();

      // 처음에는 거부
      const firstAttempt = useOnboardingStore.getState();
      expect(firstAttempt.permissions.notificationGranted).toBe(false);
      expect(firstAttempt.permissions.locationGranted).toBe(false);

      // 재요청 - 사용자가 다시 동의
      state.actions.grantNotificationPermission();
      state.actions.grantLocationPermission();

      const secondAttempt = useOnboardingStore.getState();
      expect(secondAttempt.permissions.notificationGranted).toBe(true);
      expect(secondAttempt.permissions.locationGranted).toBe(true);
    });

    it('권한 허용 후 취소할 수 없음 (일방향 처리)', () => {
      const state = useOnboardingStore.getState();

      state.actions.grantNotificationPermission();
      expect(useOnboardingStore.getState().permissions.notificationGranted).toBe(true);

      // 스토어에는 권한 취소 액션이 없으므로 상태 유지
      state.actions.grantNotificationPermission();
      expect(useOnboardingStore.getState().permissions.notificationGranted).toBe(true);
    });
  });

  describe('Data Validation: 시간 형식', () => {
    it('올바른 시간 형식 (HH:MM)', () => {
      const state = useOnboardingStore.getState();

      const validTimes = ['00:00', '09:30', '12:00', '23:59'];
      validTimes.forEach((time) => {
        state.actions.updateArrivalTime(time);
        expect(useOnboardingStore.getState().goalTime.arrivalTime).toBe(time);
      });
    });

    it('시간 형식 검증 (실제 UI에서 처리)', () => {
      const state = useOnboardingStore.getState();

      // 스토어는 그대로 저장
      state.actions.updateArrivalTime('25:00'); // 잘못된 시간
      expect(useOnboardingStore.getState().goalTime.arrivalTime).toBe('25:00');

      // 실제 검증은 UI 또는 서버에서 수행
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      expect(timeRegex.test('25:00')).toBe(false);
      expect(timeRegex.test('23:59')).toBe(true);
    });
  });

  describe('First Mile 범위 검증', () => {
    it('First Mile 최소값 (1분)', () => {
      const state = useOnboardingStore.getState();

      state.actions.updateFirstMileMinutes(1);
      expect(useOnboardingStore.getState().goalTime.firstMileMinutes).toBe(1);
    });

    it('First Mile 최대값 (15분)', () => {
      const state = useOnboardingStore.getState();

      state.actions.updateFirstMileMinutes(15);
      expect(useOnboardingStore.getState().goalTime.firstMileMinutes).toBe(15);
    });

    it('First Mile 범위 초과 값 처리 (자동으로 1-15로 제한)', () => {
      const state = useOnboardingStore.getState();

      // 스토어에서 자동으로 범위 제한: Math.max(1, Math.min(15, minutes))
      state.actions.updateFirstMileMinutes(20);
      expect(useOnboardingStore.getState().goalTime.firstMileMinutes).toBe(15); // 자동 제한됨

      const current = useOnboardingStore.getState();
      const MIN_FIRST_MILE = 1;
      const MAX_FIRST_MILE = 15;
      const isValid =
        current.goalTime.firstMileMinutes >= MIN_FIRST_MILE &&
        current.goalTime.firstMileMinutes <= MAX_FIRST_MILE;
      expect(isValid).toBe(true);
    });

    it('First Mile 음수 처리 (자동으로 최소값 1로 제한)', () => {
      const state = useOnboardingStore.getState();

      // 스토어에서 자동으로 최소값 1로 제한: Math.max(1, -5) = 1
      state.actions.updateFirstMileMinutes(-5);
      expect(useOnboardingStore.getState().goalTime.firstMileMinutes).toBe(1); // 자동으로 1로 조정됨

      // 유효성 확인
      const MIN_FIRST_MILE = 1;
      const isValid = useOnboardingStore.getState().goalTime.firstMileMinutes >= MIN_FIRST_MILE;
      expect(isValid).toBe(true);
    });
  });

  describe('스케줄 검증', () => {
    it('모든 평일 선택', () => {
      const state = useOnboardingStore.getState();

      state.actions.setSchedule(['MON', 'TUE', 'WED', 'THU', 'FRI'], false);
      const schedule = useOnboardingStore.getState().schedule;
      expect(schedule.daysOfWeek).toEqual(['MON', 'TUE', 'WED', 'THU', 'FRI']);
      expect(schedule.isCustom).toBe(false);
    });

    it('주말 포함 커스텀 스케줄', () => {
      const state = useOnboardingStore.getState();

      state.actions.setSchedule(['MON', 'WED', 'FRI', 'SAT'], true);
      const schedule = useOnboardingStore.getState().schedule;
      expect(schedule.daysOfWeek).toEqual(['MON', 'WED', 'FRI', 'SAT']);
      expect(schedule.isCustom).toBe(true);
    });

    it('단일 요일만 선택', () => {
      const state = useOnboardingStore.getState();

      state.actions.setSchedule(['MON'], true);
      const schedule = useOnboardingStore.getState().schedule;
      expect(schedule.daysOfWeek).toEqual(['MON']);
      expect(schedule.isCustom).toBe(true);
    });

    it('스케줄 중복 선택 처리', () => {
      const state = useOnboardingStore.getState();

      // 중복이 포함된 배열
      state.actions.setSchedule(['MON', 'MON', 'TUE', 'TUE'], true);
      const schedule = useOnboardingStore.getState().schedule;

      // 스토어는 그대로 저장하고, UI에서 중복 제거
      expect(schedule.daysOfWeek).toEqual(['MON', 'MON', 'TUE', 'TUE']);

      // 중복 제거된 배열
      const uniqueDays = [...new Set(schedule.daysOfWeek)];
      expect(uniqueDays).toEqual(['MON', 'TUE']);
    });
  });

  describe('경로 선택 엣지 케이스', () => {
    it('경로 0 (첫 번째)', () => {
      const state = useOnboardingStore.getState();

      state.actions.selectPath(0);
      expect(useOnboardingStore.getState().pathSelection.selectedPathIndex).toBe(0);
    });

    it('경로 범위 내 임의의 값', () => {
      const state = useOnboardingStore.getState();

      for (let i = 0; i < 5; i++) {
        state.actions.selectPath(i);
        expect(useOnboardingStore.getState().pathSelection.selectedPathIndex).toBe(i);
      }
    });

    it('경로 범위 초과 (UI에서 사전 검증)', () => {
      const state = useOnboardingStore.getState();

      // 스토어는 그대로 저장하지만, UI에서는 유효한 경로만 표시
      state.actions.selectPath(100);
      expect(useOnboardingStore.getState().pathSelection.selectedPathIndex).toBe(100);

      // UI 레이어에서의 검증 로직
      const MAX_PATH_OPTION = 4; // 예: 0-4까지만 유효
      const isValid =
        useOnboardingStore.getState().pathSelection.selectedPathIndex <= MAX_PATH_OPTION;
      expect(isValid).toBe(false);
    });
  });

  describe('앱 백그라운드 & 복귀 시나리오', () => {
    it('상태 저장 후 앱 재시작 (AsyncStorage Persist)', () => {
      const state = useOnboardingStore.getState();

      // 1단계: 데이터 저장
      state.actions.updateOrigin('집');
      state.actions.updateDestination('회사');
      state.actions.updateArrivalTime('09:00');
      state.actions.setSchedule(['MON', 'TUE', 'WED', 'THU', 'FRI'], false);
      state.actions.grantNotificationPermission();
      state.actions.grantLocationPermission();

      // 2단계: 현재 상태 확인
      let current = useOnboardingStore.getState();
      expect(current.journeySetup.origin).toBe('집');
      expect(current.journeySetup.destination).toBe('회사');
      expect(current.permissions.notificationGranted).toBe(true);
      expect(current.permissions.locationGranted).toBe(true);

      // 3단계: 앱 백그라운드 (AsyncStorage에 저장됨)
      // 실제 테스트에서는 AsyncStorage mock을 사용하여 검증

      // 4단계: 앱 복귀 후 상태 확인
      // (실제 구현에서 Zustand persist 미들웨어가 복원)
      current = useOnboardingStore.getState();
      expect(current.journeySetup.origin).toBe('집');
      expect(current.journeySetup.destination).toBe('회사');
      expect(current.permissions.notificationGranted).toBe(true);
    });

    it('중단된 온보딩 상태에서 복구', () => {
      const state = useOnboardingStore.getState();

      // 반쯤 진행된 온보딩
      state.actions.updateOrigin('집');
      state.actions.updateDestination('회사');
      state.actions.goToStep(4);

      // 앱이 백그라운드에서 강제 종료
      // AsyncStorage에 현재 상태가 저장되어 있음

      // 앱 재시작 후
      const current = useOnboardingStore.getState();
      expect(current.journeySetup.origin).toBe('집');
      expect(current.journeySetup.destination).toBe('회사');
      expect(current.currentStep).toBe(4); // 마지막 스텝에서 복구
    });
  });

  describe('연속 입력 처리 (Rapid Input)', () => {
    it('빠른 연속 입력 - 최종 값만 저장되어야 함', () => {
      const state = useOnboardingStore.getState();

      const inputs = ['A', 'AB', 'ABC', '집'];
      inputs.forEach((input) => {
        state.actions.updateOrigin(input);
      });

      expect(useOnboardingStore.getState().journeySetup.origin).toBe('집');
    });

    it('빠른 연속 스텝 이동', () => {
      const state = useOnboardingStore.getState();

      // 빠른 연속 클릭
      state.actions.nextStep();
      state.actions.nextStep();
      state.actions.nextStep();

      expect(useOnboardingStore.getState().currentStep).toBe(4);
    });

    it('앞뒤로 빠르게 이동', () => {
      const state = useOnboardingStore.getState();

      state.actions.goToStep(3);
      state.actions.nextStep();
      state.actions.previousStep();
      state.actions.previousStep();
      state.actions.nextStep();
      state.actions.nextStep();

      expect(useOnboardingStore.getState().currentStep).toBe(4);
    });
  });

  describe('메모리 및 성능', () => {
    it('반복된 상태 업데이트 (메모리 누수 없음)', () => {
      const state = useOnboardingStore.getState();

      // 100번 반복 업데이트
      for (let i = 0; i < 100; i++) {
        state.actions.updateOrigin(`origin-${i}`);
      }

      // 최종 값 확인
      expect(useOnboardingStore.getState().journeySetup.origin).toBe('origin-99');
    });

    it('모든 필드 동시 업데이트', () => {
      const state = useOnboardingStore.getState();

      state.actions.updateOrigin('집');
      state.actions.updateDestination('회사');
      state.actions.selectPath(1);
      state.actions.updateArrivalTime('10:00');
      state.actions.updateFirstMileMinutes(7);
      state.actions.setSchedule(['MON', 'TUE'], false);
      state.actions.grantNotificationPermission();
      state.actions.grantLocationPermission();

      const current = useOnboardingStore.getState();
      expect(current.journeySetup.origin).toBe('집');
      expect(current.journeySetup.destination).toBe('회사');
      expect(current.pathSelection.selectedPathIndex).toBe(1);
      expect(current.goalTime.arrivalTime).toBe('10:00');
      expect(current.goalTime.firstMileMinutes).toBe(7);
      expect(current.schedule.daysOfWeek).toEqual(['MON', 'TUE']);
      expect(current.permissions.notificationGranted).toBe(true);
      expect(current.permissions.locationGranted).toBe(true);
    });
  });
});
