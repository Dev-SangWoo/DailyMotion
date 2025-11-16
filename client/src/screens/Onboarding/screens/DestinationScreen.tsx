/**
 * 온보딩 스크린 5: 도착지 설정 (Destination)
 *
 * 설계:
 * - Headline-M: "도착지를 알려주세요."
 * - InputField: 도착지 (🏢)
 * - Button: 다음
 *
 * desgin.md v3.2 준수:
 * - "한 번에 하나씩" 원칙 (대화형)
 * - 입력 필드는 Flat 스타일
 * - CTA는 3D 버튼
 */

import React, { useState, useCallback } from 'react';
import styled from 'styled-components/native';
import { theme } from '../../../styles/theme';
import { onboardingTheme } from '../styles/onboardingTheme';
import { useOnboardingActions } from '../stores/useOnboardingStore';
import { InputField } from '../components/InputField';
import { OnboardingButton } from '../components/OnboardingButton';

interface DestinationScreenProps {
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
 * ButtonContainer - 버튼 영역
 */
const ButtonContainer = styled.View`
  gap: ${theme.spacing.md}px;
  margin-top: ${theme.spacing.lg}px;
`;

/**
 * DestinationScreen 컴포넌트
 *
 * 사용자가 가장 중요한 여정의 도착지를 입력
 */
export const DestinationScreen: React.FC<DestinationScreenProps> = ({
  navigation,
}) => {
  const actions = useOnboardingActions();
  const [destination, setDestination] = useState('');

  // onChange 핸들러를 useCallback으로 메모이제이션하여 불필요한 리렌더링 방지
  const handleDestinationChange = useCallback((text: string) => {
    setDestination(text);
  }, []);

  /**
   * 다음 버튼 탭 핸들러
   * - 도착지 상태 저장
   * - 다음 스크린으로 이동
   */
  const handleNext = useCallback(() => {
    // 상태 저장 (Zustand)
    actions.updateDestination(destination);
    actions.nextStep();

    // 네비게이션
    navigation.navigate('PathSelection');
  }, [destination, actions, navigation]);

  /**
   * 다음 버튼 활성화 여부
   * - 도착지가 입력되어야 함
   */
  const isNextEnabled = destination.trim() !== '';

  return (
    <OuterContainer>
      <ScrollContainer
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="interactive"
      >
        <ContentContainer>
          {/* 제목 */}
          <HeadlineText>
            도착지를{'\n'}알려주세요.
          </HeadlineText>

          {/* 입력 필드 */}
          <InputField
            placeholder="도착지 (예: 회사)"
            value={destination}
            onChange={handleDestinationChange}
            icon="🏢"
            testID="destination-input"
          />

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

export default DestinationScreen;
