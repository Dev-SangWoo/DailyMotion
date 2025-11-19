import React, { useState } from 'react';
import styled from 'styled-components/native';
import { ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../styles/theme';
import { useOnboardingStore } from '../Onboarding/stores/useOnboardingStore';
import { TimePickerModal } from '../Onboarding/components/TimePickerModal';

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

const SectionTitle = styled.Text`
  font-size: 18px;
  font-weight: 700;
  color: ${theme.colors.text};
`;

const SectionSubtitle = styled.Text`
  font-size: 13px;
  color: ${theme.colors.textSecondary};
`;

const DayGrid = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm}px;
`;

const DayChip = styled(TouchableOpacity)<{ active: boolean }>`
  padding: 10px 14px;
  border-radius: 12px;
  background-color: ${(props) => (props.active ? theme.colors.primary : '#f5f5f5')};
`;

const DayChipText = styled.Text<{ active: boolean }>`
  font-size: 14px;
  font-weight: 600;
  color: ${(props) => (props.active ? '#fff' : theme.colors.text)};
`;

const Row = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const TimeText = styled.Text`
  font-size: 24px;
  font-weight: 700;
  color: ${theme.colors.text};
`;

const OutlineButton = styled(TouchableOpacity)`
  padding: 8px 16px;
  border-radius: 999px;
  border-width: 1px;
  border-color: #dfe3ff;
`;

const OutlineButtonText = styled.Text`
  font-size: 13px;
  font-weight: 600;
  color: ${theme.colors.primary};
`;

const FirstMileRow = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${theme.spacing.md}px;
`;

const CounterButton = styled(TouchableOpacity)`
  width: 44px;
  height: 44px;
  border-radius: 22px;
  background-color: #edf0ff;
  justify-content: center;
  align-items: center;
`;

const CounterButtonText = styled.Text`
  font-size: 20px;
  font-weight: 700;
  color: ${theme.colors.primary};
`;

const CounterValue = styled.Text`
  font-size: 22px;
  font-weight: 700;
  color: ${theme.colors.text};
`;

const PermissionRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding-vertical: ${theme.spacing.sm}px;
`;

const PermissionText = styled.Text`
  font-size: 15px;
  color: ${theme.colors.text};
`;

const PermissionStatus = styled.Text<{ granted: boolean }>`
  font-size: 13px;
  font-weight: 700;
  color: ${(props) => (props.granted ? '#2e7d32' : '#d84315')};
`;

const DAY_OPTIONS = [
  { key: 'MON', label: '월' },
  { key: 'TUE', label: '화' },
  { key: 'WED', label: '수' },
  { key: 'THU', label: '목' },
  { key: 'FRI', label: '금' },
  { key: 'SAT', label: '토' },
  { key: 'SUN', label: '일' },
];

export default function ScheduleSettingsScreen() {
  const navigation = useNavigation();
  const schedule = useOnboardingStore((state) => state.schedule);
  const goalTime = useOnboardingStore((state) => state.goalTime);
  const permissions = useOnboardingStore((state) => state.permissions);
  const actions = useOnboardingStore((state) => state.actions);

  const [timePickerVisible, setTimePickerVisible] = useState(false);

  const toggleDay = (dayKey: string) => {
    const currentDays = schedule.daysOfWeek || [];
    let nextDays: string[];
    if (currentDays.includes(dayKey)) {
      nextDays = currentDays.filter((day) => day !== dayKey);
    } else {
      nextDays = [...currentDays, dayKey];
    }
    const ordered = DAY_OPTIONS.filter((day) => nextDays.includes(day.key)).map((day) => day.key);
    actions.setSchedule(ordered, true);
  };

  const adjustFirstMile = (delta: number) => {
    actions.updateFirstMileMinutes(goalTime.firstMileMinutes + delta);
  };

  const handleTimeConfirm = (time: string) => {
    actions.updateArrivalTime(time);
    setTimePickerVisible(false);
  };

  return (
    <Container>
      <Header>
        <BackButton onPress={() => navigation.goBack()}>
          <BackText>뒤로</BackText>
        </BackButton>
        <HeaderTitle>스케줄 설정</HeaderTitle>
        <BackButton />
      </Header>

      <Content showsVerticalScrollIndicator={false}>
        <SectionCard>
          <SectionTitle>반복 요일</SectionTitle>
          <SectionSubtitle>이번 주에 사용할 여정 요일을 선택하세요.</SectionSubtitle>
          <DayGrid>
            {DAY_OPTIONS.map((day) => {
              const active = schedule.daysOfWeek?.includes(day.key) ?? false;
              return (
                <DayChip key={day.key} active={active} onPress={() => toggleDay(day.key)}>
                  <DayChipText active={active}>{day.label}</DayChipText>
                </DayChip>
              );
            })}
          </DayGrid>
        </SectionCard>

        <SectionCard>
          <SectionTitle>목표 도착 시간</SectionTitle>
          <SectionSubtitle>알람과 추천 경로 계산에 사용됩니다.</SectionSubtitle>
          <Row>
            <TimeText>{goalTime.arrivalTime}</TimeText>
            <OutlineButton onPress={() => setTimePickerVisible(true)}>
              <OutlineButtonText>시간 변경</OutlineButtonText>
            </OutlineButton>
          </Row>
        </SectionCard>

        <SectionCard>
          <SectionTitle>도보 여유 시간</SectionTitle>
          <SectionSubtitle>집에서 역까지 걷는 시간을 고려해 주세요. (1~15분)</SectionSubtitle>
          <FirstMileRow>
            <CounterButton onPress={() => adjustFirstMile(-1)}>
              <CounterButtonText>-</CounterButtonText>
            </CounterButton>
            <CounterValue>{goalTime.firstMileMinutes}분</CounterValue>
            <CounterButton onPress={() => adjustFirstMile(1)}>
              <CounterButtonText>+</CounterButtonText>
            </CounterButton>
          </FirstMileRow>
        </SectionCard>

        <SectionCard>
          <SectionTitle>권한 상태</SectionTitle>
          <SectionSubtitle>원활한 서비스 사용을 위해 권한을 허용해 주세요.</SectionSubtitle>
          <PermissionRow>
            <PermissionText>푸시 알림</PermissionText>
            <PermissionStatus granted={permissions.notificationGranted}>
              {permissions.notificationGranted ? '허용됨' : '미허용'}
            </PermissionStatus>
          </PermissionRow>
          <PermissionRow>
            <PermissionText>위치 정보</PermissionText>
            <PermissionStatus granted={permissions.locationGranted}>
              {permissions.locationGranted ? '허용됨' : '미허용'}
            </PermissionStatus>
          </PermissionRow>
        </SectionCard>
      </Content>

      {timePickerVisible && (
        <TimePickerModal
          visible
          initialTime={goalTime.arrivalTime}
          onConfirm={handleTimeConfirm}
          onCancel={() => setTimePickerVisible(false)}
        />
      )}
    </Container>
  );
}

