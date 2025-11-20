/**
 * 실시간 경로 추적 네비게이션 화면
 *
 * 사용자의 현재 위치와 선택된 경로를 지도에 표시합니다.
 * - 현재 GPS 위치 마커
 * - 경로 라인 오버레이
 * - 다음 정류장/역 정보
 * - 실시간 이동 속도
 *
 * 헌법 준수:
 * - AGENTS.md [제2장]: Styled-components 사용
 */

import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import styled from 'styled-components/native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { theme } from '../../styles/theme';
import { useTrackingState } from '../../stores/useTrackingStore';
import { formatTime, formatDistance } from '../../services/routeTrackingService';
import { HomeStackParamList } from './HomeNavigator';

type NavigationProp = StackNavigationProp<HomeStackParamList, 'RealtimeNavigation'>;

const Container = styled.View`
  flex: 1;
  background-color: ${theme.colors.background};
`;

const Header = styled.View`
  background-color: ${theme.colors.primary};
  padding: ${theme.spacing.lg}px;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding-top: ${theme.spacing.xl}px;
  shadow-color: #000;
  shadow-opacity: 0.1;
  shadow-radius: 4px;
  elevation: 2;
`;

const HeaderTitle = styled.Text`
  color: white;
  font-size: ${theme.fonts.sizes.lg}px;
  font-weight: 700;
`;

const CloseButton = styled.Text`
  color: white;
  font-size: ${theme.fonts.sizes.xl}px;
`;

const MapPlaceholder = styled.View`
  flex: 1;
  background-color: #F0F4FF;
  border-radius: ${theme.borderRadius.lg}px;
  margin: ${theme.spacing.md}px;
  justify-content: center;
  align-items: center;
  border-width: 2px;
  border-color: ${theme.colors.primary};
  border-style: dashed;
`;

const MapPlaceholderText = styled.Text`
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fonts.sizes.md}px;
  text-align: center;
  margin: ${theme.spacing.md}px;
`;

const InfoCard = styled.View`
  background-color: white;
  margin: ${theme.spacing.md}px;
  border-radius: ${theme.borderRadius.lg}px;
  padding: ${theme.spacing.lg}px;
  shadow-color: #000;
  shadow-opacity: 0.1;
  shadow-radius: 4px;
  elevation: 2;
`;

const InfoRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.md}px;
  padding-bottom: ${theme.spacing.md}px;
  border-bottom-width: 1px;
  border-bottom-color: ${theme.colors.border};
`;

const InfoRowLast = styled(InfoRow)`
  border-bottom-width: 0;
  margin-bottom: 0;
  padding-bottom: 0;
`;

const InfoLabel = styled.Text`
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fonts.sizes.sm}px;
  font-weight: 600;
`;

const InfoValue = styled.Text`
  color: ${theme.colors.text};
  font-size: ${theme.fonts.sizes.md}px;
  font-weight: 700;
`;

const StatusBadge = styled.View<{ status: 'walking' | 'transit' | 'waiting' }>`
  background-color: ${(props) => {
    switch (props.status) {
      case 'walking':
        return '#4CAF50';
      case 'transit':
        return '#2196F3';
      case 'waiting':
        return '#FF9800';
      default:
        return '#999';
    }
  }};
  padding: ${theme.spacing.sm}px ${theme.spacing.md}px;
  border-radius: ${theme.borderRadius.md}px;
`;

const StatusText = styled.Text`
  color: white;
  font-size: ${theme.fonts.sizes.sm}px;
  font-weight: 600;
`;

const CloseButtonContainer = styled.View`
  margin: ${theme.spacing.md}px;
`;

const CloseBtnText = styled.Text`
  color: white;
  font-size: ${theme.fonts.sizes.md}px;
  font-weight: 700;
  text-align: center;
`;

const CloseBtn = styled.View`
  background-color: ${theme.colors.primary};
  padding: ${theme.spacing.md}px ${theme.spacing.lg}px;
  border-radius: ${theme.borderRadius.lg}px;
  shadow-color: ${theme.colors.primary};
  shadow-opacity: 0.3;
  shadow-radius: 4px;
  elevation: 2;
