/**
 * 데일리 브리핑 화면
 *
 * 헌법 준수:
 * - AGENTS.md 프론트엔드 헌법 [제2장] 스타일링 (Styled-components)
 * - AGENTS.md 프론트엔드 헌법 [제3장] 데이터 페칭 (React Query)
 * - AGENTS.md 프론트엔드 헌법 [제2장] 상태 관리 (Zustand)
 * - v3.0 명세서 [Logic 1.1] 출발 알림 / [Logic 1.2] 마지노선 경고
 * - DESIGN.md Phase 5: Ambient Feedback (배경색 알림) 로직
 * - DESIGN.md Phase 7: 예외 상황 처리 (오프라인 배너)
 * - OpenAPI 스펙 GET /v1/briefings/commute
 */
import React from 'react';
import styled from 'styled-components/native';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../services/api';
import { theme } from '../../styles/theme';
import { useJourneySelectorStore } from '../../stores/useJourneySelectorStore';
import { useAmbientFeedbackStore, type AmbientFeedbackStatus } from '../../stores/useAmbientFeedbackStore';
import { useAppModeStore, type AppMode } from '../../stores/useAppModeStore';
import { useNetworkStore } from '../../stores/useNetworkStore';
import { JourneySelector, HeroCard, WeatherCard, AlternativePathCard, Carousel, StepCards, OfflineBanner } from './components';

// Styled-components: 의미론적 이름 사용 (헌법 제2장 준수)
// Phase 5: Ambient Feedback - 배경색 동적 설정 (props 기반)
// Phase 7: 오프라인 배너를 위한 padding-top 추가
interface ContainerProps {
  ambientStatus?: AmbientFeedbackStatus;
  hasOfflineBanner?: boolean;
}

const getBackgroundColor = (status?: AmbientFeedbackStatus): string => {
  switch (status) {
    case 'warning':
      // Logic 3.1: 지연 감지 (주황색)
      return '#FFA500'; // 주황색
    case 'alert':
      // Logic 3.2: 지각 확정 (빨간색)
      return '#FF6B6B'; // 빨간색
    case 'normal':
    default:
      return theme.colors.background; // 기본 파란색
  }
};

const Container = styled.View<ContainerProps>`
  flex: 1;
  padding: ${theme.spacing.md}px;
  padding-top: ${(props) => (props.hasOfflineBanner ? 60 : theme.spacing.md)}px;
  background-color: ${(props) => getBackgroundColor(props.ambientStatus)};
  transition: background-color 0.2s ease-in-out;
`;

const LoadingText = styled.Text`
  font-size: ${theme.fonts.sizes.lg}px;
  color: ${theme.colors.textSecondary};
  text-align: center;
  margin-top: ${theme.spacing.xl}px;
`;

const MessageText = styled.Text`
  font-size: ${theme.fonts.sizes.md}px;
  color: ${theme.colors.text};
  margin-top: ${theme.spacing.lg}px;
  line-height: ${theme.fonts.sizes.md * 1.5}px;
`;

const BusInfoText = styled.Text`
  font-size: ${theme.fonts.sizes.md}px;
  color: ${theme.colors.text};
  margin-top: ${theme.spacing.md}px;
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

  // 로딩 상태
  if (isLoading) {
    return (
      <Container>
        <LoadingText>로딩 중</LoadingText>
      </Container>
    );
  }

  // 에러 상태
  if (isError || !data?.data) {
    return (
      <Container>
        <MessageText>브리핑 정보를 불러올 수 없습니다.</MessageText>
      </Container>
    );
  }

  const briefingData = data.data;

  // Phase 3.4: Carousel 카드 배열
  const carouselCards = [
    {
      id: 'hero-card',
      component: (
        <HeroCard
          alertType={briefingData.alertType as 'GO_NOW' | 'LAST_CHANCE' | 'NO_ACTION'}
          transportName={briefingData.recommendedTransport?.name}
          transportTime={briefingData.recommendedTransport?.departureInMinutes}
        />
      ),
    },
    {
      id: 'weather-card',
      component: (
        <WeatherCard
          temperature={15}
          condition="비"
          precipitationProbability={70}
        />
      ),
    },
    {
      id: 'alternative-path-card',
      component: (
        <AlternativePathCard
          isVisible={true}
          timeSavings={7}
          onPress={() => {
            // TODO: 경로 비교 모달 표시 (Phase 3.3 향후 구현)
          }}
        />
      ),
    },
  ];

  return (
    <>
      {/* Phase 7: 오프라인 배너 */}
      <OfflineBanner isOffline={isOffline} lastUpdated={lastUpdated} />

      <Container ambientStatus={ambientStatus} hasOfflineBanner={isOffline}>
        {/* Phase 2: 여정 선택기 컴포넌트 (Zustand 상태와 연동) */}
        <JourneySelector
          isExpanded={isExpanded}
          onExpand={handleExpandPress}
          onCollapse={handleCollapsePress}
          onTabSelect={handleTabSelect}
        />

      {/* Phase 3.4: 캐러셀 (Hero, Weather, AlternativePathCard) */}
      <Carousel
        cards={carouselCards}
        testID="primary-carousel"
      />

      {/* Phase 4: 단계별 경로 카드 (Step-by-Step Cards) */}
      <StepCards
        steps={[
          {
            id: 'walk-1',
            type: 'walking',
            duration: 5,
          },
          {
            id: 'bus-1',
            type: 'bus',
            duration: 10,
            lineName: '123번',
            lineColor: '#FF6B6B',
            congestion: 'normal',
          },
          {
            id: 'walk-2',
            type: 'walking',
            duration: 7,
          },
        ]}
        testID="step-cards"
      />

      {/* Phase 1: 기본 브리핑 정보 (Phase 3으로 통합되어 제거 예정) */}
      <MessageText>{briefingData.message}</MessageText>
      {briefingData.recommendedTransport && (
        <>
          <BusInfoText testID="transport-name">
            {briefingData.recommendedTransport.name}
          </BusInfoText>
          <BusInfoText testID="transport-time">
            {`${briefingData.recommendedTransport.departureInMinutes}분`}
          </BusInfoText>
        </>
      )}
      </Container>
    </>
  );
};

export default DailyBriefingScreen;

