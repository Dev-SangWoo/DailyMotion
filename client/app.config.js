/**
 * Expo App Configuration
 * 
 * 환경 변수를 사용하여 동적으로 설정을 로드합니다.
 * app.json 대신 이 파일을 사용하면 환경 변수를 참조할 수 있습니다.
 */

module.exports = {
  expo: {
    name: "DailyMotion",
    slug: "dailymotion",
    version: "1.0.0",
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.dailymotion.client",
      config: {
        googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY || "YOUR_IOS_API_KEY_HERE"
      }
    },
    android: {
      package: "com.dailymotion.client",
      versionCode: 1,
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY || "YOUR_ANDROID_API_KEY_HERE"
        }
      }
    },
    plugins: [
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "이 앱은 위치 정보를 사용하여 최적의 경로를 제공합니다."
        }
      ]
    ],
    scheme: "dailymotion"
  }
};

