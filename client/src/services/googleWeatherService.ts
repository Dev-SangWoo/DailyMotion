/**
 * Google Weather API 서비스
 * 
 * Google Maps Platform Weather API를 사용하여 날씨 정보를 가져옵니다.
 * 참고: https://developers.google.com/maps/documentation/weather
 */

export interface GoogleWeatherData {
  temperature: number; // 현재 기온 (°C)
  feelsLike: number; // 체감 기온 (°C)
  humidity: number; // 습도 (%)
  windSpeed: number; // 풍속 (m/s)
  windDirection: string; // 바람 방향
  visibility: number; // 가시거리 (km)
  uvIndex: number; // 자외선 지수
  precipitation: number; // 강수확률 (%)
  condition: string; // 날씨 상태 (예: "clear", "cloudy", "rainy")
  description: string; // 상세 설명
  icon?: string; // 날씨 아이콘
}

/**
 * Google Weather API 응답 인터페이스
 * 실제 API 응답 구조에 맞게 수정 필요
 */
interface GoogleWeatherResponse {
  currentConditions?: {
    temperature?: { value: number; unit: string };
    feelsLike?: { value: number; unit: string };
    humidity?: { value: number; unit: string };
    windSpeed?: { value: number; unit: string };
    windDirection?: { value: number; unit: string };
    visibility?: { value: number; unit: string };
    uvIndex?: { value: number; unit: string };
    precipitation?: { value: number; unit: string; probability?: number };
    condition?: string;
    description?: string;
    icon?: string;
  };
  dailyForecast?: any[];
  hourlyForecast?: any[];
}

/**
 * 겨울 날씨 더미 데이터 생성
 */
function getWinterDummyWeather(): GoogleWeatherData {
  // 겨울 날씨 조건 배열 (다양한 겨울 날씨)
  const winterConditions = [
    { condition: 'snowy', icon: '🌨️', description: '눈', temp: -3, feelsLike: -8 },
    { condition: 'cloudy', icon: '☁️', description: '흐림', temp: 2, feelsLike: -1 },
    { condition: 'clear', icon: '☀️', description: '맑음', temp: 5, feelsLike: 2 },
    { condition: 'fog', icon: '🌫️', description: '안개', temp: 0, feelsLike: -3 },
  ];
  
  // 랜덤하게 겨울 날씨 선택
  const randomCondition = winterConditions[Math.floor(Math.random() * winterConditions.length)];
  
  return {
    temperature: randomCondition.temp,
    feelsLike: randomCondition.feelsLike,
    humidity: Math.floor(Math.random() * 30) + 50, // 50-80%
    windSpeed: Math.random() * 3 + 2, // 2-5 m/s
    windDirection: ['N', 'NE', 'NW'][Math.floor(Math.random() * 3)],
    visibility: Math.random() * 5 + 5, // 5-10 km
    uvIndex: Math.floor(Math.random() * 3), // 0-2 (겨울)
    precipitation: randomCondition.condition === 'snowy' ? Math.floor(Math.random() * 30) + 40 : Math.floor(Math.random() * 20), // 눈일 때 40-70%, 아니면 0-20%
    condition: randomCondition.condition,
    description: randomCondition.description,
    icon: randomCondition.icon,
  };
}

/**
 * Google Weather API를 사용하여 현재 날씨 정보 가져오기
 * 
 * 참고: https://developers.google.com/maps/documentation/weather
 * 엔드포인트: GET /v1/weather:lookup?location.latitude={lat}&location.longitude={lng}
 * 
 * @param latitude 위도
 * @param longitude 경도
 * @returns 날씨 데이터
 */
