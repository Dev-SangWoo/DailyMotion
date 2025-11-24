/**
 * 온보딩 스크린 4: 장소 설정 (집 주소 + 자주 가는 장소)
 *
 * 설계:
 * - 집 주소 구슬은 항상 위에 고정
 * - Step 1: "집 주소를 입력해주세요" + 입력창 (가운데)
 * - Step 2: "자주 가는 장소들을 알려주세요" + 입력창 (같은 위치)
 * - 다음 버튼: Step 1 컨텐츠만 아래로 사라지고 Step 2가 나타남
 */

import React, { useState, useCallback, useRef } from 'react';
import { SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, Animated, TouchableOpacity } from 'react-native';
import styled from 'styled-components/native';
import { theme } from '../../../styles/theme';
import { onboardingTheme } from '../styles/onboardingTheme';
import { useOnboardingActions } from '../stores/useOnboardingStore';
import { InputField } from '../components/InputField';
import { OnboardingButton } from '../components/OnboardingButton';
import { PlaceDetailModal } from '../components/PlaceDetailModal';
import { IconPickerModal } from '../components/IconPickerModal';

interface PlacesSetupScreenProps {
  navigation: {
    navigate: (screen: string) => void;
  };
}

const Container = styled(SafeAreaView)`
  flex: 1;
  background-color: ${onboardingTheme.colors.ambientNormal};
`;

const Content = styled.View`
  flex: 1;
  padding: ${theme.spacing.lg}px;
  justify-content: center;
`;

const HomeFocusBubble = styled(Animated.View)`
  background-color: ${onboardingTheme.colors.neutral100};
  border-radius: ${onboardingTheme.borderRadius.round}px;
  padding: ${theme.spacing.sm}px ${theme.spacing.lg}px;
  border-width: 2px;
  border-color: ${theme.colors.primary};
  margin-bottom: ${theme.spacing.xl}px;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  align-self: center;
  flex-direction: row;
  gap: ${theme.spacing.xs}px;
`;

const HomeFocusIcon = styled.Text`
  font-size: ${onboardingTheme.typography.bodyM.fontSize}px;
`;

const HomeFocusText = styled.Text`
  font-size: ${onboardingTheme.typography.bodyM.fontSize}px;
  color: ${theme.colors.text};
  font-weight: ${onboardingTheme.typography.bodyM.fontWeight};
`;

const Title = styled(Animated.Text)`
  font-size: ${onboardingTheme.typography.headlineM.fontSize}px;
  font-weight: ${onboardingTheme.typography.headlineM.fontWeight};
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.xl}px;
  line-height: ${onboardingTheme.typography.headlineM.lineHeight}px;
  text-align: center;
`;

const StepContainer = styled(Animated.View)`
  align-items: center;
  justify-content: center;
  margin-bottom: ${theme.spacing.xl}px;
`;

const InputWrapper = styled.View`
  flex-direction: row;
  gap: ${theme.spacing.sm}px;
  margin-bottom: ${theme.spacing.md}px;
  align-items: flex-start;
  width: 100%;
`;

const InputFieldWrapper = styled.View`
  flex: 1;
`;

// AddButton은 OnboardingButton으로 대체

const PlacesContainer = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: ${theme.spacing.md}px;
  margin-bottom: ${theme.spacing.lg}px;
  width: 100%;
  justify-content: center;
`;

const PlaceBubble = styled(Animated.View)`
  background-color: ${onboardingTheme.colors.neutral100};
  border-radius: ${onboardingTheme.borderRadius.round}px;
  padding: ${theme.spacing.sm}px ${theme.spacing.lg}px;
  border-width: 2px;
  border-color: ${theme.colors.primary};
  flex-direction: row;
  align-items: center;
  gap: ${theme.spacing.xs}px;
  min-height: 44px;
`;

const PlaceIcon = styled.Text`
  font-size: ${onboardingTheme.typography.bodyM.fontSize}px;
`;

const PlaceText = styled.Text`
  font-size: ${onboardingTheme.typography.bodyM.fontSize}px;
  color: ${theme.colors.text};
  font-weight: ${onboardingTheme.typography.bodyM.fontWeight};
