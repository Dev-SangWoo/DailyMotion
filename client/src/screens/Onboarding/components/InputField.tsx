/**
 * 온보딩 입력 필드 컴포넌트
 *
 * 헌법 준수:
 * - AGENTS.md [제2장] 스타일링: Styled-components 사용
 * - desgin.md: Flat/Inset 스타일 (입력부임을 명확히)
 *
 * 특징:
 * - Flat 스타일 (3D 효과 없음)
 * - 포커스 시 경계색 변경 (시각적 피드백)
 * - 선택적 아이콘
 * - Disabled 상태 지원
 */

import React, { useState, useCallback } from 'react';
import { TextInput as RNTextInput, View } from 'react-native';
import styled from 'styled-components/native';
import { theme } from '../../../styles/theme';

interface InputFieldProps {
  placeholder: string;
  value: string;
  onChange: (text: string) => void;
  icon?: string;
  disabled?: boolean;
  editable?: boolean;
  testID?: string;
  accessible?: boolean;
  accessibilityLabel?: string;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  secureTextEntry?: boolean;
}

/**
 * InputContainer - 입력 필드를 감싸는 컨테이너
 */
const InputContainer = styled.View<{ isFocused: boolean; disabled?: boolean }>`
  flex-direction: row;
  align-items: center;
  height: 56px;
  padding-horizontal: ${theme.spacing.md}px;
  background-color: ${(props) => (props.disabled ? '#F5F5F5' : '#FFFFFF')};
  border-radius: 8px;
  border-width: 1px;
  border-color: ${(props) => (props.isFocused ? theme.colors.primary : '#E0E0E0')};

  /* 포커스 시 미묘한 그림자 */
  shadow-color: ${(props) => (props.isFocused ? theme.colors.primary : 'transparent')};
  shadow-offset: 0px 0px;
  shadow-opacity: ${(props) => (props.isFocused ? 0.1 : 0)};
  shadow-radius: ${(props) => (props.isFocused ? 4 : 0)}px;
  elevation: ${(props) => (props.isFocused ? 1 : 0)};

  /* Flat 스타일: elevation 0 */
  transition: border-color 0.2s ease-in-out;
`;

/**
 * IconContainer - 아이콘을 렌더링하는 컨테이너
 */
const IconContainer = styled.View`
  margin-right: ${theme.spacing.sm}px;
  font-size: 20px;
  line-height: 20px;
`;

/**
 * IconText - 아이콘 텍스트
 */
const IconText = styled.Text`
  font-size: 20px;
  color: ${theme.colors.primary};
`;

/**
 * TextInput - 스타일이 적용된 입력 필드
 */
const TextInputStyled = styled(RNTextInput)`
  flex: 1;
  font-size: 16px;
  color: ${theme.colors.text};
  padding-vertical: 0px;
  padding-horizontal: 0px;
`;

/**
 * InputField 컴포넌트
 *
 * 사용 예:
 * ```tsx
 * const [origin, setOrigin] = useState('');
 *
 * <InputField
 *   placeholder="출발지"
 *   value={origin}
 *   onChange={setOrigin}
 *   icon="📍"
 * />
 * ```
 */
export const InputField: React.FC<InputFieldProps> = ({
  placeholder,
  value,
  onChange,
  icon,
  disabled = false,
  editable = !disabled,
  testID,
  accessible = true,
  accessibilityLabel,
  keyboardType = 'default',
  secureTextEntry = false,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleChangeText = (text: string) => {
    if (!disabled) {
      onChange(text);
    }
  };

  const handleFocus = useCallback(() => {
    if (!disabled) {
      setIsFocused(true);
    }
  }, [disabled]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  return (
    <InputContainer
      isFocused={isFocused && !disabled}
      disabled={disabled}
      testID={testID}
    >
      {icon && (
        <IconContainer>
          <IconText>{icon}</IconText>
        </IconContainer>
      )}

      <TextInputStyled
        placeholder={placeholder}
        placeholderTextColor="#999999"
        value={value}
        onChangeText={handleChangeText}
        onFocus={handleFocus}
        onBlur={handleBlur}
        editable={editable}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        accessible={accessible}
        accessibilityLabel={accessibilityLabel || placeholder}
        accessibilityHint={`텍스트 입력 필드: ${placeholder}`}
        returnKeyType="next"
        blurOnSubmit={false}
      />
    </InputContainer>
  );
};

export default InputField;
