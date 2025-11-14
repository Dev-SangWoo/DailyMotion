/**
 * 데일리모션 앱 메인 컴포넌트
 *
 * 앱의 진입점입니다. 루트 네비게이터를 렌더링합니다.
 *
 * 헌법 준수:
 * - AGENTS.md 프론트엔드 헌법 [제1장] 개발 환경 설정
 * - React Navigation + gesture-handler 필수 설정
 */
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import RootNavigator from './navigators/RootNavigator';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <RootNavigator />
    </GestureHandlerRootView>
  );
}

