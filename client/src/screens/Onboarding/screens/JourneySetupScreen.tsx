/**
 * 온보딩 스크린 4: 핵심 여정 설정 (JourneySetup)
 *
 * 설계:
 * - Headline-M: "가장 중요한 여정을 알려주세요."
 * - InputField: 출발지 (📍)
 * - InputField: 도착지 (🏢)
 * - Button: 다음
 */

import React, { useState, useCallback } from 'react';
import { View, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
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

const Container = styled(SafeAreaView)`
  flex: 1;
  background-color: #F0F4FF;
`;

const Content = styled.View`
  flex: 1;
  padding: ${theme.spacing.lg}px;
  justify-content: center;
`;

const Title = styled.Text`
  font-size: ${onboardingTheme.typography.headlineM.fontSize}px;
  font-weight: ${onboardingTheme.typography.headlineM.fontWeight};
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.xl}px;
  line-height: ${onboardingTheme.typography.headlineM.lineHeight}px;
`;

const InputsWrapper = styled.View`
  gap: ${theme.spacing.lg}px;
`;

const ButtonWrapper = styled.View`
  margin-top: ${theme.spacing.xl}px;
`;

export const JourneySetupScreen: React.FC<JourneySetupScreenProps> = ({ navigation }) => {
  const actions = useOnboardingActions();
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');

  const handleNext = useCallback(() => {
    actions.updateOrigin(origin);
    actions.updateDestination(destination);
    actions.nextStep();
    navigation.navigate('PathSelection');
  }, [origin, destination, actions, navigation]);

  const isNextEnabled = origin.trim() !== '' && destination.trim() !== '';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Container>
        <Content>
          <Title>가장 중요한 여정을{'\n'}알려주세요.</Title>
          
          <InputsWrapper>
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
          </InputsWrapper>

          <ButtonWrapper>
            <OnboardingButton
              label="다음"
              onPress={handleNext}
              disabled={!isNextEnabled}
              variant="primary"
              testID="next-button"
            />
          </ButtonWrapper>
        </Content>
      </Container>
    </KeyboardAvoidingView>
  );
};

export default JourneySetupScreen;

