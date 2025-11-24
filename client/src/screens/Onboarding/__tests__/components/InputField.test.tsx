/**
 * InputField 컴포넌트 테스트 (TDD)
 *
 * 테스트 항목:
 * - 텍스트 입력 및 변경 감지
 * - placeholder 표시
 * - 아이콘 렌더링
 * - Flat/Inset 스타일
 * - 포커스 상태
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from 'styled-components/native';
import { theme } from '../../../../styles/theme';
import { InputField } from '../../components/InputField';

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('InputField', () => {
  describe('[기본 렌더링]', () => {
    it('입력 필드가 렌더링되어야 한다', () => {
      renderWithTheme(
        <InputField
          placeholder="출발지"
          value=""
          onChange={jest.fn()}
        />
      );

      expect(screen.getByPlaceholderText('출발지')).toBeTruthy();
    });

    it('초기값이 표시되어야 한다', () => {
      const { getByDisplayValue } = renderWithTheme(
        <InputField
          placeholder="출발지"
          value="집"
          onChange={jest.fn()}
        />
      );

      expect(getByDisplayValue('집')).toBeTruthy();
    });
  });

  describe('[Placeholder 표시]', () => {
    it('placeholder 텍스트가 표시되어야 한다', () => {
      renderWithTheme(
        <InputField
          placeholder="목적지를 입력하세요"
          value=""
          onChange={jest.fn()}
        />
      );

      expect(screen.getByPlaceholderText('목적지를 입력하세요')).toBeTruthy();
    });

    it('placeholder 색상이 설정되어야 한다', () => {
      const { getByPlaceholderText } = renderWithTheme(
        <InputField
          placeholder="테스트"
          value=""
          onChange={jest.fn()}
        />
      );

      const input = getByPlaceholderText('테스트');
      expect(input.props.placeholderTextColor).toBe('#999999');
    });
  });

  describe('[텍스트 입력 및 변경]', () => {
    it('텍스트 입력 시 onChange가 호출되어야 한다', () => {
      const onChangeMock = jest.fn();
      renderWithTheme(
        <InputField
          placeholder="테스트"
          value=""
          onChange={onChangeMock}
          testID="test-input"
        />
      );

      const input = screen.getByTestId('test-input');
      fireEvent.changeText(input, '새 텍스트');

      expect(onChangeMock).toHaveBeenCalledWith('새 텍스트');
    });

    it('여러 문자를 입력할 수 있어야 한다', () => {
      const onChangeMock = jest.fn();
      renderWithTheme(
        <InputField
          placeholder="테스트"
          value=""
          onChange={onChangeMock}
          testID="test-input"
        />
      );

      const input = screen.getByTestId('test-input');
      fireEvent.changeText(input, '강남역');

      expect(onChangeMock).toHaveBeenCalledWith('강남역');
    });
  });

  describe('[아이콘]', () => {
    it('아이콘이 렌더링되어야 한다', () => {
      const { getByText } = renderWithTheme(
        <InputField
          placeholder="출발지"
          value=""
          onChange={jest.fn()}
          icon="📍"
          testID="icon-input"
        />
      );

      expect(getByText('📍')).toBeTruthy();
    });

    it('아이콘이 입력 필드의 왼쪽에 표시되어야 한다', () => {
      const { getByTestId } = renderWithTheme(
        <InputField
          placeholder="출발지"
          value=""
          onChange={jest.fn()}
          icon="📍"
          testID="icon-input"
        />
      );

      const container = getByTestId('icon-input');
      expect(container.props.style.flexDirection).toBe('row');
    });
  });

  describe('[포커스 상태]', () => {
    it('포커스 시 시각적 변화가 있어야 한다', () => {
      const { getByTestId } = renderWithTheme(
        <InputField
          placeholder="테스트"
          value=""
          onChange={jest.fn()}
          testID="focus-input"
        />
      );

      const input = getByTestId('focus-input');
      fireEvent(input, 'focus');

      // 포커스 상태에서 경계색이 변경되어야 함
      expect(input.props.style.borderColor).toBe('#007AFF');
    });

    it('포커스 해제 시 상태가 복구되어야 한다', () => {
      const { getByTestId } = renderWithTheme(
        <InputField
          placeholder="테스트"
          value=""
          onChange={jest.fn()}
          testID="blur-input"
        />
      );

      const input = getByTestId('blur-input');
      fireEvent(input, 'blur');

      // 기본 경계색으로 복구
      expect(input.props.style.borderColor).toBe('#E0E0E0');
    });
  });

  describe('[스타일 검증]', () => {
    it('Flat 스타일이 적용되어야 한다', () => {
      const { getByTestId } = renderWithTheme(
        <InputField
          placeholder="테스트"
          value=""
          onChange={jest.fn()}
          testID="flat-input"
        />
      );

      const input = getByTestId('flat-input');
      // Flat 스타일: 3D 효과 없음 (elevation 0)
      expect(input.props.style.elevation).toBe(0);
    });

    it('입력 필드가 높이를 가져야 한다', () => {
      const { getByTestId } = renderWithTheme(
        <InputField
          placeholder="테스트"
          value=""
          onChange={jest.fn()}
          testID="height-input"
        />
      );

      const input = getByTestId('height-input');
      expect(input.props.style.height).toBe(56);
    });

    it('입력 필드가 적절한 padding을 가져야 한다', () => {
      const { getByTestId } = renderWithTheme(
        <InputField
          placeholder="테스트"
          value=""
          onChange={jest.fn()}
          testID="padded-input"
        />
      );

      const input = getByTestId('padded-input');
      expect(input.props.style.paddingHorizontal).toBe(16);
    });

    it('입력 필드가 둥근 모서리를 가져야 한다', () => {
      const { getByTestId } = renderWithTheme(
        <InputField
          placeholder="테스트"
          value=""
          onChange={jest.fn()}
          testID="rounded-input"
        />
      );

      const input = getByTestId('rounded-input');
      expect(input.props.style.borderRadius).toBe(8);
    });
  });

  describe('[텍스트 스타일]', () => {
    it('입력 텍스트가 검은색이어야 한다', () => {
      const { getByTestId } = renderWithTheme(
        <InputField
          placeholder="테스트"
          value=""
          onChange={jest.fn()}
          testID="text-color-input"
        />
      );

      const input = getByTestId('text-color-input');
      expect(input.props.style.color).toBe('#000000');
    });

    it('입력 텍스트가 적절한 크기여야 한다', () => {
      const { getByTestId } = renderWithTheme(
        <InputField
          placeholder="테스트"
          value=""
          onChange={jest.fn()}
          testID="font-size-input"
        />
      );

      const input = getByTestId('font-size-input');
      expect(input.props.style.fontSize).toBe(16);
    });
  });

  describe('[disabled 상태]', () => {
    it('disabled={true}일 때 입력이 불가능해야 한다', () => {
      const onChangeMock = jest.fn();
      renderWithTheme(
        <InputField
          placeholder="테스트"
          value=""
          onChange={onChangeMock}
          disabled={true}
          testID="disabled-input"
        />
      );

      const input = screen.getByTestId('disabled-input');
      fireEvent.changeText(input, '입력 시도');

      // disabled 상태에서는 onChange가 호출되지 않음
      expect(onChangeMock).not.toHaveBeenCalled();
    });

    it('disabled={true}일 때 배경색이 변경되어야 한다', () => {
      const { getByTestId } = renderWithTheme(
        <InputField
          placeholder="테스트"
          value=""
          onChange={jest.fn()}
          disabled={true}
          testID="disabled-bg-input"
        />
      );

      const input = getByTestId('disabled-bg-input');
      expect(input.props.style.backgroundColor).toBe('#F5F5F5');
    });
  });

  describe('[접근성]', () => {
    it('accessible prop을 받을 수 있어야 한다', () => {
      renderWithTheme(
        <InputField
          placeholder="테스트"
          value=""
          onChange={jest.fn()}
          accessible={true}
        />
      );

      expect(screen.getByPlaceholderText('테스트')).toBeTruthy();
    });
  });
});
