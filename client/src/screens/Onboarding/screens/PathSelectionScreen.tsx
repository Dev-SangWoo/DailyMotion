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
import { searchRoutesForOnboarding } from '../../../services/routeSearchService';  // 🆕 경로 검색 서비스

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
  placeAddress: string;      // 🆕 실제 도로명 주소 (ODSAY API 검색용)
  placeX?: string;           // 🆕 경도 (좌표 기반 검색)
  placeY?: string;           // 🆕 위도 (좌표 기반 검색)
  type: 'depart' | 'arrive'; // 출발 또는 도착
  time: string; // HH:MM 형식
}

/**
 * Styled Components
 */
const OuterContainer = styled.SafeAreaView`
  flex: 1;
  background-color: ${onboardingTheme.colors.ambientNormal};
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

/**
 * WeekdaySection - 요일 선택 섹션
 */
const WeekdaySection = styled.View`
  background-color: ${onboardingTheme.colors.neutral100};
  border-radius: ${onboardingTheme.borderRadius.lg}px;
  padding: ${theme.spacing.md}px;
  margin-bottom: ${theme.spacing.lg}px;
  shadow-color: ${onboardingTheme.shadows.minimal.shadowColor};
  shadow-offset: ${onboardingTheme.shadows.minimal.shadowOffset.width}px ${onboardingTheme.shadows.minimal.shadowOffset.height}px;
  shadow-opacity: ${onboardingTheme.shadows.minimal.shadowOpacity};
  shadow-radius: ${onboardingTheme.shadows.minimal.shadowRadius}px;
  elevation: ${onboardingTheme.shadows.minimal.elevation};
`;

const WeekdayLabel = styled.Text`
  font-size: ${onboardingTheme.typography.labelM.fontSize}px;
  font-weight: ${onboardingTheme.typography.labelM.fontWeight};
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.sm}px;
`;

/**
 * WeekdayContainer - 요일 버튼들의 컨테이너
 */
const WeekdayContainer = styled.View`
  flex-direction: row;
  gap: ${theme.spacing.sm}px;
  margin-bottom: ${theme.spacing.md}px;
  justify-content: space-between;
`;

/**
 * WeekdayButton - 개별 요일 버튼
 */
const WeekdayButton = styled.TouchableOpacity<{ isSelected: boolean; isSaved: boolean }>`
  flex: 1;
  padding: ${theme.spacing.sm}px;
  border-radius: ${onboardingTheme.borderRadius.md}px;
  background-color: ${(props) => {
    if (props.isSaved) return '#E8F5E9'; // 저장됨 - 연한 초록색
    if (props.isSelected) return theme.colors.primary; // 선택됨 - 파란색
    return onboardingTheme.colors.neutral50; // 미선택 - 회색
  }};
  border-width: 2px;
  border-color: ${(props) => {
    if (props.isSaved) return theme.colors.success; // 저장됨 - 초록색
    if (props.isSelected) return theme.colors.primary;
    return 'transparent';
  }};
  align-items: center;
  justify-content: center;
`;

const WeekdayText = styled.Text<{ isSelected: boolean; isSaved: boolean }>`
  font-size: ${onboardingTheme.typography.labelM.fontSize}px;
  font-weight: ${onboardingTheme.typography.labelM.fontWeight};
  color: ${(props) => {
    if (props.isSaved) return theme.colors.success; // 초록색
    if (props.isSelected) return onboardingTheme.colors.neutral100;
    return theme.colors.text; // 기본 텍스트 색
  }};
`;

const SaveCheckmark = styled.Text`
  font-size: ${onboardingTheme.typography.bodyM.fontSize}px;
  color: ${theme.colors.success};
  margin-left: ${theme.spacing.xs}px;
