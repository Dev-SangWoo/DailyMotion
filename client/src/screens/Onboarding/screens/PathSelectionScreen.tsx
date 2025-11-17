/**
 * 온보딩 스크린 5: 경로 선택 (PathSelection)
 *
 * 설계:
 * - Headline-M: "보통 이 경로로 다니시나요?"
 * - 여정 구간별 시간 설정 (집 출발 → 회사 도착 / 회사 출발 → 집 도착)
 * - 각 구간: 출발/도착 쌍으로 표시, 아이콘 + 시간 선택 + 삭제 기능
 * - Primary Button: 다음
 */

import React, { useState, useCallback, useMemo } from 'react';
import { TouchableOpacity, View } from 'react-native';
import styled from 'styled-components/native';
import DatePicker from 'react-native-date-picker';
import { theme } from '../../../styles/theme';
import { onboardingTheme } from '../styles/onboardingTheme';
import { useOnboardingData, useOnboardingActions } from '../stores/useOnboardingStore';
import { OnboardingButton } from '../components/OnboardingButton';

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
  type: 'depart' | 'arrive';
  time: string;
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
  gap: ${theme.spacing.lg}px;
  flex-grow: 1;
`;

/**
 * HeadlineText
 */
const HeadlineText = styled.Text`
  font-size: ${onboardingTheme.typography.headlineM.fontSize}px;
  font-weight: ${onboardingTheme.typography.headlineM.fontWeight};
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.md}px;
`;

/**
 * GuideText
 */
const GuideText = styled.Text`
  font-size: 14px;
  color: ${theme.colors.textSecondary};
  text-align: center;
  margin-top: ${theme.spacing.lg}px;
`;

/**
 * JourneyLegsContainer
 */
const JourneyLegsContainer = styled.View`
  gap: ${theme.spacing.lg}px;
  margin-bottom: ${theme.spacing.lg}px;
`;

/**
 * JourneyLegCard
 */
const JourneyLegCard = styled.View`
  background-color: rgba(255, 255, 255, 0.7);
  border-radius: 16px;
  padding: ${theme.spacing.lg}px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  elevation: 2;
`;

/**
 * JourneyLegCardHeader
 */
const JourneyLegCardHeader = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${theme.spacing.lg}px;
  padding-bottom: ${theme.spacing.lg}px;
  border-bottom-width: 1px;
  border-bottom-color: #E8E8E8;
`;

/**
 * JourneyLegCardTitle
 */
const JourneyLegCardTitle = styled.View`
  flex-direction: row;
  align-items: center;
  flex: 1;
`;

/**
 * JourneyLegCardIcon
 */
const JourneyLegCardIcon = styled.Text`
  font-size: 24px;
  margin-right: ${theme.spacing.md}px;
`;

/**
 * JourneyLegCardName
 */
const JourneyLegCardName = styled.Text`
  font-size: 16px;
  font-weight: 600;
  color: ${theme.colors.text};
`;

/**
 * DeleteButton
 */
const DeleteButton = styled.TouchableOpacity`
  padding: ${theme.spacing.sm}px;
  margin-left: ${theme.spacing.md}px;
`;

/**
 * DeleteIcon
 */
const DeleteIcon = styled.Text`
  font-size: 20px;
  color: #FF6B6B;
  font-weight: 600;
`;

/**
 * JourneyLegRow
 */
const JourneyLegRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: ${theme.spacing.md}px 0;
  gap: ${theme.spacing.md}px;
`;

/**
 * JourneyLegContent
 */
const JourneyLegContent = styled.View`
  flex: 1;
`;

/**
 * JourneyLegLabel
 */
const JourneyLegLabel = styled.Text`
  font-size: 14px;
  color: ${theme.colors.textSecondary};
  font-weight: 500;
`;

/**
 * JourneyTimeButton
 */
const JourneyTimeButton = styled.TouchableOpacity`
  padding: ${theme.spacing.sm}px ${theme.spacing.md}px;
  border-radius: 8px;
  background-color: ${theme.colors.background};
  min-width: 70px;
  align-items: center;
`;

/**
 * JourneyTime
 */
const JourneyTime = styled.Text`
  font-size: 18px;
  font-weight: 600;
  color: ${theme.colors.text};
`;

/**
 * JourneyTimeTip
 */
const JourneyTimeTip = styled.Text`
  font-size: 10px;
  color: ${theme.colors.textSecondary};
  margin-top: 2px;
`;

/**
 * JourneyDivider
 */
const JourneyDivider = styled.View`
  height: 1px;
  background-color: #E8E8E8;
  margin-vertical: ${theme.spacing.md}px;
`;

/**
 * ButtonContainer
 */
const ButtonContainer = styled.View`
  gap: ${theme.spacing.md}px;
  margin-top: ${theme.spacing.lg}px;
