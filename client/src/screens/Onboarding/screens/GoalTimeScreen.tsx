/**
 * 온보딩 스크린 6: 목표 시간 설정 (GoalTime)
 *
 * 설계:
 * - PathSelectionScreen에서 설정한 여정들을 나열
 * - 각 여정을 누르면 추천 경로들을 표시
 * - 추천 경로 선택 가능
 */

import React, { useState, useMemo } from 'react';
import { TouchableOpacity, ScrollView } from 'react-native';
import styled from 'styled-components/native';
import { theme } from '../../../styles/theme';
import { onboardingTheme } from '../styles/onboardingTheme';
import { useOnboardingData, useOnboardingActions } from '../stores/useOnboardingStore';
import { OnboardingButton } from '../components/OnboardingButton';

interface GoalTimeScreenProps {
  navigation: {
    navigate: (screen: string) => void;
  };
}

/**
 * Journey 타입 정의
 */
interface JourneyGroup {
  id: string;
  originIcon: string;
  originName: string;
  destIcon: string;
  destName: string;
  departTime: string;
  arriveTime: string;
}

/**
 * Route 타입 정의
 */
interface RecommendedRoute {
  id: string;
  mode: string;
  duration: string;
  transfers: number;
  icon: string;
}

/**
 * Mock 추천 경로 데이터
 */
const MOCK_ROUTES: RecommendedRoute[] = [
  { id: 'r1', mode: '버스 + 지하철', duration: '45분', transfers: 1, icon: '🚌' },
  { id: 'r2', mode: '지하철', duration: '50분', transfers: 0, icon: '🚇' },
  { id: 'r3', mode: '택시', duration: '30분', transfers: 0, icon: '🚕' },
];

/**
 * OuterContainer
 */
const OuterContainer = styled.SafeAreaView`
  flex: 1;
  background-color: #F0F4FF;
`;

/**
 * ScrollContainer
 */
const ScrollContainer = styled.ScrollView`
  flex: 1;
`;

/**
 * ContentContainer
 */
const ContentContainer = styled.View`
  padding: ${theme.spacing.lg}px;
  padding-bottom: ${theme.spacing.xl}px;
  gap: ${theme.spacing.xl}px;
`;

/**
 * HeadlineText
 */
const HeadlineText = styled.Text`
  font-size: ${onboardingTheme.typography.headlineM.fontSize}px;
  font-weight: ${onboardingTheme.typography.headlineM.fontWeight};
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.md}px;
`;

/**
 * JourneyGroupCard - 여정 그룹 카드
 */
const JourneyGroupCard = styled(TouchableOpacity)<{ isSelected: boolean }>`
  background-color: white;
  border-radius: 12px;
  padding: ${theme.spacing.md}px;
  margin-bottom: ${theme.spacing.md}px;
  border-width: 2px;
  border-color: ${(props) => props.isSelected ? theme.colors.primary : '#e0e0e0'};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  elevation: 2;
`;

/**
 * JourneyInfo
 */
const JourneyInfo = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

/**
 * JourneyLocation
 */
const JourneyLocation = styled.View`
  align-items: center;
  gap: ${theme.spacing.xs}px;
`;

/**
 * LocationIcon
 */
const LocationIcon = styled.Text`
  font-size: 32px;
`;

/**
 * LocationName
 */
const LocationName = styled.Text`
  font-size: 13px;
  font-weight: 600;
  color: ${theme.colors.text};
  max-width: 60px;
  text-align: center;
`;

/**
 * Arrow
 */
const Arrow = styled.Text`
  font-size: 20px;
  color: ${theme.colors.textSecondary};
  margin-horizontal: ${theme.spacing.sm}px;
`;

/**
 * TimeInfo
 */
const TimeInfo = styled.View`
  flex-direction: row;
  gap: ${theme.spacing.sm}px;
`;

/**
 * TimeBox
 */
const TimeBox = styled.View`
  background-color: ${theme.colors.background};
  border-radius: 8px;
  padding: ${theme.spacing.xs}px ${theme.spacing.sm}px;
  align-items: center;
`;

/**
 * TimeText
 */
const TimeText = styled.Text`
  font-size: 16px;
  font-weight: 700;
  color: ${theme.colors.primary};
`;

/**
 * RouteSection
 */
