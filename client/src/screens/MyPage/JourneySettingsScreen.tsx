import React, { useMemo, useState, useCallback } from 'react';
import styled from 'styled-components/native';
import { ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../styles/theme';
import { useOnboardingStore } from '../Onboarding/stores/useOnboardingStore';
import { TimePickerModal } from '../Onboarding/components/TimePickerModal';
import { PlaceDetailModal } from '../Onboarding/components/PlaceDetailModal';

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
`;

const SectionTitle = styled.Text`
  font-size: 18px;
  font-weight: 700;
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.md}px;
`;

const JourneyGroup = styled.View`
  border-width: 1px;
  border-color: #f0f0f0;
  border-radius: 14px;
  margin-bottom: ${theme.spacing.md}px;
`;

const JourneyRow = styled.View`
  flex-direction: row;
`;

const JourneyCard = styled.View`
  flex: 1;
  padding: ${theme.spacing.md}px;
  gap: ${theme.spacing.sm}px;
`;

const Divider = styled.View`
  height: 100%;
  width: 1px;
  background-color: #f5f5f5;
`;

const JourneyLabel = styled.Text<{ color?: string }>`
  font-size: 12px;
  font-weight: 700;
  color: ${(props) => props.color || theme.colors.primary};
  letter-spacing: 0.5px;
`;

const JourneyName = styled.Text`
  font-size: 15px;
  font-weight: 600;
  color: ${theme.colors.text};
`;

const JourneyAddress = styled.Text`
  font-size: 12px;
  color: ${theme.colors.textSecondary};
`;

const JourneyTimeRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const JourneyTime = styled.Text`
  font-size: 22px;
  font-weight: 700;
  color: ${theme.colors.text};
`;

const OutlineButton = styled(TouchableOpacity)`
  padding: 8px 14px;
  border-radius: 999px;
  border-width: 1px;
  border-color: #dfe3ff;
`;

const OutlineButtonText = styled.Text`
  font-size: 12px;
  font-weight: 600;
  color: ${theme.colors.primary};
`;

type JourneySegment = NonNullable<ReturnType<typeof useOnboardingStore>['pathSelection']['journeys']>[number];

export default function JourneySettingsScreen() {
  const navigation = useNavigation();
  const pathSelection = useOnboardingStore((state) => state.pathSelection);
  const actions = useOnboardingStore((state) => state.actions);

  const [timePickerState, setTimePickerState] = useState<{ segmentId: string; time: string } | null>(null);
  const [placeModalState, setPlaceModalState] = useState<{ segmentId: string; placeName: string; placeIcon: string } | null>(null);

  const journeys = pathSelection.journeys || [];

  const journeyGroups = useMemo(() => {
    const groups: { id: string; depart: JourneySegment; arrive: JourneySegment }[] = [];
    for (let i = 0; i < journeys.length; i += 2) {
      const depart = journeys[i];
      const arrive = journeys[i + 1];
      if (depart && arrive) {
        groups.push({
          id: `${depart.id}-${arrive.id}`,
          depart,
          arrive,
        });
      }
    }
    return groups;
  }, [journeys]);

  const updateJourneySegment = useCallback(
    (segmentId: string, patch: Partial<JourneySegment>) => {
      if (!pathSelection.journeys) return;
      const updated = pathSelection.journeys.map((segment) =>
        segment.id === segmentId ? { ...segment, ...patch } : segment
      );
      actions.setJourneys(updated);
    },
    [pathSelection.journeys, actions]
  );

  const handlePlaceConfirm = (_label: string, fullAddress?: string, x?: string, y?: string) => {
    if (!placeModalState || !fullAddress) {
      setPlaceModalState(null);
      return;
    }
    updateJourneySegment(placeModalState.segmentId, {
      placeAddress: fullAddress,
      placeX: x,
      placeY: y,
    });
    setPlaceModalState(null);
  };

  const handleTimeConfirm = (time: string) => {
    if (!timePickerState) return;
    updateJourneySegment(timePickerState.segmentId, { time });
    setTimePickerState(null);
  };

  return (
    <Container>
      <Header>
        <BackButton onPress={() => navigation.goBack()}>
          <BackText>뒤로</BackText>
        </BackButton>
        <HeaderTitle>여정 설정</HeaderTitle>
        <BackButton />
      </Header>

      <Content showsVerticalScrollIndicator={false}>
        <SectionCard>
          <SectionTitle>출발 · 도착 카드</SectionTitle>
          {journeyGroups.length === 0 ? (
            <JourneyAddress>온보딩에서 여정을 추가하면 이곳에서 편집할 수 있어요.</JourneyAddress>
          ) : (
            journeyGroups.map((group) => (
              <JourneyGroup key={group.id}>
                <JourneyRow>
                  <JourneyCard>
                    <JourneyLabel>출발</JourneyLabel>
                    <JourneyName>{group.depart.placeName}</JourneyName>
                    <JourneyAddress>{group.depart.placeAddress || '주소 미입력'}</JourneyAddress>
                    <JourneyTimeRow>
                      <JourneyTime>{group.depart.time}</JourneyTime>
                      <OutlineButton
                        onPress={() => setTimePickerState({ segmentId: group.depart.id, time: group.depart.time })}
                      >
                        <OutlineButtonText>시간 수정</OutlineButtonText>
                      </OutlineButton>
                    </JourneyTimeRow>
                    <OutlineButton
                      onPress={() =>
                        setPlaceModalState({
                          segmentId: group.depart.id,
                          placeName: group.depart.placeName,
                          placeIcon: group.depart.placeIcon,
                        })
                      }
                    >
                      <OutlineButtonText>주소 변경</OutlineButtonText>
                    </OutlineButton>
                  </JourneyCard>
                  <Divider />
                  <JourneyCard>
                    <JourneyLabel color="#ff7043">도착</JourneyLabel>
                    <JourneyName>{group.arrive.placeName}</JourneyName>
                    <JourneyAddress>{group.arrive.placeAddress || '주소 미입력'}</JourneyAddress>
                    <JourneyTimeRow>
                      <JourneyTime>{group.arrive.time}</JourneyTime>
                      <OutlineButton
                        onPress={() => setTimePickerState({ segmentId: group.arrive.id, time: group.arrive.time })}
                      >
                        <OutlineButtonText>시간 수정</OutlineButtonText>
                      </OutlineButton>
                    </JourneyTimeRow>
                    <OutlineButton
                      onPress={() =>
                        setPlaceModalState({
                          segmentId: group.arrive.id,
                          placeName: group.arrive.placeName,
                          placeIcon: group.arrive.placeIcon,
                        })
                      }
                    >
                      <OutlineButtonText>주소 변경</OutlineButtonText>
                    </OutlineButton>
                  </JourneyCard>
                </JourneyRow>
              </JourneyGroup>
            ))
          )}
        </SectionCard>
      </Content>

      {timePickerState ? (
        <TimePickerModal
          visible
          initialTime={timePickerState.time}
          onConfirm={handleTimeConfirm}
          onCancel={() => setTimePickerState(null)}
        />
      ) : null}

      {placeModalState ? (
        <PlaceDetailModal
          visible
          placeName={placeModalState.placeName}
          placeIcon={placeModalState.placeIcon}
          onConfirm={handlePlaceConfirm}
          onCancel={() => setPlaceModalState(null)}
        />
      ) : null}
    </Container>
  );
}

