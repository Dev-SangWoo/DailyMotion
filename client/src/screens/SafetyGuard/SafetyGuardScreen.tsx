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
import { ScrollView, View, TouchableOpacity } from 'react-native';
import { AppHeader } from '../../components/common/AppHeader';
import { KakaoMapView } from '../../components/kakao/KakaoMapView';
import { theme } from '../../styles/theme';
import { useOnboardingData } from '../Onboarding/stores/useOnboardingStore';

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

// 🆕 재난 문자 관련 스타일
const DisasterAlertBox = styled.View`
  background-color: #FFEBEE;
  border-left-width: 4px;
  border-left-color: #D32F2F;
  border-radius: ${theme.borderRadius.md}px;
  padding: ${theme.spacing.md}px;
  margin-bottom: ${theme.spacing.md}px;
`;

const DisasterAlertTitle = styled.Text`
  font-size: ${theme.fonts.sizes.md}px;
  font-weight: 700;
  color: #D32F2F;
  margin-bottom: ${theme.spacing.xs}px;
`;

const DisasterAlertText = styled.Text`
  font-size: ${theme.fonts.sizes.sm}px;
  color: #C62828;
  line-height: ${theme.fonts.sizes.sm * 1.5}px;
  margin-bottom: ${theme.spacing.xs}px;
`;

const DisasterAlertTime = styled.Text`
  font-size: ${theme.fonts.sizes.xs}px;
  color: #B71C1C;
`;

const RouteTag = styled.View<{ color: string }>`
  background-color: ${(props) => props.color};
  padding: ${theme.spacing.xs}px ${theme.spacing.sm}px;
  border-radius: ${theme.borderRadius.md}px;
  margin-right: ${theme.spacing.xs}px;
  margin-bottom: ${theme.spacing.xs}px;
`;

const RouteTagText = styled.Text`
  color: white;
  font-size: ${theme.fonts.sizes.xs}px;
  font-weight: 600;
`;

const DisasterCountBadge = styled.View`
  background-color: #FF5252;
  border-radius: 12px;
  width: 24px;
  height: 24px;
  justify-content: center;
  align-items: center;
  margin-left: ${theme.spacing.xs}px;
`;

const DisasterCountText = styled.Text`
  color: white;
  font-size: ${theme.fonts.sizes.xs}px;
  font-weight: 700;
`;

