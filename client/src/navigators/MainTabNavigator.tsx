/**
 * 메인 탭 네비게이터
 * 
 * 온보딩 완료 후 표시되는 하단 탭 네비게이션입니다.
 * - 홈, 세이프티가드, 위험신고, 새로운 여정, 마이페이지
 * 
 * 헌법 준수:
 * - AGENTS.md [제4장]: React Navigation 사용
 */

import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { theme } from '../styles/theme';

// 스크린 import
import HomeScreen from '../screens/Home/HomeScreen';
import SafetyGuardScreen from '../screens/SafetyGuard/SafetyGuardScreen';
import RiskReportScreen from '../screens/RiskReport/RiskReportScreen';
import NewJourneyScreen from '../screens/NewJourney/NewJourneyScreen';
import MyPageNavigator from '../screens/MyPage/MyPageNavigator';

const Tab = createBottomTabNavigator();

/**
 * 탭 아이콘 컴포넌트 (이모지 기반)
 * 추후 아이콘 라이브러리로 교체 가능
 */
const TabIcon: React.FC<{ emoji: string; focused: boolean }> = ({ emoji, focused }) => {
  return (
    <Text style={{ 
      fontSize: 20,
    }}>
      {emoji}
    </Text>
  );
};

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false, // 헤더는 각 스크린에서 AppHeader로 관리
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          paddingTop: theme.spacing.xs,
          paddingBottom: theme.spacing.xs,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: theme.fonts.sizes.xs,
          fontWeight: theme.fonts.weights.medium,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: '홈',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="SafetyGuard"
        component={SafetyGuardScreen}
        options={{
          title: '세이프티가드',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🛡️" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="RiskReport"
        component={RiskReportScreen}
        options={{
          title: '위험신고',
          tabBarIcon: ({ focused }) => <TabIcon emoji="⚠️" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="NewJourney"
        component={NewJourneyScreen}
        options={{
          title: '새로운 여정',
          tabBarIcon: ({ focused }) => <TabIcon emoji="➕" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="MyPage"
        component={MyPageNavigator}
        options={{
          title: '마이페이지',
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

