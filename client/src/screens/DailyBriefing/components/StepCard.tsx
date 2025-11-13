/**
 * 단계별 경로 카드 (Component 3)
 *
 * 헌법 준수:
 * - AGENTS.md 프론트엔드 헌법 [제2장] 스타일링 (Styled-components)
 * - AGENTS.md 프론트엔드 헌법 [제3장] 데이터 페칭 (부모에서 상태 관리)
 * - DESIGN.md 4.3: 단계별 경로 카드 UI/UX 명세
 */
import React from 'react';
import styled from 'styled-components/native';
import { theme } from '../../../styles/theme';

// Styled-components: 의미론적 이름 사용 (헌법 제2장 준수)
const Container = styled.View`
  flex-direction: row;
  align-items: center;
  padding: ${theme.spacing.md}px;
  margin-bottom: ${theme.spacing.sm}px;
  background-color: ${theme.colors.surface};
  border-radius: 8px;
  border-left-width: 4px;
  border-left-color: ${(props: any) => props.lineColor || theme.colors.text};
`;

const IconContainer = styled.View`
  font-size: ${theme.fonts.sizes.xl}px;
  margin-right: ${theme.spacing.md}px;
  min-width: 30px;
  align-items: center;
`;

const IconText = styled.Text`
  font-size: ${theme.fonts.sizes.xl}px;
`;

const ContentContainer = styled.View`
  flex: 1;
`;

const HeaderRow = styled.View`
  flex-direction: row;
  align-items: center;
  margin-bottom: ${theme.spacing.xs}px;
`;

const TransportName = styled.Text`
  font-size: ${theme.fonts.sizes.md}px;
  font-weight: bold;
  color: ${theme.colors.text};
  margin-right: ${theme.spacing.sm}px;
`;

const DurationText = styled.Text`
  font-size: ${theme.fonts.sizes.md}px;
  color: ${theme.colors.textSecondary};
`;

const InfoRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  margin-top: ${theme.spacing.xs}px;
`;

const InfoLabel = styled.Text`
  font-size: ${theme.fonts.sizes.sm}px;
  color: ${theme.colors.textSecondary};
`;

const InfoValue = styled.Text`
  font-size: ${theme.fonts.sizes.sm}px;
  font-weight: 500;
  color: ${theme.colors.text};
`;

const QuickTransitText = styled.Text`
  font-size: ${theme.fonts.sizes.sm}px;
  color: #FF6B6B;
  font-weight: 500;
  margin-top: ${theme.spacing.xs}px;
`;

// Props 타입 정의
interface StepCardProps {
  type: 'walking' | 'bus' | 'subway';
  duration: number; // 분 단위
  lineName?: string; // 버스 번호, 지하철 호선 (도보일 때는 표시 안 함)
  lineColor?: string; // 호선 고유색 (도보일 때는 사용 안 함)
  quickTransit?: string; // "빠른 환승: 3-2칸 추천"
  congestion?: 'normal' | 'crowded' | 'very_crowded';
  testID?: string;
}

/**
 * 단계별 경로 카드 컴포넌트
 *
 * [DESIGN.md 4.3 단계별 경로 카드]
 * - 도보: 🚶 아이콘, 점선
 * - 교통수단: 🚌 🚇 아이콘, 호선별 고유색 라인
 * - Logic 2.3: "빠른 환승: 3-2칸 추천"
 * - Logic 2.2: "혼잡도: 혼잡" 등
 */
const StepCard: React.FC<StepCardProps> = ({
  type,
  duration,
  lineName,
  lineColor,
  quickTransit,
  congestion,
  testID = 'step-card',
}) => {
  // 단계 타입에 따른 아이콘 결정
  const getIcon = () => {
    switch (type) {
      case 'walking':
        return '🚶';
      case 'bus':
        return '🚌';
      case 'subway':
        return '🚇';
      default:
        return '🚶';
    }
  };

  // 단계 타입에 따른 라벨 결정
  const getLabel = () => {
    switch (type) {
      case 'walking':
        return '도보';
      case 'bus':
        return lineName || '버스';
      case 'subway':
        return lineName || '지하철';
      default:
        return '이동';
    }
  };

  // 혼잡도에 따른 라벨 결정
  const getCongestionLabel = (): string | null => {
    switch (congestion) {
      case 'normal':
        return '쾌적';
      case 'crowded':
        return '혼잡';
      case 'very_crowded':
        return '매우 혼잡';
      default:
        return null;
    }
  };

  return (
    <Container testID={testID} lineColor={lineColor || theme.colors.text}>
      {/* 아이콘 */}
      <IconContainer>
        <IconText>{getIcon()}</IconText>
      </IconContainer>

      {/* 내용 */}
      <ContentContainer>
        {/* 헤더: 교통수단명 + 소요시간 */}
        <HeaderRow>
          <TransportName>{getLabel()}</TransportName>
          <DurationText>{duration}분</DurationText>
        </HeaderRow>

        {/* 추가 정보 행 */}
        {(quickTransit || congestion) && (
          <InfoRow>
            {/* 혼잡도 정보 */}
            {congestion && (
              <>
                <InfoLabel>혼잡도:</InfoLabel>
                <InfoValue>{getCongestionLabel()}</InfoValue>
              </>
            )}
          </InfoRow>
        )}

        {/* 빠른 환승 정보 */}
        {quickTransit && <QuickTransitText>{quickTransit}</QuickTransitText>}
      </ContentContainer>
    </Container>
  );
};

export default StepCard;
