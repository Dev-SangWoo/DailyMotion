/**
 * 온보딩 스크린 6: 목표 시간 설정 (GoalTime)
 *
 * 설계:
 * - TimePicker: 도착 시간
 * - SliderInput: First Mile (도보 시간, 1-15분)
 * - Primary Button: 다음
 */

import React, { useState } from 'react';
import { TouchableOpacity } from 'react-native';
import styled from 'styled-components/native';
import { theme } from '../../../styles/theme';
import { onboardingTheme } from '../styles/onboardingTheme';
import { useOnboardingActions } from '../stores/useOnboardingStore';
import { TimePickerModal } from '../components/TimePickerModal';
import { SliderInput } from '../components/SliderInput';
import { OnboardingButton } from '../components/OnboardingButton';

interface GoalTimeScreenProps {
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
 * SectionContainer
 */
const SectionContainer = styled.View`
  gap: ${theme.spacing.lg}px;
`;

/**
 * SectionTitle
 */
const SectionTitle = styled.Text`
  font-size: ${onboardingTheme.typography.headlineM.fontSize}px;
  font-weight: ${onboardingTheme.typography.headlineM.fontWeight};
  color: ${theme.colors.text};
`;

/**
 * TimeDisplayBox
 */
const TimeDisplayBox = styled(TouchableOpacity)`
  background-color: white;
  border-radius: 12px;
  padding: ${theme.spacing.lg}px;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  border-width: 1px;
  border-color: #e0e0e0;
`;

/**
 * TimeDisplayText
 */
const TimeDisplayText = styled.Text`
  font-size: 24px;
  font-weight: 700;
  color: ${theme.colors.primary};
`;

/**
 * TimeLabel
 */
const TimeLabel = styled.Text`
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
 * GoalTimeScreen
 */
export const GoalTimeScreen: React.FC<GoalTimeScreenProps> = ({
  navigation,
}) => {
  const actions = useOnboardingActions();
  const [arrivalTime, setArrivalTime] = useState('09:00');
  const [firstMile, setFirstMile] = useState(5);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const handleTimeConfirm = (time: string) => {
    setArrivalTime(time);
    setShowTimePicker(false);
  };

  const handleNext = () => {
    actions.updateArrivalTime(arrivalTime);
    actions.updateFirstMileMinutes(firstMile);
    actions.nextStep();
    navigation.navigate('ScheduleSetup');
  };

  return (
    <OuterContainer>
      <ScrollContainer showsVerticalScrollIndicator={false}>
        <ContentContainer>
          {/* 도착 시간 선택 */}
          <SectionContainer>
            <SectionTitle>회사에 몇 시까지{'\n'}도착해야 하나요?</SectionTitle>

            <TimeDisplayBox onPress={() => setShowTimePicker(true)}>
              <TimeDisplayText>{arrivalTime}</TimeDisplayText>
              <TimeLabel>클릭하여 수정</TimeLabel>
            </TimeDisplayBox>
          </SectionContainer>

          {/* First Mile 선택 */}
          <SectionContainer>
            <SectionTitle>보통 정류장/역까지{'\n'}몇 분 정도 걸리나요?</SectionTitle>

            <SliderInput
              value={firstMile}
              onChange={setFirstMile}
              min={1}
              max={15}
              testID="first-mile-slider"
            />
          </SectionContainer>

          {/* 버튼 */}
          <ButtonContainer>
            <OnboardingButton
              label="다음"
              onPress={handleNext}
              variant="primary"
              testID="next-button"
            />
          </ButtonContainer>
        </ContentContainer>
      </ScrollContainer>

      {/* 시간 선택 모달 */}
      <TimePickerModal
        visible={showTimePicker}
        onConfirm={handleTimeConfirm}
        onCancel={() => setShowTimePicker(false)}
        initialTime={arrivalTime}
      />
    </OuterContainer>
  );
};

export default GoalTimeScreen;
