/**
 * 온보딩 스크린 4: 집 주소 설정
 *
 * 설계:
 * - Headline-M: "집 주소를 알려주세요."
 * - InputField: 집 주소 (🏠)
 * - Button: 다음
 */

import React, { useState, useCallback } from 'react';
import { SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import styled from 'styled-components/native';
import { theme } from '../../../styles/theme';
import { onboardingTheme } from '../styles/onboardingTheme';
import { useOnboardingActions } from '../stores/useOnboardingStore';
import { InputField } from '../components/InputField';
import { OnboardingButton } from '../components/OnboardingButton';

interface HomeAddressScreenProps {
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

const ButtonWrapper = styled.View`
  margin-top: ${theme.spacing.xl}px;
`;

export const HomeAddressScreen: React.FC<HomeAddressScreenProps> = ({ navigation }) => {
  const actions = useOnboardingActions();
  const [homeAddress, setHomeAddress] = useState('');

  const handleNext = useCallback(() => {
    actions.updateHomeAddress(homeAddress);
    actions.nextStep();
    navigation.navigate('FavoritePlaces');
  }, [homeAddress, actions, navigation]);

  const isNextEnabled = homeAddress.trim() !== '';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Container>
        <Content>
          <Title>집 주소를{'\n'}알려주세요.</Title>
          
          <InputField
            placeholder="집 주소 (예: 서울시 강남구 역삼동)"
            value={homeAddress}
            onChange={setHomeAddress}
            icon="🏠"
            testID="home-address-input"
          />

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

export default HomeAddressScreen;

