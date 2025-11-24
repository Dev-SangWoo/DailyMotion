/**
 * 데일리 브리핑 화면 - IntelligentDashboard 패턴 적용
 *
 * 헌법 준수:
 * - AGENTS.md 프론트엔드 헌법 [제2장] 스타일링 (Styled-components)
 * - AGENTS.md 프론트엔드 헌법 [제3장] 데이터 페칭 (React Query)
 * - AGENTS.md 프론트엔드 헌법 [제2장] 상태 관리 (Zustand)
 * - v3.0 명세서 [Logic 1.1] 출발 알림 / [Logic 1.2] 마지노선 경고
 * - DESIGN.md Phase 5: Ambient Feedback (배경색 알림) 로직
 * - DESIGN.md Phase 7: 예외 상황 처리 (오프라인 배너)
 * - Phase 8.1-8.2: IntelligentDashboard 디자인 적용
 * - OpenAPI 스펙 GET /v1/briefings/commute
 */
import React, { useState, useRef, useEffect } from 'react';
import { ScrollView, TouchableOpacity, View, TextInput, Dimensions, Image, Animated, Text, Modal } from 'react-native';
import styled from 'styled-components/native';
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import apiClient from '../../services/api';
import { theme } from '../../styles/theme';
import { useJourneySelectorStore } from '../../stores/useJourneySelectorStore';
import { useAmbientFeedbackStore, type AmbientFeedbackStatus } from '../../stores/useAmbientFeedbackStore';
import { useAppModeStore, type AppMode } from '../../stores/useAppModeStore';
import { useNetworkStore } from '../../stores/useNetworkStore';
import { useOnboardingData, useOnboardingStore } from '../Onboarding/stores/useOnboardingStore';
import { JourneySelector, HeroCard, WeatherCard, AlternativePathCard, Carousel, StepCards, OfflineBanner } from './components';
import { BusIcon } from '../../components/icons/BusIcon';
import useRealTimeTracking from '../../hooks/useRealTimeTracking';
import { useTrackingState, useTrackingActions } from '../../stores/useTrackingStore';
import { defineLocationTrackingTask } from '../../services/locationTrackingService';
import { formatTime } from '../../services/routeTrackingService';
import { useGetWeatherQuery, getWeatherDescription, getWeatherRecommendations, getWeatherIcon } from '../../hooks/queries/useGetWeatherQuery';
import { useNotificationActionStore } from '../../stores/useNotificationActionStore';

// CTA 카드 아이콘 이미지
const WeatherIcon = require('../../assets/Weather.png');
const NewPathIcon = require('../../assets/NewPath.png');
const WarningIcon = require('../../assets/Warning.png');
const LaterIcon = require('../../assets/Later.png');

// 날씨 아이콘 이모지 변환 함수
const getWeatherIconEmoji = (condition: string): string => {
  const iconMap: Record<string, string> = {
    'clear': '☀️',
    'cloudy': '☁️',
    'rainy': '🌧️',
    'snowy': '🌨️',
    'thunderstorm': '⛈️',
    'fog': '🌫️',
  };
  return iconMap[condition] || '☀️';
};
import { RecommendedRoute } from '../../services/routeSearchService';
import { useGetAllDisasterAlertsQuery, type DisasterAlert } from '../../hooks/queries/useGetDisasterAlertsQuery';

// Styled-components: IntelligentDashboard 디자인 패턴 적용
// 헌법 제2장 준수: 의미론적 이름, theme 기반 스타일링

interface OuterContainerProps {
  ambientStatus?: AmbientFeedbackStatus;
}

const getBackgroundColor = (status?: AmbientFeedbackStatus): string => {
  switch (status) {
    case 'warning':
      return '#FFF3E0'; // 라이트 주황
    case 'alert':
      return '#FFEBEE'; // 라이트 빨강
    case 'normal':
    default:
      return '#F0F7FF'; // 라이트 블루
  }
};

const OuterContainer = styled.View<OuterContainerProps>`
  flex: 1;
  background-color: ${(props) => getBackgroundColor(props.ambientStatus)};
`;

const ScrollContainer = styled(ScrollView)`
  flex: 1;
`;

const Container = styled.View`
  padding: ${theme.spacing.md}px;
  gap: ${theme.spacing.md}px;
`;

const LoadingContainer = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
  padding: ${theme.spacing.xl}px;
`;

const LoadingText = styled.Text`
  font-size: ${theme.fonts.sizes.lg}px;
  color: ${theme.colors.textSecondary};
  text-align: center;
  font-weight: 600;
`;

// Phase 8.1: 검색 바 (축소/확장 가능)
const SearchBarContainer = styled.View`
  background-color: white;
  border-radius: ${theme.borderRadius.lg}px;
  overflow: hidden;
  shadow-color: #000;
  shadow-opacity: 0.1;
  shadow-radius: 4px;
  elevation: 2;
`;

// 축소된 상태
const CollapsedSearchBar = styled.View`
  padding: ${theme.spacing.md}px ${theme.spacing.md}px ${theme.spacing.xs}px ${theme.spacing.md}px;
  gap: ${theme.spacing.sm}px;
`;

const JourneyTabsContainer = styled.View`
  flex-direction: row;
  gap: ${theme.spacing.sm}px;
`;

const JourneyTab = styled.View<{ isActive: boolean }>`
  flex: 1;
  background-color: ${(props) => props.isActive ? '#0066FF' : '#F0F0F0'};
  border-radius: ${theme.borderRadius.md}px;
  padding: ${theme.spacing.sm}px;
  justify-content: center;
  align-items: center;
  height: 40px;
`;

const JourneyTabText = styled.Text<{ isActive: boolean }>`
  color: ${(props) => props.isActive ? 'white' : '#666'};
  font-size: ${theme.fonts.sizes.sm}px;
  font-weight: 600;
`;

// 확장 버튼
const ToggleButton = styled.View`
  width: 100%;
  padding: ${theme.spacing.xs}px ${theme.spacing.sm}px;
  justify-content: center;
  align-items: center;
`;

const ToggleButtonText = styled.Text`
  color: #999;
  font-size: 16px;
  font-weight: 600;
`;

// 확장된 상태
const ExpandedSearchBar = styled.View`
  padding: ${theme.spacing.md}px ${theme.spacing.lg}px ${theme.spacing.sm}px ${theme.spacing.lg}px;
  gap: ${theme.spacing.xs}px;
`;

const SearchInputContainer = styled.View`
  flex-direction: row;
  gap: ${theme.spacing.md}px;
  align-items: center;
  margin-bottom: ${theme.spacing.xs}px;
`;

const SearchInputWrapper = styled.View`
  flex: 1;
  border-width: 1px;
  border-color: #E0E0E0;
  border-radius: ${theme.borderRadius.md}px;
  padding: ${theme.spacing.sm}px ${theme.spacing.md}px;
  background-color: #F8F8F8;
`;

const SearchInput = styled(TextInput)`
  font-size: ${theme.fonts.sizes.sm}px;
  color: ${theme.colors.text};
`;

const ArrowIcon = styled.View`
  width: 28px;
  height: 28px;
  background-color: #0066FF;
  border-radius: ${theme.borderRadius.md}px;
  justify-content: center;
  align-items: center;
`;

const ArrowIconText = styled.Text`
  color: white;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: -0.5px;
`;

// 즐겨찾기 목록
const FavoritesList = styled.View`
  flex-direction: row;
  gap: ${theme.spacing.md}px;
  margin-top: ${theme.spacing.xs}px;
`;

const FavoriteItem = styled.View`
  align-items: center;
  gap: ${theme.spacing.sm}px;
`;

const FavoriteIcon = styled.View`
  width: 50px;
  height: 50px;
  background-color: #E8F0FF;
  border-radius: 25px;
  justify-content: center;
  align-items: center;
`;

const FavoriteIconText = styled.Text`
  font-size: 24px;
`;

const FavoriteName = styled.Text`
  font-size: ${theme.fonts.sizes.xs}px;
  color: ${theme.colors.text};
  font-weight: 500;
`;

// Phase 8.2: CTA 카드 (캐러셀)
const CardBase = styled.View<{ bgGradient: string }>`
  background-color: ${(props) => props.bgGradient};
  border-radius: ${theme.borderRadius.xl}px;
  padding: ${theme.spacing.lg}px;
  height: 350px;
  shadow-color: #000;
  shadow-opacity: 0.15;
  shadow-radius: 8px;
  elevation: 4;
  justify-content: space-between;
  position: relative;
  overflow: hidden;
`;

const CardIconRight = styled.View`
  width: 30%;
  height: 100%;
  flex-direction: row;
  justify-content: flex-end;
  align-items: center;
  padding-right: ${theme.spacing.lg}px;
  align-self: flex-end;
`;

const CardHeader = styled.View`
  flex-direction: row;
  gap: ${theme.spacing.md}px;
  align-items: flex-start;
  flex: 1;
`;

const CardIconBox = styled.View`
  width: 60px;
  height: 60px;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: ${theme.borderRadius.lg}px;
  justify-content: center;
  align-items: center;
  overflow: hidden;
`;

const CardIconImage = styled.Image`
  width: 100%;
  height: 100%;
  resize-mode: contain;
`;

const CardTitle = styled.Text`
  color: white;
  font-size: ${theme.fonts.sizes.lg}px;
  font-weight: 700;
  margin-bottom: ${theme.spacing.sm}px;
`;

const CardContent = styled.View`
  gap: ${theme.spacing.sm}px;
`;

const CardText = styled.Text`
  color: white;
  font-size: ${theme.fonts.sizes.sm}px;
  line-height: ${theme.fonts.sizes.sm * 1.5}px;
`;

// 날씨 카드 전용 스타일
const WeatherCardContainer = styled.View`
  width: 100%;
  height: 100%;
  flex-direction: column;
  justify-content: space-between;
`;

const WeatherCardHeader = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.md}px;
`;

const WeatherCardTitle = styled.Text`
  color: white;
  font-size: ${theme.fonts.sizes.lg}px;
  font-weight: 700;
`;

const WeatherCardContent = styled.View`
  flex-direction: row;
  gap: ${theme.spacing.md}px;
  flex: 1;
`;

const WeatherLocationBox = styled.View`
  flex: 1;
  background-color: rgba(255, 255, 255, 0.15);
  border-radius: ${theme.borderRadius.md}px;
  padding: ${theme.spacing.md}px;
  justify-content: center;
  align-items: center;
`;

const WeatherLocationName = styled.Text`
  color: white;
  font-size: ${theme.fonts.sizes.md}px;
  font-weight: 700;
  margin-bottom: ${theme.spacing.xs}px;
`;

const WeatherTemperature = styled.Text`
  color: white;
  font-size: ${theme.fonts.sizes.xxl}px;
  font-weight: 800;
  margin-bottom: ${theme.spacing.xs}px;
`;

const WeatherDescription = styled.Text`
  color: white;
  font-size: ${theme.fonts.sizes.sm}px;
  font-weight: 600;
  text-align: center;
  line-height: ${theme.fonts.sizes.sm * 1.4}px;
`;

const CardBadge = styled.View`
  background-color: rgba(255, 255, 255, 0.25);
  border-radius: ${theme.spacing.sm}px;
  padding-horizontal: ${theme.spacing.xs}px;
  padding-vertical: ${theme.spacing.xs / 2}px;
`;

const CardBadgeText = styled.Text`
  color: white;
  font-size: ${theme.fonts.sizes.xs}px;
  font-weight: 600;
`;

// Departure Card 전용 스타일 - 3-Layer 리디자인 (CTAGuide.md 기반)
// Layer 1: 헤더 (20%) - 목적지 + 도착 시간
// Layer 2: 타임라인 (45%) - 진행 상황 + 버스 아이콘
// Layer 3: 넥스트 액션 (35%) - 다음 환승 정보

const DepartureCardContainer = styled.View`
  width: 100%;
  height: 100%;
  flex-direction: column;
  justify-content: space-between;
`;

// ========== Layer 1: Header (15%) ==========
const Layer1Header = styled.View`
  flex: 0;
  height: 15%;
  min-height: 48px;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 0 ${theme.spacing.xs}px ${theme.spacing.md}px ${theme.spacing.xs}px;
  border-bottom-width: 1px;
  border-bottom-color: rgba(255, 255, 255, 0.2);
  z-index: 10;
`;

const Layer1GoalSection = styled.View`
  flex: 1;
  justify-content: center;
  padding-left: 0;
`;

const Layer1GoalLabel = styled.Text`
  color: rgba(255, 255, 255, 0.9);
  font-size: ${theme.fonts.sizes.xs}px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: ${theme.spacing.xs}px;
`;

const Layer1GoalName = styled.Text`
  color: white;
  font-size: ${theme.fonts.sizes.lg || 18}px;
  font-weight: 700;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
`;

const Layer1JourneyName = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${theme.spacing.xs}px;
`;

const Layer1JourneyIcon = styled.Text`
  font-size: ${theme.fonts.sizes.lg || 18}px;
`;

const Layer1JourneyText = styled.Text`
  color: white;
  font-size: ${theme.fonts.sizes.xl || 20}px;
  font-weight: 700;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
`;

const Layer1TimeSection = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
  gap: ${theme.spacing.sm}px;
`;

const Layer1ArrivalTime = styled.Text`
  color: white;
  font-size: ${theme.fonts.sizes.xl || 24}px;
  font-weight: 800;
  letter-spacing: -0.5px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
`;

const Layer1ArrivalLabel = styled.Text`
  color: rgba(255, 255, 255, 0.8);
  font-size: ${theme.fonts.sizes.xs}px;
  font-weight: 500;
  margin-top: ${theme.spacing.xs}px;
`;

const Layer1ArrivalLabelRow = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${theme.spacing.xs}px;
  margin-top: ${theme.spacing.xs}px;
`;

const Layer1TimeText = styled.Text`
  color: white;
  font-size: ${theme.fonts.sizes.md || 16}px;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
`;

const Layer1StatusBadge = styled.View`
  background-color: rgba(76, 175, 80, 0.2);
  border: 1px solid rgba(76, 175, 80, 0.5);
  border-radius: 12px;
  padding: 4px 8px;
  align-self: flex-end;
`;

const Layer1StatusText = styled.Text`
  color: #4CAF50;
  font-size: ${theme.fonts.sizes.xs}px;
  font-weight: 600;
`;

// ========== Layer 2: Timeline (40%) ==========
const Layer2Timeline = styled.View`
  flex: 0;
  height: 40%;
  min-height: 128px;
  justify-content: flex-start;
  align-items: center;
  padding: ${theme.spacing.md}px ${theme.spacing.lg}px;
  gap: ${theme.spacing.sm}px;
  overflow: hidden;
`;

const ProgressBarContainer = styled.View`
  width: 100%;
  height: 8px;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: ${theme.spacing.xs}px;
  position: relative;
`;

interface ProgressBarProps {
  progress: number; // 0-100
  color?: string;
  left?: number; // 시작 위치 (%)
}

const ProgressBar = styled.View<ProgressBarProps>`
  height: 100%;
  width: ${(props) => props.progress}%;
  background-color: ${(props) => props.color || 'rgba(255, 255, 255, 0.9)'};
  border-radius: 4px;
  position: absolute;
  left: ${(props) => props.left || 0}%;
`;

const BusIconWrapper = styled.View`
  align-items: center;
  margin-bottom: ${theme.spacing.md}px;
`;

const Layer2ProgressLabel = styled.Text`
  color: rgba(255, 255, 255, 0.7);
  font-size: ${theme.fonts.sizes.xs || 12}px;
  font-weight: 500;
  text-align: center;
  margin: 0;
  padding: 0;
  line-height: ${theme.fonts.sizes.xs || 12}px;
  min-height: ${theme.fonts.sizes.xs || 12}px;
`;

const Layer2ProgressText = styled.Text`
  color: rgba(255, 255, 255, 1);
  font-size: ${theme.fonts.sizes.md || 16}px;
  font-weight: 700;
  text-align: center;
  margin: 0;
  padding: 0;
  margin-bottom: ${theme.spacing.sm}px;
  line-height: ${theme.fonts.sizes.md || 16}px;
`;

const Layer2ProgressSubText = styled.Text`
  color: white;
  font-size: 13px;
  font-weight: 600;
  text-align: center;
  margin-top: ${theme.spacing.xs / 2}px;
  margin-bottom: 0;
  width: 100%;
  padding-horizontal: ${theme.spacing.sm}px;
  padding-vertical: ${theme.spacing.xs}px;
  background-color: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
`;

// ========== Layer 3: Next Action (35%) ==========
const Layer3NextAction = styled.View`
  flex: 0;
  height: 35%;
  min-height: 112px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: ${theme.borderRadius.md}px;
  padding: ${theme.spacing.md}px;
  margin: ${theme.spacing.sm}px;
  justify-content: flex-start;
`;

const Layer3TitleContainer = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${theme.spacing.sm}px;
  margin-bottom: ${theme.spacing.xs}px;
`;

const Layer3Title = styled.Text`
  color: rgba(255, 255, 255, 0.9);
  font-size: ${theme.fonts.sizes.xs}px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const Layer3Content = styled.View`
  gap: ${theme.spacing.xs}px;
`;

const Layer3TransitInfo = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${theme.spacing.sm}px;
  flex-wrap: wrap;
`;

const Layer3TransitIcon = styled.Text`
  font-size: ${theme.fonts.sizes.xl || 24}px;
`;

const Layer3TransitNumber = styled.Text`
  color: white;
  font-size: ${theme.fonts.sizes.lg || 18}px;
  font-weight: 700;
`;

const Layer3TransitTime = styled.Text`
  color: rgba(255, 255, 255, 0.95);
  font-size: ${theme.fonts.sizes.md || 16}px;
  font-weight: 700;
  margin-left: auto;
`;

const Layer3TransitDetail = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: ${theme.spacing.sm}px;
  margin-top: ${theme.spacing.xs}px;
`;

const Layer3TransitDetailText = styled.Text`
  color: rgba(255, 255, 255, 0.7);
  font-size: ${theme.fonts.sizes.xs}px;
  font-weight: 500;
`;

const Layer3TransitDetailRecommend = styled.Text`
  color: white;
  font-size: ${theme.fonts.sizes.xs}px;
  font-weight: 700;
  background-color: rgba(0, 0, 0, 0.2);
  padding: 4px 8px;
  border-radius: 4px;
`;

const Layer3WalkBadge = styled.View`
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding-horizontal: ${theme.spacing.sm}px;
  padding-vertical: 4px;
  align-self: flex-start;
`;

const Layer3WalkBadgeText = styled.Text`
  color: white;
  font-size: ${theme.fonts.sizes.xs || 12}px;
  font-weight: 600;
