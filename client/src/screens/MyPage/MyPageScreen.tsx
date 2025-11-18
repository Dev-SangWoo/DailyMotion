/**
 * 마이페이지 스크린
 * 
 * 사용자 정보 및 설정을 관리하는 화면입니다.
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

export default function MyPageScreen() {
  return (
    <Container>
      <AppHeader />
      <ScrollView>
        <Content>
          <Title>마이페이지</Title>
          <Description>
            사용자 정보 및 앱 설정을 관리할 수 있습니다.
          </Description>
        </Content>
      </ScrollView>
    </Container>
  );
}

