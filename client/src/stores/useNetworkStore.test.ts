/**
 * useNetworkStore 테스트
 *
 * Phase 7: 예외 상황 처리 (Exception Handling)
 * - 네트워크 상태 관리 (Zustand Store)
 * - 오프라인 상태 추적
 * - 마지막 업데이트 시간 기록
 *
 * 헌법 준수:
 * - AGENTS.md 프론트엔드 헌법 [제1장] Zustand 상태 관리
 * - UI 상태만 관리 (서버 상태는 절대 저장 금지)
 */

import { renderHook, act } from '@testing-library/react-native';
import { useNetworkStore } from './useNetworkStore';

describe('useNetworkStore', () => {
  afterEach(() => {
    // 각 테스트 후에 store 초기화
    act(() => {
      const store = useNetworkStore.getState();
      store.setOffline(false);
      store.setCheckingNetwork(false);
      store.setLastUpdated(new Date());
    });
  });

  describe('Phase 7.2: 네트워크 상태 관리', () => {
    it('초기 상태는 온라인이어야 함', () => {
      const { result } = renderHook(() => useNetworkStore());

      expect(result.current.isOffline).toBe(false);
    });

    it('setOffline 액션으로 오프라인 상태를 설정할 수 있어야 함', () => {
      const { result } = renderHook(() => useNetworkStore());

      act(() => {
        result.current.setOffline(true);
      });

      expect(result.current.isOffline).toBe(true);
    });

    it('오프라인 상태를 온라인 상태로 변경할 수 있어야 함', () => {
      const { result } = renderHook(() => useNetworkStore());

      // 오프라인으로 설정
      act(() => {
        result.current.setOffline(true);
      });
      expect(result.current.isOffline).toBe(true);

      // 온라인으로 변경
      act(() => {
        result.current.setOffline(false);
      });
      expect(result.current.isOffline).toBe(false);
    });
  });

  describe('Phase 7.3: 마지막 업데이트 시간 추적', () => {
    it('lastUpdated 상태를 초기화해야 함', () => {
      const { result } = renderHook(() => useNetworkStore());

      expect(result.current.lastUpdated).toBeInstanceOf(Date);
    });

    it('setLastUpdated 액션으로 업데이트 시간을 설정할 수 있어야 함', () => {
      const { result } = renderHook(() => useNetworkStore());
      const newDate = new Date('2025-01-01T12:00:00');

      act(() => {
        result.current.setLastUpdated(newDate);
      });

      expect(result.current.lastUpdated.getTime()).toBe(newDate.getTime());
    });

    it('네트워크 재연결 시 현재 시간으로 업데이트해야 함', () => {
      const { result } = renderHook(() => useNetworkStore());
      const beforeTime = new Date();

      // 오프라인 → 온라인 전환
      act(() => {
        result.current.setOffline(true);
      });

      // 온라인으로 변경하고 시간 업데이트
      act(() => {
        result.current.setOffline(false);
        result.current.setLastUpdated(new Date());
      });

      const afterTime = new Date();

      expect(result.current.isOffline).toBe(false);
      expect(result.current.lastUpdated.getTime()).toBeGreaterThanOrEqual(
        beforeTime.getTime(),
      );
      expect(result.current.lastUpdated.getTime()).toBeLessThanOrEqual(
        afterTime.getTime(),
      );
    });
  });

  describe('Phase 7.4: 네트워크 확인 상태 관리', () => {
    it('초기 상태에서 네트워크 확인 중이 아니어야 함', () => {
      const { result } = renderHook(() => useNetworkStore());

      expect(result.current.isCheckingNetwork).toBe(false);
    });

    it('setCheckingNetwork로 확인 중 상태를 설정할 수 있어야 함', () => {
      const { result } = renderHook(() => useNetworkStore());

      act(() => {
        result.current.setCheckingNetwork(true);
      });

      expect(result.current.isCheckingNetwork).toBe(true);
    });

    it('네트워크 확인 완료 후 상태를 해제해야 함', () => {
      const { result } = renderHook(() => useNetworkStore());

      act(() => {
        result.current.setCheckingNetwork(true);
      });
      expect(result.current.isCheckingNetwork).toBe(true);

      act(() => {
        result.current.setCheckingNetwork(false);
      });
      expect(result.current.isCheckingNetwork).toBe(false);
    });
  });

  describe('헌법 준수 (AGENTS.md)', () => {
    it('UI 상태만 관리해야 함 (서버 상태 금지)', () => {
      const { result } = renderHook(() => useNetworkStore());

      // 상태가 네트워크 UI 상태만 포함해야 함
      expect(result.current.isOffline).toBeDefined();
      expect(result.current.lastUpdated).toBeDefined();
      expect(result.current.isCheckingNetwork).toBeDefined();

      // API 응답 데이터는 저장되지 않아야 함
      expect(result.current.apiData).toBeUndefined();
      expect(result.current.serverResponse).toBeUndefined();
    });

    it('액션은 명시적으로 정의되어야 함', () => {
      const { result } = renderHook(() => useNetworkStore());

      // 액션 함수들이 명시적으로 정의되어 있어야 함
      expect(typeof result.current.setOffline).toBe('function');
      expect(typeof result.current.setLastUpdated).toBe('function');
      expect(typeof result.current.setCheckingNetwork).toBe('function');
    });

    it('Zustand 스토어를 올바르게 사용해야 함', () => {
      const store = useNetworkStore.getState();

      // store가 올바르게 초기화되어야 함
      expect(store).toBeDefined();
      expect(store.isOffline).toBeDefined();
      expect(store.setOffline).toBeDefined();
    });
  });

  describe('Phase 7: 통합 시나리오', () => {
    it('오프라인 → 온라인 전환 시나리오', () => {
      const { result } = renderHook(() => useNetworkStore());

      // 1. 온라인 상태에서 시작
      expect(result.current.isOffline).toBe(false);

      // 2. 네트워크 끊김 감지
      act(() => {
        result.current.setOffline(true);
        result.current.setCheckingNetwork(false);
      });
      expect(result.current.isOffline).toBe(true);

      // 3. 네트워크 재연결 확인 중
      act(() => {
        result.current.setCheckingNetwork(true);
      });
      expect(result.current.isCheckingNetwork).toBe(true);

      // 4. 재연결 성공
      act(() => {
        result.current.setOffline(false);
        result.current.setLastUpdated(new Date());
        result.current.setCheckingNetwork(false);
      });
      expect(result.current.isOffline).toBe(false);
      expect(result.current.isCheckingNetwork).toBe(false);
    });

    it('30초 이상 오프라인 상태 유지', () => {
      const { result } = renderHook(() => useNetworkStore());

      // 30초 전 오프라인 상태로 설정
      const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);

      act(() => {
        result.current.setOffline(true);
        result.current.setLastUpdated(thirtySecondsAgo);
      });

      expect(result.current.isOffline).toBe(true);
      expect(Date.now() - result.current.lastUpdated.getTime()).toBeGreaterThanOrEqual(
        30000,
      );
    });
  });
});
