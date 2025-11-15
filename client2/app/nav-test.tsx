import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import styled from 'styled-components/native';

const StyledText = styled.Text`
  font-size: 18px;
  color: #0000FF;
  font-weight: bold;
  margin: 20px;
`;

export default function NavTest() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E8E8E8' }}>
      <StyledText>React Navigation + Styled Components Test</StyledText>
      <Text style={{ fontSize: 16, color: '#000000', marginTop: 10 }}>파란색 텍스트가 보이나요?</Text>
      <TouchableOpacity
        style={{ marginTop: 20, padding: 10, backgroundColor: '#007AFF', borderRadius: 8 }}
      >
        <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>React Navigation 작동 OK!</Text>
      </TouchableOpacity>
    </View>
  );
}
