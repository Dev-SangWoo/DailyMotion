/**
 * 캐러셀 (스와이프 기능) 컴포넌트
 *
 * 헌법 준수:
 * - AGENTS.md 프론트엔드 헌법 [제2장] 스타일링 (Styled-components)
 * - AGENTS.md 프론트엔드 헌법 [제3장] 데이터 페칭 (부모에서 상태 관리)
 * - DESIGN.md 4.2: 캐러셀 스와이프 기능 명세
 */
import React, { useRef, useEffect } from 'react';
import {
  FlatList,
  FlatListProps,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Dimensions,
} from 'react-native';
import styled from 'styled-components/native';
import { theme } from '../../../styles/theme';

const { width: screenWidth } = Dimensions.get('window');

// Styled-components: 의미론적 이름 사용 (헌법 제2장 준수)
const Container = styled.View`
  width: ${screenWidth}px;
  height: auto;
`;

const SlideContainer = styled.View`
  width: ${screenWidth}px;
  padding: ${theme.spacing.md}px;
  justify-content: center;
  align-items: center;
`;

const PaginationContainer = styled.View`
  flex-direction: row;
  justify-content: center;
  align-items: center;
  padding: ${theme.spacing.md}px;
  background-color: ${theme.colors.background};
`;

const PaginationDot = styled.View<{ isActive: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 4px;
  background-color: ${(props) =>
    props.isActive ? theme.colors.primary : theme.colors.border};
  margin: 0 ${theme.spacing.xs}px;
  transition: background-color 0.3s ease-in-out;
`;

// Props 타입 정의
interface CarouselCard {
  id: string;
  component: React.ReactNode;
  [key: string]: any;
}

interface CarouselProps {
  cards: CarouselCard[];
  activeIndex?: number;
  initialIndex?: number;
  onActiveIndexChange?: (index: number) => void;
  onSwipe?: (direction: 'left' | 'right') => void;
  autoSlide?: boolean;
  testID?: string;
}

/**
 * 캐러셀 컴포넌트
 *
 * [DESIGN.md 4.2 캐러셀]
 * 역할: 화면 상단에 위치하며, 좌우로 스와이프 가능한 카드 묶음입니다.
 * UI: Hero 상태 카드, 날씨 카드, 대안 경로 카드 등으로 구성됩니다.
 *
 * [스와이프 기능]
 * 좌우 스와이프로 카드 전환
 * Logic 2.2 발동 시 자동 슬라이드 (카드 1 → 카드 2.3)
 */
const Carousel: React.FC<CarouselProps> = ({
  cards,
  activeIndex = 0,
  initialIndex = 0,
  onActiveIndexChange,
  onSwipe,
  autoSlide = false,
  testID = 'carousel',
}) => {
  const flatListRef = useRef<FlatList>(null);
  const currentIndexRef = useRef<number>(initialIndex);

  // activeIndex prop이 변경되면 자동으로 스크롤 (Logic 2.2 대응)
  useEffect(() => {
    if (activeIndex !== currentIndexRef.current && flatListRef.current) {
      currentIndexRef.current = activeIndex;
      flatListRef.current.scrollToOffset({
        offset: activeIndex * screenWidth,
        animated: true,
      });
      onActiveIndexChange?.(activeIndex);
    }
  }, [activeIndex, onActiveIndexChange]);

  // 스크롤 이벤트 핸들러
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / screenWidth);

    if (index !== currentIndexRef.current) {
      currentIndexRef.current = index;
      onActiveIndexChange?.(index);

      // 스와이프 방향 감지
      if (index > currentIndexRef.current) {
        onSwipe?.('left');
      } else if (index < currentIndexRef.current) {
        onSwipe?.('right');
      }
    }
  };

  // getItemLayout: FlatList가 각 아이템의 위치를 알 수 있도록 설정
  const getItemLayout = (
    data: CarouselCard[] | null,
    index: number
  ) => ({
    length: screenWidth,
    offset: screenWidth * index,
    index,
  });

  // 카드 렌더링
  const renderCard = (item: CarouselCard, index: number) => (
    <SlideContainer
      testID={`carousel-card-${index}`}
    >
      {item.component}
    </SlideContainer>
  );

  return (
    <Container testID={testID}>
      <FlatList
        ref={flatListRef}
        data={cards}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => renderCard(item, index)}
        getItemLayout={getItemLayout}
        horizontal={true}
        pagingEnabled={true}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        showsHorizontalScrollIndicator={false}
        snapToInterval={screenWidth}
        decelerationRate="fast"
        initialScrollIndex={initialIndex}
      />

      {/* 페이지 인디케이터 */}
      <PaginationContainer>
        {cards.map((_, index) => (
          <PaginationDot
            key={`dot-${index}`}
            isActive={index === currentIndexRef.current}
            testID={`pagination-dot-${index}`}
          />
        ))}
      </PaginationContainer>
    </Container>
  );
};

export default Carousel;
