/**
 * Jest Setup 파일
 * 테스트 실행 전 초기 설정
 */

// React Native 모듈을 실제 모듈로 사용 (컴포넌트 테스트를 위해)
// jest.setup.js에서 mock하지 않고, 실제 react-native를 사용

import '@testing-library/jest-native/extend-expect';