`;

interface RealtimeNavigationScreenProps {
  route: {
    params: {
      originName: string;
      destinationName: string;
      selectedPath: any;
    };
  };
}

const RealtimeNavigationScreen: React.FC<RealtimeNavigationScreenProps> = ({ route }) => {
  const navigation = useNavigation<NavigationProp>();
  const trackingState = useTrackingState();
  const { originName, destinationName, selectedPath } = route.params;

  const getStatusLabel = (status: string | undefined): string => {
    switch (status) {
      case 'walking':
        return '도보 중';
      case 'waiting_at_stop':
        return '정류장 대기';
      case 'boarding':
        return '탑승 중';
      case 'on_transit':
        return '이동 중';
      case 'route_deviation':
        return '경로 이탈';
      case 'destination_reached':
        return '도착 완료';
      default:
        return '추적 중';
    }
  };

  const getStatusType = (status: string | undefined): 'walking' | 'transit' | 'waiting' => {
    switch (status) {
      case 'walking':
      case 'boarding':
        return 'walking';
      case 'on_transit':
        return 'transit';
      case 'waiting_at_stop':
        return 'waiting';
      default:
        return 'transit';
    }
  };

  return (
    <Container>
      <Header>
        <HeaderTitle>실시간 경로 추적</HeaderTitle>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <CloseButton>✕</CloseButton>
        </TouchableOpacity>
      </Header>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: theme.spacing.lg }}
      >
        {/* 맵 플레이스홀더 (실제 맵 통합 필요) */}
        <MapPlaceholder>
          <MapPlaceholderText>📍 지도 표시 영역{'\n'}(맵 SDK 통합 예정)</MapPlaceholderText>
        </MapPlaceholder>

        {/* 여정 정보 */}
        <InfoCard>
          <InfoRow>
            <InfoLabel>출발지</InfoLabel>
            <InfoValue>{originName}</InfoValue>
          </InfoRow>
          <InfoRow>
            <InfoLabel>목적지</InfoLabel>
            <InfoValue>{destinationName}</InfoValue>
          </InfoRow>
          <InfoRowLast>
            <InfoLabel>예상 소요 시간</InfoLabel>
            <InfoValue>{selectedPath?.totalTimeMinutes || '--'}분</InfoValue>
          </InfoRowLast>
        </InfoCard>

        {/* 실시간 추적 정보 */}
        {trackingState && (
          <InfoCard>
            <InfoRow>
              <InfoLabel>현재 상태</InfoLabel>
              <StatusBadge status={getStatusType(trackingState.status)}>
                <StatusText>{getStatusLabel(trackingState.status)}</StatusText>
              </StatusBadge>
            </InfoRow>
            <InfoRow>
              <InfoLabel>현재 속도</InfoLabel>
              <InfoValue>{trackingState.movementSpeed.toFixed(1)} km/h</InfoValue>
            </InfoRow>
            <InfoRow>
              <InfoLabel>다음 정류장까지</InfoLabel>
              <InfoValue>{formatDistance(trackingState.distanceToNextStop)}</InfoValue>
            </InfoRow>
            <InfoRow>
              <InfoLabel>예상 도착 시간</InfoLabel>
              <InfoValue>{formatTime(trackingState.estimatedTimeToNextStop)}</InfoValue>
            </InfoRow>
            <InfoRowLast>
              <InfoLabel>경로 상태</InfoLabel>
              <InfoValue style={{ color: trackingState.isOnRoute ? '#4CAF50' : '#F44336' }}>
                {trackingState.isOnRoute ? '✓ 정상' : '✕ 이탈'}
              </InfoValue>
            </InfoRowLast>
          </InfoCard>
        )}

        {/* 닫기 버튼 */}
        <CloseButtonContainer>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <CloseBtn>
              <CloseBtnText>닫기</CloseBtnText>
            </CloseBtn>
          </TouchableOpacity>
        </CloseButtonContainer>
      </ScrollView>
    </Container>
  );
};

export default RealtimeNavigationScreen;
