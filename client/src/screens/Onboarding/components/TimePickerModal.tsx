/**
 * 시간 선택기 모달 컴포넌트
 *
 * 스크린 6 (GoalTime)에서 사용
 * - 도착 시간 선택 (HH:MM)
 * - 네이티브 스크롤 휠 사용
 */

import React, { useState } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import styled from 'styled-components/native';
import { theme } from '../../../styles/theme';
import { OnboardingButton } from './OnboardingButton';

interface TimePickerModalProps {
  visible: boolean;
  onConfirm: (time: string) => void; // HH:MM 형식
  onCancel: () => void;
  initialTime?: string;
}

/**
 * ModalOverlay - 모달 배경 (반투명)
 */
const ModalOverlay = styled.View`
  flex: 1;
  background-color: rgba(0, 0, 0, 0.5);
  justify-content: flex-end;
`;

/**
 * ModalContent - 모달 컨텐츠 컨테이너
 */
const ModalContent = styled.View`
  background-color: white;
  border-radius: 20px 20px 0px 0px;
  padding: ${theme.spacing.lg}px;
  gap: ${theme.spacing.lg}px;
`;

/**
 * PickerContainer - 시간/분 선택기 컨테이너
 */
const PickerContainer = styled.View`
  flex-direction: row;
  gap: ${theme.spacing.lg}px;
  justify-content: center;
  align-items: center;
  height: 200px;
`;

/**
 * TimePickerColumn - 시간 또는 분 선택 열
 */
const TimePickerColumn = styled.View`
  align-items: center;
`;

/**
 * ColumnText - 시간/분 텍스트
 */
const ColumnText = styled.Text<{ isSelected: boolean }>`
  font-size: 32px;
  font-weight: ${(props) => (props.isSelected ? '700' : '400')};
  color: ${(props) => (props.isSelected ? theme.colors.primary : '#999')};
`;

/**
 * ButtonContainer - 버튼 영역
 */
const ButtonContainer = styled.View`
  flex-direction: row;
  gap: ${theme.spacing.md}px;
`;

/**
 * TimePickerModal - 시간 선택 모달 컴포넌트
 *
 * 주의: React Native의 DatePickerIOS 또는 네이티브 구현이 필요
 * 현재는 간단한 스크롤 휠 형태 시뮬레이션
 */
export const TimePickerModal: React.FC<TimePickerModalProps> = ({
  visible,
  onConfirm,
  onCancel,
  initialTime = '09:00',
}) => {
  const [hours, setHours] = useState(parseInt(initialTime.split(':')[0]));
  const [minutes, setMinutes] = useState(parseInt(initialTime.split(':')[1]));

  const handleConfirm = () => {
    const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    onConfirm(timeStr);
  };

  const generateTimeArray = (max: number) =>
    Array.from({ length: max }, (_, i) => i);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <ModalOverlay>
        <ModalContent>
          <PickerContainer>
            {/* 시간 선택 */}
            <TimePickerColumn>
              <ScrollView
                snapToAlignment="center"
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
                style={{ height: 150, width: 60 }}
              >
                {generateTimeArray(24).map((hour) => (
                  <TouchableOpacity
                    key={hour}
                    onPress={() => setHours(hour)}
                    style={{ height: 50, justifyContent: 'center' }}
                  >
                    <ColumnText isSelected={hour === hours}>
                      {String(hour).padStart(2, '0')}
                    </ColumnText>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </TimePickerColumn>

            {/* 구분자 */}
            <ColumnText isSelected={true}>:</ColumnText>

            {/* 분 선택 */}
            <TimePickerColumn>
              <ScrollView
                snapToAlignment="center"
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
                style={{ height: 150, width: 60 }}
              >
                {generateTimeArray(60).map((minute) => (
                  <TouchableOpacity
                    key={minute}
                    onPress={() => setMinutes(minute)}
                    style={{ height: 50, justifyContent: 'center' }}
                  >
                    <ColumnText isSelected={minute === minutes}>
                      {String(minute).padStart(2, '0')}
                    </ColumnText>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </TimePickerColumn>
          </PickerContainer>

          {/* 버튼 */}
          <ButtonContainer>
            <OnboardingButton
              label="취소"
              onPress={onCancel}
              variant="secondary"
            />
            <OnboardingButton
              label="확인"
              onPress={handleConfirm}
              variant="primary"
            />
          </ButtonContainer>
        </ModalContent>
      </ModalOverlay>
    </Modal>
  );
};

export default TimePickerModal;
