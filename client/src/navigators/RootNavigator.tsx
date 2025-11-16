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

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// 스크린 & 네비게이터 import
import CommuteSettingsScreen from '../screens/CommuteSettings/CommuteSettingsScreen';
import DailyBriefingScreen from '../screens/DailyBriefing/DailyBriefingScreen';
import OnboardingStack from '../screens/Onboarding/OnboardingScreen';

// Zustand Store
import { useOnboardingStore } from '../screens/Onboarding/stores/useOnboardingStore';

const Stack = createStackNavigator();

/**
 * MainStackComponent - 온보딩 완료 후의 메인 앱 스택
 * (DailyBriefing, CommuteSettings, 등)
 */
function MainStackComponent() {
  const MainStack = createStackNavigator();

  return (
    // @ts-ignore - React Navigation typing is overly strict for nested navigators
    <MainStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#fff',
        },
        headerTintColor: '#000',
      }}
    >
      <MainStack.Screen
        name="DailyBriefing"
        component={DailyBriefingScreen}
        options={{ title: '일일 브리핑', headerShown: false }}
      />
      <MainStack.Screen
        name="CommuteSettings"
        component={CommuteSettingsScreen}
        options={{ title: '출퇴근 설정' }}
      />
      {/* TODO: 실제 스크린들을 추가 */}
      {/* <MainStack.Screen name="SafetyGuard" component={SafetyGuardScreen} /> */}
    </MainStack.Navigator>
  );
}

/**
 * RootNavigator - 온보딩 상태에 따라 스택 전환
 *
 * - isOnboarded = false: OnboardingStack 렌더링
 * - isOnboarded = true: MainStack 렌더링
 */
export default function RootNavigator() {
  const isOnboarded = useOnboardingStore((state) => state.isOnboarded);
  const [isReady, setIsReady] = useState(false);

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

  // 초기 로딩 중 표시
  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <NavigationContainer>
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
          // 온보딩 완료: MainStack
          <Stack.Screen
            name="MainStack"
            component={MainStackComponent}
            options={{
              cardStyle: { backgroundColor: '#fff' },
            }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

