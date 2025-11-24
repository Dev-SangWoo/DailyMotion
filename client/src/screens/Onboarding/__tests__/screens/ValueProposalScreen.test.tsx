/**
 * ValueProposalScreen 테스트 (TDD)
 *
 * 스크린 1-3: 가치 제안 (수평 스와이프 페이지 뷰)
 *
 * 테스트 항목:
 * - 3개 카드 렌더링
 * - 수평 스와이프 기능
 * - 페이지네이션 인디케이터 (점 3개)
 * - 마지막 카드의 CTA 버튼 탭
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from 'styled-components/native';
import { theme } from '../../../../styles/theme';
import { ValueProposalScreen } from '../../screens/ValueProposalScreen';

const mockNavigation = {
  navigate: jest.fn(),
  push: jest.fn(),
};

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('ValueProposalScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('[기본 렌더링]', () => {
    it('화면이 렌더링되어야 한다', () => {
      renderWithTheme(
        <ValueProposalScreen navigation={mockNavigation} />
      );

      // 첫 번째 카드의 텍스트가 보여야 함
      expect(screen.getByText(/매일 아침/i)).toBeTruthy();
    });

    it('페이지네이션 인디케이터 (점 3개)가 표시되어야 한다', () => {
      const { getAllByTestId } = renderWithTheme(
        <ValueProposalScreen navigation={mockNavigation} />
      );

      const dots = getAllByTestId('pagination-dot');
      expect(dots).toHaveLength(3);
    });

    it('첫 번째 점이 활성화되어야 한다 (초기 상태)', () => {
      const { getByTestId } = renderWithTheme(
        <ValueProposalScreen navigation={mockNavigation} />
      );

      const firstDot = getByTestId('pagination-dot-0');
      expect(firstDot.props.style.width).toBe(20); // 활성화: 20px
    });
  });

  describe('[수평 스와이프]', () => {
    it('오른쪽으로 스와이프할 수 있어야 한다', () => {
      const { getByTestId, getByText } = renderWithTheme(
        <ValueProposalScreen navigation={mockNavigation} />
      );

      const scrollView = getByTestId('proposal-carousel');

      // 첫 번째 화면 확인
      expect(getByText(/매일 아침/i)).toBeTruthy();

      // 스와이프 시뮬레이션 (offset 변경)
      fireEvent(scrollView, 'onMomentumScrollEnd', {
        nativeEvent: {
          contentOffset: { x: 400 }, // 한 화면 width 분량 이동
        },
      });

      // 두 번째 페이지의 점이 활성화되어야 함
      const secondDot = getByTestId('pagination-dot-1');
      expect(secondDot.props.style.width).toBe(20);
    });

    it('마지막 화면으로 스와이프할 수 있어야 한다', () => {
      const { getByTestId } = renderWithTheme(
        <ValueProposalScreen navigation={mockNavigation} />
      );

      const scrollView = getByTestId('proposal-carousel');

      // 세 번째 화면으로 스와이프
      fireEvent(scrollView, 'onMomentumScrollEnd', {
        nativeEvent: {
          contentOffset: { x: 800 }, // 두 화면 width 분량 이동
        },
      });

      // 세 번째 점이 활성화되어야 함
      const thirdDot = getByTestId('pagination-dot-2');
      expect(thirdDot.props.style.width).toBe(20);
    });
  });

  describe('[페이지네이션 인디케이터]', () => {
    it('첫 번째 점은 길어야 한다 (20px)', () => {
      const { getByTestId } = renderWithTheme(
        <ValueProposalScreen navigation={mockNavigation} />
      );

      const firstDot = getByTestId('pagination-dot-0');
      expect(firstDot.props.style.width).toBe(20);
    });

    it('비활성 점은 짧아야 한다 (6px)', () => {
      const { getByTestId } = renderWithTheme(
        <ValueProposalScreen navigation={mockNavigation} />
      );

      const secondDot = getByTestId('pagination-dot-1');
      expect(secondDot.props.style.width).toBe(6);
    });

    it('비활성 점의 투명도는 낮아야 한다 (40%)', () => {
      const { getByTestId } = renderWithTheme(
        <ValueProposalScreen navigation={mockNavigation} />
      );

      const secondDot = getByTestId('pagination-dot-1');
      expect(secondDot.props.style.opacity).toBe(0.4);
    });
  });

  describe('[CTA 버튼 (스크린 3)]', () => {
    it('세 번째 화면에 CTA 버튼이 있어야 한다', () => {
      const { getByTestId, getByText } = renderWithTheme(
        <ValueProposalScreen navigation={mockNavigation} />
      );

      const scrollView = getByTestId('proposal-carousel');

      // 세 번째 화면으로 이동
      fireEvent(scrollView, 'onMomentumScrollEnd', {
        nativeEvent: {
          contentOffset: { x: 800 },
        },
      });

      // CTA 버튼 확인
      expect(getByText('내 비서 만들기')).toBeTruthy();
    });

    it('CTA 버튼 탭 시 다음 스크린으로 이동해야 한다', () => {
      const { getByTestId, getByText } = renderWithTheme(
        <ValueProposalScreen navigation={mockNavigation} />
      );

      const scrollView = getByTestId('proposal-carousel');

      // 세 번째 화면으로 이동
      fireEvent(scrollView, 'onMomentumScrollEnd', {
        nativeEvent: {
          contentOffset: { x: 800 },
        },
      });

      // CTA 버튼 탭
      const ctaButton = getByText('내 비서 만들기');
      fireEvent.press(ctaButton);

      // JourneySetupScreen으로 네비게이션
      expect(mockNavigation.navigate).toHaveBeenCalledWith('JourneySetup');
    });
  });

  describe('[첫 번째/두 번째 스크린]', () => {
    it('첫 번째 화면에는 CTA 버튼이 없어야 한다', () => {
      const { queryByText } = renderWithTheme(
        <ValueProposalScreen navigation={mockNavigation} />
      );

      expect(queryByText('내 비서 만들기')).toBeFalsy();
    });

    it('두 번째 화면에도 CTA 버튼이 없어야 한다', () => {
      const { getByTestId, queryByText } = renderWithTheme(
        <ValueProposalScreen navigation={mockNavigation} />
      );

      const scrollView = getByTestId('proposal-carousel');

      // 두 번째 화면으로 이동
      fireEvent(scrollView, 'onMomentumScrollEnd', {
        nativeEvent: {
          contentOffset: { x: 400 },
        },
      });

      expect(queryByText('내 비서 만들기')).toBeFalsy();
    });
  });

  describe('[아이콘 및 텍스트]', () => {
    it('각 화면에 고품질 아이콘이 있어야 한다', () => {
      const { getByTestId } = renderWithTheme(
        <ValueProposalScreen navigation={mockNavigation} />
      );

      const icons = getByTestId('proposal-icon-container');
      expect(icons).toBeTruthy();
    });

    it('제목 텍스트가 표시되어야 한다', () => {
      renderWithTheme(
        <ValueProposalScreen navigation={mockNavigation} />
      );

      expect(screen.getByText(/매일 아침, 고민하지 마세요/i)).toBeTruthy();
    });
  });
});
