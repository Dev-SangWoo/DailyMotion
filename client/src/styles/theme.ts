/**
 * 스타일 테마 헌법
 * 
 * 데일리모션 앱의 모든 색상, 폰트 크기, 간격 등을 정의하는 '스타일 헌법'입니다.
 * Styled-components에서 이 테마를 사용하여 일관된 디자인을 유지합니다.
 */

export const theme = {
  colors: {
    // Primary 색상
    primary: '#007AFF',
    primaryDark: '#0051D5',
    primaryLight: '#5AC8FA',
    
    // Secondary 색상
    secondary: '#5856D6',
    
    // 상태 색상
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    info: '#5AC8FA',
    
    // 중성 색상
    background: '#FFFFFF',
    backgroundSecondary: '#F2F2F7',
    text: '#000000',
    textSecondary: '#8E8E93',
    border: '#C6C6C8',
    
    // 다크 모드 (추후 확장)
    dark: {
      background: '#000000',
      backgroundSecondary: '#1C1C1E',
      text: '#FFFFFF',
      textSecondary: '#8E8E93',
    },
  },
  
  fonts: {
    // 폰트 크기
    sizes: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 20,
      xxl: 24,
      xxxl: 32,
    },
    
    // 폰트 굵기
    weights: {
      regular: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
    },
  },
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    round: 9999,
  },
  
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 8,
    },
  },
} as const;

export type Theme = typeof theme;

