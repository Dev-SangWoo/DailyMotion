/**
 * 온보딩 스크린 5: 경로 선택 (PathSelection) - 카드 스택 형식
 *
 * 기능:
 * - 집에서 시작하는 여정 카드 스택
 * - 각 카드는 출발/도착 시간 설정
 * - + 버튼으로 장소 추가
 * - 위에서 아래로 흐르는 카드 리스트
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { TouchableOpacity, ScrollView, Modal } from 'react-native';
import styled from 'styled-components/native';
import { theme } from '../../../styles/theme';
import { onboardingTheme } from '../styles/onboardingTheme';
import { useOnboardingActions, useOnboardingData } from '../stores/useOnboardingStore';
import { OnboardingButton } from '../components/OnboardingButton';
import { TimePickerModal } from '../components/TimePickerModal';

interface PathSelectionScreenProps {
  navigation: {
    navigate: (screen: string) => void;
  };
}

interface JourneySegment {
  id: string;
  placeId: string;
  placeName: string;
  placeIcon: string;
  type: 'depart' | 'arrive'; // 출발 또는 도착
  time: string; // HH:MM 형식
}

/**
 * Styled Components
 */
const OuterContainer = styled.SafeAreaView`
  flex: 1;
  background-color: #F0F4FF;
`;

const ScrollContainer = styled.ScrollView`
  flex: 1;
`;

const ContentContainer = styled.View`
  padding: ${theme.spacing.lg}px;
  gap: ${theme.spacing.md}px;
  flex-grow: 1;
`;

const HeadlineText = styled.Text`
  font-size: ${onboardingTheme.typography.headlineM.fontSize}px;
  font-weight: ${onboardingTheme.typography.headlineM.fontWeight};
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.xl}px;
  text-align: center;
`;

const JourneyCard = styled.View`
  background-color: white;
  border-radius: 12px;
  padding: ${theme.spacing.md}px;
  shadow-color: #000;
  shadow-offset: 0px 1px;
  shadow-opacity: 0.08;
  shadow-radius: 2px;
  elevation: 2;
`;

const JourneyGroup = styled.View`
  margin-bottom: ${theme.spacing.md}px;
`;

const Divider = styled.View`
  height: 1px;
  background-color: rgba(0, 0, 0, 0.1);
  margin-vertical: ${theme.spacing.md}px;
  margin-horizontal: ${theme.spacing.lg}px;
`;

const CardHeader = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${theme.spacing.sm}px;
`;

const LeftSection = styled.View`
  flex-direction: row;
  align-items: center;
  flex: 1;
`;

const PlaceIcon = styled.Text`
  font-size: 28px;
  margin-right: ${theme.spacing.sm}px;
`;

const PlaceInfo = styled.View`
  flex: 1;
`;

const PlaceName = styled.Text`
  font-size: 15px;
  font-weight: 600;
  color: ${theme.colors.text};
  margin-bottom: 2px;
`;

const SegmentType = styled.Text`
  font-size: 12px;
  font-weight: 700;
  color: ${theme.colors.primary};
  background-color: ${theme.colors.primary}15;
  padding: 2px 6px;
  border-radius: 4px;
  align-self: flex-start;
`;

const TimeSection = styled.View`
  align-items: flex-end;
`;

const TimeInputContainer = styled.TouchableOpacity`
  background-color: ${theme.colors.background};
  border-radius: 8px;
  padding: ${theme.spacing.xs}px ${theme.spacing.sm}px;
  min-width: 70px;
  align-items: flex-end;
`;

const TimeDisplay = styled.Text`
  font-size: 20px;
  font-weight: 600;
  color: ${theme.colors.text};
`;

const TimeLabel = styled.Text`
  font-size: 10px;
  color: ${theme.colors.textSecondary};
  margin-top: 2px;
`;

const AddButton = styled.TouchableOpacity`
  background-color: ${theme.colors.primary};
  border-radius: 12px;
  padding: ${theme.spacing.md}px;
  align-items: center;
  justify-content: center;
  margin-top: ${theme.spacing.md}px;
  margin-bottom: ${theme.spacing.md}px;
`;

const AddButtonText = styled.Text`
  color: white;
  font-size: 16px;
  font-weight: 600;
`;

const ButtonContainer = styled.View`
  gap: ${theme.spacing.md}px;
  margin-top: ${theme.spacing.xl}px;
`;

/**
 * 장소 선택 모달
 */
const ModalOverlay = styled.View`
  flex: 1;
  background-color: rgba(0, 0, 0, 0.5);
  justify-content: flex-end;
`;

const ModalContent = styled.View`
  background-color: white;
  border-top-left-radius: 24px;
  border-top-right-radius: 24px;
  padding: ${theme.spacing.xl}px;
  max-height: 70%;
