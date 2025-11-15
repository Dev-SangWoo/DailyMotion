🧭 온보딩 UI/UX 설계 명세서 (v3.2 - 3D 모던 스타일 적용)

1. 온보딩 핵심 철학
   "가치 제안 우선 (Value First)": "데이터를 달라"고 요구하기 전에, "당신의 출근길을 이렇게 바꿔주겠다"는 가치를 먼저 명확하게 설득합니다.

"대화형 설정 (Conversational Setup)": 딱딱한 '설정 폼(form)'이 아니라, 비서가 나에게 질문을 하는 듯한 '대화형' UI/UX를 제공합니다.

"한 번에 하나씩 (One Thing at a Time)": 사용자가 부담을 느끼지 않도록, 각 화면에서 단 하나의 핵심 과업만 요구합니다.

"뇌를 쓰지 않는 뼈대 (Brainless Skeleton)": '복잡한 설정'은 '학습(묘책)'에 맡기고, '최소한의 뼈대'는 90%의 사용자가 선택할 '기본값'을 제시하여 고민 없이 설정하게 합니다.

2. 디자인 시스템 정의 (Design System Tokens)
   핵심 스타일: "3D 낭낭한 모던하고 깔끔한 느낌" (3D Soft UI / Claymorphism + Glassmorphism)

2.1. 색상 (Color Palette)
Primary (주요 색상): Blue (예: #007AFF) (신뢰, CTA)

Ambient (배경색): Ambient-Blue (정상: #F0F4FF), Ambient-Warning (주의: #FFFBEA), Ambient-Alert (위기: #FFF1F0)

Neutral (중립): Neutral-900 (Text), Neutral-100 (카드 배경: #FFFFFF)

Glassmorphism Tints: Neutral-100 카드 배경에 투명도(70-80%) 및 배경 블러(Backdrop Blur: 12px) 적용.

2.2. 타이포그래피 (Typography)
Font: Pretendard (또는 시스템 폰트)

Display-L (화면 헤드라인): 34px, Bold

Headline-M (컴포넌트 제목): 22px, Semi-Bold

Body-L (본문/버튼): 17px, Medium

2.3. 컴포넌트 (Components)
Icons (핵심): 고품질 3D 렌더링 아이콘 (예: 첨부한 버스 이미지 🚌, 🚇, 📍, 🔔, 🏆)을 적극 사용합니다.

Cards (핵심): "3D 소프트 UI (Claymorphism)" 또는 "Glassmorphism" 스타일을 적용합니다. 부드럽고(diffused) 두꺼운 그림자와 미묘한 그라데이션 테두리로 '떠 있는' 느낌을 줍니다.

Button (Primary): "눌리는" 입체감을 극대화한 3D 버튼 스타일을 적용합니다. (하단에 명확한 그림자 부여)

Input Field: 3D를 자제하고 '안으로 파인(Inset)' 느낌이나 깔끔한 Flat 스타일을 유지하여 '입력부'임을 명확히 합니다.

2.4. 인터랙션 (Motion & Interaction)
3D Icons: 탭(Tap) 시 미세한 3D 회전이나 바운스(Bounce) 효과 적용 (Lottie/Rive).

Screen Transition: Slide-in from Right (Push) / Slide-up from Bottom (Modal).

3. 온보딩 UI/UX 플로우 (상세 명세)
   스크린 1-3: 가치 제안 (The Promise)
   UI/Layout: 수평 스와이프형 Page View.

[v3.2 적용]: 화면 중앙에 앱의 핵심 가치를 상징하는 고품질 3D 일러스트 (예: 3D 비서 캐릭터, 반짝이는 3D 알림 벨 🔔)를 배치합니다.

Components:

Display-L: "매일 아침, 고민하지 마세요."

Pagination: ... (점 3개)

CTA (스크린 3): Button (Primary) ("내 비서 만들기") - 3D 버튼 스타일 적용.

스크린 4: 핵심 여정 설정 (Core Journey)
UI/Layout: 상단 Headline, 중단 Input Fields.

Components:

Headline-M: "가장 중요한 여정을 알려주세요."

Input Field (1): [ 📍 출발지 (예: 집) ] (깔끔한 Flat 스타일)

Input Field (2): [ 🏢 도착지 (예: 회사) ] (깔끔한 Flat 스타일)

Button (Primary): [ 다음 ] (3D 버튼 스타일)

스크린 5: '나만의 경로' 설정 (The Path)
UI/Layout: 상단 Headline, 중단 Card 목록.

Components:

Headline-M: "보통 이 경로로 다니시나요?"

Card (Option 1): "추천 1: [123번 → 2호선]", "약 45분" (3D Soft UI 카드)

Card (Option 2): "추천 2: [456번 직행]", "약 50분" (3D Soft UI 카드)

Button (Secondary): [ ✏️ 아니요, 제가 직접 설정할게요 ]

Button (Primary): [ 다음 ] (3D 버튼 스타일)

스크린 6: '출근' 모드 설정 (The Goal)
UI/Layout: 상단 Headline, 중단 Input 컴포넌트 2개.

Components:

Headline-M (1): "회사에 몇 시까지 도착해야 하나요?"

Time Picker: (네이티브 Scroll Wheel)

Headline-M (2): "보통 정류장/역까지 몇 분 정도 걸리나요?"

Slider: (1분 ~ 15분)

Button (Primary): [ 다음 ] (3D 버튼 스타일)

스크린 7: 스케줄 뼈대 설정 (The Skeleton)
UI/Layout: 상단 Headline, 중단 Button 2개 (시각적 중요도 차등).

Components:

Headline-M: "이 여정(출근)은 언제가 필요하신가요?"

Button (Primary): (크고 강조됨) [ 📅 평일 (월-금) ] (3D 버튼 스타일)

Button (Secondary): (작고 흐리게) [ ✏️ 직접 선택할래요 ]

스크린 8: 권한 설정 (The Magic)
UI/Layout: 앱의 '설득' 화면. Icon + Text 조합.

[v3.2 적용]: 권한을 상징하는 아이콘을 **'3D 렌더링 아이콘'**으로 표시하여 시각적 중요도를 높입니다.

Components:

Headline-M: "거의 다 됐어요! 비서가 일하려면 '권한'이 필요해요."

(Section 1): (3D 🔔 아이콘) + "알림 (필수)" + "앱을 켜지 않아도 '지금 출발!' 알림을..."

(Section 2): (3D 📍 아이콘) + "위치 (항상 허용)" + "이게 핵심이에요! '항상 허용'이어야만..."

Button (Primary): [ 권한 허용하고 시작하기 ] (3D 버튼 스타일)

스크린 9: 완료 (Done!)
UI/Layout: 환영 및 성공 피드백.

[v3.2 적용]: Checkmark 대신, '여정의 시작'을 축하하는 "3D 로켓 🚀" 또는 "3D 트로피 🏆" 아이콘을 중앙에 크게 표시합니다.

Components:

Headline-M: "설정 완료! <b>🔵</b>"

Body-L: "이제 [출근] 여정이 준비되었습니다. 내일 아침, 제가 알아서 챙겨드릴게요."

Button (Primary): [ 내일의 브리핑 미리보기 ] (3D 버튼 스타일)

Interaction: Button 탭 → 앱의 메인 [브리핑] 탭으로 Replace 트랜지션.
