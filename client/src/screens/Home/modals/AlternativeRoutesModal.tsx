/**
 * 대체 경로 추천 모달
 *
 * 현재 경로의 대체 경로를 표시하고 시간 절약 정보를 제공합니다.
 * - 현재 경로 정보
 * - 추천 대체 경로들 (시간 절약 정보 포함)
 * - 경로 상세 정보 보기
 *
 * 헌법 준수:
 * - AGENTS.md [제2장]: Styled-components 사용
 */

import React, { useState } from 'react';
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

const CurrentRouteCard = styled.View`
  background-color: #F0F7FF;
  border-left-width: 4px;
  border-left-color: ${theme.colors.primary};
  border-radius: ${theme.borderRadius.md}px;
  padding: ${theme.spacing.md}px;
  margin-bottom: ${theme.spacing.lg}px;
`;

const RouteLabel = styled.Text`
  font-size: ${theme.fonts.sizes.xs}px;
  color: ${theme.colors.textSecondary};
  font-weight: 600;
  margin-bottom: ${theme.spacing.xs}px;
  text-transform: uppercase;
`;

const RouteInfo = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const RouteTime = styled.Text`
  font-size: ${theme.fonts.sizes.lg}px;
  font-weight: 700;
  color: ${theme.colors.primary};
`;

const RouteDistance = styled.Text`
  font-size: ${theme.fonts.sizes.sm}px;
  color: ${theme.colors.textSecondary};
`;

const SectionTitle = styled.Text`
  font-size: ${theme.fonts.sizes.lg}px;
  font-weight: 700;
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.md}px;
`;

const AlternativeRouteCard = styled.View<{ isBest?: boolean }>`
  background-color: white;
  border-width: 2px;
  border-color: ${(props) => (props.isBest ? '#4CAF50' : '#E0E0E0')};
  border-radius: ${theme.borderRadius.md}px;
  padding: ${theme.spacing.md}px;
  margin-bottom: ${theme.spacing.md}px;
`;

const BestBadge = styled.View`
  background-color: #4CAF50;
  padding: ${theme.spacing.xs}px ${theme.spacing.sm}px;
  border-radius: ${theme.borderRadius.md}px;
  align-self: flex-start;
  margin-bottom: ${theme.spacing.xs}px;
`;

const BadgeText = styled.Text`
  color: white;
  font-size: ${theme.fonts.sizes.xs}px;
  font-weight: 700;
`;

const RouteHeader = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.md}px;
`;

const RouteDuration = styled.Text`
  font-size: ${theme.fonts.sizes.md}px;
  font-weight: 700;
  color: ${theme.colors.text};
`;

const TimeSaving = styled.View`
  background-color: #E8F5E9;
  padding: ${theme.spacing.xs}px ${theme.spacing.sm}px;
  border-radius: ${theme.borderRadius.md}px;
`;

const TimeSavingText = styled.Text`
  color: #2E7D32;
  font-size: ${theme.fonts.sizes.xs}px;
  font-weight: 700;
`;

const RouteDetails = styled.View`
  background-color: #F5F5F5;
  border-radius: ${theme.borderRadius.md}px;
  padding: ${theme.spacing.md}px;
  margin-bottom: ${theme.spacing.md}px;
`;

const DetailRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.sm}px;
`;

const DetailRowLast = styled(DetailRow)`
  margin-bottom: 0;
`;

const DetailLabel = styled.Text`
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fonts.sizes.xs}px;
`;

const DetailValue = styled.Text`
  color: ${theme.colors.text};
  font-size: ${theme.fonts.sizes.sm}px;
  font-weight: 600;
`;

const SelectButton = styled.View`
  background-color: ${theme.colors.primary};
  padding: ${theme.spacing.md}px;
  border-radius: ${theme.borderRadius.md}px;
  align-items: center;
`;

const SelectButtonText = styled.Text`
  color: white;
  font-size: ${theme.fonts.sizes.sm}px;
  font-weight: 700;
`;

const CloseButton = styled.View`
  background-color: ${theme.colors.border};
  padding: ${theme.spacing.md}px;
  border-radius: ${theme.borderRadius.lg}px;
  margin-top: ${theme.spacing.lg}px;
  align-items: center;
`;

const CloseButtonText = styled.Text`
  color: ${theme.colors.text};
  font-size: ${theme.fonts.sizes.md}px;
  font-weight: 700;
`;

