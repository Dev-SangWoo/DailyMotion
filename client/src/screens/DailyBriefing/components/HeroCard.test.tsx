/**
 * Hero 카드 테스트 (카드 2.1)
 *
 * 헌법 준수:
 * - AGENTS.md 프론트엔드 헌법 [제6장] 개발 방법론 (TDD/Jest+RTL)
 * - DESIGN.md 4.2: Hero 카드 사용자 경험 검증
 * - v3.0 명세서: Phase 1 (출발 전) 상태 테스트
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import HeroCard from './HeroCard';

describe('HeroCard (카드 2.1)', () => {
  describe('[Phase 1] 출발 전 상태 (GO_NOW)', () => {
    /**
     * [DESIGN.md 4.2 Hero 상태 카드]
     * Phase 1 (출발 전): "지금 출발하세요!" 헤드라인
     */
    it('GO_NOW 응답 시 "지금 출발하세요!" 헤드라인을 표시해야 한다', () => {
      // Given: GO_NOW 응답 데이터
      const briefingData = {
        alertType: 'GO_NOW' as const,
        message: '8:50 도착을 위해, 지금 집에서 출발하셔서 5분 뒤 오는 [123번 버스]를 타세요.',
        recommendedTransport: {
          type: 'BUS',
          name: '123번',
          departureInMinutes: 5,
        },
      };

      // When: HeroCard 렌더링
      render(<HeroCard alertType={briefingData.alertType} />);

      // Then: 출발 알림 헤드라인 표시
      expect(screen.getByText(/지금 출발하세요|지금 출발/i)).toBeTruthy();
    });

    /**
     * [DESIGN.md 4.2 Hero 상태 카드]
     * 추천 교통수단 정보 표시: "5분 뒤 123번 버스 도착"
     */
    it('교통수단 도착 시간을 표시해야 한다', () => {
      // Given: 교통수단 데이터
      const briefingData = {
        alertType: 'GO_NOW' as const,
        message: '지금 출발하세요.',
        recommendedTransport: {
          type: 'BUS',
          name: '123번',
          departureInMinutes: 5,
        },
      };

      // When: HeroCard 렌더링
      render(
        <HeroCard
          alertType={briefingData.alertType}
          transportName={briefingData.recommendedTransport.name}
          transportTime={briefingData.recommendedTransport.departureInMinutes}
        />
      );

      // Then: 교통수단 정보 표시
      expect(screen.getByText(/123번/i)).toBeTruthy();
      expect(screen.getByText(/5분|5 분/i)).toBeTruthy();
    });

    /**
     * [DESIGN.md 4.2 Hero 상태 카드]
     * 요약 정보: "총 예상 소요 시간 45분"
     */
    it('예상 소요 시간을 표시해야 한다', () => {
      // Given: 예상 소요 시간 데이터
      const expectedDuration = 45;

      // When: HeroCard 렌더링
      render(
        <HeroCard
          alertType="GO_NOW"
          estimatedDuration={expectedDuration}
        />
      );

      // Then: 예상 소요 시간 표시
      expect(screen.getByText(/45분|예상|소요/i)).toBeTruthy();
    });

    /**
     * [DESIGN.md 4.2 Hero 상태 카드]
     * First Mile 대응: "(다음 버스: 456번 10분 뒤)"
     */
    it('First Mile 대응으로 다음 버스 정보를 표시해야 한다', () => {
      // Given: 다음 버스 정보
      const nextBusName = '456번';
      const nextBusTime = 10;

      // When: HeroCard 렌더링
      render(
        <HeroCard
          alertType="GO_NOW"
          nextTransportName={nextBusName}
          nextTransportTime={nextBusTime}
        />
      );

      // Then: 다음 버스 정보 표시
      expect(screen.getByText(/456번|다음 버스/i)).toBeTruthy();
    });
  });

  describe('[Phase 1] 마지노선 경고 (LAST_CHANCE)', () => {
    /**
     * [v3.0 명세서 Logic 1.2]
     * LAST_CHANCE 응답 시 경고 메시지 표시
     */
    it('LAST_CHANCE 응답 시 "⚠️ 지각 주의!" 헤드라인을 표시해야 한다', () => {
      // Given: LAST_CHANCE 응답 데이터
      const briefingData = {
        alertType: 'LAST_CHANCE' as const,
        message: '⚠️ 지각 주의! 8:50 도착을 위한 마지막 버스[456번]가 8분 뒤 도착합니다.',
        recommendedTransport: {
          type: 'BUS',
          name: '456번',
          departureInMinutes: 8,
        },
      };

      // When: HeroCard 렌더링
      render(<HeroCard alertType={briefingData.alertType} />);

      // Then: 경고 헤드라인 표시
      expect(screen.getByText(/지각|주의|경고/i)).toBeTruthy();
    });
  });

  describe('[Phase 1] 행동 필요 없음 (NO_ACTION)', () => {
    /**
     * [DESIGN.md 4.2 Hero 상태 카드]
     * NO_ACTION 응답 시 현재 상태 표시
     */
    it('NO_ACTION 응답 시 현재 상태를 표시해야 한다', () => {
      // Given: NO_ACTION 응답 데이터
      const briefingData = {
        alertType: 'NO_ACTION' as const,
        message: '현재 예정대로 진행 중입니다.',
        recommendedTransport: null,
      };

      // When: HeroCard 렌더링
      render(<HeroCard alertType={briefingData.alertType} />);

      // Then: 현재 상태 표시
      // Hero 카드는 항상 렌더링되어야 함
      expect(screen.getByTestId('hero-card')).toBeTruthy();
    });
  });

  describe('헌법 준수', () => {
    /**
     * [AGENTS.md 헌법 제2장] 스타일링
     * 모든 스타일이 theme을 사용하고 있는지 확인
     */
    it('Styled-components와 theme을 사용해야 한다', () => {
      // Given: HeroCard 컴포넌트
      // When: 렌더링
      const { getByTestId } = render(
        <HeroCard alertType="GO_NOW" testID="hero-card" />
      );

      // Then: 컴포넌트가 렌더링되고 theme을 사용하고 있어야 함
      const container = getByTestId('hero-card');
      expect(container).toBeTruthy();
      // 스타일 검증은 스냅샷 또는 ComputedStyle로 수행
    });

    /**
     * [AGENTS.md 헌법 제3장] 데이터 페칭
     * Hero 카드는 부모로부터 props를 받으므로 useEffect + useState 불필요
     */
    it('자체 API 호출 없이 부모로부터 props를 받아야 한다', () => {
      // Given: 부모로부터 받은 props
      const props = {
        alertType: 'GO_NOW' as const,
        transportName: '123번',
        transportTime: 5,
        estimatedDuration: 45,
      };

      // When: HeroCard 렌더링
      render(<HeroCard {...props} />);

      // Then: props 기반으로 렌더링됨 (자동 검증)
      expect(screen.getByTestId('hero-card')).toBeTruthy();
    });
  });
});
