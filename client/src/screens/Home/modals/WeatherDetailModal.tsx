/**
 * 날씨 상세 정보 모달
 *
 * 현재 날씨의 상세 정보와 시간별 예보를 표시합니다.
 * - 현재 날씨 (온도, 습도, 풍속, 강수 확률)
 * - 시간별 예보
 * - 주의사항
 *
 * 헌법 준수:
 * - AGENTS.md [제2장]: Styled-components 사용
 */

import React from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import styled from 'styled-components/native';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../../styles/theme';

const Container = styled.View`
  flex: 1;
  background-color: rgba(0, 0, 0, 0.5);
  justify-content: flex-end;
`;

const ModalContent = styled.View`
  background-color: white;
  border-radius: ${theme.borderRadius.xl}px ${theme.borderRadius.xl}px 0 0;
  padding: ${theme.spacing.lg}px;
  min-height: 70%;
  max-height: 90%;
`;

const DragIndicator = styled.View`
  width: 40px;
  height: 4px;
  background-color: #E0E0E0;
  border-radius: 2px;
  align-self: center;
  margin-bottom: ${theme.spacing.lg}px;
`;

const ModalTitle = styled.Text`
  font-size: ${theme.fonts.sizes.xl}px;
  font-weight: 700;
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.lg}px;
`;

const CurrentWeatherCard = styled.View`
  background-color: #40B0FF;
  border-radius: ${theme.borderRadius.lg}px;
  padding: ${theme.spacing.lg}px;
  margin-bottom: ${theme.spacing.lg}px;
  align-items: center;
`;

const WeatherIcon = styled.Text`
  font-size: 64px;
  margin-bottom: ${theme.spacing.md}px;
`;

const Temperature = styled.Text`
  font-size: ${theme.fonts.sizes.xl}px;
  font-weight: 700;
  color: white;
  margin-bottom: ${theme.spacing.xs}px;
`;

const WeatherDescription = styled.Text`
  font-size: ${theme.fonts.sizes.md}px;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: ${theme.spacing.lg}px;
`;

const WeatherDetailsGrid = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: ${theme.spacing.md}px;
`;

const WeatherDetail = styled.View`
  flex: 1;
  min-width: 45%;
  background-color: rgba(64, 176, 255, 0.1);
  border-radius: ${theme.borderRadius.md}px;
  padding: ${theme.spacing.md}px;
  align-items: center;
`;

const DetailLabel = styled.Text`
  font-size: ${theme.fonts.sizes.xs}px;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: ${theme.spacing.xs}px;
`;

const DetailValue = styled.Text`
  font-size: ${theme.fonts.sizes.lg}px;
  font-weight: 700;
  color: white;
`;

const SectionTitle = styled.Text`
  font-size: ${theme.fonts.sizes.lg}px;
  font-weight: 700;
  color: ${theme.colors.text};
  margin-top: ${theme.spacing.lg}px;
  margin-bottom: ${theme.spacing.md}px;
`;

const HourlyForecastContainer = styled.ScrollView`
  margin-bottom: ${theme.spacing.lg}px;
`;

const HourlyCard = styled.View`
  background-color: #F5F5F5;
  border-radius: ${theme.borderRadius.md}px;
  padding: ${theme.spacing.md}px;
  margin-right: ${theme.spacing.md}px;
  width: 90px;
  align-items: center;
`;

const HourlyTime = styled.Text`
  font-size: ${theme.fonts.sizes.xs}px;
  color: ${theme.colors.textSecondary};
  margin-bottom: ${theme.spacing.xs}px;
`;

const HourlyIcon = styled.Text`
  font-size: 28px;
  margin-bottom: ${theme.spacing.xs}px;
`;

const HourlyTemp = styled.Text`
  font-size: ${theme.fonts.sizes.sm}px;
  font-weight: 600;
  color: ${theme.colors.text};
`;

const WarningCard = styled.View`
  background-color: #FFF3E0;
  border-left-width: 4px;
  border-left-color: #FF9800;
  border-radius: ${theme.borderRadius.md}px;
  padding: ${theme.spacing.md}px;
  margin-bottom: ${theme.spacing.lg}px;
`;

const WarningIcon = styled.Text`
  font-size: 24px;
  margin-bottom: ${theme.spacing.xs}px;
