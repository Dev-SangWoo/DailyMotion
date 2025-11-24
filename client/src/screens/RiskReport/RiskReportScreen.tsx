/**
 * 위험신고 스크린
 *
 * 사용자가 위험한 상황을 신고할 수 있는 화면입니다.
 * 기능:
 * - 현재 위치로 고정된 지도 표시
 * - 카메라/갤러리 접근
 * 헌법 준수:
 * - AGENTS.md [제2장]: Styled-components 사용
 * - CLAUDE.md: 모달/바텀시트 UI 패턴
 */

import React, { useState, useMemo } from 'react';
import styled from 'styled-components/native';
import { ScrollView, TouchableOpacity, View, TextInput, Image, Alert, Modal, SafeAreaView, Dimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { theme } from '../../styles/theme';
import { GoogleMapView } from '../../components/maps/GoogleMapView';
import { useOnboardingData } from '../Onboarding/stores/useOnboardingStore';
import { useSafetyGuardStore } from '../../stores/useSafetyGuardStore';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const Container = styled.View`
  flex: 1;
  background-color: transparent;
`;

const ModalOverlay = styled.View`
  flex: 1;
  background-color: rgba(0, 0, 0, 0.5);
  justify-content: flex-end;
`;

const ModalContainer = styled.View`
  height: ${SCREEN_HEIGHT * 0.8}px;
  background-color: ${theme.colors.background};
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
  overflow: hidden;
`;

const ModalHeader = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.lg}px;
  border-bottom-width: 1px;
  border-bottom-color: ${theme.colors.border};
  background-color: white;
`;

const ModalTitle = styled.Text`
  font-size: ${theme.fonts.sizes.lg}px;
  font-weight: 700;
  color: ${theme.colors.text};
`;

const CloseButton = styled.View`
  width: 32px;
  height: 32px;
  border-radius: 16px;
  background-color: #F5F5F5;
  justify-content: center;
  align-items: center;
`;

const CloseButtonText = styled.Text`
  font-size: 18px;
  color: ${theme.colors.text};
  font-weight: 700;
`;

const ScrollContent = styled.ScrollView`
  flex: 1;
`;

const Content = styled.View`
  padding: ${theme.spacing.lg}px;
  gap: ${theme.spacing.lg}px;
  padding-bottom: ${theme.spacing.xl}px;
`;

// 헤더
const Title = styled.Text`
  font-size: ${theme.fonts.sizes.xxl}px;
  font-weight: ${theme.fonts.weights.bold};
  color: ${theme.colors.text};
`;

const Subtitle = styled.Text`
  font-size: ${theme.fonts.sizes.sm}px;
  color: ${theme.colors.textSecondary};
  margin-top: ${theme.spacing.xs}px;
`;

// 섹션
const Section = styled.View`
  gap: ${theme.spacing.md}px;
`;

const SectionTitle = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${theme.spacing.sm}px;
  margin-bottom: ${theme.spacing.sm}px;
`;

const SectionIcon = styled.Text`
  font-size: 20px;
`;

const SectionLabel = styled.Text`
  font-size: ${theme.fonts.sizes.md}px;
  font-weight: 700;
  color: ${theme.colors.text};
`;

const SectionDescription = styled.Text`
  font-size: ${theme.fonts.sizes.xs}px;
  color: ${theme.colors.textSecondary};
`;

// 위치 선택
const LocationCard = styled.View`
  background-color: white;
  border-radius: ${theme.borderRadius.lg}px;
  padding: ${theme.spacing.lg}px;
  border-width: 2px;
  border-color: #E8F0FF;
  gap: ${theme.spacing.md}px;
`;

const MapContainer = styled.View`
  margin-bottom: ${theme.spacing.lg}px;
  border-radius: 12px;
  overflow: hidden;
`;

const MapPlaceholder = styled.View`
  width: 100%;
  height: 100%;
  background-color: #F5F5F5;
  border-radius: ${theme.borderRadius.md}px;
  justify-content: center;
  align-items: center;
`;

const MapPlaceholderText = styled.Text`
  font-size: ${theme.fonts.sizes.sm}px;
  color: ${theme.colors.textSecondary};
`;

const LocationInfo = styled.Text`
  font-size: ${theme.fonts.sizes.sm}px;
  color: ${theme.colors.text};
  font-weight: 500;
`;

