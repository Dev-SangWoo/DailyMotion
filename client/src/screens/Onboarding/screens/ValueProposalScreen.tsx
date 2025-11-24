/**
 * 온보딩 스크린 1-3: 가치 제안 (ValueProposal)
 *
 * 설계: 수평 스와이프형 페이지 뷰
 * - 스크린 1: "매일 아침, 고민하지 마세요"
 * - 스크린 2: 앱 기능 소개
 * - 스크린 3: CTA ("내 비서 만들기")
 *
 * desgin.md v3.2 준수:
 * - Display-L 제목 (34px, Bold)
 * - 3D 아이콘 배치
 * - 페이지네이션 인디케이터 (점 3개)
 * - 3D 버튼 스타일 (스크린 3)
 */

import React, { useState, useRef } from 'react';
import {
  ScrollView,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  View,
} from 'react-native';
import styled from 'styled-components/native';
import { theme } from '../../../styles/theme';
import { onboardingTheme } from '../styles/onboardingTheme';
import { OnboardingButton } from '../components/OnboardingButton';

const screenWidth = Dimensions.get('window').width;

/**
 * 프로세션 props type
 */
interface ValueProposalScreenProps {
  navigation: {
    navigate: (screen: string) => void;
    push?: (screen: string) => void;
  };
}

/**
 * OuterContainer - 전체 컨테이너
 */
const OuterContainer = styled.View`
  flex: 1;
  background-color: ${onboardingTheme.colors.ambientNormal};
`;

/**
 * CarouselContainer - 수평 스와이프 컨테이너
 */
const CarouselContainer = styled(ScrollView).attrs({
  horizontal: true,
  pagingEnabled: true,
  showsHorizontalScrollIndicator: false,
  scrollEventThrottle: 16,
  snapToAlignment: 'center',
  snapToInterval: screenWidth,
  decelerationRate: 'fast',
})`
  flex: 1;
`;

/**
 * SlideContainer - 각 슬라이드 컨테이너
 */
const SlideContainer = styled.View`
  width: ${screenWidth}px;
  flex: 1;
  justify-content: center;
  align-items: center;
  padding: ${theme.spacing.lg}px;
`;

/**
 * IconContainer - 아이콘 영역
 */
const IconContainer = styled.View`
  width: 200px;
  height: 200px;
  justify-content: center;
  align-items: center;
  margin-bottom: ${theme.spacing.xl}px;
`;

/**
 * IconText - 큰 아이콘 (이모지 또는 SVG)
 */
const IconText = styled.Text`
  font-size: 100px;
`;

/**
 * TitleText - 제목 (Display-L: 34px, Bold)
 */
const TitleText = styled.Text`
  font-size: ${onboardingTheme.typography.displayL.fontSize}px;
  font-weight: ${onboardingTheme.typography.displayL.fontWeight};
  line-height: ${onboardingTheme.typography.displayL.lineHeight}px;
  color: ${theme.colors.text};
  text-align: center;
  margin-bottom: ${theme.spacing.lg}px;
`;

/**
 * DescriptionText - 설명 텍스트 (Body-L)
 */
const DescriptionText = styled.Text`
  font-size: ${onboardingTheme.typography.bodyL.fontSize}px;
  font-weight: ${onboardingTheme.typography.bodyL.fontWeight};
  color: ${theme.colors.textSecondary};
  text-align: center;
  line-height: ${onboardingTheme.typography.bodyL.lineHeight * 1.5}px;
  padding-horizontal: ${theme.spacing.md}px;
`;

/**
 * PaginationContainer - 페이지네이션 영역
 */
const PaginationContainer = styled.View`
  flex-direction: row;
  justify-content: center;
  align-items: center;
  gap: 8px;
  padding: ${theme.spacing.lg}px ${theme.spacing.md}px;
`;

/**
 * PaginationDot - 페이지네이션 점
 */
const PaginationDot = styled.View<{ isActive: boolean }>`
  height: 6px;
  border-radius: 3px;
  background-color: ${theme.colors.primary};
  opacity: ${(props) => (props.isActive ? 1 : 0.4)};
`;

/**
 * ButtonContainer - CTA 버튼 영역 (스크린 3)
 */
const ButtonContainer = styled.View`
  padding: ${theme.spacing.lg}px ${theme.spacing.md}px;
  gap: ${theme.spacing.md}px;
`;

/**
 * 제안 슬라이드 데이터
 */
const proposalSlides = [
  {
    id: 'slide-1',
    icon: '🔔',
    title: '매일 아침,\n고민하지 마세요.',
    description: '출발 시간부터 도착 예상까지\n모든 것을 자동으로 알려드립니다.',
    showButton: false,
  },
  {
    id: 'slide-2',
    icon: '🚌',
    title: '최적의 경로를\n실시간으로 제안합니다.',
    description: '교통 상황과 환승 확률을 고려하여\n가장 빠르고 안전한 길을 추천합니다.',
    showButton: false,
  },
  {
    id: 'slide-3',
    icon: '🏆',
    title: '지금 바로\n내 비서를 만들어보세요.',
    description: '단 3분이면 설정이 완료됩니다.\n더 이상 지각 걱정은 없습니다!',
    showButton: true,
  },
];

/**
 * ValueProposalScreen 컴포넌트
 *
 * 온보딩의 첫 번째 단계: 앱의 가치 제안
 */
export const ValueProposalScreen: React.FC<ValueProposalScreenProps> = ({
  navigation,
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  /**
   * 스크롤 이벤트 처리
   * 현재 페이지 인덱스 업데이트
   */
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const page = Math.round(contentOffsetX / screenWidth);
    setCurrentPage(page);
  };

  /**
   * CTA 버튼 탭 핸들러
   */
  const handleCTAPress = () => {
    navigation.navigate('PlacesSetup');
  };

  return (
    <OuterContainer>
      {/* 수평 스와이프 카로셀 */}
      <CarouselContainer
        ref={scrollViewRef}
        onMomentumScrollEnd={handleScroll}
        testID="proposal-carousel"
      >
        {proposalSlides.map((slide, index) => (
          <SlideContainer key={slide.id}>
            {/* 아이콘 */}
            <IconContainer testID="proposal-icon-container">
              <IconText>{slide.icon}</IconText>
            </IconContainer>

            {/* 제목 */}
            <TitleText>{slide.title}</TitleText>

            {/* 설명 */}
            <DescriptionText>{slide.description}</DescriptionText>

            {/* CTA 버튼 (스크린 3만) */}
            {slide.showButton && (
              <ButtonContainer>
                <OnboardingButton
                  label="내 비서 만들기"
                  onPress={handleCTAPress}
                  variant="primary"
                  testID="cta-button"
                />
              </ButtonContainer>
            )}
          </SlideContainer>
        ))}
      </CarouselContainer>

      {/* 페이지네이션 인디케이터 */}
      <PaginationContainer>
        {proposalSlides.map((_, index) => (
          <PaginationDot
            key={`pagination-${index}`}
            isActive={index === currentPage}
            testID={`pagination-dot-${index}`}
            style={{
              width: index === currentPage ? 20 : 6,
            }}
          />
        ))}
      </PaginationContainer>
    </OuterContainer>
  );
};

export default ValueProposalScreen;
