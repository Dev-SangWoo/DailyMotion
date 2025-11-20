/**
 * 온보딩 스크린 6: 목표 시간 설정 (GoalTime)
 *
 * 설계:
 * - PathSelectionScreen에서 설정한 여정들을 나열
 * - 각 여정을 누르면 추천 경로들을 표시
 * - 추천 경로 선택 가능
 */

import React, { useState, useMemo, useCallback } from 'react';
import { TouchableOpacity, ScrollView, ActivityIndicator, View } from 'react-native';
import styled from 'styled-components/native';
import { theme } from '../../../styles/theme';
import { onboardingTheme } from '../styles/onboardingTheme';
import { useOnboardingData, useOnboardingActions } from '../stores/useOnboardingStore';
import { OnboardingButton } from '../components/OnboardingButton';
import searchRoutes, { searchRoutesForOnboarding } from '../../../services/routeSearchService';
import { RecommendedRoute } from '../../../services/routeSearchService';

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
  originName: string;           // 표시용: "집"
  originAddress: string;        // 🆕 API용: 실제 주소
  originX?: string;             // 🆕 경도 (좌표 기반 검색)
  originY?: string;             // 🆕 위도 (좌표 기반 검색)
  destIcon: string;
  destName: string;             // 표시용: "회사"
  destAddress: string;          // 🆕 API용: 실제 주소
  destX?: string;               // 🆕 경도 (좌표 기반 검색)
  destY?: string;               // 🆕 위도 (좌표 기반 검색)
  departTime: string;
  arriveTime: string;
}

/**
 * 경로 로딩 상태
 */
type RouteLoadingState = 'idle' | 'loading' | 'success' | 'error';

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
 * RouteSection (경계 없음, 여백 최소화)
 */
const RouteSection = styled.View`
  margin-top: ${theme.spacing.lg}px;
`;

/**
 * RouteSectionTitle
 */
const RouteSectionTitle = styled.Text`
  font-size: 15px;
  font-weight: 700;
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.md}px;
`;

/**
 * RouteCard (네이버 지도 스타일 - 패딩 없음, 전체 공간 활용)
 */
const RouteCard = styled(TouchableOpacity)<{ isSelected: boolean }>`
  background-color: white;
  border-radius: 12px;
  padding: 0px;
  margin-bottom: ${theme.spacing.md}px;
  border-width: ${(props) => props.isSelected ? '2px' : '0px'};
  border-color: ${(props) => props.isSelected ? theme.colors.primary : 'transparent'};
  box-shadow: ${(props) => props.isSelected ? '0 4px 12px rgba(0, 122, 255, 0.2)' : '0 2px 6px rgba(0, 0, 0, 0.08)'};
  elevation: ${(props) => props.isSelected ? 5 : 2};
  border-bottom-width: 1px;
  border-bottom-color: #e0e0e0;
`;

/**
 * RouteHeader (상단: 최적 라벨, 총 시간, 시간 범위, 요금)
 */
const RouteHeader = styled.View`
  margin-bottom: ${theme.spacing.md}px;
  padding: ${theme.spacing.lg}px ${theme.spacing.lg}px 0px ${theme.spacing.lg}px;
`;

/**
 * RouteHeaderTop (최적 라벨 + 버튼들)
 */
const RouteHeaderTop = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${theme.spacing.xs}px;
`;

/**
 * RouteLabel (최적)
 */
const RouteLabel = styled.Text`
  font-size: 13px;
  font-weight: 700;
  color: ${theme.colors.primary};
`;

/**
 * RouteTimeInfo (총 시간 + 시간 범위 + 요금)
 */
const RouteTimeInfo = styled.View`
  flex-direction: row;
  align-items: baseline;
  gap: ${theme.spacing.md}px;
`;

/**
 * RouteTotalTime (총 시간 - 큰 글씨)
 */
const RouteTotalTime = styled.Text`
  font-size: 32px;
  font-weight: 800;
  color: ${theme.colors.text};
  letter-spacing: -0.5px;
