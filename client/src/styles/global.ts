/**
 * 글로벌 스타일
 * 
 * 앱 전반에 적용되는 글로벌 스타일을 정의합니다.
 * Styled-components의 createGlobalStyle을 사용할 수 있습니다.
 */

import { StyleSheet } from 'react-native';

export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
  },
  spaceBetween: {
    justifyContent: 'space-between',
  },
});

// TODO: Styled-components를 사용하는 경우
// import { createGlobalStyle } from 'styled-components';
// 
// export const GlobalStyle = createGlobalStyle`
//   * {
//     margin: 0;
//     padding: 0;
//     box-sizing: border-box;
//   }
// `;