`;

const Layer3TransitTip = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${theme.spacing.xs}px;
  margin-top: ${theme.spacing.xs}px;
`;

const Layer3TransitTipText = styled.Text`
  color: white;
  font-size: 12px;
  font-weight: 700;
  background-color: rgba(0, 0, 0, 0.2);
  padding: 4px 8px;
  border-radius: 4px;
`;

const Layer3CrowdLevel = styled.View`
  background-color: rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 4px 8px;
`;

const Layer3CrowdLevelText = styled.Text`
  color: rgba(255, 255, 255, 0.8);
  font-size: ${theme.fonts.sizes.xs}px;
  font-weight: 500;
`;

// Phase 8.3: 여정 세부 사항 카드
const JourneyDetailsCard = styled.View`
  background-color: white;
  border-radius: ${theme.borderRadius.lg}px;
  overflow: hidden;
  shadow-color: #000;
  shadow-opacity: 0.1;
  shadow-radius: 6px;
  elevation: 3;
`;

const JourneyHeaderBar = styled.View`
  background-color: #0066FF;
  padding: ${theme.spacing.lg}px;
  flex-direction: row;
  justify-content: space-between;
`;

const JourneyHeaderText = styled.Text<{ isSubtitle?: boolean }>`
  color: white;
  font-size: ${(props) => props.isSubtitle ? theme.fonts.sizes.xs : theme.fonts.sizes.lg}px;
  font-weight: ${(props) => props.isSubtitle ? '400' : '700'};
`;

// JourneyStepsContainer는 ref를 사용하기 위해 일반 ScrollView로 변경
// 스타일은 인라인으로 적용

// JourneyStepsContainer의 contentContainerStyle을 위한 스타일
const JourneyStepsContent = styled.View`
  padding-bottom: ${theme.spacing.md}px;
`;

const StepItem = styled.View`
  margin-bottom: ${theme.spacing.md}px;
  flex-direction: row;
  gap: ${theme.spacing.md}px;
`;

const StepIconContainer = styled.View`
  width: 50px;
  height: 50px;
  border-radius: 25px;
  background-color: #E8E8E8;
  justify-content: center;
  align-items: center;
  shadow-color: #999;
  shadow-opacity: 0.1;
  shadow-radius: 4px;
  elevation: 1;
`;

const StepContentBox = styled.View`
  flex: 1;
  background-color: #F8F8F8;
  border-radius: ${theme.borderRadius.md}px;
  padding: ${theme.spacing.md}px;
`;

const StepTitle = styled.Text`
  color: ${theme.colors.text};
  font-size: ${theme.fonts.sizes.sm}px;
  font-weight: 600;
`;

const StepDescription = styled.Text`
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fonts.sizes.xs}px;
  margin-top: 4px;
`;

// Quick Actions Grid
const QuickActionsGrid = styled.View`
  flex-direction: row;
  gap: ${theme.spacing.md}px;
`;

const QuickActionButton = styled.View`
  flex: 1;
  background-color: #0066FF;
  border-radius: ${theme.borderRadius.lg}px;
  padding: ${theme.spacing.md}px;
  height: 56px;
  justify-content: center;
  align-items: center;
  shadow-color: #0066FF;
  shadow-opacity: 0.3;
  shadow-radius: 6px;
  elevation: 3;
`;

const QuickActionText = styled.Text`
  color: white;
  font-size: ${theme.fonts.sizes.md}px;
  font-weight: 600;
`;

// Footer
const FooterContainer = styled.View`
  padding: ${theme.spacing.lg}px;
  align-items: center;
  gap: ${theme.spacing.sm}px;
`;

const FooterText = styled.Text`
  font-size: ${theme.fonts.sizes.xs}px;
  color: ${theme.colors.textSecondary};
  text-align: center;
`;

// 새로고침 버튼 (오른쪽 아래 고정)
const RefreshButton = styled(TouchableOpacity)`
  position: absolute;
  bottom: ${theme.spacing.lg}px;
  right: ${theme.spacing.lg}px;
  width: 56px;
  height: 56px;
  background-color: white;
  border-radius: 28px;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.2;
  shadow-radius: 4px;
  elevation: 4;
`;

const RefreshButtonIconWrapper = styled.View`
  align-items: center;
  justify-content: center;
`;

const RefreshButtonCountdown = styled.Text`
  position: absolute;
  top: 0;
  right: 0;
  color: #FF5722;
  font-size: ${theme.fonts.sizes.sm}px;
  font-weight: 700;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 10px;
  min-width: 24px;
  height: 24px;
  text-align: center;
  line-height: 24px;
  padding-horizontal: 4px;
`;

// 경로 선택 모달 스타일
const ModalOverlay = styled.View`
  flex: 1;
  background-color: rgba(0, 0, 0, 0.5);
  justify-content: center;
  align-items: center;
`;

const ModalContainer = styled.View`
  background-color: white;
  border-radius: ${theme.borderRadius.xl}px;
  padding: ${theme.spacing.lg}px;
  width: 85%;
  max-width: 400px;
  shadow-color: #000;
  shadow-offset: 0px 4px;
  shadow-opacity: 0.3;
  shadow-radius: 8px;
  elevation: 8;
`;

const ModalTitle = styled.Text`
  font-size: ${theme.fonts.sizes.lg}px;
  font-weight: 700;
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.md}px;
  text-align: center;
`;

const ModalMessage = styled.Text`
  font-size: ${theme.fonts.sizes.md}px;
  color: ${theme.colors.textSecondary};
  margin-bottom: ${theme.spacing.lg}px;
  text-align: center;
  line-height: ${theme.fonts.sizes.md * 1.5}px;
`;

const OptionContainer = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  padding: ${theme.spacing.md}px;
  margin-bottom: ${theme.spacing.sm}px;
  border-radius: ${theme.borderRadius.md}px;
  background-color: ${theme.colors.backgroundSecondary};
`;

const Checkbox = styled.View<{ checked: boolean }>`
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border-width: 2px;
  border-color: ${(props) => props.checked ? theme.colors.primary : theme.colors.border};
  background-color: ${(props) => props.checked ? theme.colors.primary : 'transparent'};
  justify-content: center;
  align-items: center;
  margin-right: ${theme.spacing.md}px;
`;

const Checkmark = styled.Text`
  color: white;
  font-size: 14px;
  font-weight: 700;
`;

const OptionLabel = styled.Text`
  font-size: ${theme.fonts.sizes.md}px;
  font-weight: 600;
  color: ${theme.colors.text};
  flex: 1;
`;

const OptionDescription = styled.Text`
  font-size: ${theme.fonts.sizes.xs}px;
  color: ${theme.colors.textSecondary};
  margin-top: ${theme.spacing.xs / 2}px;
`;

const ModalButtonContainer = styled.View`
  flex-direction: row;
  gap: ${theme.spacing.md}px;
  margin-top: ${theme.spacing.lg}px;
`;

const ModalButton = styled.TouchableOpacity<{ variant: 'primary' | 'secondary' }>`
  flex: 1;
  padding: ${theme.spacing.md}px;
  border-radius: ${theme.borderRadius.md}px;
  background-color: ${(props) => props.variant === 'primary' ? theme.colors.primary : theme.colors.backgroundSecondary};
  align-items: center;
  justify-content: center;
`;

const ModalButtonText = styled.Text<{ variant: 'primary' | 'secondary' }>`
  font-size: ${theme.fonts.sizes.md}px;
  font-weight: 600;
  color: ${(props) => props.variant === 'primary' ? 'white' : theme.colors.text};
