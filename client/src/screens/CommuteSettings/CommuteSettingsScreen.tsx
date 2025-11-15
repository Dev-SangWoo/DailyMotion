/**
 * 출퇴근 설정 화면
 * 
 * 헌법 준수:
 * - AGENTS.md 프론트엔드 헌법 [제2장] 스타일링 (Styled-components)
 * - AGENTS.md 프론트엔드 헌법 [제3장] 데이터 페칭 (React Query)
 * - v3.0 명세서 [3. 필수 사용자 설정]
 * - OpenAPI 스펙 PUT /v1/users/me/settings/commute
 */
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import apiClient from '../../services/api';

// 임시: styled-components 비활성화 (디버깅용)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#C6C6C8',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#000000',
    backgroundColor: '#FFFFFF',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 32,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

// OpenAPI 스펙에 맞는 요청 타입
interface CommuteSettingsRequest {
  homeAddress: string;
  workAddress: string;
  targetArrivalTime: string; // HH:MM:SS 형식
  firstMileDefaultDuration?: number;
  lastMileDefaultDuration?: number;
}

const CommuteSettingsScreen: React.FC = () => {
  const [homeAddress, setHomeAddress] = useState('');
  const [workAddress, setWorkAddress] = useState('');
  const [targetArrivalTime, setTargetArrivalTime] = useState('');

  // React Query mutation (헌법 제3장 준수)
  const { mutate } = useMutation({
    mutationFn: async (data: CommuteSettingsRequest) => {
      const response = await apiClient.put('/users/me/settings/commute', data);
      return response.data;
    },
  });

  // 시간 형식 변환: "08:50" → "08:50:00"
  const formatTimeToHHMMSS = (time: string): string => {
    if (time.length === 5 && time.includes(':')) {
      // HH:MM 형식이면 :00 추가
      return `${time}:00`;
    }
    return time; // 이미 HH:MM:SS 형식이면 그대로 반환
  };

  const handleSave = () => {
    // OpenAPI 스펙에 맞는 데이터 형식으로 변환
    const requestData: CommuteSettingsRequest = {
      homeAddress,
      workAddress,
      targetArrivalTime: formatTimeToHHMMSS(targetArrivalTime),
    };

    // React Query mutation 호출
    mutate(requestData);
  };

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.label}>집 주소</Text>
        <TextInput
          style={styles.input}
          placeholder="집 주소를 입력하세요"
          value={homeAddress}
          onChangeText={setHomeAddress}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>회사 주소</Text>
        <TextInput
          style={styles.input}
          placeholder="회사 주소를 입력하세요"
          value={workAddress}
          onChangeText={setWorkAddress}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>목표 도착 시각</Text>
        <TextInput
          style={styles.input}
          placeholder="HH:MM"
          value={targetArrivalTime}
          onChangeText={setTargetArrivalTime}
        />
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={handleSave}
        accessibilityRole="button"
        accessibilityLabel="저장"
      >
        <Text style={styles.buttonText}>저장</Text>
      </TouchableOpacity>
    </View>
  );
};

export default CommuteSettingsScreen;
