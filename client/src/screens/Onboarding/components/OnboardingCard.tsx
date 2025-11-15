/**
 * 온보딩 카드 컴포넌트 (Glassmorphism)
 *
 * 헌법 준수:
 * - AGENTS.md [제2장] 스타일링: Styled-components 사용
 * - desgin.md: 3D Soft UI (Claymorphism) 또는 Glassmorphism
 *
 * 특징:
 * - 백그라운드 블러 (12px)
 * - 반투명 배경 (70-80%)
 * - 부드러운 그림자
 */

import React from 'react';
import styled from 'styled-components/native';
import { theme } from '../../../styles/theme';
import { onboardingTheme } from '../styles/onboardingTheme';

interface OnboardingCardProps {
  children: React.ReactNode;
  variant?: 'default' | 'subtle';
  opacity?: number;
  testID?: string;
  accessible?: boolean;
  accessibilityLabel?: string;
}

/**
 * CardBase - Glassmorphism 카드 기본 스타일
 *
 * Glassmorphism 요소:
 * - 반투명 배경 (70-80%)
 * - 배경 블러 (12px)
 * - 미묘한 그림자
 * - 테두리 (선택사항)
 */
const CardBase = styled.View<{ bgOpacity: number }>`
  background-color: rgba(255, 255, 255, ${(props) => props.bgOpacity});
  /* React Native에서는 backdrop-filter가 직접 지원되지 않음 */
  /* Expo: blur 라이브러리 또는 네이티브 구현 필요 */
  border-radius: ${onboardingTheme.borderRadius.lg}px;
  padding: ${theme.spacing.lg}px;

  /* 부드러운 그림자 (Soft UI) */
  shadow-color: #000;
  shadow-offset: 0px 4px;
  shadow-opacity: 0.1;
  shadow-radius: 12px;
  elevation: 3;

  /* 선택적 테두리 (약간의 정의) */
  border-width: 1px;
  border-color: rgba(255, 255, 255, 0.3);
`;

/**
 * OnboardingCard 컴포넌트
 *
 * 사용 예:
 * ```tsx
 * <OnboardingCard variant="default">
 *   <Headline>카드 제목</Headline>
 *   <Body>카드 내용</Body>
 * </OnboardingCard>
 * ```
 */
export const OnboardingCard: React.FC<OnboardingCardProps> = ({
  children,
  variant = 'default',
  opacity,
  testID,
  accessible = true,
  accessibilityLabel,
}) => {
  /**
   * Opacity 계산 로직
   * - opacity prop이 있으면 사용 (0.3-0.95 범위로 클램핑)
   * - 없으면 variant에 따라 결정
   */
  const getOpacity = (): number => {
    if (opacity !== undefined) {
      // 범위 검증: 0.3 ~ 0.95
      return Math.max(0.3, Math.min(0.95, opacity));
    }

    if (variant === 'subtle') {
      return 0.7; // 70% 투명도 (더 투명)
    }

    return 0.8; // 80% 투명도 (기본값)
  };

  const cardOpacity = getOpacity();

  return (
    <CardBase
      bgOpacity={cardOpacity}
      testID={testID}
      accessible={accessible}
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </CardBase>
  );
};

export default OnboardingCard;