`;

/**
 * DeleteButton - 카드 삭제 버튼 (오른쪽 위)
 */
const DeleteButton = styled.TouchableOpacity`
  position: absolute;
  top: ${theme.spacing.sm}px;
  right: ${theme.spacing.sm}px;
  width: 24px;
  height: 24px;
  border-radius: ${onboardingTheme.borderRadius.round}px;
  background-color: rgba(255, 232, 232, 0.8);
  align-items: center;
  justify-content: center;
  z-index: 10;
`;

const DeleteIcon = styled.Text`
  font-size: ${onboardingTheme.typography.labelM.fontSize}px;
  color: ${theme.colors.error};
  font-weight: ${theme.fonts.weights.bold};
`;

/**
 * SaveButtonContainer - 저장 버튼 컨테이너
 */
const SaveButtonContainer = styled.View`
  gap: ${theme.spacing.sm}px;
  margin-bottom: ${theme.spacing.lg}px;
`;

const SaveButtonText = styled.Text`
  color: ${onboardingTheme.colors.neutral100};
  font-size: ${onboardingTheme.typography.bodyM.fontSize}px;
  font-weight: ${onboardingTheme.typography.bodyM.fontWeight};
`;

/**
 * StatusText - 저장 상태 메시지
 */
const StatusText = styled.Text`
  font-size: ${onboardingTheme.typography.labelM.fontSize}px;
  color: ${theme.colors.success};
  text-align: center;
  font-weight: ${onboardingTheme.typography.labelM.fontWeight};
`;

const SavedDaysText = styled.Text`
  font-size: ${onboardingTheme.typography.labelM.fontSize}px;
  color: ${theme.colors.textSecondary};
  text-align: center;
`;

const JourneyCard = styled.View`
  background-color: ${onboardingTheme.colors.neutral100};
  border-radius: ${onboardingTheme.borderRadius.lg}px;
  padding: ${theme.spacing.md}px;
  shadow-color: ${onboardingTheme.shadows.soft.shadowColor};
  shadow-offset: ${onboardingTheme.shadows.soft.shadowOffset.width}px ${onboardingTheme.shadows.soft.shadowOffset.height}px;
  shadow-opacity: ${onboardingTheme.shadows.soft.shadowOpacity};
  shadow-radius: ${onboardingTheme.shadows.soft.shadowRadius}px;
  elevation: ${onboardingTheme.shadows.soft.elevation};
  position: relative;
`;

const JourneyGroup = styled.View`
  margin-bottom: ${theme.spacing.md}px;
  position: relative;
  border-width: 1px;
  border-color: ${theme.colors.border};
  border-radius: ${onboardingTheme.borderRadius.lg}px;
  padding: ${theme.spacing.xs}px;
  background-color: ${onboardingTheme.colors.glassOpacity70};
`;

const JourneyGroupCards = styled.View`
  gap: ${theme.spacing.xs}px;
`;

const ArrowOverlay = styled.View`
  position: absolute;
  align-self: center;
  top: 50%;
  margin-top: -12px;
  z-index: 10;
  pointer-events: none;
`;

const ArrowIcon = styled.Text`
  font-size: ${onboardingTheme.typography.headlineM.fontSize}px;
  color: ${theme.colors.primary};
  background-color: ${onboardingTheme.colors.ambientNormal};
  padding: ${theme.spacing.xs}px;
  border-radius: ${onboardingTheme.borderRadius.lg}px;
`;

const Divider = styled.View`
  height: 1px;
  background-color: ${theme.colors.border};
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
  font-size: ${onboardingTheme.typography.bodyM.fontSize}px;
  font-weight: ${onboardingTheme.typography.bodyM.fontWeight};
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.xs}px;
`;

const SegmentType = styled.Text`
  font-size: ${onboardingTheme.typography.labelM.fontSize}px;
  font-weight: ${theme.fonts.weights.bold};
  color: ${theme.colors.primary};
  background-color: ${theme.colors.primary}15;
  padding: ${theme.spacing.xs}px ${theme.spacing.sm}px;
  border-radius: ${onboardingTheme.borderRadius.sm}px;
  align-self: flex-start;
