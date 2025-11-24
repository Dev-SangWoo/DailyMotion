/**
 * 날씨 카드 (카드 2.2)
 *
 * 헌법 준수:
 * - AGENTS.md 프론트엔드 헌법 [제2장] 스타일링 (Styled-components)
 * - AGENTS.md 프론트엔드 헌법 [제3장] 데이터 페칭 (부모에서 상태 관리)
 * - DESIGN.md 4.2: 날씨 카드 UI/UX 명세
 */
import React from 'react';
import styled from 'styled-components/native';
import { TouchableOpacity } from 'react-native';
import { theme } from '../../../styles/theme';

// Styled-components: 의미론적 이름 사용 (헌법 제2장 준수)
const Container = styled(TouchableOpacity)`
  background-color: ${theme.colors.surface};
  border-radius: 12px;
  padding: ${theme.spacing.lg}px;
  margin-bottom: ${theme.spacing.md}px;
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.1;
  shadow-radius: 3px;
  elevation: 3;
`;

const HeaderContainer = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: ${theme.spacing.md}px;
`;

const IconContainer = styled.View`
  font-size: ${theme.fonts.sizes.xxl}px;
`;

const WeatherIcon = styled.Text`
  font-size: ${theme.fonts.sizes.xxl}px;
  margin-right: ${theme.spacing.sm}px;
`;

const InfoContainer = styled.View`
  flex: 1;
`;

const TemperatureText = styled.Text`
  font-size: ${theme.fonts.sizes.xl}px;
  font-weight: bold;
  color: ${theme.colors.text};
  line-height: ${theme.fonts.sizes.xl * 1.2}px;
`;

const ConditionText = styled.Text`
  font-size: ${theme.fonts.sizes.md}px;
  color: ${theme.colors.textSecondary};
  margin-top: ${theme.spacing.xs}px;
`;

const DetailContainer = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-top: ${theme.spacing.md}px;
  padding-top: ${theme.spacing.md}px;
  border-top-width: 1px;
  border-top-color: ${theme.colors.border};
`;

const DetailLabel = styled.Text`
  font-size: ${theme.fonts.sizes.sm}px;
  color: ${theme.colors.textSecondary};
`;

const DetailValue = styled.Text`
  font-size: ${theme.fonts.sizes.md}px;
  font-weight: 500;
  color: ${theme.colors.text};
`;

// Props 타입 정의
interface WeatherCardProps {
  temperature: number;
  condition: string; // "맑음", "비", "흐림", etc.
  precipitationProbability: number;
  onPress?: () => void;
  testID?: string;
}

/**
 * 날씨 카드 컴포넌트
 *
 * [DESIGN.md 4.2 날씨 카드]
 * UI: "현재 15°C, 비 예보 70%" 표시
 * Interaction: 탭(Tap) 시 → 상세 날씨 페이지 (모달) 표시
 */
const WeatherCard: React.FC<WeatherCardProps> = ({
  temperature,
  condition,
  precipitationProbability,
  onPress,
  testID = 'weather-card',
}) => {
  // 날씨 조건에 따른 아이콘 결정
  const getWeatherIcon = () => {
    switch (condition) {
      case '맑음':
        return '☀️';
      case '흐림':
        return '☁️';
      case '비':
        return '🌧️';
      case '눈':
        return '❄️';
      case '강한 바람':
        return '💨';
      case '안개':
        return '🌫️';
      default:
        return '🌤️';
    }
  };

  return (
    <Container testID={testID} onPress={onPress} activeOpacity={0.7}>
      {/* 헤더: 아이콘 + 온도 */}
      <HeaderContainer>
        <IconContainer>
          <WeatherIcon>{getWeatherIcon()}</WeatherIcon>
        </IconContainer>
        <InfoContainer>
          <TemperatureText>{temperature}°C</TemperatureText>
          <ConditionText>{condition}</ConditionText>
        </InfoContainer>
      </HeaderContainer>

      {/* 상세 정보: 강수 확률 */}
      <DetailContainer>
        <DetailLabel>강수 확률</DetailLabel>
        <DetailValue>{precipitationProbability}%</DetailValue>
      </DetailContainer>
    </Container>
  );
};

export default WeatherCard;
