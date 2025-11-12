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
import { TextInput } from 'react-native';
import styled from 'styled-components/native';
import { theme } from '../../styles/theme';

// Styled-components: 의미론적 이름 사용 (헌법 제2장 준수)
const Container = styled.View`
  flex: 1;
  padding: ${theme.spacing.md}px;
  background-color: ${theme.colors.background};
`;

const Section = styled.View`
  margin-bottom: ${theme.spacing.lg}px;
`;

const InputLabel = styled.Text`
  font-size: ${theme.fonts.sizes.md}px;
  font-weight: ${theme.fonts.weights.medium};
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.sm}px;
`;

const StyledInput = styled.TextInput`
  border-width: 1px;
  border-color: ${theme.colors.border};
  border-radius: ${theme.borderRadius.md}px;
  padding: ${theme.spacing.md}px;
  font-size: ${theme.fonts.sizes.md}px;
  color: ${theme.colors.text};
  background-color: ${theme.colors.background};
`;

const SaveButton = styled.TouchableOpacity`
  background-color: ${theme.colors.primary};
  border-radius: ${theme.borderRadius.md}px;
  padding: ${theme.spacing.md}px;
  align-items: center;
  margin-top: ${theme.spacing.xl}px;
`;

const SaveButtonText = styled.Text`
  color: ${theme.colors.background};
  font-size: ${theme.fonts.sizes.md}px;
  font-weight: ${theme.fonts.weights.semibold};
`;

const CommuteSettingsScreen: React.FC = () => {
  const [homeAddress, setHomeAddress] = useState('');
  const [workAddress, setWorkAddress] = useState('');
  const [targetArrivalTime, setTargetArrivalTime] = useState('');

  const handleSave = () => {
    // TODO: React Query mutation 호출
  };

  return (
    <Container>
      <Section>
        <InputLabel>집 주소</InputLabel>
        <StyledInput
          placeholder="집 주소를 입력하세요"
          value={homeAddress}
          onChangeText={setHomeAddress}
        />
      </Section>

      <Section>
        <InputLabel>회사 주소</InputLabel>
        <StyledInput
          placeholder="회사 주소를 입력하세요"
          value={workAddress}
          onChangeText={setWorkAddress}
        />
      </Section>

      <Section>
        <InputLabel>목표 도착 시각</InputLabel>
        <StyledInput
          placeholder="HH:MM"
          value={targetArrivalTime}
          onChangeText={setTargetArrivalTime}
        />
      </Section>

      <SaveButton
        onPress={handleSave}
        accessibilityRole="button"
        accessibilityLabel="저장"
      >
        <SaveButtonText>저장</SaveButtonText>
      </SaveButton>
    </Container>
  );
};

export default CommuteSettingsScreen;
