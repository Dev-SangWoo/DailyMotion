/**
 * 데일리 브리핑 화면 - IntelligentDashboard 패턴 적용
 *
 * 헌법 준수:
 * - AGENTS.md 프론트엔드 헌법 [제2장] 스타일링 (Styled-components)
 * - AGENTS.md 프론트엔드 헌법 [제3장] 데이터 페칭 (React Query)
 * - AGENTS.md 프론트엔드 헌법 [제2장] 상태 관리 (Zustand)
 * - v3.0 명세서 [Logic 1.1] 출발 알림 / [Logic 1.2] 마지노선 경고
 * - DESIGN.md Phase 5: Ambient Feedback (배경색 알림) 로직
 * - DESIGN.md Phase 7: 예외 상황 처리 (오프라인 배너)
 * - Phase 8.1-8.2: IntelligentDashboard 디자인 적용
 * - OpenAPI 스펙 GET /v1/briefings/commute
 */
import React, { useState, useRef, useEffect } from 'react';
import { ScrollView, TouchableOpacity, View, TextInput, Dimensions, Image, Animated } from 'react-native';
import styled from 'styled-components/native';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../services/api';
import { theme } from '../../styles/theme';
import { useJourneySelectorStore } from '../../stores/useJourneySelectorStore';
import { useAmbientFeedbackStore, type AmbientFeedbackStatus } from '../../stores/useAmbientFeedbackStore';
import { useAppModeStore, type AppMode } from '../../stores/useAppModeStore';
import { useNetworkStore } from '../../stores/useNetworkStore';
import { JourneySelector, HeroCard, WeatherCard, AlternativePathCard, Carousel, StepCards, OfflineBanner } from './components';
import { BusIcon } from '../../components/icons/BusIcon';

// Styled-components: IntelligentDashboard 디자인 패턴 적용
// 헌법 제2장 준수: 의미론적 이름, theme 기반 스타일링

interface OuterContainerProps {
  ambientStatus?: AmbientFeedbackStatus;
}

const getBackgroundColor = (status?: AmbientFeedbackStatus): string => {
  switch (status) {
    case 'warning':
      return '#FFF3E0'; // 라이트 주황
    case 'alert':
      return '#FFEBEE'; // 라이트 빨강
    case 'normal':
    default:
      return '#F0F7FF'; // 라이트 블루
  }
};

const OuterContainer = styled.View<OuterContainerProps>`
  flex: 1;
  background-color: ${(props) => getBackgroundColor(props.ambientStatus)};
`;

const ScrollContainer = styled(ScrollView)`
  flex: 1;
`;

const Container = styled.View`
  padding: ${theme.spacing.md}px;
  gap: ${theme.spacing.md}px;
`;

const LoadingContainer = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
  padding: ${theme.spacing.xl}px;
`;

const LoadingText = styled.Text`
  font-size: ${theme.fonts.sizes.lg}px;
  color: ${theme.colors.textSecondary};
  text-align: center;
  font-weight: 600;
`;

// Phase 8.1: 검색 바 (축소/확장 가능)
const SearchBarContainer = styled.View`
  background-color: white;
  border-radius: ${theme.borderRadius.lg}px;
  overflow: hidden;
  shadow-color: #000;
  shadow-opacity: 0.1;
  shadow-radius: 4px;
  elevation: 2;
`;

// 축소된 상태
const CollapsedSearchBar = styled.View`
  padding: ${theme.spacing.md}px ${theme.spacing.md}px ${theme.spacing.xs}px ${theme.spacing.md}px;
  gap: ${theme.spacing.sm}px;
`;

const JourneyTabsContainer = styled.View`
  flex-direction: row;
  gap: ${theme.spacing.sm}px;
`;

const JourneyTab = styled.View<{ isActive: boolean }>`
  flex: 1;
  background-color: ${(props) => props.isActive ? '#0066FF' : '#F0F0F0'};
  border-radius: ${theme.borderRadius.md}px;
  padding: ${theme.spacing.sm}px;
  justify-content: center;
  align-items: center;
  height: 40px;
