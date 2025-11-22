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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import apiClient from '../../services/api';
import { theme } from '../../styles/theme';
import { useJourneySelectorStore } from '../../stores/useJourneySelectorStore';
import { useAmbientFeedbackStore, type AmbientFeedbackStatus } from '../../stores/useAmbientFeedbackStore';
import { useAppModeStore, type AppMode } from '../../stores/useAppModeStore';
import { useNetworkStore } from '../../stores/useNetworkStore';
import { useOnboardingData } from '../Onboarding/stores/useOnboardingStore';
import { JourneySelector, HeroCard, WeatherCard, AlternativePathCard, Carousel, StepCards, OfflineBanner, RealtimeTrackingCard } from './components';
import { BusIcon } from '../../components/icons/BusIcon';
import useRealTimeTracking from '../../hooks/useRealTimeTracking';
import { useTrackingState, useTrackingActions } from '../../stores/useTrackingStore';
import { defineLocationTrackingTask } from '../../services/locationTrackingService';
import { formatTime } from '../../services/routeTrackingService';
import { useGetWeatherQuery, getWeatherDescription, getWeatherRecommendations } from '../../hooks/queries/useGetWeatherQuery';

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
  padding: ${theme.spacing.xs}px ${theme.spacing.sm}px;
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
  padding: ${theme.spacing.md}px ${theme.spacing.lg}px ${theme.spacing.sm}px ${theme.spacing.lg}px;
  gap: ${theme.spacing.xs}px;
`;

const SearchInputContainer = styled.View`
  flex-direction: row;
  gap: ${theme.spacing.md}px;
  align-items: center;
  margin-bottom: ${theme.spacing.xs}px;
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
  margin-top: ${theme.spacing.xs}px;
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

// Departure Card 전용 스타일 - 3-Layer 리디자인 (CTAGuide.md 기반)
// Layer 1: 헤더 (20%) - 목적지 + 도착 시간
// Layer 2: 타임라인 (45%) - 진행 상황 + 버스 아이콘
// Layer 3: 넥스트 액션 (35%) - 다음 환승 정보

const DepartureCardContainer = styled.View`
  width: 100%;
  height: 100%;
  flex-direction: column;
  justify-content: space-between;
`;

// ========== Layer 1: Header (20%) ==========
const Layer1Header = styled.View`
  flex: 0;
  height: 20%;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.md}px;
  border-bottom-width: 1px;
  border-bottom-color: rgba(255, 255, 255, 0.2);
`;

const Layer1GoalSection = styled.View`
  flex: 1;
  justify-content: center;
`;

const Layer1GoalLabel = styled.Text`
  color: rgba(255, 255, 255, 0.9);
  font-size: ${theme.fonts.sizes.xs}px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: ${theme.spacing.xs}px;
`;

const Layer1GoalName = styled.Text`
  color: white;
  font-size: ${theme.fonts.sizes.lg}px;
  font-weight: 700;
`;

const Layer1TimeSection = styled.View`
  align-items: flex-end;
  justify-content: center;
`;

const Layer1ArrivalTime = styled.Text`
  color: white;
  font-size: ${theme.fonts.sizes.xl}px;
  font-weight: 800;
  letter-spacing: -0.5px;
`;

const Layer1ArrivalLabel = styled.Text`
  color: rgba(255, 255, 255, 0.8);
  font-size: ${theme.fonts.sizes.xs}px;
  font-weight: 500;
  margin-top: ${theme.spacing.xs}px;
`;

// ========== Layer 2: Timeline (45%) ==========
const Layer2Timeline = styled.View`
  flex: 0;
  height: 45%;
  justify-content: center;
  align-items: center;
  padding: ${theme.spacing.lg}px ${theme.spacing.md}px;
  gap: ${theme.spacing.md}px;
`;

const ProgressBarContainer = styled.View`
  width: 100%;
  height: 8px;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: ${theme.spacing.md}px;
`;

interface ProgressBarProps {
  progress: number; // 0-100
}

const ProgressBar = styled.View<ProgressBarProps>`
  height: 100%;
  width: ${(props) => props.progress}%;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 4px;
`;

const BusIconWrapper = styled.View`
  align-items: center;
  margin-bottom: ${theme.spacing.md}px;
`;

const Layer2ProgressText = styled.Text`
  color: rgba(255, 255, 255, 0.9);
  font-size: ${theme.fonts.sizes.md}px;
  font-weight: 600;
  text-align: center;
  margin-top: ${theme.spacing.md}px;
`;

// ========== Layer 3: Next Action (35%) ==========
const Layer3NextAction = styled.View`
  flex: 0;
  height: 35%;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: ${theme.borderRadius.md}px;
  padding: ${theme.spacing.md}px;
  margin: ${theme.spacing.sm}px;
  justify-content: center;
`;

const Layer3Title = styled.Text`
  color: rgba(255, 255, 255, 0.9);
  font-size: ${theme.fonts.sizes.xs}px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: ${theme.spacing.sm}px;
`;

const Layer3Content = styled.View`
  gap: ${theme.spacing.sm}px;
`;

const Layer3TransitInfo = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const Layer3TransitIcon = styled.Text`
  font-size: ${theme.fonts.sizes.xl}px;
  margin-right: ${theme.spacing.sm}px;
`;

const Layer3TransitNumber = styled.Text`
  color: white;
  font-size: ${theme.fonts.sizes.lg}px;
  font-weight: 700;
  flex: 1;
`;

const Layer3TransitTime = styled.Text`
  color: rgba(255, 255, 255, 0.9);
  font-size: ${theme.fonts.sizes.md}px;
  font-weight: 600;
`;