// 위험 유형 태그
const RiskTypeGrid = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm}px;
`;

const RiskTypeTag = styled.View<{ selected: boolean }>`
  flex-direction: row;
  align-items: center;
  gap: ${theme.spacing.xs}px;
  padding: ${theme.spacing.sm}px ${theme.spacing.md}px;
  border-radius: ${theme.borderRadius.lg}px;
  background-color: ${(props) =>
    props.selected ? '#FFF3E0' : '#F5F5F5'};
  border-width: 2px;
  border-color: ${(props) =>
    props.selected ? '#FF9800' : '#E0E0E0'};
`;

const RiskTypeEmoji = styled.Text`
  font-size: 20px;
`;

const RiskTypeText = styled.Text<{ selected: boolean }>`
  font-size: ${theme.fonts.sizes.sm}px;
  color: ${(props) =>
    props.selected ? '#E65100' : theme.colors.textSecondary};
  font-weight: ${(props) => (props.selected ? '700' : '500')};
`;

// 증거 자료
const MediaCard = styled.View`
  background-color: white;
  border-radius: ${theme.borderRadius.lg}px;
  border-width: 2px;
  border-color: #E0E0E0;
  border-style: dashed;
  padding: ${theme.spacing.lg}px;
  justify-content: center;
  align-items: center;
  gap: ${theme.spacing.md}px;
  min-height: 150px;
`;

const MediaIcon = styled.Text`
  font-size: 48px;
`;

const MediaText = styled.Text`
  font-size: ${theme.fonts.sizes.sm}px;
  color: ${theme.colors.textSecondary};
  text-align: center;
`;

const MediaPreviewContainer = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: ${theme.spacing.md}px;
`;

const MediaPreviewItem = styled.View`
  position: relative;
  width: 100px;
  height: 100px;
  border-radius: ${theme.borderRadius.md}px;
  overflow: hidden;
  background-color: #F5F5F5;
`;

const MediaPreviewImage = styled.Image`
  width: 100%;
  height: 100%;
`;

const RemoveMediaButton = styled.View`
  position: absolute;
  top: ${theme.spacing.xs}px;
  right: ${theme.spacing.xs}px;
  background-color: #F44336;
  width: 24px;
  height: 24px;
  border-radius: 12px;
  justify-content: center;
  align-items: center;
`;

const RemoveMediaButtonText = styled.Text`
  color: white;
  font-size: 16px;
  font-weight: bold;
`;

// 상세 설명
const DescriptionInput = styled.TextInput`
  background-color: white;
  border-radius: ${theme.borderRadius.md}px;
  padding: ${theme.spacing.md}px;
  font-size: ${theme.fonts.sizes.sm}px;
  color: ${theme.colors.text};
  border-width: 1px;
  border-color: #E0E0E0;
  min-height: 120px;
  text-align-vertical: top;
`;

// 제보하기 버튼
const SubmitButton = styled.View`
  background-color: #FF9800;
  border-radius: ${theme.borderRadius.lg}px;
  padding: ${theme.spacing.md}px;
  justify-content: center;
  align-items: center;
  gap: ${theme.spacing.sm}px;
`;

const SubmitButtonText = styled.Text`
  color: white;
  font-size: ${theme.fonts.sizes.md}px;
  font-weight: 700;
`;

const RISK_TYPES = [
  { id: 'accident', emoji: '⚠️', label: '사고' },
  { id: 'construction', emoji: '🏗️', label: '공사' },
  { id: 'obstacle', emoji: '🚧', label: '장애물' },
  { id: 'flooding', emoji: '💧', label: '침수/파손' },
  { id: 'crowded', emoji: '👥', label: '인파 밀집' },
  { id: 'etc', emoji: '📌', label: '기타' },
];

type MainTabNavigationProp = BottomTabNavigationProp<any, 'RiskReport'>;

