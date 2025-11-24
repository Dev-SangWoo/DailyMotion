/**
 * React Native 앱 진입점 (Expo)
 *
 * 헌법 준수:
 * - AGENTS.md 프론트엔드 헌법 [제1장] 개발 환경 설정
 * - Expo 환경에서는 registerRootComponent 사용
 */
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);

