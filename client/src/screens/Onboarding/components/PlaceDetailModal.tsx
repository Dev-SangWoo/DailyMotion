/**
 * 장소 상세 정보 입력 모달
 * 
 * - 상세 주소 입력
 * - 지도 표시 (추후 구현)
 */

import React, { useState } from 'react';
import { Modal, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import styled from 'styled-components/native';
import { theme } from '../../../styles/theme';
import { OnboardingButton } from './OnboardingButton';

interface PlaceDetailModalProps {
  visible: boolean;
  placeName: string;
  placeIcon: string;
  onConfirm: (address: string) => void;
  onCancel: () => void;
}

const ModalOverlay = styled.View`
  flex: 1;
  background-color: rgba(0, 0, 0, 0.5);
  justify-content: flex-end;
`;

const ModalContent = styled.View`
  background-color: white;
  border-radius: 20px 20px 0px 0px;
  padding: ${theme.spacing.lg}px;
  max-height: 80%;
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

const PlaceInfo = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${theme.spacing.sm}px;
  margin-bottom: ${theme.spacing.lg}px;
  padding: ${theme.spacing.md}px;
  background-color: #F5F5F5;
  border-radius: 8px;
`;

const PlaceIconText = styled.Text`
  font-size: 24px;
`;

const PlaceNameText = styled.Text`
  font-size: 16px;
  font-weight: 600;
  color: ${theme.colors.text};
`;

const AddressLabel = styled.Text`
  font-size: 14px;
  font-weight: 600;
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.sm}px;
`;

const AddressInput = styled.TextInput`
  height: 56px;
  padding-horizontal: ${theme.spacing.md}px;
  background-color: #FFFFFF;
  border-radius: 8px;
  border-width: 1px;
  border-color: #E0E0E0;
  font-size: 16px;
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.lg}px;
`;

const MapContainer = styled.View`
  height: 200px;
  background-color: #F0F0F0;
  border-radius: 8px;
  margin-bottom: ${theme.spacing.lg}px;
  justify-content: center;
  align-items: center;
  border-width: 1px;
  border-color: #E0E0E0;
`;

const MapPlaceholder = styled.Text`
  font-size: 14px;
  color: #999999;
`;

const ButtonContainer = styled.View`
  flex-direction: row;
  gap: ${theme.spacing.md}px;
`;

export const PlaceDetailModal: React.FC<PlaceDetailModalProps> = ({
  visible,
  placeName,
  placeIcon,
  onConfirm,
  onCancel,
}) => {
  const [address, setAddress] = useState('');

  const handleConfirm = () => {
    if (address.trim()) {
      onConfirm(address.trim());
      setAddress('');
    }
  };

  const handleCancel = () => {
    setAddress('');
    onCancel();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <ModalOverlay>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, justifyContent: 'flex-end' }}
        >
          <ModalContent>
            <ModalHeader>
              <ModalTitle>상세 주소 입력</ModalTitle>
              <CloseButton onPress={handleCancel}>
                <CloseButtonText>×</CloseButtonText>
              </CloseButton>
            </ModalHeader>

            <PlaceInfo>
              <PlaceIconText>{placeIcon}</PlaceIconText>
              <PlaceNameText>{placeName}</PlaceNameText>
            </PlaceInfo>

            <AddressLabel>상세 주소</AddressLabel>
            <AddressInput
              placeholder="상세 주소를 입력해주세요 (예: 서울시 강남구 역삼동 123-45)"
              value={address}
              onChangeText={setAddress}
              multiline={false}
            />

            <MapContainer>
              <MapPlaceholder>지도 영역 (추후 구현)</MapPlaceholder>
            </MapContainer>

            <ButtonContainer>
              <OnboardingButton
                label="취소"
                onPress={handleCancel}
                variant="secondary"
                style={{ flex: 1 }}
              />
              <OnboardingButton
                label="확인"
                onPress={handleConfirm}
                variant="primary"
                disabled={!address.trim()}
                style={{ flex: 1 }}
              />
            </ButtonContainer>
          </ModalContent>
        </KeyboardAvoidingView>
      </ModalOverlay>
    </Modal>
  );
};

export default PlaceDetailModal;

