/**
 * 실시간 경로 추적 카드 (카드 2.2)
 *
 * - 현재 위치
 * - 다음 정류장
 * - 예상 도착 시간
 * - 이동 상태 (정류장 대기, 이동 중, 경로 이탈 등)
 *
 * 헌법 준수:
 * - AGENTS.md 프론트엔드 헌법 [제2장] 스타일링 (Styled-components)
 * - DESIGN.md 4.3: 실시간 추적 카드 UI/UX
 */

import React from 'react';
import styled from 'styled-components/native';
import { theme } from '../../../styles/theme';
import { TrackingState, UserTrackingStatus, formatDistance, formatTime } from '../../../services/routeTrackingService';

const Container = styled.View`
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
  align-items: center;
  margin-bottom: ${theme.spacing.md}px;
`;

const StatusBadge = styled.View<{ status: UserTrackingStatus }>`
  background-color: ${(props) => {
    switch (props.status) {
      case UserTrackingStatus.ON_TRANSIT:
        return '#4CAF50';
      case UserTrackingStatus.WAITING_AT_STOP:
        return '#FF9800';
      case UserTrackingStatus.ROUTE_DEVIATION:
        return '#F44336';
      case UserTrackingStatus.DESTINATION_REACHED:
        return '#2196F3';
      default:
        return '#999999';
    }
  }};
  padding: ${theme.spacing.sm}px ${theme.spacing.md}px;
  border-radius: ${theme.borderRadius.md}px;
`;

const StatusText = styled.Text`
  color: white;
  font-size: ${theme.fonts.sizes.xs}px;
  font-weight: 600;
`;

const MessageText = styled.Text`
  font-size: ${theme.fonts.sizes.md}px;
  color: ${theme.colors.text};
  font-weight: 600;
`;

const ContentGrid = styled.View`
  gap: ${theme.spacing.md}px;
`;

const InfoRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  padding-bottom: ${theme.spacing.md}px;
  border-bottom-width: 1px;
  border-bottom-color: ${theme.colors.border};
`;

const InfoColumn = styled.View`
  flex: 1;
`;

const InfoLabel = styled.Text`
  font-size: ${theme.fonts.sizes.xs}px;
  color: ${theme.colors.textSecondary};
  margin-bottom: ${theme.spacing.xs}px;
`;

const InfoValue = styled.Text`
  font-size: ${theme.fonts.sizes.md}px;
  color: ${theme.colors.text};
  font-weight: 600;
`;

const SpeedContainer = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  background-color: ${theme.colors.background};
  border-radius: 8px;
  padding: ${theme.spacing.md}px;
`;

const SpeedValue = styled.Text`
  font-size: ${theme.fonts.sizes.lg}px;
  color: ${theme.colors.primary};
  font-weight: 700;
`;

const SpeedLabel = styled.Text`
  font-size: ${theme.fonts.sizes.xs}px;
  color: ${theme.colors.textSecondary};
  margin-left: ${theme.spacing.sm}px;
`;

const LocationText = styled.Text`
  font-size: ${theme.fonts.sizes.xs}px;
  color: ${theme.colors.textSecondary};
  margin-top: ${theme.spacing.xs}px;
`;

interface RealtimeTrackingCardProps {
  trackingState: TrackingState | null;
  testID?: string;
}

/**
 * 실시간 경로 추적 카드 컴포넌트
 *
 * 사용자의 현재 이동 상태와 다음 정류장 정보를 실시간으로 표시합니다.
 */
const RealtimeTrackingCard: React.FC<RealtimeTrackingCardProps> = ({
  trackingState,
  testID = 'realtime-tracking-card',
}) => {
  if (!trackingState) {
    return null;
  }

  const getStatusLabel = (status: UserTrackingStatus): string => {
    switch (status) {
      case UserTrackingStatus.ON_TRANSIT:
        return '이동 중';
      case UserTrackingStatus.WAITING_AT_STOP:
        return '정류장 대기';
      case UserTrackingStatus.BOARDING:
        return '도보 이동';
      case UserTrackingStatus.ROUTE_DEVIATION:
        return '경로 이탈';
      case UserTrackingStatus.DESTINATION_REACHED:
        return '목적지 도착';
      default:
        return '추적 준비';
    }
  };

  return (
    <Container testID={testID}>
      {/* 헤더 */}
      <HeaderContainer>
        <MessageText>{trackingState.message}</MessageText>
        <StatusBadge status={trackingState.status}>
          <StatusText>{getStatusLabel(trackingState.status)}</StatusText>
        </StatusBadge>
      </HeaderContainer>

      {/* 콘텐츠 */}
      <ContentGrid>
        {/* 위치 정보 */}
        <InfoRow>
          <InfoColumn>
            <InfoLabel>현재 위치</InfoLabel>
            <InfoValue>
              {trackingState.currentLocation.latitude.toFixed(4)}, {trackingState.currentLocation.longitude.toFixed(4)}
            </InfoValue>
            <LocationText>정확도: ±{Math.round(trackingState.currentLocation.accuracy || 0)}m</LocationText>
          </InfoColumn>
        </InfoRow>

        {/* 이동 속도 */}
        <SpeedContainer>
          <SpeedValue>{trackingState.movementSpeed.toFixed(1)}</SpeedValue>
          <SpeedLabel>km/h</SpeedLabel>
        </SpeedContainer>

        {/* 다음 정류장 정보 */}
        <InfoRow>
          <InfoColumn>
            <InfoLabel>다음 정류장까지 거리</InfoLabel>
            <InfoValue>{formatDistance(trackingState.distanceToNextStop)}</InfoValue>
          </InfoColumn>
          <InfoColumn>
            <InfoLabel>예상 도착 시간</InfoLabel>
            <InfoValue>{formatTime(trackingState.estimatedTimeToNextStop)}</InfoValue>
          </InfoColumn>
        </InfoRow>

        {/* 경로 상태 */}
        <InfoRow>
          <InfoColumn>
            <InfoLabel>경로 상태</InfoLabel>
            <InfoValue style={{ color: trackingState.isOnRoute ? '#4CAF50' : '#F44336' }}>
              {trackingState.isOnRoute ? '✓ 경로 위' : '✗ 경로 이탈'}
            </InfoValue>
          </InfoColumn>
          <InfoColumn>
            <InfoLabel>현재 세그먼트</InfoLabel>
            <InfoValue>{trackingState.currentSegmentIndex + 1}</InfoValue>
          </InfoColumn>
        </InfoRow>
      </ContentGrid>
    </Container>
  );
};

export default RealtimeTrackingCard;
