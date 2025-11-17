/**
 * 온보딩 스크린 5: 자주 가는 장소 설정
 *
 * 설계:
 * - Headline-M: "자주 가는 장소들을 알려주세요."
 * - InputField: 장소 입력
 * - 추가 버튼
 * - 추가된 장소 리스트 (삭제 가능)
 * - Button: 다음
 */

import React, { useState, useCallback } from 'react';
import { SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import styled from 'styled-components/native';
import { theme } from '../../../styles/theme';
import { onboardingTheme } from '../styles/onboardingTheme';
import { useOnboardingActions } from '../stores/useOnboardingStore';
import { InputField } from '../components/InputField';
import { OnboardingButton } from '../components/OnboardingButton';

interface FavoritePlacesScreenProps {
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
`;

const Title = styled.Text`
  font-size: ${onboardingTheme.typography.headlineM.fontSize}px;
  font-weight: ${onboardingTheme.typography.headlineM.fontWeight};
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.xl}px;
  line-height: ${onboardingTheme.typography.headlineM.lineHeight}px;
`;

const InputWrapper = styled.View`
  flex-direction: row;
  gap: ${theme.spacing.sm}px;
  margin-bottom: ${theme.spacing.md}px;
  align-items: flex-start;
`;

const InputFieldWrapper = styled.View`
  flex: 1;
`;

const AddButton = styled.TouchableOpacity<{ disabled?: boolean }>`
  background-color: ${(props) => (props.disabled ? '#CCCCCC' : theme.colors.primary)};
  padding: ${theme.spacing.md}px ${theme.spacing.lg}px;
  border-radius: 8px;
  justify-content: center;
  align-items: center;
  min-width: 80px;
  height: 56px;
`;

const AddButtonText = styled.Text`
  color: white;
  font-size: 14px;
  font-weight: 600;
`;

const PlacesList = styled.View`
  gap: ${theme.spacing.sm}px;
  margin-bottom: ${theme.spacing.lg}px;
`;

const PlaceItem = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  background-color: white;
  padding: ${theme.spacing.md}px;
  border-radius: 8px;
  border-width: 1px;
  border-color: #E0E0E0;
`;

const PlaceText = styled.Text`
  font-size: 16px;
  color: ${theme.colors.text};
  flex: 1;
`;

const DeleteButton = styled.TouchableOpacity`
  padding: ${theme.spacing.xs}px;
`;

const DeleteButtonText = styled.Text`
  color: ${theme.colors.error};
  font-size: 14px;
  font-weight: 600;
`;

const ButtonWrapper = styled.View`
  margin-top: ${theme.spacing.lg}px;
`;

export const FavoritePlacesScreen: React.FC<FavoritePlacesScreenProps> = ({ navigation }) => {
  const actions = useOnboardingActions();
  const [currentPlace, setCurrentPlace] = useState('');
  const [places, setPlaces] = useState<string[]>([]);

  const handleAddPlace = useCallback(() => {
    const trimmed = currentPlace.trim();
    if (trimmed && !places.includes(trimmed)) {
      setPlaces([...places, trimmed]);
      setCurrentPlace('');
    }
  }, [currentPlace, places]);

  const handleDeletePlace = useCallback((index: number) => {
    setPlaces(places.filter((_, i) => i !== index));
  }, [places]);

  const handleNext = useCallback(() => {
    actions.updateFavoritePlaces(places);
    actions.nextStep();
    navigation.navigate('PathSelection');
  }, [places, actions, navigation]);

  const isNextEnabled = places.length > 0;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Container>
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <Content>
            <Title>자주 가는 장소들을{'\n'}알려주세요.</Title>
            
            <InputWrapper>
              <InputFieldWrapper>
                <InputField
                  placeholder="장소 이름 (예: 회사, 헬스장)"
                  value={currentPlace}
                  onChange={setCurrentPlace}
                  icon="📍"
                  testID="place-input"
                />
              </InputFieldWrapper>
              <AddButton 
                onPress={handleAddPlace} 
                disabled={!currentPlace.trim()}
              >
                <AddButtonText>추가</AddButtonText>
              </AddButton>
            </InputWrapper>

            {places.length > 0 && (
              <PlacesList>
                {places.map((place, index) => (
                  <PlaceItem key={index}>
                    <PlaceText>{place}</PlaceText>
                    <DeleteButton onPress={() => handleDeletePlace(index)}>
                      <DeleteButtonText>삭제</DeleteButtonText>
                    </DeleteButton>
                  </PlaceItem>
                ))}
              </PlacesList>
            )}

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
        </ScrollView>
      </Container>
    </KeyboardAvoidingView>
  );
};

export default FavoritePlacesScreen;