const Layer3TransitDetail = styled.Text`
  color: rgba(255, 255, 255, 0.7);
  font-size: ${theme.fonts.sizes.xs}px;
  font-weight: 500;
  margin-top: ${theme.spacing.xs}px;
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
  const navigation = useNavigation<StackNavigationProp<any>>();

  // Phase 8.0: 로컬 상태 관리 (IntelligentDashboard 패턴)
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isSearchBarExpanded, setIsSearchBarExpanded] = useState(false);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [selectedJourneyIndex, setSelectedJourneyIndex] = useState(0); // 현재 선택된 여정 인덱스

  // Bus 애니메이션 주석 처리 (나중에 추가 예정)
  // const busTranslateX = useRef(new Animated.Value(200)).current; // 화면 밖 오른쪽에서 시작
  // const busTranslateY = useRef(new Animated.Value(-100)).current; // 화면 밖 위에서 시작

  // useEffect(() => {
  //   // 무한 반복 애니메이션
  //   const animateBus = () => {
  //     // 초기 위치로 리셋 (화면 밖)
  //     busTranslateX.setValue(200);
  //     busTranslateY.setValue(-100);

  //     Animated.parallel([
  //       Animated.timing(busTranslateX, {
  //         toValue: 0, // 현재 위치로 이동
  //         duration: 3000,
  //         useNativeDriver: true,
  //       }),
  //       Animated.timing(busTranslateY, {
  //         toValue: 0, // 현재 위치로 이동
  //         duration: 3000,
  //         useNativeDriver: true,
  //       }),
  //     ]).start(() => {
  //       // 애니메이션 완료 후 즉시 다시 시작
  //       animateBus();
  //     });
  //   };

  //   animateBus();
  // }, []);

  // 온보딩에서 설정한 장소 데이터 가져오기
  const { places, pathSelection, schedule } = useOnboardingData();

  // 실시간 추적 상태 가져오기
  const trackingState = useTrackingState();
  const trackingActions = useTrackingActions();

  // 🎭 발표용 목업 데이터 생성 함수들
  const createMockJourneys = () => {
    return [
      {
        id: 'mock-depart-home',
        placeId: 'home',
        placeName: '집',
        placeIcon: '🏠',
        placeAddress: '고암길 251',
        placeX: '127.072042',
        placeY: '37.837996',
        type: 'depart' as const,
        time: '09:00',
      },
      {
        id: 'mock-arrive-work',
        placeId: 'work',
        placeName: '회사',
        placeIcon: '🏢',
        placeAddress: '의정부 CGV',
        placeX: '127.045076',
        placeY: '37.774827',
        type: 'arrive' as const,
        time: '10:00',
      },
      {
        id: 'mock-depart-work',
        placeId: 'work',
        placeName: '회사',
        placeIcon: '🏢',
        placeAddress: '의정부 CGV',
        placeX: '127.045076',
        placeY: '37.774827',
        type: 'depart' as const,
        time: '18:00',
      },
      {
        id: 'mock-arrive-home',
        placeId: 'home',
        placeName: '집',
        placeIcon: '🏠',
        placeAddress: '고암길 251',
        placeX: '127.072042',
        placeY: '37.837996',
        type: 'arrive' as const,
        time: '19:00',
      },
    ];
  };

  const createMockPath = (isHomeToWork: boolean) => {
    // 집->회사: 도보 -> 버스 -> 도보
    // 회사->집: 도보 -> 지하철 -> 도보
    if (isHomeToWork) {
      return {
        id: 'mock-path-home-work',
        totalTime: 3600, // 60분
        totalTimeMinutes: 60,
        totalDistance: 15000, // 15km
        totalDistanceKm: '15.0',
        transferCount: 0,
        fare: 1500,
        subPath: [
          {
            trafficType: 3, // 도보
            distance: 500,
            sectionTime: 360, // 6분
            startName: '고암길 251',
            endName: '덕정고.한국병원',
          },
          {
            trafficType: 2, // 버스
            distance: 14000,
            sectionTime: 3000, // 50분
            stationCount: 30,
            lane: [{ busNo: '80', type: 1 }],
            startName: '덕정고.한국병원',
            endName: '의정부 CGV',
          },
          {
            trafficType: 3, // 도보
            distance: 500,
            sectionTime: 240, // 4분
            startName: '의정부 CGV',
            endName: '의정부 CGV',
          },
        ],
      };
    } else {
      return {
        id: 'mock-path-work-home',
        totalTime: 3300, // 55분
        totalTimeMinutes: 55,
        totalDistance: 14000, // 14km
        totalDistanceKm: '14.0',
        transferCount: 0,
        fare: 1500,
        subPath: [
          {
            trafficType: 3, // 도보
            distance: 400,
            sectionTime: 300, // 5분
            startName: '의정부 CGV',
            endName: '의정부역',
          },
          {
            trafficType: 1, // 지하철
            distance: 13000,
            sectionTime: 2700, // 45분
            stationCount: 20,
            lane: [{ subwayName: '1호선', subwayCode: 1 }],
            startName: '의정부역',
            endName: '덕정역',
          },
          {
            trafficType: 3, // 도보
            distance: 600,
            sectionTime: 300, // 5분
            startName: '덕정역',
            endName: '고암길 251',
          },
        ],
      };
    }
  };

  const createMockJourneyTabs = () => {
    return [
      {
        id: 'mock-depart-home|mock-arrive-work',
        label: '집→회사',
        icon: '🏠',
      },
      {
        id: 'mock-depart-work|mock-arrive-home',
        label: '회사→집',
        icon: '🏢',
      },
    ];
  };

  // 🎭 발표용 목업 데이터 사용 여부 결정
  const USE_MOCK_DATA = true; // 발표용: true, 실제 사용: false

  // 🐛 DEBUG: 온보딩 데이터 전체 확인
  React.useEffect(() => {
    console.log('\n=== 🔍 데일리브리핑 온보딩 데이터 디버그 ===');
    console.log('📍 pathSelection.journeys 데이터:', {
      count: pathSelection.journeys?.length || 0,
      data: pathSelection.journeys,
    });
    console.log('🛣️ pathSelection.selectedPaths:', {
      keys: pathSelection.selectedPaths ? Object.keys(pathSelection.selectedPaths) : [],
      data: pathSelection.selectedPaths,
    });
    console.log('📅 schedule:', schedule);
    console.log('🏠 places:', places);
    console.log('====================================\n');
  }, [pathSelection, places, schedule]);

  // 백그라운드 위치 추적 태스크 초기화 (앱 시작 시 한 번만)
  React.useEffect(() => {
    const initializeTracking = async () => {
      try {
        console.log('[DailyBriefingScreen] 위치 추적 태스크 초기화...');
        await defineLocationTrackingTask();
      } catch (error) {
        console.error('[DailyBriefingScreen] 위치 추적 태스크 초기화 실패:', error);
      }
    };
    initializeTracking();
  }, []);

  // 현재 요일 가져오기 (MON, TUE, WED, THU, FRI, SAT, SUN)
  const getCurrentDayOfWeek = (): string => {
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    return days[new Date().getDay()];
  };

  // 온보딩에서 설정한 여정들을 요일별로 필터링하여 탭으로 변환
  const journeyTabs = React.useMemo(() => {
    console.log('\n📱 [journeyTabs] 탭 생성 시작');

    const journeysToUse = USE_MOCK_DATA && (!pathSelection.journeys || pathSelection.journeys.length === 0)
      ? createMockJourneys()
      : pathSelection.journeys;

    if (!journeysToUse || journeysToUse.length === 0) {
      console.log('❌ [journeyTabs] 여정 데이터 없음');
      return [];
    }

    const currentDay = getCurrentDayOfWeek();
    const scheduledDays = schedule.daysOfWeek || [];

    console.log(`📅 [journeyTabs] 현재 요일: ${currentDay}, 예약된 요일: ${JSON.stringify(scheduledDays)}`);

    // 🎭 목업 데이터 사용 시 스케줄 체크 건너뛰기
    // 오늘 요일이 스케줄에 포함되어 있지 않으면 빈 배열 반환
    if (!USE_MOCK_DATA && !scheduledDays.includes(currentDay)) {
      console.log('⏭️ [journeyTabs] 오늘은 예약된 여정이 없음');
      return [];
    }

    const tabs: Array<{ id: string; label: string; icon: string }> = [];
    const segments = journeysToUse;

    console.log(`📊 [journeyTabs] 전체 ${segments.length}개 여정 처리 시작`);
    console.log('📋 [journeyTabs] 여정 목록:', segments.map(s => ({ id: s.id, name: s.placeName, type: s.type, time: s.time })));

    // segments를 2개씩 묶어서 (출발 -> 도착) 여정 그룹으로 변환
    for (let i = 0; i < segments.length; i += 2) {
      const depart = segments[i];
      const arrive = segments[i + 1];

      console.log(`\n  🔗 쌍 ${Math.floor(i / 2)}: [${depart?.id}(${depart?.type})] -> [${arrive?.id}(${arrive?.type})]`);

      if (depart && arrive && depart.type === 'depart' && arrive.type === 'arrive') {
        // 출발지와 도착지 이름 가져오기
        let originName = depart.placeName;
        let destName = arrive.placeName;

        // 3글자 넘으면 "..." 처리
        const truncateName = (name: string, maxLength: number = 3): string => {
          if (name.length <= maxLength) return name;
          return name.substring(0, maxLength) + '...';
        };

        originName = truncateName(originName);
        destName = truncateName(destName);

        // 여정 라벨: "집->회사" 형식
        const label = `${originName}→${destName}`;
        const tabId = `${depart.id}|${arrive.id}`;

        console.log(`  ✅ 유효한 여정: "${label}" (ID: ${tabId})`);

        tabs.push({
          id: tabId,
          label,
          icon: depart.placeIcon || '📍',
        });
      } else {
        console.log(`  ⚠️ 유효하지 않은 쌍`);
      }
    }

    console.log(`\n✨ [journeyTabs] 최종 탭 생성 완료: ${tabs.length}개`);
    console.log('📌 탭 목록:', tabs);
    console.log('');
    return tabs;
  }, [pathSelection.journeys, schedule.daysOfWeek, USE_MOCK_DATA]);

  // 즐겨찾기 목록: 온보딩에서 설정한 장소들 (집 주소 + 자주 가는 장소들)
  const favorites = React.useMemo(() => {
    const favoriteList: Array<{ id: string; name: string; icon: string }> = [];
    
    // 집 주소 추가
    if (places.homeAddress) {
      if (typeof places.homeAddress === 'object' && places.homeAddress.name) {
        favoriteList.push({
          id: 'home',
          name: places.homeAddress.name,
          icon: places.homeAddress.icon || '🏠',
        });
      } else if (typeof places.homeAddress === 'string') {
        favoriteList.push({
          id: 'home',
          name: places.homeAddress,
          icon: '🏠',
        });
      }
    }
    
    // 자주 가는 장소들 추가
    places.favoritePlaces.forEach((place, index) => {
      favoriteList.push({
        id: `favorite-${index}`,
        name: place.name,
        icon: place.icon || '📍',
      });
    });
    
    return favoriteList;
  }, [places]);

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

  // 선택된 여정의 상세 정보 추출 (출발지/목적지 + 경로 데이터)
  const selectedJourneyInfo = React.useMemo(() => {
    console.log(`\n🎯 [selectedJourneyInfo] 선택 여정 정보 계산 시작`);
    const tabsToUseForLog = USE_MOCK_DATA && journeyTabs.length === 0
      ? createMockJourneyTabs()
      : journeyTabs;
    console.log(`   📌 선택 인덱스: ${selectedJourneyIndex}, 전체 탭: ${tabsToUseForLog.length}`);

    const journeysToUse = USE_MOCK_DATA && (!pathSelection.journeys || pathSelection.journeys.length === 0)
      ? createMockJourneys()
      : pathSelection.journeys;

    const tabsToUse = USE_MOCK_DATA && journeyTabs.length === 0
      ? createMockJourneyTabs()
      : journeyTabs;

    if (tabsToUse.length === 0 || !journeysToUse || journeysToUse.length === 0) {
      console.log('❌ [selectedJourneyInfo] 여정 데이터 없음');
      return null;
    }

    const selectedTab = tabsToUse[selectedJourneyIndex];
    console.log(`✅ [selectedJourneyInfo] 선택된 탭: "${selectedTab.label}" (ID: ${selectedTab.id})`);
    if (!selectedTab) {
      console.log('❌ [selectedJourneyInfo] 탭을 찾을 수 없음');
      return null;
    }

    // 선택된 탭의 id에서 depart-id와 arrive-id 추출 (pipe delimiter 사용)
    const [departId, arriveId] = selectedTab.id.split('|');
    console.log(`   🔗 분해: departId="${departId}" | arriveId="${arriveId}"`);

    // journeysToUse에서 해당 여정 찾기
    const departJourney = journeysToUse.find(j => j.id === departId);
    const arriveJourney = journeysToUse.find(j => j.id === arriveId);

    console.log(`   🏠 출발: ${departJourney?.placeName}(${departId}) @${departJourney?.time}`);
    console.log(`   🏢 도착: ${arriveJourney?.placeName}(${arriveId})`);

    if (!departJourney || !arriveJourney) {
      console.log('❌ [selectedJourneyInfo] 여정을 찾을 수 없음');
      return null;
    }

    // 🆕 저장된 경로 데이터 가져오기 (여정별로 저장된 경로 우선 사용)
    // GoalTimeScreen에서 저장할 때 여정 키를 사용
    // 여러 키를 시도: journeyKey (depart|arrive), departId, selectedPath (하위 호환성)
    const journeyKey = `${departId}|${arriveId}`;
    const selectedPathsToUse = USE_MOCK_DATA && (!pathSelection.selectedPaths || Object.keys(pathSelection.selectedPaths).length === 0)
      ? mockSelectedPaths
      : pathSelection.selectedPaths || {};
    
    const selectedPath = selectedPathsToUse[journeyKey] ||
                         selectedPathsToUse[departId] ||
                         pathSelection.selectedPath;  // 하위 호환성

    console.log(`\n   🛣️ 경로 데이터 조회:`);
    console.log(`      저장된 여정 키들: ${JSON.stringify(Object.keys(selectedPathsToUse))}`);
    console.log(`      조회 시도 순서:`);
    console.log(`        1️⃣ [${journeyKey}] - ${selectedPathsToUse[journeyKey] ? '✅ 발견' : '❌'}`);
    console.log(`        2️⃣ [${departId}] - ${selectedPathsToUse[departId] ? '✅ 발견' : '❌'}`);
    console.log(`        3️⃣ [selectedPath] 하위호환 - ${pathSelection.selectedPath ? '✅ 발견' : '❌'}`);
    console.log(`      최종 경로: ${selectedPath ? `✅ 있음 (${selectedPath.subPath?.length ?? 0}개 세그먼트)` : '❌ 없음'}`);

    // 🆕 selectedPath 상세 검증
    if (selectedPath) {
      console.log('🔍 [selectedJourneyInfo] selectedPath exists:', {
        hasId: !!selectedPath.id,
        hasTotalTime: !!selectedPath.totalTime,
        hasSubPath: !!selectedPath.subPath,
        subPathLength: selectedPath.subPath?.length ?? 0,
      });
      if (selectedPath.subPath?.length) {
        console.log('🔍 [selectedJourneyInfo] subPath:', JSON.stringify(selectedPath.subPath, null, 2));

        // WALK 세그먼트 분석
        const walkSegments = selectedPath.subPath.filter((seg: any) => seg.trafficType === 3);
        if (walkSegments.length > 0) {
          console.log(`🔍 [selectedJourneyInfo] WALK segments (${walkSegments.length}):`, JSON.stringify(walkSegments, null, 2));
        }
      }
    }

    // 예상 소요시간 계산 (초를 분으로 변환)
    const estimatedDurationMinutes = selectedPath ? Math.round(selectedPath.totalTime / 60) : 45;

    // 예상 도착시간 계산
    const [departHours, departMinutes] = departJourney.time.split(':').map(Number);
    const totalMinutes = departHours * 60 + departMinutes + estimatedDurationMinutes;
    const arriveHours = Math.floor(totalMinutes / 60) % 24;
    const arriveMins = totalMinutes % 60;
    const arriveTime = `${String(arriveHours).padStart(2, '0')}:${String(arriveMins).padStart(2, '0')}`;

    const result = {
      originName: departJourney.placeName,
      originAddress: departJourney.placeAddress,
      originIcon: departJourney.placeIcon,
      originX: departJourney.placeX,
      originY: departJourney.placeY,
      destinationName: arriveJourney.placeName,
      destinationAddress: arriveJourney.placeAddress,
      destinationIcon: arriveJourney.placeIcon,
      destinationX: arriveJourney.placeX,
      destinationY: arriveJourney.placeY,
      departureTime: departJourney.time,
      estimatedDurationMinutes,
      arriveTime,
      selectedPath,
    };
    console.log('🔍 [selectedJourneyInfo] Result:', result);
    return result;
  }, [selectedJourneyIndex, journeyTabs, pathSelection.journeys, pathSelection.selectedPath, pathSelection.selectedPaths, USE_MOCK_DATA]);

  // 🎭 목업 데이터 변수들 (selectedJourneyInfo 이후)
  const mockSelectedPaths: Record<string, any> = USE_MOCK_DATA && (!pathSelection.selectedPaths || Object.keys(pathSelection.selectedPaths).length === 0)
    ? {
        'mock-depart-home|mock-arrive-work': createMockPath(true),
        'mock-depart-work|mock-arrive-home': createMockPath(false),
      }
    : pathSelection.selectedPaths || {};

  const createMockTrackingState = (): any => {
    if (!selectedJourneyInfo?.selectedPath?.subPath) return null;
    
    const subPath = selectedJourneyInfo.selectedPath.subPath;
    // 첫 번째 세그먼트가 도보인 경우를 가정
    const firstSegment = subPath[0];
    const isWalking = firstSegment?.trafficType === 3;
    
    // 목업 GPS 좌표 (서울 강남역 근처)
    const mockLocation = {
      latitude: 37.4979,
      longitude: 127.0276,
      timestamp: Date.now(),
      accuracy: 10,
    };
    
    return {
      status: isWalking ? 'walking' : 'on_transit',
      currentSegmentIndex: 0,
      currentLocation: mockLocation,
      distanceToNextStop: isWalking ? 250 : 1200, // 미터
      estimatedTimeToNextStop: isWalking ? 180 : 300, // 초
      movementSpeed: isWalking ? 4.3 : 54, // km/h
      isOnRoute: true,
      message: isWalking ? '도보로 이동 중' : '버스 탑승 중',
    };
  };

  const displayTrackingState = USE_MOCK_DATA && !trackingState 
    ? createMockTrackingState() 
    : trackingState;

  const mockJourneyTabs = USE_MOCK_DATA && journeyTabs.length === 0
    ? createMockJourneyTabs()
    : journeyTabs;

  // 🆕 실시간 경로 추적 시작 (선택된 여정이 있으면)
  useRealTimeTracking((selectedJourneyInfo?.selectedPath as any) || null, {
    enabled: !!selectedJourneyInfo?.selectedPath,
    onStatusChange: (status) => {
      console.log('[DailyBriefingScreen] 추적 상태 변경:', status.status);
      trackingActions.updateTrackingState(status);
    },
  });

  // 선택된 여정이 바뀔 때 검색창 업데이트 및 추적 시작
  React.useEffect(() => {
    if (selectedJourneyInfo) {
      setOrigin(selectedJourneyInfo.originName);
      setDestination(selectedJourneyInfo.destinationName);

      // 새로운 여정 선택 시 추적 시작
      console.log('[DailyBriefingScreen] 새로운 여정 선택됨:', selectedJourneyInfo.selectedPath?.id);
      if (selectedJourneyInfo.selectedPath) {
        trackingActions.startTracking(selectedJourneyInfo.selectedPath.id || '');
      }
    }
  }, [selectedJourneyInfo, trackingActions]);

  // 여정 선택기 핸들러
  const handleExpandPress = () => {
    toggleExpanded();
  };

  const handleCollapsePress = () => {
    setExpanded(false);
  };

  const handleTabSelect = (tabId: string) => {
    // tabId로부터 선택된 여정 인덱스 찾기
    const index = journeyTabs.findIndex(t => t.id === tabId);
    console.log('🔍 [handleTabSelect] tabId:', tabId, 'found index:', index);
    if (index >= 0) {
      setSelectedJourneyIndex(index);
    }
    setSelectedTab(tabId as any);
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

  // 🆕 CTA 카드 핸들러들
  const handleDepartureCardPress = () => {
    // 파란색 출발 카드: 실시간 경로 추적 맵 화면으로 이동
    if (selectedJourneyInfo?.selectedPath) {
      navigation.navigate('RealtimeNavigation', {
        originName: selectedJourneyInfo.originName,
        destinationName: selectedJourneyInfo.destinationName,
        selectedPath: selectedJourneyInfo.selectedPath,
      });
    } else {
      console.warn('[DailyBriefingScreen] 선택된 경로가 없습니다');
    }
  };

  const handleHazardCardPress = () => {
    // 빨간색 위험 카드: SafetyGuard 화면으로 이동
    navigation.navigate('SafetyGuard');
  };

  const handleWeatherCardPress = () => {
    // 파란색 날씨 카드: 날씨 상세 정보 모달 표시
    navigation.navigate('WeatherDetail');
  };

  const handleTrafficCardPress = () => {
    // 보라색 교통 카드: 대체 경로 모달 표시
    if (selectedJourneyInfo?.selectedPath) {
      navigation.navigate('AlternativeRoutes', {
        currentRouteDuration: selectedJourneyInfo.estimatedDurationMinutes,
        currentRouteDistance: selectedJourneyInfo.selectedPath.totalDistanceKm
          ? parseFloat(selectedJourneyInfo.selectedPath.totalDistanceKm)
          : selectedJourneyInfo.selectedPath.totalDistance / 1000,
      });
    } else {
      console.warn('[DailyBriefingScreen] 선택된 경로가 없습니다');
    }
  };

  // 🆕 세그먼트 타입에 따른 아이콘 반환
  const getSegmentIcon = (segmentType: string): string => {
    const typeMap: Record<string, string> = {
      'SUBWAY': '🚇',
      'BUS': '🚌',
      'WALK': '👣',
      'TAXI': '🚕',
      'TRAIN': '🚂',
      'TRAM': '🚊',
    };
    return typeMap[segmentType] || '🚌';
  };

  // 🆕 trafficType 숫자를 문자로 변환 (ODSAY API)
  const getTrafficTypeLabel = (trafficType: number): string => {
    const typeMap: Record<number, string> = {
      1: '지하철',
      2: '버스',
      3: '도보',
      4: '택시',
      5: '열차',
    };
    return typeMap[trafficType] || '이동';
  };

  // 🆕 현재 세그먼트 정보 가져오기
  const getCurrentSegmentInfo = () => {
    if (!selectedJourneyInfo?.selectedPath?.subPath || !displayTrackingState) {
      return null;
    }

    const subPath = selectedJourneyInfo.selectedPath.subPath;
    const currentSegmentIdx = displayTrackingState.currentSegmentIndex;

    if (currentSegmentIdx >= subPath.length) {
      return null;
    }

    const currentSegment = subPath[currentSegmentIdx];
    const trafficTypeLabel = getTrafficTypeLabel(currentSegment.trafficType);

    let transportInfo = trafficTypeLabel;
    if (currentSegment.lane && currentSegment.lane[0]) {
      if (currentSegment.lane[0].busNo) {
        transportInfo = `${currentSegment.lane[0].busNo}번`;
      } else if (currentSegment.lane[0].subwayName) {
        transportInfo = currentSegment.lane[0].subwayName;
      }
    }

    return {
      trafficType: currentSegment.trafficType,
      trafficTypeLabel,
      transportInfo,
      startName: currentSegment.startName || '출발지',
      endName: currentSegment.endName || '도착지',
      totalStops: subPath.length,
      currentStopIndex: currentSegmentIdx + 1,
    };
  };

  // 🆕 다음 정류장 정보 가져오기
  const getNextStopInfo = () => {
    if (!selectedJourneyInfo?.selectedPath?.subPath || !displayTrackingState) {
      return null;
    }

    const subPath = selectedJourneyInfo.selectedPath.subPath;
    const currentSegmentIdx = displayTrackingState.currentSegmentIndex;
    const nextSegmentIdx = currentSegmentIdx + 1;

    if (nextSegmentIdx >= subPath.length) {
      return {
        stopName: selectedJourneyInfo.destinationName || '최종 목적지',
        isDestination: true,
        trafficType: null,
        transportInfo: null,
        subwayLine: null,
        subwayDirection: null,
      };
    }

    const nextSegment = subPath[nextSegmentIdx];
    const trafficTypeLabel = getTrafficTypeLabel(nextSegment.trafficType);
    
    let transportInfo = trafficTypeLabel;
    let subwayLine: string | null = null;
    let subwayDirection: string | null = null;
    let stopName = nextSegment.startName || nextSegment.endName || '다음 정류장';
    
    if (nextSegment.lane && nextSegment.lane[0]) {
      const lane = nextSegment.lane[0];
      
      if (lane.busNo) {
        // 버스
        transportInfo = `${lane.busNo}번 버스`;
      } else if (lane.subwayName || nextSegment.trafficType === 1) {
        // 지하철
        // 🆕 호선 정보
        if (lane.subwayCode) {
          subwayLine = `${lane.subwayCode}호선`;
          transportInfo = `${lane.subwayCode}호선`;
        } else if (lane.subwayName) {
          subwayLine = lane.subwayName;
          transportInfo = lane.subwayName;
        }
        
        // 🆕 방향 정보 (endName이 최종 목적지 방면)
        if (nextSegment.endName) {
          // 역 이름에 "역" 붙이기
          const endStationName = nextSegment.endName.endsWith('역') 
            ? nextSegment.endName 
            : `${nextSegment.endName}역`;
          subwayDirection = `${endStationName} 방면`;
        }
        
        // 🆕 역 이름에 "역" 붙이기
        if (nextSegment.startName) {
          stopName = nextSegment.startName.endsWith('역')
            ? nextSegment.startName
            : `${nextSegment.startName}역`;
        } else if (nextSegment.endName) {
          stopName = nextSegment.endName.endsWith('역')
            ? nextSegment.endName
            : `${nextSegment.endName}역`;
        }
      }
    }

    return {
      stopName,
      isDestination: false,
      trafficType: nextSegment.trafficType,
      transportInfo,
      trafficTypeLabel,
      subwayLine,
      subwayDirection,
    };
  };

  // 🆕 현재 이동 상태에 따른 메시지 생성
  const getMovementStatusMessage = (): string => {
    if (!displayTrackingState) {
      return '준비 중...';
    }

    // 현재 세그먼트 정보를 기반으로 메시지 생성
    const currentSegmentInfo = getCurrentSegmentInfo();
    if (currentSegmentInfo) {
      if (currentSegmentInfo.trafficType === 3) {
        // WALK - 도보로 이동 중
        const nextStopInfo = getNextStopInfo();
        if (nextStopInfo && !nextStopInfo.isDestination) {
          return `도보로 ${formatTime(displayTrackingState.estimatedTimeToNextStop)} 이동!`;
        }
        return '도보로 이동 중...';
      } else if (currentSegmentInfo.trafficType === 2) {
        // BUS
        return `${currentSegmentInfo.transportInfo} 탑승 중`;
      } else if (currentSegmentInfo.trafficType === 1) {
        // SUBWAY
        return `${currentSegmentInfo.transportInfo} 탑승 중`;
      }
    }

    const statusMap: Record<string, string> = {
      'on_transit': '🚌 이동 중',
      'waiting_at_stop': '⏱️ 정류장 대기',
      'boarding': '🚶 도보 이동',
      'walking': '🚶 도보 이동',
      'route_deviation': '⚠️ 경로 이탈',
      'destination_reached': '🎉 목적지 도착',
      'idle': '준비 중...',
    };

    return statusMap[displayTrackingState.status] || '이동 중';
  };

  // 🆕 날씨 데이터 조회 (현재 위치 기반) - Early return 전에 호출!
  const weatherLocation = React.useMemo(() => {
    if (selectedJourneyInfo?.originY && selectedJourneyInfo?.originX) {
      return {
        latitude: parseFloat(selectedJourneyInfo.originY),
        longitude: parseFloat(selectedJourneyInfo.originX),
      };
    }
    // Fallback: 집 주소
    if (typeof places.homeAddress === 'object' && places.homeAddress) {
      return {
        latitude: parseFloat(places.homeAddress.y || '37.4979'),
        longitude: parseFloat(places.homeAddress.x || '127.0276'),
      };
    }
    // 기본값: 강남역
    return { latitude: 37.4979, longitude: 127.0276 };
  }, [selectedJourneyInfo, places]);

  const { data: weatherData, isLoading: weatherLoading } = useGetWeatherQuery(
    weatherLocation.latitude,
    weatherLocation.longitude
  );

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

  // Phase 8.0: IntelligentDashboard 카드 데이터 (날씨 포함)
  const cards = React.useMemo(() => {
    const baseCards = [
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
        icon: weatherData ? '🔲 WEATHER_ICON' : '🌧️', // 아이콘 자리 (나중에 실제 아이콘으로 대체)
        title: '날씨 체크!',
        bgGradient: '#40B0FF',
        content: weatherData
          ? getWeatherDescription(
              weatherData.condition,
              weatherData.precipitation,
              weatherData.feelsLike
            )
          : '오늘 오후 비 예보 · 강수확률 80% · 18°C',
        badges: weatherData
          ? getWeatherRecommendations(
              weatherData.condition,
              weatherData.temperature,
              weatherData.humidity,
              weatherData.uvIndex
            )
          : ['☂️ 우산을 챙기세요'],
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
    return baseCards;
  }, [briefingData, weatherData]);

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
                    {journeyTabs.length > 0 ? (
                      journeyTabs.map((tab, index) => (
                    <TouchableOpacity
                          key={tab.id}
                          onPress={() => handleTabSelect(tab.id)}
                      style={{ flex: 1 }}
                    >
                          <JourneyTab isActive={index === selectedJourneyIndex}>
                            <JourneyTabText isActive={index === selectedJourneyIndex}>
                              {tab.label}
                            </JourneyTabText>
                      </JourneyTab>
                    </TouchableOpacity>
                      ))
                    ) : (
                      // 여정이 없을 때 기본 탭 표시
                    <TouchableOpacity
                        onPress={() => handleTabSelect('commute')}
                      style={{ flex: 1 }}
                    >
                        <JourneyTab isActive={true}>
                          <JourneyTabText isActive={true}>여정 없음</JourneyTabText>
                      </JourneyTab>
                    </TouchableOpacity>
                    )}
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
                
                {/* 확장 상태일 때 하단에도 축소 버튼 */}
                <TouchableOpacity onPress={() => setIsSearchBarExpanded(false)}>
                  <ToggleButton>
                    <ToggleButtonText>⌃</ToggleButtonText>
                  </ToggleButton>
                </TouchableOpacity>
              </>
            )}
          </SearchBarContainer>

          {/* 🆕 Phase 8.1.5: 실시간 경로 추적 카드 */}
          {displayTrackingState && (
            <RealtimeTrackingCard trackingState={displayTrackingState} />
          )}

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
            {cards.map((card) => {
              // CTA 카드별 onPress 핸들러 선택
              const getCardPressHandler = () => {
                switch (card.id) {
                  case 'departure':
                    return handleDepartureCardPress;
                  case 'hazard':
                    return handleHazardCardPress;
                  case 'weather':
                    return handleWeatherCardPress;
                  case 'traffic':
                    return handleTrafficCardPress;
                  default:
                    return () => {};
                }
              };

              return (
              <View key={card.id} style={{ width: cardWidth }}>
                <TouchableOpacity
                  onPress={getCardPressHandler()}
                  activeOpacity={0.85}
                  style={{ flex: 1 }}
                >
                  <CardBase bgGradient={card.bgGradient}>
                  {card.id === 'departure' ? (
                    /* 3-Layer 리디자인: CTAGuide.md 기반 */
                    <DepartureCardContainer>
                      {/* ========== Layer 1: Header (20%) - 목표 + 도착시간 ========== */}
                      <Layer1Header>
                        <Layer1GoalSection>
                          <Layer1GoalLabel>🏁 목적지</Layer1GoalLabel>
                          <Layer1GoalName>
                            {selectedJourneyInfo?.destinationName || '목적지 준비 중'}
                          </Layer1GoalName>
                        </Layer1GoalSection>
                        <Layer1TimeSection>
                          <Layer1ArrivalTime>
                            {selectedJourneyInfo?.arriveTime || '--:--'}
                          </Layer1ArrivalTime>
                          <Layer1ArrivalLabel>도착 예정</Layer1ArrivalLabel>
                        </Layer1TimeSection>
                      </Layer1Header>

                      {/* ========== Layer 2: Timeline (45%) - 진행 상황 + 버스 아이콘 ========== */}
                      <Layer2Timeline>
                        <ProgressBarContainer>
                          <ProgressBar
                            progress={
                              displayTrackingState && getCurrentSegmentInfo()
                                ? Math.min(
                                    100,
                                    ((getCurrentSegmentInfo()?.currentStopIndex || 0) /
                                      Math.max(1, getCurrentSegmentInfo()?.totalStops || 1)) *
                                      100
                                  )
                                : 0
                            }
                          />
                        </ProgressBarContainer>

                        <BusIconWrapper>
                          <Image
                            source={require('../../assets/BUS3DLeft.png')}
                            style={{ width: 80, height: 60 }}
                            resizeMode="contain"
                          />
                        </BusIconWrapper>

                        <Layer2ProgressText>
                          {trackingState && getCurrentSegmentInfo()
                            ? (() => {
                                const currentSegment = getCurrentSegmentInfo();
                                // 도보 중이면 목적지(다음 정류장/역) 표시
                                if (currentSegment?.trafficType === 3) {
                                  const nextStop = getNextStopInfo();
                                  return nextStop?.stopName || currentSegment?.endName || '다음 정류장';
                                }
                                // 버스/지하철 탑승 중이면 현재 위치(정류장/역 이름)
                                return currentSegment?.startName || '현재 위치';
                              })()
                            : '경로 준비 중...'}
                        </Layer2ProgressText>
                      </Layer2Timeline>

                      {/* ========== Layer 3: Next Action (35%) - 다음 환승 정보 ========== */}
                      <Layer3NextAction>
                        <Layer3Title>
                          {displayTrackingState && getNextStopInfo()?.isDestination
                            ? '최종 목적지'
                            : displayTrackingState && getCurrentSegmentInfo()?.trafficType === 3
                            ? '다음 탑승'
                            : '다음 환승'}
                        </Layer3Title>
                        <Layer3Content>
                          <Layer3TransitInfo>
                            <Layer3TransitNumber>
                              {(() => {
                                const currentSegment = getCurrentSegmentInfo();
                                const nextStop = getNextStopInfo();

                                // 최종 목적지까지 도보인 경우
                                if (nextStop?.isDestination && currentSegment?.trafficType === 3) {
                                  return '🚶 도보';
                                }

                                // 다음 세그먼트가 버스/지하철인 경우
                                if (nextStop && !nextStop.isDestination) {
                                  if (nextStop.trafficType === 1 && nextStop.subwayLine) {
                                    return `🚇 ${nextStop.subwayLine}`; // 지하철: "🚇 2호선"
                                  }
                                  return `🚌 ${nextStop.transportInfo || '환승'}`;
                                }

                                return '준비 중...';
                              })()}
                            </Layer3TransitNumber>
                            <Layer3TransitTime>
                              {(() => {
                                const currentSegment = getCurrentSegmentInfo();
                                const nextStop = getNextStopInfo();

                                // 최종 목적지까지 도보인 경우
                                if (nextStop?.isDestination && currentSegment?.trafficType === 3) {
                                  return `${selectedJourneyInfo?.arriveTime || '--:--'}`;
                                }

                                // 다음 세그먼트가 버스/지하철인 경우
                                if (nextStop && !nextStop.isDestination && displayTrackingState) {
                                  return `${formatTime(displayTrackingState.estimatedTimeToNextStop)}`;
                                }

                                return '--';
                              })()}
                            </Layer3TransitTime>
                          </Layer3TransitInfo>
                          <Layer3TransitDetail>
                            {(() => {
                              const currentSegment = getCurrentSegmentInfo();
                              const nextStop = getNextStopInfo();

                              // 최종 목적지까지 도보인 경우
                              if (nextStop?.isDestination && currentSegment?.trafficType === 3) {
                                return `${nextStop?.stopName || '목적지'} 도착 예정`;
                              }

                              // 다음 세그먼트가 지하철인 경우 - 방면 정보
                              if (
                                nextStop &&
                                !nextStop.isDestination &&
                                nextStop.trafficType === 1 &&
                                nextStop.subwayDirection
                              ) {
                                return nextStop.subwayDirection; // "강남역 방면"
                              }

                              // 다음 세그먼트가 버스인 경우
                              if (nextStop && !nextStop.isDestination && nextStop.trafficType === 2 && displayTrackingState) {
                                return `${nextStop?.stopName || '정류장'} 도착`;
                              }

                              return '경로 감지 중...';
                            })()}
                          </Layer3TransitDetail>
                        </Layer3Content>
                      </Layer3NextAction>
                    </DepartureCardContainer>
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
                </TouchableOpacity>
              </View>
            );
            })}
          </ScrollView>

          {/* Phase 8.3: Journey Details Card */}
          <JourneyDetailsCard>
            <JourneyHeaderBar>
              <View>
                <JourneyHeaderText isSubtitle>총 예상 소요 시간</JourneyHeaderText>
                <JourneyHeaderText>{selectedJourneyInfo?.estimatedDurationMinutes || 45}분</JourneyHeaderText>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <JourneyHeaderText isSubtitle>예상 도착시간</JourneyHeaderText>
                <JourneyHeaderText>{selectedJourneyInfo?.arriveTime || '--:--'}</JourneyHeaderText>
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
              {selectedJourneyInfo ? (
                // 선택된 여정이 있을 때: 실제 경로 세그먼트 표시
                (() => {
                  const steps: Array<any> = [
                    {
                      icon: selectedJourneyInfo.originIcon || '📍',
                      title: selectedJourneyInfo.originName,
                      description: selectedJourneyInfo.originAddress,
                      duration: 0,
                      isStation: true,
                    },
                  ];

                  // 🆕 ODSAY 원본 subPath 사용 (더 정확한 데이터)
                  const subPath = selectedJourneyInfo.selectedPath?.subPath;
                  console.log('🔍 [DailyBriefing] subPath:', subPath);

                  if (subPath && Array.isArray(subPath)) {
                    const trafficTypeMap: Record<number, string> = {
                      1: 'SUBWAY',
                      2: 'BUS',
                      3: 'WALK',
                      4: 'TAXI',
                      5: 'TRAIN',
                    };

                    console.log('🔍 [DailyBriefing] Processing subPath, count:', subPath.length);

                    subPath.forEach((segment: any, idx: number) => {
                      console.log(`🔍 [DailyBriefing] Segment ${idx}:`, {
                        trafficType: segment.trafficType,
                        sectionTime: segment.sectionTime,
                        startName: segment.startName,
                        endName: segment.endName,
                        lane: segment.lane,
                      });

                      const type = trafficTypeMap[segment.trafficType] || 'OTHER';
                      
                      // 시간 변환: sectionTime은 초 단위이므로 분으로 변환
                      // parseSegments 함수와 동일한 로직 사용
                      let duration = 0;
                      if (segment.sectionTime) {
                        // sectionTime이 초 단위인지 분 단위인지 확인
                        // ODSAY API 문서에 따르면 sectionTime은 초 단위
                        // 하지만 값이 작으면(예: 5, 31) 이미 분 단위일 수도 있음
                        // 일반적으로 버스/지하철은 30분 이상이므로, 60보다 작으면 분 단위로 간주
                        if (segment.sectionTime < 60) {
                          // 이미 분 단위로 추정
                          duration = Math.round(segment.sectionTime);
                        } else {
                          // 초 단위로 추정 (분으로 변환)
                          const minutes = segment.sectionTime / 60;
                          duration = Math.round(minutes);
                        }
                        // 최소 1분 표시 (0분이면 표시되지 않음)
                        if (duration === 0 && segment.sectionTime > 0) {
                          duration = 1;
                        }
                      }

                      // 노선 정보 추출 및 제목 생성
                      let title = '';
                      if (type === 'WALK') {
                        title = '도보';
                      } else if (type === 'BUS') {
                        if (segment.lane && Array.isArray(segment.lane) && segment.lane.length > 0) {
                          const busNo = segment.lane[0].busNo;
                          title = busNo ? `${busNo}번 버스` : '버스';
                        } else {
                          title = '버스';
                        }
                      } else if (type === 'SUBWAY') {
                        if (segment.lane && Array.isArray(segment.lane) && segment.lane.length > 0) {
                          const subwayName = segment.lane[0].subwayName;
                          title = subwayName ? `${subwayName}` : '지하철';
                        } else {
                          title = '지하철';
                        }
                      } else {
                        title = type;
                      }

                      // 설명 생성 (startName과 endName이 있을 때만)
                      let description = '';
                      if (segment.startName && segment.endName) {
                        description = `${segment.startName} → ${segment.endName}`;
                      } else if (segment.startName) {
                        description = `${segment.startName}에서 출발`;
                      } else if (segment.endName) {
                        description = `${segment.endName}까지`;
                      } else {
                        description = type === 'WALK' ? '도보 이동' : '대중교통 이용';
                      }

                      // 버스의 경우 정류장 개수 정보 추가
                      if (type === 'BUS' && segment.stationCount) {
                        description += ` (${segment.stationCount}개 정류장)`;
                      }

                      console.log(`🔍 [DailyBriefing] Processed segment ${idx}: type=${type}, duration=${duration}, title=${title}`);

                      // 모든 세그먼트 표시 (duration이 0이어도)
                      steps.push({
                        icon: getSegmentIcon(type),
                        title: title,
                        description: description,
                        duration: duration,
                        type: type,
                      });
                    });
                  } else if (selectedJourneyInfo.selectedPath?.segments) {
                    // Fallback: segments 배열이 있으면 그것을 사용 (UI 미리보기용)
                    console.log('🔍 [DailyBriefing] Fallback to segments array');
                    selectedJourneyInfo.selectedPath.segments.forEach((segment: any) => {
                      steps.push({
                        icon: getSegmentIcon(segment.type),
                        title: `${segment.line || segment.type}`,
                        description: `${segment.startStation} → ${segment.endStation}`,
                        duration: segment.duration ? Math.round(parseInt(segment.duration) / 60) : 0,
                        type: segment.type,
                      });
                    });
                  } else {
                    console.log('🔍 [DailyBriefing] No subPath or segments available');
                  }

                  // 도착지 추가
                  steps.push({
                    icon: selectedJourneyInfo.destinationIcon || '🏢',
                    title: selectedJourneyInfo.destinationName,
                    description: selectedJourneyInfo.destinationAddress,
                    duration: 0,
                    isStation: true,
                  });

                  return steps.map((step, index) => (
                    <StepItem key={index}>
                      <StepIconContainer>
                        <CardTitle style={{ fontSize: 22, color: '#666' }}>{step.icon}</CardTitle>
                    </StepIconContainer>
                    <StepContentBox>
                      <StepTitle>{step.title}</StepTitle>
                      <StepDescription>{step.description}</StepDescription>
                    </StepContentBox>
                    {step.duration > 0 ? (
                      <View style={{ justifyContent: 'center', alignItems: 'center', minWidth: 50 }}>
                        <CardTitle style={{ fontSize: 24, color: '#0066FF' }}>{step.duration}</CardTitle>
                        <StepDescription>분</StepDescription>
                      </View>
                    ) : step.type === 'WALK' ? (
                      // 도보는 시간이 짧아도 표시
                      <View style={{ justifyContent: 'center', alignItems: 'center', minWidth: 50 }}>
                        <CardTitle style={{ fontSize: 24, color: '#0066FF' }}>1</CardTitle>
                        <StepDescription>분</StepDescription>
                      </View>
                    ) : null}
                  </StepItem>
                  ));
                })()
              ) : (
                // 선택된 여정이 없을 때: 기본 경로 표시
                [
                  { icon: '🏠', title: '집', description: '출발지를 선택해주세요', duration: 0 },
                  { icon: '👣', title: '도보 이동', description: '최초 이동 시간', duration: 5 },
                  { icon: '🚇', title: '대중교통 탑승', description: '최적 경로로 이동', duration: 30 },
                  { icon: '👣', title: '도보 이동', description: '최종 목적지까지', duration: 5 },
                  { icon: '🏢', title: '목적지', description: '도착지를 선택해주세요', duration: 0 },
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
              ))
              )}
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

