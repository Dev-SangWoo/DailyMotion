/**
 * 데일리 브리핑 화면
 * 
 * 헌법 준수:
 * - AGENTS.md 프론트엔드 헌법 [제2장] 스타일링 (Styled-components)
 * - AGENTS.md 프론트엔드 헌법 [제3장] 데이터 페칭 (React Query)
 * - v3.0 명세서 [Logic 1.1] 출발 알림 / [Logic 1.2] 마지노선 경고
 * - OpenAPI 스펙 GET /v1/briefings/commute
 */
import React from 'react';
import styled from 'styled-components/native';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../services/api';
import { theme } from '../../styles/theme';

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
  // React Query useQuery (헌법 제3장 준수)
  const { data, isLoading, isError } = useQuery({
    queryKey: ['commuteBriefing'],
    queryFn: async (): Promise<CommuteBriefingResponse> => {
      const response = await apiClient.get('/briefings/commute');
      return response.data;
    },
  });

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

  return (
    <Container>
      <MessageText>{briefingData.message}</MessageText>
      {briefingData.recommendedTransport && (
        <>
          <BusInfoText testID="transport-name">
            {briefingData.recommendedTransport.name}
          </BusInfoText>
          <BusInfoText testID="transport-time">
            {briefingData.recommendedTransport.departureInMinutes}분
          </BusInfoText>
        </>
      )}
    </Container>
  );
};

export default DailyBriefingScreen;