export default function SafetyGuardScreen() {
  const { pathSelection, places } = useOnboardingData();

  /**
   * 지도에 표시할 데이터 생성
   */
  // 🆕 설정한 경로들을 polyline으로 변환
  const routePolylines = useMemo(() => {
    // 🔍 데이터 디버깅 로그
    console.log('[SafetyGuard] pathSelection.journeys:', pathSelection.journeys);
    console.log('[SafetyGuard] pathSelection.selectedPaths:', pathSelection.selectedPaths);

    // 실제 데이터가 있으면 사용, 없으면 mock 데이터 사용
    const hasRealData = pathSelection.journeys && Object.keys(pathSelection.selectedPaths || {}).length > 0;

    if (!hasRealData) {
      console.log('[SafetyGuard] Using mock polylines');
      // Mock 경로 데이터 (테스트용)
      return [
        {
          name: '집 → 회사',
          coords: [
            { lat: 37.4979, lng: 127.0276 },
            { lat: 37.5050, lng: 127.0338 },
            { lat: 37.5120, lng: 127.0400 },
          ],
          color: '#0066FF',
          strokeWeight: 4,
        },
        {
          name: '회사 → 집',
          coords: [
            { lat: 37.5120, lng: 127.0400 },
            { lat: 37.5050, lng: 127.0338 },
            { lat: 37.4979, lng: 127.0276 },
          ],
          color: '#2196F3',
          strokeWeight: 4,
        },
      ];
    }

    const polylines: any[] = [];
    const colors = ['#0066FF', '#2196F3', '#00BCD4', '#009688'];
    let colorIndex = 0;

    // 각 여정별로 경로 polyline 생성
    Object.entries(pathSelection.selectedPaths).forEach(([journeyKey, path]: any) => {
      if (!path || !path.subPath) return;

      const [departId, arriveId] = journeyKey.split('|');
      const departJourney = pathSelection.journeys.find((j: any) => j.id === departId);
      const arriveJourney = pathSelection.journeys.find((j: any) => j.id === arriveId);

      if (!departJourney || !arriveJourney) return;

      // 출발지와 목적지 좌표 추출
      const startLat = parseFloat(departJourney.placeY);
      const startLng = parseFloat(departJourney.placeX);
      const endLat = parseFloat(arriveJourney.placeY);
      const endLng = parseFloat(arriveJourney.placeX);

      console.log(`[SafetyGuard] Route: ${journeyKey}`, {
        startLat,
        startLng,
        endLat,
        endLng,
      });

      if (!startLat || !startLng || !endLat || !endLng) {
        console.warn(`[SafetyGuard] Invalid coordinates for route ${journeyKey}`);
        return;
      }

      // Polyline 데이터 생성 (시작점과 끝점으로 간단하게 표시)
      const polyline = {
        name: `${departJourney.placeName} → ${arriveJourney.placeName}`,
        coords: [
          { lat: startLat, lng: startLng },
          { lat: (startLat + endLat) / 2, lng: (startLng + endLng) / 2 }, // 중간점
          { lat: endLat, lng: endLng },
        ],
        color: colors[colorIndex % colors.length],
        strokeWeight: 3,
      };

      polylines.push(polyline);
      colorIndex++;
    });

    console.log('[SafetyGuard] Generated polylines:', polylines);
    return polylines;
  }, [pathSelection]);

  // Mock 위험 지역 데이터
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

  // 🆕 재난 문자 데이터
  const disasterAlerts = useMemo(() => {
    return [
      {
        id: 1,
        type: '호우',
        icon: '🌧️',
        title: '[기상청] 호우 경고',
        message: '강남구 일대에 시간당 30mm 이상의 호우가 예상됩니다. 안전에 주의하세요.',
        affectedRoutes: ['집→회사'],
        time: '오후 2:45',
      },
      {
        id: 2,
        type: '사고',
        icon: '🚨',
        title: '[교통정보] 교통사고 발생',
        message: '강남대로 교대역~신논현역 구간 교통사고로 정체 중입니다.',
        affectedRoutes: ['집→회사', '회사→집'],
        time: '오후 1:30',
      },
      {
        id: 3,
        type: '경고',
        icon: '⚠️',
        title: '[행정안전부] 안전 경고',
        message: '오후 시간대 강남역 주변 귀가 경로 이용 시 안전에 주의하세요.',
        affectedRoutes: ['회사→집'],
        time: '오후 12:00',
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

          {/* 지도 표시 - 경로선 추가 */}
          <MapContainer>
            <KakaoMapView
              markers={safetyMarkers}
              polylines={routePolylines}
              centerLat={37.4979}
              centerLng={127.0276}
              height={400}
              zoom={4}
            />
          </MapContainer>

          {/* 🆕 재난 문자 섹션 */}
          <SectionTitle>
            🚨 재난 문자
            {disasterAlerts.length > 0 && (
              <DisasterCountBadge>
                <DisasterCountText>{disasterAlerts.length}</DisasterCountText>
              </DisasterCountBadge>
            )}
          </SectionTitle>
          {disasterAlerts.length > 0 ? (
            disasterAlerts.map((alert) => (
              <DisasterAlertBox key={alert.id}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <DisasterAlertTitle>
                      {alert.icon} {alert.title}
                    </DisasterAlertTitle>
                    <DisasterAlertText>{alert.message}</DisasterAlertText>
                    {alert.affectedRoutes.length > 0 && (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: theme.spacing.xs }}>
                        {alert.affectedRoutes.map((route, idx) => (
                          <RouteTag key={idx} color="#FF6B6B">
                            <RouteTagText>{route}</RouteTagText>
                          </RouteTag>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
                <DisasterAlertTime>{alert.time}</DisasterAlertTime>
              </DisasterAlertBox>
            ))
          ) : (
            <InfoBox bgColor="#E8F5E9" borderColor="#4CAF50">
              <InfoText>✅ 현재 활성화된 재난 문자가 없습니다.</InfoText>
            </InfoBox>
          )}

          {/* 경로 정보 */}
          <SectionTitle>🛣️ 내 경로</SectionTitle>
          {routePolylines.length > 0 ? (
            routePolylines.map((route, idx) => (
              <InfoBox
                key={idx}
                bgColor="#F0F7FF"
                borderColor="#0066FF"
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <InfoText style={{ fontWeight: '700' }}>{route.name}</InfoText>
                  <View
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 8,
                      backgroundColor: route.color,
                    }}
                  />
                </View>
              </InfoBox>
            ))
          ) : (
            <InfoBox bgColor="#FFF8E1" borderColor="#FBC02D">
              <InfoText>📍 온보딩에서 경로를 설정하면 지도에 표시됩니다.</InfoText>
            </InfoBox>
          )}

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
          <SectionTitle>✅ 안전 팁</SectionTitle>
          <InfoBox bgColor="#E8F5E9" borderColor="#4CAF50">
            <InfoText>🚶 밝은 거리를 우선 선택하세요</InfoText>
            <InfoText>CCTV와 조명이 충분한 경로를 추천합니다</InfoText>
          </InfoBox>
          <InfoBox bgColor="#E8F5E9" borderColor="#4CAF50">
            <InfoText>🏪 주변 편의점 및 카페 (24시간 운영)</InfoText>
            <InfoText>응급 상황 시 보호소 역할을 합니다</InfoText>
          </InfoBox>
        </Content>
      </ScrollContent>
    </Container>
  );
}

