/**
 * Hero 카드 (카드 2.1)
 *
 * 헌법 준수:
 * - AGENTS.md 프론트엔드 헌법 [제2장] 스타일링 (Styled-components)
 * - AGENTS.md 프론트엔드 헌법 [제3장] 데이터 페칭 (부모에서 상태 관리)
 * - DESIGN.md 4.2: Hero 카드 UI/UX 명세
 * - v3.0 명세서: Phase 1, 2, 3 상태별 콘텐츠
 */
import React from 'react';
import styled from 'styled-components/native';
import { theme } from '../../../styles/theme';

// Styled-components: 의미론적 이름 사용 (헌법 제2장 준수)
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

const HeadlineContainer = styled.View`
  margin-bottom: ${theme.spacing.md}px;
`;

const Headline = styled.Text`
  font-size: ${theme.fonts.sizes.xl}px;
  font-weight: bold;
  color: ${theme.colors.text};
  line-height: ${theme.fonts.sizes.xl * 1.4}px;
`;

const AlertIcon = styled.Text`
  font-size: ${theme.fonts.sizes.xl}px;
  margin-right: ${theme.spacing.sm}px;
`;

const ContentContainer = styled.View`
  margin-bottom: ${theme.spacing.lg}px;
`;

const ContentRow = styled.View`
  margin-bottom: ${theme.spacing.md}px;
`;

const ContentLabel = styled.Text`
  font-size: ${theme.fonts.sizes.sm}px;
  color: ${theme.colors.textSecondary};
  margin-bottom: ${theme.spacing.xs}px;
`;

const ContentText = styled.Text`
  font-size: ${theme.fonts.sizes.md}px;
  color: ${theme.colors.text};
  font-weight: 500;
`;

const SummaryContainer = styled.View`
  background-color: ${theme.colors.background};
  border-radius: 8px;
  padding: ${theme.spacing.md}px;
  margin-top: ${theme.spacing.md}px;
`;

const SummaryText = styled.Text`
  font-size: ${theme.fonts.sizes.sm}px;
  color: ${theme.colors.textSecondary};
`;

const FirstMileContainer = styled.View`
  margin-top: ${theme.spacing.md}px;
  padding-top: ${theme.spacing.md}px;
  border-top-width: 1px;
  border-top-color: ${theme.colors.border};
`;

const FirstMileText = styled.Text`
  font-size: ${theme.fonts.sizes.sm}px;
  color: ${theme.colors.textSecondary};
  font-style: italic;
`;

// Props 타입 정의
interface HeroCardProps {
  alertType: 'GO_NOW' | 'LAST_CHANCE' | 'NO_ACTION';
  transportName?: string;
  transportTime?: number; // 분 단위
  estimatedDuration?: number; // 분 단위
  nextTransportName?: string;
  nextTransportTime?: number; // 분 단위
  testID?: string;
}

/**
 * Hero 카드 컴포넌트
 *
 * Phase 1 (출발 전):
 * - GO_NOW: "지금 출발하세요!" + 교통수단 정보 + 예상 소요시간
 * - LAST_CHANCE: "⚠️ 지각 주의!" + 마지막 버스 정보
 * - NO_ACTION: 현재 상태 표시
 */
const HeroCard: React.FC<HeroCardProps> = ({
  alertType,
  transportName,
  transportTime,
  estimatedDuration,
  nextTransportName,
  nextTransportTime,
  testID = 'hero-card',
}) => {
  // 헤드라인 결정
  const getHeadline = () => {
    switch (alertType) {
      case 'GO_NOW':
        return '🚀 지금 출발하세요!';
      case 'LAST_CHANCE':
        return '⚠️ 지각 주의!';
      case 'NO_ACTION':
        return '✅ 예정대로 진행 중';
      default:
        return '출발 알림';
    }
  };

  // 메인 콘텐츠 결정
  const getMainContent = () => {
    switch (alertType) {
      case 'GO_NOW':
        return (
          <ContentRow>
            <ContentLabel>다음 {transportName} 도착</ContentLabel>
            <ContentText>{transportTime}분 뒤 도착</ContentText>
          </ContentRow>
        );
      case 'LAST_CHANCE':
        return (
          <ContentRow>
            <ContentLabel>마지막 기회 버스</ContentLabel>
            <ContentText>{transportName} - {transportTime}분 뒤</ContentText>
          </ContentRow>
        );
      case 'NO_ACTION':
        return (
          <ContentRow>
            <ContentLabel>현재 상태</ContentLabel>
            <ContentText>예정된 일정으로 진행 중입니다.</ContentText>
          </ContentRow>
        );
      default:
        return null;
    }
  };

  return (
    <Container testID={testID}>
      {/* 헤드라인 */}
      <HeadlineContainer>
        <Headline>{getHeadline()}</Headline>
      </HeadlineContainer>

      {/* 메인 콘텐츠 */}
      <ContentContainer>{getMainContent()}</ContentContainer>

      {/* 예상 소요 시간 요약 */}
      {estimatedDuration && (
        <SummaryContainer>
          <SummaryText>예상 소요 시간: {estimatedDuration}분</SummaryText>
        </SummaryContainer>
      )}

      {/* First Mile 정보 */}
      {nextTransportName && nextTransportTime && (
        <FirstMileContainer>
          <FirstMileText>
            💡 다음 버스: {nextTransportName} ({nextTransportTime}분 뒤)
          </FirstMileText>
        </FirstMileContainer>
      )}
    </Container>
  );
};

export default HeroCard;