const RouteSection = styled.View`
  background-color: #F9F9F9;
  border-radius: 12px;
  padding: ${theme.spacing.md}px;
  margin-top: ${theme.spacing.md}px;
`;

/**
 * RouteSectionTitle
 */
const RouteSectionTitle = styled.Text`
  font-size: 14px;
  font-weight: 600;
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.md}px;
`;

/**
 * RouteCard
 */
const RouteCard = styled(TouchableOpacity)<{ isSelected: boolean }>`
  background-color: white;
  border-radius: 10px;
  padding: ${theme.spacing.md}px;
  margin-bottom: ${theme.spacing.sm}px;
  flex-direction: row;
  align-items: center;
  border-width: 2px;
  border-color: ${(props) => props.isSelected ? theme.colors.primary : '#e0e0e0'};
`;

/**
 * RouteIcon
 */
const RouteIcon = styled.Text`
  font-size: 24px;
  margin-right: ${theme.spacing.md}px;
`;

/**
 * RouteDetails
 */
const RouteDetails = styled.View`
  flex: 1;
`;

/**
 * RouteMode
 */
const RouteMode = styled.Text`
  font-size: 14px;
  font-weight: 600;
  color: ${theme.colors.text};
  margin-bottom: 4px;
`;

/**
 * RouteMetaInfo
 */
const RouteMetaInfo = styled.Text`
  font-size: 12px;
  color: ${theme.colors.textSecondary};
`;

/**
 * DurationBadge
 */
const DurationBadge = styled.View`
  background-color: ${theme.colors.primary}20;
  border-radius: 8px;
  padding: 4px 8px;
`;

/**
 * DurationText
 */
const DurationText = styled.Text`
  font-size: 13px;
  font-weight: 600;
  color: ${theme.colors.primary};
`;

/**
 * ButtonContainer
 */
const ButtonContainer = styled.View`
  gap: ${theme.spacing.md}px;
  margin-top: ${theme.spacing.lg}px;
`;

/**
 * EmptyStateText
 */
const EmptyStateText = styled.Text`
  font-size: 14px;
  color: ${theme.colors.textSecondary};
  text-align: center;
  margin-top: ${theme.spacing.lg}px;
`;

/**
 * GoalTimeScreen
 *
 * 여정별로 추천 경로를 선택하는 화면
 */
