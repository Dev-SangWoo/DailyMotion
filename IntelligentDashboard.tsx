import { useState, useRef, useEffect } from "react";
import { Search, Rocket, AlertTriangle, Bell, Train, Bus, Clock, Users, MapPin, Star, ArrowRight, CloudRain, TrendingUp, Navigation, Footprints, ChevronDown, Home, Briefcase } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Carousel, CarouselContent, CarouselItem } from "./ui/carousel";

type DashboardState = "normal" | "hazard";

interface BusInfo {
  number: string;
  arrivalTime: number;
}

interface SubwayInfo {
  line: string;
  direction: string;
  arrivalTime: number;
  congestion: "low" | "medium" | "high";
  recommendedCar: string;
}

interface FavoritePlace {
  id: string;
  name: string;
  address: string;
  type: "home" | "work" | "custom";
}

interface JourneyStep {
  id: string;
  type: "start" | "walk" | "bus" | "subway" | "end";
  title: string;
  description: string;
  duration: number;
  icon: string;
  congestion?: "low" | "medium" | "high";
  details?: string;
}

interface Journey {
  id: string;
  name: string;
  from: string;
  to: string;
  icon: string;
}

interface IntelligentDashboardProps {
  onboardingData?: any;
}

export default function IntelligentDashboard({ onboardingData }: IntelligentDashboardProps) {
  const [dashboardState, setDashboardState] = useState<DashboardState>("normal");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [isOriginFocused, setIsOriginFocused] = useState(false);
  const [isDestinationFocused, setIsDestinationFocused] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [isSearchBarCollapsed, setIsSearchBarCollapsed] = useState(true);
  const [selectedJourney, setSelectedJourney] = useState<Journey | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const searchBarRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  
  // 등록된 여정들 (온보딩에서 가져오기)
  const getJourneysFromOnboarding = () => {
    if (!onboardingData?.journeys || !onboardingData?.places) {
      return [
        { id: "1", name: "출근", from: "집", to: "회사", icon: "🏢" },
        { id: "2", name: "헬스장", from: "회사", to: "헬스장", icon: "💪" },
        { id: "3", name: "귀가", from: "헬스장", to: "집", icon: "🏠" },
      ];
    }

    return onboardingData.journeys.map((journey: any) => {
      const fromPlace = onboardingData.places.find((p: any) => p.id === journey.fromId);
      const toPlace = onboardingData.places.find((p: any) => p.id === journey.toId);
      return {
        id: journey.id,
        name: journey.name,
        from: fromPlace?.name || "출발지",
        to: toPlace?.name || "목적지",
        icon: toPlace?.icon || "📍",
      };
    });
  };

  const journeys: Journey[] = getJourneysFromOnboarding();
  
  const [favoritePlaces, setFavoritePlaces] = useState<FavoritePlace[]>([
    { id: "1", name: "집", address: "서울시 강남구 역삼동", type: "home" },
    { id: "2", name: "회사", address: "서울시 중구 시청역", type: "work" },
    { id: "3", name: "학교", address: "서울시 관악구 서울대학교", type: "custom" },
    { id: "4", name: "카페", address: "서울시 강남구 테헤란로", type: "custom" },
  ]);

  // Mock data
  const busInfo: BusInfo = {
    number: "123",
    arrivalTime: 5,
  };

  const subwayInfo: SubwayInfo = {
    line: "2호선",
    direction: "시청 방면",
    arrivalTime: 3,
    congestion: "high",
    recommendedCar: "3-2",
  };

  const hazardCount = 2;
  const journeyTime = 45;

  // Journey steps data
  const journeySteps: JourneyStep[] = [
    {
      id: "1",
      type: "start",
      title: "집",
      description: "서울시 강남구 역삼동",
      duration: 0,
      icon: "🏠",
    },
    {
      id: "2",
      type: "walk",
      title: "도보 이동",
      description: "역삼역 3번 출구까지",
      duration: 5,
      icon: "🚶",
    },
    {
      id: "3",
      type: "subway",
      title: "2호선 탑승",
      description: "시청역 방면 · 3-2칸 추천",
      duration: 30,
      icon: "🚇",
      congestion: "high",
      details: "SKT 혼잡도: 혼잡",
    },
    {
      id: "4",
      type: "walk",
      title: "도보 이동",
      description: "시청역 2번 출구에서",
      duration: 5,
      icon: "🚶",
    },
    {
      id: "5",
      type: "end",
      title: "회사",
      description: "서울시 중구 시청역",
      duration: 0,
      icon: "🏢",
    },
  ];

  // Handle scroll to update active step
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const containerRect = container.getBoundingClientRect();
      const centerY = containerRect.top + containerRect.height / 2;

      let closestIndex = 0;
      let closestDistance = Infinity;

      const items = container.querySelectorAll('[data-step-index]');
      items.forEach((item, index) => {
        const rect = item.getBoundingClientRect();
        const itemCenterY = rect.top + rect.height / 2;
        const distance = Math.abs(centerY - itemCenterY);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });

      setActiveStepIndex(closestIndex);
    };

    container.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial call

    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const getCongestionColor = (level: string) => {
    switch (level) {
      case "low":
        return "text-green-600";
      case "medium":
        return "text-yellow-600";
      case "high":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getCongestionBadge = (level: string) => {
    switch (level) {
      case "low":
        return "여유";
      case "medium":
        return "보통";
      case "high":
        return "혼잡";
      default:
        return "정보없음";
    }
  };

  const selectFavorite = (place: FavoritePlace) => {
    if (!origin) {
      setOrigin(place.name);
    } else {
      setDestination(place.name);
    }
  };

  const getPlaceIcon = (placeName: string) => {
    if (placeName.includes("집")) return "🏠";
    if (placeName.includes("회사")) return "🏢";
    if (placeName.includes("학교")) return "🏫";
    if (placeName.includes("카페")) return "☕";
    return "📍";
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const swipeDistance = touchStartX.current - touchEndX.current;
    // 왼쪽으로 50px 이상 스와이프하면 축소
    if (swipeDistance > 50) {
      setIsSearchBarCollapsed(true);
    }
    // 오른쪽으로 50px 이상 스와이프하면 펼침
    else if (swipeDistance < -50 && isSearchBarCollapsed) {
      setIsSearchBarCollapsed(false);
    }
  };

  const toggleSearchBar = () => {
    setIsSearchBarCollapsed(!isSearchBarCollapsed);
  };

  const handleJourneySelect = (journey: Journey) => {
    setSelectedJourney(journey);
    setOrigin(journey.from);
    setDestination(journey.to);
  };

  // 초기값으로 출근 여정 설정
  useEffect(() => {
    if (journeys.length > 0 && !selectedJourney) {
      handleJourneySelect(journeys[0]);
    }
  }, []);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 overflow-x-hidden">
      <div className="mx-auto max-w-2xl px-3 py-6 space-y-3">
        {/* Search Bar - Component 1 */}
        <div
          ref={searchBarRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="transition-all duration-300 sticky top-4 z-10 w-full"
        >
          {isSearchBarCollapsed ? (
            // 축소된 상태 - 여정 선택 + 확장 버튼
            <Card className="bg-white shadow-md border-0 overflow-hidden">
              <div className="p-3 pb-2">
                {/* 여정 선택 버튼들 */}
                <div className="flex gap-2">
                  {journeys.map((journey) => (
                    <button
                      key={journey.id}
                      onClick={() => handleJourneySelect(journey)}
                      className={`flex-1 px-3 py-1 rounded-lg transition-all duration-200 ${
                        selectedJourney?.id === journey.id
                          ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="text-sm">{journey.icon}</span>
                        <span className="text-sm">{journey.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* 확장 버튼 */}
              <button
                onClick={toggleSearchBar}
                className="w-full py-1 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </Card>
          ) : (
            // 펼쳐진 상태
            <Card className="bg-white shadow-lg">
              <CardContent className="p-5 space-y-4">
                {/* 출발지/도착지 가로 배치 */}
                <div className="flex items-center gap-3">
                  {/* 출발지 */}
                  <div className="flex-1">
                    <div
                      className={`flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-3 transition-all duration-300 ${
                        isOriginFocused ? "ring-2 ring-blue-400 bg-white" : "hover:bg-gray-100"
                      }`}
                    >
                      <MapPin className="w-4 h-4 text-green-600 shrink-0" />
                      <Input
                        type="text"
                        placeholder="출발지"
                        value={origin}
                        onChange={(e) => setOrigin(e.target.value)}
                        onFocus={() => setIsOriginFocused(true)}
                        onBlur={() => setIsOriginFocused(false)}
                        className="flex-1 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-auto text-sm"
                      />
                    </div>
                  </div>

                  {/* 화살표 */}
                  <div className="bg-blue-100 rounded-full p-1.5 shrink-0">
                    <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
                  </div>

                  {/* 도착지 */}
                  <div className="flex-1">
                    <div
                      className={`flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-3 transition-all duration-300 ${
                        isDestinationFocused ? "ring-2 ring-blue-400 bg-white" : "hover:bg-gray-100"
                      }`}
                    >
                      <MapPin className="w-4 h-4 text-red-600 shrink-0" />
                      <Input
                        type="text"
                        placeholder="도착지"
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        onFocus={() => setIsDestinationFocused(true)}
                        onBlur={() => setIsDestinationFocused(false)}
                        className="flex-1 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-auto text-sm"
                      />
                    </div>
                  </div>

                  {/* 검색 버튼 */}
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700 shrink-0 h-11 px-4"
                    onClick={toggleSearchBar}
                  >
                    <Search className="w-4 h-4" />
                  </Button>
                </div>

                {/* 즐겨찾기 장소 - 원형 아이콘 */}
                <div className="flex items-center gap-3 overflow-x-auto pb-1">
                  {favoritePlaces.map((place) => (
                    <button
                      key={place.id}
                      onClick={() => selectFavorite(place)}
                      className="flex flex-col items-center gap-1.5 shrink-0 group"
                    >
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-2xl hover:from-blue-200 hover:to-indigo-200 transition-all duration-300 hover:scale-110 shadow-sm hover:shadow-md">
                        {getPlaceIcon(place.name)}
                      </div>
                      <span className="text-xs text-gray-600 group-hover:text-blue-600 transition-colors">
                        {place.name}
                      </span>
                    </button>
                  ))}
                  
                  {/* 추가 버튼 */}
                  <button className="flex flex-col items-center gap-1.5 shrink-0 group">
                    <div className="w-14 h-14 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-2xl hover:border-blue-400 hover:bg-blue-50 transition-all duration-300 hover:scale-110">
                      ➕
                    </div>
                    <span className="text-xs text-gray-500">추가</span>
                  </button>
                </div>

                {/* 축소 버튼 */}
                <button
                  onClick={toggleSearchBar}
                  className="w-full py-2 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <ChevronDown className="w-5 h-5 rotate-180" />
                </button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Dynamic CTA Card - Component 2 */}
        <div className="relative">
          <Carousel className="w-full" opts={{ loop: true }}>
            <CarouselContent>
              {/* Card 1: 출발 알림 */}
              <CarouselItem>
                <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 border-0 shadow-2xl overflow-hidden">
                  <CardContent className="p-8 pb-6 relative h-[240px]">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full -ml-16 -mb-16" />
                    
                    <div className="relative z-10 space-y-4">
                      <div className="flex items-start gap-5">
                        <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm shadow-lg">
                          <Rocket className="w-10 h-10 text-white" />
                        </div>

                        <div className="flex-1 space-y-3">
                          <h2 className="text-white text-2xl">
                            지금 출발하세요!
                          </h2>

                          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 space-y-2">
                            <div className="flex items-center gap-2">
                              <Bus className="w-5 h-5 text-white" />
                              <p className="text-white">
                                <span className="text-yellow-300">{busInfo.arrivalTime}분</span> 뒤{" "}
                                <span className="text-yellow-300">{busInfo.number}번</span> 버스 도착
                              </p>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-white/80">
                              <Bell className="w-4 h-4" />
                              <span>Odsay API 실시간</span>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Badge className="bg-white/30 hover:bg-white/40 text-white border-0">
                              쾌적한 출근길
                            </Badge>
                            <Badge className="bg-white/30 hover:bg-white/40 text-white border-0">
                              정시 도착 예상
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2 z-20">
                      {[0, 1, 2, 3].map((index) => (
                        <div
                          key={index}
                          className={`transition-all duration-300 rounded-full ${
                            index === 0 ? "w-8 h-2 bg-white" : "w-2 h-2 bg-white/40"
                          }`}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </CarouselItem>

              {/* Card 2: 위험 경고 */}
              <CarouselItem>
                <Card className="bg-gradient-to-br from-red-500 to-orange-600 border-0 shadow-2xl overflow-hidden">
                  <CardContent className="p-8 pb-6 relative h-[240px]">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full -ml-16 -mb-16" />
                    
                    <div className="relative z-10 space-y-4">
                      <div className="flex items-start gap-5">
                        <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm shadow-lg animate-pulse">
                          <AlertTriangle className="w-10 h-10 text-white" />
                        </div>

                        <div className="flex-1 space-y-3">
                          <h2 className="text-white text-2xl">
                            출발 전 확인!
                          </h2>

                          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 space-y-2">
                            <p className="text-white">
                              내 경로에 <span className="text-yellow-300">{hazardCount}건</span>의 위험이 감지되었습니다
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Badge className="bg-white text-red-600 hover:bg-white/90">
                              🚧 도로 공사
                            </Badge>
                            <Badge className="bg-white text-red-600 hover:bg-white/90">
                              🚗 교통사고 - 5분 지연
                            </Badge>
                          </div>

                          <p className="text-sm text-white/80">
                            💡 대체 경로 이용을 권장합니다
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2 z-20">
                      {[0, 1, 2, 3].map((index) => (
                        <div
                          key={index}
                          className={`transition-all duration-300 rounded-full ${
                            index === 1 ? "w-8 h-2 bg-white" : "w-2 h-2 bg-white/40"
                          }`}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </CarouselItem>

              {/* Card 3: 날씨 정보 */}
              <CarouselItem>
                <Card className="bg-gradient-to-br from-sky-400 to-blue-500 border-0 shadow-2xl overflow-hidden">
                  <CardContent className="p-8 pb-6 relative h-[240px]">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full -ml-16 -mb-16" />
                    
                    <div className="relative z-10 space-y-4">
                      <div className="flex items-start gap-5">
                        <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm shadow-lg">
                          <CloudRain className="w-10 h-10 text-white" />
                        </div>

                        <div className="flex-1 space-y-3">
                          <h2 className="text-white text-2xl">
                            날씨 체크!
                          </h2>

                          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-white">오늘 오후 비 예보</span>
                              <span className="text-white text-3xl">🌧️</span>
                            </div>
                            <div className="text-sm text-white/90">
                              강수확률 <span className="text-yellow-300">80%</span> · 18°C
                            </div>
                          </div>

                          <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-lg p-3">
                            <span className="text-white text-sm">☂️ 우산을 챙기세요</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2 z-20">
                      {[0, 1, 2, 3].map((index) => (
                        <div
                          key={index}
                          className={`transition-all duration-300 rounded-full ${
                            index === 2 ? "w-8 h-2 bg-white" : "w-2 h-2 bg-white/40"
                          }`}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </CarouselItem>

              {/* Card 4: 교통 혼잡도 */}
              <CarouselItem>
                <Card className="bg-gradient-to-br from-purple-500 to-pink-600 border-0 shadow-2xl overflow-hidden">
                  <CardContent className="p-8 pb-6 relative h-[240px]">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full -ml-16 -mb-16" />
                    
                    <div className="relative z-10 space-y-4">
                      <div className="flex items-start gap-5">
                        <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm shadow-lg">
                          <TrendingUp className="w-10 h-10 text-white" />
                        </div>

                        <div className="flex-1 space-y-3">
                          <h2 className="text-white text-2xl">
                            실시간 교통정보
                          </h2>

                          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-white">강남대로</span>
                              <Badge className="bg-yellow-400 text-yellow-900 hover:bg-yellow-500">
                                보통
                              </Badge>
                            </div>
                            <div className="text-sm text-white/90">
                              평소보다 <span className="text-yellow-300">5분</span> 더 소요
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2 text-center">
                              <div className="text-white text-xs">출근 시간</div>
                              <div className="text-white">45분</div>
                            </div>
                            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2 text-center">
                              <div className="text-white text-xs">도착 예정</div>
                              <div className="text-white">9:15</div>
                            </div>
                            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2 text-center">
                              <div className="text-white text-xs">SKT</div>
                              <div className="text-white text-xs">실시간</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2 z-20">
                      {[0, 1, 2, 3].map((index) => (
                        <div
                          key={index}
                          className={`transition-all duration-300 rounded-full ${
                            index === 3 ? "w-8 h-2 bg-white" : "w-2 h-2 bg-white/40"
                          }`}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </CarouselItem>
            </CarouselContent>
          </Carousel>
        </div>

        {/* Journey Details Card - Component 3 - 새롭게 재작성 */}
        <Card className="bg-white border-gray-200 shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-white" />
                <div>
                  <p className="text-white/90 text-xs">총 예상 소요 시간</p>
                  <p className="text-white text-3xl tabular-nums">
                    {journeyTime}<span className="text-xl ml-1">분</span>
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white/90 text-xs">여정 단계</p>
                <p className="text-white text-xl">{journeySteps.length}개</p>
              </div>
            </div>
          </div>

          {/* Journey Steps - Scrollable with fixed center highlight */}
          <div className="relative">


            {/* Scrollable container */}
            <div
              ref={scrollContainerRef}
              className="h-[350px] overflow-y-auto px-5 py-3 scroll-smooth"
              style={{ scrollSnapType: 'y mandatory' }}
            >
              {/* Journey steps */}
              <div className="relative">
                {journeySteps.map((step, index) => (
                  <div
                    key={step.id}
                    data-step-index={index}
                    className="mb-4 last:mb-0"
                    style={{ scrollSnapAlign: 'center' }}
                  >
                    <div
                      className={`relative flex items-start gap-3 transition-all duration-300 ${
                        activeStepIndex === index
                          ? 'opacity-100'
                          : 'opacity-40'
                      }`}
                    >
                      {/* Icon and connector - 고정된 크기 컨테이너 */}
                      <div className="relative flex-shrink-0 w-14 h-14">
                        {/* Connecting line segment - 각 단계마다 */}
                        {index < journeySteps.length - 1 && (
                          <div 
                            className="absolute left-1/2 top-14 -translate-x-1/2 w-1 h-[calc(100%+1rem)] transition-opacity duration-300"
                            style={{
                              background: 'linear-gradient(to bottom, rgb(34, 197, 94), rgb(59, 130, 246), rgb(239, 68, 68))',
                              backgroundPosition: `0 ${(index / (journeySteps.length - 1)) * 100}%`,
                              backgroundSize: '100% 300%',
                            }}
                          />
                        )}
                        {/* Dot on line - 항상 중앙 */}
                        <div
                          className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-300 ${
                            activeStepIndex === index
                              ? 'w-5 h-5 bg-white border-4 border-blue-600 shadow-lg'
                              : 'w-3 h-3 bg-white border-2 border-gray-400'
                          }`}
                        />
                        
                        {/* Icon - 항상 중앙에 위치, scale만 변경 */}
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                          <div
                            className={`flex items-center justify-center rounded-2xl transition-all duration-300 ${
                              activeStepIndex === index
                                ? 'w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 shadow-xl scale-100'
                                : 'w-12 h-12 bg-gray-200 scale-90'
                            }`}
                          >
                            <span className={activeStepIndex === index ? 'text-2xl' : 'text-xl'}>
                              {step.icon}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Content card */}
                      <div
                        className={`flex-1 rounded-xl p-3 transition-all duration-300 ${
                          activeStepIndex === index
                            ? 'bg-white shadow-xl border-2 border-blue-300'
                            : 'bg-gray-50 border border-gray-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <h4
                              className={`transition-all duration-300 ${
                                activeStepIndex === index
                                  ? 'text-gray-900 text-base'
                                  : 'text-gray-500 text-sm'
                              }`}
                            >
                              {step.title}
                            </h4>
                            <p className="text-xs text-gray-500 mt-0.5">{step.description}</p>

                            {step.details && activeStepIndex === index && (
                              <div className="mt-2 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                <span className="text-xs text-blue-600">{step.details}</span>
                              </div>
                            )}

                            {step.congestion && activeStepIndex === index && (
                              <div className="mt-2">
                                <Badge
                                  className={`text-xs ${
                                    step.congestion === 'high'
                                      ? 'bg-red-100 text-red-700'
                                      : step.congestion === 'medium'
                                      ? 'bg-yellow-100 text-yellow-700'
                                      : 'bg-green-100 text-green-700'
                                  }`}
                                >
                                  <Users className="w-3 h-3 mr-1" />
                                  {getCongestionBadge(step.congestion)}
                                </Badge>
                              </div>
                            )}
                          </div>

                          {/* Duration */}
                          {step.duration > 0 && (
                            <div className="text-right shrink-0">
                              <div
                                className={`tabular-nums transition-all duration-300 ${
                                  activeStepIndex === index
                                    ? 'text-4xl text-blue-600'
                                    : 'text-xl text-gray-400'
                                }`}
                              >
                                {step.duration}
                              </div>
                              <div
                                className={`text-xs ${
                                  activeStepIndex === index ? 'text-blue-600' : 'text-gray-400'
                                }`}
                              >
                                분
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom spacer - 맨 마지막 항목을 중앙으로 스크롤할 수 있도록 */}
              <div className="h-[calc(350px/2)]" />
            </div>

            {/* Scroll hint */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center z-30">
              <div className="bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-md">
                <p className="text-xs text-gray-600 flex items-center gap-2">
                  <span className="animate-bounce">↕</span>
                  스크롤하여 단계별로 확인
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Button
            className="h-14 bg-blue-600 hover:bg-blue-700 shadow-md"
            onClick={() => alert("출발 알림이 설정되었습니다!")}
          >
            <Bell className="w-4 h-4 mr-2" />
            출발 알림
          </Button>
          <Button
            variant="outline"
            className="h-14 border-gray-300 hover:bg-gray-50 shadow-md"
            onClick={() => alert("위험 정보를 확인합니다")}
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            위험 확인
          </Button>
        </div>

        {/* Footer Info */}
        <div className="text-center text-xs text-gray-500 space-y-1 pb-4">
          <p>협력 서비스: Odsay API, SKT 혼잡도 API, 행정안전부</p>
          <p>실시간 정보는 5분마다 자동 업데이트됩니다</p>
        </div>
      </div>
    </div>
  );
}
