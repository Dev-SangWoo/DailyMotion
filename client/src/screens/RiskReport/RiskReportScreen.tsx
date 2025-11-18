/**
 * 위험신고 스크린
 * 
 * 사용자가 위험한 상황을 신고할 수 있는 화면입니다.
 */

import React from 'react';
import styled from 'styled-components/native';
import { ScrollView } from 'react-native';
import { AppHeader } from '../../components/common/AppHeader';
import { theme } from '../../styles/theme';

const Container = styled.View`
  flex: 1;
  background-color: ${theme.colors.background};
`;

const Content = styled.View`
  flex: 1;
  padding: ${theme.spacing.md}px;
`;

const Title = styled.Text`
  font-size: ${theme.fonts.sizes.xxl}px;
  font-weight: ${theme.fonts.weights.bold};
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.md}px;
`;

const Description = styled.Text`
  font-size: ${theme.fonts.sizes.md}px;
  color: ${theme.colors.textSecondary};
  line-height: 24px;
`;

export default function RiskReportScreen() {
  return (
    <Container>
      <AppHeader />
      <ScrollView>
        <Content>
          <Title>위험신고</Title>
          <Description>
            위험한 상황을 신고하여 다른 사용자들에게 알려주세요.
          </Description>
        </Content>
      </ScrollView>
    </Container>
  );
}

