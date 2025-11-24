/**
 * 대안 경로 카드 (카드 2.3)
 *
 * 헌법 준수:
 * - AGENTS.md 프론트엔드 헌법 [제2장] 스타일링 (Styled-components)
 * - AGENTS.md 프론트엔드 헌법 [제3장] 데이터 페칭 (부모에서 상태 관리)
 * - DESIGN.md 4.3: 대안 경로 카드 UI/UX 명세
 */
import React from 'react';
import styled from 'styled-components/native';
import { TouchableOpacity } from 'react-native';
import { theme } from '../../../styles/theme';

// Styled-components: 의미론적 이름 사용 (헌법 제2장 준수)
const Container = styled(TouchableOpacity)`
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

const HeaderContainer = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
`;

const IconAndTitleContainer = styled.View`
  flex: 1;
  flex-direction: row;
  align-items: center;
`;

const HeadlineIcon = styled.Text`
  font-size: ${theme.fonts.sizes.xl}px;
  margin-right: ${theme.spacing.md}px;
`;

const HeadlineText = styled.Text`
  font-size: ${theme.fonts.sizes.lg}px;
  font-weight: bold;
  color: ${theme.colors.text};
  line-height: ${theme.fonts.sizes.lg * 1.2}px;
  flex: 1;
`;

const TimeSavingsContainer = styled.View`
  align-items: flex-end;
  margin-left: ${theme.spacing.md}px;
`;

const TimeSavingsValue = styled.Text`
  font-size: ${theme.fonts.sizes.xl}px;
  font-weight: bold;
  color: ${theme.colors.success || '#4CAF50'};
`;

const TimeSavingsLabel = styled.Text`
  font-size: ${theme.fonts.sizes.sm}px;
  color: ${theme.colors.textSecondary};
  margin-top: ${theme.spacing.xs}px;
`;

const DescriptionContainer = styled.View`
  margin-top: ${theme.spacing.md}px;
  padding-top: ${theme.spacing.md}px;
  border-top-width: 1px;
  border-top-color: ${theme.colors.border};
`;

const DescriptionText = styled.Text`
  font-size: ${theme.fonts.sizes.sm}px;
  color: ${theme.colors.textSecondary};
  line-height: ${theme.fonts.sizes.sm * 1.4}px;
`;

// Props 타입 정의
interface AlternativePathCardProps {
  isVisible: boolean;
  timeSavings: number; // 분 단위
  onPress?: () => void;
  testID?: string;
}

/**
 * 대안 경로 카드 컴포넌트
 *
 * [DESIGN.md 4.3 대안 경로 카드]
 * UI: "💡 7분 단축 경로 발견!" (Logic 2.2 발동 시)
 * 상태: 평소에는 숨겨져(Hidden) 있습니다.
 * Interaction: 탭(Tap) 시 → 경로 비교 모달 표시
 */
const AlternativePathCard: React.FC<AlternativePathCardProps> = ({
  isVisible,
  timeSavings,
  onPress,
  testID = 'alternative-path-card',
}) => {
  // 조건부 렌더링: isVisible이 false면 null 반환
  if (!isVisible) {
    return null;
  }

  return (
    <Container testID={testID} onPress={onPress} activeOpacity={0.7}>
      {/* 헤더: 아이콘 + 헤드라인 + 시간 단축 */}
      <HeaderContainer>
        <IconAndTitleContainer>
          <HeadlineIcon>💡</HeadlineIcon>
          <HeadlineText>
            {timeSavings}분 단축 경로 발견!
          </HeadlineText>
        </IconAndTitleContainer>
        <TimeSavingsContainer>
          <TimeSavingsValue>{timeSavings}분</TimeSavingsValue>
          <TimeSavingsLabel>단축</TimeSavingsLabel>
        </TimeSavingsContainer>
      </HeaderContainer>

      {/* 설명 텍스트 */}
      <DescriptionContainer>
        <DescriptionText>
          현재 경로보다 더 빠른 경로를 발견했습니다. 탭하여 비교하기
        </DescriptionText>
      </DescriptionContainer>
    </Container>
  );
};

export default AlternativePathCard;