`;

// OpenAPI 스펙에 맞는 응답 타입
interface CommuteBriefingResponse {
  data: {
    alertType: 'GO_NOW' | 'LAST_CHANCE' | 'NO_ACTION';
    message: string;
    recommendedTransport: {
      type: string;
      name: string;
      departureInMinutes: number;
    };
  };
}

interface DailyBriefingScreenProps {
  onHeaderRightChange?: (component: React.ReactNode) => void;
}

const DailyBriefingScreen: React.FC<DailyBriefingScreenProps> = ({ onHeaderRightChange }) => {
  const navigation = useNavigation<StackNavigationProp<any>>();

  // Phase 8.0: 로컬 상태 관리 (IntelligentDashboard 패턴)
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isSearchBarExpanded, setIsSearchBarExpanded] = useState(false);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [selectedJourneyIndex, setSelectedJourneyIndex] = useState(0); // 현재 선택된 여정 인덱스
  
  // 캐러셀 ScrollView ref
  const carouselScrollViewRef = useRef<ScrollView>(null);
  
  // 경로 선택 모달 상태
  const [isRouteSelectModalVisible, setIsRouteSelectModalVisible] = useState(false);
  const [routeSelectOption, setRouteSelectOption] = useState<'today'>('today');

  // 날씨 상세 정보 모달 상태
  const [isWeatherModalVisible, setIsWeatherModalVisible] = useState(false);

  // 지연 모달 상태
  const [isDelayModalVisible, setIsDelayModalVisible] = useState(false);

  // 택시 추천 모달 상태
  const [isTaxiModalVisible, setIsTaxiModalVisible] = useState(false);

  // 알림 액션 처리
  const pendingAction = useNotificationActionStore((state) => state.pendingAction);
  const clearPendingAction = useNotificationActionStore((state) => state.clearPendingAction);

  // Bus 애니메이션 주석 처리 (나중에 추가 예정)
  // const busTranslateX = useRef(new Animated.Value(200)).current; // 화면 밖 오른쪽에서 시작
  // const busTranslateY = useRef(new Animated.Value(-100)).current; // 화면 밖 위에서 시작

  // useEffect(() => {
  //   // 무한 반복 애니메이션
  //   const animateBus = () => {
  //     // 초기 위치로 리셋 (화면 밖)
  //     busTranslateX.setValue(200);
  //     busTranslateY.setValue(-100);

  //     Animated.parallel([
  //       Animated.timing(busTranslateX, {
  //         toValue: 0, // 현재 위치로 이동
  //         duration: 3000,
  //         useNativeDriver: true,
  //       }),
  //       Animated.timing(busTranslateY, {
  //         toValue: 0, // 현재 위치로 이동
  //         duration: 3000,
  //         useNativeDriver: true,
  //       }),
  //     ]).start(() => {
  //       // 애니메이션 완료 후 즉시 다시 시작
  //       animateBus();
  //     });
  //   };

  //   animateBus();
  // }, []);

  // 온보딩에서 설정한 장소 데이터 가져오기
  const { places, pathSelection, schedule, goalTime } = useOnboardingData();
  const onboardingStore = useOnboardingStore();

  // 실시간 추적 상태 가져오기
  const trackingState = useTrackingState();
  const trackingActions = useTrackingActions();

  // 🆕 실시간 경로 추적 (hooks 순서 보장을 위해 여기서 선언)
  // selectedJourneyInfo는 나중에 계산되므로, useEffect로 업데이트
  const [trackingRoute, setTrackingRoute] = React.useState<RecommendedRoute | null>(null);
  const [trackingEnabled, setTrackingEnabled] = React.useState(false);
  
  useRealTimeTracking(trackingRoute, {
    enabled: trackingEnabled,
    onStatusChange: (status) => {
      trackingActions.updateTrackingState(status);
    },
  });

  // 🎭 발표용 목업 데이터 생성 함수들
  const createMockJourneys = () => {
    return [
      {
        id: 'mock-depart-home',
        placeId: 'home',
        placeName: '집',
        placeIcon: '🏠',
        placeAddress: '고암길 251',
        placeX: '127.072042',
        placeY: '37.837996',
        type: 'depart' as const,
        time: '09:00',
      },
      {
        id: 'mock-arrive-work',
        placeId: 'work',
        placeName: '회사',
        placeIcon: '🏢',
        placeAddress: '의정부 CGV',
        placeX: '127.045076',
        placeY: '37.774827',
        type: 'arrive' as const,
        time: '10:00',
      },
      {
        id: 'mock-depart-work',
        placeId: 'work',
        placeName: '회사',
        placeIcon: '🏢',
        placeAddress: '의정부 CGV',
        placeX: '127.045076',
        placeY: '37.774827',
        type: 'depart' as const,
        time: '18:00',
      },
      {
        id: 'mock-arrive-home',
        placeId: 'home',
        placeName: '집',
        placeIcon: '🏠',
        placeAddress: '고암길 251',
        placeX: '127.072042',
        placeY: '37.837996',
        type: 'arrive' as const,
        time: '19:00',
      },
    ];
  };

  const createMockPath = (isHomeToWork: boolean) => {
    // 집->회사: 도보 -> 버스 -> 도보
    // 회사->집: 도보 -> 지하철 -> 도보
    if (isHomeToWork) {
      return {
        id: 'mock-path-home-work',
        totalTime: 3600, // 60분
        totalTimeMinutes: 60,
        totalDistance: 15000, // 15km
        totalDistanceKm: '15.0',
        transferCount: 0,
        fare: 1500,
        subPath: [
          {
            trafficType: 3, // 도보
            distance: 500,
            sectionTime: 360, // 6분
            startName: '고암길 251',
            endName: '덕정고.한국병원',
          },
          {
            trafficType: 2, // 버스
            distance: 14000,
            sectionTime: 3000, // 50분
            stationCount: 30,
            lane: [{ busNo: '80', type: 1 }],
            startName: '덕정고.한국병원',
            endName: '의정부 CGV',
          },
          {
            trafficType: 3, // 도보
            distance: 500,
            sectionTime: 240, // 4분
            startName: '의정부 CGV',
            endName: '의정부 CGV',
          },
        ],
      };
    } else {
      return {
        id: 'mock-path-work-home',
        totalTime: 3300, // 55분
        totalTimeMinutes: 55,
        totalDistance: 14000, // 14km
        totalDistanceKm: '14.0',
        transferCount: 0,
        fare: 1500,
        subPath: [
          {
            trafficType: 3, // 도보
            distance: 400,
            sectionTime: 300, // 5분
            startName: '의정부 CGV',
            endName: '의정부역',
          },
          {
            trafficType: 1, // 지하철
            distance: 13000,
            sectionTime: 2700, // 45분
            stationCount: 20,
            lane: [{ subwayName: '1호선', subwayCode: 1 }],
            startName: '의정부역',
            endName: '덕정역',
          },
          {
            trafficType: 3, // 도보
            distance: 600,
            sectionTime: 300, // 5분
            startName: '덕정역',
            endName: '고암길 251',
          },
        ],
      };
    }
  };

  const createMockJourneyTabs = () => {
    return [
      {
        id: 'mock-depart-home|mock-arrive-work',
        label: '집→회사',
        icon: '🏠',
      },
      {
        id: 'mock-depart-work|mock-arrive-home',
        label: '회사→집',
        icon: '🏢',
      },
    ];
  };

  // 🎭 발표용 목업 데이터 사용 여부 결정
  const USE_MOCK_DATA = true; // 발표용: true, 실제 사용: false


  // 백그라운드 위치 추적 태스크 초기화 (앱 시작 시 한 번만)
  React.useEffect(() => {
    const initializeTracking = async () => {
      try {
        await defineLocationTrackingTask();
      } catch (error) {
        // 위치 추적 태스크 초기화 실패 (조용히 처리)
      }
    };
    initializeTracking();
  }, []);

  // 현재 요일 가져오기 (MON, TUE, WED, THU, FRI, SAT, SUN)
  const getCurrentDayOfWeek = (): string => {
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    return days[new Date().getDay()];
  };

  // 온보딩에서 설정한 여정들을 요일별로 필터링하여 탭으로 변환
  const journeyTabs = React.useMemo(() => {
    const journeysToUse = USE_MOCK_DATA && (!pathSelection.journeys || pathSelection.journeys.length === 0)
      ? createMockJourneys()
      : pathSelection.journeys;

    if (!journeysToUse || journeysToUse.length === 0) {
      return [];
    }

    const currentDay = getCurrentDayOfWeek();
    const scheduledDays = schedule.daysOfWeek || [];

    // 🎭 목업 데이터 사용 시 스케줄 체크 건너뛰기
    // 오늘 요일이 스케줄에 포함되어 있지 않으면 빈 배열 반환
    if (!USE_MOCK_DATA && !scheduledDays.includes(currentDay)) {
      return [];
    }

    const tabs: Array<{ id: string; label: string; icon: string }> = [];
    const segments = journeysToUse;

    // segments를 2개씩 묶어서 (출발 -> 도착) 여정 그룹으로 변환
    for (let i = 0; i < segments.length; i += 2) {
      const depart = segments[i];
      const arrive = segments[i + 1];

      if (depart && arrive && depart.type === 'depart' && arrive.type === 'arrive') {
        // 출발지와 도착지 이름 가져오기
        let originName = depart.placeName;
        let destName = arrive.placeName;

        // 3글자 넘으면 "..." 처리
        const truncateName = (name: string, maxLength: number = 3): string => {
          if (name.length <= maxLength) return name;
          return name.substring(0, maxLength) + '...';
        };

        originName = truncateName(originName);
        destName = truncateName(destName);

        // 여정 라벨: "집->회사" 형식
        const label = `${originName}→${destName}`;
        const tabId = `${depart.id}|${arrive.id}`;

        tabs.push({
          id: tabId,
          label,
          icon: depart.placeIcon || '📍',
        });
      }
    }

    return tabs;
  }, [pathSelection.journeys, schedule.daysOfWeek, USE_MOCK_DATA]);

  // 즐겨찾기 목록: 온보딩에서 설정한 장소들 (집 주소 + 자주 가는 장소들)
  const favorites = React.useMemo(() => {
    const favoriteList: Array<{ id: string; name: string; icon: string }> = [];
    
    // 집 주소 추가
    if (places.homeAddress) {
      if (typeof places.homeAddress === 'object' && places.homeAddress.name) {
        favoriteList.push({
          id: 'home',
          name: places.homeAddress.name,
          icon: places.homeAddress.icon || '🏠',
        });
      } else if (typeof places.homeAddress === 'string') {
        favoriteList.push({
          id: 'home',
          name: places.homeAddress,
          icon: '🏠',
        });
      }
    }
    
    // 자주 가는 장소들 추가
    places.favoritePlaces.forEach((place, index) => {
      favoriteList.push({
        id: `favorite-${index}`,
        name: place.name,
        icon: place.icon || '📍',
      });
    });
    
    return favoriteList;
  }, [places]);

  // Zustand Store: UI 상태 관리 (헌법 제2장 준수)
  const { isExpanded, setExpanded, toggleExpanded, setSelectedTab } =
    useJourneySelectorStore();

  // Phase 5: Ambient Feedback Store - 배경색 상태 관리
  const { status: ambientStatus, setStatus: setAmbientStatus } =
    useAmbientFeedbackStore();

  // Phase 6: App Mode Store - 앱 상태 관리 (Briefing/Explore Mode)
  const { appMode, updateAppMode } = useAppModeStore();

  // Phase 7: Network Store - 네트워크 상태 관리 (오프라인 감지)
  const { isOffline, lastUpdated, setOffline, setLastUpdated } =
    useNetworkStore();

  // React Query useQuery (헌법 제3장 준수)
  // 서버 상태 (API 데이터)는 React Query로 관리 - Zustand에는 절대 저장 금지
  // enabled 옵션을 명시적으로 설정하여 hooks 순서 보장
  const { data, isLoading, isError } = useQuery({
    queryKey: ['commuteBriefing'],
    queryFn: async (): Promise<CommuteBriefingResponse> => {
      const response = await apiClient.get('/briefings/commute');
      return response.data;
    },
    enabled: true, // 항상 활성화 (hooks 순서 보장)
  });

  // Phase 6: 시간 기반 앱 모드 자동 전환 (useEffect)
  // 시간이 변경될 때마다 현재 시간에 기반해 모드를 업데이트
  React.useEffect(() => {
    // 초기 모드 설정
    updateAppMode();

    // 시간 변화 감지를 위한 인터벌 (1분마다 모드 체크)
    const modeCheckInterval = setInterval(() => {
      updateAppMode();
    }, 60000); // 60초마다 체크

    return () => clearInterval(modeCheckInterval);
  }, [updateAppMode]);

  // Phase 6: 앱 모드에 따라 JourneySelector 상태 설정
  // - Briefing Mode: Collapsed (isExpanded = false)
  // - Explore Mode: Expanded (isExpanded = true)
  React.useEffect(() => {
    if (appMode === 'briefing') {
      // Briefing Mode: 여정 선택기는 collapsed 상태
      setExpanded(false);
    } else {
      // Explore Mode: 여정 선택기는 expanded 상태
      setExpanded(true);
    }
  }, [appMode]); // setExpanded는 Zustand setter이므로 의존성에서 제거

  // Phase 5: alertType에 따라 배경색 상태 업데이트
  React.useEffect(() => {
    if (data?.data?.alertType) {
      switch (data.data.alertType) {
        case 'GO_NOW':
          // Logic 3.1: 정상 상태 (파란색)
          setAmbientStatus('normal');
          break;
        case 'LAST_CHANCE':
          // Logic 3.1: 지연 감지 시뮬레이션 (주황색)
          setAmbientStatus('warning');
          break;
        case 'NO_ACTION':
          // 정상 상태 (파란색)
          setAmbientStatus('normal');
          break;
      }
    }
  }, [data?.data?.alertType]); // setAmbientStatus는 Zustand setter이므로 의존성에서 제거

  // Phase 7: 네트워크 상태 모니터링
  // GPS/모바일 데이터 30초 이상 수신 불가 시 오프라인 표시
  React.useEffect(() => {
    // 실제 환경에서는 react-native-netinfo 라이브러리 사용
    // 현재는 API 호출 상태를 기반으로 네트워크 상태 추정
    if (isError) {
      // API 호출 실패 = 네트워크 문제
      setOffline(true);
    } else if (isLoading === false && !isError) {
      // API 호출 성공 = 네트워크 정상
      setOffline(false);
      setLastUpdated(new Date());
    }
  }, [isError, isLoading]); // Zustand setter들은 의존성에서 제거

  // 선택된 여정의 상세 정보 추출 (출발지/목적지 + 경로 데이터)
  const selectedJourneyInfo = React.useMemo(() => {
    const tabsToUseForLog = USE_MOCK_DATA && journeyTabs.length === 0
      ? createMockJourneyTabs()
      : journeyTabs;

    const journeysToUse = USE_MOCK_DATA && (!pathSelection.journeys || pathSelection.journeys.length === 0)
      ? createMockJourneys()
      : pathSelection.journeys;

    const tabsToUse = USE_MOCK_DATA && journeyTabs.length === 0
      ? createMockJourneyTabs()
      : journeyTabs;

    if (tabsToUse.length === 0 || !journeysToUse || journeysToUse.length === 0) {
      return null;
    }

    const selectedTab = tabsToUse[selectedJourneyIndex];
    if (!selectedTab) {
      return null;
    }

    // 선택된 탭의 id에서 depart-id와 arrive-id 추출 (pipe delimiter 사용)
    const [departId, arriveId] = selectedTab.id.split('|');

    // journeysToUse에서 해당 여정 찾기
    const departJourney = journeysToUse.find(j => j.id === departId);
    const arriveJourney = journeysToUse.find(j => j.id === arriveId);

    if (!departJourney || !arriveJourney) {
      return null;
    }

    // 🆕 저장된 경로 데이터 가져오기 (여정별로 저장된 경로 우선 사용)
    // GoalTimeScreen에서 저장할 때 여정 키를 사용
    // 여러 키를 시도: journeyKey (depart|arrive), departId, selectedPath (하위 호환성)
    const journeyKey = `${departId}|${arriveId}`;
    const selectedPathsToUse = USE_MOCK_DATA && (!pathSelection.selectedPaths || Object.keys(pathSelection.selectedPaths).length === 0)
      ? mockSelectedPaths
      : pathSelection.selectedPaths || {};
    
    const selectedPath = selectedPathsToUse[journeyKey] ||
                         selectedPathsToUse[departId] ||
                         pathSelection.selectedPath;  // 하위 호환성

    // 예상 소요시간 계산 (초를 분으로 변환)
    const estimatedDurationMinutes = selectedPath ? Math.round(selectedPath.totalTime / 60) : 45;

    // 예상 도착시간 계산
    const [departHours, departMinutes] = departJourney.time.split(':').map(Number);
    const totalMinutes = departHours * 60 + departMinutes + estimatedDurationMinutes;
    const arriveHours = Math.floor(totalMinutes / 60) % 24;
    const arriveMins = totalMinutes % 60;
    const arriveTime = `${String(arriveHours).padStart(2, '0')}:${String(arriveMins).padStart(2, '0')}`;

    const result = {
      originName: departJourney.placeName,
      originAddress: departJourney.placeAddress,
      originIcon: departJourney.placeIcon,
      originX: departJourney.placeX,
      originY: departJourney.placeY,
      destinationName: arriveJourney.placeName,
      destinationAddress: arriveJourney.placeAddress,
      destinationIcon: arriveJourney.placeIcon,
      destinationX: arriveJourney.placeX,
      destinationY: arriveJourney.placeY,
      departureTime: departJourney.time,
      estimatedDurationMinutes,
      arriveTime,
      selectedPath,
    };
    return result;
  }, [selectedJourneyIndex, journeyTabs, pathSelection.journeys, pathSelection.selectedPath, pathSelection.selectedPaths, USE_MOCK_DATA]);

  // 🎭 목업 데이터 변수들 (selectedJourneyInfo 이후)
  const mockSelectedPaths: Record<string, any> = USE_MOCK_DATA && (!pathSelection.selectedPaths || Object.keys(pathSelection.selectedPaths).length === 0)
    ? {
        'mock-depart-home|mock-arrive-work': createMockPath(true),
        'mock-depart-work|mock-arrive-home': createMockPath(false),
      }
    : pathSelection.selectedPaths || {};

  const createMockTrackingState = (): any => {
    if (!selectedJourneyInfo?.selectedPath?.subPath) return null;
    
    const subPath = selectedJourneyInfo.selectedPath.subPath;
    // 첫 번째 세그먼트가 도보인 경우를 가정
    const firstSegment = subPath[0];
    const isWalking = firstSegment?.trafficType === 3;
    
    // 목업 GPS 좌표 (서울 강남역 근처)
    const mockLocation = {
      latitude: 37.4979,
      longitude: 127.0276,
      timestamp: Date.now(),
      accuracy: 10,
    };
    
    return {
      status: isWalking ? 'walking' : 'on_transit',
      currentSegmentIndex: 0,
      currentLocation: mockLocation,
      distanceToNextStop: isWalking ? 250 : 1200, // 미터
      estimatedTimeToNextStop: isWalking ? 180 : 300, // 초
      movementSpeed: isWalking ? 4.3 : 54, // km/h
      isOnRoute: true,
      message: isWalking ? '도보로 이동 중' : '버스 탑승 중',
    };
  };

  const displayTrackingState = USE_MOCK_DATA && !trackingState 
    ? createMockTrackingState() 
    : trackingState;

  const mockJourneyTabs = USE_MOCK_DATA && journeyTabs.length === 0
    ? createMockJourneyTabs()
    : journeyTabs;

  // 🆕 알림 액션 처리 (cards 선언 후에 실행되도록 별도 useEffect로 분리)

  // 🆕 selectedJourneyInfo가 변경되면 추적 경로 업데이트
  React.useEffect(() => {
    if (selectedJourneyInfo?.selectedPath) {
      setTrackingRoute(selectedJourneyInfo.selectedPath as any);
      setTrackingEnabled(true);
    } else {
      setTrackingRoute(null);
      setTrackingEnabled(false);
    }
  }, [selectedJourneyInfo?.selectedPath]);

  // 선택된 여정이 바뀔 때 검색창 업데이트 및 추적 시작
  React.useEffect(() => {
    if (selectedJourneyInfo) {
      setOrigin(selectedJourneyInfo.originName);
      setDestination(selectedJourneyInfo.destinationName);

      // 새로운 여정 선택 시 추적 시작
      if (selectedJourneyInfo.selectedPath) {
        trackingActions.startTracking(selectedJourneyInfo.selectedPath.id || '');
      }
    }
  }, [selectedJourneyInfo?.originName, selectedJourneyInfo?.destinationName, selectedJourneyInfo?.selectedPath?.id]); // trackingActions는 Zustand setter이므로 제거

  // 🆕 CTA TEST 버튼을 헤더에 전달 - 경로 세그먼트 변경 기능
  React.useEffect(() => {
    if (onHeaderRightChange) {
      const testButton = (
        <TouchableOpacity
          onPress={() => {
            if (!selectedJourneyInfo?.selectedPath?.subPath) {
              return;
            }

            const subPath = selectedJourneyInfo.selectedPath.subPath;
            const currentIdx = displayTrackingState?.currentSegmentIndex ?? 0;
            const nextIdx = (currentIdx + 1) % subPath.length; // 순환

            // 새로운 추적 상태 생성
            const newTrackingState = {
              ...displayTrackingState,
              currentSegmentIndex: nextIdx,
              status: subPath[nextIdx]?.trafficType === 3 ? 'walking' : 'on_transit',
              message: subPath[nextIdx]?.trafficType === 3 ? '도보로 이동 중' : '버스 탑승 중',
            };

            // 추적 상태 업데이트
            trackingActions.updateTrackingState(newTrackingState as any);
          }}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 6,
            backgroundColor: '#0066FF',
            borderRadius: 8,
          }}
        >
          <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>
            CTA TEST
          </Text>
        </TouchableOpacity>
      );
      onHeaderRightChange(testButton);
    }
  }, [onHeaderRightChange, selectedJourneyInfo?.selectedPath?.subPath, displayTrackingState?.currentSegmentIndex]); // trackingActions는 Zustand setter이므로 제거

  // 여정 선택기 핸들러
  const handleExpandPress = () => {
    toggleExpanded();
  };

  const handleCollapsePress = () => {
    setExpanded(false);
  };

  const handleTabSelect = (tabId: string) => {
    // tabId로부터 선택된 여정 인덱스 찾기
    const index = journeyTabs.findIndex(t => t.id === tabId);
    if (index >= 0) {
      setSelectedJourneyIndex(index);
    }
    setSelectedTab(tabId as any);
  };

  // Phase 8.1: 캐러셀 카드 너비 (SafeArea 제외)
  const screenWidth = Dimensions.get('window').width;
  const cardWidth = screenWidth - theme.spacing.md * 2; // Container padding 제외

  // Phase 8.1: Quick Action 핸들러
  const handleDepartureAlarmPress = () => {
    // TODO: 출발 알림 액션 구현 (Phase 3의 Logic 1.1 연동)
  };

  const handleCheckHazardsPress = () => {
    // TODO: 위험 확인 액션 구현 (Phase 2의 안전 정보 표시)
  };

  // 🆕 CTA 카드 핸들러들
  const handleDepartureCardPress = () => {
    // 파란색 출발 카드: 실시간 경로 추적 맵 화면으로 이동
    if (selectedJourneyInfo?.selectedPath) {
      navigation.navigate('RealtimeNavigation', {
        originName: selectedJourneyInfo.originName,
        destinationName: selectedJourneyInfo.destinationName,
        selectedPath: selectedJourneyInfo.selectedPath,
      });
    }
  };

  const handleHazardCardPress = () => {
    // 빨간색 위험 카드: SafetyGuard 화면으로 이동
    navigation.navigate('SafetyGuard');
  };

  const handleWeatherCardPress = () => {
    // 날씨 카드: 날씨 상세 정보 모달 표시
    setIsWeatherModalVisible(true);
  };

  const handleTrafficCardPress = () => {
    // 새로운 경로 카드: 경로 선택 모달 표시
    if (selectedJourneyInfo?.selectedPath) {
      setIsRouteSelectModalVisible(true);
      setRouteSelectOption('today'); // 기본값: 오늘만
    }
  };

  const handleDelayCardPress = () => {
    // 지연 감지 카드: 지연 모달 표시
    setIsDelayModalVisible(true);
  };

  const handleRouteSelectConfirm = () => {
    // 경로 선택 확인
    if (selectedJourneyInfo?.selectedPath) {
      // 현재 여정 키 생성
      const selectedTab = journeyTabs[selectedJourneyIndex];
      if (selectedTab) {
        const journeyKey = selectedTab.id; // "departId|arriveId" 형식
        
        // 경로 저장
        onboardingStore.actions.setSelectedPathForJourney(journeyKey, selectedJourneyInfo.selectedPath);
        
        // 모달 닫기
        setIsRouteSelectModalVisible(false);
      }
    }
  };

  const handleRouteSelectCancel = () => {
    setIsRouteSelectModalVisible(false);
  };

  // 🆕 세그먼트 타입에 따른 아이콘 반환
  const getSegmentIcon = (segmentType: string): string => {
    const typeMap: Record<string, string> = {
      'SUBWAY': '🚇',
      'BUS': '🚌',
      'WALK': '👣',
      'TAXI': '🚕',
      'TRAIN': '🚂',
      'TRAM': '🚊',
    };
    return typeMap[segmentType] || '🚌';
  };

  // 🆕 trafficType 숫자를 문자로 변환 (ODSAY API)
  const getTrafficTypeLabel = (trafficType: number): string => {
    const typeMap: Record<number, string> = {
      1: '지하철',
      2: '버스',
      3: '도보',
      4: '택시',
      5: '열차',
    };
    return typeMap[trafficType] || '이동';
  };

  // 🆕 현재 세그먼트 정보 가져오기
  const getCurrentSegmentInfo = () => {
    if (!selectedJourneyInfo?.selectedPath?.subPath) {
      return null;
    }

    const subPath = selectedJourneyInfo.selectedPath.subPath;
    // displayTrackingState가 없으면 첫 번째 세그먼트를 기본값으로 사용
    const currentSegmentIdx = displayTrackingState?.currentSegmentIndex ?? 0;

    if (currentSegmentIdx >= subPath.length) {
      return null;
    }

    const currentSegment = subPath[currentSegmentIdx];
    const trafficTypeLabel = getTrafficTypeLabel(currentSegment.trafficType);

    let transportInfo = trafficTypeLabel;
    if (currentSegment.lane && currentSegment.lane[0]) {
      if (currentSegment.lane[0].busNo) {
        transportInfo = `${currentSegment.lane[0].busNo}번`;
      } else if (currentSegment.lane[0].subwayName) {
        transportInfo = currentSegment.lane[0].subwayName;
      }
    }

    return {
      trafficType: currentSegment.trafficType,
      trafficTypeLabel,
      transportInfo,
      startName: currentSegment.startName || '출발지',
      endName: currentSegment.endName || '도착지',
      totalStops: subPath.length,
      currentStopIndex: currentSegmentIdx + 1,
    };
  };

  // 🆕 다음 정류장 정보 가져오기 (도보 건너뛰기)
  const getNextStopInfo = () => {
    if (!selectedJourneyInfo?.selectedPath?.subPath) {
      return null;
    }

    const subPath = selectedJourneyInfo.selectedPath.subPath;
    const currentSegmentIdx = displayTrackingState?.currentSegmentIndex ?? 0;

    // 다음 환승/탑승 세그먼트 찾기 (중간 도보 건너뛰기)
    let nextSegmentIdx = currentSegmentIdx + 1;
    
    // 중간 도보 세그먼트 건너뛰기 (첫 번째와 마지막 도보는 제외)
    while (nextSegmentIdx < subPath.length - 1 && subPath[nextSegmentIdx]?.trafficType === 3) {
      nextSegmentIdx++;
    }

    if (nextSegmentIdx >= subPath.length) {
      return {
        stopName: selectedJourneyInfo.destinationName || '최종 목적지',
        isDestination: true,
        trafficType: null,
        transportInfo: null,
        subwayLine: null,
        subwayDirection: null,
      };
    }

    const nextSegment = subPath[nextSegmentIdx];
    const trafficTypeLabel = getTrafficTypeLabel(nextSegment.trafficType);
    
    let transportInfo = trafficTypeLabel;
    let subwayLine: string | null = null;
    let subwayDirection: string | null = null;
    let stopName = nextSegment.startName || nextSegment.endName || '다음 정류장';
    
    if (nextSegment.lane && nextSegment.lane[0]) {
      const lane = nextSegment.lane[0];
      
      if (lane.busNo) {
        // 버스
        transportInfo = `${lane.busNo}번 버스`;
      } else if (lane.subwayName || nextSegment.trafficType === 1) {
        // 지하철
        // 🆕 호선 정보
        if (lane.subwayCode) {
          subwayLine = `${lane.subwayCode}호선`;
          transportInfo = `${lane.subwayCode}호선`;
        } else if (lane.subwayName) {
          subwayLine = lane.subwayName;
          transportInfo = lane.subwayName;
        }
        
        // 🆕 방향 정보 (endName이 최종 목적지 방면)
        if (nextSegment.endName) {
          // 역 이름에 "역" 붙이기
          const endStationName = nextSegment.endName.endsWith('역') 
            ? nextSegment.endName 
            : `${nextSegment.endName}역`;
          subwayDirection = `${endStationName} 방면`;
        }
        
        // 🆕 역 이름에 "역" 붙이기
        if (nextSegment.startName) {
          stopName = nextSegment.startName.endsWith('역')
            ? nextSegment.startName
            : `${nextSegment.startName}역`;
        } else if (nextSegment.endName) {
          stopName = nextSegment.endName.endsWith('역')
            ? nextSegment.endName
            : `${nextSegment.endName}역`;
        }
      }
    }

    return {
      stopName,
      isDestination: false,
      trafficType: nextSegment.trafficType,
      transportInfo,
      trafficTypeLabel,
      subwayLine,
      subwayDirection,
    };
  };

  // 🆕 다음 도보 세그먼트 정보 가져오기 (중간 도보만, 첫/끝 제외)
  const getNextWalkSegment = () => {
    if (!selectedJourneyInfo?.selectedPath?.subPath) {
      return null;
    }

    const subPath = selectedJourneyInfo.selectedPath.subPath;
    const currentSegmentIdx = displayTrackingState?.currentSegmentIndex ?? 0;
    const nextSegmentIdx = currentSegmentIdx + 1;

    // 첫 번째나 마지막 세그먼트면 null 반환
    if (nextSegmentIdx >= subPath.length - 1 || nextSegmentIdx === 0) {
      return null;
    }

    const nextSegment = subPath[nextSegmentIdx];
    
    // 중간 도보 세그먼트만 반환
    if (nextSegment.trafficType === 3) {
      const walkTime = nextSegment.sectionTime 
        ? Math.round(nextSegment.sectionTime / 60)
        : 3; // 기본값 3분
      
      return {
        walkTime,
        sectionTime: nextSegment.sectionTime,
      };
    }

    return null;
  };

  // 🆕 현재 이동 상태에 따른 메시지 생성
  const getMovementStatusMessage = (): string => {
    if (!displayTrackingState) {
      return '준비 중...';
  }

    // 현재 세그먼트 정보를 기반으로 메시지 생성
    const currentSegmentInfo = getCurrentSegmentInfo();
    if (currentSegmentInfo) {
      if (currentSegmentInfo.trafficType === 3) {
        // WALK - 도보로 이동 중
        const nextStopInfo = getNextStopInfo();
        if (nextStopInfo && !nextStopInfo.isDestination) {
          return `도보로 ${formatTime(displayTrackingState.estimatedTimeToNextStop)} 이동!`;
        }
        return '도보로 이동 중...';
      } else if (currentSegmentInfo.trafficType === 2) {
        // BUS
        return `${currentSegmentInfo.transportInfo} 탑승 중`;
      } else if (currentSegmentInfo.trafficType === 1) {
        // SUBWAY
        return `${currentSegmentInfo.transportInfo} 탑승 중`;
      }
    }

    const statusMap: Record<string, string> = {
      'on_transit': '🚌 이동 중',
      'waiting_at_stop': '⏱️ 정류장 대기',
      'boarding': '🚶 도보 이동',
      'walking': '🚶 도보 이동',
      'route_deviation': '⚠️ 경로 이탈',
      'destination_reached': '🎉 목적지 도착',
      'idle': '준비 중...',
    };

    return statusMap[displayTrackingState.status] || '이동 중';
  };

  // 🆕 날씨 데이터 조회 (출발지 기반) - Early return 전에 호출!
  const originWeatherLocation = React.useMemo(() => {
    if (selectedJourneyInfo?.originY && selectedJourneyInfo?.originX) {
      return {
        latitude: parseFloat(selectedJourneyInfo.originY),
        longitude: parseFloat(selectedJourneyInfo.originX),
      };
    }
    // Fallback: 집 주소
    if (typeof places.homeAddress === 'object' && places.homeAddress) {
      return {
        latitude: parseFloat(places.homeAddress.y || '37.4979'),
        longitude: parseFloat(places.homeAddress.x || '127.0276'),
      };
  }
    // 기본값: 강남역
    return { latitude: 37.4979, longitude: 127.0276 };
  }, [selectedJourneyInfo, places]);

  // 🆕 날씨 데이터 조회 (도착지 기반)
  const destinationWeatherLocation = React.useMemo(() => {
    if (selectedJourneyInfo?.destinationY && selectedJourneyInfo?.destinationX) {
      return {
        latitude: parseFloat(selectedJourneyInfo.destinationY),
        longitude: parseFloat(selectedJourneyInfo.destinationX),
      };
    }
    // 기본값: 강남역
    return { latitude: 37.4979, longitude: 127.0276 };
  }, [selectedJourneyInfo]);

  const { data: originWeatherData, isLoading: originWeatherLoading } = useGetWeatherQuery(
    originWeatherLocation.latitude,
    originWeatherLocation.longitude
  );

  const { data: destinationWeatherData, isLoading: destinationWeatherLoading } = useGetWeatherQuery(
    destinationWeatherLocation.latitude,
    destinationWeatherLocation.longitude
  );

  // 재난 문자 데이터 가져오기
  const { data: disasterAlertsData, refetch: refetchDisasterAlerts } = useGetAllDisasterAlertsQuery(1000, 30, true);

  // 카운트다운 상태 (15초에서 시작)
  const [countdown, setCountdown] = React.useState(15);

  // 15초마다 자동으로 재난 문자 새로고침 + 카운트다운 관리
  React.useEffect(() => {
    // 1초마다 카운트다운 감소
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // 0이 되면 15로 리셋하고 새로고침
          refetchDisasterAlerts();
          return 15;
        }
        return prev - 1;
      });
    }, 1000); // 1초마다

    return () => clearInterval(countdownInterval);
  }, [refetchDisasterAlerts]);

  // 최근 3일치 재난 문자만 필터링
  const recentDisasterAlertsData = React.useMemo(() => {
    if (!disasterAlertsData || disasterAlertsData.length === 0) {
      return [];
    }

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    threeDaysAgo.setHours(0, 0, 0, 0);

    const filtered = disasterAlertsData.filter((alert: DisasterAlert) => {
      const alertDate = new Date(alert.date);
      return alertDate >= threeDaysAgo;
    });

    return filtered;
  }, [disasterAlertsData]);

  // 경로 구간별 재난 문자 필터링 (출발지, 경유지, 도착지)
  const disasterAlertsByRouteSegment = React.useMemo(() => {
    if (!recentDisasterAlertsData || recentDisasterAlertsData.length === 0 || !selectedJourneyInfo) {
      return {
        origin: [],
        waypoints: [],
        destination: [],
      };
    }

    // 출발지와 도착지 지역명 추출 (주소에서 시/구/군 정보 추출)
    const extractRegionFromAddress = (address: string): string[] => {
      if (!address) return [];
      const regions: string[] = [];
      
      // 시/도 추출
      const provinceMatch = address.match(/(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)/);
      if (provinceMatch) {
        const province = provinceMatch[1];
        // 시/구/군 추출
        const cityMatch = address.match(new RegExp(`${province}[^시구군]*([시구군])`));
        if (cityMatch) {
          const cityName = address.substring(0, address.indexOf(cityMatch[1]) + 1);
          regions.push(cityName);
        }
        // 구 추출 (서울특별시 강남구 같은 경우)
        const guMatch = address.match(/([가-힣]+구)/);
        if (guMatch) {
          regions.push(guMatch[1]);
        }
      }
      
      return regions;
    };

    const originRegions = extractRegionFromAddress(selectedJourneyInfo.originAddress || selectedJourneyInfo.originName || '');
    const destinationRegions = extractRegionFromAddress(selectedJourneyInfo.destinationAddress || selectedJourneyInfo.destinationName || '');

    // 경유지 지역명 추출 (subPath의 startName, endName에서)
    const waypointRegions: string[] = [];
    if (selectedJourneyInfo.selectedPath?.subPath) {
      selectedJourneyInfo.selectedPath.subPath.forEach((segment: any) => {
        if (segment.startName) {
          const regions = extractRegionFromAddress(segment.startName);
          waypointRegions.push(...regions);
        }
        if (segment.endName) {
          const regions = extractRegionFromAddress(segment.endName);
          waypointRegions.push(...regions);
        }
      });
    }

    // 재난 문자를 구간별로 필터링
    const originAlerts: DisasterAlert[] = [];
    const waypointAlerts: DisasterAlert[] = [];
    const destinationAlerts: DisasterAlert[] = [];

    recentDisasterAlertsData.forEach((alert: DisasterAlert) => {
      const alertRegion = alert.region || '';
      
      // 출발지 매칭
      if (originRegions.some(region => alertRegion.includes(region) || region.includes(alertRegion))) {
        originAlerts.push(alert);
        return;
      }
      
      // 경유지 매칭
      if (waypointRegions.some(region => alertRegion.includes(region) || region.includes(alertRegion))) {
        waypointAlerts.push(alert);
        return;
      }
      
      // 도착지 매칭
      if (destinationRegions.some(region => alertRegion.includes(region) || region.includes(alertRegion))) {
        destinationAlerts.push(alert);
        return;
      }
    });

    // 각 구간별로 최신순 정렬 및 최대 1개씩만 선택
    const originAlert = originAlerts
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    const waypointAlert = waypointAlerts
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    const destinationAlert = destinationAlerts
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    // 제목 옆에 표시할 구간별 정보 생성
    const segmentBadges: Array<{ label: string; region: string }> = [];
    if (originAlert) {
      const region = originAlert.region || '';
      // 지역명에서 시/구/군만 추출 (예: "경기도 양주시" -> "양주시")
      const regionMatch = region.match(/([가-힣]+(?:시|구|군))/);
      const regionName = regionMatch ? regionMatch[1] : region;
      segmentBadges.push({ label: '출발지', region: regionName });
    }
    if (waypointAlert) {
      const region = waypointAlert.region || '';
      const regionMatch = region.match(/([가-힣]+(?:시|구|군))/);
      const regionName = regionMatch ? regionMatch[1] : region;
      segmentBadges.push({ label: '경유지', region: regionName });
    }
    if (destinationAlert) {
      const region = destinationAlert.region || '';
      const regionMatch = region.match(/([가-힣]+(?:시|구|군))/);
      const regionName = regionMatch ? regionMatch[1] : region;
      segmentBadges.push({ label: '도착지', region: regionName });
    }

    return {
      origin: originAlert ? [originAlert] : [],
      waypoints: waypointAlert ? [waypointAlert] : [],
      destination: destinationAlert ? [destinationAlert] : [],
      segmentBadges, // 제목 옆에 표시할 배지 정보
    };
  }, [recentDisasterAlertsData, selectedJourneyInfo]);

  // Phase 8.0: IntelligentDashboard 카드 데이터 (날씨 포함)
  // hooks 순서 보장을 위해 early return 전에 호출
  const cards = React.useMemo(() => {
    const briefingData = data?.data;
    const baseCards = [
    {
      id: 'departure',
      icon: '🚀',
      title: '지금 출발하세요!',
      bgGradient: '#0066FF',
        content: `${briefingData?.recommendedTransport?.departureInMinutes || 5}분 뒤 ${briefingData?.recommendedTransport?.name || '버스'} 도착`,
      badges: ['쾌적한 출근길', '정시 도착 예상'],
    },
    {
      id: 'hazard',
      icon: '⚠️',
      iconImage: WarningIcon,
      title: '위험 감지!',
      bgGradient: '#FF5722',
      content: disasterAlertsByRouteSegment, // 구간별 재난 문자 객체 전달
      badges: [],
    },
    {
      id: 'weather',
      icon: '🌤️',
      iconImage: WeatherIcon,
      title: '날씨 체크!',
      bgGradient: '#40B0FF',
      content: {
        origin: {
          name: selectedJourneyInfo?.originName || '출발지',
          weather: originWeatherData
            ? getWeatherDescription(
                originWeatherData.condition,
                originWeatherData.precipitation,
                originWeatherData.feelsLike
              )
            : '날씨 정보 없음',
          temperature: originWeatherData?.temperature || null,
          condition: originWeatherData?.condition || null,
        },
        destination: {
          name: selectedJourneyInfo?.destinationName || '도착지',
          weather: destinationWeatherData
            ? getWeatherDescription(
                destinationWeatherData.condition,
                destinationWeatherData.precipitation,
                destinationWeatherData.feelsLike
              )
            : '날씨 정보 없음',
          temperature: destinationWeatherData?.temperature || null,
          condition: destinationWeatherData?.condition || null,
        },
      },
      badges: (() => {
        const recommendations: string[] = [];
        if (originWeatherData) {
          recommendations.push(...getWeatherRecommendations(
            originWeatherData.condition,
            originWeatherData.temperature,
            originWeatherData.humidity,
            originWeatherData.uvIndex
          ));
        }
        if (destinationWeatherData) {
          const destRecs = getWeatherRecommendations(
            destinationWeatherData.condition,
            destinationWeatherData.temperature,
            destinationWeatherData.humidity,
            destinationWeatherData.uvIndex
          );
          // 중복 제거
          destRecs.forEach(rec => {
            if (!recommendations.includes(rec)) {
              recommendations.push(rec);
            }
          });
        }
        return recommendations.length > 0 ? recommendations : ['☀️ 좋은 날씨'];
      })(),
    },
    {
      id: 'traffic',
      icon: '✨',
      iconImage: NewPathIcon,
      title: pendingAction === 'show_alternative_route' 
        ? '지각 예정! 이 경로를 추천합니다!' 
        : '새로운 경로를 찾았습니다',
      bgGradient: '#9C27B0',
      content: (() => {
        if (selectedJourneyInfo) {
          const duration = selectedJourneyInfo.estimatedDurationMinutes || 45;
          const arriveTime = selectedJourneyInfo.arriveTime || '--:--';
          return `제일 빠른 경로 · ${duration}분 소요`;
        }
        return '제일 빠른 경로를 찾았습니다';
      })(),
      badges: (() => {
        if (selectedJourneyInfo) {
          const duration = selectedJourneyInfo.estimatedDurationMinutes || 45;
          const arriveTime = selectedJourneyInfo.arriveTime || '--:--';
          return [`${duration}분 소요`, `도착 예정 ${arriveTime}`];
        }
        return ['최적 경로', '추천'];
      })(),
    },
    // 지연 감지 카드 (목업 데이터 - 실제 지연 감지 시 표시)
    {
      id: 'delay',
      icon: '⏰',
      iconImage: LaterIcon,
      title: '지연 감지!',
      bgGradient: '#FF9800',
      content: {
        transport: '80번 버스',
        transportType: 'bus', // 'bus' or 'subway'
        delayMinutes: 15,
        expectedArrival: '07시 45분',
        delayIncrease: 15,
      },
      badges: ['지연 감지', '+15분 증가'],
    },
  ];
    return baseCards;
  }, [data, originWeatherData, destinationWeatherData, selectedJourneyInfo, disasterAlertsByRouteSegment, pendingAction]);

  // 🆕 알림 액션 처리 (cards 선언 후에 실행)
  React.useEffect(() => {
    if (!pendingAction) return;

    switch (pendingAction) {
      case 'navigate_home':
        // 이미 홈 화면이므로 별도 처리 불필요
        break;

      case 'show_new_route':
      case 'show_alternative_route':
        // 새로운 경로 CTA 카드 포커싱 (캐러셀 이동 + 경로 선택 모달 표시)
        // cards 배열에서 'traffic' 카드의 인덱스 찾기
        const trafficCardIndex = cards.findIndex(card => card.id === 'traffic');
        if (trafficCardIndex !== -1) {
          // 캐러셀을 새로운 경로 카드로 스크롤
          const screenWidth = Dimensions.get('window').width;
          const cardWidth = screenWidth - theme.spacing.md * 2;
          const scrollToX = trafficCardIndex * cardWidth;
          
          setTimeout(() => {
            carouselScrollViewRef.current?.scrollTo({
              x: scrollToX,
              animated: true,
            });
            setActiveCardIndex(trafficCardIndex);
          }, 100); // 약간의 딜레이로 스크롤이 부드럽게 작동하도록
        }
        
        if (selectedJourneyInfo?.selectedPath) {
          setIsRouteSelectModalVisible(true);
          setRouteSelectOption('today');
        }
        break;

      case 'show_delay_modal':
        // 지연 모달 표시
        setIsDelayModalVisible(true);
        break;

      case 'show_taxi_recommendation':
        // 택시 추천 모달 표시
        setIsTaxiModalVisible(true);
        break;

      default:
        // 알 수 없는 알림 액션 (조용히 처리)
        break;
    }

    // 액션 처리 후 클리어
    clearPendingAction();
  }, [pendingAction, selectedJourneyInfo?.selectedPath, cards, clearPendingAction]);

  // 로딩 상태
  if (isLoading) {
    return (
      <OuterContainer ambientStatus={ambientStatus}>
        <LoadingContainer>
          <LoadingText>로딩 중</LoadingText>
        </LoadingContainer>
      </OuterContainer>
    );
  }

  // 에러 상태
  if (isError || !data?.data) {
    return (
      <OuterContainer ambientStatus={ambientStatus}>
        <LoadingContainer>
          <LoadingText>브리핑 정보를 불러올 수 없습니다.</LoadingText>
        </LoadingContainer>
      </OuterContainer>
    );
  }

  const briefingData = data.data;

  return (
    <OuterContainer ambientStatus={ambientStatus}>
      {/* Phase 7: 오프라인 배너 */}
      <OfflineBanner isOffline={isOffline} lastUpdated={lastUpdated} />

      <ScrollContainer 
        showsVerticalScrollIndicator={false} 
        scrollEventThrottle={16}
        nestedScrollEnabled={true}
      >
        <Container>
          {/* Phase 8.1: 확장/축소 가능한 검색 바 */}
          <SearchBarContainer>
            {!isSearchBarExpanded ? (
              // 축소된 상태
              <>
                <CollapsedSearchBar>
                  <JourneyTabsContainer>
                    {journeyTabs.length > 0 ? (
                      journeyTabs.map((tab, index) => (
                    <TouchableOpacity
                          key={tab.id}
                          onPress={() => handleTabSelect(tab.id)}
                      style={{ flex: 1 }}
                    >
                          <JourneyTab isActive={index === selectedJourneyIndex}>
                            <JourneyTabText isActive={index === selectedJourneyIndex}>
                              {tab.label}
                            </JourneyTabText>
                      </JourneyTab>
                    </TouchableOpacity>
                      ))
                    ) : (
                      // 여정이 없을 때 기본 탭 표시
                    <TouchableOpacity
                        onPress={() => handleTabSelect('commute')}
                      style={{ flex: 1 }}
                    >
                        <JourneyTab isActive={true}>
                          <JourneyTabText isActive={true}>여정 없음</JourneyTabText>
                      </JourneyTab>
                    </TouchableOpacity>
                    )}
                  </JourneyTabsContainer>
                </CollapsedSearchBar>

                {/* 확장 버튼 (아래쪽 화살표) */}
                <TouchableOpacity onPress={() => setIsSearchBarExpanded(true)}>
                  <ToggleButton>
                    <ToggleButtonText>⌄</ToggleButtonText>
                  </ToggleButton>
                </TouchableOpacity>
              </>
            ) : (
              // 확장된 상태
              <>
                <ExpandedSearchBar>
                  {/* 출발지/목적지 입력 */}
                  <SearchInputContainer>
                    <SearchInputWrapper>
                      <SearchInput
                        placeholder="출발지"
                        value={origin}
                        onChangeText={setOrigin}
                        placeholderTextColor="#999"
                      />
                    </SearchInputWrapper>
                    <TouchableOpacity
                      onPress={() => {
                        // 출발지와 목적지 교환
                        const temp = origin;
                        setOrigin(destination);
                        setDestination(temp);
                      }}
                    >
                      <ArrowIcon>
                        <ArrowIconText>⇄</ArrowIconText>
                      </ArrowIcon>
                    </TouchableOpacity>
                    <SearchInputWrapper>
                      <SearchInput
                        placeholder="목적지"
                        value={destination}
                        onChangeText={setDestination}
                        placeholderTextColor="#999"
                      />
                    </SearchInputWrapper>
                  </SearchInputContainer>

                  {/* 즐겨찾기 목록 */}
                  <FavoritesList>
                    {favorites.map((fav) => (
                      <TouchableOpacity
                        key={fav.id}
                        onPress={() => {
                          if (!origin) {
                            setOrigin(fav.name);
                          } else if (!destination) {
                            setDestination(fav.name);
                          }
                        }}
                      >
                        <FavoriteItem>
                          <FavoriteIcon>
                            <FavoriteIconText>{fav.icon}</FavoriteIconText>
                          </FavoriteIcon>
                          <FavoriteName>{fav.name}</FavoriteName>
                        </FavoriteItem>
                      </TouchableOpacity>
                    ))}
                  </FavoritesList>
                </ExpandedSearchBar>
                
                {/* 확장 상태일 때 하단에도 축소 버튼 */}
                <TouchableOpacity onPress={() => setIsSearchBarExpanded(false)}>
                  <ToggleButton>
                    <ToggleButtonText>⌃</ToggleButtonText>
                  </ToggleButton>
                </TouchableOpacity>
              </>
            )}
          </SearchBarContainer>

          {/* Phase 8.2: CTA Cards Carousel (그래디언트 카드) */}
          <ScrollView
            ref={carouselScrollViewRef}
            horizontal
            pagingEnabled={false}
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            snapToInterval={cardWidth}
            decelerationRate="fast"
            onMomentumScrollEnd={(event) => {
              const contentOffsetX = event.nativeEvent.contentOffset.x;
              const currentIndex = Math.round(contentOffsetX / cardWidth);
              setActiveCardIndex(currentIndex);
            }}
            testID="cta-carousel"
          >
            {cards.map((card) => {
              // CTA 카드별 onPress 핸들러 선택
              const getCardPressHandler = () => {
                switch (card.id) {
                  case 'departure':
                    return handleDepartureCardPress;
                  case 'hazard':
                    return handleHazardCardPress;
                  case 'weather':
                    return handleWeatherCardPress;
                  case 'traffic':
                    return handleTrafficCardPress;
                  case 'delay':
                    return handleDelayCardPress;
                  default:
                    return () => {};
                }
              };

              return (
              <View key={card.id} style={{ width: cardWidth }}>
                <TouchableOpacity
                  onPress={getCardPressHandler()}
                  activeOpacity={0.85}
                  style={{ flex: 1 }}
                >
                <CardBase bgGradient={card.bgGradient}>
                  {card.id === 'departure' ? (
                    /* 3-Layer 리디자인: CTAGuide.md 기반 */
                    <DepartureCardContainer>
                      {/* ========== Layer 1: Header (20%) - 목표 + 도착시간 ========== */}
                      <Layer1Header>
                        <Layer1GoalSection>
                          <Layer1JourneyName>
                            {(() => {
                              // 여정 탭에서 이름 가져오기
                              const tabsToUse = USE_MOCK_DATA && journeyTabs.length === 0
                                ? createMockJourneyTabs()
                                : journeyTabs;
                              const selectedTab = tabsToUse[selectedJourneyIndex];
                              
                              if (selectedTab && selectedTab.label) {
                                // 탭의 label 사용 (예: "집→회사")
                                return (
                                  <>
                                    <Layer1JourneyIcon>{selectedTab.icon || '🏠'}</Layer1JourneyIcon>
                                    <Layer1JourneyText>{selectedTab.label}</Layer1JourneyText>
                                  </>
                                );
                              }
                              
                              // 탭이 없으면 originName → destinationName으로 표시
                              if (selectedJourneyInfo?.originName && selectedJourneyInfo?.destinationName) {
                                return (
                                  <>
                                    <Layer1JourneyIcon>{selectedJourneyInfo.originIcon || '🏠'}</Layer1JourneyIcon>
                                    <Layer1JourneyText>
                                      {selectedJourneyInfo.originName} → {selectedJourneyInfo.destinationName}
                                    </Layer1JourneyText>
                                    {selectedJourneyInfo.destinationIcon && (
                                      <Layer1JourneyIcon>{selectedJourneyInfo.destinationIcon}</Layer1JourneyIcon>
                                    )}
                                  </>
                                );
                              }
                              
                              // 기본값
                              return (
                                <>
                                  <Layer1JourneyIcon>🏁</Layer1JourneyIcon>
                                  <Layer1JourneyText>{selectedJourneyInfo?.destinationName || '목적지'}</Layer1JourneyText>
                                </>
                              );
                            })()}
                          </Layer1JourneyName>
                        </Layer1GoalSection>
                        <Layer1TimeSection>
                          {/* 도착 예정과 시간을 한 줄에 표시 */}
                          <Layer1TimeText>
                            도착 예정 {selectedJourneyInfo?.arriveTime || '--:--'}
                          </Layer1TimeText>
                          {/* 🟢 상태 배지 (목표 시간과 비교) */}
                          {(() => {
                            if (!selectedJourneyInfo?.arriveTime || !goalTime?.arrivalTime) {
                              return null;
                            }
                            
                            // 목표 시간과 예상 도착 시간 비교
                            const [arriveHours, arriveMins] = selectedJourneyInfo.arriveTime.split(':').map(Number);
                            const [goalHours, goalMins] = goalTime.arrivalTime.split(':').map(Number);
                            
                            const arriveTotalMins = arriveHours * 60 + arriveMins;
                            const goalTotalMins = goalHours * 60 + goalMins;
                            
                            const diffMins = goalTotalMins - arriveTotalMins;
                            
                            if (diffMins > 0) {
                              // 목표 시간보다 빠름
                              // 30분을 넘어가면 8분으로 목업 데이터 사용
                              const displayMins = diffMins > 30 ? 8 : diffMins;
                              return (
                                <Layer1StatusBadge>
                                  <Layer1StatusText>🟢 {displayMins}분 빠름</Layer1StatusText>
                                </Layer1StatusBadge>
                              );
                            } else if (diffMins === 0) {
                              // 정시 도착
                              return (
                                <Layer1StatusBadge>
                                  <Layer1StatusText>🟢 정시 도착</Layer1StatusText>
                                </Layer1StatusBadge>
                              );
                            } else {
                              // 지연
                              return (
                                <Layer1StatusBadge style={{ backgroundColor: 'rgba(255, 152, 0, 0.2)', borderColor: 'rgba(255, 152, 0, 0.5)' }}>
                                  <Layer1StatusText style={{ color: '#FF9800' }}>⚠️ {Math.abs(diffMins)}분 지연</Layer1StatusText>
                                </Layer1StatusBadge>
                              );
                            }
                          })()}
                        </Layer1TimeSection>
                      </Layer1Header>

                      {/* ========== Layer 2: Timeline (40%) - 진행 상황 + 버스 아이콘 ========== */}
                      <Layer2Timeline>
                        {/* 레이블을 항상 렌더링하여 레이아웃 고정 */}
                        <Layer2ProgressLabel>
                          {(() => {
                            const currentSegment = getCurrentSegmentInfo();
                            if (currentSegment) {
                              // 세그먼트 타입에 따라 레이블 표시
                              if (currentSegment.trafficType === 3) {
                                // 도보: "현재 위치"
                                return '현재 위치';
                              } else if (currentSegment.trafficType === 1) {
                                // 지하철: "현재 역"
                                return '현재 역';
                              } else if (currentSegment.trafficType === 2) {
                                // 버스: "현재 정류장"
                                return '현재 정류장';
                              }
                            }
                            return ' ';
                          })()}
                        </Layer2ProgressLabel>
                        <Layer2ProgressText>
                          {(() => {
                            const currentSegment = getCurrentSegmentInfo();
                            if (currentSegment) {
                              // 도보 중이면 "도보 이동 중(~분 예상)" 형식으로 표시
                              if (currentSegment.trafficType === 3) {
                                // 목업 데이터: 10분 고정
                                return '도보 이동 중(10분 예상)';
                              }
                              // 지하철인 경우 역 이름에 "역" 붙이기
                              if (currentSegment.trafficType === 1 && currentSegment.startName) {
                                return currentSegment.startName.endsWith('역')
                                  ? currentSegment.startName
                                  : `${currentSegment.startName}역`;
                              }
                              // 버스/지하철 탑승 중이면 현재 위치(정류장/역 이름)
                              return currentSegment.startName || '현재 위치';
                            }
                            return '경로 준비 중...';
                          })()}
                        </Layer2ProgressText>
                        
                        <View style={{ width: '100%', position: 'relative', marginTop: theme.spacing.md, marginBottom: 0 }}>
                          {/* 프로그레스 바 */}
                          <ProgressBarContainer>
                            {(() => {
                              if (!selectedJourneyInfo?.selectedPath?.subPath) {
                                return null;
                              }
                              
                              const subPath = selectedJourneyInfo.selectedPath.subPath;
                              
                              // 전체 경로의 총 소요 시간 계산
                              const totalTime = subPath.reduce((sum, segment) => {
                                return sum + (segment.sectionTime || 0);
                              }, 0);
                              
                              if (totalTime === 0) {
                                return null;
                              }
                              
                              // 각 세그먼트의 색상 정의
                              const getSegmentColor = (trafficType: number): string => {
                                switch (trafficType) {
                                  case 3: // 도보
                                    return 'rgba(128, 128, 128, 0.9)'; // 회색
                                  case 2: // 버스
                                    return 'rgba(33, 150, 243, 0.9)'; // 파란색
                                  case 1: // 지하철
                                    return 'rgba(76, 175, 80, 0.9)'; // 초록색
                                  default:
                                    return 'rgba(255, 255, 255, 0.9)'; // 기본 흰색
                                }
                              };
                              
                              // 각 세그먼트를 퍼센트로 변환하여 프로그레스 바 생성
                              let currentPosition = 0;
                              
                              return subPath.map((segment, index) => {
                                const segmentTime = segment.sectionTime || 0;
                                const segmentPercent = (segmentTime / totalTime) * 100;
                                
                                const segmentStart = currentPosition;
                                const segmentEnd = currentPosition + segmentPercent;
                                
                                currentPosition = segmentEnd;
                                
                                return (
                                  <ProgressBar
                                    key={index}
                                    progress={segmentPercent}
                                    color={getSegmentColor(segment.trafficType)}
                                    left={segmentStart}
                                  />
                                );
                              });
                            })()}
                          </ProgressBarContainer>

                          {/* 세그먼트 정보 (프로그레스 바 위) */}
                          {(() => {
                            if (!selectedJourneyInfo?.selectedPath?.subPath) {
                              return null;
                            }
                            
                            const subPath = selectedJourneyInfo.selectedPath.subPath;
                            
                            // 전체 경로의 총 소요 시간 계산
                            const totalTime = subPath.reduce((sum: number, segment: any) => {
                              return sum + (segment.sectionTime || 0);
                            }, 0);
                            
                            if (totalTime === 0) return null;
                            
                            let previousSegmentsPercent = 0;
                            
                            return subPath.map((segment: any, index: number) => {
                              const segmentTime = segment.sectionTime || 0;
                              // sectionTime이 초 단위인지 분 단위인지 확인
                              // ODSAY API 문서에 따르면 sectionTime은 초 단위
                              // 하지만 값이 작으면(예: 5, 31) 이미 분 단위일 수도 있음
                              // 일반적으로 버스/지하철은 30분 이상이므로, 60보다 작으면 분 단위로 간주
                              let segmentMinutes = 0;
                              if (segmentTime > 0) {
                                if (segmentTime < 60) {
                                  // 이미 분 단위로 추정
                                  segmentMinutes = Math.round(segmentTime);
                                } else {
                                  // 초 단위로 추정 (분으로 변환)
                                  segmentMinutes = Math.round(segmentTime / 60);
                                }
                                // 최소 1분 표시 (0분이면 표시되지 않음)
                                if (segmentMinutes === 0 && segmentTime > 0) {
                                  segmentMinutes = 1;
                                }
                              }
                              const segmentPercent = (segmentTime / totalTime) * 100;
                              const segmentStart = previousSegmentsPercent;
                              const segmentCenter = segmentStart + (segmentPercent / 2);
                              
                              previousSegmentsPercent += segmentPercent;
                              
                              // 세그먼트 정보 텍스트 생성
                              let segmentText = '';
                              let segmentIcon = '👣';
                              
                              if (segment.trafficType === 1) {
                                // 지하철
                                segmentIcon = '🚇';
                                const lane = segment.lane?.[0];
                                if (lane?.subwayCode) {
                                  // 호선 정보가 있으면 호선 표시 (예: "1호선")
                                  segmentText = `${lane.subwayCode}호선`;
                                } else if (lane?.subwayName) {
                                  // 호선 정보가 없으면 노선명 표시
                                  segmentText = lane.subwayName;
                                } else {
                                  segmentText = '지하철';
                                }
                              } else if (segment.trafficType === 2) {
                                // 버스
                                segmentIcon = '🚌';
                                if (segment.lane?.[0]?.busNo) {
                                  segmentText = `${segment.lane[0].busNo}번`;
                                } else {
                                  segmentText = '버스';
                                }
                              } else if (segment.trafficType === 3) {
                                // 도보 - 표시하지 않음
                                return null;
                              }
                              
                              // 세그먼트가 너무 작으면 표시하지 않음
                              if (segmentPercent < 5) return null;
                              
                              return (
                                <View
                                  key={`info-${index}`}
                                  style={{
                                    position: 'absolute',
                                    left: `${segmentCenter}%`,
                                    top: -20,
                                    transform: [{ translateX: -50 }], // 중앙 정렬
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 4,
                                  }}
                                >
                                  <Text style={{ color: 'white', fontSize: theme.fonts.sizes.xs - 1 }}>
                                    {segmentIcon}
                                  </Text>
                                  <Text style={{ color: 'white', fontSize: theme.fonts.sizes.xs - 1, fontWeight: '600' }}>
                                    {segmentText}
                                  </Text>
                                  <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: theme.fonts.sizes.xs - 2, fontWeight: '500' }}>
                                    {segmentMinutes}분
                                  </Text>
                                </View>
                              );
                            });
                          })()}
                          {/* 버스 아이콘을 프로그레스 바 위에 배치 - 세그먼트 기반 위치 */}
                          {(() => {
                            if (!selectedJourneyInfo?.selectedPath?.subPath) {
                              return null;
                            }
                            
                            const subPath = selectedJourneyInfo.selectedPath.subPath;
                            const currentSegmentIdx = displayTrackingState?.currentSegmentIndex ?? 0;
                            
                            if (currentSegmentIdx >= subPath.length) {
                              return null;
                            }
                            
                            // 전체 경로의 총 소요 시간 계산
                            const totalTime = subPath.reduce((sum, segment) => {
                              return sum + (segment.sectionTime || 0);
                            }, 0);
                            
                            if (totalTime === 0) {
                              return null;
                            }
                            
                            // 이전 세그먼트들의 누적 퍼센트 계산
                            let previousSegmentsPercent = 0;
                            for (let i = 0; i < currentSegmentIdx; i++) {
                              const segmentTime = subPath[i]?.sectionTime || 0;
                              previousSegmentsPercent += (segmentTime / totalTime) * 100;
                            }
                            
                            // 현재 세그먼트의 퍼센트 계산
                            const currentSegmentTime = subPath[currentSegmentIdx]?.sectionTime || 0;
                            const currentSegmentPercent = (currentSegmentTime / totalTime) * 100;
                            
                            // 실시간 위치가 있으면 그 위치에, 없으면 현재 세그먼트의 중간에 배치
                            let iconPosition = 0;
                            
                            if (displayTrackingState && getCurrentSegmentInfo()) {
                              // 실시간 진행률 계산 (세그먼트 내부 진행률)
                              const segmentProgress = ((getCurrentSegmentInfo()?.currentStopIndex || 0) /
                                Math.max(1, getCurrentSegmentInfo()?.totalStops || 1));
                              
                              // 현재 세그먼트 내부에서의 위치를 전체 경로 퍼센트로 변환
                              const segmentInternalPercent = currentSegmentPercent * segmentProgress;
                              iconPosition = previousSegmentsPercent + segmentInternalPercent;
                            } else {
                              // 실시간 위치가 없으면 현재 세그먼트의 중간에 배치
                              iconPosition = previousSegmentsPercent + (currentSegmentPercent / 2);
                            }
                            
                            // 세그먼트 타입에 따라 아이콘 선택
                            const currentSegment = subPath[currentSegmentIdx];
                            const trafficType = currentSegment?.trafficType;
                            
                            const getIconSource = () => {
                              if (trafficType === 1) {
                                // 지하철
                                return require('../../assets/Subway.png');
                              } else if (trafficType === 2) {
                                // 버스
                                return require('../../assets/BUS3DLeft.png');
                              } else if (trafficType === 3) {
                                // 도보
                                return require('../../assets/Human.png');
                              } else {
                                // 기본값: 버스
                                return require('../../assets/BUS3DLeft.png');
                              }
                            };
                            
                            // 아이콘 크기 결정 (도보와 지하철은 더 크게)
                            const iconWidth = (trafficType === 3 || trafficType === 1) ? 80 : 60; // 도보 또는 지하철: 80, 버스: 60
                            const iconHeight = (trafficType === 3 || trafficType === 1) ? 60 : 45; // 도보 또는 지하철: 60, 버스: 45
                            const translateX = (trafficType === 3 || trafficType === 1) ? -40 : -30; // 크기에 맞게 위치 조정

                            return (
                              <View
                                style={{
                                  position: 'absolute',
                                  left: `${Math.min(100, Math.max(0, iconPosition))}%`,
                                  top: -20,
                                  transform: [{ translateX }],
                                }}
                              >
                                <Image
                                  source={getIconSource()}
                                  style={{ width: iconWidth, height: iconHeight }}
                                  resizeMode="contain"
                                />
                              </View>
                            );
                          })()}
                        </View>
                        {/* CTAGuide.md: "강남구청역 지난 후 3분 더 이동" 형식 - 경로 세그먼트 기반 */}
                        {(() => {
                          const currentSegment = getCurrentSegmentInfo();
                          if (!currentSegment || !selectedJourneyInfo?.selectedPath?.subPath) {
                            return null;
                          }
                          
                          const subPath = selectedJourneyInfo.selectedPath.subPath;
                          const currentSegmentIdx = displayTrackingState?.currentSegmentIndex ?? 0;
                          
                          // 현재 세그먼트가 지하철/버스인 경우
                          if (currentSegment.trafficType === 1 || currentSegment.trafficType === 2) {
                            const currentSegmentData = subPath[currentSegmentIdx];
                            
                            // 목적지 이름 가져오기
                            let destinationName = currentSegment.endName || '목적지';
                            
                            // 지하철이면 역 이름에 "역" 붙이기
                            if (currentSegment.trafficType === 1) {
                              destinationName = destinationName.endsWith('역')
                                ? destinationName
                                : `${destinationName}역`;
                            }
                            
                            // 남은 정거장/역 수 계산
                            let remainingStops = 0;
                            if (currentSegmentData) {
                              // passStopList가 있으면 그 길이를 사용
                              if (currentSegmentData.passStopList && Array.isArray(currentSegmentData.passStopList)) {
                                const totalStops = currentSegmentData.passStopList.length;
                                // 현재 정거장 인덱스는 프로그레스 바의 진행률을 기반으로 추정
                                const progress = displayTrackingState && getCurrentSegmentInfo()
                                  ? ((getCurrentSegmentInfo()?.currentStopIndex || 0) / Math.max(1, getCurrentSegmentInfo()?.totalStops || 1))
                                  : 0;
                                const currentStopIdx = Math.floor(totalStops * progress);
                                remainingStops = Math.max(0, totalStops - currentStopIdx - 1);
                              } else {
                                // passStopList가 없으면 sectionTime과 현재 진행률로 추정
                                const progress = displayTrackingState && getCurrentSegmentInfo()
                                  ? ((getCurrentSegmentInfo()?.currentStopIndex || 0) / Math.max(1, getCurrentSegmentInfo()?.totalStops || 1))
                                  : 0;
                                // 간단한 추정: 전체 정거장 수를 10개로 가정하고 진행률로 계산
                                const estimatedTotalStops = 10;
                                const currentStopIdx = Math.floor(estimatedTotalStops * progress);
                                remainingStops = Math.max(0, estimatedTotalStops - currentStopIdx - 1);
                              }
                            }
                            
                            // 지하철이면 "역", 버스면 "정거장"
                            const stopLabel = currentSegment.trafficType === 1 ? '역' : '정거장';
                            
                            if (remainingStops > 0) {
                              return (
                                <Layer2ProgressSubText>
                                  {destinationName}까지 {remainingStops}{stopLabel} 남음
                                </Layer2ProgressSubText>
                              );
                            } else {
                              return (
                                <Layer2ProgressSubText>
                                  {destinationName} 곧 도착
                                </Layer2ProgressSubText>
                              );
                            }
                          }
                          
                          // 도보인 경우
                          if (currentSegment.trafficType === 3) {
                            const nextStop = getNextStopInfo();
                            if (nextStop && !nextStop.isDestination) {
                              // 목업 데이터: 10분 고정
                              return (
                                <Layer2ProgressSubText>
                                  {nextStop.stopName}까지 10분 도보 이동
                                </Layer2ProgressSubText>
                              );
                            }
                          }
                          
                          return null;
                        })()}
                      </Layer2Timeline>

                      {/* ========== Layer 3: Next Action (35%) - 다음 환승 정보 ========== */}
                      <Layer3NextAction>
                        <Layer3TitleContainer>
                          <Layer3Title>
                            {displayTrackingState && getNextStopInfo()?.isDestination
                              ? '최종 목적지'
                              : displayTrackingState && getCurrentSegmentInfo()?.trafficType === 3
                              ? '다음 탑승'
                              : '다음 환승'}
                          </Layer3Title>
                          {/* 중간 도보 세그먼트가 있으면 작은 타원 형태로 표시 */}
                          {(() => {
                            const walkSegment = getNextWalkSegment();
                            if (walkSegment) {
                              return (
                                <Layer3WalkBadge>
                                  <Layer3WalkBadgeText>2분 도보 이동</Layer3WalkBadgeText>
                                </Layer3WalkBadge>
                              );
                            }
                            return null;
                          })()}
                        </Layer3TitleContainer>
                        <Layer3Content>
                          {/* CTAGuide.md: "🚇 9호선 급행 🕒 4분 뒤 도착" 형식 - 한 줄에 배치 */}
                          <Layer3TransitInfo>
                            <Layer3TransitIcon>
                              {(() => {
                                const nextStop = getNextStopInfo();

                                // 최종 목적지인 경우
                                if (nextStop?.isDestination) {
                                  return '🚶';
                                }

                                // 다음 환승/탑승 세그먼트가 지하철인 경우
                                if (nextStop && nextStop.trafficType === 1) {
                                  return '🚇';
                                }

                                // 다음 환승/탑승 세그먼트가 버스인 경우
                                if (nextStop && nextStop.trafficType === 2) {
                                  return '🚌';
                                }

                                // 기본값: 지하철 아이콘
                                return '🚇';
                              })()}
                            </Layer3TransitIcon>
                            <Layer3TransitNumber>
                              {(() => {
                                const nextStop = getNextStopInfo();

                                // 최종 목적지인 경우
                                if (nextStop?.isDestination) {
                                  return '도보';
                                }

                                // 다음 환승/탑승 세그먼트가 버스/지하철인 경우
                                if (nextStop) {
                                  if (nextStop.trafficType === 1 && nextStop.subwayLine) {
                                    return `${nextStop.subwayLine} 급행`; // 지하철: "9호선 급행"
                                  }
                                  if (nextStop.transportInfo) {
                                    return nextStop.transportInfo;
                                  }
                                  // 기본값
                                  return '9호선 급행';
                                }

                                // 데이터가 없어도 기본값 표시
                                return '9호선 급행';
                              })()}
                            </Layer3TransitNumber>
                            <Layer3TransitTime>
                              🕒 {(() => {
                                const nextStop = getNextStopInfo();

                                // 최종 목적지인 경우
                                if (nextStop?.isDestination) {
                                  return `${selectedJourneyInfo?.arriveTime || '--:--'}`;
                                }

                                // 다음 환승/탑승 세그먼트가 버스/지하철인 경우
                                if (nextStop) {
                                  // 목업 데이터: 10분 고정
                                  return '10분 뒤 도착';
                                }

                                // 데이터가 없어도 기본값 표시
                                return '4분 뒤 도착';
                              })()}
                            </Layer3TransitTime>
                          </Layer3TransitInfo>
                          <Layer3TransitDetail>
                            {(() => {
                              const currentSegment = getCurrentSegmentInfo();
                              const nextStop = getNextStopInfo();

                              // 최종 목적지까지 도보인 경우
                              if (nextStop?.isDestination && currentSegment?.trafficType === 3) {
                                return (
                                  <Layer3TransitDetailText>
                                    {`${nextStop?.stopName || '목적지'} 도착 예정`}
                                  </Layer3TransitDetailText>
                                );
                              }

                              // 다음 세그먼트가 지하철인 경우 - 방면 정보와 칸 추천을 함께 표시
                              if (
                                nextStop &&
                                !nextStop.isDestination &&
                                nextStop.trafficType === 1 &&
                                nextStop.subwayDirection
                              ) {
                                // 지하철 칸 추천 (다양한 목업 데이터)
                                const recommendedCars = ['1-2칸', '3-2칸', '4-5칸', '5-6칸', '7-8칸'];
                                const recommendedCar = recommendedCars[Math.floor(Math.random() * recommendedCars.length)];
                                
                                // 혼잡도 (다양한 목업 데이터)
                                const crowdLevels = ['쾌적', '보통', '혼잡', '매우 혼잡'];
                                const crowdLevel = crowdLevels[Math.floor(Math.random() * crowdLevels.length)];
                                
                                return (
                                  <>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                                      <Layer3TransitDetailText>{nextStop.subwayDirection}</Layer3TransitDetailText>
                                      <Layer3TransitDetailRecommend>[{recommendedCar} 추천]</Layer3TransitDetailRecommend>
                                    </View>
                                    <Layer3CrowdLevel>
                                      <Layer3CrowdLevelText>혼잡도: {crowdLevel}</Layer3CrowdLevelText>
                                    </Layer3CrowdLevel>
                                  </>
                                );
                              }

                              // 다음 세그먼트가 버스인 경우
                              if (nextStop && !nextStop.isDestination && nextStop.trafficType === 2 && displayTrackingState) {
                                return (
                                  <Layer3TransitDetailText>
                                    {`${nextStop?.stopName || '정류장'} 도착`}
                                  </Layer3TransitDetailText>
                                );
                              }

                              return <Layer3TransitDetailText>경로 감지 중...</Layer3TransitDetailText>;
                            })()}
                          </Layer3TransitDetail>
                        </Layer3Content>
                      </Layer3NextAction>
                    </DepartureCardContainer>
                  ) : card.id === 'weather' && typeof card.content === 'object' && !Array.isArray(card.content) && 'origin' in card.content ? (
                    /* 날씨 카드: 출발지/도착지 날씨 표시 */
                    <WeatherCardContainer>
                      <WeatherCardHeader>
                        <WeatherCardTitle>{card.title}</WeatherCardTitle>
                        <CardIconBox>
                          {card.iconImage ? (
                            <CardIconImage source={card.iconImage} />
                          ) : (
                            <CardTitle style={{ fontSize: 28 }}>{card.icon}</CardTitle>
                          )}
                        </CardIconBox>
                      </WeatherCardHeader>
                      
                      <WeatherCardContent>
                        {/* 출발지 날씨 */}
                        <WeatherLocationBox>
                          <WeatherLocationName>{(card.content as any).origin.name}</WeatherLocationName>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: theme.spacing.xs }}>
                            <Text style={{ fontSize: 32, marginRight: theme.spacing.xs }}>
                              {getWeatherIconEmoji((card.content as any).origin.condition || 'clear')}
                            </Text>
                            {(card.content as any).origin.temperature !== null ? (
                              <WeatherTemperature>{Math.round((card.content as any).origin.temperature)}°</WeatherTemperature>
                            ) : null}
                          </View>
                          <WeatherDescription>{(card.content as any).origin.weather}</WeatherDescription>
                        </WeatherLocationBox>
                        
                        {/* 도착지 날씨 */}
                        <WeatherLocationBox>
                          <WeatherLocationName>{(card.content as any).destination.name}</WeatherLocationName>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: theme.spacing.xs }}>
                            <Text style={{ fontSize: 32, marginRight: theme.spacing.xs }}>
                              {getWeatherIconEmoji((card.content as any).destination.condition || 'clear')}
                            </Text>
                            {(card.content as any).destination.temperature !== null ? (
                              <WeatherTemperature>{Math.round((card.content as any).destination.temperature)}°</WeatherTemperature>
                            ) : null}
                          </View>
                          <WeatherDescription>{(card.content as any).destination.weather}</WeatherDescription>
                        </WeatherLocationBox>
                      </WeatherCardContent>
                      
                      {/* 배지 */}
                      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: theme.spacing.sm }}>
                        {card.badges.map((badge, idx) => (
                          <CardBadge key={idx}>
                            <CardBadgeText>{badge}</CardBadgeText>
                          </CardBadge>
                        ))}
                      </View>
                    </WeatherCardContainer>
                  ) : card.id === 'hazard' && typeof card.content === 'object' && !Array.isArray(card.content) && 'origin' in card.content ? (
                    // 위험 감지 카드: 출발지/경유지/도착지 구간별 재난 문자 표시
                    <View style={{ width: '100%', height: '45%', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <CardHeader>
                        <CardIconBox>
                          {card.iconImage ? (
                            <CardIconImage source={card.iconImage} />
                          ) : (
                            <CardTitle style={{ fontSize: 28 }}>{card.icon}</CardTitle>
                          )}
                        </CardIconBox>
                        <View style={{ flex: 1 }}>
                          <CardTitle>{card.title}</CardTitle>
                        </View>
                      </CardHeader>

                      <CardContent style={{ flex: 1, gap: theme.spacing.sm }}>
                        {(() => {
                          const segments = card.content as { origin: DisasterAlert[]; waypoints: DisasterAlert[]; destination: DisasterAlert[] };
                          const hasAnyAlerts = segments.origin.length > 0 || segments.waypoints.length > 0 || segments.destination.length > 0;

                          if (!hasAnyAlerts) {
                            return (
                              <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                                <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: theme.fonts.sizes.sm }}>
                                  경로상 재난 문자가 없습니다
                                </Text>
                              </View>
                            );
                          }

                          return (
                            <View style={{ flex: 1, gap: theme.spacing.xs }}>
                              {/* 출발지 구간 */}
                              <View
                                style={{
                                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                                  borderRadius: theme.borderRadius.md,
                                  padding: theme.spacing.sm,
                                  borderLeftWidth: 3,
                                  borderLeftColor: '#4CAF50',
                                }}
                              >
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.xs / 2 }}>
                                  <Text style={{ color: '#4CAF50', fontSize: theme.fonts.sizes.sm, fontWeight: '800', marginRight: theme.spacing.xs }}>
                                    출발지
                                  </Text>
                                  <Text style={{ color: 'white', fontSize: theme.fonts.sizes.sm, fontWeight: '700' }}>
                                    {selectedJourneyInfo?.originName || '출발지'}
                                  </Text>
                                </View>
                                {segments.origin.length > 0 ? (
                                  <>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.xs / 2 }}>
                                      <Text style={{ fontSize: 16, marginRight: theme.spacing.xs / 2 }}>
                                        {segments.origin[0].icon || '⚠️'}
                                      </Text>
                                      <Text style={{ color: 'white', fontSize: theme.fonts.sizes.sm, fontWeight: '700', flex: 1 }}>
                                        {segments.origin[0].type || '재난'}
                                      </Text>
                                    </View>
                                    <Text
                                      style={{
                                        color: 'white',
                                        fontSize: theme.fonts.sizes.sm,
                                        fontWeight: '600',
                                        lineHeight: theme.fonts.sizes.sm * 1.4,
                                      }}
                                      numberOfLines={1}
                                    >
                                      {segments.origin[0].message || '재난 문자 내용'}
                                    </Text>
                                  </>
                                ) : (
                                  <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: theme.fonts.sizes.sm, fontWeight: '500' }}>
                                    재난 정보 없음
                                  </Text>
                                )}
                              </View>

                              {/* 경유지 구간 */}
                              <View
                                style={{
                                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                                  borderRadius: theme.borderRadius.md,
                                  padding: theme.spacing.sm,
                                  borderLeftWidth: 3,
                                  borderLeftColor: '#FF9800',
                                }}
                              >
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.xs / 2 }}>
                                  <Text style={{ color: '#FF9800', fontSize: theme.fonts.sizes.sm, fontWeight: '800', marginRight: theme.spacing.xs }}>
                                    경유지
                                  </Text>
                                  <Text style={{ color: 'white', fontSize: theme.fonts.sizes.sm, fontWeight: '700' }}>
                                    경로상 정류장
                                  </Text>
                                </View>
                                {segments.waypoints.length > 0 ? (
                                  <>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.xs / 2 }}>
                                      <Text style={{ fontSize: 16, marginRight: theme.spacing.xs / 2 }}>
                                        {segments.waypoints[0].icon || '⚠️'}
                                      </Text>
                                      <Text style={{ color: 'white', fontSize: theme.fonts.sizes.sm, fontWeight: '700', flex: 1 }}>
                                        {segments.waypoints[0].type || '재난'}
                                      </Text>
                                    </View>
                                    <Text
                                      style={{
                                        color: 'white',
                                        fontSize: theme.fonts.sizes.sm,
                                        fontWeight: '600',
                                        lineHeight: theme.fonts.sizes.sm * 1.4,
                                      }}
                                      numberOfLines={1}
                                    >
                                      {segments.waypoints[0].message || '재난 문자 내용'}
                                    </Text>
                                  </>
                                ) : (
                                  <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: theme.fonts.sizes.sm, fontWeight: '500' }}>
                                    재난 정보 없음
                                  </Text>
                                )}
                              </View>

                              {/* 도착지 구간 */}
                              <View
                                style={{
                                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                                  borderRadius: theme.borderRadius.md,
                                  padding: theme.spacing.sm,
                                  borderLeftWidth: 3,
                                  borderLeftColor: '#2196F3',
                                }}
                              >
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.xs / 2 }}>
                                  <Text style={{ color: '#2196F3', fontSize: theme.fonts.sizes.sm, fontWeight: '800', marginRight: theme.spacing.xs }}>
                                    도착지
                                  </Text>
                                  <Text style={{ color: 'white', fontSize: theme.fonts.sizes.sm, fontWeight: '700' }}>
                                    {selectedJourneyInfo?.destinationName || '도착지'}
                                  </Text>
                                </View>
                                {segments.destination.length > 0 ? (
                                  <>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.xs / 2 }}>
                                      <Text style={{ fontSize: 16, marginRight: theme.spacing.xs / 2 }}>
                                        {segments.destination[0].icon || '⚠️'}
                                      </Text>
                                      <Text style={{ color: 'white', fontSize: theme.fonts.sizes.sm, fontWeight: '700', flex: 1 }}>
                                        {segments.destination[0].type || '재난'}
                                      </Text>
                                    </View>
                                    <Text
                                      style={{
                                        color: 'white',
                                        fontSize: theme.fonts.sizes.sm,
                                        fontWeight: '600',
                                        lineHeight: theme.fonts.sizes.sm * 1.4,
                                      }}
                                      numberOfLines={1}
                                    >
                                      {segments.destination[0].message || '재난 문자 내용'}
                                    </Text>
                                  </>
                                ) : (
                                  <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: theme.fonts.sizes.sm, fontWeight: '500' }}>
                                    재난 정보 없음
                                  </Text>
                                )}
                              </View>
                            </View>
                          );
                        })()}
                      </CardContent>
                    </View>
                  ) : card.id === 'traffic' ? (
                    // 새로운 경로 추천 카드
                    <View style={{ width: '100%', height: '40%', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <CardHeader>
                        <CardIconBox>
                          {card.iconImage ? (
                            <CardIconImage source={card.iconImage} />
                          ) : (
                            <CardTitle style={{ fontSize: 28 }}>{card.icon}</CardTitle>
                          )}
                        </CardIconBox>
                        <View style={{ flex: 1 }}>
                          <CardTitle style={{ marginBottom: 0 }}>{card.title}</CardTitle>
                        </View>
                      </CardHeader>

                      <CardContent style={{ flex: 1, justifyContent: 'flex-start', gap: theme.spacing.md, paddingTop: 0, marginTop: -theme.spacing.xs }}>
                        {/* 소요 시간 */}
                        <View style={{ alignItems: 'center', gap: theme.spacing.xs }}>
                          <Text style={{ color: 'white', fontSize: theme.fonts.sizes.xxl, fontWeight: '800', textAlign: 'center' }}>
                            {(() => {
                              if (selectedJourneyInfo) {
                                return `${selectedJourneyInfo.estimatedDurationMinutes || 45}분`;
                              }
                              return '45분';
                            })()}
                          </Text>
                          <Text style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: theme.fonts.sizes.sm, fontWeight: '600', textAlign: 'center' }}>
                            제일 빠른 경로
                          </Text>
                        </View>

                        {/* 경로 막대 */}
                        {selectedJourneyInfo && selectedJourneyInfo.selectedPath?.subPath ? (
                          <View style={{ width: '100%', gap: theme.spacing.xs }}>
                            <View style={{ position: 'relative', marginBottom: theme.spacing.md }}>
                              {/* 프로그레스 바 */}
                              <ProgressBarContainer>
                                {(() => {
                                  const subPath = selectedJourneyInfo.selectedPath.subPath;
                                  
                                  // 전체 경로의 총 소요 시간 계산
                                  const totalTime = subPath.reduce((sum: number, segment: any) => {
                                    return sum + (segment.sectionTime || 0);
                                  }, 0);

                                  if (totalTime === 0) return null;

                                  let previousSegmentsPercent = 0;

                                  // 세그먼트별 색상 함수
                                  const getSegmentColor = (trafficType: number): string => {
                                    switch (trafficType) {
                                      case 3: // 도보
                                        return 'rgba(128, 128, 128, 0.9)'; // 회색
                                      case 2: // 버스
                                        return 'rgba(33, 150, 243, 0.9)'; // 파란색
                                      case 1: // 지하철
                                        return 'rgba(76, 175, 80, 0.9)'; // 초록색
                                      default:
                                        return 'rgba(255, 255, 255, 0.9)';
                                    }
                                  };

                                  return subPath.map((segment: any, index: number) => {
                                    const segmentTime = segment.sectionTime || 0;
                                    const segmentPercent = (segmentTime / totalTime) * 100;
                                    const segmentStart = previousSegmentsPercent;
                                    
                                    previousSegmentsPercent += segmentPercent;

                                    return (
                                      <ProgressBar
                                        key={index}
                                        progress={segmentPercent}
                                        color={getSegmentColor(segment.trafficType)}
                                        left={segmentStart}
                                      />
                                    );
                                  });
                                })()}
                              </ProgressBarContainer>

                              {/* 세그먼트 정보 (프로그레스 바 위) */}
                              {(() => {
                                const subPath = selectedJourneyInfo.selectedPath.subPath;
                                const totalTime = subPath.reduce((sum: number, segment: any) => {
                                  return sum + (segment.sectionTime || 0);
                                }, 0);

                                if (totalTime === 0) return null;

                                let previousSegmentsPercent = 0;

                                return subPath.map((segment: any, index: number) => {
                                  const segmentTime = segment.sectionTime || 0;
                                  // sectionTime이 초 단위인지 분 단위인지 확인
                                  // ODSAY API 문서에 따르면 sectionTime은 초 단위
                                  // 하지만 값이 작으면(예: 5, 31) 이미 분 단위일 수도 있음
                                  // 일반적으로 버스/지하철은 30분 이상이므로, 60보다 작으면 분 단위로 간주
                                  let segmentMinutes = 0;
                                  if (segmentTime > 0) {
                                    if (segmentTime < 60) {
                                      // 이미 분 단위로 추정
                                      segmentMinutes = Math.round(segmentTime);
                                    } else {
                                      // 초 단위로 추정 (분으로 변환)
                                      segmentMinutes = Math.round(segmentTime / 60);
                                    }
                                    // 최소 1분 표시 (0분이면 표시되지 않음)
                                    if (segmentMinutes === 0 && segmentTime > 0) {
                                      segmentMinutes = 1;
                                    }
                                  }
                                  const segmentPercent = (segmentTime / totalTime) * 100;
                                  const segmentStart = previousSegmentsPercent;
                                  const segmentCenter = segmentStart + (segmentPercent / 2);
                                  
                                  previousSegmentsPercent += segmentPercent;

                                  // 세그먼트 정보 텍스트 생성
                                  let segmentText = '';
                                  let segmentIcon = '';
                                  
                                  // trafficType에 따라 아이콘과 텍스트 설정
                                  if (segment.trafficType === 1) {
                                    // 지하철
                                    segmentIcon = '🚇';
                                    const lane = segment.lane?.[0];
                                    if (lane?.subwayCode) {
                                      // 호선 정보가 있으면 호선 표시 (예: "1호선")
                                      segmentText = `${lane.subwayCode}호선`;
                                    } else if (lane?.subwayName) {
                                      // 호선 정보가 없으면 노선명 표시
                                      segmentText = lane.subwayName;
                                    } else {
                                      segmentText = '지하철';
                                    }
                                  } else if (segment.trafficType === 2) {
                                    // 버스
                                    segmentIcon = '🚌';
                                    segmentText = segment.lane?.[0]?.busNo ? `${segment.lane[0].busNo}번` : '버스';
                                  } else if (segment.trafficType === 3) {
                                    // 도보 - 프로그래스 바 위에 표시하지 않음
                                    return null;
                                  } else {
                                    // 알 수 없는 타입
                                    return null;
                                  }

                                  // 세그먼트가 너무 작으면 표시하지 않음
                                  if (segmentPercent < 5) return null;

                                  return (
                                    <View
                                      key={`info-${index}`}
                                      style={{
                                        position: 'absolute',
                                        left: `${segmentCenter}%`,
                                        top: -20,
                                        transform: [{ translateX: -50 }], // 중앙 정렬
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 4,
                                      }}
                                    >
                                      <Text style={{ color: 'white', fontSize: theme.fonts.sizes.xs - 1 }}>
                                        {segmentIcon}
                                      </Text>
                                      <Text style={{ color: 'white', fontSize: theme.fonts.sizes.xs - 1, fontWeight: '600' }}>
                                        {segmentText}
                                      </Text>
                                      <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: theme.fonts.sizes.xs - 2, fontWeight: '500' }}>
                                        {segmentMinutes}분
                                      </Text>
                                    </View>
                                  );
                                });
                              })()}
                            </View>

                            {/* 경로 정보 */}
                            <View style={{ gap: theme.spacing.xs / 2, width: '100%' }}>
                              {/* 출발지 → 목적지 */}
                              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.xs }}>
                                <Text style={{ color: 'white', fontSize: theme.fonts.sizes.sm, fontWeight: '600' }}>
                                  {selectedJourneyInfo.originName || '출발지'}
                                </Text>
                                <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: theme.fonts.sizes.xs }}>→</Text>
                                <Text style={{ color: 'white', fontSize: theme.fonts.sizes.sm, fontWeight: '600' }}>
                                  {selectedJourneyInfo.destinationName || '목적지'}
                                </Text>
                              </View>

                              {/* 경로 상세 정보 (세그먼트별 - 가로 배치) */}
                              {(() => {
                                const subPath = selectedJourneyInfo.selectedPath.subPath;
                                if (!subPath || subPath.length === 0) return null;

                                // 유효한 세그먼트만 필터링 (trafficType이 0이 아닌 것)
                                const validSegments = subPath.filter((seg: any) => seg.trafficType !== 0);

                                return (
                                  <View style={{ marginTop: theme.spacing.sm, width: '100%' }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: theme.spacing.xs }}>
                                      {validSegments.map((segment: any, idx: number) => {
                                        // sectionTime 변환 로직
                                        const segmentTime = segment.sectionTime || 0;
                                        let segmentMinutes = 0;
                                        if (segmentTime > 0) {
                                          if (segmentTime < 60) {
                                            segmentMinutes = Math.round(segmentTime);
                                          } else {
                                            segmentMinutes = Math.round(segmentTime / 60);
                                          }
                                          if (segmentMinutes === 0 && segmentTime > 0) {
                                            segmentMinutes = 1;
                                          }
                                        }
                                        
                                        // 세그먼트 타입별 아이콘 및 라벨
                                        let icon = '👣';
                                        let segmentLabel = '도보';
                                        
                                        if (segment.trafficType === 1) {
                                          // 지하철
                                          icon = '🚇';
                                          if (segment.lane?.[0]?.subwayName) {
                                            segmentLabel = segment.lane[0].subwayName;
                                          } else {
                                            segmentLabel = '지하철';
                                          }
                                        } else if (segment.trafficType === 2) {
                                          // 버스
                                          icon = '🚌';
                                          if (segment.lane?.[0]?.busNo) {
                                            segmentLabel = `${segment.lane[0].busNo}번`;
                                          } else {
                                            segmentLabel = '버스';
                                          }
                                        } else if (segment.trafficType === 3) {
                                          // 도보
                                          icon = '👣';
                                          segmentLabel = '도보';
                                        }

                                        return (
                                          <View
                                            key={idx}
                                            style={{
                                              flexDirection: 'row',
                                              alignItems: 'center',
                                              gap: 4,
                                            }}
                                          >
                                            {/* 아이콘 */}
                                            <Text style={{ fontSize: 18 }}>{icon}</Text>
                                            
                                            {/* 세그먼트 라벨 */}
                                            <Text style={{ color: 'white', fontSize: theme.fonts.sizes.sm, fontWeight: '600' }}>
                                              {segmentLabel}
                                            </Text>
                                            
                                            {/* 소요 시간 */}
                                            {segmentMinutes > 0 && (
                                              <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: theme.fonts.sizes.xs }}>
                                                {segmentMinutes}분
                                              </Text>
                                            )}
                                            
                                            {/* 화살표 (마지막이 아닐 때) */}
                                            {idx < validSegments.length - 1 && (
                                              <Text style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: theme.fonts.sizes.sm, marginLeft: theme.spacing.xs }}>
                                                →
                                              </Text>
                                            )}
                                          </View>
                                        );
                                      })}
                                    </View>
                                  </View>
                                );
                              })()}
                            </View>
                          </View>
                        ) : null}
                        
                        {/* 배지 */}
                        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 'auto' }}>
                          {card.badges.map((badge, idx) => (
                            <CardBadge key={idx}>
                              <CardBadgeText>{badge}</CardBadgeText>
                            </CardBadge>
                          ))}
                        </View>
                      </CardContent>
                    </View>
                  ) : card.id === 'delay' && typeof card.content === 'object' && 'transport' in card.content ? (
                    // 지연 감지 카드
                    <View style={{ width: '100%', height: '40%', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <CardHeader>
                        <CardIconBox>
                          {card.iconImage ? (
                            <CardIconImage source={card.iconImage} />
                          ) : (
                            <CardTitle style={{ fontSize: 28 }}>{card.icon}</CardTitle>
                          )}
                        </CardIconBox>
                        <View style={{ flex: 1 }}>
                          <CardTitle style={{ marginBottom: 0 }}>{card.title}</CardTitle>
                        </View>
                      </CardHeader>

                      <CardContent style={{ flex: 1, justifyContent: 'flex-start', gap: theme.spacing.md, paddingTop: 0, marginTop: -theme.spacing.xs }}>
                        {/* 지연 정보 */}
                        <View style={{ alignItems: 'center', gap: theme.spacing.xs }}>
                          <Text style={{ color: 'white', fontSize: theme.fonts.sizes.lg, fontWeight: '700', textAlign: 'center' }}>
                            {(() => {
                              const transport = (card.content as any).transport;
                              const transportType = (card.content as any).transportType || 'bus';
                              const particle = transportType === 'bus' ? '가' : '이';
                              return `${transport}${particle} 평소보다`;
                            })()}
                          </Text>
                          <Text style={{ color: '#FFE082', fontSize: theme.fonts.sizes.xxl, fontWeight: '800', textAlign: 'center' }}>
                            {(card.content as any).delayMinutes}분 이상 지연
                          </Text>
                        </View>

                        {/* 예상 도착 시간 */}
                        <View style={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.15)', 
                          padding: theme.spacing.md, 
                          borderRadius: theme.borderRadius.md,
                          alignItems: 'center',
                          gap: theme.spacing.xs,
                        }}>
                          <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: theme.fonts.sizes.sm }}>
                            예상 도착 시간
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.xs }}>
                            <Text style={{ color: 'white', fontSize: theme.fonts.sizes.xl, fontWeight: '700' }}>
                              {(card.content as any).expectedArrival}
                            </Text>
                            <Text style={{ color: '#FFE082', fontSize: theme.fonts.sizes.md, fontWeight: '600' }}>
                              ({(card.content as any).delayIncrease}분 증가)
                            </Text>
                          </View>
                        </View>
                        
                        {/* 배지 */}
                        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 'auto' }}>
                          {card.badges.map((badge, idx) => (
                            <CardBadge key={idx}>
                              <CardBadgeText>{badge}</CardBadgeText>
                            </CardBadge>
                          ))}
                        </View>
                      </CardContent>
                    </View>
                  ) : (
                    <>
                  <CardHeader>
                    <CardIconBox>
                      {card.iconImage ? (
                        <CardIconImage source={card.iconImage} />
                      ) : (
                        <CardTitle style={{ fontSize: 28 }}>{card.icon}</CardTitle>
                      )}
                    </CardIconBox>
                    <View style={{ flex: 1 }}>
                      <CardTitle>{card.title}</CardTitle>
                    </View>
                  </CardHeader>

                  <CardContent>
                    <CardText>{typeof card.content === 'string' ? card.content : JSON.stringify(card.content)}</CardText>
                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                      {card.badges.map((badge, idx) => (
                        <CardBadge key={idx}>
                          <CardBadgeText>{badge}</CardBadgeText>
                        </CardBadge>
                      ))}
                    </View>
                  </CardContent>
                    </>
                  )}

                  {/* Carousel pagination dots */}
                  <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 8 }}>
                    {cards.map((_, dotIndex) => (
                      <View
                        key={dotIndex}
                        style={{
                          width: dotIndex === activeCardIndex ? 20 : 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: 'rgba(255, 255, 255, ' + (dotIndex === activeCardIndex ? '1' : '0.4') + ')',
                        }}
                      />
                    ))}
                  </View>
                </CardBase>
                </TouchableOpacity>
              </View>
            );
            })}
          </ScrollView>

          {/* Phase 8.3: Journey Details Card */}
          <JourneyDetailsCard>
            <JourneyHeaderBar>
              <View>
                <JourneyHeaderText isSubtitle>총 예상 소요 시간</JourneyHeaderText>
                <JourneyHeaderText>{selectedJourneyInfo?.estimatedDurationMinutes || 45}분</JourneyHeaderText>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <JourneyHeaderText isSubtitle>예상 도착시간</JourneyHeaderText>
                <JourneyHeaderText>{selectedJourneyInfo?.arriveTime || '--:--'}</JourneyHeaderText>
              </View>
            </JourneyHeaderBar>

            <ScrollView
              style={{
                height: 450,
                padding: theme.spacing.md,
              }}
              scrollEnabled={true}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
              bounces={true}
            >
              <JourneyStepsContent>
              {selectedJourneyInfo ? (
                // 선택된 여정이 있을 때: 실제 경로 세그먼트 표시
                (() => {
                  const steps: Array<any> = [
                    {
                      icon: selectedJourneyInfo.originIcon || '📍',
                      title: selectedJourneyInfo.originName,
                      description: selectedJourneyInfo.originAddress,
                      duration: 0,
                      isStation: true,
                    },
                  ];

                  // 🆕 ODSAY 원본 subPath 사용 (더 정확한 데이터)
                  const subPath = selectedJourneyInfo.selectedPath?.subPath;

                  if (subPath && Array.isArray(subPath)) {
                    const trafficTypeMap: Record<number, string> = {
                      1: 'SUBWAY',
                      2: 'BUS',
                      3: 'WALK',
                      4: 'TAXI',
                      5: 'TRAIN',
                    };

                    subPath.forEach((segment: any, idx: number) => {

                      const type = trafficTypeMap[segment.trafficType] || 'OTHER';
                      
                      // 시간 변환: sectionTime은 초 단위이므로 분으로 변환
                      // parseSegments 함수와 동일한 로직 사용
                      let duration = 0;
                      if (segment.sectionTime) {
                        // sectionTime이 초 단위인지 분 단위인지 확인
                        // ODSAY API 문서에 따르면 sectionTime은 초 단위
                        // 하지만 값이 작으면(예: 5, 31) 이미 분 단위일 수도 있음
                        // 일반적으로 버스/지하철은 30분 이상이므로, 60보다 작으면 분 단위로 간주
                        if (segment.sectionTime < 60) {
                          // 이미 분 단위로 추정
                          duration = Math.round(segment.sectionTime);
                        } else {
                          // 초 단위로 추정 (분으로 변환)
                          const minutes = segment.sectionTime / 60;
                          duration = Math.round(minutes);
                        }
                        // 최소 1분 표시 (0분이면 표시되지 않음)
                        if (duration === 0 && segment.sectionTime > 0) {
                          duration = 1;
                        }
                      }

                      // 노선 정보 추출 및 제목 생성
                      let title = '';
                      if (type === 'WALK') {
                        title = '도보';
                      } else if (type === 'BUS') {
                        if (segment.lane && Array.isArray(segment.lane) && segment.lane.length > 0) {
                          const busNo = segment.lane[0].busNo;
                          title = busNo ? `${busNo}번 버스` : '버스';
                        } else {
                          title = '버스';
                        }
                      } else if (type === 'SUBWAY') {
                        if (segment.lane && Array.isArray(segment.lane) && segment.lane.length > 0) {
                          const subwayName = segment.lane[0].subwayName;
                          title = subwayName ? `${subwayName}` : '지하철';
                        } else {
                          title = '지하철';
                        }
                      } else {
                        title = type;
                      }

                      // 설명 생성 (startName과 endName이 있을 때만)
                      let description = '';
                      if (segment.startName && segment.endName) {
                        description = `${segment.startName} → ${segment.endName}`;
                      } else if (segment.startName) {
                        description = `${segment.startName}에서 출발`;
                      } else if (segment.endName) {
                        description = `${segment.endName}까지`;
                      } else {
                        description = type === 'WALK' ? '도보 이동' : '대중교통 이용';
                      }

                      // 버스의 경우 정류장 개수 정보 추가
                      if (type === 'BUS' && segment.stationCount) {
                        description += ` (${segment.stationCount}개 정류장)`;
                      }


                      // 모든 세그먼트 표시 (duration이 0이어도)
                      steps.push({
                        icon: getSegmentIcon(type),
                        title: title,
                        description: description,
                        duration: duration,
                        type: type,
                      });
                    });
                  } else if (selectedJourneyInfo.selectedPath?.segments) {
                    // Fallback: segments 배열이 있으면 그것을 사용 (UI 미리보기용)
                    selectedJourneyInfo.selectedPath.segments.forEach((segment: any) => {
                      steps.push({
                        icon: getSegmentIcon(segment.type),
                        title: `${segment.line || segment.type}`,
                        description: `${segment.startStation} → ${segment.endStation}`,
                        duration: segment.duration ? Math.round(parseInt(segment.duration) / 60) : 0,
                        type: segment.type,
                      });
                    });
                  }

                  // 도착지 추가
                  steps.push({
                    icon: selectedJourneyInfo.destinationIcon || '🏢',
                    title: selectedJourneyInfo.destinationName,
                    description: selectedJourneyInfo.destinationAddress,
                    duration: 0,
                    isStation: true,
                  });

                  return steps.map((step, index) => (
                    <StepItem key={index}>
                      <StepIconContainer>
                        <CardTitle style={{ fontSize: 22, color: '#666' }}>{step.icon}</CardTitle>
                    </StepIconContainer>
                    <StepContentBox>
                      <StepTitle>{step.title}</StepTitle>
                      <StepDescription>{step.description}</StepDescription>
                    </StepContentBox>
                    {step.duration > 0 ? (
                      <View style={{ justifyContent: 'center', alignItems: 'center', minWidth: 50 }}>
                        <CardTitle style={{ fontSize: 24, color: '#0066FF' }}>{step.duration}</CardTitle>
                        <StepDescription>분</StepDescription>
                      </View>
                    ) : step.type === 'WALK' ? (
                      // 도보는 시간이 짧아도 표시
                      <View style={{ justifyContent: 'center', alignItems: 'center', minWidth: 50 }}>
                        <CardTitle style={{ fontSize: 24, color: '#0066FF' }}>1</CardTitle>
                        <StepDescription>분</StepDescription>
                      </View>
                    ) : null}
                  </StepItem>
                  ));
                })()
              ) : (
                // 선택된 여정이 없을 때: 기본 경로 표시
                [
                  { icon: '🏠', title: '집', description: '출발지를 선택해주세요', duration: 0 },
                  { icon: '👣', title: '도보 이동', description: '최초 이동 시간', duration: 5 },
                  { icon: '🚇', title: '대중교통 탑승', description: '최적 경로로 이동', duration: 30 },
                  { icon: '👣', title: '도보 이동', description: '최종 목적지까지', duration: 5 },
                  { icon: '🏢', title: '목적지', description: '도착지를 선택해주세요', duration: 0 },
              ].map((step, index) => (
                  <StepItem key={index}>
                    <StepIconContainer>
                      <CardTitle style={{ fontSize: 22, color: '#666' }}>{step.icon}</CardTitle>
                  </StepIconContainer>
                  <StepContentBox>
                    <StepTitle>{step.title}</StepTitle>
                    <StepDescription>{step.description}</StepDescription>
                  </StepContentBox>
                  {step.duration > 0 && (
                    <View style={{ justifyContent: 'center', alignItems: 'center', minWidth: 50 }}>
                      <CardTitle style={{ fontSize: 24, color: '#0066FF' }}>{step.duration}</CardTitle>
                      <StepDescription>분</StepDescription>
                    </View>
                  )}
                </StepItem>
              ))
              )}
              </JourneyStepsContent>
            </ScrollView>
          </JourneyDetailsCard>

          {/* Phase 8.4: Quick Actions Grid */}
          <QuickActionsGrid>
            <TouchableOpacity
              onPress={handleDepartureAlarmPress}
              style={{ flex: 1 }}
              activeOpacity={0.8}
            >
              <QuickActionButton>
                <QuickActionText>🔔 출발 알림</QuickActionText>
              </QuickActionButton>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleCheckHazardsPress}
              style={{ flex: 1 }}
              activeOpacity={0.8}
            >
              <QuickActionButton style={{ backgroundColor: '#FF5722' }}>
                <QuickActionText>⚠️ 위험 확인</QuickActionText>
              </QuickActionButton>
            </TouchableOpacity>
          </QuickActionsGrid>

          {/* Phase 8.5: Footer Info */}
          <FooterContainer>
            <FooterText>협력 서비스: Odsay API, SKT 혼잡도 API, 행정안전부</FooterText>
            <FooterText>실시간 정보는 5분마다 자동 업데이트됩니다</FooterText>
          </FooterContainer>
        </Container>
      </ScrollContainer>

      {/* 새로고침 버튼 (오른쪽 아래) */}
      <RefreshButton
        onPress={() => {
          setCountdown(15); // 카운트다운 리셋
          refetchDisasterAlerts();
        }}
        activeOpacity={0.8}
      >
        <RefreshButtonIconWrapper>
          <MaterialIcons name="refresh" size={28} color="#FF5722" />
        </RefreshButtonIconWrapper>
        <RefreshButtonCountdown>{countdown}</RefreshButtonCountdown>
      </RefreshButton>

      {/* 경로 선택 모달 */}
      <Modal
        visible={isRouteSelectModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleRouteSelectCancel}
      >
        <ModalOverlay>
          <ModalContainer>
            <ModalTitle>새로운 경로 적용</ModalTitle>
            <ModalMessage>
              이 경로를 적용하시겠습니까?
            </ModalMessage>

            {/* 오늘만 옵션 */}
            <OptionContainer
              onPress={() => setRouteSelectOption('today')}
              activeOpacity={0.7}
            >
              <Checkbox checked={routeSelectOption === 'today'}>
                {routeSelectOption === 'today' && <Checkmark>✓</Checkmark>}
              </Checkbox>
              <View style={{ flex: 1 }}>
                <OptionLabel>오늘만</OptionLabel>
                <OptionDescription>오늘 하루만 이 경로를 사용합니다</OptionDescription>
              </View>
            </OptionContainer>

            {/* 버튼 */}
            <ModalButtonContainer>
              <ModalButton variant="secondary" onPress={handleRouteSelectCancel}>
                <ModalButtonText variant="secondary">취소</ModalButtonText>
              </ModalButton>
              <ModalButton variant="primary" onPress={handleRouteSelectConfirm}>
                <ModalButtonText variant="primary">확인</ModalButtonText>
              </ModalButton>
            </ModalButtonContainer>
          </ModalContainer>
        </ModalOverlay>
      </Modal>

      {/* 지연 모달 */}
      <Modal
        visible={isDelayModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsDelayModalVisible(false)}
      >
        <ModalOverlay>
          <ModalContainer>
            {/* 아이콘 */}
            <View style={{ alignItems: 'center', marginBottom: theme.spacing.md }}>
              <Image 
                source={LaterIcon} 
                style={{ width: 80, height: 80, resizeMode: 'contain' }}
              />
            </View>
            
            <ModalTitle style={{ textAlign: 'center', marginBottom: theme.spacing.sm }}>
              지연 감지!
            </ModalTitle>
            
            {/* 지연 정보 */}
            <View style={{ marginBottom: theme.spacing.lg, gap: theme.spacing.md }}>
              {/* 지연된 교통수단 정보 */}
              <View style={{ 
                backgroundColor: '#FFF3E0', 
                padding: theme.spacing.md, 
                borderRadius: theme.borderRadius.md,
                borderLeftWidth: 4,
                borderLeftColor: '#FF9800',
              }}>
                <Text style={{ 
                  fontSize: theme.fonts.sizes.md, 
                  color: theme.colors.text,
                  fontWeight: '600',
                  marginBottom: theme.spacing.xs,
                }}>
                  {(() => {
                    // 목업 데이터 (실제로는 지연 감지 API에서 받아온 데이터 사용)
                    const transport = '80번 버스';
                    const transportType = 'bus'; // 'bus' or 'subway'
                    const delayMinutes = 15;
                    const particle = transportType === 'bus' ? '가' : '이';
                    return `${transport}${particle} 평소보다 ${delayMinutes}분 이상 지연되어있습니다.`;
                  })()}
                </Text>
              </View>
              
              {/* 예상 도착 시간 */}
              <View style={{ 
                backgroundColor: '#E3F2FD', 
                padding: theme.spacing.md, 
                borderRadius: theme.borderRadius.md,
                borderLeftWidth: 4,
                borderLeftColor: '#2196F3',
              }}>
                <Text style={{ 
                  fontSize: theme.fonts.sizes.sm, 
                  color: theme.colors.textSecondary,
                  marginBottom: theme.spacing.xs,
                }}>
                  예상 도착 시간
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.xs }}>
                  <Text style={{ 
                    fontSize: theme.fonts.sizes.xl, 
                    fontWeight: '700',
                    color: theme.colors.text,
                  }}>
                    07시 45분
                  </Text>
                  <Text style={{ 
                    fontSize: theme.fonts.sizes.md, 
                    color: '#F44336',
                    fontWeight: '600',
                  }}>
                    (+15분 증가)
                  </Text>
                </View>
              </View>
            </View>
            
            <ModalButtonContainer>
              <ModalButton variant="primary" onPress={() => setIsDelayModalVisible(false)}>
                <ModalButtonText variant="primary">확인</ModalButtonText>
              </ModalButton>
            </ModalButtonContainer>
          </ModalContainer>
        </ModalOverlay>
      </Modal>

      {/* 택시 추천 모달 */}
      <Modal
        visible={isTaxiModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsTaxiModalVisible(false)}
      >
        <ModalOverlay>
          <ModalContainer>
            <ModalTitle>🚕 택시 탑승 추천</ModalTitle>
            <ModalMessage>
              대중교통으로는 지각이 확정됩니다.{'\n'}
              택시를 이용하시면 목표 시간에 도착할 수 있습니다.
            </ModalMessage>
            <ModalButtonContainer>
              <ModalButton variant="secondary" onPress={() => setIsTaxiModalVisible(false)}>
                <ModalButtonText variant="secondary">취소</ModalButtonText>
              </ModalButton>
              <ModalButton variant="primary" onPress={() => {
                // TODO: 택시 앱 연동 또는 택시 호출 로직
                setIsTaxiModalVisible(false);
              }}>
                <ModalButtonText variant="primary">택시 호출</ModalButtonText>
              </ModalButton>
            </ModalButtonContainer>
          </ModalContainer>
        </ModalOverlay>
      </Modal>

      {/* 날씨 상세 정보 모달 */}
      <Modal
        visible={isWeatherModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsWeatherModalVisible(false)}
      >
        <ModalOverlay>
          <ModalContainer style={{ maxWidth: '90%', maxHeight: '80%' }}>
            <ModalTitle>날씨 상세 정보</ModalTitle>
            
            <ScrollView style={{ maxHeight: 500 }}>
              {/* 출발지 날씨 정보 */}
              <View style={{ marginBottom: theme.spacing.lg }}>
                <Text style={{ fontSize: theme.fonts.sizes.lg, fontWeight: '700', color: theme.colors.text, marginBottom: theme.spacing.md }}>
                  출발지: {selectedJourneyInfo?.originName || '출발지'}
                </Text>
                {originWeatherLoading ? (
                  <Text style={{ color: theme.colors.textSecondary }}>날씨 정보를 불러오는 중...</Text>
                ) : originWeatherData ? (
                  <View style={{ gap: theme.spacing.sm }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                      <Text style={{ fontSize: 32 }}>{getWeatherIconEmoji(originWeatherData.condition)}</Text>
                      <View>
                        <Text style={{ fontSize: theme.fonts.sizes.xxl, fontWeight: '800', color: theme.colors.text }}>
                          {Math.round(originWeatherData.temperature)}°
                        </Text>
                        <Text style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>
                          체감 {Math.round(originWeatherData.feelsLike)}°
                        </Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: theme.fonts.sizes.md, color: theme.colors.text, marginTop: theme.spacing.xs }}>
                      {getWeatherDescription(originWeatherData.condition, originWeatherData.precipitation, originWeatherData.feelsLike)}
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs, marginTop: theme.spacing.sm }}>
                      <View style={{ backgroundColor: '#E3F2FD', padding: theme.spacing.sm, borderRadius: theme.borderRadius.md, flex: 1, minWidth: '45%' }}>
                        <Text style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>습도</Text>
                        <Text style={{ fontSize: theme.fonts.sizes.md, fontWeight: '600', color: theme.colors.text }}>{originWeatherData.humidity}%</Text>
                      </View>
                      <View style={{ backgroundColor: '#E3F2FD', padding: theme.spacing.sm, borderRadius: theme.borderRadius.md, flex: 1, minWidth: '45%' }}>
                        <Text style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>풍속</Text>
                        <Text style={{ fontSize: theme.fonts.sizes.md, fontWeight: '600', color: theme.colors.text }}>{originWeatherData.windSpeed}m/s</Text>
                      </View>
                      <View style={{ backgroundColor: '#E3F2FD', padding: theme.spacing.sm, borderRadius: theme.borderRadius.md, flex: 1, minWidth: '45%' }}>
                        <Text style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>강수확률</Text>
                        <Text style={{ fontSize: theme.fonts.sizes.md, fontWeight: '600', color: theme.colors.text }}>{originWeatherData.precipitation}%</Text>
                      </View>
                      <View style={{ backgroundColor: '#E3F2FD', padding: theme.spacing.sm, borderRadius: theme.borderRadius.md, flex: 1, minWidth: '45%' }}>
                        <Text style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>자외선 지수</Text>
                        <Text style={{ fontSize: theme.fonts.sizes.md, fontWeight: '600', color: theme.colors.text }}>{originWeatherData.uvIndex}</Text>
                      </View>
                    </View>
                    <View style={{ marginTop: theme.spacing.sm }}>
                      <Text style={{ fontSize: theme.fonts.sizes.sm, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.xs }}>
                        권장사항
                      </Text>
                      {getWeatherRecommendations(
                        originWeatherData.condition,
                        originWeatherData.temperature,
                        originWeatherData.humidity,
                        originWeatherData.uvIndex
                      ).map((rec, idx) => (
                        <Text key={idx} style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: theme.spacing.xs / 2 }}>
                          {rec}
                        </Text>
                      ))}
                    </View>
                  </View>
                ) : (
                  <Text style={{ color: theme.colors.textSecondary }}>날씨 정보를 불러올 수 없습니다.</Text>
                )}
              </View>

              {/* 도착지 날씨 정보 */}
              <View style={{ marginBottom: theme.spacing.lg, paddingTop: theme.spacing.lg, borderTopWidth: 1, borderTopColor: '#E0E0E0' }}>
                <Text style={{ fontSize: theme.fonts.sizes.lg, fontWeight: '700', color: theme.colors.text, marginBottom: theme.spacing.md }}>
                  도착지: {selectedJourneyInfo?.destinationName || '도착지'}
                </Text>
                {destinationWeatherLoading ? (
                  <Text style={{ color: theme.colors.textSecondary }}>날씨 정보를 불러오는 중...</Text>
                ) : destinationWeatherData ? (
                  <View style={{ gap: theme.spacing.sm }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                      <Text style={{ fontSize: 32 }}>{getWeatherIconEmoji(destinationWeatherData.condition)}</Text>
                      <View>
                        <Text style={{ fontSize: theme.fonts.sizes.xxl, fontWeight: '800', color: theme.colors.text }}>
                          {Math.round(destinationWeatherData.temperature)}°
                        </Text>
                        <Text style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>
                          체감 {Math.round(destinationWeatherData.feelsLike)}°
                        </Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: theme.fonts.sizes.md, color: theme.colors.text, marginTop: theme.spacing.xs }}>
                      {getWeatherDescription(destinationWeatherData.condition, destinationWeatherData.precipitation, destinationWeatherData.feelsLike)}
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs, marginTop: theme.spacing.sm }}>
                      <View style={{ backgroundColor: '#E3F2FD', padding: theme.spacing.sm, borderRadius: theme.borderRadius.md, flex: 1, minWidth: '45%' }}>
                        <Text style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>습도</Text>
                        <Text style={{ fontSize: theme.fonts.sizes.md, fontWeight: '600', color: theme.colors.text }}>{destinationWeatherData.humidity}%</Text>
                      </View>
                      <View style={{ backgroundColor: '#E3F2FD', padding: theme.spacing.sm, borderRadius: theme.borderRadius.md, flex: 1, minWidth: '45%' }}>
                        <Text style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>풍속</Text>
                        <Text style={{ fontSize: theme.fonts.sizes.md, fontWeight: '600', color: theme.colors.text }}>{destinationWeatherData.windSpeed}m/s</Text>
                      </View>
                      <View style={{ backgroundColor: '#E3F2FD', padding: theme.spacing.sm, borderRadius: theme.borderRadius.md, flex: 1, minWidth: '45%' }}>
                        <Text style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>강수확률</Text>
                        <Text style={{ fontSize: theme.fonts.sizes.md, fontWeight: '600', color: theme.colors.text }}>{destinationWeatherData.precipitation}%</Text>
                      </View>
                      <View style={{ backgroundColor: '#E3F2FD', padding: theme.spacing.sm, borderRadius: theme.borderRadius.md, flex: 1, minWidth: '45%' }}>
                        <Text style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>자외선 지수</Text>
                        <Text style={{ fontSize: theme.fonts.sizes.md, fontWeight: '600', color: theme.colors.text }}>{destinationWeatherData.uvIndex}</Text>
                      </View>
                    </View>
                    <View style={{ marginTop: theme.spacing.sm }}>
                      <Text style={{ fontSize: theme.fonts.sizes.sm, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.xs }}>
                        권장사항
                      </Text>
                      {getWeatherRecommendations(
                        destinationWeatherData.condition,
                        destinationWeatherData.temperature,
                        destinationWeatherData.humidity,
                        destinationWeatherData.uvIndex
                      ).map((rec, idx) => (
                        <Text key={idx} style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: theme.spacing.xs / 2 }}>
                          {rec}
                        </Text>
                      ))}
                    </View>
                  </View>
                ) : (
                  <Text style={{ color: theme.colors.textSecondary }}>날씨 정보를 불러올 수 없습니다.</Text>
                )}
              </View>
            </ScrollView>

            <ModalButtonContainer>
              <ModalButton variant="primary" onPress={() => setIsWeatherModalVisible(false)}>
                <ModalButtonText variant="primary">확인</ModalButtonText>
              </ModalButton>
            </ModalButtonContainer>
          </ModalContainer>
        </ModalOverlay>
      </Modal>
    </OuterContainer>
  );
};

export default DailyBriefingScreen;