`;

const TimeSection = styled.View`
  align-items: flex-end;
`;

const TimeInputContainer = styled.TouchableOpacity`
  background-color: ${theme.colors.background};
  border-radius: ${onboardingTheme.borderRadius.md}px;
  padding: ${theme.spacing.xs}px ${theme.spacing.sm}px;
  min-width: 70px;
  align-items: flex-end;
`;

const TimeDisplay = styled.Text`
  font-size: ${onboardingTheme.typography.headlineM.fontSize}px;
  font-weight: ${onboardingTheme.typography.headlineM.fontWeight};
  color: ${theme.colors.text};
`;

const TimeLabel = styled.Text`
  font-size: ${onboardingTheme.typography.labelM.fontSize}px;
  color: ${theme.colors.textSecondary};
  margin-top: ${theme.spacing.xs}px;
`;

// AddButton은 OnboardingButton으로 대체

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
  background-color: ${onboardingTheme.colors.neutral100};
  border-top-left-radius: ${onboardingTheme.borderRadius.xxl}px;
  border-top-right-radius: ${onboardingTheme.borderRadius.xxl}px;
  padding: ${theme.spacing.xl}px;
  max-height: 70%;
`;

const ModalTitle = styled.Text`
  font-size: ${onboardingTheme.typography.headlineM.fontSize}px;
  font-weight: ${onboardingTheme.typography.headlineM.fontWeight};
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
  border-radius: ${onboardingTheme.borderRadius.lg}px;
  margin-bottom: ${theme.spacing.sm}px;
  background-color: ${theme.colors.background};
`;

const PlaceOptionIcon = styled.Text`
  font-size: ${onboardingTheme.typography.headlineM.fontSize}px;
  margin-right: ${theme.spacing.md}px;
`;

