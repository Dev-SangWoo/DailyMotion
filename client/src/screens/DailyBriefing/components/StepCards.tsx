/**
 * 단계별 경로 카드 컬렉션 (Component 3)
 *
 * 헌법 준수:
 * - AGENTS.md 프론트엔드 헌법 [제2장] 스타일링 (Styled-components)
 * - AGENTS.md 프론트엔드 헌법 [제3장] 데이터 페칭 (부모에서 상태 관리)
 * - DESIGN.md 4.3: 단계별 경로 카드 UI/UX 명세
 */
import React from 'react';
import styled from 'styled-components/native';
import { ScrollView } from 'react-native';
import { theme } from '../../../styles/theme';
import StepCard from './StepCard';

// Styled-components: 의미론적 이름 사용 (헌법 제2장 준수)
const Container = styled(ScrollView)`
  background-color: ${theme.colors.background};
  padding: ${theme.spacing.md}px;
`;

const EmptyContainer = styled.View`
  padding: ${theme.spacing.md}px;
  align-items: center;
  justify-content: center;
`;

const EmptyText = styled.Text`
  font-size: ${theme.fonts.sizes.md}px;
  color: ${theme.colors.textSecondary};
`;

// Step 타입 정의
interface Step {
  id: string;
  type: 'walking' | 'bus' | 'subway';
  duration: number;
  lineName?: string;
  lineColor?: string;
  quickTransit?: string;
  congestion?: 'normal' | 'crowded' | 'very_crowded';
}

interface StepCardsProps {
  steps: Step[];
  testID?: string;
}

/**
 * 단계별 경로 카드 컬렉션 컴포넌트
 *
 * [DESIGN.md 4.3 단계별 경로 카드]
 * UI: 핵심 캐러셀 아래에 위치하는 수직 스크롤 영역
 */
const StepCards: React.FC<StepCardsProps> = ({
  steps,
  testID = 'step-cards',
}) => {
  // 빈 리스트 처리
  if (!steps || steps.length === 0) {
    return (
      <EmptyContainer testID={testID}>
        <EmptyText>경로 정보가 없습니다.</EmptyText>
      </EmptyContainer>
    );
  }

  return (
    <Container testID={testID} scrollEnabled={true}>
      {steps.map((step) => (
        <StepCard
          key={step.id}
          type={step.type}
          duration={step.duration}
          lineName={step.lineName}
          lineColor={step.lineColor}
          quickTransit={step.quickTransit}
          congestion={step.congestion}
          testID={`step-card-${step.id}`}
        />
      ))}
    </Container>
  );
};

export default StepCards;