`;

/**
 * RouteTimeRange (시간 범위)
 */
const RouteTimeRange = styled.Text`
  font-size: 15px;
  font-weight: 500;
  color: ${theme.colors.textSecondary};
  margin-left: ${theme.spacing.sm}px;
`;

/**
 * RouteFare (요금)
 */
const RouteFare = styled.Text`
  font-size: 15px;
  font-weight: 700;
  color: ${theme.colors.text};
  margin-left: auto;
`;

/**
 * TimelineBar (가로 타임라인 바 - 전체 너비 사용, 둥근 모서리)
 */
const TimelineBar = styled.View`
  flex-direction: row;
  height: 52px;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: ${theme.spacing.md}px;
  background-color: #f5f5f5;
`;

/**
 * TimelineSegment (타임라인 세그먼트 - 모든 요소 표시)
 */
const TimelineSegment = styled.View<{ width: number; color: string }>`
  flex: ${(props) => props.width};
  background-color: ${(props) => props.color};
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 35px;
  padding: 4px 2px;
  position: relative;
`;

/**
 * TimelineSegmentContent (아이콘과 시간을 세로로 배치)
 */
const TimelineSegmentContent = styled.View`
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  width: 100%;
`;

/**
 * TimelineSegmentIcon
 */
const TimelineSegmentIcon = styled.Text`
  font-size: 16px;
  line-height: 16px;
`;

/**
 * TimelineSegmentTime
 */
const TimelineSegmentTime = styled.Text`
  font-size: 9px;
  font-weight: 700;
  color: white;
  text-shadow: 0 0.5px 2px rgba(0, 0, 0, 0.3);
  line-height: 10px;
  text-align: center;
`;

/**
 * RouteSegmentsContainer (세로 리스트 - 세그먼트 상세 정보)
 */
const RouteSegmentsContainer = styled.View`
  margin-bottom: ${theme.spacing.md}px;
  padding-top: ${theme.spacing.md}px;
  padding-left: ${theme.spacing.lg}px;
  padding-right: ${theme.spacing.lg}px;
  padding-bottom: ${theme.spacing.md}px;
  border-top-width: 1px;
  border-top-color: #f0f0f0;
  position: relative;
`;

/**
 * VerticalLine (세로 연결선)
 */
const VerticalLine = styled.View`
  position: absolute;
  left: 14px;
  top: ${theme.spacing.md}px;
  bottom: 0;
  width: 2px;
  background-color: #e0e0e0;
`;

/**
 * SegmentRow (각 세그먼트 행)
 */
const SegmentRow = styled.View`
  flex-direction: row;
  align-items: flex-start;
  margin-bottom: ${theme.spacing.md}px;
  position: relative;
  z-index: 1;
`;

/**
 * SegmentIconContainer (아이콘 + 점)
 */
const SegmentIconContainer = styled.View`
  width: 28px;
  align-items: center;
  margin-right: ${theme.spacing.sm}px;
`;

/**
 * SegmentIcon (아이콘 배경)
 */
const SegmentIcon = styled.View<{ bgColor: string }>`
  width: 24px;
  height: 24px;
  border-radius: 12px;
  background-color: ${(props) => props.bgColor};
  align-items: center;
  justify-content: center;
`;

/**
 * SegmentIconText
 */
const SegmentIconText = styled.Text`
  font-size: 14px;
`;

/**
 * SegmentInfo
 */
const SegmentInfo = styled.View`
  flex: 1;
  margin-right: ${theme.spacing.sm}px;
`;

/**
 * SegmentTypeLabel (일반, 급행 등)
 */
const SegmentTypeLabel = styled.Text`
  font-size: 13px;
  font-weight: 700;
  color: ${theme.colors.text};
  margin-bottom: 4px;
`;

/**
 * SegmentLine (노선명)
 */
const SegmentLine = styled.Text`
  font-size: 15px;
  font-weight: 700;
  color: ${theme.colors.text};
  margin-bottom: 4px;
`;

/**
 * SegmentStations (역명/정류장명)
 */
const SegmentStations = styled.Text`
  font-size: 13px;
  font-weight: 500;
  color: ${theme.colors.text};
  line-height: 18px;
  margin-bottom: 3px;
