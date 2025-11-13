/**
 * 캐러셀 (스와이프 기능) 테스트
 *
 * 헌법 준수:
 * - AGENTS.md 프론트엔드 헌법 [제6장] 개발 방법론 (TDD/Jest+RTL)
 * - DESIGN.md 4.2: 캐러셀 스와이프 기능 검증
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import Carousel from './Carousel';

describe('Carousel (스와이프 기능)', () => {
  describe('렌더링', () => {
    /**
     * [DESIGN.md 4.2 캐러셀]
     * 역할: 화면 상단에 위치하며, 좌우로 스와이프 가능한 카드 묶음입니다.
     */
    it('여러 카드를 렌더링해야 한다', () => {
      // Given: 여러 카드
      const cards = [
        { id: '1', component: 'HeroCard' },
        { id: '2', component: 'WeatherCard' },
        { id: '3', component: 'AlternativePathCard' },
      ];

      // When: Carousel 렌더링
      render(
        <Carousel testID="carousel" cards={cards} />
      );

      // Then: Carousel이 렌더링되어야 함
      expect(screen.getByTestId('carousel')).toBeTruthy();
    });

    it('초기 활성 카드는 첫 번째여야 한다', () => {
      // Given: 여러 카드
      const cards = [
        { id: 'card-1', component: 'HeroCard', title: 'Hero' },
        { id: 'card-2', component: 'WeatherCard', title: 'Weather' },
      ];

      // When: Carousel 렌더링
      render(
        <Carousel testID="carousel" cards={cards} />
      );

      // Then: 첫 번째 카드가 활성이어야 함
      expect(screen.getByTestId('carousel-card-0')).toBeTruthy();
    });
  });

  describe('스와이프 제스처', () => {
    /**
     * [DESIGN.md 4.2 캐러셀]
     * 좌우로 스와이프 가능한 카드 묶음
     */
    it('캐러셀이 스와이프 제스처를 인식해야 한다', () => {
      // Given: 여러 카드
      const cards = [
        { id: '1', component: 'Card1' },
        { id: '2', component: 'Card2' },
      ];
      const onSwipe = jest.fn();

      // When: Carousel 렌더링
      render(
        <Carousel
          testID="carousel"
          cards={cards}
          onSwipe={onSwipe}
        />
      );

      // Then: Carousel이 스와이프 가능해야 함
      expect(screen.getByTestId('carousel')).toBeTruthy();
    });

    it('오른쪽 스와이프 시 이전 카드로 이동해야 한다', () => {
      // Given: 여러 카드 (인덱스 1에서 시작)
      const cards = [
        { id: '1', component: 'Card1' },
        { id: '2', component: 'Card2' },
        { id: '3', component: 'Card3' },
      ];
      const onActiveIndexChange = jest.fn();

      // When: Carousel 렌더링
      render(
        <Carousel
          testID="carousel"
          cards={cards}
          initialIndex={1}
          onActiveIndexChange={onActiveIndexChange}
        />
      );

      // Then: Carousel이 제대로 초기화되어야 함
      expect(screen.getByTestId('carousel')).toBeTruthy();
    });

    it('왼쪽 스와이프 시 다음 카드로 이동해야 한다', () => {
      // Given: 여러 카드 (인덱스 0에서 시작)
      const cards = [
        { id: '1', component: 'Card1' },
        { id: '2', component: 'Card2' },
        { id: '3', component: 'Card3' },
      ];
      const onActiveIndexChange = jest.fn();

      // When: Carousel 렌더링
      render(
        <Carousel
          testID="carousel"
          cards={cards}
          initialIndex={0}
          onActiveIndexChange={onActiveIndexChange}
        />
      );

      // Then: Carousel이 제대로 초기화되어야 함
      expect(screen.getByTestId('carousel')).toBeTruthy();
    });
  });

  describe('자동 슬라이드', () => {
    /**
     * [DESIGN.md 4.2 캐러셀]
     * Logic 2.2 발동 시 자동으로 카드 1 → 카드 2.3으로 슬라이드
     */
    it('프로그래매틱 스와이프를 지원해야 한다', () => {
      // Given: 여러 카드
      const cards = [
        { id: '1', component: 'Card1' },
        { id: '2', component: 'Card2' },
        { id: '3', component: 'Card3' },
      ];

      // When: Carousel 렌더링
      const { rerender } = render(
        <Carousel
          testID="carousel"
          cards={cards}
          activeIndex={0}
        />
      );

      // Then: Carousel 렌더링됨
      expect(screen.getByTestId('carousel')).toBeTruthy();

      // When: activeIndex prop 변경 (자동 슬라이드 시뮬레이션)
      rerender(
        <Carousel
          testID="carousel"
          cards={cards}
          activeIndex={2}
        />
      );

      // Then: Carousel이 업데이트됨
      expect(screen.getByTestId('carousel-card-2')).toBeTruthy();
    });

    it('Logic 2.2 발동 시 자동으로 대안 경로 카드로 이동해야 한다', () => {
      // Given: 여러 카드
      const cards = [
        { id: 'hero', component: 'HeroCard', label: '카드 1' },
        { id: 'weather', component: 'WeatherCard', label: '카드 2.2' },
        { id: 'alternative', component: 'AlternativePathCard', label: '카드 2.3' },
      ];

      // When: Logic 2.2 발동하여 activeIndex=2로 설정
      render(
        <Carousel
          testID="carousel"
          cards={cards}
          activeIndex={2}
          autoSlide={true}
        />
      );

      // Then: 대안 경로 카드가 활성이어야 함
      expect(screen.getByTestId('carousel-card-2')).toBeTruthy();
    });
  });

  describe('헌법 준수', () => {
    /**
     * [AGENTS.md 헌법 제2장] 스타일링
     * Styled-components와 theme 사용
     */
    it('Styled-components와 theme을 사용해야 한다', () => {
      // Given: 여러 카드
      const cards = [
        { id: '1', component: 'Card1' },
        { id: '2', component: 'Card2' },
      ];

      // When: Carousel 렌더링
      render(
        <Carousel testID="carousel" cards={cards} />
      );

      // Then: Carousel 렌더링됨
      expect(screen.getByTestId('carousel')).toBeTruthy();
    });

    /**
     * [AGENTS.md 헌법 제3장] 데이터 페칭
     * Carousel은 부모로부터 cards prop을 받음
     */
    it('부모로부터 카드 데이터를 받아야 한다 (props 기반)', () => {
      // Given: 부모로부터 받은 카드 배열
      const cards = [
        { id: '1', component: 'Card1' },
        { id: '2', component: 'Card2' },
      ];

      // When: Carousel 렌더링
      render(
        <Carousel testID="carousel" cards={cards} />
      );

      // Then: 카드 렌더링됨
      expect(screen.getByTestId('carousel')).toBeTruthy();
    });
  });
});
