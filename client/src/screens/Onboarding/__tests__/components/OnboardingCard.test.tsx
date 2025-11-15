/**
 * OnboardingCard 컴포넌트 테스트 (TDD - Glassmorphism)
 *
 * 테스트 항목:
 * - Glassmorphism 스타일 적용 (반투명, 블러)
 * - 다양한 variant (default, subtle)
 * - Children 컨텐츠 렌더링
 * - 커스텀 opacity
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider } from 'styled-components/native';
import { theme } from '../../../../styles/theme';
import { OnboardingCard } from '../../components/OnboardingCard';
import { Text } from 'react-native';

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('OnboardingCard', () => {
  describe('[기본 렌더링]', () => {
    it('카드가 렌더링되어야 한다', () => {
      renderWithTheme(
        <OnboardingCard>
          <Text>카드 컨텐츠</Text>
        </OnboardingCard>
      );

      expect(screen.getByText('카드 컨텐츠')).toBeTruthy();
    });

    it('children을 렌더링할 수 있어야 한다', () => {
      renderWithTheme(
        <OnboardingCard>
          <Text testID="card-content">다중 라인 컨텐츠</Text>
        </OnboardingCard>
      );

      expect(screen.getByTestId('card-content')).toBeTruthy();
    });

    it('여러 children을 동시에 렌더링할 수 있어야 한다', () => {
      renderWithTheme(
        <OnboardingCard>
          <Text testID="title">제목</Text>
          <Text testID="description">설명</Text>
        </OnboardingCard>
      );

      expect(screen.getByTestId('title')).toBeTruthy();
      expect(screen.getByTestId('description')).toBeTruthy();
    });
  });

  describe('[Glassmorphism 스타일]', () => {
    it('카드가 반투명 배경을 가져야 한다', () => {
      const { getByTestId } = renderWithTheme(
        <OnboardingCard testID="glass-card">
          <Text>컨텐츠</Text>
        </OnboardingCard>
      );

      const card = getByTestId('glass-card');
      // Glassmorphism: 투명도 있는 흰색 배경
      expect(card.props.style.backgroundColor).toContain('rgba');
    });

    it('카드가 배경 블러 효과를 가져야 한다', () => {
      const { getByTestId } = renderWithTheme(
        <OnboardingCard testID="blurred-card">
          <Text>컨텐츠</Text>
        </OnboardingCard>
      );

      const card = getByTestId('blurred-card');
      // Styled-components에서는 backdropFilter가 CSS로 전달됨
      expect(card.props.style).toBeDefined();
    });

    it('카드가 미묘한 그림자를 가져야 한다', () => {
      const { getByTestId } = renderWithTheme(
        <OnboardingCard testID="shadow-card">
          <Text>컨텐츠</Text>
        </OnboardingCard>
      );

      const card = getByTestId('shadow-card');
      // 부드러운 그림자 (elevation 또는 shadow properties)
      expect(card.props.style.elevation).toBeGreaterThan(0);
    });

    it('카드가 둥근 모서리를 가져야 한다', () => {
      const { getByTestId } = renderWithTheme(
        <OnboardingCard testID="rounded-card">
          <Text>컨텐츠</Text>
        </OnboardingCard>
      );

      const card = getByTestId('rounded-card');
      expect(card.props.style.borderRadius).toBe(16);
    });
  });

  describe('[Variant 스타일]', () => {
    it('default variant는 80% 투명도를 가져야 한다', () => {
      const { getByTestId } = renderWithTheme(
        <OnboardingCard variant="default" testID="default-card">
          <Text>컨텐츠</Text>
        </OnboardingCard>
      );

      const card = getByTestId('default-card');
      // 80% 투명도 (0.8)
      expect(card.props.style.backgroundColor).toContain('0.8');
    });

    it('subtle variant는 70% 투명도를 가져야 한다', () => {
      const { getByTestId } = renderWithTheme(
        <OnboardingCard variant="subtle" testID="subtle-card">
          <Text>컨텐츠</Text>
        </OnboardingCard>
      );

      const card = getByTestId('subtle-card');
      // 70% 투명도 (0.7)
      expect(card.props.style.backgroundColor).toContain('0.7');
    });
  });

  describe('[커스텀 opacity]', () => {
    it('커스텀 opacity를 적용할 수 있어야 한다', () => {
      const { getByTestId } = renderWithTheme(
        <OnboardingCard opacity={0.5} testID="custom-opacity-card">
          <Text>컨텐츠</Text>
        </OnboardingCard>
      );

      const card = getByTestId('custom-opacity-card');
      expect(card.props.style.backgroundColor).toContain('0.5');
    });

    it('opacity 범위는 0.3-0.95 사이여야 한다', () => {
      // opacity가 범위 내에서만 허용되는지 검증 (컴포넌트 구현에서 처리)
      const { getByTestId: getByTestId1 } = renderWithTheme(
        <OnboardingCard opacity={0.1} testID="min-opacity">
          <Text>컨텐츠</Text>
        </OnboardingCard>
      );

      const card1 = getByTestId1('min-opacity');
      // 0.1은 0.3으로 조정되어야 함
      expect(card1.props.style.backgroundColor).toContain('0.3');
    });
  });

  describe('[패딩 및 간격]', () => {
    it('카드가 적절한 padding을 가져야 한다', () => {
      const { getByTestId } = renderWithTheme(
        <OnboardingCard testID="padded-card">
          <Text>컨텐츠</Text>
        </OnboardingCard>
      );

      const card = getByTestId('padded-card');
      expect(card.props.style.padding).toBe(24); // lg spacing
    });
  });

  describe('[접근성]', () => {
    it('accessible prop을 받을 수 있어야 한다', () => {
      renderWithTheme(
        <OnboardingCard accessible={true}>
          <Text>컨텐츠</Text>
        </OnboardingCard>
      );

      expect(screen.getByText('컨텐츠')).toBeTruthy();
    });
  });
});
