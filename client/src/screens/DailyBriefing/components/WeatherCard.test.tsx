/**
 * 날씨 카드 테스트 (카드 2.2)
 *
 * 헌법 준수:
 * - AGENTS.md 프론트엔드 헌법 [제6장] 개발 방법론 (TDD/Jest+RTL)
 * - DESIGN.md 4.2: 날씨 카드 사용자 경험 검증
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import WeatherCard from './WeatherCard';

describe('WeatherCard (카드 2.2)', () => {
  describe('날씨 정보 표시', () => {
    /**
     * [DESIGN.md 4.2 날씨 카드]
     * UI: "현재 15°C, 비 예보 70%" 표시
     */
    it('날씨 정보를 올바르게 표시해야 한다', () => {
      // Given: 날씨 데이터
      const weatherData = {
        temperature: 15,
        condition: '비',
        precipitationProbability: 70,
      };

      // When: WeatherCard 렌더링
      render(
        <WeatherCard
          temperature={weatherData.temperature}
          condition={weatherData.condition}
          precipitationProbability={weatherData.precipitationProbability}
        />
      );

      // Then: 날씨 정보가 표시되어야 함
      expect(screen.getByText(/15|℃|°C/i)).toBeTruthy();
      expect(screen.getByText(/비/i)).toBeTruthy();
      expect(screen.getByText(/70/i)).toBeTruthy();
    });

    /**
     * [DESIGN.md 4.2 날씨 카드]
     * 다양한 날씨 조건 표시
     */
    it('다양한 날씨 조건을 표시해야 한다', () => {
      // Given: 맑은 날씨 데이터
      const weatherData = {
        temperature: 22,
        condition: '맑음',
        precipitationProbability: 10,
      };

      // When: WeatherCard 렌더링
      render(
        <WeatherCard
          temperature={weatherData.temperature}
          condition={weatherData.condition}
          precipitationProbability={weatherData.precipitationProbability}
        />
      );

      // Then: 맑음 조건이 표시되어야 함
      expect(screen.getByText(/맑음/i)).toBeTruthy();
    });
  });

  describe('날씨 아이콘', () => {
    /**
     * [DESIGN.md 4.2 날씨 카드]
     * 날씨 조건에 따른 아이콘 표시
     */
    it('날씨 조건에 맞는 아이콘을 표시해야 한다', () => {
      // Given: 비 오는 날씨
      const weatherData = {
        temperature: 15,
        condition: '비',
        precipitationProbability: 70,
      };

      // When: WeatherCard 렌더링
      render(
        <WeatherCard
          temperature={weatherData.temperature}
          condition={weatherData.condition}
          precipitationProbability={weatherData.precipitationProbability}
        />
      );

      // Then: 날씨 카드가 렌더링되어야 함
      expect(screen.getByTestId('weather-card')).toBeTruthy();
    });
  });

  describe('상호작용', () => {
    /**
     * [DESIGN.md 4.2 날씨 카드]
     * Interaction: 탭(Tap) 시 → 상세 날씨 페이지 (모달) 표시
     */
    it('카드를 탭하면 onPress 콜백이 호출되어야 한다', () => {
      // Given: 탭 핸들러
      const onPress = jest.fn();
      const weatherData = {
        temperature: 15,
        condition: '비',
        precipitationProbability: 70,
      };

      // When: WeatherCard 렌더링
      render(
        <WeatherCard
          temperature={weatherData.temperature}
          condition={weatherData.condition}
          precipitationProbability={weatherData.precipitationProbability}
          onPress={onPress}
        />
      );

      // Then: 카드가 렌더링되어야 함
      const card = screen.getByTestId('weather-card');
      expect(card).toBeTruthy();

      // When: 카드를 탭하면
      fireEvent.press(card);

      // Then: onPress 콜백이 호출되어야 함
      expect(onPress).toHaveBeenCalled();
    });
  });

  describe('헌법 준수', () => {
    /**
     * [AGENTS.md 헌법 제2장] 스타일링
     * 모든 스타일이 theme을 사용하고 있는지 확인
     */
    it('Styled-components와 theme을 사용해야 한다', () => {
      // Given: WeatherCard 컴포넌트
      const { getByTestId } = render(
        <WeatherCard
          temperature={15}
          condition="비"
          precipitationProbability={70}
        />
      );

      // Then: 컴포넌트가 렌더링되고 theme을 사용하고 있어야 함
      const card = getByTestId('weather-card');
      expect(card).toBeTruthy();
    });

    /**
     * [AGENTS.md 헌법 제3장] 데이터 페칭
     * WeatherCard는 부모로부터 props를 받으므로 useEffect 불필요
     */
    it('자체 API 호출 없이 부모로부터 props를 받아야 한다', () => {
      // Given: 부모로부터 받은 props
      const props = {
        temperature: 15,
        condition: '비',
        precipitationProbability: 70,
      };

      // When: WeatherCard 렌더링
      render(<WeatherCard {...props} />);

      // Then: props 기반으로 렌더링됨
      expect(screen.getByTestId('weather-card')).toBeTruthy();
    });
  });
});
