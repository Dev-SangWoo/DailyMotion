import React, { useMemo, useState, useEffect, useCallback } from 'react';
import styled from 'styled-components/native';
import { ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Modal, Alert } from 'react-native';
import { theme } from '../../styles/theme';
import { useNavigation } from '@react-navigation/native';
import { useOnboardingStore } from '../Onboarding/stores/useOnboardingStore';
import { PlaceDetailModal } from '../Onboarding/components/PlaceDetailModal';
import { AddressSearchInput } from '../../components/kakao/AddressSearchInput';
import { OnboardingButton } from '../Onboarding/components/OnboardingButton';

const Container = styled.View`
  flex: 1;
  background-color: ${theme.colors.background};
`;

const Header = styled.View`
  padding: ${theme.spacing.lg}px;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const BackButton = styled(TouchableOpacity)`
  padding: ${theme.spacing.sm}px;
`;

const BackText = styled.Text`
  font-size: 16px;
  color: ${theme.colors.primary};
`;

const HeaderTitle = styled.Text`
  font-size: ${theme.fonts.sizes.xl}px;
  font-weight: ${theme.fonts.weights.bold};
  color: ${theme.colors.text};
`;

const Content = styled(ScrollView)`
  flex: 1;
  padding: ${theme.spacing.lg}px;
`;

const SectionCard = styled.View`
  background-color: white;
  border-radius: 16px;
  padding: ${theme.spacing.lg}px;
  border-width: 1px;
  border-color: #e8e8e8;
  margin-bottom: ${theme.spacing.lg}px;
  gap: ${theme.spacing.md}px;
`;

const SectionHeader = styled.View`
  gap: ${theme.spacing.xs}px;
`;

const SectionTitle = styled.Text`
  font-size: 18px;
  font-weight: 700;
  color: ${theme.colors.text};
`;

const SectionSubtitle = styled.Text`
  font-size: 13px;
  color: ${theme.colors.textSecondary};
`;

const HomeRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: ${theme.spacing.md}px;
`;

const HomeInfo = styled.View`
  flex: 1;
`;

const HomeName = styled.Text`
  font-size: 16px;
  font-weight: 600;
  color: ${theme.colors.text};
`;

const HomeAddress = styled.Text`
  font-size: 13px;
  color: ${theme.colors.textSecondary};
  line-height: 20px;
`;

const PrimaryButton = styled(TouchableOpacity)`
  padding: 10px 16px;
  border-radius: 12px;
  background-color: ${theme.colors.primary};
`;

const PrimaryButtonText = styled.Text`
  color: white;
  font-weight: 600;
`;

const ChipList = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm}px;
`;

const FavoriteChip = styled.View`
  padding: 10px 14px;
  border-radius: 14px;
  background-color: #f4f6fb;
  flex-direction: row;
  align-items: center;
  gap: ${theme.spacing.xs}px;
`;

const ChipText = styled.Text`
  font-size: 13px;
  color: ${theme.colors.text};
`;

const ChipButton = styled(TouchableOpacity)`
  padding: 6px 8px;
  border-radius: 10px;
  background-color: #e0e5ff;
