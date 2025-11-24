# 🌤️ 날씨 아이콘 매핑 가이드

이 문서는 `useGetWeatherQuery` 훅과 연동되는 날씨 아이콘을 정리한 것입니다.
현재 코드에서 아이콘 자리는 `'🔲 WEATHER_ICON'` 형태의 placeholder로 표시되어 있습니다.

---

## 📋 필요한 아이콘 전체 목록

### [카드 헤더 - 기본 날씨 상태] (1개만 표시)

| 날씨 상태 | Icon | 사용 위치 | Placeholder | 설명 |
|---------|------|---------|------------|------|
| 맑음 | ☀️ | 카드 헤더 | `WEATHER_SUNNY` | 맑고 깨끗한 날씨 |
| 흐림 | ☁️ | 카드 헤더 | `WEATHER_CLOUDY` | 구름 많음 |
| 비 | 🌧️ | 카드 헤더 | `WEATHER_RAINY` | 비가 내림 |
| 눈 | 🌨️ | 카드 헤더 | `WEATHER_SNOWY` | 눈이 내림 |
| 번개 | ⛈️ | 카드 헤더 | `WEATHER_STORM` | 천둥번개 |
| 안개 | 🌫️ | 카드 헤더 | `WEATHER_FOG` | 안개 낀 날씨 |

**표시 위치 (DailyBriefingScreen.tsx line 1469):**
```typescript
icon: weatherData ? '🔲 WEATHER_ICON' : '🌧️', // 여기서 실제 아이콘으로 대체
```

---

### [카드 내용 - 세부 정보 아이콘] (선택사항, badges와 함께 표시)

#### 세부 정보용 (content 섹션에 추가 예정)
| 정보 | Icon | 변수 | 예시 |
|-----|------|------|------|
| 습도 | 💧 | `weatherData.humidity` | 💧 65% |
| 바람 | 💨 | `weatherData.windSpeed` | 💨 3.2 m/s |
| 체감온도 | 🌡️ | `weatherData.feelsLike` | 🌡️ 18°C |
| 가시거리 | 👁️ | `weatherData.visibility` | 👁️ 10 km |
| 자외선 | ☢️ | `weatherData.uvIndex` | ☢️ 6 (높음) |

#### 권장사항용 (badges - 자동 생성됨)
| 권장사항 | Icon | 조건 |
|--------|------|------|
| 우산 | ☂️ | 비 또는 천둥번개 |
| 따뜻한 옷 | 🧥 | 5°C 이상 15°C 미만 |
| 선글라스 | 🕶️ | UV Index > 5 |
| 수분섭취 | 💧 | 기온 > 28°C |
| 목도리/장갑 | 🧣 | 눈이 내리는 경우 |

---

## 🔧 구현 방법

### 1️⃣ **현재 상태 (아이콘 플레이스홀더)**
```typescript
// DailyBriefingScreen.tsx line 1469
icon: weatherData ? '🔲 WEATHER_ICON' : '🌧️',
```

### 2️⃣ **Step 1: getWeatherIcon 함수 업데이트** (선택사항)
```typescript
// useGetWeatherQuery.ts 의 getWeatherIcon 함수에서 반환값을 이모지로 변경
export function getWeatherIcon(condition: WeatherCondition): string {
  const iconMap: Record<WeatherCondition, string> = {
    'clear': '☀️',      // 현재: 'WEATHER_SUNNY'
    'cloudy': '☁️',    // 현재: 'WEATHER_CLOUDY'
    'rainy': '🌧️',     // 현재: 'WEATHER_RAINY'
    'snowy': '🌨️',    // 현재: 'WEATHER_SNOWY'
    'thunderstorm': '⛈️', // 현재: 'WEATHER_STORM'
    'fog': '🌫️',       // 현재: 'WEATHER_FOG'
  };
  return iconMap[condition];
}
```

### 3️⃣ **Step 2: DailyBriefingScreen에서 사용**
```typescript
// import 추가
import { useGetWeatherQuery, getWeatherIcon } from '../../hooks/queries/useGetWeatherQuery';

// cards 배열에서
{
  id: 'weather',
  icon: weatherData ? getWeatherIcon(weatherData.condition) : '🌧️',
  title: '날씨 체크!',
  bgGradient: '#40B0FF',
  content: ..., // 이미 구현됨
  badges: ...,  // 이미 구현됨
}
```

### 4️⃣ **Step 3: 세부 정보 추가** (선택사항)
```typescript
// content를 더 풍부하게 표현하고 싶으면:
content: weatherData
  ? `${getWeatherDescription()} · 💧${weatherData.humidity}% · 💨${weatherData.windSpeed}m/s`
  : '로딩 중...'
```

---

## 📊 데이터 구조 참조

```typescript
// useGetWeatherQuery.ts의 WeatherData 인터페이스
interface WeatherData {
  temperature: number;      // 현재 기온
  feelsLike: number;        // 체감 기온
  humidity: number;         // 습도 (%)
  windSpeed: number;        // 풍속 (m/s)
  windDirection: string;    // 방향 (N, NE, E, ...)
  visibility: number;       // 가시거리 (km)
  uvIndex: number;          // 자외선 지수
  precipitation: number;    // 강수확률 (%)
  condition: WeatherCondition; // 'clear' | 'cloudy' | 'rainy' | 'snowy' | 'thunderstorm' | 'fog'
  description: string;      // 상세 설명
  forecast: WeatherForecast[]; // 시간별 예보
}
```

---

## 🎯 권장 구현 순서

1. ✅ **현재 완료**: 날씨 API 연동, 아이콘 플레이스홀더 설정
2. ⏳ **다음**: 세부 정보 아이콘 (습도, 바람, 체감온도 등) 추가
3. ⏳ **선택**: 권장사항 badges 커스터마이징 (이미 자동 생성됨)

---

## 💡 노트

- **권장사항은 자동 생성됨** ✅
  `getWeatherRecommendations()` 함수가 날씨 상태, 기온, 습도, UV에 따라 자동으로 적절한 권장사항과 아이콘을 생성합니다.

- **아이콘 자리 표시 (Placeholder)**
  현재 `'🔲 WEATHER_ICON'` 문자열은 눈에 띄도록 만든 것입니다.
  실제 아이콘으로 대체할 때 이 문자열을 찾아서 변경하면 됩니다.

- **위치 기반 날씨**
  - 우선: 선택된 여정의 출발지 좌표
  - 차선: 집 주소 좌표
  - 기본값: 강남역 (37.4979, 127.0276)
