/**
 * OnboardingScreen - 온보딩 네비게이션 컨트롤러
 *
 * 9개 스크린을 StackNavigator로 관리합니다.
 * - 스크린 1-3: ValueProposalScreen
 * - 스크린 4: JourneySetupScreen
 * - 스크린 5: PathSelectionScreen
 * - 스크린 6: GoalTimeScreen
 * - 스크린 7: ScheduleSetupScreen
 * - 스크린 8: PermissionsScreen
 * - 스크린 9: CompletionScreen
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ValueProposalScreen } from './screens/ValueProposalScreen';
import { JourneySetupScreen } from './screens/JourneySetupScreen';
import { PathSelectionScreen } from './screens/PathSelectionScreen';
import { GoalTimeScreen } from './screens/GoalTimeScreen';
import { ScheduleSetupScreen } from './screens/ScheduleSetupScreen';
import { PermissionsScreen } from './screens/PermissionsScreen';
import { CompletionScreen } from './screens/CompletionScreen';

const Stack = createNativeStackNavigator();

/**
 * OnboardingStack - 온보딩 스택 네비게이터
 *
 * 특징:
 * - Header 없음 (fullScreenGestureEnabled: false)
 * - 뒤로가기 제스처 비활성화 (첫 화면에서)
 */
export const OnboardingStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animationEnabled: true,
        cardStyle: { backgroundColor: '#F0F4FF' },
      }}
      initialRouteName="ValueProposal"
    >
      {/* 스크린 1-3: 가치 제안 */}
      <Stack.Screen
        name="ValueProposal"
        component={ValueProposalScreen}
        options={{
          gestureEnabled: false, // 뒤로가기 제스처 비활성화
        }}
      />

      {/* 스크린 4: 출발지/도착지 설정 */}
      <Stack.Screen
        name="JourneySetup"
        component={JourneySetupScreen}
        options={{
          gestureEnabled: true,
        }}
      />

      {/* 스크린 5: 경로 선택 */}
      <Stack.Screen
        name="PathSelection"
        component={PathSelectionScreen}
        options={{
          gestureEnabled: true,
        }}
      />

      {/* 스크린 6: 도착시간 + First Mile */}
      <Stack.Screen
        name="GoalTime"
        component={GoalTimeScreen}
        options={{
          gestureEnabled: true,
        }}
      />

      {/* 스크린 7: 스케줄 설정 */}
      <Stack.Screen
        name="ScheduleSetup"
        component={ScheduleSetupScreen}
        options={{
          gestureEnabled: true,
        }}
      />

      {/* 스크린 8: 권한 요청 */}
      <Stack.Screen
        name="Permissions"
        component={PermissionsScreen}
        options={{
          gestureEnabled: false,
        }}
      />

      {/* 스크린 9: 완료 */}
      <Stack.Screen
        name="Completion"
        component={CompletionScreen}
        options={{
          gestureEnabled: false,
        }}
      />
    </Stack.Navigator>
  );
};

export default OnboardingStack;
