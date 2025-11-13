/**
 * 여정 선택기 (Journey Selector) 컴포넌트
 *
 * 헌법 준수:
 * - AGENTS.md 프론트엔드 헌법 [제2장] 스타일링 (Styled-components)
 * - AGENTS.md 프론트엔드 헌법 [제3장] 데이터 페칭 (React Query 없음, 부모에서 상태 관리)
 * - DESIGN.md 4.1 컴포넌트 1: 여정 선택기 사용자 경험 구현
 */

import React, { useState } from 'react';
import styled from 'styled-components/native';
import { theme } from '../../../styles/theme';

// Styled-components: 의미론적 이름 사용 (헌법 제2장 준수)
const Container = styled.View<{ isExpanded: boolean }>`
  background-color: ${theme.colors.background};
  padding: ${theme.spacing.md}px;
  border-bottom-width: 1px;
  border-bottom-color: ${theme.colors.border};
  max-height: ${({ isExpanded }) => (isExpanded ? '300px' : '60px')};
  transition: max-height 0.3s ease-in-out;
`;

const TabsContainer = styled.ScrollView`
  flex-direction: row;
  margin-bottom: ${theme.spacing.md}px;
`;

const TabButton = styled.TouchableOpacity<{ isActive: boolean }>`
  padding: ${theme.spacing.sm}px ${theme.spacing.md}px;
  margin-right: ${theme.spacing.sm}px;
  border-radius: 20px;
  background-color: ${({ isActive }) =>
    isActive ? theme.colors.primary : theme.colors.surface};
  border-width: 1px;
  border-color: ${({ isActive }) =>
    isActive ? theme.colors.primary : theme.colors.border};
`;

const TabText = styled.Text<{ isActive: boolean }>`
  color: ${({ isActive }) =>
    isActive ? theme.colors.white : theme.colors.text};
  font-size: ${theme.fonts.sizes.sm}px;
  font-weight: ${({ isActive }) => (isActive ? 'bold' : 'normal')};
`;

const ExpandButton = styled.TouchableOpacity`
  width: 40px;
  height: 40px;
  border-radius: 20px;
  background-color: ${theme.colors.primary};
  justify-content: center;
  align-items: center;
`;

const ExpandButtonText = styled.Text`
  color: ${theme.colors.white};
  font-size: ${theme.fonts.sizes.lg}px;
  font-weight: bold;
`;

const SearchContainer = styled.View`
  flex-direction: column;
  margin-top: ${theme.spacing.md}px;
`;

const SearchInput = styled.TextInput`
  padding: ${theme.spacing.md}px;
  border-width: 1px;
  border-color: ${theme.colors.border};
  border-radius: 8px;
  margin-bottom: ${theme.spacing.sm}px;
  background-color: ${theme.colors.surface};
  color: ${theme.colors.text};
  font-size: ${theme.fonts.sizes.md}px;
`;

const CollapseButton = styled.TouchableOpacity`
  align-self: flex-end;
  padding: ${theme.spacing.sm}px ${theme.spacing.md}px;
`;

const CollapseButtonText = styled.Text`
  color: ${theme.colors.primary};
  font-size: ${theme.fonts.sizes.md}px;
`;

// Props 타입 정의
interface JourneySelectorProps {
  isExpanded: boolean;
  defaultSelectedTab?: 'commute' | 'retreat' | 'gym';
  onExpand?: () => void;
  onCollapse?: () => void;
  onTabSelect?: (tab: 'commute' | 'retreat' | 'gym') => void;
  onSearchChange?: (search: { origin: string; destination: string }) => void;
}

// 즐겨찾기 탭 정의
interface FavoriteTab {
  id: 'commute' | 'retreat' | 'gym';
  label: string;
}

const FAVORITE_TABS: FavoriteTab[] = [
  { id: 'commute', label: '출근' },
  { id: 'retreat', label: '귀가' },
  { id: 'gym', label: '헬스장' },
];

const JourneySelector: React.FC<JourneySelectorProps> = ({
  isExpanded,
  defaultSelectedTab = 'commute',
  onExpand,
  onCollapse,
  onTabSelect,
  onSearchChange,
}) => {
  const [selectedTab, setSelectedTab] = useState<'commute' | 'retreat' | 'gym'>(
    defaultSelectedTab
  );
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');

  // 탭 선택 처리
  const handleTabSelect = (tab: 'commute' | 'retreat' | 'gym') => {
    setSelectedTab(tab);
    onTabSelect?.(tab);
  };

  // 출발지 입력 처리
  const handleOriginChange = (text: string) => {
    setOrigin(text);
    onSearchChange?.({ origin: text, destination });
  };

  // 목적지 입력 처리
  const handleDestinationChange = (text: string) => {
    setDestination(text);
    onSearchChange?.({ origin, destination: text });
  };

  return (
    <Container isExpanded={isExpanded} testID="journey-selector-container">
      {/* 즐겨찾기 탭 */}
      <TabsContainer
        horizontal
        scrollEnabled={false}
        testID="favorite-tabs-container"
      >
        {FAVORITE_TABS.map((tab) => (
          <TabButton
            key={tab.id}
            isActive={selectedTab === tab.id}
            onPress={() => handleTabSelect(tab.id)}
            testID={`tab-${tab.id}`}
          >
            <TabText isActive={selectedTab === tab.id}>{tab.label}</TabText>
          </TabButton>
        ))}

        {/* 확장 검색(+) 버튼 */}
        <ExpandButton
          onPress={onExpand}
          testID="expand-search-button"
        >
          <ExpandButtonText>+</ExpandButtonText>
        </ExpandButton>
      </TabsContainer>

      {/* 범용 검색창 (확장 상태에서만 표시) */}
      {isExpanded && (
        <>
          <SearchContainer>
            <SearchInput
              placeholder="출발지"
              placeholderTextColor={theme.colors.textSecondary}
              value={origin}
              onChangeText={handleOriginChange}
              testID="origin-input"
            />
            <SearchInput
              placeholder="목적지"
              placeholderTextColor={theme.colors.textSecondary}
              value={destination}
              onChangeText={handleDestinationChange}
              testID="destination-input"
            />
          </SearchContainer>

          {/* 축소 버튼 */}
          <CollapseButton
            onPress={onCollapse}
            testID="collapse-button"
          >
            <CollapseButtonText>접기</CollapseButtonText>
          </CollapseButton>
        </>
      )}
    </Container>
  );
};

export default JourneySelector;
