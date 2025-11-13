/**
 * 데일리 브리핑 화면
 *
 * 헌법 준수:
 * - AGENTS.md 프론트엔드 헌법 [제2장] 스타일링 (Styled-components)
 * - AGENTS.md 프론트엔드 헌법 [제3장] 데이터 페칭 (React Query)
 * - AGENTS.md 프론트엔드 헌법 [제2장] 상태 관리 (Zustand)
 * - v3.0 명세서 [Logic 1.1] 출발 알림 / [Logic 1.2] 마지노선 경고
 * - OpenAPI 스펙 GET /v1/briefings/commute
 */
import React from 'react';
import styled from 'styled-components/native';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../services/api';
import { theme } from '../../styles/theme';
import { useJourneySelectorStore } from '../../stores/useJourneySelectorStore';
import { JourneySelector, HeroCard, WeatherCard, AlternativePathCard, Carousel } from './components';

// Styled-components: 의미론적 이름 사용 (헌법 제2장 준수)
const Container = styled.View`
  flex: 1;
  padding: ${theme.spacing.md}px;
  background-color: ${theme.colors.background};
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

  // React Query useQuery (헌법 제3장 준수)
  // 서버 상태 (API 데이터)는 React Query로 관리 - Zustand에는 절대 저장 금지
  const { data, isLoading, isError } = useQuery({
    queryKey: ['commuteBriefing'],
    queryFn: async (): Promise<CommuteBriefingResponse> => {
      const response = await apiClient.get('/briefings/commute');
      return response.data;
    },
  });

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
    <Container>
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
  );
};

export default DailyBriefingScreen;