const PlaceOptionName = styled.Text`
  font-size: ${onboardingTheme.typography.bodyM.fontSize}px;
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
      const homeObj = homeAddress as { name?: string; icon?: string; address?: string; x?: string; y?: string };
      console.log('PathSelectionScreen - homeObj:', homeObj);
      if (homeObj.name) {
        return {
          name: homeObj.name,
          icon: homeObj.icon || '🏠',
          address: homeObj.address,  // address 포함
          x: homeObj.x,              // 🆕 경도 포함
          y: homeObj.y,              // 🆕 위도 포함
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
          placeAddress: homeInfo.address || homeInfo.name,
          placeX: homeInfo.x,         // 🆕 경도 추가
          placeY: homeInfo.y,         // 🆕 위도 추가
          type: 'depart',
          time: '07:00', // 기본값
        },
        {
          id: 'home-arrive',
          placeId: 'home',
          placeName: homeInfo.name,
          placeIcon: homeInfo.icon,
          placeAddress: homeInfo.address || homeInfo.name,
          placeX: homeInfo.x,         // 🆕 경도 추가
          placeY: homeInfo.y,         // 🆕 위도 추가
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

  // 요일 선택 관련 state
  const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'];
  // 기본값: 월~금 평일 선택
  const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set([0, 1, 2, 3, 4]));
  const [journeysByDay, setJourneysByDay] = useState<Record<number, JourneySegment[]>>({});
  const [savedDays, setSavedDays] = useState<Set<number>>(new Set());
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

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

  // 요일 선택 핸들러 (토글)
  const handleSelectDay = useCallback((dayIndex: number) => {
    setSelectedDays((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(dayIndex)) {
        newSet.delete(dayIndex); // 이미 선택되면 해제
      } else {
        newSet.add(dayIndex); // 선택되지 않으면 추가
      }
      return newSet;
    });
    // saveStatus 초기화
    setSaveStatus(null);
  }, []);

  // 요일 여정 저장 핸들러 (선택된 모든 요일에 저장)
  const handleSaveJourney = useCallback(() => {
    // 선택된 모든 요일에 현재 여정 저장
    setJourneysByDay((prev) => {
      const updated = { ...prev };
      selectedDays.forEach((dayIndex) => {
        updated[dayIndex] = [...segments];
      });
      return updated;
    });

    // 저장된 요일에 추가
    setSavedDays((prev) => {
      const newSet = new Set(prev);
      selectedDays.forEach((dayIndex) => {
        newSet.add(dayIndex);
      });
      return newSet;
    });

    // 저장 완료 메시지 표시
    const selectedDayNames = Array.from(selectedDays).map(i => WEEKDAYS[i]).join(', ');
    setSaveStatus(`${selectedDayNames} 여정이 저장되었습니다 ✓`);

    // 저장 후 선택된 요일 자동으로 해제
    setSelectedDays(new Set());

    // 2초 후 메시지 사라지기
    setTimeout(() => setSaveStatus(null), 2000);
  }, [selectedDays, segments, WEEKDAYS]);

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
  const handlePlaceSelect = useCallback((place: { name: string; icon: string; address?: string; x?: string; y?: string }) => {
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
      placeAddress: place.address || place.name,
      placeX: place.x,                            // 🆕 경도 추가
      placeY: place.y,                            // 🆕 위도 추가
      type: 'arrive',
      time: arriveTime,
    };

    const departSegment: JourneySegment = {
      id: `${placeId}-depart`,
      placeId,
      placeName: place.name,
      placeIcon: place.icon,
      placeAddress: place.address || place.name,
      placeX: place.x,                            // 🆕 경도 추가
      placeY: place.y,                            // 🆕 위도 추가
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
  const handleNext = useCallback(async () => {
    // 여정 데이터를 스토어에 저장
    actions.setJourneys(segments);

    // 🆕 첫 번째 여정(집 출발 -> 첫 번째 목적지)의 경로를 API로 검색
    try {
      // 첫 번째 여정 찾기: home-depart와 첫 번째 목적지
      const firstDepartIndex = segments.findIndex((seg) => seg.id === 'home-depart');
      const firstArriveIndex = segments.findIndex((seg) => seg.type === 'arrive' && seg.id !== 'home-arrive');

      if (firstDepartIndex >= 0 && firstArriveIndex >= 0) {
        const departSegment = segments[firstDepartIndex];
        const arriveSegment = segments[firstArriveIndex];

        console.log('🔍 [PathSelectionScreen] 경로 검색 시작:', {
          originAddress: departSegment.placeAddress,
          destinationAddress: arriveSegment.placeAddress,
          departureTime: departSegment.time,
        });

        // ODSAY API로 경로 검색 (서비스 함수 사용)
        const routes = await searchRoutesForOnboarding(
          departSegment.placeAddress,
          arriveSegment.placeAddress,
          departSegment.time,
          departSegment.placeY ? parseFloat(departSegment.placeY) : undefined,
          departSegment.placeX ? parseFloat(departSegment.placeX) : undefined,
          arriveSegment.placeY ? parseFloat(arriveSegment.placeY) : undefined,
          arriveSegment.placeX ? parseFloat(arriveSegment.placeX) : undefined,
        );

        // 첫 번째 경로(최적 경로)를 선택하여 저장
        if (routes && routes.length > 0) {
          const selectedRoute = routes[0];
          console.log('🔍 [PathSelectionScreen] 경로 선택됨:', selectedRoute);
          console.log('🔍 [PathSelectionScreen] 경로 ID:', selectedRoute.id);
          console.log('🔍 [PathSelectionScreen] 경로 세그먼트:', selectedRoute.segments);
          console.log('🔍 [PathSelectionScreen] subPath 존재?:', !!selectedRoute.subPath);
          console.log('🔍 [PathSelectionScreen] subPath 길이:', selectedRoute.subPath?.length ?? 0);
          if (selectedRoute.subPath) {
            console.log('🔍 [PathSelectionScreen] subPath 상세:', JSON.stringify(selectedRoute.subPath, null, 2));
          }
          console.log('🔍 [PathSelectionScreen] totalTime:', selectedRoute.totalTime);

          // 경로 정보를 스토어에 저장
          console.log('🔍 [PathSelectionScreen] setSelectedPath 호출 시작...');
          actions.setSelectedPath(selectedRoute);
          console.log('🔍 [PathSelectionScreen] setSelectedPath 호출 완료');
        } else {
          console.warn('⚠️ [PathSelectionScreen] 경로 검색 결과 없음');
        }
      }
    } catch (error) {
      console.error('❌ [PathSelectionScreen] 경로 검색 실패:', error);
      // 에러가 발생해도 진행 (나중에 DailyBriefingScreen에서 다시 조회 가능)
    }

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

          {/* 요일 선택 섹션 */}
          <WeekdaySection>
            <WeekdayLabel>요일 선택</WeekdayLabel>
            <WeekdayContainer>
              {WEEKDAYS.map((day, index) => (
                <WeekdayButton
                  key={index}
                  isSelected={selectedDays.has(index)}
                  isSaved={savedDays.has(index)}
                  onPress={() => handleSelectDay(index)}
                >
                  <WeekdayText isSelected={selectedDays.has(index)} isSaved={savedDays.has(index)}>
                    {day}
                  </WeekdayText>
                  {savedDays.has(index) && <SaveCheckmark>✓</SaveCheckmark>}
                </WeekdayButton>
              ))}
            </WeekdayContainer>

            {/* 저장 버튼과 상태 메시지 */}
            <SaveButtonContainer>
              <OnboardingButton
                label={`${Array.from(selectedDays).map(i => WEEKDAYS[i]).join(', ')} 여정 저장`}
                onPress={handleSaveJourney}
                variant="primary"
              />
              {saveStatus && <StatusText>{saveStatus}</StatusText>}
              {savedDays.size > 0 && (
                <SavedDaysText>
                  저장됨: {Array.from(savedDays).map(i => WEEKDAYS[i]).join(', ')}
                </SavedDaysText>
              )}
            </SaveButtonContainer>
          </WeekdaySection>

          {/* 여정 그룹 리스트 */}
          {journeyGroups.map((group, groupIndex) => (
            <React.Fragment key={`group-${groupIndex}`}>
              <JourneyGroup>
                <JourneyGroupCards>
                  {/* 출발 카드 */}
                  <JourneyCard>
                    {/* 삭제 버튼 (오른쪽 위) - 집이 아닌 경우에만 */}
                    {group.depart.placeId !== 'home' && (
                      <DeleteButton onPress={() => handleDeleteSegment(group.depart.placeId)}>
                        <DeleteIcon>✕</DeleteIcon>
                      </DeleteButton>
                    )}
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
                    {/* 삭제 버튼 (오른쪽 위) - 집이 아닌 경우에만 */}
                    {group.arrive.placeId !== 'home' && (
                      <DeleteButton onPress={() => handleDeleteSegment(group.arrive.placeId)}>
                        <DeleteIcon>✕</DeleteIcon>
                      </DeleteButton>
                    )}
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
                </JourneyGroupCards>

                {/* 화살표 오버레이 (두 카드 사이에 겹치게) */}
                <ArrowOverlay>
                  <ArrowIcon>↓</ArrowIcon>
                </ArrowOverlay>
              </JourneyGroup>

              {/* 그룹 간 구분선 (마지막 그룹이 아닐 때만) */}
              {groupIndex < journeyGroups.length - 1 && <Divider />}
            </React.Fragment>
          ))}

          {/* 장소 추가 버튼 */}
          {availablePlaces.length > 0 && (
            <OnboardingButton
              label="+ 장소 추가"
              onPress={handleAddPlace}
              variant="primary"
              testID="add-place-button"
            />
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
