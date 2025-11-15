/**
 * 데일리모션 앱 메인 컴포넌트
 *
 * 헌법 준수:
 * - AGENTS.md 프론트엔드 헌법 [제1장] 개발 환경 설정
 * - GestureHandler 래퍼로 앱 감싸기
 * - React Query QueryClientProvider 설정
 */
import React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RootNavigator from "./navigators/RootNavigator";

// React Query 설정
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5분
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <RootNavigator />
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
