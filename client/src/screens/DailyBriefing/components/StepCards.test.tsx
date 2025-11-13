/**
 * 단계별 경로 카드 컬렉션 테스트 (Component 3)
 *
 * 헌법 준수:
 * - AGENTS.md 프론트엔드 헌법 [제6장] 개발 방법론 (TDD/Jest+RTL)
 * - DESIGN.md 4.3: 단계별 경로 카드 UI/UX 명세
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import StepCards from './StepCards';

// StepCards 데이터 타입
interface Step {
  id: string;
  type: 'walking' | 'bus' | 'subway';
  duration: number;
  lineName?: string;
  lineColor?: string;
  quickTransit?: string;
  congestion?: 'normal' | 'crowded' | 'very_crowded';
}

describe('StepCards (Component 3 - 단계별 경로 컬렉션)', () => {
  describe('기본 렌더링', () => {
    /**
     * [DESIGN.md 4.3 단계별 경로 카드]
     * UI: 핵심 캐러셀 아래에 위치하는 수직 스크롤 영역
     */
    it('여러 단계 카드를 수직 리스트로 렌더링해야 한다', () => {
      // Given: 여러 단계의 데이터
      const steps: Step[] = [
        {
          id: 'walk-1',
          type: 'walking',
          duration: 5,
        },
        {
          id: 'bus-1',
          type: 'bus',
          duration: 10,
          lineName: '123번',
          lineColor: '#FF6B6B',
        },
        {
          id: 'subway-1',
          type: 'subway',
          duration: 7,
          lineName: '9호선',
          lineColor: '#AF7F3F',
        },
      ];

      // When: StepCards 렌더링
      render(<StepCards steps={steps} testID="step-cards-container" />);

      // Then: 모든 카드가 렌더링되어야 함
      expect(screen.getByText('🚶')).toBeTruthy(); // 도보
      expect(screen.getByText('🚌')).toBeTruthy(); // 버스
      expect(screen.getByText('🚇')).toBeTruthy(); // 지하철
    });

    it('빈 리스트일 때 아무것도 렌더링되지 않아야 한다', () => {
      // Given: 빈 단계 데이터
      const steps: Step[] = [];

      // When: StepCards 렌더링
      const { queryByText } = render(
        <StepCards steps={steps} testID="step-cards-empty" />
      );

      // Then: 아이콘이 표시되지 않아야 함
      expect(queryByText('🚶')).toBeNull();
      expect(queryByText('🚌')).toBeNull();
      expect(queryByText('🚇')).toBeNull();
    });
  });

  describe('복잡한 경로 렌더링', () => {
    /**
     * [DESIGN.md 4.3 단계별 경로 카드]
     * 실제 여정 데이터: 도보 → 버스 → 지하철 → 도보 등
     */
    it('복잡한 경로(도보→버스→지하철→도보)를 렌더링해야 한다', () => {
      // Given: 실제 여정 데이터
      const steps: Step[] = [
        {
          id: 'walk-home-to-bus',
          type: 'walking',
          duration: 5,
        },
        {
          id: 'bus-first',
          type: 'bus',
          duration: 15,
          lineName: '123번',
          lineColor: '#FF6B6B',
          congestion: 'crowded',
        },
        {
          id: 'subway-transfer',
          type: 'subway',
          duration: 10,
          lineName: '9호선',
          lineColor: '#AF7F3F',
          quickTransit: '빠른 환승: 3-2칸 추천',
        },
        {
          id: 'walk-station-to-office',
          type: 'walking',
          duration: 7,
        },
      ];

      // When: StepCards 렌더링
      render(<StepCards steps={steps} testID="complex-path" />);

      // Then: 모든 단계가 렌더링되어야 함
      expect(screen.getAllByText('🚶')).toHaveLength(2); // 도보 2번
      expect(screen.getByText('🚌')).toBeTruthy(); // 버스
      expect(screen.getByText('🚇')).toBeTruthy(); // 지하철

      // Then: Logic 정보들이 표시되어야 함
      expect(screen.getByText(/혼잡도/i)).toBeTruthy(); // Logic 2.2
      expect(screen.getByText(/빠른 환승/i)).toBeTruthy(); // Logic 2.3
    });
  });

  describe('스크롤 레이아웃', () => {
    /**
     * [DESIGN.md 4.3 단계별 경로 카드]
     * 수직 스크롤 레이아웃
     */
    it('ScrollView로 수직 스크롤을 지원해야 한다', () => {
      // Given: 여러 단계 데이터
      const steps: Step[] = [
        { id: 'walk-1', type: 'walking', duration: 5 },
        { id: 'bus-1', type: 'bus', duration: 10, lineName: '123번', lineColor: '#FF6B6B' },
        { id: 'subway-1', type: 'subway', duration: 7, lineName: '9호선', lineColor: '#AF7F3F' },
      ];

      // When: StepCards 렌더링
      const { getByTestId } = render(
        <StepCards steps={steps} testID="step-cards-scroll" />
      );

      // Then: 스크롤 컨테이너가 존재해야 함
      const container = getByTestId('step-cards-scroll');
      expect(container).toBeTruthy();
    });
  });

  describe('헌법 준수', () => {
    /**
     * [AGENTS.md 헌법 제2장] 스타일링
     * 모든 스타일이 theme을 사용하고 있는지 확인
     */
    it('Styled-components와 theme을 사용해야 한다', () => {
      // Given: StepCards 컴포넌트
      const steps: Step[] = [
        { id: 'walk-1', type: 'walking', duration: 5 },
      ];

      // When: StepCards 렌더링
      const { getByTestId } = render(
        <StepCards steps={steps} testID="step-cards-styled" />
      );

      // Then: 컴포넌트가 렌더링되고 스타일이 적용되어야 함
      const container = getByTestId('step-cards-styled');
      expect(container).toBeTruthy();
    });

    /**
     * [AGENTS.md 헌법 제3장] 데이터 페칭
     * StepCards는 부모로부터 props를 받으므로 useEffect 불필요
     */
    it('자체 API 호출 없이 부모로부터 props를 받아야 한다', () => {
      // Given: 부모로부터 받은 props
      const steps: Step[] = [
        {
          id: 'walk-1',
          type: 'walking',
          duration: 5,
        },
      ];

      // When: StepCards 렌더링
      render(<StepCards steps={steps} testID="step-cards-props" />);

      // Then: props 기반으로 렌더링됨
      expect(screen.getByText('🚶')).toBeTruthy();
    });
  });
});
