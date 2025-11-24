/**
 * 루트 네비게이터
 *
 * 앱의 전체 네비게이션 구조를 정의합니다.
 * - 온보딩 미완료: OnboardingStack 렌더링
 * - 온보딩 완료: MainStack 렌더링 (DailyBriefing, CommuteSettings 등)
 *
 * 헌법 준수:
 * - AGENTS.md [제4장]: React Navigation 사용
 * - CLAUDE.md: 온보딩 통합 가이드
 */

import React, { useEffect, useState, useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as Notifications from 'expo-notifications';

// 스크린 & 네비게이터 import
import OnboardingStack from '../screens/Onboarding/OnboardingScreen';
import MainTabNavigator from './MainTabNavigator';

// Zustand Store
import { useOnboardingStore } from '../screens/Onboarding/stores/useOnboardingStore';
import { useNotificationActionStore } from '../stores/useNotificationActionStore';

const Stack = createStackNavigator();

/**
 * RootNavigator - 온보딩 상태에 따라 스택 전환
 *
 * - isOnboarded = false: OnboardingStack 렌더링
 * - isOnboarded = true: MainStack 렌더링
 */
export default function RootNavigator() {
  const isOnboarded = useOnboardingStore((state) => state.isOnboarded);
  const [isReady, setIsReady] = useState(false);
  const navigationRef = useRef<NavigationContainerRef<any>>(null);
  const setPendingAction = useNotificationActionStore((state) => state.setPendingAction);

  /**
   * 초기화: AsyncStorage에서 온보딩 상태 복원
   * (Zustand persist middleware가 자동으로 처리하므로 약간의 지연 필요)
   */
  useEffect(() => {
    // 상태 복원을 위한 짧은 지연
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  /**
   * 알림 클릭 이벤트 처리
   * 각 시나리오별로 적절한 화면으로 네비게이션 수행
   */
  useEffect(() => {
    if (!isOnboarded) return; // 온보딩 완료 후에만 알림 처리

    // 알림 응답 리스너 (알림 클릭 시)
    const notificationResponseSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        const action = data?.action;

        console.log('[RootNavigator] 알림 클릭:', action, data);

        if (!navigationRef.current) {
          console.warn('[RootNavigator] 네비게이션 레퍼런스가 아직 준비되지 않았습니다.');
          return;
        }

        // 홈 탭으로 이동 (모든 액션은 홈에서 처리)
        navigationRef.current.navigate('MainTabs', {
          screen: 'Home',
        });

        // 액션을 스토어에 저장 (DailyBriefingScreen에서 처리)
        setPendingAction(action);
      }
    );

    // 알림 수신 리스너 (알림이 표시될 때, 선택사항)
    const notificationReceivedSubscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('[RootNavigator] 알림 수신:', notification);
      }
    );

    return () => {
      notificationResponseSubscription.remove();
      notificationReceivedSubscription.remove();
    };
  }, [isOnboarded]);

  // 초기 로딩 중 표시
  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      {/* @ts-ignore - React Navigation typing is overly strict for conditional navigator */}
      <Stack.Navigator
        screenOptions={{
          headerShown: false, // 모든 스택에서 header 숨김 (각 스크린에서 관리)
        }}
      >
        {/* 조건부 렌더링: 온보딩 상태에 따라 스택 전환 */}
        {!isOnboarded ? (
          // 온보딩 미완료: OnboardingStack
          <Stack.Screen
            name="OnboardingStack"
            component={OnboardingStack}
            options={{
              cardStyle: { backgroundColor: '#F0F4FF' },
            }}
          />
        ) : (
          // 온보딩 완료: MainTabNavigator (하단 탭 네비게이션)
          <Stack.Screen
            name="MainTabs"
            component={MainTabNavigator}
            options={{
              cardStyle: { backgroundColor: '#fff' },
            }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