export default function RiskReportScreen() {
  const navigation = useNavigation<MainTabNavigationProp>();
  const { places } = useOnboardingData();
  const { actions } = useSafetyGuardStore();

  const [selectedRiskTypes, setSelectedRiskTypes] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(true);

  // 포커스될 때마다 모달 표시
  useFocusEffect(
    React.useCallback(() => {
      setIsModalVisible(true);
    }, [])
  );

  const handleCloseModal = () => {
    setIsModalVisible(false);
    navigation.goBack();
  };

  // 현재 위치 정보
  const currentLocation = useMemo(() => {
    if (typeof places.homeAddress === 'object' && places.homeAddress) {
      return {
        lat: parseFloat(places.homeAddress.y || '37.4979'),
        lng: parseFloat(places.homeAddress.x || '127.0276'),
        address: places.homeAddress.address || '현재 위치',
      };
    }
    return {
      lat: 37.4979,
      lng: 127.0276,
      address: '현재 위치',
    };
  }, [places]);

  const toggleRiskType = (id: string) => {
    setSelectedRiskTypes((prev) =>
      prev.includes(id)
        ? prev.filter((type) => type !== id)
        : [...prev, id]
    );
  };

  // 카메라 권한 요청 및 사진 촬영
  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한 필요', '카메라 접근 권한이 필요합니다.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        setSelectedPhotos((prev) => [...prev, result.assets[0].uri]);
      }
    } catch (error) {
      console.error('카메라 오류:', error);
      Alert.alert('오류', '사진 촬영 중 오류가 발생했습니다.');
    }
  };

  // 갤러리에서 사진 선택
  const handlePickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한 필요', '갤러리 접근 권한이 필요합니다.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultiple: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        const newPhotos = result.assets.map((asset) => asset.uri);
        setSelectedPhotos((prev) => [...prev, ...newPhotos]);
      }
    } catch (error) {
      console.error('갤러리 오류:', error);
      Alert.alert('오류', '갤러리 접근 중 오류가 발생했습니다.');
    }
  };

  // 선택된 사진 삭제
  const handleRemovePhoto = (index: number) => {
    setSelectedPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // 위험 신고 제출
  const handleSubmitReport = async () => {
    // 유효성 검사
    if (selectedRiskTypes.length === 0) {
      Alert.alert('입력 오류', '위험 유형을 최소 1개 이상 선택해주세요.');
      return;
    }

    if (description.trim().length === 0) {
      Alert.alert('입력 오류', '상세 설명을 입력해주세요.');
      return;
    }

    // 1. SafetyGuard store에 제보 데이터 추가 (status: 'pending')
    const reportId = actions.addRiskReport({
      riskTypes: selectedRiskTypes,
      description,
      photos: selectedPhotos,
      location: {
        lat: currentLocation.lat,
        lng: currentLocation.lng,
        address: currentLocation.address,
      },
    });

    // 2. 검증 상태 시작
    actions.setValidating(true, reportId);

    // 3. 모달 닫기
    handleCloseModal();

    // 4. SafetyGuard 탭으로 네비게이션
    navigation.navigate('SafetyGuard');

    // 5. 2초 후 검증 완료 (AI 검증 시뮬레이션)
    setTimeout(() => {
      actions.updateReportStatus(reportId, 'verified', 'high');
      actions.setValidating(false);

      // 6. 폼 초기화
      setSelectedRiskTypes([]);
      setDescription('');
      setSelectedPhotos([]);

      Alert.alert('제보 완료', '위험 요소가 성공적으로 제보되었습니다.');
    }, 2000);
  };

  return (
    <Container>
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseModal}
      >
        <ModalOverlay>
          <ModalContainer>
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
          <ModalHeader>
            <ModalTitle>위험 요소 신고</ModalTitle>
            <TouchableOpacity onPress={handleCloseModal} activeOpacity={0.7}>
              <CloseButton>
                <CloseButtonText>✕</CloseButtonText>
              </CloseButton>
            </TouchableOpacity>
          </ModalHeader>

          <ScrollContent scrollEnabled showsVerticalScrollIndicator={false}>
            <Content>
              {/* 부제목 */}
              <View>
                <Subtitle>시민 참여로 더 안전한 길을 만들어요</Subtitle>
              </View>

              {/* 증거 자료 - 카메라만 */}
              <Section>
                <SectionTitle>
                  <SectionIcon>📸</SectionIcon>
                  <View style={{ flex: 1 }}>
                    <SectionLabel>증거 자료</SectionLabel>
                    <SectionDescription>
                      현장 사진은 신뢰도를 높여줍니다 ({selectedPhotos.length}개)
                    </SectionDescription>
                  </View>
                </SectionTitle>

                {selectedPhotos.length === 0 ? (
                    <TouchableOpacity activeOpacity={0.8} onPress={handleTakePhoto}>
                      <MediaCard>
                        <MediaIcon>📷</MediaIcon>
                        <MediaText>카메라로 촬영</MediaText>
                      </MediaCard>
                    </TouchableOpacity>
                ) : (
                  <View>
                    <MediaPreviewContainer>
                      {selectedPhotos.map((photo, index) => (
                        <MediaPreviewItem key={index}>
                          <MediaPreviewImage source={{ uri: photo }} />
                          <TouchableOpacity
                            onPress={() => handleRemovePhoto(index)}
                            style={{ flex: 1 }}
                          >
                            <RemoveMediaButton>
                              <RemoveMediaButtonText>✕</RemoveMediaButtonText>
                            </RemoveMediaButton>
                          </TouchableOpacity>
                        </MediaPreviewItem>
                      ))}
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={handleTakePhoto}
                        style={{
                          width: 100,
                          height: 100,
                          borderRadius: theme.borderRadius.md,
                          backgroundColor: '#E0E0E0',
                          justifyContent: 'center',
                          alignItems: 'center',
                          borderWidth: 2,
                          borderStyle: 'dashed',
                          borderColor: '#999',
                        }}
                      >
                        <View style={{ alignItems: 'center', gap: 4 }}>
                          <MediaIcon>➕</MediaIcon>
                          <MediaText style={{ fontSize: 11 }}>추가</MediaText>
                        </View>
                      </TouchableOpacity>
                    </MediaPreviewContainer>
                  </View>
                )}
              </Section>

              {/* 상세 설명 */}
              <Section>
                <SectionTitle>
                  <SectionIcon>📝</SectionIcon>
                  <View style={{ flex: 1 }}>
                    <SectionLabel>상세 설명</SectionLabel>
                    <SectionDescription>
                      위험 상황에 대한 자세한 설명을 입력해주세요
                    </SectionDescription>
                  </View>
                </SectionTitle>
                <DescriptionInput
                  placeholder="예: 맨홀 뚜껑 없음, 2차선 공사 중"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                />
              </Section>

              {/* 위험 유형 선택 (중간에 배치) */}
              <Section>
                <SectionTitle>
                  <SectionIcon>⚠️</SectionIcon>
                  <View style={{ flex: 1 }}>
                    <SectionLabel>위험 유형 선택</SectionLabel>
                  </View>
                </SectionTitle>
                <RiskTypeGrid>
                  {RISK_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type.id}
                      onPress={() => toggleRiskType(type.id)}
                      activeOpacity={0.8}
                    >
                      <RiskTypeTag selected={selectedRiskTypes.includes(type.id)}>
                        <RiskTypeEmoji>{type.emoji}</RiskTypeEmoji>
                        <RiskTypeText selected={selectedRiskTypes.includes(type.id)}>
                          {type.label}
                        </RiskTypeText>
                      </RiskTypeTag>
                    </TouchableOpacity>
                  ))}
                </RiskTypeGrid>
              </Section>

              {/* 위치 지정 - 현재 위치 고정 (맨 아래) */}
              <Section>
                <SectionTitle>
                  <SectionIcon>📍</SectionIcon>
                  <View style={{ flex: 1 }}>
                    <SectionLabel>위치 (현재 위치)</SectionLabel>
                  </View>
                </SectionTitle>
                <LocationCard>
                  <MapContainer>
                    <GoogleMapView
                      markers={[
                        {
                          title: currentLocation.address,
                          lat: currentLocation.lat,
                          lng: currentLocation.lng,
                          color: '#FF0000',
                          markerType: 'stop' as const, // 기본 원형 마커 사용
                          zIndex: 100,
                        },
                      ]}
                      centerLat={currentLocation.lat}
                      centerLng={currentLocation.lng}
                      height={200}
                      zoom={15}
                    />
                  </MapContainer>
                  <LocationInfo>📍 {currentLocation.address}</LocationInfo>
                </LocationCard>
              </Section>

              {/* 제보하기 버튼 */}
              <TouchableOpacity activeOpacity={0.8} onPress={handleSubmitReport}>
                <SubmitButton>
                  <SubmitButtonText>🚨 제보하기</SubmitButtonText>
                </SubmitButton>
              </TouchableOpacity>
            </Content>
          </ScrollContent>
        </SafeAreaView>
          </ModalContainer>
        </ModalOverlay>
      </Modal>
    </Container>
  );
}