`;

const JourneyTabText = styled.Text<{ isActive: boolean }>`
  color: ${(props) => props.isActive ? 'white' : '#666'};
  font-size: ${theme.fonts.sizes.sm}px;
  font-weight: 600;
`;

// 확장 버튼
const ToggleButton = styled.View`
  width: 100%;
  padding: 0px ${theme.spacing.sm}px ${theme.spacing.xs}px ${theme.spacing.sm}px;
  justify-content: center;
  align-items: center;
`;

const ToggleButtonText = styled.Text`
  color: #999;
  font-size: 16px;
  font-weight: 600;
`;

// 확장된 상태
const ExpandedSearchBar = styled.View`
  padding: ${theme.spacing.xs}px ${theme.spacing.lg}px ${theme.spacing.lg}px ${theme.spacing.lg}px;
  gap: ${theme.spacing.md}px;
`;

const SearchInputContainer = styled.View`
  flex-direction: row;
  gap: ${theme.spacing.md}px;
  align-items: center;
  margin-bottom: ${theme.spacing.sm}px;
`;

const SearchInputWrapper = styled.View`
  flex: 1;
  border-width: 1px;
  border-color: #E0E0E0;
  border-radius: ${theme.borderRadius.md}px;
  padding: ${theme.spacing.sm}px ${theme.spacing.md}px;
  background-color: #F8F8F8;
`;

const SearchInput = styled(TextInput)`
  font-size: ${theme.fonts.sizes.sm}px;
  color: ${theme.colors.text};
`;

const ArrowIcon = styled.View`
  width: 28px;
  height: 28px;
  background-color: #0066FF;
  border-radius: ${theme.borderRadius.md}px;
  justify-content: center;
  align-items: center;
`;

const ArrowIconText = styled.Text`
  color: white;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: -0.5px;
`;

// 즐겨찾기 목록
const FavoritesList = styled.View`
  flex-direction: row;
  gap: ${theme.spacing.md}px;
  margin-top: ${theme.spacing.md}px;
`;

const FavoriteItem = styled.View`
  align-items: center;
  gap: ${theme.spacing.sm}px;
`;

const FavoriteIcon = styled.View`
  width: 50px;
  height: 50px;
  background-color: #E8F0FF;
  border-radius: 25px;
  justify-content: center;
  align-items: center;
`;

const FavoriteIconText = styled.Text`
  font-size: 24px;
`;

const FavoriteName = styled.Text`
  font-size: ${theme.fonts.sizes.xs}px;
  color: ${theme.colors.text};
  font-weight: 500;
`;

// Phase 8.2: CTA 카드 (캐러셀)
const CardBase = styled.View<{ bgGradient: string }>`
  background-color: ${(props) => props.bgGradient};
  border-radius: ${theme.borderRadius.xl}px;
  padding: ${theme.spacing.lg}px;
  height: 240px;
  shadow-color: #000;
  shadow-opacity: 0.15;
  shadow-radius: 8px;
  elevation: 4;
  justify-content: space-between;
  position: relative;
  overflow: hidden;
`;

const CardIconRight = styled.View`
  width: 30%;
  height: 100%;
  flex-direction: row;
  justify-content: flex-end;
  align-items: center;
  padding-right: ${theme.spacing.lg}px;
  align-self: flex-end;
`;

const CardHeader = styled.View`
  flex-direction: row;
  gap: ${theme.spacing.md}px;
  align-items: flex-start;
  flex: 1;
`;

const CardIconBox = styled.View`
  width: 60px;
  height: 60px;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: ${theme.borderRadius.lg}px;
  justify-content: center;
  align-items: center;
`;

const CardTitle = styled.Text`
  color: white;
  font-size: ${theme.fonts.sizes.lg}px;
  font-weight: 700;
  margin-bottom: ${theme.spacing.sm}px;
`;

const CardContent = styled.View`
  gap: ${theme.spacing.sm}px;
`;

const CardText = styled.Text`
  color: white;
  font-size: ${theme.fonts.sizes.sm}px;
  line-height: ${theme.fonts.sizes.sm * 1.5}px;
`;

// Departure Card 전용 스타일
const DepartureInfoContainer = styled.View`
  flex: 1;
  justify-content: center;
  align-items: flex-start;
  gap: ${theme.spacing.sm}px;
  padding-left: 0;
