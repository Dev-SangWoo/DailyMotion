/**
 * 앱 모드 상태 관리 (Zustand Store)
 *
 * Phase 6: App States (앱 상태 관리)
 * - Briefing Mode (비서 모드): 출퇴근 시간대 (평일 07:30-09:00 / 18:00-19:30)
 * - Explore Mode (탐색 모드): 비서 모드 시간 외 모든 시간 또는 주말
 *
 * 헌법 준수:
 * - AGENTS.md 프론트엔드 헌법 [제1장] 상태 관리 (Zustand)
 * - 서버 상태는 절대 저장하지 않음 (UI 상태만 관리)
 */
import { create } from 'zustand';

export type AppMode = 'briefing' | 'explore';

interface AppModeState {
  // 앱 모드 상태
  appMode: AppMode;

  // 시간 기반 모드 판단 함수
  calculateAppMode: (date?: Date) => AppMode;

  // 현재 시간에 기반해 앱 모드 업데이트
  updateAppMode: (date?: Date) => void;

  // 앱 모드 직접 설정 (테스트 용도)
  setAppMode: (mode: AppMode) => void;

  // 평일/주말 판단
  isWeekday: (date?: Date) => boolean;

  // 비서 모드 시간대 판단
  isBriefingTime: (date?: Date) => boolean;
}

/**
 * 비서 모드 시간대 판단
 * - 출근 시간: 평일 07:30-09:00
 * - 퇴근 시간: 평일 18:00-19:30
 *
 * @param date 판단할 시간 (기본값: 현재 시간)
 * @returns 비서 모드 시간대인지 여부
 */
const isBriefingTime = (date = new Date()): boolean => {
  const hours = date.getHours();
  const minutes = date.getMinutes();

  // 평일만 확인 (0: 일요일, 1-5: 평일, 6: 토요일)
  const dayOfWeek = date.getDay();
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;

  if (!isWeekday) {
    return false; // 주말이면 항상 Explore Mode
  }

  // 출근 시간: 07:30 ~ 09:00
  const isCommutingTime = (hours === 7 && minutes >= 30) || (hours === 8);

  // 퇴근 시간: 18:00 ~ 19:30
  const isRetreatTime = (hours === 18) || (hours === 19 && minutes < 30);

  return isCommutingTime || isRetreatTime;
};

/**
 * 평일 여부 판단
 * @param date 판단할 시간 (기본값: 현재 시간)
 * @returns 평일인지 여부
 */
const isWeekday = (date = new Date()): boolean => {
  const dayOfWeek = date.getDay();
  return dayOfWeek >= 1 && dayOfWeek <= 5; // 1-5: 평일
};

/**
 * 현재 시간에 기반해 앱 모드 계산
 * @param date 판단할 시간 (기본값: 현재 시간)
 * @returns 앱 모드 ('briefing' | 'explore')
 */
const calculateAppMode = (date = new Date()): AppMode => {
  return isBriefingTime(date) ? 'briefing' : 'explore';
};

export const useAppModeStore = create<AppModeState>((set) => ({
  // 초기 상태: 현재 시간에 기반해 모드 결정
  appMode: calculateAppMode(),

  // 시간 기반 모드 판단 함수
  calculateAppMode,

  // 현재 시간에 기반해 앱 모드 업데이트
  updateAppMode: (date = new Date()) => {
    const newMode = calculateAppMode(date);
    set({ appMode: newMode });
  },

  // 앱 모드 직접 설정 (테스트/개발 용도)
  setAppMode: (mode: AppMode) => {
    set({ appMode: mode });
  },

  // 평일/주말 판단
  isWeekday,

  // 비서 모드 시간대 판단
  isBriefingTime,
}));
