/**
 * 온보딩 테마 (3D Claymorphism + Glassmorphism)
 *
 * desgin.md v3.2 기반 스타일 시스템
 * 기존 theme.ts를 확장하여 온보딩 특화 스타일 정의
 */

import { theme } from '../../../styles/theme';

/**
 * 온보딩 특화 색상 팔레트
 * 헌법 제2장 준수: 모든 색상은 이 객체에서 정의하고, Styled-components에서 참조
 */
export const onboardingColors = {
  // Primary (신뢰, CTA)
  primary: theme.colors.primary, // #007AFF
  primaryDark: theme.colors.primaryDark, // #0051D5
  primaryLight: theme.colors.primaryLight, // #5AC8FA

  // Ambient (배경 상태)
  ambientNormal: '#F0F4FF', // 정상 상태 (라이트 블루)
  ambientWarning: '#FFFBEA', // 주의 상태 (라이트 주황)
  ambientAlert: '#FFF1F0', // 위기 상태 (라이트 빨강)

  // Neutral (텍스트, 카드)
  neutral900: '#000000', // 텍스트 (검정)
  neutral700: '#3C3C3C', // 부제목
  neutral500: '#8E8E93', // 보조 텍스트
  neutral100: '#FFFFFF', // 카드 배경 (흰색)
  neutral50: '#F9F9F9', // 연한 배경

  // Glassmorphism Tints (투명도)
  glassOpacity70: 'rgba(255, 255, 255, 0.7)', // 70% 투명도
  glassOpacity80: 'rgba(255, 255, 255, 0.8)', // 80% 투명도
};

/**
 * 온보딩 특화 타이포그래피
 */
export const onboardingTypography = {
  displayL: {
    fontSize: 34,
    fontWeight: '700' as const, // Bold
    lineHeight: 41, // 1.2배
    letterSpacing: -0.5,
  },

  headlineM: {
    fontSize: 22,
    fontWeight: '600' as const, // Semi-Bold
    lineHeight: 28, // 1.27배
    letterSpacing: -0.3,
  },

  bodyL: {
    fontSize: 17,
    fontWeight: '500' as const, // Medium
    lineHeight: 22, // 1.29배
    letterSpacing: -0.4,
  },

  bodyM: {
    fontSize: 16,
    fontWeight: '500' as const,
    lineHeight: 20,
    letterSpacing: -0.3,
  },

  labelM: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 18,
    letterSpacing: -0.2,
  },
};

/**
 * 온보딩 특화 그림자 (3D 효과)
 * 부드럽고 입체감 있는 느낌 (Claymorphism)
 */
export const onboardingShadows = {
  // Soft UI 카드 그림자 (부드럽고 확산된)
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },

  // 3D 버튼 그림자 (깊이감, 하단에 명확)
  button3D: {
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },

  // 깊은 그림자 (모달, 우수 요소)
  deep: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },

  // 최소 그림자 (경미한 높이)
  minimal: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
};

/**
 * 온보딩 특화 테두리 반경
 * 부드럽고 친화적인 느낌
 */
export const onboardingBorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  round: 9999, // 완벽한 원형
};

/**
 * 온보딩 특화 애니메이션 토큰
 * Lottie/Rive 또는 Reanimated와 함께 사용
 */
export const onboardingAnimations = {
  // 화면 전환
  slideInRight: {
    duration: 400,
    easing: 'ease-in-out',
  },

  slideUpModal: {
    duration: 300,
    easing: 'ease-out',
  },

  // 컴포넌트 상호작용
  tapScale: {
    duration: 100,
    scale: 0.95,
  },

  buttonPress: {
    duration: 150,
    scale: 0.92,
  },

  // 페이드 효과
  fadeIn: {
    duration: 300,
    opacity: 1,
  },

  fadeOut: {
    duration: 200,
    opacity: 0,
  },

  // 3D 회전 (아이콘)
  rotate3D: {
    duration: 600,
    rotation: 360,
  },

  // 바운스 (강조)
  bounce: {
    duration: 400,
    scale: [1, 1.1, 1],
  },
};

/**
 * 온보딩 특화 간격 (spacing)
 * 기존 theme.spacing 확장
 */
export const onboardingSpacing = {
  ...theme.spacing,
  // 추가 간격 (필요시)
};

/**
 * Glassmorphism 카드 스타일 헬퍼
 * 사용: `${glassmorphicCard}`
 */
export const glassmorphicCard = `
  background-color: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 16px;
`;

/**
 * 3D 버튼 스타일 헬퍼
 * 사용: `${button3DStyle}`
 */
export const button3DStyle = `
  border-radius: 12px;
  shadow-color: #007AFF;
  shadow-offset: 0px 8px;
  shadow-opacity: 0.3;
  shadow-radius: 12px;
  elevation: 6;
`;

/**
 * 통합 온보딩 테마 객체
 */
export const onboardingTheme = {
  colors: onboardingColors,
  typography: onboardingTypography,
  shadows: onboardingShadows,
  borderRadius: onboardingBorderRadius,
  spacing: onboardingSpacing,
  animations: onboardingAnimations,
  helpers: {
    glassmorphicCard,
    button3DStyle,
  },
} as const;

export type OnboardingTheme = typeof onboardingTheme;
