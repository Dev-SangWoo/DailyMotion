/**
 * Jest Setup 파일
 * 테스트 실행 전 초기 설정
 */

// React Native 모듈을 먼저 Mock (requireActual 이슈 방지)
jest.mock('react-native', () => {
  return {
    View: 'View',
    Text: 'Text',
    TextInput: 'TextInput',
    TouchableOpacity: 'TouchableOpacity',
    Button: 'Button',
    Platform: {
      OS: 'ios',
      select: jest.fn((obj) => obj.ios || obj.default),
    },
    StyleSheet: {
      create: (styles) => styles,
    },
  };
});

import '@testing-library/jest-native/extend-expect';

