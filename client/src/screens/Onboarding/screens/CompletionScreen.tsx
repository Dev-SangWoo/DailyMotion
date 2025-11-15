/**
 * 온보딩 스크린 9: 완료 (Completion)
 *
 * 설계:
 * - 3D 로켓 🚀 또는 트로피 🏆 아이콘 (중앙에 크게)
 * - Headline-M: "설정 완료! 🔵"
 * - Body-L: "이제 [출근] 여정이 준비되었습니다..."
 * - Primary Button: 내일의 브리핑 미리보기
 *
 * 상호작용:
 * - Button 탭 → 메인 [브리핑] 탭으로 Replace 트랜지션
 */

import React from 'react';
import { Animated, Easing } from 'react-native';
import styled from 'styled-components/native';
import { theme } from '../../../styles/theme';
import { onboardingTheme } from '../styles/onboardingTheme';
import { OnboardingButton } from '../components/OnboardingButton';

interface CompletionScreenProps {
  navigation: {
    replace: (screen: string) => void;
  };
}

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
  gap: ${theme.spacing.xl}px;
  flex-grow: 1;
  justify-content: center;
  align-items: center;
`;

/**
 * IconContainer - 중앙 아이콘 (큼)
 */
const IconContainer = styled.View`
  width: 120px;
  height: 120px;
  justify-content: center;
  align-items: center;
  margin-bottom: ${theme.spacing.xl}px;
`;

/**
 * IconText
 */
const IconText = styled.Text`
  font-size: 80px;
`;

/**
 * TitleText
 */
const TitleText = styled.Text`
  font-size: ${onboardingTheme.typography.headlineM.fontSize}px;
  font-weight: ${onboardingTheme.typography.headlineM.fontWeight};
  color: ${theme.colors.text};
  text-align: center;
  margin-bottom: ${theme.spacing.lg}px;
`;

/**
 * DescriptionText
 */
const DescriptionText = styled.Text`
  font-size: ${onboardingTheme.typography.bodyL.fontSize}px;
  font-weight: ${onboardingTheme.typography.bodyL.fontWeight};
  color: ${theme.colors.textSecondary};
  text-align: center;
  line-height: ${onboardingTheme.typography.bodyL.lineHeight * 1.5}px;
  margin-bottom: ${theme.spacing.xl}px;
`;

/**
 * ButtonContainer
 */
const ButtonContainer = styled.View`
  width: 100%;
  gap: ${theme.spacing.md}px;
`;

/**
 * CompletionScreen 컴포넌트
 */
export const CompletionScreen: React.FC<CompletionScreenProps> = ({
  navigation,
}) => {
  /**
   * 아이콘 애니메이션 (바운스 효과)
   */
  const animatedScale = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.sequence([
      Animated.timing(animatedScale, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.elastic(1.5)),
        useNativeDriver: true,
      }),
    ]).start();
  }, [animatedScale]);

  const handleNext = () => {
    // 메인 앱의 DailyBriefing 탭으로 이동
    // Replace: 온보딩 스택을 완전히 제거
    navigation.replace('DailyBriefing');
  };

  return (
    <OuterContainer>
      <ScrollContainer
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <ContentContainer>
          {/* 아이콘 (바운스 애니메이션) */}
          <Animated.View
            style={{
              transform: [{ scale: animatedScale }],
            }}
          >
            <IconContainer>
              <IconText>🚀</IconText>
            </IconContainer>
          </Animated.View>

          {/* 제목 */}
          <TitleText>설정 완료! 🔵</TitleText>

          {/* 설명 */}
          <DescriptionText>
            이제 [출근] 여정이 준비되었습니다.{'\n'}
            내일 아침, 제가 알아서 챙겨드릴게요.
          </DescriptionText>

          {/* 버튼 */}
          <ButtonContainer>
            <OnboardingButton
              label="내일의 브리핑 미리보기"
              onPress={handleNext}
              variant="primary"
              testID="preview-button"
            />
          </ButtonContainer>
        </ContentContainer>
      </ScrollContainer>
    </OuterContainer>
  );
};

export default CompletionScreen;
