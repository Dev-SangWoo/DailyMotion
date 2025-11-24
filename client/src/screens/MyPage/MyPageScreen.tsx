/**
 * 마이페이지 스크린
 * 
 * 사용자 정보 및 설정을 관리하는 화면입니다.
 */

import React, { useState } from 'react';
import styled from 'styled-components/native';
import { ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AppHeader } from '../../components/common/AppHeader';
import { theme } from '../../styles/theme';
import { useOnboardingStore } from '../Onboarding/stores/useOnboardingStore';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { MyPageStackParamList } from './MyPageNavigator';
import { sendTestNotification, scheduleNotificationAfter, getScheduledNotifications, sendScenarioNotification } from '../../services/notificationService';

const Container = styled.View`
  flex: 1;
  background-color: ${theme.colors.background};
`;

const ScrollContent = styled(ScrollView)`
  flex: 1;
`;

const Content = styled.View`
  padding: ${theme.spacing.lg}px;
  gap: ${theme.spacing.lg}px;
`;

const PageHeader = styled.View`
  gap: ${theme.spacing.xs}px;
`;

const Title = styled.Text`
  font-size: ${theme.fonts.sizes.xxl}px;
  font-weight: ${theme.fonts.weights.bold};
  color: ${theme.colors.text};
`;

const Description = styled.Text`
  font-size: ${theme.fonts.sizes.md}px;
  color: ${theme.colors.textSecondary};
  line-height: 22px;
`;

const SectionCard = styled.View`
  background-color: white;
  border-radius: 16px;
  padding: ${theme.spacing.lg}px;
  border-width: 1px;
  border-color: #e8e8e8;
  gap: ${theme.spacing.md}px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
  elevation: 2;
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

const SummaryRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const SummaryValue = styled.Text`
  font-size: 15px;
  color: ${theme.colors.text};
  font-weight: 600;
`;

const SummaryDescription = styled.Text`
  font-size: 13px;
  color: ${theme.colors.textSecondary};
`;

const PrimaryButton = styled(TouchableOpacity)`
  margin-top: ${theme.spacing.sm}px;
  padding-vertical: 12px;
  border-radius: 12px;
  background-color: ${theme.colors.primary};
  align-items: center;
`;

const PrimaryButtonText = styled.Text`
  color: white;
  font-size: 14px;
  font-weight: 600;
`;

const SecondaryButton = styled(TouchableOpacity)`
  margin-top: ${theme.spacing.sm}px;
  padding-vertical: 12px;
  border-radius: 12px;
  background-color: #edf0ff;
  align-items: center;
`;

const SecondaryButtonText = styled.Text`
  color: ${theme.colors.primary};
  font-size: 14px;
  font-weight: 600;
