/**
 * 아이콘 선택 모달
 */

import React from 'react';
import { Modal, TouchableOpacity } from 'react-native';
import styled from 'styled-components/native';
import { theme } from '../../../styles/theme';

interface IconPickerModalProps {
  visible: boolean;
  selectedIcon: string;
  onSelect: (icon: string) => void;
  onClose: () => void;
}

const ModalOverlay = styled.View`
  flex: 1;
  background-color: rgba(0, 0, 0, 0.5);
  justify-content: center;
  align-items: center;
`;

const ModalContent = styled.View`
  background-color: white;
  border-radius: 20px;
  padding: ${theme.spacing.lg}px;
  width: 90%;
  max-width: 400px;
`;

const ModalHeader = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.lg}px;
`;

const ModalTitle = styled.Text`
  font-size: 20px;
  font-weight: 700;
  color: ${theme.colors.text};
`;

const CloseButton = styled.TouchableOpacity`
  padding: ${theme.spacing.xs}px;
`;

const CloseButtonText = styled.Text`
  font-size: 24px;
  color: ${theme.colors.text};
  font-weight: 300;
`;

const IconGrid = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: ${theme.spacing.md}px;
  justify-content: center;
`;

const IconButton = styled.TouchableOpacity<{ selected: boolean }>`
  width: 60px;
  height: 60px;
  border-radius: 12px;
  background-color: ${(props) => (props.selected ? theme.colors.primary : '#F5F5F5')};
  border-width: 2px;
  border-color: ${(props) => (props.selected ? theme.colors.primary : '#E0E0E0')};
  justify-content: center;
  align-items: center;
`;

const IconButtonText = styled.Text`
  font-size: 28px;
`;

export const IconPickerModal: React.FC<IconPickerModalProps> = ({
  visible,
  selectedIcon,
  onSelect,
  onClose,
}) => {
  const availableIcons = ['📍', '🏢', '🏋️', '🏥', '🎓', '🍔', '☕', '🏠', '🎬', '🛍️'];

  const handleSelect = (icon: string) => {
    onSelect(icon);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <ModalOverlay>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>아이콘 선택</ModalTitle>
            <CloseButton onPress={onClose}>
              <CloseButtonText>×</CloseButtonText>
            </CloseButton>
          </ModalHeader>

          <IconGrid>
            {availableIcons.map((icon) => (
              <IconButton
                key={icon}
                selected={selectedIcon === icon}
                onPress={() => handleSelect(icon)}
              >
                <IconButtonText>{icon}</IconButtonText>
              </IconButton>
            ))}
          </IconGrid>
        </ModalContent>
      </ModalOverlay>
    </Modal>
  );
};

export default IconPickerModal;

