/**
 * 디바운스 훅
 *
 * 입력값이 변경된 후 일정 시간이 지나면 값을 반환합니다.
 * API 호출 빈도를 줄이기 위해 사용합니다.
 *
 * @example
 * ```typescript
 * const debouncedQuery = useDebounce(query, 500);
 * // query가 변경된 후 500ms 후에 debouncedQuery가 업데이트됩니다.
 * ```
 */

import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