interface AlternativeRoutesModalProps {
  route: {
    params: {
      currentRouteDuration: number;
      currentRouteDistance: number;
    };
  };
}

const AlternativeRoutesModal: React.FC<AlternativeRoutesModalProps> = ({ route }) => {
  const navigation = useNavigation();
  const { currentRouteDuration, currentRouteDistance } = route.params;
  const [selectedRoute, setSelectedRoute] = useState<number | null>(null);

  // 목업 데이터: 대체 경로들
  const alternativeRoutes = [
    {
      id: 1,
      duration: 42,
      distance: 14.2,
      transfers: 0,
      segments: [
        { type: '🚇', name: '1호선', time: 35 },
        { type: '👣', name: '도보', time: 7 },
      ],
      isBest: true,
    },
    {
      id: 2,
      duration: 48,
      distance: 15.8,
      transfers: 1,
      segments: [
        { type: '🚌', name: '80번 버스', time: 40 },
        { type: '👣', name: '도보', time: 8 },
      ],
      isBest: false,
    },
    {
      id: 3,
      duration: 55,
      distance: 13.5,
      transfers: 0,
      segments: [
        { type: '🚇', name: '2호선', time: 45 },
        { type: '👣', name: '도보', time: 10 },
      ],
      isBest: false,
    },
  ];

  const formatTimeSaving = (currentTime: number, routeTime: number): string => {
    const saving = currentTime - routeTime;
    if (saving > 0) {
      return `${saving}분 단축`;
    } else if (saving < 0) {
      return `${Math.abs(saving)}분 추가`;
    }
    return '동일';
  };

  return (
    <Container>
      <ModalContent>
        <DragIndicator />
        <ModalTitle>경로 추천</ModalTitle>

        {/* 현재 경로 표시 */}
        <CurrentRouteCard>
          <RouteLabel>현재 경로</RouteLabel>
          <RouteInfo>
            <View>
              <RouteTime>{currentRouteDuration}분</RouteTime>
              <RouteDistance>{currentRouteDistance.toFixed(1)}km</RouteDistance>
            </View>
            <RouteLabel>기본 경로</RouteLabel>
          </RouteInfo>
        </CurrentRouteCard>

        {/* 추천 경로 목록 */}
        <SectionTitle>추천 경로</SectionTitle>

        <ScrollView showsVerticalScrollIndicator={false}>
          {alternativeRoutes.map((alternativeRoute) => {
            const timeSaving = currentRouteDuration - alternativeRoute.duration;
            return (
              <AlternativeRouteCard
                key={alternativeRoute.id}
                isBest={alternativeRoute.isBest}
              >
                {alternativeRoute.isBest && (
                  <BestBadge>
                    <BadgeText>⭐ 최고 추천</BadgeText>
                  </BestBadge>
                )}

                <RouteHeader>
                  <View>
                    <RouteDuration>{alternativeRoute.duration}분</RouteDuration>
                    <DetailValue>{alternativeRoute.distance}km</DetailValue>
                  </View>
                  {timeSaving !== 0 && (
                    <TimeSaving>
                      <TimeSavingText>
                        {timeSaving > 0 ? '✓' : '➕'} {formatTimeSaving(currentRouteDuration, alternativeRoute.duration)}
                      </TimeSavingText>
                    </TimeSaving>
                  )}
                </RouteHeader>

                <RouteDetails>
                  {alternativeRoute.segments.map((segment, idx) => (
                    <DetailRow key={idx}>
                      <DetailLabel>
                        {segment.type} {segment.name}
                      </DetailLabel>
                      <DetailValue>{segment.time}분</DetailValue>
                    </DetailRow>
                  ))}
                  <DetailRowLast>
                    <DetailLabel>환승</DetailLabel>
                    <DetailValue>{alternativeRoute.transfers}회</DetailValue>
                  </DetailRowLast>
                </RouteDetails>

                <TouchableOpacity
                  onPress={() => setSelectedRoute(alternativeRoute.id)}
                  activeOpacity={0.8}
                >
                  <SelectButton>
                    <SelectButtonText>
                      {selectedRoute === alternativeRoute.id
                        ? '✓ 선택됨'
                        : '이 경로로 변경'}
                    </SelectButtonText>
                  </SelectButton>
                </TouchableOpacity>
              </AlternativeRouteCard>
            );
          })}
        </ScrollView>

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

export default AlternativeRoutesModal;
