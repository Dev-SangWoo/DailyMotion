# 카카오 MAP API 통합 가이드

## 📋 목차
1. [카카오 개발자 계정 설정](#1-카카오-개발자-계정-설정)
2. [API 키 발급](#2-api-키-발급)
3. [React Native에서 카카오 MAP API 사용](#3-react-native에서-카카오-map-api-사용)
4. [주소 검색 API 구현](#4-주소-검색-api-구현)
5. [지도 표시 구현](#5-지도-표시-구현)
6. [실제 사용 예시](#6-실제-사용-예시)

---

## 1. 카카오 개발자 계정 설정

### 1.1 카카오 개발자 계정 생성
1. [카카오 개발자 콘솔](https://developers.kakao.com/) 접속
2. 카카오 계정으로 로그인
3. "내 애플리케이션" 메뉴에서 "애플리케이션 추가하기" 클릭

### 1.2 애플리케이션 등록
- **앱 이름**: 데일리모션 (또는 원하는 이름)
- **사업자명**: 개인 또는 회사명
- **앱 아이콘**: 앱 아이콘 이미지 업로드

---

## 2. API 키 발급

### 2.1 REST API 키 발급
1. 생성한 애플리케이션 선택
2. "앱 키" 메뉴에서 **REST API 키** 복사
   - 이 키는 주소 검색, 좌표 변환 등에 사용됩니다.

### 2.2 플랫폼 설정 (선택사항)
**중요**: REST API만 사용하고 WebView로 지도를 표시하는 경우, **플랫폼 등록은 필요 없습니다!**

플랫폼 등록은 다음 경우에만 필요합니다:
- 카카오 로그인 기능 사용
- 카카오톡 공유 기능 사용
- 네이티브 SDK 사용 (카카오맵 네이티브 SDK)

**우리가 사용하는 방식 (REST API + WebView)는 플랫폼 등록 불필요!**

#### 플랫폼 등록이 필요한 경우 (참고용)
만약 나중에 네이티브 SDK를 사용하거나 카카오 로그인을 추가한다면:

**Android 플랫폼 등록**
1. "앱 설정" → "플랫폼" 메뉴
2. "Android 플랫폼 추가" 클릭
3. **패키지명** 입력 (예: `com.dailymotion.app`)
   - `app.json` 또는 `package.json`에서 확인 가능
4. **키 해시** 입력 (선택사항, 나중에 추가 가능)

**iOS 플랫폼 등록**
1. "iOS 플랫폼 추가" 클릭
2. **번들 ID** 입력 (예: `com.dailymotion.app`)

### 2.3 카카오 로그인 설정 (선택사항)
- 주소 검색만 사용한다면 카카오 로그인 설정은 필요 없습니다.
- 지도 SDK를 사용하려면 추가 설정이 필요할 수 있습니다.

---

## 3. React Native에서 카카오 MAP API 사용

### 3.1 사용 가능한 API 종류

#### ✅ REST API (추천 - 간단함)
- **Kakao Local API**: 주소 검색, 좌표 변환
- **장점**: 별도 라이브러리 설치 불필요, axios로 바로 호출 가능
- **단점**: 지도 표시는 WebView로 카카오맵 웹 버전 사용해야 함

#### ⚠️ Native SDK (복잡함)
- **Kakao Map SDK**: 네이티브 지도 표시
- **장점**: 네이티브 성능, 더 많은 기능
- **단점**: React Native 바인딩 라이브러리 필요, 설정 복잡

**이 가이드에서는 REST API 방식으로 진행합니다.**

### 3.2 필요한 패키지
```bash
# 이미 설치되어 있음
npm install axios  # API 호출용
```

---

## 4. 주소 검색 API 구현

### 4.1 카카오 Local API 엔드포인트

#### 주소 검색 (키워드로 검색)
```
GET https://dapi.kakao.com/v2/local/search/address.json
```

#### 장소 검색 (키워드로 검색)
```
GET https://dapi.kakao.com/v2/local/search/keyword.json
```

#### 좌표 → 주소 변환 (Reverse Geocoding)
```
GET https://dapi.kakao.com/v2/local/geo/coord2address.json
```

#### 주소 → 좌표 변환 (Geocoding)
```
GET https://dapi.kakao.com/v2/local/search/address.json
```

### 4.2 API 호출 헤더
모든 요청에 다음 헤더가 필요합니다:
```javascript
{
  'Authorization': 'KakaoAK {REST_API_KEY}'
}
```

### 4.3 요청 제한
- **일일 호출 한도**: 앱별로 다름 (기본 300,000건)
- **초당 호출 제한**: 10건 (초과 시 429 에러)

---

## 5. 지도 표시 구현

### 5.1 WebView 방식 (추천)
React Native에서는 카카오맵 웹 버전을 WebView로 표시하는 것이 가장 간단합니다.

#### 필요한 패키지
```bash
npm install react-native-webview
# 또는 Expo 사용 시
npx expo install react-native-webview
```

#### 카카오맵 웹 URL 형식
```
https://map.kakao.com/link/map/{장소명},{위도},{경도}
```

또는 JavaScript API 사용:
```html
<script src="//dapi.kakao.com/v2/maps/sdk.js?appkey={REST_API_KEY}"></script>
```

### 5.2 네이티브 SDK 방식 (고급)
더 나은 성능이 필요하다면 네이티브 SDK를 사용할 수 있지만, React Native 바인딩이 필요합니다.

---

## 6. 실제 사용 예시

### 6.1 환경 변수 설정

프로젝트 루트에 `.env` 파일 생성:
```bash
EXPO_PUBLIC_KAKAO_REST_API_KEY=your_rest_api_key_here
```

### 6.2 주소 검색 서비스 사용

#### 기본 사용법
```typescript
import { searchAddress, searchPlace } from '../services/kakaoMapService';

// 주소 검색
const addresses = await searchAddress({ query: '강남역' });
console.log(addresses[0].address_name); // "서울 강남구 역삼동"

// 장소 검색
const places = await searchPlace({ query: '스타벅스 강남점' });
console.log(places[0].place_name); // "스타벅스 강남점"
```

#### React Query와 함께 사용 (권장)
```typescript
import { useQuery } from '@tanstack/react-query';
import { searchPlace } from '../services/kakaoMapService';

const { data, isLoading } = useQuery({
  queryKey: ['placeSearch', query],
  queryFn: () => searchPlace({ query }),
  enabled: !!query, // query가 있을 때만 실행
});
```

### 6.3 AddressSearchInput 컴포넌트 사용

#### PlaceDetailModal에 통합 예시
```typescript
import { AddressSearchInput } from '../../../components/kakao/AddressSearchInput';

// PlaceDetailModal 내부
const [selectedAddress, setSelectedAddress] = useState<{
  name: string;
  fullAddress: string;
  x: string;
  y: string;
} | null>(null);

// JSX
<AddressSearchInput
  placeholder="주소 또는 장소를 검색하세요"
  onSelectAddress={(address) => {
    setSelectedAddress(address);
    // 선택된 주소 정보 사용
    console.log('선택된 주소:', address);
  }}
  searchType="both" // 'address' | 'place' | 'both'
/>
```

### 6.4 지도 표시 (WebView 사용)

#### 필요한 패키지 설치
```bash
npx expo install react-native-webview
```

#### 지도 컴포넌트 예시
```typescript
import { WebView } from 'react-native-webview';
import { getKakaoMapWebLink } from '../services/kakaoMapService';

const MapView = ({ placeName, x, y }) => {
  const mapUrl = getKakaoMapWebLink(placeName, x, y);
  
  return (
    <WebView
      source={{ uri: mapUrl }}
      style={{ flex: 1 }}
    />
  );
};
```

### 6.5 데일리 브리핑에서 사용

#### 여정 검색에 통합
```typescript
import { AddressSearchInput } from '../../components/kakao/AddressSearchInput';

// DailyBriefingScreen의 확장된 검색 바에 통합
<AddressSearchInput
  placeholder="출발지 검색"
  onSelectAddress={(address) => {
    setOrigin(address.name);
    // 좌표 정보도 저장
    setOriginCoord({ x: address.x, y: address.y });
  }}
/>
```

### 6.6 에러 처리

```typescript
import { searchAddress } from '../services/kakaoMapService';

try {
  const results = await searchAddress({ query: '강남역' });
  // 결과 사용
} catch (error) {
  if (error.message.includes('401')) {
    // API 키 오류
    console.error('API 키를 확인해주세요');
  } else if (error.message.includes('429')) {
    // 요청 제한 초과
    console.error('요청이 너무 많습니다. 잠시 후 다시 시도해주세요');
  } else {
    // 기타 오류
    console.error('검색 중 오류가 발생했습니다:', error);
  }
}
```

---

## 🔒 보안 주의사항

### ⚠️ API 키 보안

#### 테스트/개발 단계 (현재)
- **REST API 키만 있으면 바로 사용 가능!**
- 클라이언트에서 직접 카카오 API 호출해도 됩니다
- 환경 변수(`.env`)에 API 키 저장 후 사용
- 프록시 API 설정은 **불필요**

#### 프로덕션 단계 (나중에)
- **프록시 API 사용 권장** (선택사항)
- React Native 앱은 번들링 시 코드가 노출될 수 있음
- 더 안전하게 하려면 백엔드 프록시 사용

### ✅ 프로덕션에서 프록시 API 사용 시
1. 백엔드에 `/api/v1/kakao/search` 같은 프록시 엔드포인트 생성
2. 클라이언트는 백엔드 API만 호출
3. 백엔드에서 카카오 API 키를 사용하여 실제 요청
4. API 키가 서버에만 존재하므로 더 안전

### 📝 결론
- **테스트 단계**: REST API 키만 있으면 됨 ✅
- **프로덕션 단계**: 프록시 API 사용 권장 (선택사항)

---

## 📚 참고 자료

- [카카오 개발자 문서](https://developers.kakao.com/docs)
- [Kakao Local API 가이드](https://developers.kakao.com/docs/latest/ko/local/dev-guide)
- [카카오맵 JavaScript API](https://apis.map.kakao.com/web/guide/)

---

## 🐛 문제 해결

### CORS 에러 발생 시
- 카카오 API는 CORS를 지원하지만, React Native에서는 문제가 없어야 합니다.
- 만약 문제가 발생하면 백엔드 프록시를 사용하세요.

### 401 Unauthorized 에러
- API 키가 올바른지 확인
- 헤더 형식이 `KakaoAK {KEY}` 인지 확인 (공백 주의!)

### 429 Too Many Requests
- API 호출 빈도가 너무 높습니다.
- 디바운싱(debouncing)을 적용하세요.