`;

/**
 * SegmentMeta (배차간격 등 추가 정보)
 */
const SegmentMeta = styled.Text`
  font-size: 12px;
  font-weight: 500;
  color: ${theme.colors.textSecondary};
  margin-top: 2px;
`;

/**
 * RouteFooter (요금 정보)
 */
const RouteFooter = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.md}px ${theme.spacing.lg}px;
  border-top-width: 1px;
  border-top-color: #f0f0f0;
`;

/**
 * FareInfo
 */
const FareInfo = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${theme.spacing.xs}px;
`;

/**
 * FareLabel
 */
const FareLabel = styled.Text`
  font-size: 11px;
  color: ${theme.colors.textSecondary};
`;

/**
 * FareValue
 */
const FareValue = styled.Text`
  font-size: 12px;
  font-weight: 700;
  color: ${theme.colors.text};
`;

/**
 * DistanceInfo
 */
const DistanceInfo = styled.Text`
  font-size: 11px;
  color: ${theme.colors.textSecondary};
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
 * ErrorMessage
 */
const ErrorMessage = styled.Text`
  font-size: 13px;
  color: #d32f2f;
  text-align: center;
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

  // 경로 로딩 상태
  const [routeLoadingState, setRouteLoadingState] = useState<RouteLoadingState>('idle');
  const [routeError, setRouteError] = useState<string | null>(null);

  // 캐시: 여정별 경로 데이터 (API 호출 결과 캐싱)
  const [routesCache, setRoutesCache] = useState<Record<string, RecommendedRoute[]>>({});

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
          originAddress: depart.placeAddress,      // 🆕 실제 주소 추가
          originX: depart.placeX,                  // 🆕 경도 추가
          originY: depart.placeY,                  // 🆕 위도 추가
          destIcon: arrive.placeIcon,
          destName: arrive.placeName,
          destAddress: arrive.placeAddress,        // 🆕 실제 주소 추가
          destX: arrive.placeX,                    // 🆕 경도 추가
          destY: arrive.placeY,                    // 🆕 위도 추가
          departTime: depart.time,
          arriveTime: arrive.time,
        });
      }
    }

    return groups;
  }, [pathSelection.journeys]);

  /**
   * 여정별 경로 데이터 조회 (API 호출)
   */
  const fetchRoutesForJourney = useCallback(
    async (journeyId: string) => {
      // 캐시에 있으면 로드
      if (routesCache[journeyId]) {
        console.log(`[GoalTimeScreen] 경로 캐시 사용: ${journeyId}`);
        return;
      }

      // 여정 정보 찾기
      const journey = journeys.find((j) => j.id === journeyId);
      if (!journey) {
        console.error(`[GoalTimeScreen] 여정을 찾을 수 없음: ${journeyId}`);
        setRouteError('여정 정보를 찾을 수 없습니다');
        return;
      }

      try {
        setRouteLoadingState('loading');
        setRouteError(null);

        console.log('[GoalTimeScreen] ===== 경로 검색 시작 =====');
        console.log(`[GoalTimeScreen] 여정 ID: ${journeyId}`);
        console.log(`[GoalTimeScreen] 출발지: ${journey.originName} → ${journey.originAddress} (${journey.originIcon})`);
        if (journey.originX && journey.originY) {
          console.log(`[GoalTimeScreen]   좌표: (${journey.originX}, ${journey.originY})`);
        }
        console.log(`[GoalTimeScreen] 목적지: ${journey.destName} → ${journey.destAddress} (${journey.destIcon})`);
        if (journey.destX && journey.destY) {
          console.log(`[GoalTimeScreen]   좌표: (${journey.destX}, ${journey.destY})`);
        }
        console.log(`[GoalTimeScreen] 출발 시간: ${journey.departTime}`);
        console.log(`[GoalTimeScreen] 도착 시간: ${journey.arriveTime}`);
        console.log(`[GoalTimeScreen] 사용자 ID: user_001`);

        // 백엔드 API 호출 (ODSAY 경로 검색) - 온보딩용 직접 입력 API 사용
        // 좌표가 있으면 주소 대신 좌표로 검색 (더 정확함)
        const originX = journey.originX ? parseFloat(journey.originX) : undefined;
        const originY = journey.originY ? parseFloat(journey.originY) : undefined;
        const destX = journey.destX ? parseFloat(journey.destX) : undefined;
        const destY = journey.destY ? parseFloat(journey.destY) : undefined;

        const routes = await searchRoutesForOnboarding(
          journey.originAddress,  // 🔧 출발지 실제 주소 (좌표가 없을 경우)
          journey.destAddress,     // 🔧 목적지 실제 주소 (좌표가 없을 경우)
          journey.departTime,      // 출발 시간 (HH:MM 형식)
          originY,                 // 🔧 출발지 위도 (있으면 사용)
          originX,                 // 🔧 출발지 경도 (있으면 사용)
          destY,                   // 🔧 목적지 위도 (있으면 사용)
          destX,                   // 🔧 목적지 경도 (있으면 사용)
        );

        console.log(`[GoalTimeScreen] 경로 검색 완료: ${routes.length}개 경로 발견`);
        console.log('[GoalTimeScreen] 경로 상세:', JSON.stringify(routes, null, 2));
        console.log('[GoalTimeScreen] ===== 경로 검색 종료 =====');

        // 캐시에 저장
        setRoutesCache((prev) => ({
          ...prev,
          [journeyId]: routes,
        }));

        setRouteLoadingState('success');
      } catch (error) {
        console.error('[GoalTimeScreen] ===== 경로 검색 실패 =====');
        console.error(`[GoalTimeScreen] 여정 ID: ${journeyId}`);
        console.error(`[GoalTimeScreen] 출발지: ${journey.originName} → ${journey.originAddress}`);
        if (journey.originX && journey.originY) {
          console.error(`[GoalTimeScreen]   좌표: (${journey.originX}, ${journey.originY})`);
        }
        console.error(`[GoalTimeScreen] 목적지: ${journey.destName} → ${journey.destAddress}`);
        if (journey.destX && journey.destY) {
          console.error(`[GoalTimeScreen]   좌표: (${journey.destX}, ${journey.destY})`);
        }
        console.error('[GoalTimeScreen] 에러 상세:', error);
        if (error instanceof Error) {
          console.error('[GoalTimeScreen] 에러 메시지:', error.message);
          console.error('[GoalTimeScreen] 에러 스택:', error.stack);
        }
        console.error('[GoalTimeScreen] ===== 경로 검색 실패 종료 =====');
        
        setRouteLoadingState('error');
        setRouteError(
          error instanceof Error ? error.message : '경로를 찾을 수 없습니다'
        );
      }
    },
    [routesCache, journeys]
  );

  /**
   * 여정 선택 핸들러 (경로 선택을 위해 여정 열기/닫기)
   */
  const handleSelectJourney = useCallback(
    (journeyId: string) => {
      // 같은 여정을 다시 클릭하면 닫기
      if (selectedJourneyId === journeyId) {
        setSelectedJourneyId(null);
      } else {
        // 다른 여정을 클릭하면 열기 + 경로 로드
    setSelectedJourneyId(journeyId);
        fetchRoutesForJourney(journeyId);
      }
    },
    [selectedJourneyId, fetchRoutesForJourney]
  );

  /**
   * 경로 선택 핸들러
   */
  const handleSelectRoute = useCallback(
    (journeyId: string, routeId: string) => {
      setSelectedRoutes((prev) => ({
        ...prev,
        [journeyId]: routeId,
      }));
      
      // 🆕 선택된 경로 데이터를 Store에 저장
      const routes = routesCache[journeyId];
      if (routes && Array.isArray(routes)) {
        const selectedRoute = routes.find((r) => r.id === routeId);
        if (selectedRoute) {
          console.log('🔍 [GoalTimeScreen] 선택된 경로 데이터 저장:', {
            journeyId,
            routeId,
            hasSubPath: !!selectedRoute.subPath,
            subPathLength: selectedRoute.subPath?.length ?? 0,
          });
          actions.setSelectedPathForJourney(journeyId, selectedRoute);
        }
      }
      
      // 경로 선택 후 해당 여정 창 자동 축소
      if (selectedJourneyId === journeyId) {
        setSelectedJourneyId(null);
      }
    },
    [selectedJourneyId, routesCache, actions]
  );

  /**
   * 선택된 여정의 경로 데이터 가져오기
   */
  const selectedRoutesList = selectedJourneyId ? routesCache[selectedJourneyId] : undefined;

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

                    {/* 로딩 상태 */}
                    {routeLoadingState === 'loading' && (
                      <ActivityIndicator
                        size="large"
                        color={theme.colors.primary}
                        style={{ marginVertical: theme.spacing.lg }}
                      />
                    )}

                    {/* 에러 상태 */}
                    {routeLoadingState === 'error' && (
                      <ErrorMessage style={{ marginVertical: theme.spacing.md }}>
                        {routeError || '경로를 불러올 수 없습니다'}
                      </ErrorMessage>
                    )}

                    {/* 경로 리스트 (네이버 지도 스타일) */}
                    {routeLoadingState === 'success' && selectedRoutesList && selectedRoutesList.length > 0 ? (
                      selectedRoutesList.map((route, idx) => (
                      <RouteCard
                        key={route.id}
                          isSelected={selectedRoutes[journey.id] === route.id}
                          onPress={() => handleSelectRoute(journey.id, route.id)}
                        >
                          {/* 상단: 최적 라벨 + 총 시간 + 시간 범위 + 요금 */}
                          <RouteHeader>
                            <RouteHeaderTop>
                              {idx === 0 && <RouteLabel>최적</RouteLabel>}
                            </RouteHeaderTop>
                            <RouteTimeInfo>
                              <RouteTotalTime>{route.duration}</RouteTotalTime>
                              <RouteTimeRange>
                                {journey.departTime} - {journey.arriveTime}
                              </RouteTimeRange>
                              {route.fare !== null && route.fare !== undefined && (
                                <RouteFare>{route.fare.toLocaleString()}원</RouteFare>
                              )}
                            </RouteTimeInfo>
                          </RouteHeader>

                          {/* 가로 타임라인 바 */}
                          {route.segments && route.segments.length > 0 && (() => {
                            // 총 시간 계산 (초 단위)
                            const totalSeconds = route.segments.reduce((sum, seg) => {
                              const timeStr = seg.duration || '';
                              // "64분", "6초", "1분 30초" 형식 파싱
                              const minuteMatch = timeStr.match(/(\d+)분/);
                              const secondMatch = timeStr.match(/(\d+)초/);
                              const minutes = minuteMatch ? parseInt(minuteMatch[1]) : 0;
                              const seconds = secondMatch ? parseInt(secondMatch[1]) : 0;
                              return sum + (minutes * 60 + seconds);
                            }, 0);
                            
                            // 각 세그먼트의 시간(초) 배열
                            const segmentSecondsArray = route.segments.map((seg) => {
                              const timeStr = seg.duration || '';
                              const minuteMatch = timeStr.match(/(\d+)분/);
                              const secondMatch = timeStr.match(/(\d+)초/);
                              const minutes = minuteMatch ? parseInt(minuteMatch[1]) : 0;
                              const seconds = secondMatch ? parseInt(secondMatch[1]) : 0;
                              return minutes * 60 + seconds;
                            });
                            
                            return (
                              <TimelineBar>
                                {route.segments.map((segment, idx) => {
                                  const segmentSeconds = segmentSecondsArray[idx] || 0;
                                  
                                  // flex 비율 계산 (실제 시간 비율 기반)
                                  // 최소값을 1로 설정하여 모든 세그먼트가 표시되도록
                                  const flexRatio = totalSeconds > 0 
                                    ? Math.max(1, segmentSeconds) 
                                    : 1;
                                  
                                  // 색상 결정
                                  let color = '#9E9E9E'; // 기본 회색 (도보)
                                  if (segment.type === 'BUS') color = '#4CAF50'; // 초록 (버스)
                                  if (segment.type === 'SUBWAY') color = '#2196F3'; // 파랑 (지하철)
 
                                  // 표시할 시간 텍스트 (실제 시간 표시)
                                  // - 60초 미만: 초 단위
                                  // - 60초 이상: 분 단위 (더 짧은 포맷)
                                  let displayTime = '';
                                  if (segmentSeconds < 60) {
                                    displayTime = `${segmentSeconds}s`;
                                  } else {
                                    const mins = Math.round(segmentSeconds / 60);
                                    displayTime = `${mins}'`;
                                  }
                                  
                                  return (
                                    <TimelineSegment key={idx} width={flexRatio} color={color}>
                                      <TimelineSegmentContent>
                                        <TimelineSegmentIcon>{segment.icon}</TimelineSegmentIcon>
                                        {displayTime && (
                                          <TimelineSegmentTime>{displayTime}</TimelineSegmentTime>
                                        )}
                                      </TimelineSegmentContent>
                                    </TimelineSegment>
                                  );
                                })}
                              </TimelineBar>
                            );
                          })()}

                          {/* 세로 리스트: 세그먼트 상세 정보 */}
                          {route.segments && route.segments.length > 0 && (
                            <RouteSegmentsContainer>
                              <VerticalLine />
                              {route.segments.map((segment, idx) => {
                                let bgColor = '#9E9E9E';
                                if (segment.type === 'BUS') bgColor = '#4CAF50';
                                if (segment.type === 'SUBWAY') bgColor = '#2196F3';
                                
                                return (
                                  <SegmentRow key={idx}>
                                    <SegmentIconContainer>
                                      <SegmentIcon bgColor={bgColor}>
                                        <SegmentIconText>{segment.icon}</SegmentIconText>
                                      </SegmentIcon>
                                    </SegmentIconContainer>
                                    <SegmentInfo style={{ flex: 1 }}>
                                      {/* 버스: "일반" 라벨 */}
                                      {segment.type === 'BUS' && (
                                        <SegmentTypeLabel>일반</SegmentTypeLabel>
                                      )}
                                      {/* 지하철: 노선명 */}
                                      {segment.type === 'SUBWAY' && segment.line && (
                                        <SegmentTypeLabel>{segment.line}</SegmentTypeLabel>
                                      )}
                                      {/* 시작 정류장/역 */}
                                      {segment.startStation && (
                                        <SegmentStations>{segment.startStation}</SegmentStations>
                                      )}
                                      {/* 노선명 (버스번호 등) */}
                                      {segment.line && segment.type === 'BUS' && (
                                        <SegmentLine>{segment.line}</SegmentLine>
                                      )}
                                      {/* 종료 정류장/역 */}
                                      {segment.endStation && (
                                        <SegmentStations>
                                          {segment.type === 'WALK' ? '하차' : ''} {segment.endStation}
                                        </SegmentStations>
                                      )}
                                      {/* 도보는 간단히 표시 */}
                                      {segment.type === 'WALK' && !segment.startStation && !segment.endStation && (
                                        <SegmentStations>
                                          {segment.distance || '도보'}
                                        </SegmentStations>
                                      )}
                                      {/* 배차간격 등 추가 정보 (버스만) */}
                                      {segment.type === 'BUS' && segment.stationCount && (
                                        <SegmentMeta>배차간격 평일 8-12분</SegmentMeta>
                                      )}
                                    </SegmentInfo>
                                  </SegmentRow>
                                );
                              })}
                            </RouteSegmentsContainer>
                          )}

                          {/* 하단: 요금 정보 (있는 경우만 표시) */}
                          {route.fare !== null && route.fare !== undefined && route.fare > 0 && (
                            <RouteFooter>
                              <FareInfo>
                                <FareLabel>요금:</FareLabel>
                                <FareValue>{route.fare.toLocaleString()}원</FareValue>
                              </FareInfo>
                            </RouteFooter>
                          )}
                      </RouteCard>
                      ))
                    ) : routeLoadingState === 'success' ? (
                      <EmptyStateText>검색된 경로가 없습니다</EmptyStateText>
                    ) : null}
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
