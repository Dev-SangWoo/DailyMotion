/**
 * 새로운 여정 스크린
 *
 * 새로운 여정을 생성하거나 기존 여정을 수정하는 화면입니다.
 * 지도에 여정의 출발지와 목적지를 표시합니다.
 *
 * 헌법 준수:
 * - AGENTS.md [제2장]: Styled-components 사용
 * - CLAUDE.md: 카카오맵 API 활용
 */

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import styled from 'styled-components/native';
import { TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import { AppHeader } from '../../components/common/AppHeader';
import { GoogleMapView } from '../../components/maps/GoogleMapView';
import { theme } from '../../styles/theme';
import { useOnboardingData } from '../Onboarding/stores/useOnboardingStore';
import { searchPlace } from '../../services/kakaoMapService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const Container = styled.View`
  flex: 1;
  background-color: ${theme.colors.background};
`;

const MapContainer = styled.View`
  flex: 1;
  width: 100%;
`;

const JourneyCard = styled.View`
  background-color: white;
  border-radius: 12px;
  padding: ${theme.spacing.md}px;
  margin-bottom: ${theme.spacing.md}px;
  border-width: 1px;
  border-color: #e0e0e0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
  elevation: 1;
`;

const JourneyCardHeader = styled.View`
  flex-direction: row;
  align-items: center;
  margin-bottom: ${theme.spacing.sm}px;
`;

const JourneyIcon = styled.Text`
  font-size: 24px;
  margin-right: ${theme.spacing.sm}px;
`;

const JourneyTitle = styled.Text`
  font-size: 16px;
  font-weight: 600;
  color: ${theme.colors.text};
`;

const JourneyLocation = styled.View`
  flex-direction: row;
  align-items: center;
  margin-bottom: 8px;
`;

const LocationLabel = styled.Text`
  font-size: 13px;
  color: ${theme.colors.textSecondary};
  min-width: 50px;
  font-weight: 500;
`;

const LocationText = styled.Text`
  font-size: 13px;
  color: ${theme.colors.text};
  flex: 1;
`;

const TimeInfo = styled.Text`
  font-size: 12px;
  color: ${theme.colors.textSecondary};
  margin-top: ${theme.spacing.xs}px;
`;

const ButtonContainer = styled.View`
  gap: ${theme.spacing.sm}px;
`;

const ActionButton = styled(TouchableOpacity)<{ variant: 'primary' | 'secondary' }>`
  background-color: ${(props) =>
    props.variant === 'primary' ? theme.colors.primary : '#f0f0f0'};
  padding: ${theme.spacing.md}px;
  border-radius: 8px;
  align-items: center;
`;

const ActionButtonText = styled.Text<{ variant: 'primary' | 'secondary' }>`
  font-size: 14px;
  font-weight: 600;
  color: ${(props) => (props.variant === 'primary' ? 'white' : theme.colors.text)};
`;

// 플로팅 카드 스타일
const FloatingCardContainer = styled.View`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: white;
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
  shadow-color: #000;
  shadow-offset: 0px -2px;
  shadow-opacity: 0.1;
  shadow-radius: 8px;
  elevation: 8;
  max-height: ${screenHeight * 0.4}px;
`;

const FloatingCardHeader = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.md}px ${theme.spacing.lg}px;
  border-bottom-width: 1px;
  border-bottom-color: #E0E0E0;
`;

const FloatingCardTitle = styled.Text`
  font-size: ${theme.fonts.sizes.lg}px;
  font-weight: 700;
  color: ${theme.colors.text};
`;

const CloseButton = styled(TouchableOpacity)`
  width: 32px;
  height: 32px;
  border-radius: 16px;
  background-color: #F5F5F5;
  justify-content: center;
  align-items: center;
`;

const CloseButtonText = styled.Text`
  font-size: 18px;
  color: ${theme.colors.text};
  font-weight: 700;
`;

const RecommendedPlacesScroll = styled.ScrollView`
  padding: ${theme.spacing.md}px ${theme.spacing.lg}px;
`;

const PlaceCard = styled(TouchableOpacity)`
  background-color: #F8F8F8;
  border-radius: 12px;
  padding: ${theme.spacing.md}px;
  margin-bottom: ${theme.spacing.sm}px;
  flex-direction: row;
  align-items: center;
  border-width: 1px;
  border-color: #E0E0E0;
`;

const PlaceInfo = styled.View`
  flex: 1;
`;

const PlaceName = styled.Text`
  font-size: ${theme.fonts.sizes.md}px;
  font-weight: 600;
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.xs}px;
`;

const PlaceDescription = styled.Text`
  font-size: ${theme.fonts.sizes.sm}px;
  color: ${theme.colors.textSecondary};
  margin-bottom: ${theme.spacing.xs}px;
`;

const PlaceSource = styled.Text`
  font-size: ${theme.fonts.sizes.xs}px;
  color: ${theme.colors.primary};
  font-weight: 500;
  margin-bottom: ${theme.spacing.xs}px;
`;

const PlaceDistance = styled.Text`
  font-size: ${theme.fonts.sizes.xs}px;
  color: ${theme.colors.primary};
  font-weight: 600;
`;

const EmptyState = styled.View`
  padding: ${theme.spacing.xl}px;
  align-items: center;
`;

const EmptyStateText = styled.Text`
  font-size: ${theme.fonts.sizes.sm}px;
  color: ${theme.colors.textSecondary};
  text-align: center;
`;

export default function NewJourneyScreen() {
  const { pathSelection, places } = useOnboardingData();
  const [isFloatingCardVisible, setIsFloatingCardVisible] = useState(true);
  const [recommendedPlaces, setRecommendedPlaces] = useState<Array<{
    id: string;
    name: string;
    description: string;
    lat: number;
    lng: number;
    distance: string;
    address: string;
    source: string;
  }>>([]);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);

  // 여정별 색상 매핑 함수 (SafetyGuardScreen과 동일)
  const getJourneyColor = useCallback((journeyKey: string): string => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F',
      '#BB8FCE', '#85C1E2', '#FF8C42', '#6C5CE7', '#00D2D3', '#FFD93D',
      '#6BCB77', '#FF6B9D', '#C44569', '#5F27CD',
    ];
    
    let hash = 0;
    for (let i = 0; i < journeyKey.length; i++) {
      const char = journeyKey.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    const colorIndex = Math.abs(hash) % colors.length;
    return colors[colorIndex];
  }, []);

  // 정류장 좌표 추출 (SafetyGuardScreen과 동일 로직)
  const stopCoordinates = useMemo(() => {
    const stops: Array<{
      name: string;
      lat: number;
      lng: number;
      type: 'bus' | 'subway' | 'walk';
      segmentIndex: number;
      journeyKey: string;
    }> = [];

    if (!pathSelection.selectedPaths) {
      return stops;
    }

    Object.entries(pathSelection.selectedPaths).forEach(([journeyKey, path]: [string, any]) => {
      if (!path || !path.subPath || !Array.isArray(path.subPath)) {
        return;
      }

      path.subPath.forEach((segment: any, segIdx: number) => {
        const trafficType = segment.trafficType;
        const typeLabel = trafficType === 1 ? 'subway' : trafficType === 2 ? 'bus' : 'walk';

        // 시작 정류장/역
        if (segment.startX && segment.startY) {
          const lat = parseFloat(segment.startY);
          const lng = parseFloat(segment.startX);
          if (!isNaN(lat) && !isNaN(lng)) {
            stops.push({
              name: segment.startName || '시작점',
              lat,
              lng,
              type: typeLabel,
              segmentIndex: segIdx,
              journeyKey,
            });
          }
        }

        // 경유 정류장/역
        if (trafficType !== 3 && segment.passStopList) {
          let passStops: any[] = [];
          
          if (Array.isArray(segment.passStopList)) {
            passStops = segment.passStopList;
          } else if (typeof segment.passStopList === 'object' && segment.passStopList.stations) {
            passStops = Array.isArray(segment.passStopList.stations) 
              ? segment.passStopList.stations 
              : [];
          }

          passStops.forEach((stop: any) => {
            const lat = parseFloat(stop.y || stop.latitude || stop.lat);
            const lng = parseFloat(stop.x || stop.longitude || stop.lng);
            if (!isNaN(lat) && !isNaN(lng)) {
              stops.push({
                name: stop.stationName || stop.name || '경유지',
                lat,
                lng,
                type: typeLabel,
                segmentIndex: segIdx,
                journeyKey,
              });
            }
          });
        }

        // 종료 정류장/역
        if (segment.endX && segment.endY) {
          const lat = parseFloat(segment.endY);
          const lng = parseFloat(segment.endX);
          if (!isNaN(lat) && !isNaN(lng)) {
            stops.push({
              name: segment.endName || '종료점',
              lat,
              lng,
              type: typeLabel,
              segmentIndex: segIdx,
              journeyKey,
            });
          }
        }
      });
    });

    return stops;
  }, [pathSelection]);

  // 정류장 마커 생성
  const stopMarkers = useMemo(() => {
    return stopCoordinates
      .filter((stop) => stop.type !== 'walk') // 도보는 제외
      .map((stop) => ({
        title: stop.name,
        lat: stop.lat,
        lng: stop.lng,
        color: getJourneyColor(stop.journeyKey),
        anchor: { x: 0.2, y: 0.2 },
        markerType: 'stop' as const,
      }));
  }, [stopCoordinates, getJourneyColor]);

  // 출발지/목적지 마커 (pathSelection.journeys에서 가져오기)
  const journeyMarkers = useMemo(() => {
    const markers: Array<{
      title: string;
      lat: number;
      lng: number;
      color: string;
      icon?: string;
      markerType?: 'icon' | 'region' | 'stop';
      zIndex?: number;
    }> = [];

    if (pathSelection.journeys && Array.isArray(pathSelection.journeys)) {
      pathSelection.journeys.forEach((journey: any) => {
        if (journey.placeY && journey.placeX) {
          const lat = parseFloat(journey.placeY);
          const lng = parseFloat(journey.placeX);
          if (!isNaN(lat) && !isNaN(lng)) {
            // 출발지인지 목적지인지 구분
            const isOrigin = journey.id && pathSelection.selectedPaths && 
              Object.keys(pathSelection.selectedPaths).some(key => key.startsWith(journey.id + '|'));
            const isDestination = journey.id && pathSelection.selectedPaths && 
              Object.keys(pathSelection.selectedPaths).some(key => key.endsWith('|' + journey.id));

            // 온보딩 데이터에서 아이콘 가져오기 (placeIcon이 있으면 사용, 없으면 기본값)
            let icon = journey.placeIcon || '📍';
            let color = '#4ECDC4';
            if (isOrigin) {
              // 출발지인 경우 온보딩 데이터의 아이콘 사용, 없으면 기본 집 아이콘
              icon = journey.placeIcon || '🏠';
              color = '#FF6B6B'; // 출발지 (집)
            } else if (isDestination) {
              // 목적지인 경우 온보딩 데이터의 아이콘 사용, 없으면 기본 회사 아이콘
              icon = journey.placeIcon || '🏢';
              color = '#4ECDC4'; // 목적지 (회사)
            }

            markers.push({
              title: journey.placeName || '장소',
              lat,
              lng,
              color,
              icon,
              markerType: 'icon' as const,
              zIndex: 1500,
            });
          }
        }
      });
    }

    console.log(`[NewJourney] 여정 마커 (출발지/목적지): ${markers.length}개`);
    return markers;
  }, [pathSelection]);

  // 등록한 장소 마커 (집, 자주 가는 장소) - journeyMarkers에 포함되지 않은 경우만
  const placeMarkers = useMemo(() => {
    const markers: Array<{
      title: string;
      lat: number;
      lng: number;
      color: string;
      icon?: string;
      markerType?: 'icon' | 'region' | 'stop';
      zIndex?: number;
    }> = [];

    // 집 주소 마커
    if (places?.homeAddress) {
      const homeAddress = places.homeAddress;
      if (typeof homeAddress === 'object' && homeAddress.x && homeAddress.y) {
        const lat = parseFloat(homeAddress.y);
        const lng = parseFloat(homeAddress.x);
        if (!isNaN(lat) && !isNaN(lng)) {
          // 이미 journeyMarkers에 포함되어 있는지 확인
          const alreadyInJourneys = journeyMarkers.some(m => 
            Math.abs(m.lat - lat) < 0.0001 && Math.abs(m.lng - lng) < 0.0001
          );
          
          if (!alreadyInJourneys) {
            markers.push({
              title: homeAddress.name || '집',
              lat,
              lng,
              color: '#FF6B6B',
              icon: homeAddress.icon || '🏠', // 온보딩 데이터에서 아이콘 가져오기
              markerType: 'icon' as const,
              zIndex: 1500,
            });
          }
        }
      }
    }

    // 자주 가는 장소 마커
    if (places?.favoritePlaces && Array.isArray(places.favoritePlaces)) {
      places.favoritePlaces.forEach((place: any) => {
        if (place.x && place.y) {
          const lat = parseFloat(place.y);
          const lng = parseFloat(place.x);
          if (!isNaN(lat) && !isNaN(lng)) {
            markers.push({
              title: place.name || '자주 가는 장소',
              lat,
              lng,
              color: '#4ECDC4',
              icon: place.icon || '⭐',
              markerType: 'icon' as const,
              zIndex: 1500,
            });
          }
        }
      });
    }

    console.log(`[NewJourney] 등록한 장소 마커: ${markers.length}개`);
    return markers;
  }, [places, journeyMarkers]);

  // 경로 polyline 생성 (SafetyGuardScreen과 동일 로직)
  const routePolylines = useMemo(() => {
    const polylines: Array<{
      name: string;
      coords: Array<{ lat: number; lng: number }>;
      color: string;
      strokeWeight: number;
      lineDashPattern?: number[];
    }> = [];

    if (!pathSelection.selectedPaths) {
      return polylines;
    }

    const journeyKeys = Object.keys(pathSelection.selectedPaths).sort();

    journeyKeys.forEach((journeyKey) => {
      const path = pathSelection.selectedPaths![journeyKey];
      if (!path || !path.subPath || !Array.isArray(path.subPath)) {
        return;
      }

      const [departId, arriveId] = journeyKey.split('|');
      const departJourney = pathSelection.journeys?.find((j: any) => j.id === departId);
      const arriveJourney = pathSelection.journeys?.find((j: any) => j.id === arriveId);
      
      const originCoord = departJourney && departJourney.placeY && departJourney.placeX
        ? { lat: parseFloat(departJourney.placeY), lng: parseFloat(departJourney.placeX) }
        : null;
      const destinationCoord = arriveJourney && arriveJourney.placeY && arriveJourney.placeX
        ? { lat: parseFloat(arriveJourney.placeY), lng: parseFloat(arriveJourney.placeX) }
        : null;

      let firstStopCoord: { lat: number; lng: number } | null = null;
      let lastStopCoord: { lat: number; lng: number } | null = null;

      const journeyColor = getJourneyColor(journeyKey);

      path.subPath.forEach((segment: any, segIdx: number) => {
        const trafficType = segment.trafficType;
        const isWalk = trafficType === 3;

        // 세그먼트의 정류장 좌표 수집
        const segmentCoords: Array<{ lat: number; lng: number }> = [];

        // 시작점
        if (segment.startX && segment.startY) {
          const lat = parseFloat(segment.startY);
          const lng = parseFloat(segment.startX);
          if (!isNaN(lat) && !isNaN(lng)) {
            segmentCoords.push({ lat, lng });
            if (segIdx === 0) {
              firstStopCoord = { lat, lng };
            }
          }
        }

        // 경유 정류장
        if (!isWalk && segment.passStopList) {
          let passStops: any[] = [];
          if (Array.isArray(segment.passStopList)) {
            passStops = segment.passStopList;
          } else if (typeof segment.passStopList === 'object' && segment.passStopList.stations) {
            passStops = Array.isArray(segment.passStopList.stations) 
              ? segment.passStopList.stations 
              : [];
          }

          passStops.forEach((stop: any) => {
            const lat = parseFloat(stop.y || stop.latitude || stop.lat);
            const lng = parseFloat(stop.x || stop.longitude || stop.lng);
            if (!isNaN(lat) && !isNaN(lng)) {
              segmentCoords.push({ lat, lng });
            }
          });
        }

        // 종료점
        if (segment.endX && segment.endY) {
          const lat = parseFloat(segment.endY);
          const lng = parseFloat(segment.endX);
          if (!isNaN(lat) && !isNaN(lng)) {
            segmentCoords.push({ lat, lng });
            if (segIdx === path.subPath.length - 1) {
              lastStopCoord = { lat, lng };
            }
          }
        }

        // 세그먼트 polyline 생성
        if (segmentCoords.length >= 2) {
          polylines.push({
            name: `${journeyKey}-segment-${segIdx}`,
            coords: segmentCoords,
            color: isWalk ? `${journeyColor}80` : journeyColor, // 도보는 반투명
            strokeWeight: isWalk ? 2 : 4,
            lineDashPattern: isWalk ? [5, 5] : undefined, // 도보는 점선
          });
        }
      });

      // 출발지에서 첫 정류장까지 도보 연결
      if (originCoord && firstStopCoord) {
        polylines.push({
          name: `${journeyKey}-origin-walk`,
          coords: [originCoord, firstStopCoord],
          color: `${journeyColor}80`,
          strokeWeight: 2,
          lineDashPattern: [5, 5],
        });
      }

      // 마지막 정류장에서 목적지까지 도보 연결
      if (lastStopCoord && destinationCoord) {
        polylines.push({
          name: `${journeyKey}-destination-walk`,
          coords: [lastStopCoord, destinationCoord],
          color: `${journeyColor}80`,
          strokeWeight: 2,
          lineDashPattern: [5, 5],
        });
      }
    });

    return polylines;
  }, [pathSelection, getJourneyColor]);

  // 지도 중심점 및 범위 계산 (출발지, 정류장, 목적지 모두 포함)
  const mapCenter = useMemo(() => {
    const allCoords: Array<{ lat: number; lng: number }> = [];

    // 출발지와 목적지 좌표 추가
    if (pathSelection.selectedPaths) {
      Object.entries(pathSelection.selectedPaths).forEach(([journeyKey, path]: [string, any]) => {
        if (!path || !pathSelection.journeys) return;

        const [departId, arriveId] = journeyKey.split('|');
        const departJourney = pathSelection.journeys.find((j: any) => j.id === departId);
        const arriveJourney = pathSelection.journeys.find((j: any) => j.id === arriveId);

        // 출발지 좌표
        if (departJourney && departJourney.placeY && departJourney.placeX) {
          const lat = parseFloat(departJourney.placeY);
          const lng = parseFloat(departJourney.placeX);
          if (!isNaN(lat) && !isNaN(lng)) {
            allCoords.push({ lat, lng });
          }
        }

        // 목적지 좌표
        if (arriveJourney && arriveJourney.placeY && arriveJourney.placeX) {
          const lat = parseFloat(arriveJourney.placeY);
          const lng = parseFloat(arriveJourney.placeX);
          if (!isNaN(lat) && !isNaN(lng)) {
            allCoords.push({ lat, lng });
          }
        }
      });
    }

    // 정류장 좌표 추가
    stopCoordinates.forEach(stop => {
      allCoords.push({ lat: stop.lat, lng: stop.lng });
    });

    if (allCoords.length > 0) {
      const lats = allCoords.map(c => c.lat);
      const lngs = allCoords.map(c => c.lng);
      
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);

      // 중심점 계산
      const centerLat = (minLat + maxLat) / 2;
      const centerLng = (minLng + maxLng) / 2;

      // 범위 계산 (여유 공간을 위해 1.2배 확장)
      const latDelta = (maxLat - minLat) * 1.2;
      const lngDelta = (maxLng - minLng) * 1.2;

      // 최소 범위 보장 (너무 작으면 기본값 사용)
      const finalLatDelta = Math.max(latDelta, 0.01);
      const finalLngDelta = Math.max(lngDelta, 0.01);

      return {
        lat: centerLat,
        lng: centerLng,
        latitudeDelta: finalLatDelta,
        longitudeDelta: finalLngDelta,
        zoom: 13, // 기본값 (delta가 우선)
      };
    }
    
    // 기본값 (서울시청)
    return {
      lat: 37.5665,
      lng: 126.9780,
      zoom: 13,
    };
  }, [stopCoordinates, pathSelection]);

  // 추천 장소 가져오기 (출발지, 도착지, 자주 가는 장소 기반)
  useEffect(() => {
    const fetchRecommendedPlaces = async () => {
      // 검색할 기준점들 수집
      const searchPoints: Array<{ lat: number; lng: number; name: string }> = [];

      // 1. 출발지와 도착지의 중간 지점
      if (pathSelection.journeys && pathSelection.journeys.length >= 2) {
        const origin = pathSelection.journeys[0];
        const destination = pathSelection.journeys[pathSelection.journeys.length - 1];
        
        if (origin?.placeX && origin?.placeY && destination?.placeX && destination?.placeY) {
          const originLat = parseFloat(origin.placeY);
          const originLng = parseFloat(origin.placeX);
          const destLat = parseFloat(destination.placeY);
          const destLng = parseFloat(destination.placeX);

          if (!isNaN(originLat) && !isNaN(originLng) && !isNaN(destLat) && !isNaN(destLng)) {
            // 중간 지점
            const midLat = (originLat + destLat) / 2;
            const midLng = (originLng + destLng) / 2;
            searchPoints.push({ lat: midLat, lng: midLng, name: '경로 중간' });
            
            // 도착지 근처
            searchPoints.push({ lat: destLat, lng: destLng, name: '도착지 근처' });
          }
        }
      }

      // 2. 자주 가는 장소들
      if (places?.favoritePlaces && Array.isArray(places.favoritePlaces)) {
        places.favoritePlaces.forEach((place: any) => {
          if (place.x && place.y) {
            const lat = parseFloat(place.y);
            const lng = parseFloat(place.x);
            if (!isNaN(lat) && !isNaN(lng)) {
              searchPoints.push({ lat, lng, name: place.name || '자주 가는 장소' });
            }
          }
        });
      }

      if (searchPoints.length === 0) {
        setRecommendedPlaces([]);
        return;
      }

      setIsLoadingPlaces(true);

      try {
        // 카테고리별로 장소 검색
        const categories = [
          { query: '편의점', category: 'CS2' }, // 편의점
          { query: '카페', category: 'CE7' }, // 카페
          { query: '약국', category: 'PM9' }, // 약국
          { query: '은행', category: 'BK9' }, // 은행/ATM
        ];

        const allPlaces: Array<{
          id: string;
          name: string;
          description: string;
          lat: number;
          lng: number;
          distance: string;
          address: string;
          source: string; // 어디 근처인지
        }> = [];

        // 각 기준점마다 각 카테고리 검색
        for (const searchPoint of searchPoints) {
          for (const category of categories) {
            try {
              const results = await searchPlace({
                query: category.query,
                x: searchPoint.lng.toString(),
                y: searchPoint.lat.toString(),
                radius: 1000, // 1km 반경
                size: 1, // 각 카테고리당 1개씩
                category_group_code: category.category,
              });

              if (results.length > 0) {
                const place = results[0];
                const placeLat = parseFloat(place.y);
                const placeLng = parseFloat(place.x);
                
                // 거리 계산 (하버사인 공식)
                const R = 6371; // 지구 반지름 (km)
                const dLat = (placeLat - searchPoint.lat) * Math.PI / 180;
                const dLng = (placeLng - searchPoint.lng) * Math.PI / 180;
                const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(searchPoint.lat * Math.PI / 180) * Math.cos(placeLat * Math.PI / 180) *
                  Math.sin(dLng / 2) * Math.sin(dLng / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                const distance = R * c * 1000; // 미터 단위
                
                // 중복 체크 (같은 장소가 여러 기준점에서 검색될 수 있음)
                const existingPlace = allPlaces.find(p => p.id === place.id);
                if (!existingPlace) {
                  allPlaces.push({
                    id: place.id,
                    name: place.place_name || category.query,
                    description: place.category_name || category.query,
                    lat: placeLat,
                    lng: placeLng,
                    distance: distance < 1000 ? `약 ${Math.round(distance)}m` : `약 ${(distance / 1000).toFixed(1)}km`,
                    address: place.address_name,
                    source: searchPoint.name,
                  });
                }
              }
            } catch (error) {
              console.error(`[NewJourney] ${category.query} 검색 실패 (${searchPoint.name}):`, error);
            }
          }
        }

        // 거리순으로 정렬 (가까운 순)
        allPlaces.sort((a, b) => {
          const aDist = parseFloat(a.distance.replace(/[^0-9.]/g, ''));
          const bDist = parseFloat(b.distance.replace(/[^0-9.]/g, ''));
          return aDist - bDist;
        });

        // 최대 8개까지만 표시
        setRecommendedPlaces(allPlaces.slice(0, 8));
      } catch (error) {
        console.error('[NewJourney] 추천 장소 가져오기 실패:', error);
        setRecommendedPlaces([]);
      } finally {
        setIsLoadingPlaces(false);
      }
    };

    fetchRecommendedPlaces();
  }, [pathSelection.journeys, places?.favoritePlaces]);

  // 추천 장소 마커 생성
  const recommendedPlaceMarkers = useMemo(() => {
    return recommendedPlaces.map((place) => ({
      title: place.name,
      lat: place.lat,
      lng: place.lng,
      markerType: 'icon' as const,
      zIndex: 1000,
    }));
  }, [recommendedPlaces]);

  // 모든 마커 합치기
  const allMarkers = useMemo(() => {
    console.log('[NewJourney] 마커 개수:', {
      stop: stopMarkers.length,
      journey: journeyMarkers.length,
      place: placeMarkers.length,
      recommended: recommendedPlaceMarkers.length,
      total: stopMarkers.length + journeyMarkers.length + placeMarkers.length + recommendedPlaceMarkers.length,
    });
    return [...stopMarkers, ...journeyMarkers, ...placeMarkers, ...recommendedPlaceMarkers];
  }, [stopMarkers, journeyMarkers, placeMarkers, recommendedPlaceMarkers]);

  // 추천 장소 카드 클릭 핸들러
  const handlePlaceCardPress = useCallback((place: typeof recommendedPlaces[0]) => {
    // 추천 장소를 지도 중심으로 이동하거나 상세 정보 표시
    console.log('[NewJourney] 추천 장소 선택:', place);
    // TODO: 지도 중심 이동 또는 상세 정보 모달 표시
  }, []);

  return (
    <Container>
      <AppHeader />
      <MapContainer>
        <GoogleMapView
          markers={allMarkers}
          polylines={routePolylines}
          centerLat={mapCenter.lat}
          centerLng={mapCenter.lng}
          height={screenHeight - 100} // 헤더 높이 제외한 전체 높이
          zoom={mapCenter.zoom}
          latitudeDelta={mapCenter.latitudeDelta}
          longitudeDelta={mapCenter.longitudeDelta}
        />
      </MapContainer>
      
      {/* 추천 장소 플로팅 카드 */}
      {isFloatingCardVisible && recommendedPlaces.length > 0 && (
        <FloatingCardContainer>
          <FloatingCardHeader>
            <FloatingCardTitle>📍 경로 추천 장소</FloatingCardTitle>
            <CloseButton onPress={() => setIsFloatingCardVisible(false)}>
              <CloseButtonText>✕</CloseButtonText>
            </CloseButton>
          </FloatingCardHeader>
          <RecommendedPlacesScroll showsVerticalScrollIndicator={false}>
            {recommendedPlaces.map((place) => (
              <PlaceCard
                key={place.id}
                onPress={() => handlePlaceCardPress(place)}
                activeOpacity={0.7}
              >
                <PlaceInfo>
                  <PlaceName>{place.name}</PlaceName>
                  <PlaceDescription>{place.description}</PlaceDescription>
                  <PlaceSource>{place.source} 근처</PlaceSource>
                  <PlaceDistance>{place.distance}</PlaceDistance>
                </PlaceInfo>
              </PlaceCard>
            ))}
          </RecommendedPlacesScroll>
        </FloatingCardContainer>
      )}
    </Container>
  );
}

