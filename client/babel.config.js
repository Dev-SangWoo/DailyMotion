/**
 * Babel 설정 파일 (Expo)
 *
 * 헌법 준수:
 * - AGENTS.md 프론트엔드 헌법 [제1장] 개발 환경 설정
 * - Expo는 babel-preset-expo 사용 (metro-react-native-babel-preset 대신)
 */
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      ["@babel/plugin-transform-class-properties", { loose: true }],
      ["@babel/plugin-transform-private-methods", { loose: true }],
      ["@babel/plugin-transform-private-property-in-object", { loose: true }],
    ],
  };
};
