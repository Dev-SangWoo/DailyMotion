/**
 * OnboardingButton 컴포넌트 테스트 (TDD)
 *
 * 테스트 방법론: 사용자 관점에서 작성
 * - 버튼이 렌더링되는가?
 * - 탭 시 이벤트가 호출되는가?
 * - disabled 상태가 동작하는가?
 * - 로딩 상태가 표시되는가?
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from 'styled-components/native';
import { theme } from '../../../../styles/theme';
import { OnboardingButton } from '../../components/OnboardingButton';

// ThemeProvider로 감싼 래퍼
const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('OnboardingButton', () => {
  describe('[기본 렌더링]', () => {
    it('Primary 버튼을 렌더링할 수 있어야 한다', () => {
      renderWithTheme(
        <OnboardingButton
          label="시작하기"
          onPress={jest.fn()}
          variant="primary"
        />
      );

      expect(screen.getByText('시작하기')).toBeTruthy();
    });

    it('Secondary 버튼을 렌더링할 수 있어야 한다', () => {
      renderWithTheme(
        <OnboardingButton
          label="건너뛰기"
          onPress={jest.fn()}
          variant="secondary"
        />
      );

      expect(screen.getByText('건너뛰기')).toBeTruthy();
    });

    it('기본값으로 Primary 버튼을 렌더링해야 한다', () => {
      renderWithTheme(
        <OnboardingButton
          label="다음"
          onPress={jest.fn()}
        />
      );

      expect(screen.getByText('다음')).toBeTruthy();
    });
  });

  describe('[탭 이벤트]', () => {
    it('버튼 탭 시 onPress 콜백이 호출되어야 한다', () => {
      const onPressMock = jest.fn();
      renderWithTheme(
        <OnboardingButton
          label="클릭"
          onPress={onPressMock}
        />
      );

      const button = screen.getByText('클릭');
      fireEvent.press(button);

      expect(onPressMock).toHaveBeenCalledTimes(1);
    });

    it('disabled 상태에서는 onPress가 호출되지 않아야 한다', () => {
      const onPressMock = jest.fn();
      renderWithTheme(
        <OnboardingButton
          label="비활성화"
          onPress={onPressMock}
          disabled={true}
        />
      );

      const button = screen.getByText('비활성화');
      fireEvent.press(button);

      expect(onPressMock).not.toHaveBeenCalled();
    });
  });

  describe('[상태 표시]', () => {
    it('disabled={true}일 때 버튼이 비활성화되어야 한다', () => {
      const { getByTestId } = renderWithTheme(
        <OnboardingButton
          label="비활성화 버튼"
          onPress={jest.fn()}
          disabled={true}
          testID="disabled-button"
        />
      );

      const button = getByTestId('disabled-button');
      expect(button.props.pointerEvents).toBe('none');
    });

    it('loading={true}일 때 로딩 표시가 나타나야 한다', () => {
      renderWithTheme(
        <OnboardingButton
          label="로딩"
          onPress={jest.fn()}
          loading={true}
          testID="loading-button"
        />
      );

      // 로딩 스피너가 렌더링되어야 함
      expect(screen.getByTestId('button-loading-spinner')).toBeTruthy();
    });

    it('loading={true}일 때 텍스트가 숨겨져야 한다', () => {
      const { queryByText } = renderWithTheme(
        <OnboardingButton
          label="로딩 중"
          onPress={jest.fn()}
          loading={true}
        />
      );

      // 로딩 상태에서는 텍스트가 보이지 않아야 함
      expect(queryByText('로딩 중')).toBeFalsy();
    });
  });

  describe('[스타일 검증]', () => {
    it('Primary 버튼이 올바른 배경색을 가져야 한다', () => {
      const { getByTestId } = renderWithTheme(
        <OnboardingButton
          label="Primary"
          onPress={jest.fn()}
          variant="primary"
          testID="primary-button"
        />
      );

      const button = getByTestId('primary-button');
      // Primary 버튼은 파란색 배경을 가져야 함
      expect(button.props.style.backgroundColor).toContain('#007AFF');
    });

    it('Secondary 버튼이 올바른 배경색을 가져야 한다', () => {
      const { getByTestId } = renderWithTheme(
        <OnboardingButton
          label="Secondary"
          onPress={jest.fn()}
          variant="secondary"
          testID="secondary-button"
        />
      );

      const button = getByTestId('secondary-button');
      // Secondary 버튼은 회색 배경을 가져야 함
      expect(button.props.style.backgroundColor).toContain('#F0F0F0');
    });

    it('3D 그림자 효과가 적용되어야 한다', () => {
      const { getByTestId } = renderWithTheme(
        <OnboardingButton
          label="3D 버튼"
          onPress={jest.fn()}
          testID="button-with-shadow"
        />
      );

      const button = getByTestId('button-with-shadow');
      // 그림자가 있는지 확인 (elevation이나 shadowColor)
      expect(button.props.style.elevation).toBeGreaterThan(0);
    });
  });

  describe('[텍스트 스타일]', () => {
    it('버튼 텍스트가 흰색이어야 한다', () => {
      const { getByTestId } = renderWithTheme(
        <OnboardingButton
          label="텍스트"
          onPress={jest.fn()}
          testID="button-text"
        />
      );

      const text = getByTestId('button-text');
      expect(text.props.style.color).toBe('#FFFFFF');
    });

    it('버튼 텍스트가 중간 굵기여야 한다', () => {
      const { getByTestId } = renderWithTheme(
        <OnboardingButton
          label="텍스트"
          onPress={jest.fn()}
          testID="button-text"
        />
      );

      const text = getByTestId('button-text');
      expect(text.props.style.fontWeight).toBe('600');
    });
  });

  describe('[접근성]', () => {
    it('버튼이 accessible해야 한다', () => {
      renderWithTheme(
        <OnboardingButton
          label="접근 가능"
          onPress={jest.fn()}
          accessible={true}
        />
      );

      const button = screen.getByText('접근 가능');
      expect(button).toBeTruthy();
    });
  });
});
