/**
 * 홈 스크린
 * 
 * DailyBriefingScreen을 메인 홈 화면으로 사용합니다.
 * AppHeader를 추가하여 DailyMotion 로고를 표시합니다.
 */

import React from 'react';
import styled from 'styled-components/native';
import DailyBriefingScreen from '../DailyBriefing/DailyBriefingScreen';
import { AppHeader } from '../../components/common/AppHeader';

const Container = styled.View`
  flex: 1;
`;

export default function HomeScreen() {
  return (
    <Container>
      <AppHeader />
      <DailyBriefingScreen />
    </Container>
  );
}

