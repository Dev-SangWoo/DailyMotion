/**
 * 알림 액션 스토어
 * 
 * 알림 클릭 시 수행할 액션을 관리합니다.
 */

import { create } from 'zustand';

export type NotificationAction = 
  | 'navigate_home'
  | 'show_new_route'
  | 'show_delay_modal'
  | 'show_alternative_route'
  | 'show_taxi_recommendation'
  | null;

interface NotificationActionState {
  pendingAction: NotificationAction;
  setPendingAction: (action: NotificationAction) => void;
  clearPendingAction: () => void;
}

export const useNotificationActionStore = create<NotificationActionState>((set) => ({
  pendingAction: null,
  setPendingAction: (action) => set({ pendingAction: action }),
  clearPendingAction: () => set({ pendingAction: null }),
}));

