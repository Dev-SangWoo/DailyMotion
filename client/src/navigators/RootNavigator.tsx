/**
 * 루트 네비게이터
 * 
 * 앱의 전체 네비게이션 구조를 정의합니다.
 * React Navigation을 사용하여 화면 간 이동을 관리합니다.
 */
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// 스크린 import
import CommuteSettingsScreen from '../screens/CommuteSettings/CommuteSettingsScreen';
// TODO: 실제 스크린들을 import
// import DailyBriefingScreen from '../screens/DailyBriefing';
// import SafetyGuardScreen from '../screens/SafetyGuard';

const Stack = createStackNavigator();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="CommuteSettings"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#fff',
          },
          headerTintColor: '#000',
        }}
      >
        <Stack.Screen 
          name="CommuteSettings" 
          component={CommuteSettingsScreen}
          options={{ title: '출퇴근 설정' }}
        />
        {/* TODO: 실제 스크린들을 추가 */}
        {/* <Stack.Screen name="DailyBriefing" component={DailyBriefingScreen} /> */}
        {/* <Stack.Screen name="SafetyGuard" component={SafetyGuardScreen} /> */}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

