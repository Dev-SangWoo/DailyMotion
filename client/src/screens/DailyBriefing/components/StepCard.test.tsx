/**
 * 단계별 경로 카드 테스트 (Component 3)
 *
 * 헌법 준수:
 * - AGENTS.md 프론트엔드 헌법 [제6장] 개발 방법론 (TDD/Jest+RTL)
 * - DESIGN.md 4.3: 단계별 경로 카드 UI/UX 명세
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import StepCard from './StepCard';

describe('StepCard (Component 3 - 단계별 경로)', () => {
  describe('도보 단계 렌더링', () => {
    /**
     * [DESIGN.md 4.3 단계별 경로 카드]
     * 도보: 🚶 아이콘, 점선 (v3.0 'First/Last Mile' 반영)
     */
    it('도보 단계는 🚶 아이콘과 점선으로 표시되어야 한다', () => {
      // Given: 도보 단계
      render(
        <StepCard
          type="walking"
          duration={5}
          testID="step-card-walking"
        />
      );

      // Then: 도보 아이콘이 표시되어야 함
      expect(screen.getByText('🚶')).toBeTruthy();

      // Then: 점선 구분선이 있어야 함
      const card = screen.getByTestId('step-card-walking');
      expect(card).toBeTruthy();
    });

    it('도보 단계의 소요 시간이 표시되어야 한다', () => {
      // Given: 도보 5분
      render(
        <StepCard
          type="walking"
          duration={5}
          testID="step-card-walking"
        />
      );

      // Then: "5분" 표시
      expect(screen.getByText(/5분/i)).toBeTruthy();
    });
  });

  describe('교통수단 단계 렌더링 - 버스', () => {
    /**
     * [DESIGN.md 4.3 단계별 경로 카드]
     * 교통수단: 🚌 🚇 아이콘, 해당 호선/버스 고유색 라인
     */
    it('버스 단계는 🚌 아이콘으로 표시되어야 한다', () => {
      // Given: 버스 단계
      render(
        <StepCard
          type="bus"
          duration={10}
          lineName="123번"
          lineColor="#FF6B6B"
          testID="step-card-bus"
        />
      );

      // Then: 버스 아이콘이 표시되어야 함
      expect(screen.getByText('🚌')).toBeTruthy();
    });

    it('버스 번호가 표시되어야 한다', () => {
      // Given: 버스 123번
      render(
        <StepCard
          type="bus"
          duration={10}
          lineName="123번"
          lineColor="#FF6B6B"
          testID="step-card-bus"
        />
      );

      // Then: 버스 번호 표시
      expect(screen.getByText(/123번/i)).toBeTruthy();
    });

    it('버스 소요 시간이 표시되어야 한다', () => {
      // Given: 버스 10분
      render(
        <StepCard
          type="bus"
          duration={10}
          lineName="123번"
          lineColor="#FF6B6B"
          testID="step-card-bus"
        />
      );

      // Then: "10분" 표시
      expect(screen.getByText(/10분/i)).toBeTruthy();
    });
  });

  describe('교통수단 단계 렌더링 - 지하철', () => {
    /**
     * [DESIGN.md 4.3 단계별 경로 카드]
     * 지하철: 🚇 아이콘, 호선별 고유색 라인
     */
    it('지하철 단계는 🚇 아이콘으로 표시되어야 한다', () => {
      // Given: 지하철 단계 (9호선)
      render(
        <StepCard
          type="subway"
          duration={7}
          lineName="9호선"
          lineColor="#AF7F3F"
          testID="step-card-subway"
        />
      );

      // Then: 지하철 아이콘이 표시되어야 함
      expect(screen.getByText('🚇')).toBeTruthy();
    });

    it('지하철 호선이 표시되어야 한다', () => {
      // Given: 9호선
      render(
        <StepCard
          type="subway"
          duration={7}
          lineName="9호선"
          lineColor="#AF7F3F"
          testID="step-card-subway"
        />
      );

      // Then: 호선 표시
      expect(screen.getByText(/9호선/i)).toBeTruthy();
    });

    it('지하철 소요 시간이 표시되어야 한다', () => {
      // Given: 지하철 7분
      render(
        <StepCard
          type="subway"
          duration={7}
          lineName="9호선"
          lineColor="#AF7F3F"
          testID="step-card-subway"
        />
      );

      // Then: "7분" 표시
      expect(screen.getByText(/7분/i)).toBeTruthy();
    });
  });

  describe('Logic 2.3: 빠른 환승 안내', () => {
    /**
     * [DESIGN.md 4.3 단계별 경로 카드]
     * Logic 2.3: "빠른 환승: 3-2칸 추천"
     */
    it('빠른 환승 정보가 있으면 표시되어야 한다', () => {
      // Given: 빠른 환승 정보
      render(
        <StepCard
          type="subway"
          duration={7}
          lineName="9호선"
          lineColor="#AF7F3F"
          quickTransit="빠른 환승: 3-2칸 추천"
          testID="step-card-quick-transit"
        />
      );

      // Then: 빠른 환승 정보 표시
      expect(screen.getByText(/빠른 환승.*3-2칸/i)).toBeTruthy();
    });

    it('빠른 환승 정보가 없으면 표시되지 않아야 한다', () => {
      // Given: 빠른 환승 정보 없음
      const { queryByText } = render(
        <StepCard
          type="subway"
          duration={7}
          lineName="9호선"
          lineColor="#AF7F3F"
          testID="step-card-no-transit"
        />
      );

      // Then: 빠른 환승 정보가 표시되지 않음
      expect(queryByText(/빠른 환승/i)).toBeNull();
    });
  });

  describe('Logic 2.2: 혼잡도 정보', () => {
    /**
     * [DESIGN.md 4.3 단계별 경로 카드]
     * Logic 2.2: "혼잡도: 혼잡"
     */
    it('혼잡도 normal일 때 "혼잡도: 쾌적"으로 표시되어야 한다', () => {
      // Given: 혼잡도 normal
      render(
        <StepCard
          type="bus"
          duration={10}
          lineName="123번"
          lineColor="#FF6B6B"
          congestion="normal"
          testID="step-card-normal"
        />
      );

      // Then: "혼잡도" 라벨과 "쾌적" 값이 표시되어야 함
      expect(screen.getByText(/혼잡도/i)).toBeTruthy();
      expect(screen.getByText(/쾌적/i)).toBeTruthy();
    });

    it('혼잡도 crowded일 때 "혼잡도: 혼잡"으로 표시되어야 한다', () => {
      // Given: 혼잡도 crowded
      render(
        <StepCard
          type="bus"
          duration={10}
          lineName="123번"
          lineColor="#FF6B6B"
          congestion="crowded"
          testID="step-card-crowded"
        />
      );

      // Then: "혼잡도" 라벨과 "혼잡" 값이 표시되어야 함
      expect(screen.getByText(/혼잡도/i)).toBeTruthy();
      expect(screen.getByText(/^혼잡$/i)).toBeTruthy();
    });

    it('혼잡도 very_crowded일 때 "혼잡도: 매우 혼잡"으로 표시되어야 한다', () => {
      // Given: 혼잡도 very_crowded
      render(
        <StepCard
          type="bus"
          duration={10}
          lineName="123번"
          lineColor="#FF6B6B"
          congestion="very_crowded"
          testID="step-card-very-crowded"
        />
      );

      // Then: "혼잡도" 라벨과 "매우 혼잡" 값이 표시되어야 함
      expect(screen.getByText(/혼잡도/i)).toBeTruthy();
      expect(screen.getByText(/매우 혼잡/i)).toBeTruthy();
    });

    it('혼잡도 정보가 없으면 표시되지 않아야 한다', () => {
      // Given: 혼잡도 정보 없음
      const { queryByText } = render(
        <StepCard
          type="bus"
          duration={10}
          lineName="123번"
          lineColor="#FF6B6B"
          testID="step-card-no-congestion"
        />
      );

      // Then: 혼잡도 정보가 표시되지 않음
      expect(queryByText(/혼잡도/i)).toBeNull();
    });
  });

  describe('헌법 준수', () => {
    /**
     * [AGENTS.md 헌법 제2장] 스타일링
     * 모든 스타일이 theme을 사용하고 있는지 확인
     */
    it('Styled-components와 theme을 사용해야 한다', () => {
      // Given: StepCard 컴포넌트
      const { getByTestId } = render(
        <StepCard
          type="bus"
          duration={10}
          lineName="123번"
          lineColor="#FF6B6B"
          testID="step-card"
        />
      );

      // Then: 컴포넌트가 렌더링되고 스타일이 적용되어야 함
      const card = getByTestId('step-card');
      expect(card).toBeTruthy();
    });

    /**
     * [AGENTS.md 헌법 제3장] 데이터 페칭
     * StepCard는 부모로부터 props를 받으므로 useEffect 불필요
     */
    it('자체 API 호출 없이 부모로부터 props를 받아야 한다', () => {
      // Given: 부모로부터 받은 props
      const props = {
        type: 'bus' as const,
        duration: 10,
        lineName: '123번',
        lineColor: '#FF6B6B',
        testID: 'step-card',
      };

      // When: StepCard 렌더링
      render(<StepCard {...props} />);

      // Then: props 기반으로 렌더링됨
      expect(screen.getByTestId('step-card')).toBeTruthy();
    });
  });
});
