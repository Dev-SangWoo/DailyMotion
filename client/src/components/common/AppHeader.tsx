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
  padding-top: ${theme.spacing.sm}px;
  padding-bottom: ${theme.spacing.md}px;
`;

const HeaderContent = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  width: 100%;
`;

const HeaderLeft = styled.View`
  flex: 1;
  flex-direction: column;
  gap: 2px;
`;

const HeaderTopRow = styled.View`
  flex-direction: row;
  align-items: baseline;
  gap: 4px;
`;

const LogoText = styled.Text`
  font-size: ${theme.fonts.sizes.xl}px;
  font-weight: ${theme.fonts.weights.bold};
  color: ${theme.colors.text};
`;

const LogoSubText = styled.Text`
  font-size: ${theme.fonts.sizes.xs || 10}px;
  font-weight: ${theme.fonts.weights.medium || 500};
  color: ${theme.colors.textSecondary || '#666'};
`;

const HeaderTitle = styled.Text`
  font-size: ${theme.fonts.sizes.xxl}px;
  font-weight: ${theme.fonts.weights.bold};
  color: ${theme.colors.text};
  margin-top: ${theme.spacing.xs}px;
`;

const HeaderDescription = styled.Text`
  font-size: ${theme.fonts.sizes.sm}px;
  color: ${theme.colors.textSecondary};
  line-height: 18px;
  margin-top: ${theme.spacing.xs}px;
`;

const HeaderRight = styled.View`
  flex-direction: row;
  align-items: center;
`;

interface AppHeaderProps {
  rightComponent?: React.ReactNode;
  title?: string;
  description?: string;
  subtitle?: string; // 로고 옆 작은 글씨 (예: "세이프티 가드")
}

export const AppHeader: React.FC<AppHeaderProps> = ({ rightComponent, title, description, subtitle }) => {
  return (
    <HeaderContainer edges={['top']}>
      <HeaderContent>
        <HeaderLeft>
          <HeaderTopRow>
        <LogoText>DailyMotion</LogoText>
            <LogoSubText>{subtitle || '데일리모션'}</LogoSubText>
          </HeaderTopRow>
          {title && <HeaderTitle>{title}</HeaderTitle>}
          {description && <HeaderDescription>{description}</HeaderDescription>}
        </HeaderLeft>
        {rightComponent && <HeaderRight>{rightComponent}</HeaderRight>}
      </HeaderContent>
    </HeaderContainer>
  );
};