`;

type FavoritePlace = NonNullable<ReturnType<typeof useOnboardingStore>['places']['favoritePlaces']>[number];

const ICON_OPTIONS = ['🏢', '☕', '🏋️', '🎓', '💼', '❤️', '🛒', '🥗'];

export default function PlaceSettingsScreen() {
  const navigation = useNavigation();
  const places = useOnboardingStore((state) => state.places);
  const actions = useOnboardingStore((state) => state.actions);

  const homeInfo =
    typeof places.homeAddress === 'object' && places.homeAddress !== null
      ? places.homeAddress
      : places.homeAddress
      ? { name: '집', icon: '🏠', address: String(places.homeAddress) }
      : null;

  const [homeModalVisible, setHomeModalVisible] = useState(false);
  const [favoriteModalVisible, setFavoriteModalVisible] = useState(false);
  const [editingFavorite, setEditingFavorite] = useState<FavoritePlace | null>(null);
  const [favoriteIndex, setFavoriteIndex] = useState<number | null>(null);

  const [favoriteName, setFavoriteName] = useState('');
  const [favoriteIcon, setFavoriteIcon] = useState(ICON_OPTIONS[0]);
  const [favoriteAddress, setFavoriteAddress] = useState<{ fullAddress: string; x?: string; y?: string } | null>(null);

  useEffect(() => {
    if (favoriteModalVisible) {
      setFavoriteName(editingFavorite?.name ?? '');
      setFavoriteIcon(editingFavorite?.icon ?? ICON_OPTIONS[0]);
      setFavoriteAddress(
        editingFavorite?.address
          ? {
              fullAddress: editingFavorite.address,
              x: editingFavorite.x,
              y: editingFavorite.y,
            }
          : null
      );
    }
  }, [favoriteModalVisible, editingFavorite]);

  const handleHomeConfirm = useCallback(
    (_label: string, fullAddress?: string, x?: string, y?: string) => {
      if (!fullAddress) {
        setHomeModalVisible(false);
        return;
      }
      actions.updateHomeAddress({
        name: homeInfo?.name || '집',
        icon: '🏠',
        address: fullAddress,
        x,
        y,
      });
      setHomeModalVisible(false);
    },
    [actions, homeInfo]
  );

  const handleFavoriteSave = () => {
    if (!favoriteName.trim() || !favoriteAddress) {
      return;
    }
    const nextPlace: FavoritePlace = {
      name: favoriteName.trim(),
      icon: favoriteIcon,
      address: favoriteAddress.fullAddress,
      x: favoriteAddress.x,
      y: favoriteAddress.y,
    };
    const nextFavorites = [...(places.favoritePlaces || [])];
    if (favoriteIndex !== null && favoriteIndex >= 0) {
      nextFavorites[favoriteIndex] = nextPlace;
    } else {
      nextFavorites.push(nextPlace);
    }
    actions.updateFavoritePlaces(nextFavorites);
    setFavoriteModalVisible(false);
    setEditingFavorite(null);
    setFavoriteIndex(null);
  };

  const handleFavoriteDelete = (index: number) => {
    Alert.alert('삭제', '해당 즐겨찾기를 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          const nextFavorites = (places.favoritePlaces || []).filter((_, idx) => idx !== index);
          actions.updateFavoritePlaces(nextFavorites);
        },
      },
    ]);
  };

  return (
    <Container>
      <Header>
        <BackButton onPress={() => navigation.goBack()}>
          <BackText>뒤로</BackText>
        </BackButton>
        <HeaderTitle>장소 설정</HeaderTitle>
        <BackButton />
      </Header>

      <Content showsVerticalScrollIndicator={false}>
        <SectionCard>
          <SectionHeader>
            <SectionTitle>집 주소</SectionTitle>
            <SectionSubtitle>출발/도착 카드의 기준이 되는 장소입니다.</SectionSubtitle>
          </SectionHeader>

          <HomeRow>
            <HomeInfo>
              <HomeName>{homeInfo?.name || '집'}</HomeName>
              <HomeAddress>{homeInfo?.address || '아직 등록되지 않았어요.'}</HomeAddress>
            </HomeInfo>
            <PrimaryButton onPress={() => setHomeModalVisible(true)}>
              <PrimaryButtonText>주소 변경</PrimaryButtonText>
            </PrimaryButton>
          </HomeRow>
        </SectionCard>

        <SectionCard>
          <SectionHeader>
            <SectionTitle>즐겨찾는 장소</SectionTitle>
            <SectionSubtitle>회사, 카페, 운동 등 자주 가는 곳을 추가하세요.</SectionSubtitle>
          </SectionHeader>

          <ChipList>
            {(places.favoritePlaces || []).map((place, index) => (
              <FavoriteChip key={`${place.name}-${index}`}>
                <ChipText>{place.icon} {place.name}</ChipText>
                <ChipButton
                  onPress={() => {
                    setEditingFavorite(place);
                    setFavoriteIndex(index);
                    setFavoriteModalVisible(true);
                  }}
                >
                  <ChipText>편집</ChipText>
                </ChipButton>
                <ChipButton onPress={() => handleFavoriteDelete(index)}>
                  <ChipText>삭제</ChipText>
                </ChipButton>
              </FavoriteChip>
            ))}
          </ChipList>

          <PrimaryButton
            onPress={() => {
              setEditingFavorite(null);
              setFavoriteIndex(null);
              setFavoriteModalVisible(true);
            }}
          >
            <PrimaryButtonText>+ 장소 추가</PrimaryButtonText>
          </PrimaryButton>
        </SectionCard>
      </Content>

      <PlaceDetailModal
        visible={homeModalVisible}
        placeName={homeInfo?.name || '집'}
        placeIcon="🏠"
        onConfirm={handleHomeConfirm}
        onCancel={() => setHomeModalVisible(false)}
      />

      {favoriteModalVisible && (
        <FavoritePlaceModal
          visible={favoriteModalVisible}
          onClose={() => setFavoriteModalVisible(false)}
          name={favoriteName}
          icon={favoriteIcon}
          address={favoriteAddress}
          onNameChange={setFavoriteName}
          onIconChange={setFavoriteIcon}
          onAddressChange={setFavoriteAddress}
          onSave={handleFavoriteSave}
        />
      )}
    </Container>
  );
}

interface FavoritePlaceModalProps {
  visible: boolean;
  name: string;
  icon: string;
  address: { fullAddress: string; x?: string; y?: string } | null;
  onNameChange: (text: string) => void;
  onIconChange: (icon: string) => void;
  onAddressChange: (addr: { fullAddress: string; x?: string; y?: string } | null) => void;
  onSave: () => void;
  onClose: () => void;
}

const ModalOverlay = styled.View`
  flex: 1;
  background-color: rgba(0, 0, 0, 0.5);
  justify-content: flex-end;
