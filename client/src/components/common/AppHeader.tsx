/**
 * 앱 헤더 컴포넌트
 * 
 * 모든 메인 화면 상단에 표시되는 헤더입니다.
 * - 왼쪽: DailyMotion 로고/텍스트
 * 
 * 헌법 준수:
 * - AGENTS.md [제2장]: Styled-components 사용
 */

import React from 'react';
import styled from 'styled-components/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../styles/theme';

const HeaderContainer = styled(SafeAreaView)`
  background-color: ${theme.colors.background};
  border-bottom-width: 1px;
  border-bottom-color: ${theme.colors.border};
  padding-horizontal: ${theme.spacing.md}px;
  padding-vertical: ${theme.spacing.sm}px;
`;

const HeaderContent = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
`;

const LogoText = styled.Text`
  font-size: ${theme.fonts.sizes.xl}px;
  font-weight: ${theme.fonts.weights.bold};
  color: ${theme.colors.text};
`;

interface AppHeaderProps {
  // 추후 확장 가능 (오른쪽 버튼 등)
}

export const AppHeader: React.FC<AppHeaderProps> = () => {
  return (
    <HeaderContainer edges={['top']}>
      <HeaderContent>
        <LogoText>DailyMotion</LogoText>
      </HeaderContent>
    </HeaderContainer>
  );
};