export async function getGoogleWeather(
  latitude: number,
  longitude: number
): Promise<GoogleWeatherData> {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_WEATHER_API_KEY;

  // API 키가 없으면 더미 데이터 반환
  if (!apiKey) {
    return getWinterDummyWeather();
  }

  // Google Weather API는 아직 공개되지 않았거나 엔드포인트가 다를 수 있습니다.
  // 현재 404 에러가 발생하므로 더미 데이터를 반환합니다.
  // TODO: Google Weather API가 정식 출시되면 아래 주석을 해제하고 사용하세요.
  
  /*
  try {
    // Google Weather API 엔드포인트
    // 참고: https://developers.google.com/maps/documentation/weather
    // 현재 상태 가져오기
    const url = `https://weather.googleapis.com/v1/weather:lookup?location.latitude=${latitude}&location.longitude=${longitude}&key=${apiKey}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      return getWinterDummyWeather();
    }

    const data: GoogleWeatherResponse = await response.json();
    const current = data.currentConditions;
    
    if (!current) {
      return getWinterDummyWeather();
    }

    // 온도 변환 (섭씨로 통일)
    const temperature = convertTemperature(current.temperature?.value || 0, current.temperature?.unit || 'C');
    const feelsLike = convertTemperature(current.feelsLike?.value || temperature, current.feelsLike?.unit || 'C');
    
    // 풍속 변환 (m/s로 통일)
    const windSpeed = convertWindSpeed(current.windSpeed?.value || 0, current.windSpeed?.unit || 'm/s');
    
    // 가시거리 변환 (km로 통일)
    const visibility = convertVisibility(current.visibility?.value || 0, current.visibility?.unit || 'km');
    
    // 습도 (%)
    const humidity = parseFloat(current.humidity?.value?.toString() || '0') || 0;
    
    // 자외선 지수
    const uvIndex = parseFloat(current.uvIndex?.value?.toString() || '0') || 0;
    
    // 강수확률 (%)
    const precipitation = current.precipitation?.probability || 0;
    
    // 날씨 조건
    const condition = mapWeatherCondition(current.condition || 'CLEAR');
    const description = current.description || condition;
    const icon = getWeatherIconEmoji(condition);

    // 바람 방향 (각도 → 방향 문자열)
    const windDirectionDegrees = parseFloat(current.windDirection?.value?.toString() || '0') || 0;

    return {
      temperature,
      feelsLike,
      humidity,
      windSpeed,
      windDirection: getWindDirection(windDirectionDegrees),
      visibility,
      uvIndex,
      precipitation,
      condition,
      description,
      icon,
    };
  } catch (error) {
    return getWinterDummyWeather();
  }
  */

  // 현재는 더미 데이터만 반환
  return getWinterDummyWeather();
}

/**
 * 온도 단위 변환 (화씨 → 섭씨)
 */
function convertTemperature(value: number, unit: string): number {
  if (unit.toUpperCase() === 'F' || unit.toUpperCase() === 'FAHRENHEIT') {
    return (value - 32) * 5 / 9; // 화씨를 섭씨로 변환
  }
  return value; // 이미 섭씨
}

/**
 * 풍속 단위 변환 (다양한 단위 → m/s)
 */
function convertWindSpeed(value: number, unit: string): number {
  const unitUpper = unit.toUpperCase();
  if (unitUpper === 'KM/H' || unitUpper === 'KMH' || unitUpper === 'KPH') {
    return value / 3.6; // km/h를 m/s로 변환
  } else if (unitUpper === 'MPH') {
    return value * 0.44704; // mph를 m/s로 변환
  }
  return value; // 이미 m/s
}

/**
 * 가시거리 단위 변환 (다양한 단위 → km)
 */
function convertVisibility(value: number, unit: string): number {
  const unitUpper = unit.toUpperCase();
  if (unitUpper === 'M' || unitUpper === 'METERS' || unitUpper === 'METER') {
    return value / 1000; // 미터를 km로 변환
  } else if (unitUpper === 'MI' || unitUpper === 'MILES' || unitUpper === 'MILE') {
    return value * 1.60934; // 마일을 km로 변환
  }
  return value; // 이미 km
}

/**
 * 바람 각도를 방향 문자열로 변환
 */
function getWindDirection(degrees: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
}

/**
 * 날씨 조건을 표준 형식으로 매핑
 * Google Weather API의 조건 값을 표준 형식으로 변환
 */
function mapWeatherCondition(condition: string): string {
  const conditionUpper = condition.toUpperCase();
  const conditionMap: Record<string, string> = {
    'CLEAR': 'clear',
    'SUNNY': 'clear',
    'CLOUDY': 'cloudy',
    'PARTLY_CLOUDY': 'cloudy',
    'MOSTLY_CLOUDY': 'cloudy',
    'RAIN': 'rainy',
    'RAINY': 'rainy',
    'DRIZZLE': 'rainy',
    'SHOWERS': 'rainy',
    'THUNDERSTORM': 'thunderstorm',
    'STORM': 'thunderstorm',
    'SNOW': 'snowy',
    'SNOWY': 'snowy',
    'MIST': 'fog',
    'FOG': 'fog',
    'HAZE': 'fog',
    'FOGGY': 'fog',
  };
  return conditionMap[conditionUpper] || 'clear';
}

/**
 * 날씨 조건에 따른 이모지 아이콘 반환
 */
function getWeatherIconEmoji(condition: string): string {
  const iconMap: Record<string, string> = {
    'clear': '☀️',
    'cloudy': '☁️',
    'rainy': '🌧️',
    'thunderstorm': '⛈️',
    'snowy': '🌨️',
    'fog': '🌫️',
  };
  return iconMap[condition] || '☀️';
}
