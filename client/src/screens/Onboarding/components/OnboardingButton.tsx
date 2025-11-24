/**
 * 온보딩 버튼 컴포넌트 (3D 스타일)
 *
 * 헌법 준수:
 * - AGENTS.md [제2장] 스타일링: Styled-components 사용
 * - desgin.md: 3D 버튼 스타일 (눌리는 입체감)
 */

import React, { useState } from 'react';
import { TouchableOpacity, ActivityIndicator, View } from 'react-native';
import styled from 'styled-components/native';
import { theme } from '../../../styles/theme';
import { onboardingTheme } from '../styles/onboardingTheme';

interface OnboardingButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
  accessible?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

/**
 * 버튼 기본 스타일
 */
const ButtonBase = styled(TouchableOpacity)<{
  variant: 'primary' | 'secondary';
  disabled: boolean;
}>`
  height: 56px;
  padding: 0 ${theme.spacing.lg}px;
  border-radius: ${onboardingTheme.borderRadius.lg}px;
  justify-content: center;
  align-items: center;
  flex-direction: row;
  background-color: ${(props) => {
    if (props.disabled) {
      return '#D3D3D3'; // 비활성화 상태: 회색
    }
    if (props.variant === 'primary') {
      return theme.colors.primary; // Primary: 파란색 (#007AFF)
    }
    return '#F0F0F0'; // Secondary: 연한 회색
  }};

  /* 3D 그림자 효과 */
  shadow-color: ${(props) =>
    props.disabled ? '#999' : props.variant === 'primary' ? theme.colors.primary : '#000'};
  shadow-offset: 0px 8px;
  shadow-opacity: ${(props) => (props.disabled ? 0.1 : 0.3)};
  shadow-radius: 12px;
  elevation: ${(props) => (props.disabled ? 2 : 6)};
`;

/**
 * 버튼 텍스트 스타일
 */
const ButtonText = styled.Text<{ variant: 'primary' | 'secondary'; disabled: boolean }>`
  font-size: ${onboardingTheme.typography.bodyL.fontSize}px;
  font-weight: 600;
  color: ${(props) => {
    if (props.disabled) {
      return '#999999'; // 비활성화 상태: 어두운 회색
    }
    if (props.variant === 'primary') {
      return '#FFFFFF'; // Primary: 흰색
    }
    return theme.colors.text; // Secondary: 검은색
  }};
`;

/**
 * 로딩 스피너 컨테이너
 */
const LoadingContainer = styled.View`
  flex-direction: row;
  gap: ${theme.spacing.md}px;
  align-items: center;
`;

/**
 * OnboardingButton 컴포넌트
 *
 * 사용 예:
 * ```tsx
 * <OnboardingButton
 *   label="다음"
 *   onPress={() => navigation.push('NextScreen')}
 *   variant="primary"
 * />
 * ```
 */
export const OnboardingButton: React.FC<OnboardingButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  testID,
  accessible = true,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const [isPressed, setIsPressed] = useState(false);

  const handlePress = () => {
    if (!disabled && !loading) {
      setIsPressed(true);
      onPress();
      // 시각적 피드백 후 복구
      setTimeout(() => setIsPressed(false), 150);
    }
  };

  return (
    <ButtonBase
      variant={variant}
      disabled={disabled || loading}
      onPress={handlePress}
      testID={testID}
      accessible={accessible}
      accessibilityLabel={accessibilityLabel || label}
      accessibilityHint={accessibilityHint}
      activeOpacity={0.8}
      style={{
        opacity: isPressed ? 0.9 : 1,
        transform: [{ scale: isPressed ? 0.95 : 1 }],
      }}
    >
      {loading ? (
        <LoadingContainer>
          <ActivityIndicator
            size="small"
            color={variant === 'primary' ? '#FFFFFF' : theme.colors.text}
            testID="button-loading-spinner"
          />
        </LoadingContainer>
      ) : (
        <ButtonText
          variant={variant}
          disabled={disabled}
          testID={testID ? `${testID}-text` : undefined}
        >
          {label}
        </ButtonText>
      )}
    </ButtonBase>
  );
};

export default OnboardingButton;
