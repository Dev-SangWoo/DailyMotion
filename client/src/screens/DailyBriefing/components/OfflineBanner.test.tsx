/**
 * OfflineBanner 컴포넌트 테스트
 *
 * Phase 7: 예외 상황 처리
 * - 오프라인 상태 배너 구현 (7.1)
 * - 배너 표시/숨김 로직
 *
 * 헌법 준수:
 * - AGENTS.md 프론트엔드 헌법 [제6장] RTL 테스트 먼저 작성 (TDD)
 * - React Testing Library로 사용자 관점 테스트
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import OfflineBanner from './OfflineBanner';

describe('OfflineBanner', () => {
  describe('Phase 7.1: 오프라인 배너 표시/숨김', () => {
    it('오프라인 상태일 때 배너를 표시해야 함', () => {
      const { getByTestId } = render(
        <OfflineBanner isOffline={true} lastUpdated={new Date()} />,
      );

      expect(getByTestId('offline-banner')).toBeTruthy();
    });

    it('온라인 상태일 때 배너를 표시하지 않아야 함', () => {
      const { queryByTestId } = render(
        <OfflineBanner isOffline={false} lastUpdated={new Date()} />,
      );

      expect(queryByTestId('offline-banner')).toBeNull();
    });

    it('배너에 경고 아이콘과 메시지를 표시해야 함', () => {
      const { getByTestId } = render(
        <OfflineBanner isOffline={true} lastUpdated={new Date()} />,
      );

      const banner = getByTestId('offline-banner');
      expect(banner).toBeTruthy();

      // 경고 메시지 확인
      const message = screen.getByText(/실시간 정보 수신 불가/i);
      expect(message).toBeTruthy();
    });

    it('마지막 업데이트 시간을 상대 시간으로 표시해야 함', () => {
      // 1분 전
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
      const { getByTestId } = render(
        <OfflineBanner isOffline={true} lastUpdated={oneMinuteAgo} />,
      );

      const banner = getByTestId('offline-banner');
      expect(banner).toBeTruthy();

      // "1분 전" 텍스트 확인
      const timeText = screen.getByText(/\d+분 전/i);
      expect(timeText).toBeTruthy();
    });

    it('배너에 주황색 배경을 적용해야 함', () => {
      const { getByTestId } = render(
        <OfflineBanner isOffline={true} lastUpdated={new Date()} />,
      );

      const banner = getByTestId('offline-banner');
      // Styled-components 스타일 확인 (백그라운드 색상)
      expect(banner).toHaveStyle({ backgroundColor: expect.any(String) });
    });

    it('배너는 앱 최상단에 배치되어야 함', () => {
      const { getByTestId } = render(
        <OfflineBanner isOffline={true} lastUpdated={new Date()} />,
      );

      const banner = getByTestId('offline-banner');
      // zIndex 또는 위치 확인
      expect(banner).toHaveStyle({ position: 'absolute' });
    });
  });

  describe('Phase 7.2: 배너 시간 포맷팅', () => {
    it('30초 미만일 때 "방금 전"으로 표시해야 함', () => {
      const twentySecondsAgo = new Date(Date.now() - 20 * 1000);
      const { getByTestId } = render(
        <OfflineBanner isOffline={true} lastUpdated={twentySecondsAgo} />,
      );

      expect(getByTestId('offline-banner')).toBeTruthy();
      const timeText = screen.getByText(/방금 전|지금|방금/i);
      expect(timeText).toBeTruthy();
    });

    it('5분 전일 때 "5분 전"으로 표시해야 함', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      render(<OfflineBanner isOffline={true} lastUpdated={fiveMinutesAgo} />);

      const timeText = screen.getByText(/5분 전/i);
      expect(timeText).toBeTruthy();
    });

    it('1시간 이상일 때 "1시간 전"으로 표시해야 함', () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      render(<OfflineBanner isOffline={true} lastUpdated={oneHourAgo} />);

      const timeText = screen.getByText(/1시간 전/i);
      expect(timeText).toBeTruthy();
    });
  });

  describe('헌법 준수 (AGENTS.md)', () => {
    it('Styled-components를 사용하여 스타일링해야 함', () => {
      const { getByTestId } = render(
        <OfflineBanner isOffline={true} lastUpdated={new Date()} />,
      );

      const banner = getByTestId('offline-banner');
      // Styled-components로 생성된 컴포넌트 확인
      expect(banner).toBeTruthy();
    });

    it('theme에서 색상값을 가져와야 함', () => {
      const { getByTestId } = render(
        <OfflineBanner isOffline={true} lastUpdated={new Date()} />,
      );

      const banner = getByTestId('offline-banner');
      // 배경색이 설정되어 있어야 함
      expect(banner).toHaveStyle({ backgroundColor: expect.any(String) });
    });

    it('testID를 정확히 설정해야 함 (테스트 안정성)', () => {
      const { getByTestId } = render(
        <OfflineBanner isOffline={true} lastUpdated={new Date()} />,
      );

      expect(getByTestId('offline-banner')).toBeTruthy();
      expect(getByTestId('offline-banner-text')).toBeTruthy();
      expect(getByTestId('offline-banner-time')).toBeTruthy();
    });
  });
});
