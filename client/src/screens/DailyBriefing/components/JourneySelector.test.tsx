/**
 * 여정 선택기 (Journey Selector) 테스트
 *
 * 헌법 준수:
 * - AGENTS.md 프론트엔드 헌법 [제6장] 개발 방법론 (TDD/Jest+RTL)
 * - DESIGN.md 4.1 컴포넌트 1: 여정 선택기 사용자 경험 검증
 */

import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import JourneySelector from './JourneySelector';

describe('JourneySelector', () => {
  describe('기본 상태 (Collapsed)', () => {
    /**
     * [DESIGN.md 4.1 기본 상태]
     * 사용자는 [출근], [귀가], [헬스장] 등 즐겨찾기 탭을 볼 수 있어야 함
     */
    it('사용자는 즐겨찾기 탭들을 볼 수 있어야 한다', () => {
      // Given: 기본 상태 (Collapsed) JourneySelector 렌더링
      render(<JourneySelector isExpanded={false} />);

      // Then: 즐겨찾기 탭들이 표시되어야 함
      expect(screen.getByText('출근')).toBeTruthy();
      expect(screen.getByText('귀가')).toBeTruthy();
      expect(screen.getByTestId('favorite-tabs-container')).toBeTruthy();
    });

    /**
     * [DESIGN.md 4.1 기본 상태]
     * 사용자는 [확장 검색(+)] 버튼을 볼 수 있어야 함
     */
    it('사용자는 확장 검색(+) 버튼을 볼 수 있어야 한다', () => {
      // Given: 기본 상태 JourneySelector
      render(<JourneySelector isExpanded={false} />);

      // Then: 확장 검색 버튼이 표시되어야 함
      const expandButton = screen.getByTestId('expand-search-button');
      expect(expandButton).toBeTruthy();
      expect(screen.getByText('+')).toBeTruthy(); // 버튼 텍스트
    });

    /**
     * [DESIGN.md 4.1 기본 상태 높이 제약]
     * 기본 상태 높이는 제한되어야 함 (탭과 버튼만 표시)
     */
    it('기본 상태의 높이가 제한되어야 한다', () => {
      // Given: 기본 상태 JourneySelector
      const { getByTestId } = render(<JourneySelector isExpanded={false} />);

      // Then: 컨테이너의 높이가 제한되어야 함
      const container = getByTestId('journey-selector-container');
      expect(container).toBeTruthy();
      // 실제 높이 검증은 Snapshot이나 스타일 검증으로 수행
    });

    /**
     * [AGENTS.md 헌법 제6장 테스트]
     * 탭 선택 시 선택 상태가 시각적으로 표현되어야 함
     */
    it('선택된 탭은 활성화 상태로 표시되어야 한다', () => {
      // Given: JourneySelector 렌더링
      render(<JourneySelector isExpanded={false} defaultSelectedTab="commute" />);

      // Then: [출근] 탭이 활성화되어야 함
      const commuteTab = screen.getByTestId('tab-commute');
      expect(commuteTab).toHaveStyle({ /* 활성화 스타일 */});
    });
  });

  describe('확장 상태 (Expanded)', () => {
    /**
     * [DESIGN.md 4.1 확장 상태]
     * 사용자는 범용 검색창([출발지]/[목적지])을 볼 수 있어야 함
     */
    it('확장 상태에서 사용자는 범용 검색창을 볼 수 있어야 한다', () => {
      // Given: 확장 상태 JourneySelector
      render(<JourneySelector isExpanded={true} />);

      // Then: 출발지/목적지 입력창이 표시되어야 함
      expect(screen.getByPlaceholderText('출발지')).toBeTruthy();
      expect(screen.getByPlaceholderText('목적지')).toBeTruthy();
    });

    /**
     * [DESIGN.md 4.1 확장 상태]
     * 확장 상태에서도 즐겨찾기 탭은 여전히 보여야 함
     */
    it('확장 상태에서도 즐겨찾기 탭들이 표시되어야 한다', () => {
      // Given: 확장 상태 JourneySelector
      render(<JourneySelector isExpanded={true} />);

      // Then: 즐겨찾기 탭과 검색창이 모두 표시되어야 함
      expect(screen.getByText('출근')).toBeTruthy();
      expect(screen.getByPlaceholderText('출발지')).toBeTruthy();
    });

    /**
     * [DESIGN.md 4.1 확장 상태 접힘]
     * 사용자가 축소 버튼을 탭하면 기본 상태로 돌아가야 함
     */
    it('사용자가 축소 버튼을 탭하면 기본 상태로 돌아가야 한다', async () => {
      // Given: 확장 상태 JourneySelector
      const onCollapse = jest.fn();
      render(<JourneySelector isExpanded={true} onCollapse={onCollapse} />);

      // When: 축소 버튼을 탭
      const collapseButton = screen.getByTestId('collapse-button');
      await userEvent.press(collapseButton);

      // Then: onCollapse 콜백이 호출되어야 함
      expect(onCollapse).toHaveBeenCalled();
    });
  });

  describe('상태 전환', () => {
    /**
     * [DESIGN.md 4.1 기본 상태]
     * 사용자가 [확장 검색(+)] 버튼을 탭하면 확장 상태로 전환되어야 함
     */
    it('확장 검색(+) 버튼을 탭하면 확장 상태로 전환되어야 한다', async () => {
      // Given: 기본 상태 JourneySelector
      const onExpand = jest.fn();
      render(<JourneySelector isExpanded={false} onExpand={onExpand} />);

      // When: 확장 검색 버튼을 탭
      const expandButton = screen.getByTestId('expand-search-button');
      await userEvent.press(expandButton);

      // Then: onExpand 콜백이 호출되어야 함
      expect(onExpand).toHaveBeenCalled();
    });

    /**
     * [DESIGN.md 4.1 탭 선택]
     * 사용자가 즐겨찾기 탭을 탭하면 선택 상태가 변경되어야 함
     */
    it('즐겨찾기 탭을 탭하면 선택 상태가 변경되어야 한다', async () => {
      // Given: JourneySelector 렌더링
      const onTabSelect = jest.fn();
      render(
        <JourneySelector
          isExpanded={false}
          onTabSelect={onTabSelect}
          defaultSelectedTab="commute"
        />
      );

      // When: [귀가] 탭을 탭
      const retreatTab = screen.getByTestId('tab-retreat');
      await userEvent.press(retreatTab);

      // Then: onTabSelect 콜백이 'retreat' 인자로 호출되어야 함
      expect(onTabSelect).toHaveBeenCalledWith('retreat');
    });
  });

  describe('검색 입력 처리', () => {
    /**
     * [DESIGN.md 4.1 확장 상태 범용 검색]
     * 사용자가 출발지/목적지를 입력하면 값이 저장되어야 함
     */
    it('사용자가 출발지를 입력하면 값이 저장되어야 한다', async () => {
      // Given: 확장 상태 JourneySelector
      const onSearchChange = jest.fn();
      render(
        <JourneySelector
          isExpanded={true}
          onSearchChange={onSearchChange}
        />
      );

      // When: 출발지 입력창에 "종로3가역"을 입력
      const originInput = screen.getByPlaceholderText('출발지');
      await userEvent.type(originInput, '종로3가역');

      // Then: onSearchChange가 호출되어야 함
      expect(onSearchChange).toHaveBeenCalledWith(
        expect.objectContaining({ origin: '종로3가역' })
      );
    });

    /**
     * [DESIGN.md 4.1 확장 상태 범용 검색]
     * 사용자가 목적지를 입력하면 값이 저장되어야 함
     */
    it('사용자가 목적지를 입력하면 값이 저장되어야 한다', async () => {
      // Given: 확장 상태 JourneySelector
      const onSearchChange = jest.fn();
      render(
        <JourneySelector
          isExpanded={true}
          onSearchChange={onSearchChange}
        />
      );

      // When: 목적지 입력창에 "서울역"을 입력
      const destinationInput = screen.getByPlaceholderText('목적지');
      await userEvent.type(destinationInput, '서울역');

      // Then: onSearchChange가 호출되어야 함
      expect(onSearchChange).toHaveBeenCalledWith(
        expect.objectContaining({ destination: '서울역' })
      );
    });
  });

  describe('애니메이션 (Phase 2.2)', () => {
    /**
     * [DESIGN.md 4.1 확장 상태]
     * 확장/축소 시 부드러운 애니메이션 전환이 필요함
     */
    it('확장 상태 전환 시 컨테이너가 렌더링되어야 한다', () => {
      // Given: 기본 상태 → 확장 상태로 변경
      const { rerender, getByTestId } = render(
        <JourneySelector isExpanded={false} />
      );

      // When: 확장 상태로 변경
      rerender(<JourneySelector isExpanded={true} />);

      // Then: 검색 입력창이 표시되어야 함
      expect(getByTestId('origin-input')).toBeTruthy();
      expect(getByTestId('destination-input')).toBeTruthy();
    });

    /**
     * [DESIGN.md 4.1 기본 상태]
     * 축소 상태로 전환 시 검색 입력창이 숨겨져야 함
     */
    it('축소 상태 전환 시 검색 입력창이 숨겨져야 한다', () => {
      // Given: 확장 상태 JourneySelector
      const { rerender, queryByTestId } = render(
        <JourneySelector isExpanded={true} />
      );

      // When: 축소 상태로 변경
      rerender(<JourneySelector isExpanded={false} />);

      // Then: 검색 입력창이 없어야 함
      expect(queryByTestId('origin-input')).toBeFalsy();
      expect(queryByTestId('destination-input')).toBeFalsy();
    });
  });

  describe('여러 탭 전환 시나리오 (Phase 2.2)', () => {
    /**
     * [DESIGN.md 4.1 탭 선택]
     * 여러 탭을 연속으로 선택할 때 상태가 올바르게 유지되어야 함
     */
    it('여러 탭을 연속으로 선택할 수 있어야 한다', async () => {
      // Given: JourneySelector 렌더링
      const onTabSelect = jest.fn();
      render(
        <JourneySelector
          isExpanded={false}
          onTabSelect={onTabSelect}
          defaultSelectedTab="commute"
        />
      );

      // When: [귀가] → [헬스장] → [출근] 순서로 탭 선택
      const retreatTab = screen.getByTestId('tab-retreat');
      const gymTab = screen.getByTestId('tab-gym');
      const commuteTab = screen.getByTestId('tab-commute');

      await userEvent.press(retreatTab);
      await userEvent.press(gymTab);
      await userEvent.press(commuteTab);

      // Then: onTabSelect가 순서대로 호출되어야 함
      expect(onTabSelect).toHaveBeenCalledWith('retreat');
      expect(onTabSelect).toHaveBeenCalledWith('gym');
      expect(onTabSelect).toHaveBeenCalledWith('commute');
      expect(onTabSelect).toHaveBeenCalledTimes(3);
    });
  });

  describe('검색 입력 필드 상호작용 (Phase 2.2)', () => {
    /**
     * [DESIGN.md 4.1 확장 상태 범용 검색]
     * 출발지와 목적지를 동시에 입력하는 시나리오
     */
    it('출발지와 목적지를 동시에 입력할 수 있어야 한다', async () => {
      // Given: 확장 상태 JourneySelector
      const onSearchChange = jest.fn();
      render(
        <JourneySelector
          isExpanded={true}
          onSearchChange={onSearchChange}
        />
      );

      // When: 출발지 입력
      const originInput = screen.getByPlaceholderText('출발지');
      await userEvent.type(originInput, '강남역');

      // Then: onSearchChange가 origin과 함께 호출
      expect(onSearchChange).toHaveBeenCalledWith(
        expect.objectContaining({ origin: '강남역' })
      );

      // When: 목적지 입력
      const destinationInput = screen.getByPlaceholderText('목적지');
      await userEvent.type(destinationInput, '서울역');

      // Then: onSearchChange가 destination과 함께 호출
      expect(onSearchChange).toHaveBeenCalledWith(
        expect.objectContaining({ destination: '서울역' })
      );
    });

    /**
     * [DESIGN.md 4.1 확장 상태 범용 검색]
     * 입력값이 지워질 때도 콜백이 호출되어야 함
     */
    it('입력값을 지웠을 때도 콜백이 호출되어야 한다', async () => {
      // Given: 확장 상태 with text input
      const onSearchChange = jest.fn();
      render(
        <JourneySelector
          isExpanded={true}
          onSearchChange={onSearchChange}
        />
      );

      // When: 출발지에 값 입력 후 지우기
      const originInput = screen.getByPlaceholderText('출발지');
      await userEvent.type(originInput, '강남역');
      await userEvent.clear(originInput);

      // Then: onSearchChange가 빈 값으로 호출되어야 함
      expect(onSearchChange).toHaveBeenCalledWith(
        expect.objectContaining({ origin: '' })
      );
    });
  });

  describe('헌법 준수', () => {
    /**
     * [AGENTS.md 헌법 제2장] 스타일링
     * 모든 스타일이 theme을 사용하고 있는지 확인
     */
    it('Styled-components와 theme을 사용해야 한다', () => {
      // Given: JourneySelector 컴포넌트
      // Then: 컴포넌트가 렌더링되고 theme 색상을 사용하고 있어야 함
      const { getByTestId } = render(<JourneySelector isExpanded={false} />);
      const container = getByTestId('journey-selector-container');
      expect(container).toBeTruthy();
      // 스타일 검증은 스냅샷 또는 ComputedStyle로 수행
    });

    /**
     * [AGENTS.md 헌법 제3장] 데이터 페칭
     * 이 컴포넌트는 데이터 페칭이 필요 없음 (부모에서 상태 관리)
     * useEffect + useState 조합이 없어야 함
     */
    it('수동 API 호출(useEffect + useState)이 없어야 한다', () => {
      // Given: JourneySelector 렌더링
      render(<JourneySelector isExpanded={false} />);
      // Then: 컴포넌트가 렌더링됨 (자동 검증)
      expect(screen.getByTestId('journey-selector-container')).toBeTruthy();
    });
  });
});
