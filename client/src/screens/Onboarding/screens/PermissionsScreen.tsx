/**
 * 온보딩 스크린 8: 권한 설정 (Permissions)
 *
 * 설계:
 * - Headline-M: "거의 다 됐어요! 비서가 일하려면 '권한'이 필요해요."
 * - Section 1: 🔔 알림 (필수)
 * - Section 2: 📍 위치 (항상 허용)
 * - Primary Button: 권한 허용하고 시작하기
 */

import React, { useState } from 'react';
import { Alert } from 'react-native';
import styled from 'styled-components/native';
import { theme } from '../../../styles/theme';
import { onboardingTheme } from '../styles/onboardingTheme';
import { useOnboardingActions } from '../stores/useOnboardingStore';
import { OnboardingCard } from '../components/OnboardingCard';
import { OnboardingButton } from '../components/OnboardingButton';
import { requestLocationPermission } from '../../../services/locationService';

interface PermissionsScreenProps {
  navigation: {
    navigate: (screen: string) => void;
  };
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
  margin-bottom: ${theme.spacing.lg}px;
`;

/**
 * PermissionCard
 */
const PermissionCard = styled(OnboardingCard)`
  flex-direction: row;
  gap: ${theme.spacing.lg}px;
`;

/**
 * PermissionIcon
 */
const PermissionIcon = styled.Text`
  font-size: 32px;
  min-width: 40px;
`;

/**
 * PermissionContent
 */
const PermissionContent = styled.View`
  flex: 1;
  gap: ${theme.spacing.sm}px;
`;

/**
 * PermissionTitle
 */
const PermissionTitle = styled.Text`
  font-size: ${onboardingTheme.typography.bodyL.fontSize}px;
  font-weight: 600;
  color: ${theme.colors.text};
`;

/**
 * PermissionDescription
 */
const PermissionDescription = styled.Text`
  font-size: ${onboardingTheme.typography.labelM.fontSize}px;
  color: ${theme.colors.textSecondary};
  line-height: 20px;
`;

/**
 * ButtonContainer
 */
const ButtonContainer = styled.View`
  gap: ${theme.spacing.md}px;
  margin-top: ${theme.spacing.lg}px;
`;

/**
 * PermissionsScreen
 */
export const PermissionsScreen: React.FC<PermissionsScreenProps> = ({
  navigation,
}) => {
  const actions = useOnboardingActions();
  const [loading, setLoading] = useState(false);

  const handleRequestPermissions = async () => {
    setLoading(true);

    try {
      // 🆕 GPS 위치 권한 요청 (실제 권한)
      const locationGranted = await requestLocationPermission();

      console.log('[PermissionsScreen] 위치 권한 요청 결과:', locationGranted);

      // 권한 상태 저장
      if (locationGranted) {
        actions.grantLocationPermission();
      }

      // 알림 권한 시뮬레이션 (실제 앱에서는 react-native-notifee 등 사용)
      actions.grantNotificationPermission();

      // 짧은 지연 후 다음 화면으로
      setTimeout(() => {
        actions.completeOnboarding();
        setLoading(false);
        navigation.navigate('Completion');
      }, 500);
    } catch (error) {
      setLoading(false);
      console.error('[PermissionsScreen] 권한 요청 중 오류:', error);

      // 사용자가 권한을 거부한 경우
      Alert.alert(
        '위치 권한 필요',
        '앱이 정상적으로 작동하려면 위치 권한이 필요합니다. 설정에서 위치 접근을 허용해주세요.',
        [
          {
            text: '다시 시도',
            onPress: handleRequestPermissions,
          },
          {
            text: '나중에',
            onPress: () => {
              // 권한 없이 계속 진행
              actions.completeOnboarding();
              navigation.navigate('Completion');
            },
          },
        ]
      );
    }
  };

  return (
    <OuterContainer>
      <ScrollContainer showsVerticalScrollIndicator={false}>
        <ContentContainer>
          {/* 제목 */}
          <HeadlineText>
            거의 다 됐어요!{'\n'}비서가 일하려면 '권한'이 필요해요.
          </HeadlineText>

          {/* 권한 1: 알림 */}
          <PermissionCard variant="default">
            <PermissionIcon>🔔</PermissionIcon>
            <PermissionContent>
              <PermissionTitle>알림 (필수)</PermissionTitle>
              <PermissionDescription>
                앱을 켜지 않아도 '지금 출발!' 알림을 받을 수 있습니다.
              </PermissionDescription>
            </PermissionContent>
          </PermissionCard>

          {/* 권한 2: 위치 */}
          <PermissionCard variant="default">
            <PermissionIcon>📍</PermissionIcon>
            <PermissionContent>
              <PermissionTitle>위치 (항상 허용)</PermissionTitle>
              <PermissionDescription>
                이게 핵심이에요! '항상 허용'이어야만 백그라운드에서 정확한 알림이 가능합니다.
              </PermissionDescription>
            </PermissionContent>
          </PermissionCard>

          {/* 버튼 */}
          <ButtonContainer>
            <OnboardingButton
              label="권한 허용하고 시작하기"
              onPress={handleRequestPermissions}
              variant="primary"
              loading={loading}
              testID="grant-permissions-button"
            />
          </ButtonContainer>
        </ContentContainer>
      </ScrollContainer>
    </OuterContainer>
  );
};

export default PermissionsScreen;
