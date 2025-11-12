/**
 * 일일 브리핑 화면
 * 
 * 사용자의 일일 정보를 제공하는 메인 화면입니다.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function DailyBriefingScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>일일 브리핑</Text>
      {/* TODO: 실제 화면 구현 */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});