export const GoalTimeScreen: React.FC<GoalTimeScreenProps> = ({
  navigation,
}) => {
  const { pathSelection } = useOnboardingData();
  const actions = useOnboardingActions();

  // 선택된 여정 (경로 선택을 위해 열린 여정)
  const [selectedJourneyId, setSelectedJourneyId] = useState<string | null>(null);
  
  // 각 여정별로 선택된 경로 (여정 ID -> 경로 ID 매핑)
  const [selectedRoutes, setSelectedRoutes] = useState<Record<string, string>>({});

  /**
   * PathSelectionScreen에서 저장된 여정 데이터를 JourneyGroup 형태로 변환
   */
  const journeys: JourneyGroup[] = useMemo(() => {
    if (!pathSelection.journeys || pathSelection.journeys.length === 0) {
      return [];
    }

    const groups: JourneyGroup[] = [];
    const segments = pathSelection.journeys;

    // segments를 2개씩 묶어서 (출발 -> 도착) 여정 그룹으로 변환
    for (let i = 0; i < segments.length; i += 2) {
      const depart = segments[i];
      const arrive = segments[i + 1];

      if (depart && arrive && depart.type === 'depart' && arrive.type === 'arrive') {
        groups.push({
          id: `${depart.id}-${arrive.id}`,
          originIcon: depart.placeIcon,
          originName: depart.placeName,
          destIcon: arrive.placeIcon,
          destName: arrive.placeName,
          departTime: depart.time,
          arriveTime: arrive.time,
        });
      }
    }

    return groups;
  }, [pathSelection.journeys]);

  /**
   * 여정 선택 핸들러 (경로 선택을 위해 여정 열기/닫기)
   */
  const handleSelectJourney = (journeyId: string) => {
    // 같은 여정을 다시 클릭하면 닫기
    if (selectedJourneyId === journeyId) {
      setSelectedJourneyId(null);
    } else {
      setSelectedJourneyId(journeyId);
    }
  };

  /**
   * 경로 선택 핸들러
   */
  const handleSelectRoute = (journeyId: string, routeId: string) => {
    setSelectedRoutes((prev) => ({
      ...prev,
      [journeyId]: routeId,
    }));
  };

  /**
   * 모든 여정에 경로가 선택되었는지 확인
   */
  const allRoutesSelected = useMemo(() => {
    if (journeys.length === 0) return false;
    return journeys.every((journey) => selectedRoutes[journey.id] !== undefined);
  }, [journeys, selectedRoutes]);

  /**
   * 다음 버튼 핸들러
   */
  const handleNext = () => {
    if (allRoutesSelected) {
      // 여정과 경로 저장 로직 (추후 구현)
      actions.nextStep();
      navigation.navigate('ScheduleSetup');
    }
  };

  return (
    <OuterContainer>
      <ScrollContainer showsVerticalScrollIndicator={false}>
        <ContentContainer>
          <HeadlineText>회사에 몇 시까지{'\n'}도착해야 하나요?</HeadlineText>

          {/* 여정 그룹 리스트 */}
          <ScrollView>
            {journeys.length === 0 ? (
              <EmptyStateText>여정이 설정되지 않았습니다</EmptyStateText>
            ) : (
              journeys.map((journey) => (
              <JourneyGroupCard
                key={journey.id}
                isSelected={selectedJourneyId === journey.id}
                onPress={() => handleSelectJourney(journey.id)}
              >
                <JourneyInfo>
                  {/* 출발지 */}
                  <JourneyLocation>
                    <LocationIcon>{journey.originIcon}</LocationIcon>
                    <LocationName>{journey.originName}</LocationName>
                  </JourneyLocation>

                  {/* 시간 정보 */}
                  <TimeInfo>
                    <TimeBox>
                      <TimeText>{journey.departTime}</TimeText>
                    </TimeBox>
                    <Arrow>→</Arrow>
                    <TimeBox>
                      <TimeText>{journey.arriveTime}</TimeText>
                    </TimeBox>
                  </TimeInfo>

                  {/* 목적지 */}
                  <JourneyLocation>
                    <LocationIcon>{journey.destIcon}</LocationIcon>
                    <LocationName>{journey.destName}</LocationName>
                  </JourneyLocation>
                </JourneyInfo>

                {/* 선택된 여정일 때 추천 경로 표시 */}
                {selectedJourneyId === journey.id && (
                  <RouteSection>
                    <RouteSectionTitle>추천 경로 선택</RouteSectionTitle>
                    {MOCK_ROUTES.map((route) => (
                      <RouteCard
                        key={route.id}
                        isSelected={selectedRoutes[journey.id] === route.id}
                        onPress={() => handleSelectRoute(journey.id, route.id)}
                      >
                        <RouteIcon>{route.icon}</RouteIcon>
                        <RouteDetails>
                          <RouteMode>{route.mode}</RouteMode>
                          <RouteMetaInfo>
                            환승 {route.transfers}회
                          </RouteMetaInfo>
                        </RouteDetails>
                        <DurationBadge>
                          <DurationText>{route.duration}</DurationText>
                        </DurationBadge>
                      </RouteCard>
                    ))}
                  </RouteSection>
                )}
                
                {/* 경로가 선택된 여정에는 체크 표시 */}
                {selectedRoutes[journey.id] && selectedJourneyId !== journey.id && (
                  <RouteSection>
                    <RouteSectionTitle style={{ color: '#4CAF50' }}>
                      ✓ 경로 선택 완료
                    </RouteSectionTitle>
                  </RouteSection>
                )}
              </JourneyGroupCard>
              ))
            )}
          </ScrollView>

          {/* 안내 텍스트 */}
          {!selectedJourneyId && journeys.length > 0 && (
            <EmptyStateText>여정을 선택하면 추천 경로를 볼 수 있습니다</EmptyStateText>
          )}
          
          {/* 진행 상황 표시 */}
          {journeys.length > 0 && (
            <EmptyStateText>
              {Object.keys(selectedRoutes).length} / {journeys.length} 여정 경로 선택됨
            </EmptyStateText>
          )}

          {/* 버튼 */}
          <ButtonContainer>
            <OnboardingButton
              label="다음"
              onPress={handleNext}
              variant="primary"
              disabled={!allRoutesSelected}
            />
          </ButtonContainer>
        </ContentContainer>
      </ScrollContainer>
    </OuterContainer>
  );
};

export default GoalTimeScreen;