`;

const IconSelectButton = styled.TouchableOpacity<{ disabled?: boolean }>`
  width: 56px;
  height: 56px;
  border-radius: ${onboardingTheme.borderRadius.md}px;
  background-color: ${onboardingTheme.colors.neutral100};
  border-width: 1px;
  border-color: ${theme.colors.border};
  justify-content: center;
  align-items: center;
  margin-right: ${theme.spacing.sm}px;
  opacity: ${(props) => (props.disabled ? 0.6 : 1)};
`;

const IconSelectButtonText = styled.Text`
  font-size: 24px;
`;

const DeleteButton = styled.TouchableOpacity`
  padding: ${theme.spacing.xs}px;
`;

const DeleteIcon = styled.Text`
  color: ${theme.colors.error};
  font-size: 20px;
  font-weight: 600;
  line-height: 20px;
`;

const ButtonWrapper = styled(Animated.View)`
  margin-top: ${theme.spacing.lg}px;
  align-items: center;
`;

/**
 * 주소 정보 타입
 */
interface AddressInfo {
  name: string;
  icon: string;
  address?: string; // 도로명 주소
  x?: string; // 경도
  y?: string; // 위도
}

export const PlacesSetupScreen: React.FC<PlacesSetupScreenProps> = ({ navigation }) => {
  const actions = useOnboardingActions();
  const [step, setStep] = useState<'home' | 'places'>('home');
  const [currentHomeName, setCurrentHomeName] = useState('');
  const [homeAddress, setHomeAddress] = useState<AddressInfo | null>(null);
  const [currentPlace, setCurrentPlace] = useState('');
  const [currentPlaceIcon, setCurrentPlaceIcon] = useState('📍');
  const [places, setPlaces] = useState<AddressInfo[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isHomeModalVisible, setIsHomeModalVisible] = useState(false);
  const [isIconPickerVisible, setIsIconPickerVisible] = useState(false);
  
  // 집 주소 구슬 애니메이션 (항상 위에 고정)
  const homeBubbleOpacity = useRef(new Animated.Value(0)).current;
  const homeBubbleScale = useRef(new Animated.Value(0.5)).current;
  
  // 집 주소 입력창 포커스 구슬 애니메이션
  const [isHomeInputFocused, setIsHomeInputFocused] = useState(false);
  const homeFocusBubbleOpacity = useRef(new Animated.Value(0)).current;
  const homeFocusBubbleScale = useRef(new Animated.Value(0.5)).current;
  
  // Step 1 애니메이션 (제목, 입력창, 버튼)
  const step1Opacity = useRef(new Animated.Value(1)).current;
  const step1TranslateY = useRef(new Animated.Value(0)).current;
  
  // Step 2 애니메이션 (제목, 입력창, 버튼)
  const step2Opacity = useRef(new Animated.Value(0)).current;
  const step2TranslateY = useRef(new Animated.Value(50)).current;

  // 구슬 애니메이션을 위한 refs
  const bubbleAnimations = useRef<{ [key: string]: Animated.Value }>({}).current;

  // 집 주소 입력 시 구슬 표시
  React.useEffect(() => {
    if (homeAddress) {
      Animated.parallel([
        Animated.spring(homeBubbleOpacity, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.spring(homeBubbleScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      homeBubbleOpacity.setValue(0);
      homeBubbleScale.setValue(0.5);
    }
  }, [homeAddress, homeBubbleOpacity, homeBubbleScale]);

  const handleAddHome = useCallback(() => {
    const trimmed = currentHomeName.trim();
    if (trimmed) {
      // 모달 열기
      setIsHomeModalVisible(true);
    }
  }, [currentHomeName]);

  const handleHomeModalConfirm = useCallback(
    (placeName: string, fullAddress?: string, x?: string, y?: string) => {
      const trimmed = currentHomeName.trim();
      if (trimmed && fullAddress) {
        const homeKey = `${trimmed}-🏠`;
        // 새로운 구슬 애니메이션 생성
        bubbleAnimations[homeKey] = new Animated.Value(0);

        // 주소 정보 저장 (fullAddress, 좌표 포함)
        const newHome = {
          name: trimmed,
          icon: '🏠',
          address: fullAddress,
          x, // 경도
          y, // 위도
        };
        setHomeAddress(newHome);
        // Store에 객체로 저장
        actions.updateHomeAddress(newHome);
        setCurrentHomeName('');
        setIsHomeModalVisible(false);

        // 애니메이션 시작
        setTimeout(() => {
          Animated.spring(bubbleAnimations[homeKey], {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }).start();
        }, 50);
      }
    },
    [currentHomeName, actions, bubbleAnimations]
  );

  const handleHomeModalCancel = useCallback(() => {
    setIsHomeModalVisible(false);
  }, []);

  const handleHomeNext = useCallback(() => {
    if (homeAddress) {
      // Step 1 아래로 사라지는 애니메이션
      Animated.parallel([
        Animated.timing(step1Opacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(step1TranslateY, {
          toValue: 100,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setStep('places');
        
        // Step 2 나타나는 애니메이션
        Animated.parallel([
          Animated.timing(step2Opacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(step2TranslateY, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }
  }, [homeAddress, step1Opacity, step1TranslateY, step2Opacity, step2TranslateY]);

  const handleAddPlace = useCallback(() => {
    const trimmed = currentPlace.trim();
    if (trimmed && !places.some(p => p.name === trimmed)) {
      // 모달 열기
      setIsModalVisible(true);
    }
  }, [currentPlace, places]);

  const handleModalConfirm = useCallback(
    (placeName: string, fullAddress?: string, x?: string, y?: string) => {
      const trimmed = currentPlace.trim();
      if (trimmed && fullAddress) {
        const placeKey = `${trimmed}-${currentPlaceIcon}`;
        // 새로운 구슬 애니메이션 생성
        bubbleAnimations[placeKey] = new Animated.Value(0);

        // 주소 정보 저장 (fullAddress, 좌표 포함)
        setPlaces([
          ...places,
          {
            name: trimmed,
            icon: currentPlaceIcon,
            address: fullAddress,
            x, // 경도
            y, // 위도
          },
        ]);
        setCurrentPlace('');
        setCurrentPlaceIcon('📍');
        setIsModalVisible(false);

        // 애니메이션 시작
        setTimeout(() => {
          Animated.spring(bubbleAnimations[placeKey], {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }).start();
        }, 50);
      }
    },
    [currentPlace, currentPlaceIcon, places, bubbleAnimations]
  );

  const handleModalCancel = useCallback(() => {
    setIsModalVisible(false);
  }, []);

  const handleDeletePlace = useCallback((index: number) => {
    const placeToDelete = places[index];
    const placeKey = `${placeToDelete.name}-${placeToDelete.icon}`;
    // 삭제 애니메이션
    if (bubbleAnimations[placeKey]) {
      Animated.timing(bubbleAnimations[placeKey], {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        delete bubbleAnimations[placeKey];
        setPlaces(places.filter((_, i) => i !== index));
      });
    } else {
      setPlaces(places.filter((_, i) => i !== index));
    }
  }, [places, bubbleAnimations]);

  const handleNext = useCallback(() => {
    actions.updateFavoritePlaces(places);
    actions.nextStep();
    navigation.navigate('PathSelection');
  }, [places, actions, navigation]);

  const isNextEnabled = step === 'home' ? homeAddress !== null : places.length > 0;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <Container>
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1, paddingBottom: theme.spacing.xl }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          <Content>
            {/* 집 주소와 추가된 장소 구슬들 (한 줄에 통합 표시) */}
            {(homeAddress || (step === 'places' && places.length > 0)) && (
              <PlacesContainer>
                {/* 집 주소 구슬 (집 주소가 있으면 항상 표시) */}
                {homeAddress && (
                  <PlaceBubble
                    style={{
                      opacity: homeBubbleOpacity,
                      transform: [{ scale: homeBubbleScale }],
                    }}
                  >
                    <PlaceIcon>{homeAddress.icon}</PlaceIcon>
                    <PlaceText>{homeAddress.name}</PlaceText>
                  </PlaceBubble>
                )}
                
                {/* 추가된 장소 구슬들 (집 구슬 옆에 자연스럽게 추가) */}
                {step === 'places' && places.map((place, index) => {
                  const placeKey = `${place.name}-${place.icon}`;
                  const animValue = bubbleAnimations[placeKey] || new Animated.Value(1);
                  
                  return (
                    <PlaceBubble
                      key={`${place.name}-${place.icon}-${index}`}
                      style={{
                        opacity: animValue,
                        transform: [
                          {
                            scale: animValue.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.5, 1],
                            }),
                          },
                        ],
                      }}
                    >
                      <PlaceIcon>{place.icon}</PlaceIcon>
                      <PlaceText>{place.name}</PlaceText>
                    </PlaceBubble>
                  );
                })}
              </PlacesContainer>
            )}

            {/* Step 1: 집 주소 입력 */}
            {step === 'home' && (
              <StepContainer
                style={{
                  opacity: step1Opacity,
                  transform: [{ translateY: step1TranslateY }],
                }}
              >
                <Title>
                  집 주소를{'\n'}입력해주세요.
                </Title>
                
                <InputWrapper>
                  <IconSelectButton disabled>
                    <IconSelectButtonText>🏠</IconSelectButtonText>
                  </IconSelectButton>
                  <InputFieldWrapper>
                    <InputField
                      placeholder="집 이름 (예: 우리집)"
                      value={currentHomeName}
                      onChange={setCurrentHomeName}
                      testID="home-name-input"
                    />
                  </InputFieldWrapper>
                  <OnboardingButton
                    label="추가"
                    onPress={handleAddHome}
                    disabled={!currentHomeName.trim()}
                    variant="primary"
                    testID="add-home-button"
                  />
                </InputWrapper>
              </StepContainer>
            )}

            {/* Step 2: 자주 가는 장소들 */}
            {step === 'places' && (
              <StepContainer
                style={{
                  opacity: step2Opacity,
                  transform: [{ translateY: step2TranslateY }],
                }}
              >
                <Title>
                  자주 가는 장소들을{'\n'}알려주세요.
                </Title>
                
                <InputWrapper>
                  <IconSelectButton onPress={() => setIsIconPickerVisible(true)}>
                    <IconSelectButtonText>{currentPlaceIcon}</IconSelectButtonText>
                  </IconSelectButton>
                  <InputFieldWrapper>
                    <InputField
                      placeholder="장소 이름 (예: 회사, 헬스장)"
                      value={currentPlace}
                      onChange={setCurrentPlace}
                      testID="place-input"
                    />
                  </InputFieldWrapper>
                  <OnboardingButton
                    label="추가"
                    onPress={handleAddPlace}
                    disabled={!currentPlace.trim()}
                    variant="primary"
                    testID="add-place-button"
                  />
                </InputWrapper>
              </StepContainer>
            )}

            {/* 버튼 (Step 1과 Step 2 모두 같은 위치) */}
            {step === 'home' ? (
              <ButtonWrapper
                style={{
                  opacity: step1Opacity,
                  transform: [{ translateY: step1TranslateY }],
                }}
              >
                <OnboardingButton
                  label="다음"
                  onPress={handleHomeNext}
                  disabled={!isNextEnabled}
                  variant="primary"
                  testID="next-button"
                />
              </ButtonWrapper>
            ) : (
              <ButtonWrapper
                style={{
                  opacity: step2Opacity,
                  transform: [{ translateY: step2TranslateY }],
                }}
              >
                <OnboardingButton
                  label="완료"
                  onPress={handleNext}
                  disabled={!isNextEnabled}
                  variant="primary"
                  testID="next-button"
                />
              </ButtonWrapper>
            )}
          </Content>
        </ScrollView>
      </Container>

      {/* 아이콘 선택 모달 */}
      <IconPickerModal
        visible={isIconPickerVisible}
        selectedIcon={currentPlaceIcon}
        onSelect={setCurrentPlaceIcon}
        onClose={() => setIsIconPickerVisible(false)}
      />

      {/* 집 주소 상세 입력 모달 */}
      <PlaceDetailModal
        visible={isHomeModalVisible}
        placeName={currentHomeName}
        placeIcon="🏠"
        onConfirm={handleHomeModalConfirm}
        onCancel={handleHomeModalCancel}
      />

      {/* 상세 주소 입력 모달 */}
      <PlaceDetailModal
        visible={isModalVisible}
        placeName={currentPlace}
        placeIcon={currentPlaceIcon}
        onConfirm={handleModalConfirm}
        onCancel={handleModalCancel}
      />
    </KeyboardAvoidingView>
  );
};

export default PlacesSetupScreen;
