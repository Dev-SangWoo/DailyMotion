/**
 * 알림 서비스
 * 
 * 로컬 알림을 관리하는 서비스입니다.
 * Expo Notifications를 사용하여 구현합니다.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// 알림 핸들러 설정
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * 알림 권한 요청
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[Notification Service] 알림 권한이 거부되었습니다.');
      return false;
    }

    // Android에서 알림 채널 설정
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: '기본 알림',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return true;
  } catch (error) {
    console.error('[Notification Service] 권한 요청 실패:', error);
    return false;
  }
}

/**
 * 즉시 알림 발송 (테스트용)
 */
export async function sendTestNotification(): Promise<void> {
  try {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      throw new Error('알림 권한이 없습니다.');
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '테스트 알림',
        body: '로컬 알림이 정상적으로 작동합니다!',
        sound: true,
        data: { test: true },
      },
      trigger: null, // null이면 즉시 발송
    });

    console.log('[Notification Service] 테스트 알림 발송 완료');
  } catch (error) {
    console.error('[Notification Service] 알림 발송 실패:', error);
    throw error;
  }
}

/**
 * 스케줄 알림 등록
 * 
 * @param title 알림 제목
 * @param body 알림 내용
 * @param triggerDate 알림 발송 시간 (Date 객체)
 * @param data 추가 데이터
 */
export async function scheduleNotification(
  title: string,
  body: string,
  triggerDate: Date,
  data?: Record<string, any>
): Promise<string> {
  try {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      throw new Error('알림 권한이 없습니다.');
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        data: data || {},
      },
      trigger: triggerDate,
    });

    console.log(`[Notification Service] 알림 스케줄 등록: ${notificationId}`);
    return notificationId;
  } catch (error) {
    console.error('[Notification Service] 알림 스케줄 등록 실패:', error);
    throw error;
  }
}

/**
 * 특정 시간 후 알림 발송
 * 
 * @param title 알림 제목
 * @param body 알림 내용
 * @param seconds 몇 초 후 발송할지
 * @param data 추가 데이터
 */
export async function scheduleNotificationAfter(
  title: string,
  body: string,
  seconds: number,
  data?: Record<string, any>
): Promise<string> {
  try {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      throw new Error('알림 권한이 없습니다.');
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        data: data || {},
      },
      trigger: {
        seconds,
      },
    });

    console.log(`[Notification Service] ${seconds}초 후 알림 스케줄 등록: ${notificationId}`);
    return notificationId;
  } catch (error) {
    console.error('[Notification Service] 알림 스케줄 등록 실패:', error);
    throw error;
  }
}

/**
 * 모든 예약된 알림 취소
 */
export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('[Notification Service] 모든 알림 취소 완료');
  } catch (error) {
    console.error('[Notification Service] 알림 취소 실패:', error);
    throw error;
  }
}

/**
 * 특정 알림 취소
 * 
 * @param notificationId 알림 ID
 */
export async function cancelNotification(notificationId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    console.log(`[Notification Service] 알림 취소 완료: ${notificationId}`);
  } catch (error) {
    console.error('[Notification Service] 알림 취소 실패:', error);
    throw error;
  }
}

/**
 * 예약된 알림 목록 조회
 */
export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  try {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`[Notification Service] 예약된 알림 ${notifications.length}개`);
    return notifications;
  } catch (error) {
    console.error('[Notification Service] 알림 목록 조회 실패:', error);
    throw error;
  }
}

/**
 * 시나리오별 테스트 알림 발송
 */
export async function sendScenarioNotification(scenario: 'departure' | 'newRoute' | 'delay' | 'lateRoute' | 'lateTaxi'): Promise<void> {
  try {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      throw new Error('알림 권한이 없습니다.');
    }

    let title = '';
    let body = '';
    let data: Record<string, any> = {};

    switch (scenario) {
      case 'departure':
        title = '🚶 지금 출발해야 됩니다!';
        body = '목표 시간에 도착하기 위해 지금 출발하세요.';
        data = { type: 'departure', action: 'navigate_home' };
        break;
      
      case 'newRoute':
        title = '✨ 새로운 경로를 찾았습니다!';
        body = '더 빠른 경로가 발견되었습니다. 확인해보세요.';
        data = { type: 'newRoute', action: 'show_new_route' };
        break;
      
      case 'delay':
        title = '⚠️ 지연이 감지되었습니다!';
        body = '현재 경로에서 지연이 감지되었습니다. 상세 정보를 확인하세요.';
        data = { type: 'delay', action: 'show_delay_modal' };
        break;
      
      case 'lateRoute':
        title = '🚨 지각이 예상됩니다!';
        body = '경로 변경을 통해 지각을 방지할 수 있습니다. 새로운 경로를 확인하세요.';
        data = { type: 'lateRoute', action: 'show_alternative_route' };
        break;
      
      case 'lateTaxi':
        title = '🚕 지각이 예상됩니다!';
        body = '대중교통으로는 지각이 확정됩니다. 택시 탑승을 추천합니다.';
        data = { type: 'lateTaxi', action: 'show_taxi_recommendation' };
        break;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        data,
      },
      trigger: {
        seconds: 10, // 10초 후 발송
      },
    });

    console.log(`[Notification Service] 시나리오 알림 발송: ${scenario}`);
  } catch (error) {
    console.error('[Notification Service] 시나리오 알림 발송 실패:', error);
    throw error;
  }
}