`;

const ModalSheet = styled.View`
  background-color: white;
  border-top-left-radius: 24px;
  border-top-right-radius: 24px;
  padding: ${theme.spacing.lg}px;
  gap: ${theme.spacing.md}px;
`;

const ModalHeader = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const ModalTitle = styled.Text`
  font-size: 18px;
  font-weight: 700;
  color: ${theme.colors.text};
`;

const CloseButton = styled(TouchableOpacity)`
  padding: ${theme.spacing.xs}px;
`;

const CloseText = styled.Text`
  font-size: 20px;
  color: ${theme.colors.textSecondary};
`;

const InputLabel = styled.Text`
  font-size: 13px;
  font-weight: 600;
  color: ${theme.colors.textSecondary};
`;

const TextField = styled.TextInput`
  height: 48px;
  border-radius: 12px;
  border-width: 1px;
  border-color: #e0e0e0;
  padding: 0 ${theme.spacing.md}px;
  font-size: 15px;
  color: ${theme.colors.text};
`;

const IconGrid = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm}px;
`;

const IconOption = styled(TouchableOpacity)<{ selected: boolean }>`
  width: 48px;
  height: 48px;
  border-radius: 24px;
  justify-content: center;
  align-items: center;
  border-width: 1px;
  border-color: ${(props) => (props.selected ? theme.colors.primary : '#e0e0e0')};
  background-color: ${(props) => (props.selected ? '#edf0ff' : '#fff')};
`;

const IconOptionText = styled.Text`
  font-size: 20px;
`;

const SelectedAddressBadge = styled.View`
  padding: ${theme.spacing.sm}px;
  border-radius: 12px;
  background-color: #eaf7ff;
`;

const SelectedAddressText = styled.Text`
  font-size: 13px;
  color: ${theme.colors.text};
`;

const ModalActions = styled.View`
  flex-direction: row;
  gap: ${theme.spacing.sm}px;
`;

const FavoritePlaceModal: React.FC<FavoritePlaceModalProps> = ({
  visible,
  name,
  icon,
  address,
  onNameChange,
  onIconChange,
  onAddressChange,
  onSave,
  onClose,
}) => {
  if (!visible) return null;

  return (
    <Modal transparent animationType="slide" visible={visible}>
      <ModalOverlay>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, justifyContent: 'flex-end' }}
        >
          <ModalSheet>
            <ModalHeader>
              <ModalTitle>즐겨찾기 장소</ModalTitle>
              <CloseButton onPress={onClose}>
                <CloseText>×</CloseText>
              </CloseButton>
            </ModalHeader>

            <InputLabel>이름</InputLabel>
            <TextField
              placeholder="예: 회사, 헬스장"
              value={name}
              onChangeText={onNameChange}
            />

            <InputLabel>아이콘</InputLabel>
            <IconGrid>
              {ICON_OPTIONS.map((option) => (
                <IconOption
                  key={option}
                  selected={icon === option}
                  onPress={() => onIconChange(option)}
                >
                  <IconOptionText>{option}</IconOptionText>
                </IconOption>
              ))}
            </IconGrid>

            <InputLabel>주소</InputLabel>
            <AddressSearchInput
              onSelectAddress={(addr) =>
                onAddressChange({
                  fullAddress: addr.fullAddress,
                  x: addr.x,
                  y: addr.y,
                })
              }
            />
            {address && (
              <SelectedAddressBadge>
                <SelectedAddressText>{address.fullAddress}</SelectedAddressText>
              </SelectedAddressBadge>
            )}

            <ModalActions>
              <OnboardingButton label="취소" variant="secondary" onPress={onClose} />
              <OnboardingButton
                label="저장"
                variant="primary"
                onPress={onSave}
                disabled={!name.trim() || !address}
              />
            </ModalActions>
          </ModalSheet>
        </KeyboardAvoidingView>
      </ModalOverlay>
    </Modal>
  );
};

