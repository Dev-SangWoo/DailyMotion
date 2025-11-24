/**
 * 온보딩 입력 필드 컴포넌트
 *
 * 포커스 문제 해결을 위해 최대한 단순화
 */

import React, { useState } from 'react';
import { TextInput as RNTextInput } from 'react-native';
import styled from 'styled-components/native';
import { theme } from '../../../styles/theme';

interface InputFieldProps {
  placeholder: string;
  value: string;
  onChange: (text: string) => void;
  icon?: string;
  disabled?: boolean;
  testID?: string;
  onFocusChange?: (isFocused: boolean) => void;
}

const Container = styled.View<{ isFocused: boolean }>`
  flex-direction: row;
  align-items: center;
  height: 56px;
  padding-horizontal: ${theme.spacing.md}px;
  background-color: #FFFFFF;
  border-radius: 8px;
  border-width: 1px;
  border-color: ${(props) => (props.isFocused ? theme.colors.primary : '#E0E0E0')};
`;

const IconText = styled.Text`
  font-size: 20px;
  color: ${theme.colors.primary};
  margin-right: ${theme.spacing.sm}px;
`;

const Input = styled(RNTextInput)`
  flex: 1;
  font-size: 16px;
  color: ${theme.colors.text};
`;

export const InputField: React.FC<InputFieldProps> = ({
  placeholder,
  value,
  onChange,
  icon,
  disabled = false,
  testID,
  onFocusChange,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = () => {
    setIsFocused(true);
    onFocusChange?.(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
    onFocusChange?.(false);
  };

  return (
    <Container isFocused={isFocused}>
      {icon && <IconText>{icon}</IconText>}
      <Input
        placeholder={placeholder}
        placeholderTextColor="#999999"
        value={value}
        onChangeText={onChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        editable={!disabled}
        testID={testID}
        returnKeyType="next"
        blurOnSubmit={false}
      />
    </Container>
  );
};

export default InputField;