`;

// 박스 스타일
const InfoBox = styled.View`
  background-color: rgba(255, 255, 255, 0.15);
  border-radius: ${theme.borderRadius.md}px;
  padding: 2px ${theme.spacing.md}px;
  align-self: flex-start;
  margin-left: -${theme.spacing.md}px;
`;

const StationBusInfo = styled.Text`
  color: white;
  font-size: ${theme.fonts.sizes.md + 3}px;
  font-weight: 600;
  text-align: left;
`;

const ArrivalInfo = styled.Text`
  color: white;
  font-size: ${(theme.fonts.sizes.xxl || 32) + 3}px;
  font-weight: 800;
  line-height: ${((theme.fonts.sizes.xxl || 32) + 3) * 1.15}px;
  text-align: left;
`;

const NextBusInfo = styled.Text`
  color: rgba(255, 255, 255, 0.8);
  font-size: ${theme.fonts.sizes.sm + 3}px;
  font-weight: 500;
  text-align: left;
  margin-top: 2px;
`;

const DepartureAlertBox = styled.View`
  background-color: rgba(255, 255, 255, 0.25);
  border-radius: ${theme.borderRadius.md}px;
  padding: ${theme.spacing.sm}px ${theme.spacing.md}px;
  align-self: flex-start;
  margin-top: ${theme.spacing.xs}px;
`;

const DepartureAlert = styled.Text`
  color: white;
  font-size: ${theme.fonts.sizes.sm + 3}px;
  font-weight: 700;
  text-align: left;
`;

const CardBadge = styled.View`
  background-color: rgba(255, 255, 255, 0.3);
  border-radius: ${theme.borderRadius.md}px;
  padding: ${theme.spacing.sm}px ${theme.spacing.md}px;
  align-self: flex-start;
`;

const CardBadgeText = styled.Text`
  color: white;
  font-size: ${theme.fonts.sizes.xs}px;
  font-weight: 600;
`;

// Phase 8.3: 여정 세부 사항 카드
const JourneyDetailsCard = styled.View`
  background-color: white;
  border-radius: ${theme.borderRadius.lg}px;
  overflow: hidden;
  shadow-color: #000;
  shadow-opacity: 0.1;
  shadow-radius: 6px;
  elevation: 3;
`;

const JourneyHeaderBar = styled.View`
  background-color: #0066FF;
  padding: ${theme.spacing.lg}px;
  flex-direction: row;
  justify-content: space-between;
`;

const JourneyHeaderText = styled.Text<{ isSubtitle?: boolean }>`
  color: white;
  font-size: ${(props) => props.isSubtitle ? theme.fonts.sizes.xs : theme.fonts.sizes.lg}px;
  font-weight: ${(props) => props.isSubtitle ? '400' : '700'};
`;

// JourneyStepsContainer는 ref를 사용하기 위해 일반 ScrollView로 변경
// 스타일은 인라인으로 적용

// JourneyStepsContainer의 contentContainerStyle을 위한 스타일
const JourneyStepsContent = styled.View`
  padding-bottom: ${theme.spacing.md}px;
`;

const StepItem = styled.View`
  margin-bottom: ${theme.spacing.md}px;
  flex-direction: row;
  gap: ${theme.spacing.md}px;
`;

const StepIconContainer = styled.View`
  width: 50px;
  height: 50px;
  border-radius: 25px;
  background-color: #E8E8E8;
  justify-content: center;
  align-items: center;
  shadow-color: #999;
  shadow-opacity: 0.1;
  shadow-radius: 4px;
  elevation: 1;
`;

const StepContentBox = styled.View`
  flex: 1;
  background-color: #F8F8F8;
  border-radius: ${theme.borderRadius.md}px;
  padding: ${theme.spacing.md}px;
`;

const StepTitle = styled.Text`
  color: ${theme.colors.text};
  font-size: ${theme.fonts.sizes.sm}px;
  font-weight: 600;
`;

const StepDescription = styled.Text`
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fonts.sizes.xs}px;
  margin-top: 4px;
`;

// Quick Actions Grid
const QuickActionsGrid = styled.View`
  flex-direction: row;
  gap: ${theme.spacing.md}px;
