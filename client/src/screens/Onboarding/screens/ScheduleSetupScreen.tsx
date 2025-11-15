/**
 * 온보딩 스크린 7: 스케줄 설정 (ScheduleSetup)
 *
 * 설계:
 * - Headline-M: "이 여정(출근)은 언제가 필요하신가요?"
 * - Primary Button (크고 강조): 📅 평일 (월-금)
 * - Secondary Button (작고 흐리게): ✏️ 직접 선택할래요
 */

import React, { useState } from 'react';
import styled from 'styled-components/native';
import { theme } from '../../../styles/theme';
import { onboardingTheme } from '../styles/onboardingTheme';
import { useOnboardingActions } from '../stores/useOnboardingStore';
import { OnboardingButton } from '../components/OnboardingButton';

interface ScheduleSetupScreenProps {
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
  gap: ${theme.spacing.xl}px;
  flex-grow: 1;
  justify-content: center;
`;

/**
 * HeadlineText
 */
const HeadlineText = styled.Text`
  font-size: ${onboardingTheme.typography.headlineM.fontSize}px;
  font-weight: ${onboardingTheme.typography.headlineM.fontWeight};
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.lg}px;
`;

/**
 * ButtonContainer
 */
const ButtonContainer = styled.View`
  gap: ${theme.spacing.md}px;
`;

/**
 * ScheduleSetupScreen
 */
export const ScheduleSetupScreen: React.FC<ScheduleSetupScreenProps> = ({
  navigation,
}) => {
  const actions = useOnboardingActions();

  const handleWeekdays = () => {
    // 평일 (월-금) 선택
    actions.setSchedule(['MON', 'TUE', 'WED', 'THU', 'FRI'], false);
    actions.nextStep();
    navigation.navigate('Permissions');
  };

  const handleCustom = () => {
    // 직접 선택 (향후 커스텀 선택 화면으로 이동)
    actions.setSchedule(['MON', 'TUE', 'WED', 'THU', 'FRI'], true);
    actions.nextStep();
    navigation.navigate('Permissions');
  };

  return (
    <OuterContainer>
      <ScrollContainer showsVerticalScrollIndicator={false}>
        <ContentContainer>
          {/* 제목 */}
          <HeadlineText>
            이 여정(출근)은{'\n'}언제가 필요하신가요?
          </HeadlineText>

          {/* 버튼 */}
          <ButtonContainer>
            <OnboardingButton
              label="📅 평일 (월-금)"
              onPress={handleWeekdays}
              variant="primary"
              testID="weekdays-button"
            />
            <OnboardingButton
              label="✏️ 직접 선택할래요"
              onPress={handleCustom}
              variant="secondary"
              testID="custom-button"
            />
          </ButtonContainer>
        </ContentContainer>
      </ScrollContainer>
    </OuterContainer>
  );
};

export default ScheduleSetupScreen;
