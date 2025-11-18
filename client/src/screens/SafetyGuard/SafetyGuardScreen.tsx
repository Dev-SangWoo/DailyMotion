/**
 * 세이프티가드 스크린
 *
 * 위험 지역과 안전한 경로를 지도에 표시합니다.
 * - 위험 지역: 빨간색 마커
 * - 안전 경로: 초록색 마커
 *
 * 헌법 준수:
 * - AGENTS.md [제2장]: Styled-components 사용
 * - CLAUDE.md: 카카오맵 API 활용
 */

import React, { useMemo } from 'react';
import styled from 'styled-components/native';
import { ScrollView } from 'react-native';
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

const SectionTitle = styled.Text`
  font-size: ${theme.fonts.sizes.lg}px;
  font-weight: ${theme.fonts.weights.bold};
  color: ${theme.colors.text};
  margin-top: ${theme.spacing.lg}px;
  margin-bottom: ${theme.spacing.md}px;
`;

const InfoBox = styled.View<{ bgColor: string; borderColor: string }>`
  background-color: ${(props) => props.bgColor};
  border-left-width: 4px;
  border-left-color: ${(props) => props.borderColor};
  padding: ${theme.spacing.md}px;
  border-radius: 8px;
  margin-bottom: ${theme.spacing.sm}px;
`;

const InfoText = styled.Text`
  font-size: ${theme.fonts.sizes.sm}px;
  color: ${theme.colors.text};
  font-weight: 500;
`;

export default function SafetyGuardScreen() {
  /**
   * Mock 위험 지역 및 안전 경로 데이터
   */
  const safetyMarkers = useMemo(() => {
    return [
      // 위험 지역 (빨강)
      {
        title: '⚠️ 교통사고 다발지역',
        lat: 37.4979,
        lng: 127.0276,
        color: 'red' as const,
      },
      {
        title: '⚠️ 치안 취약 지역',
        lat: 37.4850,
        lng: 127.0100,
        color: 'red' as const,
      },
      // 안전 경로 (초록)
      {
        title: '✅ 안전 경로 - 강남역',
        lat: 37.4979,
        lng: 127.0276,
        color: 'green' as const,
      },
      {
        title: '✅ 밝은 거리',
        lat: 37.5100,
        lng: 127.0400,
        color: 'green' as const,
      },
    ];
  }, []);

  return (
    <Container>
      <AppHeader />
      <ScrollContent scrollEnabled showsVerticalScrollIndicator={false}>
        <Content>
          <Title>세이프티가드</Title>
          <Description>
            안전한 경로 추천 및 위험 지역을 한눈에 확인할 수 있습니다.
          </Description>

          {/* 지도 표시 */}
          <MapContainer>
            <KakaoMapView
              markers={safetyMarkers}
              centerLat={37.4979}
              centerLng={127.0276}
              height={400}
              zoom={4}
            />
          </MapContainer>

          {/* 위험 지역 정보 */}
          <SectionTitle>⚠️ 주의 구간</SectionTitle>
          <InfoBox bgColor="#FFE8E8" borderColor="#FF6B6B">
            <InfoText>📍 교통사고 다발지역 - 강남역 주변</InfoText>
            <InfoText>저녁 시간대 우회 권장</InfoText>
          </InfoBox>
          <InfoBox bgColor="#FFE8E8" borderColor="#FF6B6B">
            <InfoText>📍 치안 취약 지역 - 강남구 일부</InfoText>
            <InfoText>귀가 시간 이동 권장</InfoText>
          </InfoBox>

          {/* 안전 경로 정보 */}
          <SectionTitle>✅ 추천 경로</SectionTitle>
          <InfoBox bgColor="#E8F5E9" borderColor="#4CAF50">
            <InfoText>🚶 강남역 → 회사 (밝은 거리 경유)</InfoText>
            <InfoText>예상 시간: 12분</InfoText>
          </InfoBox>
          <InfoBox bgColor="#E8F5E9" borderColor="#4CAF50">
            <InfoText>🏪 주변 편의점 및 카페 (24시간 운영)</InfoText>
            <InfoText>응급 상황 시 보호소 역할</InfoText>
          </InfoBox>
        </Content>
      </ScrollContent>
    </Container>
  );
}