`;

const QuickActionButton = styled.View`
  flex: 1;
  background-color: #0066FF;
  border-radius: ${theme.borderRadius.lg}px;
  padding: ${theme.spacing.md}px;
  height: 56px;
  justify-content: center;
  align-items: center;
  shadow-color: #0066FF;
  shadow-opacity: 0.3;
  shadow-radius: 6px;
  elevation: 3;
`;

const QuickActionText = styled.Text`
  color: white;
  font-size: ${theme.fonts.sizes.md}px;
  font-weight: 600;
`;

// Footer
const FooterContainer = styled.View`
  padding: ${theme.spacing.lg}px;
  align-items: center;
  gap: ${theme.spacing.sm}px;
`;

const FooterText = styled.Text`
  font-size: ${theme.fonts.sizes.xs}px;
  color: ${theme.colors.textSecondary};
  text-align: center;
`;

// OpenAPI 스펙에 맞는 응답 타입
interface CommuteBriefingResponse {
  data: {
    alertType: 'GO_NOW' | 'LAST_CHANCE' | 'NO_ACTION';
    message: string;
    recommendedTransport: {
      type: string;
      name: string;
      departureInMinutes: number;
    };
  };
}

const DailyBriefingScreen: React.FC = () => {
  // Phase 8.0: 로컬 상태 관리 (IntelligentDashboard 패턴)
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isSearchBarExpanded, setIsSearchBarExpanded] = useState(false);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');

  // Bus 애니메이션 (화면 밖에서 현재 위치까지)
  const busTranslateX = useRef(new Animated.Value(200)).current; // 화면 밖 오른쪽에서 시작
  const busTranslateY = useRef(new Animated.Value(-100)).current; // 화면 밖 위에서 시작

  useEffect(() => {
    // 무한 반복 애니메이션
    const animateBus = () => {
      // 초기 위치로 리셋 (화면 밖)
      busTranslateX.setValue(200);
      busTranslateY.setValue(-100);

      Animated.parallel([
        Animated.timing(busTranslateX, {
          toValue: 0, // 현재 위치로 이동
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(busTranslateY, {
          toValue: 0, // 현재 위치로 이동
          duration: 3000,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // 애니메이션 완료 후 즉시 다시 시작
        animateBus();
      });
    };

    animateBus();
  }, []);

  // 즐겨찾기 목록
  const favorites = [
    { id: '1', name: '집', icon: '🏠' },
    { id: '2', name: '회사', icon: '🏢' },
    { id: '3', name: '헬스장', icon: '💪' },
    { id: '4', name: '추가', icon: '➕' },
  ];

  // Zustand Store: UI 상태 관리 (헌법 제2장 준수)
  const { isExpanded, setExpanded, toggleExpanded, setSelectedTab } =
    useJourneySelectorStore();

  // Phase 5: Ambient Feedback Store - 배경색 상태 관리
  const { status: ambientStatus, setStatus: setAmbientStatus } =
    useAmbientFeedbackStore();

  // Phase 6: App Mode Store - 앱 상태 관리 (Briefing/Explore Mode)
  const { appMode, updateAppMode } = useAppModeStore();

  // Phase 7: Network Store - 네트워크 상태 관리 (오프라인 감지)
  const { isOffline, lastUpdated, setOffline, setLastUpdated } =
    useNetworkStore();

  // React Query useQuery (헌법 제3장 준수)
  // 서버 상태 (API 데이터)는 React Query로 관리 - Zustand에는 절대 저장 금지
  const { data, isLoading, isError } = useQuery({
    queryKey: ['commuteBriefing'],
    queryFn: async (): Promise<CommuteBriefingResponse> => {
      const response = await apiClient.get('/briefings/commute');
      return response.data;
    },
  });

  // Phase 6: 시간 기반 앱 모드 자동 전환 (useEffect)
  // 시간이 변경될 때마다 현재 시간에 기반해 모드를 업데이트
  React.useEffect(() => {
    // 초기 모드 설정
    updateAppMode();

    // 시간 변화 감지를 위한 인터벌 (1분마다 모드 체크)
    const modeCheckInterval = setInterval(() => {
      updateAppMode();
    }, 60000); // 60초마다 체크

    return () => clearInterval(modeCheckInterval);
  }, [updateAppMode]);

  // Phase 6: 앱 모드에 따라 JourneySelector 상태 설정
  // - Briefing Mode: Collapsed (isExpanded = false)
  // - Explore Mode: Expanded (isExpanded = true)
  React.useEffect(() => {
    if (appMode === 'briefing') {
      // Briefing Mode: 여정 선택기는 collapsed 상태
      setExpanded(false);
    } else {
      // Explore Mode: 여정 선택기는 expanded 상태
      setExpanded(true);
    }
  }, [appMode, setExpanded]);

  // Phase 5: alertType에 따라 배경색 상태 업데이트
  React.useEffect(() => {
    if (data?.data?.alertType) {
      switch (data.data.alertType) {
        case 'GO_NOW':
          // Logic 3.1: 정상 상태 (파란색)
          setAmbientStatus('normal');
          break;
        case 'LAST_CHANCE':
          // Logic 3.1: 지연 감지 시뮬레이션 (주황색)
          setAmbientStatus('warning');
          break;
        case 'NO_ACTION':
          // 정상 상태 (파란색)
          setAmbientStatus('normal');
          break;
      }
    }
  }, [data?.data?.alertType, setAmbientStatus]);

  // Phase 7: 네트워크 상태 모니터링
  // GPS/모바일 데이터 30초 이상 수신 불가 시 오프라인 표시
  React.useEffect(() => {
    // 실제 환경에서는 react-native-netinfo 라이브러리 사용
    // 현재는 API 호출 상태를 기반으로 네트워크 상태 추정
    if (isError) {
      // API 호출 실패 = 네트워크 문제
      setOffline(true);
    } else if (isLoading === false && !isError) {
      // API 호출 성공 = 네트워크 정상
      setOffline(false);
      setLastUpdated(new Date());
    }
  }, [isError, isLoading, setOffline, setLastUpdated]);

  // 여정 선택기 핸들러
  const handleExpandPress = () => {
    toggleExpanded();
  };

  const handleCollapsePress = () => {
    setExpanded(false);
  };

  const handleTabSelect = (tab: 'commute' | 'retreat' | 'gym') => {
    setSelectedTab(tab);
  };

  // Phase 8.1: 캐러셀 카드 너비 (SafeArea 제외)
  const screenWidth = Dimensions.get('window').width;
  const cardWidth = screenWidth - theme.spacing.md * 2; // Container padding 제외

  // Phase 8.1: Quick Action 핸들러
  const handleDepartureAlarmPress = () => {
    // TODO: 출발 알림 액션 구현 (Phase 3의 Logic 1.1 연동)
    console.log('출발 알림 버튼 클릭');
  };

  const handleCheckHazardsPress = () => {
    // TODO: 위험 확인 액션 구현 (Phase 2의 안전 정보 표시)
    console.log('위험 확인 버튼 클릭');
  };


  // 로딩 상태
  if (isLoading) {
    return (
      <OuterContainer ambientStatus={ambientStatus}>
        <LoadingContainer>
          <LoadingText>로딩 중</LoadingText>
        </LoadingContainer>
      </OuterContainer>
    );
  }

  // 에러 상태
  if (isError || !data?.data) {
    return (
      <OuterContainer ambientStatus={ambientStatus}>
        <LoadingContainer>
          <LoadingText>브리핑 정보를 불러올 수 없습니다.</LoadingText>
        </LoadingContainer>
      </OuterContainer>
    );
  }

  const briefingData = data.data;

  // Phase 8.0: IntelligentDashboard 카드 데이터
  const cards = [
    {
      id: 'departure',
      icon: '🚀',
      title: '지금 출발하세요!',
      bgGradient: '#0066FF',
      content: `${briefingData.recommendedTransport?.departureInMinutes || 5}분 뒤 ${briefingData.recommendedTransport?.name || '버스'} 도착`,
      badges: ['쾌적한 출근길', '정시 도착 예상'],
    },
    {
      id: 'hazard',
      icon: '⚠️',
      title: '출발 전 확인!',
      bgGradient: '#FF5722',
      content: '내 경로에 2건의 위험이 감지되었습니다',
      badges: ['🚧 도로 공사', '🚗 교통사고'],
    },
    {
      id: 'weather',
      icon: '🌧️',
      title: '날씨 체크!',
      bgGradient: '#40B0FF',
      content: '오늘 오후 비 예보 · 강수확률 80% · 18°C',
      badges: ['☂️ 우산을 챙기세요'],
    },
    {
      id: 'traffic',
      icon: '📈',
      title: '실시간 교통정보',
      bgGradient: '#9C27B0',
      content: '강남대로 보통 · 평소보다 5분 더 소요',
      badges: ['출근 시간 45분', '도착 예정 9:15'],
    },
  ];

  return (
    <OuterContainer ambientStatus={ambientStatus}>
      {/* Phase 7: 오프라인 배너 */}
      <OfflineBanner isOffline={isOffline} lastUpdated={lastUpdated} />

      <ScrollContainer 
        showsVerticalScrollIndicator={false} 
        scrollEventThrottle={16}
        nestedScrollEnabled={true}
      >
        <Container>
          {/* Phase 8.1: 확장/축소 가능한 검색 바 */}
          <SearchBarContainer>
            {!isSearchBarExpanded ? (
              // 축소된 상태
              <>
                <CollapsedSearchBar>
                  <JourneyTabsContainer>
                    <TouchableOpacity
                      onPress={() => handleTabSelect('commute')}
                      style={{ flex: 1 }}
                    >
                      <JourneyTab isActive={true}>
                        <JourneyTabText isActive={true}>출근</JourneyTabText>
                      </JourneyTab>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleTabSelect('gym')}
                      style={{ flex: 1 }}
                    >
                      <JourneyTab isActive={false}>
                        <JourneyTabText isActive={false}>헬스장</JourneyTabText>
                      </JourneyTab>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleTabSelect('retreat')}
                      style={{ flex: 1 }}
                    >
                      <JourneyTab isActive={false}>
                        <JourneyTabText isActive={false}>귀가</JourneyTabText>
                      </JourneyTab>
                    </TouchableOpacity>
                  </JourneyTabsContainer>
                </CollapsedSearchBar>

                {/* 확장 버튼 (아래쪽 화살표) */}
                <TouchableOpacity onPress={() => setIsSearchBarExpanded(true)}>
                  <ToggleButton>
                    <ToggleButtonText>⌄</ToggleButtonText>
                  </ToggleButton>
                </TouchableOpacity>
              </>
            ) : (
              // 확장된 상태
              <>
                <ExpandedSearchBar>
                  {/* 축소 버튼 */}
                  <TouchableOpacity onPress={() => setIsSearchBarExpanded(false)}>
                    <ToggleButton>
                      <ToggleButtonText>⌃</ToggleButtonText>
                    </ToggleButton>
                  </TouchableOpacity>

                  {/* 출발지/목적지 입력 */}
                  <SearchInputContainer>
                    <SearchInputWrapper>
                      <SearchInput
                        placeholder="출발지"
                        value={origin}
                        onChangeText={setOrigin}
                        placeholderTextColor="#999"
                      />
                    </SearchInputWrapper>
                    <TouchableOpacity
                      onPress={() => {
                        // 출발지와 목적지 교환
                        const temp = origin;
                        setOrigin(destination);
                        setDestination(temp);
                      }}
                    >
                      <ArrowIcon>
                        <ArrowIconText>⇄</ArrowIconText>
                      </ArrowIcon>
                    </TouchableOpacity>
                    <SearchInputWrapper>
                      <SearchInput
                        placeholder="목적지"
                        value={destination}
                        onChangeText={setDestination}
                        placeholderTextColor="#999"
                      />
                    </SearchInputWrapper>
                  </SearchInputContainer>

                  {/* 즐겨찾기 목록 */}
                  <FavoritesList>
                    {favorites.map((fav) => (
                      <TouchableOpacity
                        key={fav.id}
                        onPress={() => {
                          if (!origin) {
                            setOrigin(fav.name);
                          } else if (!destination) {
                            setDestination(fav.name);
                          }
                        }}
                      >
                        <FavoriteItem>
                          <FavoriteIcon>
                            <FavoriteIconText>{fav.icon}</FavoriteIconText>
                          </FavoriteIcon>
                          <FavoriteName>{fav.name}</FavoriteName>
                        </FavoriteItem>
                      </TouchableOpacity>
                    ))}
                  </FavoritesList>
                </ExpandedSearchBar>
              </>
            )}
          </SearchBarContainer>

          {/* Phase 8.2: CTA Cards Carousel (그래디언트 카드) */}
          <ScrollView
            horizontal
            pagingEnabled={false}
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            snapToInterval={cardWidth}
            decelerationRate="fast"
            onMomentumScrollEnd={(event) => {
              const contentOffsetX = event.nativeEvent.contentOffset.x;
              const currentIndex = Math.round(contentOffsetX / cardWidth);
              setActiveCardIndex(currentIndex);
            }}
            testID="cta-carousel"
          >
            {cards.map((card) => (
              <View key={card.id} style={{ width: cardWidth }}>
                <CardBase bgGradient={card.bgGradient}>
                  {card.id === 'departure' ? (
                    /* 출발 정보 + Bus Icon */
                    <View style={{ width: '100%', height: '100%', flexDirection: 'row', alignItems: 'center', paddingRight: theme.spacing.lg, marginLeft: -theme.spacing.md, paddingLeft: theme.spacing.md }}>
                      {/* 왼쪽: 정보 영역 (70%) */}
                      <DepartureInfoContainer>
                        {/* 역삼역 3번 출구 (박스 없음) */}
                        <StationBusInfo>역삼역 3번 출구</StationBusInfo>

                        {/* 박스: 146번 버스, 5분 후 도착, 다음 버스 15분 후 */}
                        <InfoBox>
                          <StationBusInfo>146번 버스</StationBusInfo>
                          <ArrivalInfo>5분 후 도착</ArrivalInfo>
                          <NextBusInfo>다음 버스 15분 후</NextBusInfo>
                        </InfoBox>

                        {/* 지금 출발해야합니다 (박스 없음) */}
                        <DepartureAlert>지금 출발해야합니다</DepartureAlert>
                      </DepartureInfoContainer>
                      
                      {/* 오른쪽: Bus Icon + 배경 (30%) */}
                      <View style={{ width: '30%', height: '100%', alignItems: 'flex-end', justifyContent: 'center', position: 'relative', paddingRight: theme.spacing.sm }}>
                        {/* 배경: Road (버스 밑) - 길이 연장 */}
                        
                        <View style={{ position: 'absolute', top:29, right: -120, width: 420, height: 180, zIndex: 2 }}>
                          <Image 
                            source={require('../../assets/Road.png')} 
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="contain"
                          />
                        </View>
                        <View style={{ position: 'absolute', bottom: 25, right: -200, width: 420, height: 180, zIndex: 1 }}>
                          <Image 
                            source={require('../../assets/Road.png')} 
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="contain"
                          />
                        </View>
                        
                        {/* 배경: BusStop (첫 번째 도로 위) */}
                        <View style={{ position: 'absolute', top: -50, right: -20, width: 250, height: 250, zIndex: 2 }}>
                          <Image 
                            source={require('../../assets/BusStop.png')} 
                            style={{ width: '100%', height: '100%', transform: [{ scaleX: -1 }] }}
                            resizeMode="contain"
                          />
                        </View>
                        
                        {/* Bus Icon (앞쪽) - 애니메이션 */}
                        <Animated.View 
                          style={{ 
                            zIndex: 3,
                            transform: [
                              { translateX: busTranslateX },
                              { translateY: busTranslateY },
                              { scaleX: -1 }
                            ]
                          }}
                        >
                          <Image 
                            source={require('../../assets/BusIcon.png')} 
                            style={{ left: 15, bottom: -5, width: 120, height: 120 }}
                            resizeMode="contain"
                          />
                        </Animated.View>
                      </View>
                    </View>
                  ) : (
                    <>
                  <CardHeader>
                    <CardIconBox>
                      <CardTitle style={{ fontSize: 28 }}>{card.icon}</CardTitle>
                    </CardIconBox>
                    <View style={{ flex: 1 }}>
                      <CardTitle>{card.title}</CardTitle>
                    </View>
                  </CardHeader>

                  <CardContent>
                    <CardText>{card.content}</CardText>
                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                      {card.badges.map((badge, idx) => (
                        <CardBadge key={idx}>
                          <CardBadgeText>{badge}</CardBadgeText>
                        </CardBadge>
                      ))}
                    </View>
                  </CardContent>
                    </>
                  )}

                  {/* Carousel pagination dots */}
                  <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 8 }}>
                    {cards.map((_, dotIndex) => (
                      <View
                        key={dotIndex}
                        style={{
                          width: dotIndex === activeCardIndex ? 20 : 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: 'rgba(255, 255, 255, ' + (dotIndex === activeCardIndex ? '1' : '0.4') + ')',
                        }}
                      />
                    ))}
                  </View>
                </CardBase>
              </View>
            ))}
          </ScrollView>

          {/* Phase 8.3: Journey Details Card */}
          <JourneyDetailsCard>
            <JourneyHeaderBar>
              <View>
                <JourneyHeaderText isSubtitle>총 예상 소요 시간</JourneyHeaderText>
                <JourneyHeaderText>45분</JourneyHeaderText>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <JourneyHeaderText isSubtitle>여정 단계</JourneyHeaderText>
                <JourneyHeaderText>5개</JourneyHeaderText>
              </View>
            </JourneyHeaderBar>

            <ScrollView
              style={{
                height: 450,
                padding: theme.spacing.md,
              }}
              scrollEnabled={true}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
              bounces={true}
            >
              <JourneyStepsContent>
              {[
                { icon: '🏠', title: '집', description: '서울시 강남구 역삼동', duration: 0 },
                { icon: '👣', title: '도보 이동', description: '역삼역 3번 출구까지', duration: 5 },
                { icon: '🚇', title: '2호선 탑승', description: '시청역 방면 · 3-2칸 추천', duration: 30 },
                { icon: '👣', title: '도보 이동', description: '시청역 2번 출구에서', duration: 5 },
                { icon: '🏢', title: '회사', description: '서울시 중구 시청역', duration: 0 },
              ].map((step, index) => (
                  <StepItem key={index}>
                    <StepIconContainer>
                      <CardTitle style={{ fontSize: 22, color: '#666' }}>{step.icon}</CardTitle>
                  </StepIconContainer>
                  <StepContentBox>
                    <StepTitle>{step.title}</StepTitle>
                    <StepDescription>{step.description}</StepDescription>
                  </StepContentBox>
                  {step.duration > 0 && (
                    <View style={{ justifyContent: 'center', alignItems: 'center', minWidth: 50 }}>
                      <CardTitle style={{ fontSize: 24, color: '#0066FF' }}>{step.duration}</CardTitle>
                      <StepDescription>분</StepDescription>
                    </View>
                  )}
                </StepItem>
              ))}
              </JourneyStepsContent>
            </ScrollView>
          </JourneyDetailsCard>

          {/* Phase 8.4: Quick Actions Grid */}
          <QuickActionsGrid>
            <TouchableOpacity
              onPress={handleDepartureAlarmPress}
              style={{ flex: 1 }}
              activeOpacity={0.8}
            >
              <QuickActionButton>
                <QuickActionText>🔔 출발 알림</QuickActionText>
              </QuickActionButton>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleCheckHazardsPress}
              style={{ flex: 1 }}
              activeOpacity={0.8}
            >
              <QuickActionButton style={{ backgroundColor: '#FF5722' }}>
                <QuickActionText>⚠️ 위험 확인</QuickActionText>
              </QuickActionButton>
            </TouchableOpacity>
          </QuickActionsGrid>

          {/* Phase 8.5: Footer Info */}
          <FooterContainer>
            <FooterText>협력 서비스: Odsay API, SKT 혼잡도 API, 행정안전부</FooterText>
            <FooterText>실시간 정보는 5분마다 자동 업데이트됩니다</FooterText>
          </FooterContainer>
        </Container>
      </ScrollContainer>
    </OuterContainer>
  );
};

export default DailyBriefingScreen;

