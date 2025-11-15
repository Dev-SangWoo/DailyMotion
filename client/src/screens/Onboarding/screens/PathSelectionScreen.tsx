/**
 * 온보딩 스크린 5: 경로 선택 (PathSelection)
 *
 * 설계:
 * - Headline-M: "보통 이 경로로 다니시나요?"
 * - 경로 옵션 카드 (Glassmorphism, 선택 가능)
 * - Secondary Button: 직접 설정
 * - Primary Button: 다음
 */

import React, { useState } from 'react';
import { TouchableOpacity } from 'react-native';
import styled from 'styled-components/native';
import { theme } from '../../../styles/theme';
import { onboardingTheme } from '../styles/onboardingTheme';
import { useOnboardingActions } from '../stores/useOnboardingStore';
import { OnboardingCard } from '../components/OnboardingCard';
import { OnboardingButton } from '../components/OnboardingButton';

interface PathSelectionScreenProps {
  navigation: {
    navigate: (screen: string) => void;
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
  gap: ${theme.spacing.lg}px;
  flex-grow: 1;
`;

/**
 * HeadlineText
 */
const HeadlineText = styled.Text`
  font-size: ${onboardingTheme.typography.headlineM.fontSize}px;
  font-weight: ${onboardingTheme.typography.headlineM.fontWeight};
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.md}px;
`;

/**
 * PathOptionsContainer
 */
const PathOptionsContainer = styled.View`
  gap: ${theme.spacing.lg}px;
`;

/**
 * PathOptionCard - 선택 가능한 카드
 */
const PathOptionCard = styled(OnboardingCard)<{ isSelected: boolean }>`
  border-color: ${(props) =>
    props.isSelected ? theme.colors.primary : 'rgba(255, 255, 255, 0.3)'};
  border-width: 2px;
`;

/**
 * PathTitle
 */
const PathTitle = styled.Text`
  font-size: ${onboardingTheme.typography.bodyL.fontSize}px;
  font-weight: 600;
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.sm}px;
`;

/**
 * PathMeta
 */
const PathMeta = styled.Text`
  font-size: ${onboardingTheme.typography.labelM.fontSize}px;
  color: ${theme.colors.textSecondary};
`;

/**
 * ButtonContainer
 */
const ButtonContainer = styled.View`
  gap: ${theme.spacing.md}px;
  margin-top: ${theme.spacing.lg}px;
`;

/**
 * 추천 경로 데이터
 */
const recommendedPaths = [
  {
    id: 'path-1',
    title: '추천 1: 123번 → 2호선',
    duration: '약 45분',
  },
  {
    id: 'path-2',
    title: '추천 2: 456번 직행',
    duration: '약 50분',
  },
];

/**
 * PathSelectionScreen
 */
export const PathSelectionScreen: React.FC<PathSelectionScreenProps> = ({
  navigation,
}) => {
  const actions = useOnboardingActions();
  const [selectedPath, setSelectedPath] = useState(0);

  const handleNext = () => {
    actions.selectPath(selectedPath);
    actions.nextStep();
    navigation.navigate('GoalTime');
  };

  const handleCustomPath = () => {
    actions.setCustomPath('직접 설정');
    actions.nextStep();
    navigation.navigate('GoalTime');
  };

  return (
    <OuterContainer>
      <ScrollContainer showsVerticalScrollIndicator={false}>
        <ContentContainer>
          {/* 제목 */}
          <HeadlineText>보통 이 경로로{'\n'}다니시나요?</HeadlineText>

          {/* 경로 옵션 */}
          <PathOptionsContainer>
            {recommendedPaths.map((path, index) => (
              <TouchableOpacity
                key={path.id}
                onPress={() => setSelectedPath(index)}
                testID={`path-option-${index}`}
              >
                <PathOptionCard
                  variant="default"
                  isSelected={selectedPath === index}
                >
                  <PathTitle>{path.title}</PathTitle>
                  <PathMeta>{path.duration}</PathMeta>
                </PathOptionCard>
              </TouchableOpacity>
            ))}
          </PathOptionsContainer>

          {/* 버튼 */}
          <ButtonContainer>
            <OnboardingButton
              label="✏️ 아니요, 제가 직접 설정할게요"
              onPress={handleCustomPath}
              variant="secondary"
              testID="custom-button"
            />
            <OnboardingButton
              label="다음"
              onPress={handleNext}
              variant="primary"
              testID="next-button"
            />
          </ButtonContainer>
        </ContentContainer>
      </ScrollContainer>
    </OuterContainer>
  );
};

export default PathSelectionScreen;
