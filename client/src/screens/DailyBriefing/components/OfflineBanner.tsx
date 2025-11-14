/**
 * 오프라인 상태 배너 컴포넌트
 *
 * Phase 7.1: 오프라인 상태 배너 구현
 * - GPS/모바일 데이터 30초 이상 수신 불가 시 표시
 * - 앱 최상단에 고정 배치
 * - 마지막 업데이트 시간을 상대 시간으로 표시
 *
 * 헌법 준수:
 * - AGENTS.md 프론트엔드 헌법 [제2장] Styled-components
 * - 의미론적 컴포넌트명 사용 (theme 기반 스타일링)
 */

import React, { useMemo } from 'react';
import styled from 'styled-components/native';
import { theme } from '../../../styles/theme';

interface OfflineBannerProps {
  isOffline: boolean;
  lastUpdated: Date;
}

/**
 * 상대 시간을 계산하는 유틸리티 함수
 * @param date 업데이트 시간
 * @returns 상대 시간 문자열 (예: "1분 전", "5분 전")
 */
const getRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 30) {
    return '방금 전';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}분 전`;
  }

  if (diffHours < 24) {
    return `${diffHours}시간 전`;
  }

  return `${diffDays}일 전`;
};

// Styled Components (의미론적 이름 사용 - 헌법 제2장 준수)
const BannerContainer = styled.View`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background-color: ${theme.colors.warning};
  padding: ${theme.spacing.md}px;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding-right: ${theme.spacing.lg}px;
`;

const BannerContent = styled.View`
  flex-direction: row;
  align-items: center;
  flex: 1;
`;

const WarningIcon = styled.Text`
  font-size: ${theme.fonts.sizes.lg}px;
  margin-right: ${theme.spacing.sm}px;
  color: ${theme.colors.text};
`;

const BannerMessage = styled.Text`
  font-size: ${theme.fonts.sizes.sm}px;
  color: ${theme.colors.text};
  font-weight: ${theme.fonts.weights.semibold};
  flex: 1;
`;

const BannerTime = styled.Text`
  font-size: ${theme.fonts.sizes.xs}px;
  color: ${theme.colors.text};
  font-weight: ${theme.fonts.weights.regular};
  margin-left: ${theme.spacing.sm}px;
`;

const OfflineBanner: React.FC<OfflineBannerProps> = ({ isOffline, lastUpdated }) => {
  const relativeTime = useMemo(() => getRelativeTime(lastUpdated), [lastUpdated]);

  if (!isOffline) {
    return null;
  }

  return (
    <BannerContainer testID="offline-banner">
      <BannerContent>
        <WarningIcon>⚠️</WarningIcon>
        <BannerMessage testID="offline-banner-text">
          실시간 정보 수신 불가.
        </BannerMessage>
      </BannerContent>
      <BannerTime testID="offline-banner-time">
        (마지막 업데이트: {relativeTime})
      </BannerTime>
    </BannerContainer>
  );
};

export default OfflineBanner;
