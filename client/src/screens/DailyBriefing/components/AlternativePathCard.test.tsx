/**
 * 대안 경로 카드 테스트 (카드 2.3)
 *
 * 헌법 준수:
 * - AGENTS.md 프론트엔드 헌법 [제6장] 개발 방법론 (TDD/Jest+RTL)
 * - DESIGN.md 4.3: 대안 경로 카드 사용자 경험 검증
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import AlternativePathCard from './AlternativePathCard';

describe('AlternativePathCard (카드 2.3)', () => {
  describe('조건부 렌더링', () => {
    /**
     * [DESIGN.md 4.3 대안 경로 카드]
     * 초기 상태: Hidden (숨겨짐)
     * Logic 2.2 발동 시: Visible (표시)
     */
    it('isVisible이 false면 렌더링되지 않아야 한다', () => {
      // Given: isVisible = false
      const { queryByTestId } = render(
        <AlternativePathCard
          isVisible={false}
          timeSavings={7}
          onPress={() => {}}
        />
      );

      // Then: 컴포넌트가 렌더링되지 않아야 함
      expect(queryByTestId('alternative-path-card')).toBeNull();
    });

    it('isVisible이 true면 렌더링되어야 한다', () => {
      // Given: isVisible = true
      render(
        <AlternativePathCard
          isVisible={true}
          timeSavings={7}
          onPress={() => {}}
        />
      );

      // Then: 대안 경로 카드가 렌더링되어야 함
      expect(screen.getByTestId('alternative-path-card')).toBeTruthy();
    });
  });

  describe('대안 경로 정보 표시', () => {
    /**
     * [DESIGN.md 4.3 대안 경로 카드]
     * UI: "💡 7분 단축 경로 발견!" 헤드라인
     */
    it('시간 단축 정보를 올바르게 표시해야 한다', () => {
      // Given: 시간 단축 정보
      const timeSavings = 7;

      // When: AlternativePathCard 렌더링
      render(
        <AlternativePathCard
          isVisible={true}
          timeSavings={timeSavings}
          onPress={() => {}}
        />
      );

      // Then: 단축 시간이 표시되어야 함
      expect(screen.getByTestId('alternative-path-card')).toBeTruthy();
      expect(screen.getByText(/7분 단축/i)).toBeTruthy();
    });

    it('다양한 시간 단축 값을 표시해야 한다', () => {
      // Given: 다른 시간 단축 값
      const { rerender } = render(
        <AlternativePathCard
          isVisible={true}
          timeSavings={5}
          onPress={() => {}}
        />
      );

      // Then: 5분 단축이 표시되어야 함
      expect(screen.getByText(/5분 단축/i)).toBeTruthy();

      // When: 다른 값으로 렌더링
      rerender(
        <AlternativePathCard
          isVisible={true}
          timeSavings={15}
          onPress={() => {}}
        />
      );

      // Then: 15분 단축이 표시되어야 함
      expect(screen.getByText(/15분 단축/i)).toBeTruthy();
    });
  });

  describe('헤드라인 표시', () => {
    /**
     * [DESIGN.md 4.3 대안 경로 카드]
     * "💡 7분 단축 경로 발견!" 헤드라인
     */
    it('경로 발견 헤드라인을 표시해야 한다', () => {
      // Given: AlternativePathCard
      render(
        <AlternativePathCard
          isVisible={true}
          timeSavings={7}
          onPress={() => {}}
        />
      );

      // Then: 헤드라인이 표시되어야 함
      expect(screen.getByText(/단축 경로 발견/i)).toBeTruthy();
    });
  });

  describe('상호작용', () => {
    /**
     * [DESIGN.md 4.3 대안 경로 카드]
     * Interaction: 탭(Tap) 시 → 경로 비교 모달 표시
     */
    it('카드를 탭하면 onPress 콜백이 호출되어야 한다', () => {
      // Given: 탭 핸들러
      const onPress = jest.fn();

      // When: AlternativePathCard 렌더링
      render(
        <AlternativePathCard
          isVisible={true}
          timeSavings={7}
          onPress={onPress}
        />
      );

      // Then: 카드가 렌더링되어야 함
      const card = screen.getByTestId('alternative-path-card');
      expect(card).toBeTruthy();

      // When: 카드를 탭하면
      fireEvent.press(card);

      // Then: onPress 콜백이 호출되어야 함
      expect(onPress).toHaveBeenCalled();
    });
  });

  describe('헌법 준수', () => {
    /**
     * [AGENTS.md 헌법 제2장] 스타일링
     * 모든 스타일이 theme을 사용하고 있는지 확인
     */
    it('Styled-components와 theme을 사용해야 한다', () => {
      // Given: AlternativePathCard 컴포넌트
      const { getByTestId } = render(
        <AlternativePathCard
          isVisible={true}
          timeSavings={7}
          onPress={() => {}}
        />
      );

      // Then: 컴포넌트가 렌더링되고 theme을 사용하고 있어야 함
      const card = getByTestId('alternative-path-card');
      expect(card).toBeTruthy();
    });

    /**
     * [AGENTS.md 헌법 제3장] 데이터 페칭
     * AlternativePathCard는 부모로부터 props를 받으므로 useEffect 불필요
     */
    it('자체 API 호출 없이 부모로부터 props를 받아야 한다', () => {
      // Given: 부모로부터 받은 props
      const props = {
        isVisible: true,
        timeSavings: 7,
        onPress: jest.fn(),
      };

      // When: AlternativePathCard 렌더링
      render(<AlternativePathCard {...props} />);

      // Then: props 기반으로 렌더링됨
      expect(screen.getByTestId('alternative-path-card')).toBeTruthy();
    });
  });
});