`;

/**
 * PathSelectionScreen
 */
export const PathSelectionScreen: React.FC<PathSelectionScreenProps> = ({
  navigation,
}) => {
  const { places } = useOnboardingData();
  const actions = useOnboardingActions();

  const homeInfo = places.homeAddress;
  const favoriteItems = places.favoritePlaces;

  // 여정 세그먼트 상태
  const [segments, setSegments] = useState<JourneySegment[]>(() => {
    const initialSegments: JourneySegment[] = [];

    if (homeInfo) {
      // 집 출발
      initialSegments.push({
        id: 'home-depart',
        placeId: 'home',
        placeName: homeInfo.name,
        placeIcon: homeInfo.icon,
        type: 'depart',
        time: '08:00',
      });

      // 자주 가는 장소들의 도착/출발
      favoriteItems.forEach((place, index) => {
        const departTime = `${8 + Math.floor((index + 1) * 0.5)}:${String((index + 1) * 10 % 60).padStart(2, '0')}`;
        const arrivalTime = `${8 + Math.floor((index + 1) * 0.5 + 0.3)}:${String((index + 1) * 10 % 60).padStart(2, '0')}`;

        // 도착
        initialSegments.push({
          id: `place-${index}-arrive`,
          placeId: `place-${index}`,
          placeName: place.name,
          placeIcon: place.icon,
          type: 'arrive',
          time: arrivalTime,
        });

        // 출발
        initialSegments.push({
          id: `place-${index}-depart`,
          placeId: `place-${index}`,
          placeName: place.name,
          placeIcon: place.icon,
          type: 'depart',
          time: departTime,
        });
      });

      // 집 도착
      const lastDepartTime = initialSegments[initialSegments.length - 1]?.time || '09:00';
      const [h, m] = lastDepartTime.split(':').map(Number);
      const arrivalHours = (h + 1) % 24;
      const arrivalMinutes = m;
      const homeArrivalTime = `${String(arrivalHours).padStart(2, '0')}:${String(arrivalMinutes).padStart(2, '0')}`;

      initialSegments.push({
        id: 'home-arrive',
        placeId: 'home',
        placeName: homeInfo.name,
        placeIcon: homeInfo.icon,
        type: 'arrive',
        time: homeArrivalTime,
      });
    }

    return initialSegments;
  });

  // 필터링된 세그먼트 (집만 제외)
  const displaySegments = useMemo(() => {
    return segments;
  }, [segments]);

  // 여정 쌍으로 그룹화 (출발 → 도착)
  const journeyLegs = useMemo(() => {
    const legs: JourneySegment[][] = [];
    for (let i = 0; i < displaySegments.length - 1; i++) {
      if (
        displaySegments[i].type === 'depart' &&
        displaySegments[i + 1].type === 'arrive'
      ) {
        legs.push([displaySegments[i], displaySegments[i + 1]]);
        i++; // 다음 쌍을 위해 인덱스 증가
      }
    }
    return legs;
  }, [displaySegments]);

  // 시간 선택기 모달 상태
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState(new Date());

  // 시간 선택 핸들러
  const handleTimePress = useCallback((segmentId: string) => {
    setEditingSegmentId(segmentId);
    const segment = segments.find(s => s.id === segmentId);
    if (segment) {
      const [h, m] = segment.time.split(':').map(Number);
      const date = new Date();
      date.setHours(h, m, 0);
      setSelectedTime(date);
      setShowTimePicker(true);
    }
  }, [segments]);

  // 시간 선택 완료 핸들러 (cascade time update)
  const handleTimeConfirm = useCallback((time: string) => {
    if (editingSegmentId) {
      setSegments((prev) => {
        const editingIndex = prev.findIndex(seg => seg.id === editingSegmentId);
        if (editingIndex === -1) return prev;

        // 1단계: 시간 차이 계산
        const originalTime = prev[editingIndex].time;
        const [origHours, origMinutes] = originalTime.split(':').map(Number);
        const [newHours, newMinutes] = time.split(':').map(Number);

        const origTotalMinutes = origHours * 60 + origMinutes;
        const newTotalMinutes = newHours * 60 + newMinutes;
        const timeDifference = newTotalMinutes - origTotalMinutes;

        // 2단계: 뒤의 모든 세그먼트에 적용
        const updated = prev.map((seg, idx) => {
          if (idx === editingIndex) {
            return { ...seg, time };
          } else if (idx > editingIndex) {
            const [h, m] = seg.time.split(':').map(Number);
            const totalMinutes = h * 60 + m;
            const adjustedTotalMinutes = totalMinutes + timeDifference;

            const adjustedHours = Math.floor(adjustedTotalMinutes / 60) % 24;
            const adjustedMinutes = adjustedTotalMinutes % 60;

            const newTime = `${String(adjustedHours).padStart(2, '0')}:${String(adjustedMinutes).padStart(2, '0')}`;
            return { ...seg, time: newTime };
          }
          return seg;
        });

        return updated;
      });
    }
    setShowTimePicker(false);
    setEditingSegmentId(null);
  }, [editingSegmentId]);

  // 삭제 핸들러
  const handleDeletePlace = useCallback((placeId: string) => {
    setSegments((prev) => {
      const filtered = prev.filter((seg) => seg.placeId !== placeId);

      // 집 도착 시간 재계산 (마지막 세그먼트 기준)
      const withoutHomeArrival = filtered.filter((seg) => seg.id !== 'home-arrive');
      if (homeInfo && withoutHomeArrival.length > 0) {
        const lastSegment = withoutHomeArrival[withoutHomeArrival.length - 1];
        if (lastSegment.id !== 'home-depart') {
          const [hours, minutes] = lastSegment.time.split(':').map(Number);
          const arrivalMinutes = minutes + 60;
          const arrivalHours = hours + Math.floor(arrivalMinutes / 60);
          const finalArrivalMinutes = arrivalMinutes % 60;
          const homeArrivalTime = `${String(arrivalHours % 24).padStart(2, '0')}:${String(finalArrivalMinutes).padStart(2, '0')}`;

          return [
            ...withoutHomeArrival,
            {
              id: 'home-arrive',
              placeId: 'home',
              placeName: homeInfo.name,
              placeIcon: homeInfo.icon,
              type: 'arrive',
              time: homeArrivalTime,
            },
          ];
        }
      }

      return filtered;
    });
  }, [homeInfo]);

  const handleNext = () => {
    actions.nextStep();
    navigation.navigate('GoalTime');
  };

  return (
    <OuterContainer>
      <ScrollContainer showsVerticalScrollIndicator={false}>
        <ContentContainer>
          {/* 제목 */}
          <HeadlineText>보통 이 경로로{'\n'}다니시나요?</HeadlineText>

          {/* 여정 카드 */}
          <JourneyLegsContainer>
            {journeyLegs.map((leg, legIndex) => (
              <JourneyLegCard key={`${leg[0].id}-${leg[1].id}`}>
                {/* 카드 헤더: 아이콘 + 장소명 + 삭제 버튼 */}
                <JourneyLegCardHeader>
                  <JourneyLegCardTitle>
                    <JourneyLegCardIcon>{leg[0].placeIcon}</JourneyLegCardIcon>
                    <JourneyLegCardName>{leg[0].placeName}</JourneyLegCardName>
                  </JourneyLegCardTitle>
                  {/* 집이 아니면 삭제 버튼 표시 */}
                  {leg[0].placeId !== 'home' && (
                    <DeleteButton onPress={() => handleDeletePlace(leg[0].placeId)}>
                      <DeleteIcon>✕</DeleteIcon>
                    </DeleteButton>
                  )}
                </JourneyLegCardHeader>

                {/* 출발 */}
                <JourneyLegRow>
                  <JourneyLegContent>
                    <JourneyLegLabel>출발</JourneyLegLabel>
                  </JourneyLegContent>
                  <JourneyTimeButton onPress={() => handleTimePress(leg[0].id)}>
                    <JourneyTime>{leg[0].time}</JourneyTime>
                    <JourneyTimeTip>클릭</JourneyTimeTip>
                  </JourneyTimeButton>
                </JourneyLegRow>

                {/* 구분선 */}
                <JourneyDivider />

                {/* 도착 */}
                <JourneyLegRow>
                  <JourneyLegContent>
                    <JourneyLegLabel>도착</JourneyLegLabel>
                  </JourneyLegContent>
                  <JourneyTimeButton onPress={() => handleTimePress(leg[1].id)}>
                    <JourneyTime>{leg[1].time}</JourneyTime>
                    <JourneyTimeTip>클릭</JourneyTimeTip>
                  </JourneyTimeButton>
                </JourneyLegRow>
              </JourneyLegCard>
            ))}
          </JourneyLegsContainer>

          {/* 가이드 텍스트 */}
          {favoriteItems.length === 0 && (
            <GuideText>
              자주 가는 장소를 추가하여 여정을 구성해보세요
            </GuideText>
          )}

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
      <DatePicker
        modal
        open={showTimePicker}
        date={selectedTime}
        onConfirm={(date) => {
          const hours = date.getHours();
          const minutes = date.getMinutes();
          const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
          handleTimeConfirm(timeString);
        }}
        onCancel={() => {
          setShowTimePicker(false);
          setEditingSegmentId(null);
        }}
        mode="time"
        title="시간 선택"
        confirmText="확인"
        cancelText="취소"
      />
    </OuterContainer>
  );
};

export default PathSelectionScreen;
