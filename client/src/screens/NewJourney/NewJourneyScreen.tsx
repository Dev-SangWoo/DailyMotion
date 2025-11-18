/**
 * 새로운 여정 스크린
 *
 * 새로운 여정을 생성하거나 기존 여정을 수정하는 화면입니다.
 * 지도에 여정의 출발지와 목적지를 표시합니다.
 *
 * 헌법 준수:
 * - AGENTS.md [제2장]: Styled-components 사용
 * - CLAUDE.md: 카카오맵 API 활용
 */

import React, { useMemo } from 'react';
import styled from 'styled-components/native';
import { ScrollView, TouchableOpacity } from 'react-native';
import { AppHeader } from '../../components/common/AppHeader';
import { KakaoMapView } from '../../components/kakao/KakaoMapView';
import { theme } from '../../styles/theme';

const Container = styled.View`
  flex: 1;
  background-color: ${theme.colors.background};
`;

const ScrollContent = styled.ScrollView`
  flex: 1;
`;

const Content = styled.View`
  padding: ${theme.spacing.lg}px;
`;

const Title = styled.Text`
  font-size: ${theme.fonts.sizes.xxl}px;
  font-weight: ${theme.fonts.weights.bold};
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.md}px;
`;

const Description = styled.Text`
  font-size: ${theme.fonts.sizes.md}px;
  color: ${theme.colors.textSecondary};
  line-height: 24px;
  margin-bottom: ${theme.spacing.lg}px;
`;

const MapContainer = styled.View`
  margin-bottom: ${theme.spacing.lg}px;
  border-radius: 12px;
  overflow: hidden;
`;

const JourneyCard = styled.View`
  background-color: white;
  border-radius: 12px;
  padding: ${theme.spacing.md}px;
  margin-bottom: ${theme.spacing.md}px;
  border-width: 1px;
  border-color: #e0e0e0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
  elevation: 1;
`;

const JourneyCardHeader = styled.View`
  flex-direction: row;
  align-items: center;
  margin-bottom: ${theme.spacing.sm}px;
`;

const JourneyIcon = styled.Text`
  font-size: 24px;
  margin-right: ${theme.spacing.sm}px;
`;

const JourneyTitle = styled.Text`
  font-size: 16px;
  font-weight: 600;
  color: ${theme.colors.text};
`;

const JourneyLocation = styled.View`
  flex-direction: row;
  align-items: center;
  margin-bottom: 8px;
`;

const LocationLabel = styled.Text`
  font-size: 13px;
  color: ${theme.colors.textSecondary};
  min-width: 50px;
  font-weight: 500;
`;

const LocationText = styled.Text`
  font-size: 13px;
  color: ${theme.colors.text};
  flex: 1;
`;

const TimeInfo = styled.Text`
  font-size: 12px;
  color: ${theme.colors.textSecondary};
  margin-top: ${theme.spacing.xs}px;
`;

const ButtonContainer = styled.View`
  gap: ${theme.spacing.sm}px;
`;

const ActionButton = styled(TouchableOpacity)<{ variant: 'primary' | 'secondary' }>`
  background-color: ${(props) =>
    props.variant === 'primary' ? theme.colors.primary : '#f0f0f0'};
  padding: ${theme.spacing.md}px;
  border-radius: 8px;
  align-items: center;
`;

const ActionButtonText = styled.Text<{ variant: 'primary' | 'secondary' }>`
  font-size: 14px;
  font-weight: 600;
  color: ${(props) => (props.variant === 'primary' ? 'white' : theme.colors.text)};
`;

export default function NewJourneyScreen() {
  /**
   * Mock 여정 데이터
   */
  const journeyMarkers = useMemo(() => {
    return [
      // 출발지 (파랑)
      {
        title: '🏠 집',
        lat: 37.4979,
        lng: 127.0276,
        color: 'blue' as const,
      },
      // 경유지 (노랑)
      {
        title: '☕ 카페',
        lat: 37.5010,
        lng: 127.0300,
        color: 'yellow' as const,
      },
      // 목적지 (초록)
      {
        title: '🏢 회사',
        lat: 37.5100,
        lng: 127.0400,
        color: 'green' as const,
      },
    ];
  }, []);

  // Mock 여정 데이터
  const mockJourneys = [
    {
      id: '1',
      icon: '🏠',
      title: '오전 출근길',
      origin: '서울시 강남구 역삼동',
      destination: '서울시 강남구 선릉로',
      departTime: '07:00',
      arriveTime: '09:00',
      duration: '약 2시간',
    },
    {
      id: '2',
      icon: '🏢',
      title: '퇴근길',
      origin: '서울시 강남구 선릉로',
      destination: '서울시 강남구 역삼동',
      departTime: '18:00',
      arriveTime: '20:00',
      duration: '약 2시간',
    },
  ];

  return (
    <Container>
      <AppHeader />
      <ScrollContent scrollEnabled showsVerticalScrollIndicator={false}>
        <Content>
          <Title>새로운 여정</Title>
          <Description>
            여정을 추가하고 최적의 경로를 확인하세요.
          </Description>

          {/* 지도 표시 */}
          <MapContainer>
            <KakaoMapView
              markers={journeyMarkers}
              centerLat={37.5040}
              centerLng={127.0340}
              height={400}
              zoom={5}
            />
          </MapContainer>

          {/* 저장된 여정들 */}
          {mockJourneys.map((journey) => (
            <JourneyCard key={journey.id}>
              <JourneyCardHeader>
                <JourneyIcon>{journey.icon}</JourneyIcon>
                <JourneyTitle>{journey.title}</JourneyTitle>
              </JourneyCardHeader>

              <JourneyLocation>
                <LocationLabel>출발:</LocationLabel>
                <LocationText>{journey.origin}</LocationText>
              </JourneyLocation>

              <JourneyLocation>
                <LocationLabel>도착:</LocationLabel>
                <LocationText>{journey.destination}</LocationText>
              </JourneyLocation>

              <TimeInfo>
                ⏱️ {journey.departTime} → {journey.arriveTime} ({journey.duration})
              </TimeInfo>

              <ButtonContainer>
                <ActionButton variant="primary" onPress={() => {}}>
                  <ActionButtonText variant="primary">경로 확인</ActionButtonText>
                </ActionButton>
                <ActionButton variant="secondary" onPress={() => {}}>
                  <ActionButtonText variant="secondary">수정</ActionButtonText>
                </ActionButton>
              </ButtonContainer>
            </JourneyCard>
          ))}

          {/* 새 여정 추가 버튼 */}
          <ActionButton
            variant="primary"
            onPress={() => {}}
            style={{ marginTop: theme.spacing.lg }}
          >
            <ActionButtonText variant="primary">+ 새 여정 추가</ActionButtonText>
          </ActionButton>
        </Content>
      </ScrollContent>
    </Container>
  );
}