`;

const ModalTitle = styled.Text`
  font-size: 20px;
  font-weight: 600;
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.lg}px;
`;

const PlaceList = styled.ScrollView`
  max-height: 400px;
`;

const PlaceOption = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  padding: ${theme.spacing.md}px;
  border-radius: 12px;
  margin-bottom: ${theme.spacing.sm}px;
  background-color: ${theme.colors.background};
`;

const PlaceOptionIcon = styled.Text`
  font-size: 28px;
  margin-right: ${theme.spacing.md}px;
`;

const PlaceOptionName = styled.Text`
  font-size: 16px;
  color: ${theme.colors.text};
  flex: 1;
`;

/**
 * PathSelectionScreen
 */
export const PathSelectionScreen: React.FC<PathSelectionScreenProps> = ({
  navigation,
}) => {
  const { places } = useOnboardingData();
  const actions = useOnboardingActions();

  // 집 정보 가져오기
  const homeInfo = useMemo(() => {
    const homeAddress = places.homeAddress;
    console.log('PathSelectionScreen - homeAddress from store:', homeAddress);
    console.log('PathSelectionScreen - homeAddress type:', typeof homeAddress);
    
    if (homeAddress && typeof homeAddress === 'object' && homeAddress !== null) {
      const homeObj = homeAddress as { name?: string; icon?: string; address?: string };
      console.log('PathSelectionScreen - homeObj:', homeObj);
      if (homeObj.name) {
        return {
          name: homeObj.name,
          icon: homeObj.icon || '🏠',
        };
      }
    }
    console.log('PathSelectionScreen - homeInfo is null');
    return null;
  }, [places.homeAddress]);

  // 여정 세그먼트 리스트 (집 출발 + 추가된 장소들 + 집 도착)
  const [segments, setSegments] = useState<JourneySegment[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // 집 정보가 있으면 집 출발과 집 도착 세그먼트 초기화
  useEffect(() => {
    console.log('PathSelectionScreen - useEffect - homeInfo:', homeInfo);
    console.log('PathSelectionScreen - useEffect - isInitialized:', isInitialized);
    
    if (homeInfo && !isInitialized) {
      console.log('PathSelectionScreen - Initializing segments with home info');
      setSegments([
        {
          id: 'home-depart',
          placeId: 'home',
          placeName: homeInfo.name,
          placeIcon: homeInfo.icon,
          type: 'depart',
          time: '07:00', // 기본값
        },
        {
          id: 'home-arrive',
          placeId: 'home',
          placeName: homeInfo.name,
          placeIcon: homeInfo.icon,
          type: 'arrive',
          time: '22:00', // 기본값
        },
      ]);
      setIsInitialized(true);
    }
  }, [homeInfo, isInitialized]);

  const [showPlaceModal, setShowPlaceModal] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);

  // 사용 가능한 장소 목록 (집 제외, 이미 추가된 장소 제외)
  const availablePlaces = useMemo(() => {
    const homeAddress = places.homeAddress;
    const homeId = typeof homeAddress === 'object' ? 'home' : null;
    
    const usedPlaceIds = new Set(segments.map((s) => s.placeId));
    
    return places.favoritePlaces.filter((place) => {
      const placeId = place.name.toLowerCase().replace(/\s+/g, '-');
      return !usedPlaceIds.has(placeId);
    });
  }, [places.favoritePlaces, segments]);

  // 시간 선택 모달 열기
  const handleTimePress = useCallback((segmentId: string) => {
    setEditingSegmentId(segmentId);
    setShowTimePicker(true);
  }, []);

  // 시간 선택 확인 (간단한 로직)
  // - 뒷카드 >= 앞카드 → 변경 없음
  // - 뒷카드 < 앞카드 → 자동으로 앞카드 + 30분으로 조정
  const handleTimeConfirm = useCallback((time: string) => {
    if (editingSegmentId) {
      setSegments((prev) => {
        const editingIndex = prev.findIndex((seg) => seg.id === editingSegmentId);
        if (editingIndex === -1) return prev;

        // 1단계: 편집 중인 세그먼트를 새 시간으로 업데이트
        const updated = [...prev];
        updated[editingIndex] = { ...updated[editingIndex], time };

        // 2단계: 뒤의 모든 세그먼트를 순차적으로 확인하고 필요하면 조정
        for (let i = editingIndex + 1; i < updated.length; i++) {
          const prevSegment = updated[i - 1]; // 이전(앞) 세그먼트
          const currSegment = updated[i]; // 현재(뒤) 세그먼트

          const [prevHours, prevMinutes] = prevSegment.time.split(':').map(Number);
          const [currHours, currMinutes] = currSegment.time.split(':').map(Number);

          const prevTotalMinutes = prevHours * 60 + prevMinutes;
          const currTotalMinutes = currHours * 60 + currMinutes;

          // 뒤의 시간이 앞의 시간보다 빠르면, 앞 시간 + 30분으로 조정
          if (currTotalMinutes < prevTotalMinutes) {
            const newTotalMinutes = prevTotalMinutes + 30;
            const newHours = Math.floor(newTotalMinutes / 60) % 24;
            const newMins = newTotalMinutes % 60;
            const newTime = `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
            updated[i] = { ...updated[i], time: newTime };
          }
          // 앞의 시간보다 느리거나 같으면 변경 없음
        }

        return updated;
      });
    }
    setShowTimePicker(false);
    setEditingSegmentId(null);
  }, [editingSegmentId]);

  // 장소 추가 버튼 클릭
  const handleAddPlace = useCallback(() => {
    if (availablePlaces.length === 0) {
      // 사용 가능한 장소가 없으면 경고 (추후 Toast로 변경 가능)
      return;
    }
    setShowPlaceModal(true);
  }, [availablePlaces.length]);

  // 실제 렌더링할 세그먼트
  // (집 도착 시간은 사용자가 명시적으로 변경할 때만 업데이트, 자동 변경 없음)
  const displaySegments = useMemo(() => {
    return segments;
  }, [segments]);

  // 장소 선택 확인
  const handlePlaceSelect = useCallback((place: { name: string; icon: string; address?: string }) => {
    const placeId = place.name.toLowerCase().replace(/\s+/g, '-');
    
    // 집 도착 세그먼트를 제외한 마지막 세그먼트 찾기
    const segmentsWithoutHomeArrival = segments.filter((seg) => seg.id !== 'home-arrive');
    const lastSegment = segmentsWithoutHomeArrival[segmentsWithoutHomeArrival.length - 1];
    
    // 마지막 세그먼트의 시간을 기준으로 도착 시간 계산 (기본 +30분)
    const lastTime = lastSegment ? lastSegment.time : '07:00';
    const [lastHours, lastMinutes] = lastTime.split(':').map(Number);
    const arriveMinutes = lastMinutes + 30;
    const arriveHours = lastHours + Math.floor(arriveMinutes / 60);
    const finalArriveMinutes = arriveMinutes % 60;
    const arriveTime = `${String(arriveHours % 24).padStart(2, '0')}:${String(finalArriveMinutes).padStart(2, '0')}`;
    
    // 출발 시간은 도착 시간 + 1시간
    const departMinutes = finalArriveMinutes + 60;
    const departHours = arriveHours + Math.floor(departMinutes / 60);
    const finalDepartMinutes = departMinutes % 60;
    const departTime = `${String(departHours % 24).padStart(2, '0')}:${String(finalDepartMinutes).padStart(2, '0')}`;

    // 도착 세그먼트와 출발 세그먼트 추가
    const arriveSegment: JourneySegment = {
      id: `${placeId}-arrive`,
      placeId,
      placeName: place.name,
      placeIcon: place.icon,
      type: 'arrive',
      time: arriveTime,
    };

    const departSegment: JourneySegment = {
      id: `${placeId}-depart`,
      placeId,
      placeName: place.name,
      placeIcon: place.icon,
      type: 'depart',
      time: departTime,
    };

    setSegments((prev) => {
      // 기존 집 도착 시간 저장 (유지하기 위함)
      const homeArrivalSegment = prev.find((seg) => seg.id === 'home-arrive');

      // 집 도착을 제외한 세그먼트들에 새 장소 추가
      const withoutHomeArrival = prev.filter((seg) => seg.id !== 'home-arrive');
      const withNewPlace = [...withoutHomeArrival, arriveSegment, departSegment];

      // 집 도착 시간 유지 (기존 시간으로 복원)
      if (homeArrivalSegment) {
        return [...withNewPlace, homeArrivalSegment];
      }

      return withNewPlace;
    });
    setShowPlaceModal(false);
  }, [segments, homeInfo]);

  // 세그먼트 삭제 (도착 + 출발 쌍으로 삭제)
  const handleDeleteSegment = useCallback((placeId: string) => {
    setSegments((prev) => prev.filter((seg) => seg.placeId !== placeId));
  }, []);

  // 다음 버튼
  const handleNext = useCallback(() => {
    // 여정 데이터를 스토어에 저장 (추후 백엔드 연동 시 사용)
    // actions.setJourneys(segments);
    actions.nextStep();
    navigation.navigate('GoalTime');
  }, [actions, navigation, segments]);

  // 현재 편집 중인 세그먼트의 시간
  const editingTime = useMemo(() => {
    if (!editingSegmentId) return '09:00';
    const segment = displaySegments.find((s) => s.id === editingSegmentId);
    return segment?.time || '09:00';
  }, [editingSegmentId, displaySegments]);

  // 세그먼트를 여정 그룹으로 묶기 (출발 -> 도착)
  const journeyGroups = useMemo(() => {
    const groups: Array<{ depart: JourneySegment; arrive: JourneySegment }> = [];
    
    for (let i = 0; i < displaySegments.length; i += 2) {
      const depart = displaySegments[i];
      const arrive = displaySegments[i + 1];
      
      if (depart && arrive && depart.type === 'depart' && arrive.type === 'arrive') {
        groups.push({ depart, arrive });
      }
    }
    
    return groups;
  }, [displaySegments]);

  return (
    <OuterContainer>
      <ScrollContainer showsVerticalScrollIndicator={false}>
        <ContentContainer>
          <HeadlineText>보통 이 경로로{'\n'}다니시나요?</HeadlineText>

          {/* 여정 그룹 리스트 */}
          {journeyGroups.map((group, groupIndex) => (
            <React.Fragment key={`group-${groupIndex}`}>
              <JourneyGroup>
                {/* 출발 카드 */}
                <JourneyCard>
                  <CardHeader>
                    <LeftSection>
                      <PlaceIcon>{group.depart.placeIcon}</PlaceIcon>
                      <PlaceInfo>
                        <PlaceName>{group.depart.placeName}</PlaceName>
                        <SegmentType>출발</SegmentType>
                      </PlaceInfo>
                    </LeftSection>
                    <TimeSection>
                      <TimeInputContainer onPress={() => handleTimePress(group.depart.id)}>
                        <TimeDisplay>{group.depart.time}</TimeDisplay>
                        <TimeLabel>클릭하여 수정</TimeLabel>
                      </TimeInputContainer>
                    </TimeSection>
                  </CardHeader>
                </JourneyCard>

                {/* 도착 카드 */}
                <JourneyCard>
                  <CardHeader>
                    <LeftSection>
                      <PlaceIcon>{group.arrive.placeIcon}</PlaceIcon>
                      <PlaceInfo>
                        <PlaceName>{group.arrive.placeName}</PlaceName>
                        <SegmentType>도착</SegmentType>
                      </PlaceInfo>
                    </LeftSection>
                    <TimeSection>
                      <TimeInputContainer onPress={() => handleTimePress(group.arrive.id)}>
                        <TimeDisplay>{group.arrive.time}</TimeDisplay>
                        <TimeLabel>클릭하여 수정</TimeLabel>
                      </TimeInputContainer>
                    </TimeSection>
                  </CardHeader>
                </JourneyCard>
              </JourneyGroup>

              {/* 그룹 간 구분선 (마지막 그룹이 아닐 때만) */}
              {groupIndex < journeyGroups.length - 1 && <Divider />}
            </React.Fragment>
          ))}

          {/* 장소 추가 버튼 */}
          {availablePlaces.length > 0 && (
            <AddButton onPress={handleAddPlace}>
              <AddButtonText>+ 장소 추가</AddButtonText>
            </AddButton>
          )}

          {/* 안내 메시지 */}
          {displaySegments.length === 0 && homeInfo && (
            <PlaceName style={{ textAlign: 'center', color: theme.colors.textSecondary }}>
              장소를 추가하여 여정을 구성해주세요
            </PlaceName>
          )}

          {/* 다음 버튼 */}
          <ButtonContainer>
            <OnboardingButton
              label="다음"
              onPress={handleNext}
              variant="primary"
              disabled={displaySegments.length === 0}
            />
          </ButtonContainer>
        </ContentContainer>
      </ScrollContainer>

      {/* 장소 선택 모달 */}
      <Modal
        visible={showPlaceModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPlaceModal(false)}
      >
        <ModalOverlay>
          <ModalContent>
            <ModalTitle>장소 선택</ModalTitle>
            <PlaceList>
              {availablePlaces.map((place) => (
                <PlaceOption
                  key={place.name}
                  onPress={() => handlePlaceSelect(place)}
                >
                  <PlaceOptionIcon>{place.icon}</PlaceOptionIcon>
                  <PlaceOptionName>{place.name}</PlaceOptionName>
                </PlaceOption>
              ))}
            </PlaceList>
            <OnboardingButton
              label="취소"
              onPress={() => setShowPlaceModal(false)}
              variant="secondary"
            />
          </ModalContent>
        </ModalOverlay>
      </Modal>

      {/* 시간 선택 모달 */}
      <TimePickerModal
        visible={showTimePicker}
        onConfirm={handleTimeConfirm}
        onCancel={() => {
          setShowTimePicker(false);
          setEditingSegmentId(null);
        }}
        initialTime={editingTime}
      />
    </OuterContainer>
  );
};