`;

const WarningTitle = styled.Text`
  font-size: ${theme.fonts.sizes.sm}px;
  font-weight: 700;
  color: #E65100;
  margin-bottom: ${theme.spacing.xs}px;
`;

const WarningText = styled.Text`
  font-size: ${theme.fonts.sizes.xs}px;
  color: #BF360C;
  line-height: ${theme.fonts.sizes.xs * 1.5}px;
`;

const CloseButton = styled.View`
  background-color: ${theme.colors.primary};
  padding: ${theme.spacing.md}px;
  border-radius: ${theme.borderRadius.lg}px;
  margin-top: ${theme.spacing.lg}px;
  align-items: center;
`;

const CloseButtonText = styled.Text`
  color: white;
  font-size: ${theme.fonts.sizes.md}px;
  font-weight: 700;
`;

const WeatherDetailModal: React.FC = () => {
  const navigation = useNavigation();

  // 목업 데이터
  const currentWeather = {
    temperature: 18,
    description: '흐린 후 비',
    humidity: 75,
    windSpeed: 12,
    precipitation: 80,
    uvIndex: 3,
    visibility: 8,
  };

  const hourlyForecast = [
    { time: '지금', temp: 18, icon: '☁️' },
    { time: '13시', temp: 19, icon: '☁️' },
    { time: '14시', temp: 19, icon: '🌧️' },
    { time: '15시', temp: 17, icon: '🌧️' },
    { time: '16시', temp: 16, icon: '🌧️' },
    { time: '17시', temp: 15, icon: '☁️' },
  ];

  const warnings = [
    {
      icon: '☂️',
      title: '우산 필수',
      text: '오후 강수확률이 높으니 우산을 꼭 챙기세요.',
    },
    {
      icon: '🌬️',
      title: '강한 바람',
      text: '풍속 12m/s로 외출 시 주의가 필요합니다.',
    },
  ];

  return (
    <Container>
      <ModalContent>
        <DragIndicator />
        <ModalTitle>날씨 정보</ModalTitle>

        {/* 현재 날씨 카드 */}
        <CurrentWeatherCard>
          <WeatherIcon>🌧️</WeatherIcon>
          <Temperature>{currentWeather.temperature}°C</Temperature>
          <WeatherDescription>{currentWeather.description}</WeatherDescription>
          <WeatherDetailsGrid>
            <WeatherDetail>
              <DetailLabel>습도</DetailLabel>
              <DetailValue>{currentWeather.humidity}%</DetailValue>
            </WeatherDetail>
            <WeatherDetail>
              <DetailLabel>풍속</DetailLabel>
              <DetailValue>{currentWeather.windSpeed}m/s</DetailValue>
            </WeatherDetail>
            <WeatherDetail>
              <DetailLabel>강수확률</DetailLabel>
              <DetailValue>{currentWeather.precipitation}%</DetailValue>
            </WeatherDetail>
            <WeatherDetail>
              <DetailLabel>자외선</DetailLabel>
              <DetailValue>{currentWeather.uvIndex}</DetailValue>
            </WeatherDetail>
          </WeatherDetailsGrid>
        </CurrentWeatherCard>

        {/* 시간별 예보 */}
        <SectionTitle>시간별 예보</SectionTitle>
        <HourlyForecastContainer horizontal showsHorizontalScrollIndicator={false}>
          {hourlyForecast.map((item, index) => (
            <HourlyCard key={index}>
              <HourlyTime>{item.time}</HourlyTime>
              <HourlyIcon>{item.icon}</HourlyIcon>
              <HourlyTemp>{item.temp}°C</HourlyTemp>
            </HourlyCard>
          ))}
        </HourlyForecastContainer>

        {/* 날씨 주의사항 */}
        <SectionTitle>주의사항</SectionTitle>
        {warnings.map((warning, index) => (
          <WarningCard key={index}>
            <WarningIcon>{warning.icon}</WarningIcon>
            <WarningTitle>{warning.title}</WarningTitle>
            <WarningText>{warning.text}</WarningText>
          </WarningCard>
        ))}

        {/* 닫기 버튼 */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <CloseButton>
            <CloseButtonText>닫기</CloseButtonText>
          </CloseButton>
        </TouchableOpacity>
      </ModalContent>
    </Container>
  );
};

export default WeatherDetailModal;
