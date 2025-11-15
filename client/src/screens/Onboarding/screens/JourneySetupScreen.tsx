/**
 * 온보딩 스크린 4: 핵심 여정 설정 (JourneySetup)
 *
 * 설계:
 * - Headline-M: "가장 중요한 여정을 알려주세요."
 * - InputField: 출발지 (📍)
 * - InputField: 도착지 (🏢)
 * - Button: 다음
 *
 * desgin.md v3.2 준수:
 * - 대화형 설정 (한 번에 하나씩)
 * - 입력 필드는 Flat 스타일
 * - CTA는 3D 버튼
 */

import React, { useState } from 'react';
import styled from 'styled-components/native';
import { theme } from '../../../styles/theme';
import { onboardingTheme } from '../styles/onboardingTheme';
import { useOnboardingActions } from '../stores/useOnboardingStore';
import { InputField } from '../components/InputField';
import { OnboardingButton } from '../components/OnboardingButton';

interface JourneySetupScreenProps {
  navigation: {
    navigate: (screen: string) => void;
  };
}

/**
 * OuterContainer - 전체 컨테이너
 */
const OuterContainer = styled.SafeAreaView`
  flex: 1;
  background-color: #F0F4FF;
`;

/**
 * ScrollContainer - 스크롤 가능 컨테이너
 */
const ScrollContainer = styled.ScrollView`
  flex: 1;
`;

/**
 * ContentContainer - 컨텐츠 영역
 */
const ContentContainer = styled.View`
  padding: ${theme.spacing.lg}px;
  gap: ${theme.spacing.lg}px;
  flex-grow: 1;
  justify-content: center;
`;

/**
 * HeadlineText - 제목 (Headline-M: 22px, Semi-Bold)
 */
const HeadlineText = styled.Text`
  font-size: ${onboardingTheme.typography.headlineM.fontSize}px;
  font-weight: ${onboardingTheme.typography.headlineM.fontWeight};
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.md}px;
  line-height: ${onboardingTheme.typography.headlineM.lineHeight}px;
`;

/**
 * InputsContainer - 입력 필드 그룹
 */
const InputsContainer = styled.View`
  gap: ${theme.spacing.lg}px;
`;

/**
 * ButtonContainer - 버튼 영역
 */
const ButtonContainer = styled.View`
  gap: ${theme.spacing.md}px;
  margin-top: ${theme.spacing.lg}px;
`;

/**
 * JourneySetupScreen 컴포넌트
 *
 * 사용자가 가장 중요한 여정(예: 회사)의 출발지와 도착지를 입력
 */
export const JourneySetupScreen: React.FC<JourneySetupScreenProps> = ({
  navigation,
}) => {
  const actions = useOnboardingActions();
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');

  /**
   * 다음 버튼 탭 핸들러
   * - 출발지/도착지 상태 저장
   * - 다음 스크린으로 이동
   */
  const handleNext = () => {
    // 상태 저장 (Zustand)
    actions.updateOrigin(origin);
    actions.updateDestination(destination);
    actions.nextStep();

    // 네비게이션
    navigation.navigate('PathSelection');
  };

  /**
   * 다음 버튼 활성화 여부
   * - 출발지와 도착지 모두 입력되어야 함
   */
  const isNextEnabled = origin.trim() !== '' && destination.trim() !== '';

  return (
    <OuterContainer>
      <ScrollContainer showsVerticalScrollIndicator={false}>
        <ContentContainer>
          {/* 제목 */}
          <HeadlineText>
            가장 중요한 여정을{'\n'}알려주세요.
          </HeadlineText>

          {/* 입력 필드 */}
          <InputsContainer>
            <InputField
              placeholder="출발지 (예: 집)"
              value={origin}
              onChange={setOrigin}
              icon="📍"
              testID="origin-input"
            />
            <InputField
              placeholder="도착지 (예: 회사)"
              value={destination}
              onChange={setDestination}
              icon="🏢"
              testID="destination-input"
            />
          </InputsContainer>

          {/* 버튼 */}
          <ButtonContainer>
            <OnboardingButton
              label="다음"
              onPress={handleNext}
              disabled={!isNextEnabled}
              variant="primary"
              testID="next-button"
            />
          </ButtonContainer>
        </ContentContainer>
      </ScrollContainer>
    </OuterContainer>
  );
};

export default JourneySetupScreen;
