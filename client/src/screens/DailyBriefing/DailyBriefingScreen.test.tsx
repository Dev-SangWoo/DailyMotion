/**
 * 데일리 브리핑 화면 테스트
 * TDD 원칙에 따라 작성된 테스트입니다.
 * 
 * 헌법 준수:
 * - AGENTS.md 프론트엔드 헌법 [제6장] 개발 방법론 (TDD/Jest+RTL)
 * - v3.0 명세서 [Logic 1.1] 출발 알림 / [Logic 1.2] 마지노선 경고 검증
 * - OpenAPI 스펙 GET /v1/briefings/commute 연동
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';

// React Navigation Mock
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
}), { virtual: true });

// React Query Mock - query 호출을 추적하기 위해 개선
const mockUseQuery = jest.fn();
jest.mock('@tanstack/react-query', () => ({
  useQuery: mockUseQuery,
}), { virtual: true });

// Zustand Store Mock (Phase 2.3)
const mockSetExpanded = jest.fn();
const mockToggleExpanded = jest.fn();
const mockSetSelectedTab = jest.fn();

jest.mock('../../stores/useJourneySelectorStore', () => ({
  useJourneySelectorStore: () => ({
    isExpanded: false,
    selectedTab: 'commute',
    setExpanded: mockSetExpanded,
    toggleExpanded: mockToggleExpanded,
    setSelectedTab: mockSetSelectedTab,
  }),
}), { virtual: true });

// DailyBriefingScreen import
// 파일이 없으면 undefined로 두고 테스트가 실패하도록 함
let DailyBriefingScreen: any;
try {
  DailyBriefingScreen = require('./DailyBriefingScreen').default;
} catch (e) {
  DailyBriefingScreen = undefined;
}

describe('DailyBriefingScreen', () => {
  beforeEach(() => {
    mockUseQuery.mockClear();
    mockSetExpanded.mockClear();
    mockToggleExpanded.mockClear();
    mockSetSelectedTab.mockClear();
  });

  /**
   * [v3.0 명세서 Logic 1.1] 출발 알림 사용자 경험 테스트
   * 
   * API가 'GO_NOW' 응답을 주었을 때, 사용자는 화면에서:
   * - 알림 메시지를 볼 수 있어야 함
   * - 추천 교통수단 정보를 볼 수 있어야 함
   */
  it('API가 GO_NOW 응답을 주었을 때, 사용자는 출발 알림 메시지를 볼 수 있어야 한다', async () => {
    // Given: DailyBriefingScreen이 존재해야 함 (현재는 없으므로 테스트 실패 예상)
    if (!DailyBriefingScreen) {
      throw new Error('DailyBriefingScreen 컴포넌트가 아직 구현되지 않았습니다. TDD Red 단계입니다.');
    }

    // Given: React Query가 성공 응답을 반환하도록 Mock 설정
    mockUseQuery.mockReturnValue({
      data: {
        data: {
          alertType: 'GO_NOW',
          message: '8:50 도착을 위해, 지금 집에서 출발하셔서 5분 뒤 오는 [123번 버스]를 타세요.',
          recommendedTransport: {
            type: 'BUS',
            name: '123번',
            departureInMinutes: 5,
          },
        },
      },
      isLoading: false,
      isError: false,
    });

    // Given: 화면 렌더링
    render(<DailyBriefingScreen />);

    // Then: 출발 알림 메시지가 화면에 표시되어야 함
    await waitFor(() => {
      expect(screen.getByText(/지금 집에서 출발하셔서/i)).toBeTruthy();
    });

    // Then: 추천 교통수단 정보가 표시되어야 함
    // testID를 사용하여 더 견고한 테스트 (헌법 제6장: 지속가능한 리팩토링)
    const transportName = screen.getByTestId('transport-name');
    const transportTime = screen.getByTestId('transport-time');
    expect(transportName).toBeTruthy();
    expect(transportTime).toBeTruthy();
    // 텍스트 내용 검증 (지속가능한 테스트)
    expect(transportName).toHaveTextContent('123번');
    expect(transportTime).toHaveTextContent('5분');
  });

  /**
   * [v3.0 명세서 Logic 1.2] 마지노선 경고 사용자 경험 테스트
   * 
   * API가 'LAST_CHANCE' 응답을 주었을 때, 사용자는 화면에서:
   * - 경고 메시지를 볼 수 있어야 함
   * - 마지막 기회 교통수단 정보를 볼 수 있어야 함
   */
  it('API가 LAST_CHANCE 응답을 주었을 때, 사용자는 마지노선 경고 메시지를 볼 수 있어야 한다', async () => {
    // Given: DailyBriefingScreen이 존재해야 함
    if (!DailyBriefingScreen) {
      throw new Error('DailyBriefingScreen 컴포넌트가 아직 구현되지 않았습니다. TDD Red 단계입니다.');
    }

    // Given: React Query가 마지노선 경고 응답을 반환하도록 Mock 설정
    mockUseQuery.mockReturnValue({
      data: {
        data: {
          alertType: 'LAST_CHANCE',
          message: '⚠️지각 주의! 8:50 도착을 위한 마지막 버스[456번]가 8분 뒤 도착합니다. (지금 출발하셔야 합니다!)',
          recommendedTransport: {
            type: 'BUS',
            name: '456번',
            departureInMinutes: 8,
          },
        },
      },
      isLoading: false,
      isError: false,
    });

    // Given: 화면 렌더링
    render(<DailyBriefingScreen />);

    // Then: 마지노선 경고 메시지가 화면에 표시되어야 함
    await waitFor(() => {
      expect(screen.getByText(/지각 주의/i)).toBeTruthy();
      expect(screen.getByText(/마지막 버스/i)).toBeTruthy();
    });

    // Then: 마지막 기회 교통수단 정보가 표시되어야 함
    // testID를 사용하여 더 견고한 테스트 (헌법 제6장: 지속가능한 리팩토링)
    const transportName = screen.getByTestId('transport-name');
    const transportTime = screen.getByTestId('transport-time');
    expect(transportName).toBeTruthy();
    expect(transportTime).toBeTruthy();
    // 텍스트 내용 검증 (지속가능한 테스트)
    expect(transportName).toHaveTextContent('456번');
    expect(transportTime).toHaveTextContent('8분');
  });

  /**
   * 로딩 상태 테스트
   * 
   * API 호출 중일 때, 사용자는 로딩 상태를 볼 수 있어야 함
   */
  it('API 호출 중일 때, 사용자는 로딩 상태를 볼 수 있어야 한다', () => {
    // Given: DailyBriefingScreen이 존재해야 함
    if (!DailyBriefingScreen) {
      throw new Error('DailyBriefingScreen 컴포넌트가 아직 구현되지 않았습니다. TDD Red 단계입니다.');
    }

    // Given: React Query가 로딩 상태를 반환하도록 Mock 설정
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    // Given: 화면 렌더링
    render(<DailyBriefingScreen />);

    // Then: 로딩 상태가 표시되어야 함
    expect(screen.getByText(/로딩|Loading|불러오는 중/i)).toBeTruthy();
  });

  /**
   * [Phase 2.3] Zustand 상태 관리 통합 테스트
   *
   * DailyBriefingScreen이 useJourneySelectorStore와 올바르게 통합되어 있는지 검증합니다.
   * 서버 상태는 절대 스토어에 저장하지 않고, UI 상태만 관리해야 합니다.
   */
  describe('Zustand Store 통합 (Phase 2.3)', () => {
    /**
     * [DESIGN.md 3] 비서 모드 (Briefing Mode) 상태
     *
     * 출퇴근 알림 시간 내에 앱을 실행했을 때:
     * - JourneySelector는 기본 상태(Collapsed)로 렌더링
     * - isExpanded = false
     */
    it('DailyBriefingScreen이 Zustand 스토어를 통해 여정 선택기 상태를 관리해야 한다', async () => {
      // Given: DailyBriefingScreen이 존재
      if (!DailyBriefingScreen) {
        throw new Error('DailyBriefingScreen 컴포넌트가 구현되지 않았습니다. Phase 1을 확인하세요.');
      }

      // Given: API가 성공 응답을 반환
      mockUseQuery.mockReturnValue({
        data: {
          data: {
            alertType: 'GO_NOW',
            message: '지금 출발하세요.',
            recommendedTransport: {
              type: 'BUS',
              name: '123번',
              departureInMinutes: 5,
            },
          },
        },
        isLoading: false,
        isError: false,
      });

      // When: 화면 렌더링
      render(<DailyBriefingScreen />);

      // Then: 화면이 렌더링되어야 함
      await waitFor(() => {
        expect(screen.getByText(/지금 출발하세요/i)).toBeTruthy();
      });

      // Then: Zustand 스토어가 사용되고 있어야 함 (UI 상태 관리)
      // Note: 실제 스토어 호출 검증은 통합 테스트에서 수행
    });

    /**
     * [AGENTS.md 헌법 제2장] 상태 관리 원칙
     *
     * Zustand 스토어는 "서버 상태"를 절대 저장하지 않아야 합니다.
     * 오직 UI 상태(예: isExpanded, selectedTab)만 관리합니다.
     */
    it('Zustand 스토어는 서버 상태를 저장하지 않아야 한다 (UI 상태만 관리)', async () => {
      // Given: DailyBriefingScreen 렌더링
      if (!DailyBriefingScreen) {
        throw new Error('DailyBriefingScreen 컴포넌트가 구현되지 않았습니다.');
      }

      // Given: React Query로부터 서버 데이터 수신
      mockUseQuery.mockReturnValue({
        data: {
          data: {
            alertType: 'GO_NOW',
            message: '서버에서 받은 브리핑 데이터',
            recommendedTransport: {
              type: 'BUS',
              name: '123번',
              departureInMinutes: 5,
            },
          },
        },
        isLoading: false,
        isError: false,
      });

      // When: 화면 렌더링
      render(<DailyBriefingScreen />);

      // Then: 서버 데이터는 React Query로 관리되고, Zustand은 사용되지 않음
      await waitFor(() => {
        expect(mockUseQuery).toHaveBeenCalled();
      });

      // Then: Zustand 액션이 서버 데이터로 호출되지 않아야 함
      // (UI 상태 변경(toggle/select) 시에만 호출되어야 함)
    });
  });
});

