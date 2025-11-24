/**
 * 홈 네비게이터
 *
 * Home 탭 내에서 스택 기반 네비게이션을 관리합니다.
 * - HomeScreen: 메인 화면
 * - RealtimeNavigationScreen: 실시간 경로 추적 맵 화면
 * - WeatherDetailModal: 날씨 상세 정보 모달
 * - AlternativeRoutesModal: 대체 경로 추천 모달
 *
 * 헌법 준수:
 * - AGENTS.md [제4장]: React Navigation 사용
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from './HomeScreen';
import RealtimeNavigationScreen from './RealtimeNavigationScreen';
import WeatherDetailModal from './modals/WeatherDetailModal';
import AlternativeRoutesModal from './modals/AlternativeRoutesModal';

const Stack = createStackNavigator();

export type HomeStackParamList = {
  HomeTab: undefined;
  RealtimeNavigation: {
    originName: string;
    destinationName: string;
    selectedPath: any;
  };
  WeatherDetail: undefined;
  AlternativeRoutes: {
    currentRouteDuration: number;
    currentRouteDistance: number;
  };
};

export default function HomeNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="HomeTab"
        component={HomeScreen}
      />
      <Stack.Screen
        name="RealtimeNavigation"
        component={RealtimeNavigationScreen}
        options={{
          cardStyle: { backgroundColor: 'transparent' },
          cardOverlayEnabled: true,
          animationEnabled: true,
        }}
      />
      <Stack.Group
        screenOptions={{
          presentation: 'modal',
          headerShown: false,
        }}
      >
        <Stack.Screen
          name="WeatherDetail"
          component={WeatherDetailModal}
        />
        <Stack.Screen
          name="AlternativeRoutes"
          component={AlternativeRoutesModal}
        />
      </Stack.Group>
    </Stack.Navigator>
  );
}
