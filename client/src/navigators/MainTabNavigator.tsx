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
import { Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import styled from 'styled-components/native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';

// 스크린 & 네비게이터 import
import HomeNavigator from '../screens/Home/HomeNavigator';
import SafetyGuardScreen from '../screens/SafetyGuard/SafetyGuardScreen';
import RiskReportScreen from '../screens/RiskReport/RiskReportScreen';
import NewJourneyScreen from '../screens/NewJourney/NewJourneyScreen';
import MyPageNavigator from '../screens/MyPage/MyPageNavigator';

const Tab = createBottomTabNavigator();

/**
 * 일반 탭 아이콘 래퍼 (활성화 시 파란색 배경)
 */
const TabIconWrapper = styled.View<{ focused: boolean }>`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background-color: ${(props) => props.focused ? '#E3F2FD' : 'transparent'};
  justify-content: center;
  align-items: center;
  margin-bottom: 4px;
`;

/**
 * 탭 아이콘 컴포넌트
 */
const TabIcon: React.FC<{ iconName: string; focused: boolean }> = ({ iconName, focused }) => {
  return (
    <TabIconWrapper focused={focused}>
      <MaterialIcons 
        name={iconName as any} 
        size={24} 
        color={focused ? theme.colors.primary : theme.colors.textSecondary} 
      />
    </TabIconWrapper>
  );
};

/**
 * 중앙 위험제보 원형 아이콘 래퍼 (빨간색-주황색 그라데이션 효과)
 */
const RiskReportIconWrapper = styled.View`
  width: 64px;
  height: 64px;
  border-radius: 32px;
  background-color: #FF6B6B;
  justify-content: center;
  align-items: center;
  margin-bottom: 4px;
  margin-top: -4px;
  shadow-color: #FF6B6B;
  shadow-offset: 0px 4px;
  shadow-opacity: 0.3;
  shadow-radius: 8px;
  elevation: 8;
`;

/**
 * 위험제보 원형 탭 아이콘
 */
const CircularTabIcon: React.FC<{ focused: boolean }> = ({ focused }) => {
  return (
    <RiskReportIconWrapper>
      <MaterialIcons 
        name="camera-alt" 
        size={28} 
        color="white" 
        style={{ marginTop: -5 }}
      />
    </RiskReportIconWrapper>
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
          borderTopWidth: 0,
          borderTopColor: 'transparent',
          paddingTop: theme.spacing.xs,
          paddingBottom: theme.spacing.sm,
          height: 70,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontSize: theme.fonts.sizes.xs,
          fontWeight: theme.fonts.weights.semibold,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeNavigator}
        options={{
          title: '브리핑',
          tabBarIcon: ({ focused }) => <TabIcon iconName="article" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="SafetyGuard"
        component={SafetyGuardScreen}
        options={{
          title: '안전',
          tabBarIcon: ({ focused }) => <TabIcon iconName="security" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="RiskReport"
        component={RiskReportScreen}
        options={{
          title: '위험제보',
          tabBarIcon: ({ focused }) => <CircularTabIcon focused={focused} />,
          tabBarLabelStyle: {
            marginTop: -8, // 원형 버튼 때문에 라벨을 위로 올림
            fontWeight: theme.fonts.weights.semibold,
            color: '#000000', // 검정색으로 고정
          },
        }}
      />
      <Tab.Screen
        name="NewJourney"
        component={NewJourneyScreen}
        options={{
          title: '탐색',
          tabBarIcon: ({ focused }) => <TabIcon iconName="explore" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="MyPage"
        component={MyPageNavigator}
        options={{
          title: '마이',
          tabBarIcon: ({ focused }) => <TabIcon iconName="person" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