`;

export default function MyPageScreen() {
  const navigation = useNavigation<StackNavigationProp<MyPageStackParamList>>();
  const profile = useOnboardingStore((state) => state.profile);
  const places = useOnboardingStore((state) => state.places);
  const pathSelection = useOnboardingStore((state) => state.pathSelection);
  const schedule = useOnboardingStore((state) => state.schedule);
  const goalTime = useOnboardingStore((state) => state.goalTime);
  const permissions = useOnboardingStore((state) => state.permissions);
  const [isTestingNotification, setIsTestingNotification] = useState(false);

  // 테스트 알림 발송
  const handleTestNotification = async () => {
    try {
      setIsTestingNotification(true);
      await sendTestNotification();
      Alert.alert('성공', '테스트 알림이 발송되었습니다!');
    } catch (error: any) {
      Alert.alert('실패', error.message || '알림 발송에 실패했습니다.');
    } finally {
      setIsTestingNotification(false);
    }
  };

  // 5초 후 알림 테스트
  const handleTestScheduledNotification = async () => {
    try {
      setIsTestingNotification(true);
      await scheduleNotificationAfter(
        '스케줄 알림 테스트',
        '5초 후에 발송된 알림입니다.',
        5
      );
      Alert.alert('성공', '5초 후에 알림이 발송됩니다!');
    } catch (error: any) {
      Alert.alert('실패', error.message || '알림 스케줄 등록에 실패했습니다.');
    } finally {
      setIsTestingNotification(false);
    }
  };

  // 예약된 알림 목록 확인
  const handleCheckScheduledNotifications = async () => {
    try {
      const notifications = await getScheduledNotifications();
      Alert.alert(
        '예약된 알림',
        `현재 ${notifications.length}개의 알림이 예약되어 있습니다.`
      );
    } catch (error: any) {
      Alert.alert('실패', error.message || '알림 목록 조회에 실패했습니다.');
    }
  };

  // 시나리오별 알림 테스트
  const handleScenarioNotification = async (scenario: 'departure' | 'newRoute' | 'delay' | 'lateRoute' | 'lateTaxi') => {
    try {
      setIsTestingNotification(true);
      await sendScenarioNotification(scenario);
      Alert.alert('성공', '10초 후 시나리오 알림이 발송됩니다!');
    } catch (error: any) {
      Alert.alert('실패', error.message || '알림 발송에 실패했습니다.');
    } finally {
      setIsTestingNotification(false);
    }
  };

  const homeInfo =
    typeof places.homeAddress === 'object' && places.homeAddress !== null
      ? places.homeAddress
      : places.homeAddress
      ? { name: '집', address: String(places.homeAddress) }
      : null;

  const favoriteCount = places.favoritePlaces?.length ?? 0;
  const journeyCount = (pathSelection.journeys?.length ?? 0) / 2;

  return (
    <Container>
      <AppHeader />
      <ScrollContent showsVerticalScrollIndicator={false}>
        <Content>
          <PageHeader>
            <Title>마이페이지</Title>
            <Description>온보딩에서 입력한 출퇴근 설정을 언제든지 수정할 수 있어요.</Description>
          </PageHeader>

          {/* 프로필 */}
          <SectionCard>
            <SectionHeader>
              <SectionTitle>프로필</SectionTitle>
              <SectionSubtitle>이름과 대표 이모지를 설정해 주세요.</SectionSubtitle>
            </SectionHeader>
            <SummaryRow>
              <SummaryValue>{profile.avatarEmoji} {profile.displayName}</SummaryValue>
            </SummaryRow>
            <PrimaryButton onPress={() => navigation.navigate('ProfileSettings')}>
              <PrimaryButtonText>프로필 설정</PrimaryButtonText>
            </PrimaryButton>
          </SectionCard>

          {/* 장소 */}
          <SectionCard>
            <SectionHeader>
              <SectionTitle>나의 장소</SectionTitle>
              <SectionSubtitle>집과 즐겨찾는 장소를 관리해요.</SectionSubtitle>
            </SectionHeader>
            <SummaryRow>
              <SummaryDescription>
                집: {homeInfo?.address || '미등록'}{'\n'}
                즐겨찾기: {favoriteCount}개
              </SummaryDescription>
            </SummaryRow>
            <PrimaryButton onPress={() => navigation.navigate('PlaceSettings')}>
              <PrimaryButtonText>장소 설정</PrimaryButtonText>
            </PrimaryButton>
          </SectionCard>

          {/* 여정 */}
          <SectionCard>
            <SectionHeader>
              <SectionTitle>반복 여정</SectionTitle>
              <SectionSubtitle>출발·도착 카드와 시간을 조정하세요.</SectionSubtitle>
            </SectionHeader>
            <SummaryValue>{journeyCount > 0 ? `${journeyCount}개 여정` : '여정 없음'}</SummaryValue>
            <PrimaryButton onPress={() => navigation.navigate('JourneySettings')}>
              <PrimaryButtonText>여정 설정</PrimaryButtonText>
            </PrimaryButton>
          </SectionCard>

          {/* 스케줄/시간 */}
          <SectionCard>
            <SectionHeader>
              <SectionTitle>요일 · 도착시간</SectionTitle>
              <SectionSubtitle>필요한 요일과 목표 시간을 바꿔보세요.</SectionSubtitle>
            </SectionHeader>
            <SummaryValue>
              {schedule.daysOfWeek?.map((day) => day.slice(0, 3)).join(', ') || '미설정'}
            </SummaryValue>
            <SummaryDescription>목표 도착: {goalTime.arrivalTime}</SummaryDescription>
            <PrimaryButton onPress={() => navigation.navigate('ScheduleSettings')}>
              <PrimaryButtonText>스케줄 설정</PrimaryButtonText>
            </PrimaryButton>
          </SectionCard>

          {/* 권한 상태 */}
          <SectionCard>
            <SectionHeader>
              <SectionTitle>권한 상태</SectionTitle>
              <SectionSubtitle>필수 권한 허용 여부를 확인하세요.</SectionSubtitle>
            </SectionHeader>
            <SummaryDescription>
              푸시 알림: {permissions.notificationGranted ? '허용' : '미허용'}{'\n'}
              위치 정보: {permissions.locationGranted ? '허용' : '미허용'}
            </SummaryDescription>
            <SecondaryButton onPress={() => navigation.navigate('ScheduleSettings')}>
              <SecondaryButtonText>권한 가이드 보기</SecondaryButtonText>
            </SecondaryButton>
          </SectionCard>

          {/* 알림 테스트 */}
          <SectionCard>
            <SectionHeader>
              <SectionTitle>알림 테스트</SectionTitle>
              <SectionSubtitle>로컬 알림 기능을 테스트해보세요.</SectionSubtitle>
            </SectionHeader>
            <PrimaryButton 
              onPress={handleTestNotification}
              disabled={isTestingNotification}
              style={{ opacity: isTestingNotification ? 0.6 : 1 }}
            >
              <PrimaryButtonText>
                {isTestingNotification ? '발송 중...' : '즉시 알림 테스트'}
              </PrimaryButtonText>
            </PrimaryButton>
            <SecondaryButton 
              onPress={handleTestScheduledNotification}
              disabled={isTestingNotification}
              style={{ opacity: isTestingNotification ? 0.6 : 1 }}
            >
              <SecondaryButtonText>5초 후 알림 테스트</SecondaryButtonText>
            </SecondaryButton>
            <SecondaryButton 
              onPress={handleCheckScheduledNotifications}
              disabled={isTestingNotification}
              style={{ opacity: isTestingNotification ? 0.6 : 1 }}
            >
              <SecondaryButtonText>예약된 알림 확인</SecondaryButtonText>
            </SecondaryButton>
          </SectionCard>

          {/* 시나리오별 알림 테스트 */}
          <SectionCard>
            <SectionHeader>
              <SectionTitle>시나리오별 알림 테스트</SectionTitle>
              <SectionSubtitle>실제 사용 시나리오에 맞는 알림을 테스트해보세요.</SectionSubtitle>
            </SectionHeader>
            <SecondaryButton 
              onPress={() => handleScenarioNotification('departure')}
              disabled={isTestingNotification}
              style={{ opacity: isTestingNotification ? 0.6 : 1, marginBottom: theme.spacing.xs }}
            >
              <SecondaryButtonText>🚶 지금 출발해야 됩니다!</SecondaryButtonText>
            </SecondaryButton>
            <SecondaryButton 
              onPress={() => handleScenarioNotification('newRoute')}
              disabled={isTestingNotification}
              style={{ opacity: isTestingNotification ? 0.6 : 1, marginBottom: theme.spacing.xs }}
            >
              <SecondaryButtonText>✨ 새로운 경로를 찾았습니다!</SecondaryButtonText>
            </SecondaryButton>
            <SecondaryButton 
              onPress={() => handleScenarioNotification('delay')}
              disabled={isTestingNotification}
              style={{ opacity: isTestingNotification ? 0.6 : 1, marginBottom: theme.spacing.xs }}
            >
              <SecondaryButtonText>⚠️ 지연이 감지되었습니다!</SecondaryButtonText>
            </SecondaryButton>
            <SecondaryButton 
              onPress={() => handleScenarioNotification('lateRoute')}
              disabled={isTestingNotification}
              style={{ opacity: isTestingNotification ? 0.6 : 1, marginBottom: theme.spacing.xs }}
            >
              <SecondaryButtonText>🚨 지각 예상 - 경로 변경</SecondaryButtonText>
            </SecondaryButton>
            <SecondaryButton 
              onPress={() => handleScenarioNotification('lateTaxi')}
              disabled={isTestingNotification}
              style={{ opacity: isTestingNotification ? 0.6 : 1 }}
            >
              <SecondaryButtonText>🚕 지각 예상 - 택시 추천</SecondaryButtonText>
            </SecondaryButton>
          </SectionCard>
        </Content>
      </ScrollContent>
    </Container>
  );
}

