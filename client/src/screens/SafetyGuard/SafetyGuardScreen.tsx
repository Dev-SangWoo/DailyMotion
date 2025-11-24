/**
 * 세이프티가드 스크린
 *
 * 위험 지역과 안전한 경로를 지도에 표시합니다.
 * - 위험 지역: 빨간색 마커
 * - 안전 경로: 초록색 마커
 *
 * 헌법 준수:
 * - AGENTS.md [제2장]: Styled-components 사용
 * - CLAUDE.md: 카카오맵 API 활용
 */

import React, { useMemo, useEffect, useState, useCallback, useRef } from 'react';
import styled from 'styled-components/native';
import { ScrollView, View, TouchableOpacity, Modal, ActivityIndicator, Text, Dimensions } from 'react-native';
import { AppHeader } from '../../components/common/AppHeader';
import { GoogleMapView } from '../../components/maps/GoogleMapView';
import { theme } from '../../styles/theme';
import { useOnboardingData } from '../Onboarding/stores/useOnboardingStore';
import { useSafetyGuardStore } from '../../stores/useSafetyGuardStore';
import { useGetDisasterAlertsQuery, useGetAllDisasterAlertsQuery, DisasterAlert } from '../../hooks/queries/useGetDisasterAlertsQuery';
import { getDirectionsRoute } from '../../services/directionsService';
import { coordToAddress, addressToCoord } from '../../services/kakaoMapService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const Container = styled.View`
  flex: 1;
  background-color: ${theme.colors.background};
`;

const ScrollContent = styled.ScrollView`
  flex: 1;
`;

const Content = styled.View`
  padding: ${theme.spacing.sm}px ${theme.spacing.md}px;
`;

const MapContainer = styled.View`
  margin-bottom: ${theme.spacing.md}px;
  border-radius: 12px;
  overflow: visible; /* 마커가 잘리지 않도록 visible로 변경 */
  padding: 10px; /* 마커가 잘리지 않도록 패딩 추가 */
`;

const SectionTitle = styled.Text`
  font-size: ${theme.fonts.sizes.lg}px;
  font-weight: ${theme.fonts.weights.bold};
  color: ${theme.colors.text};
  margin-top: ${theme.spacing.lg}px;
  margin-bottom: ${theme.spacing.md}px;
`;

// 재난 문자 카드 스타일
const DisasterCard = styled.TouchableOpacity`
  background-color: #FFFFFF;
  border-radius: ${theme.borderRadius.lg}px;
  padding: ${theme.spacing.md}px;
  margin-bottom: ${theme.spacing.md}px;
  border-width: 1px;
  border-color: #E0E0E0;
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.1;
  shadow-radius: 4px;
  elevation: 2;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const DisasterCardContent = styled.View`
  flex: 1;
  margin-right: ${theme.spacing.md}px;
`;

const DisasterCardLabel = styled.Text`
  font-size: ${theme.fonts.sizes.sm}px;
  font-weight: ${theme.fonts.weights.bold};
  color: ${theme.colors.primary};
  margin-bottom: ${theme.spacing.xs}px;
`;

const DisasterCardTitle = styled.Text`
  font-size: ${theme.fonts.sizes.md}px;
  font-weight: ${theme.fonts.weights.semibold};
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.xs}px;
`;

const DisasterCardPreview = styled.Text`
  font-size: ${theme.fonts.sizes.sm}px;
  color: ${theme.colors.textSecondary};
  line-height: 20px;
`;

const DisasterCardCount = styled.View`
  background-color: ${theme.colors.primary};
  border-radius: ${theme.borderRadius.round}px;
  width: 40px;
  height: 40px;
  justify-content: center;
  align-items: center;
`;

const DisasterCardCountText = styled.Text`
  font-size: ${theme.fonts.sizes.lg}px;
  font-weight: ${theme.fonts.weights.bold};
  color: #FFFFFF;
`;

// 최근 재난문자 작은 카드 스타일
const RecentDisasterCard = styled.TouchableOpacity`
  background-color: #FFFFFF;
  border-radius: ${theme.borderRadius.md}px;
  padding: ${theme.spacing.sm}px;
  margin-right: ${theme.spacing.sm}px;
  border-width: 1px;
  border-color: #E0E0E0;
  shadow-color: #000;
  shadow-offset: 0px 1px;
  shadow-opacity: 0.1;
  shadow-radius: 2px;
  elevation: 1;
  width: 200px;
`;

const RecentDisasterCardIcon = styled.Text`
  font-size: 24px;
  margin-bottom: ${theme.spacing.xs}px;
`;

const RecentDisasterCardType = styled.Text`
  font-size: ${theme.fonts.sizes.sm}px;
  font-weight: ${theme.fonts.weights.semibold};
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.xs}px;
`;

const RecentDisasterCardPreview = styled.Text`
  font-size: ${theme.fonts.sizes.xs}px;
  color: ${theme.colors.textSecondary};
  line-height: 16px;
  numberOfLines: 2;
`;

const RecentDisasterContainer = styled.ScrollView`
  flex-direction: row;
  margin-bottom: ${theme.spacing.lg}px;
`;

// 재난 유형별 큰 카드 스타일
const TypeDisasterCard = styled.TouchableOpacity`
  background-color: #FFFFFF;
  border-radius: ${theme.borderRadius.lg}px;
  padding: ${theme.spacing.lg}px;
  margin-bottom: ${theme.spacing.md}px;
  border-width: 2px;
  border-color: #E0E0E0;
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.15;
  shadow-radius: 4px;
  elevation: 3;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  min-height: 80px;
`;

const TypeDisasterCardContent = styled.View`
  flex: 1;
  margin-right: ${theme.spacing.md}px;
`;

const TypeDisasterCardIcon = styled.Text`
  font-size: 32px;
  margin-bottom: ${theme.spacing.xs}px;
`;

const TypeDisasterCardTitle = styled.Text`
  font-size: ${theme.fonts.sizes.xl}px;
  font-weight: ${theme.fonts.weights.bold};
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.xs}px;
`;

const TypeDisasterCardCount = styled.View`
  background-color: ${theme.colors.primary};
  border-radius: ${theme.borderRadius.round}px;
  min-width: 50px;
  height: 50px;
  justify-content: center;
  align-items: center;
  padding-horizontal: ${theme.spacing.sm}px;
`;

const TypeDisasterCardCountText = styled.Text`
  font-size: ${theme.fonts.sizes.xl}px;
  font-weight: ${theme.fonts.weights.bold};
  color: #FFFFFF;
`;

const InfoBox = styled.View<{ bgColor: string; borderColor: string }>`
  background-color: ${(props) => props.bgColor};
  border-left-width: 4px;
  border-left-color: ${(props) => props.borderColor};
  padding: ${theme.spacing.md}px;
  border-radius: 8px;
  margin-bottom: ${theme.spacing.sm}px;
`;

const InfoText = styled.Text`
  font-size: ${theme.fonts.sizes.sm}px;
  color: ${theme.colors.text};
  font-weight: 500;
`;

// 🆕 재난 문자 관련 스타일
const DisasterAlertBox = styled.View`
  background-color: #FFEBEE;
  border-left-width: 4px;
  border-left-color: #D32F2F;
  border-radius: ${theme.borderRadius.md}px;
  padding: ${theme.spacing.md}px;
  margin-bottom: ${theme.spacing.md}px;
`;

const DisasterAlertTitle = styled.Text`
  font-size: ${theme.fonts.sizes.md}px;
  font-weight: 700;
  color: #D32F2F;
  margin-bottom: ${theme.spacing.xs}px;
`;

const DisasterAlertText = styled.Text`
  font-size: ${theme.fonts.sizes.sm}px;
  color: #C62828;
  line-height: ${theme.fonts.sizes.sm * 1.5}px;
  margin-bottom: ${theme.spacing.xs}px;
`;

const DisasterAlertTime = styled.Text`
  font-size: ${theme.fonts.sizes.xs}px;
  color: #B71C1C;
`;

const RouteTag = styled.View<{ color: string }>`
  background-color: ${(props) => props.color};
  padding: ${theme.spacing.xs}px ${theme.spacing.sm}px;
  border-radius: ${theme.borderRadius.md}px;
  margin-right: ${theme.spacing.xs}px;
  margin-bottom: ${theme.spacing.xs}px;
`;

const RouteTagText = styled.Text`
  color: white;
  font-size: ${theme.fonts.sizes.xs}px;
  font-weight: 600;
`;

const DisasterCountBadge = styled.View`
  background-color: #FF5252;
  border-radius: 12px;
  width: 24px;
  height: 24px;
  justify-content: center;
  align-items: center;
  margin-left: ${theme.spacing.xs}px;
`;

const DisasterCountText = styled.Text`
  color: white;
  font-size: ${theme.fonts.sizes.xs}px;
  font-weight: 700;
`;

// 🆕 로딩 모달 스타일
const LoadingOverlay = styled.View`
  flex: 1;
  background-color: rgba(0, 0, 0, 0.6);
  justify-content: center;
  align-items: center;
`;

const LoadingBox = styled.View`
  background-color: white;
  border-radius: ${theme.borderRadius.lg}px;
  padding: ${theme.spacing.xl}px;
  align-items: center;
  gap: ${theme.spacing.md}px;
  width: 80%;
  max-width: 300px;
`;

const LoadingText = styled.Text`
  font-size: ${theme.fonts.sizes.lg}px;
  font-weight: 700;
  color: ${theme.colors.text};
  text-align: center;
`;

const LoadingSubText = styled.Text`
  font-size: ${theme.fonts.sizes.sm}px;
  color: ${theme.colors.textSecondary};
  text-align: center;
`;

// 🆕 제보 아이템 스타일
const UserReportBox = styled.View`
  background-color: #FFF3E0;
  border-left-width: 4px;
  border-left-color: #FF9800;
  border-radius: ${theme.borderRadius.md}px;
  padding: ${theme.spacing.md}px;
  margin-bottom: ${theme.spacing.md}px;
`;

const UserReportTitle = styled.Text`
  font-size: ${theme.fonts.sizes.md}px;
  font-weight: 700;
  color: #E65100;
  margin-bottom: ${theme.spacing.xs}px;
`;

const UserReportText = styled.Text`
  font-size: ${theme.fonts.sizes.sm}px;
  color: #BF360C;
  line-height: ${theme.fonts.sizes.sm * 1.5}px;
  margin-bottom: ${theme.spacing.xs}px;
`;

const UserReportTime = styled.Text`
  font-size: ${theme.fonts.sizes.xs}px;
  color: #D84315;
`;

const RiskTypeTag = styled.View<{ color: string }>`
  background-color: ${(props) => props.color};
  padding: ${theme.spacing.xs}px ${theme.spacing.sm}px;
  border-radius: ${theme.borderRadius.md}px;
  margin-right: ${theme.spacing.xs}px;
  margin-bottom: ${theme.spacing.xs}px;
`;

const RiskTypeTagText = styled.Text`
  color: white;
  font-size: ${theme.fonts.sizes.xs}px;
  font-weight: 600;
`;

export default function SafetyGuardScreen() {
  const { pathSelection, places } = useOnboardingData();
  const safetyGuardStore = useSafetyGuardStore();
  const { isValidating } = safetyGuardStore;
  const riskReports = safetyGuardStore.riskReports || [];

  const [selectedAlert, setSelectedAlert] = useState<DisasterAlert | null>(null);
  const [isAlertModalVisible, setIsAlertModalVisible] = useState(false);

  // 위험 타입별 색상
  const riskTypeColors: { [key: string]: string } = {
    accident: '#E74C3C',
    construction: '#F39C12',
    obstacle: '#E67E22',
    flooding: '#3498DB',
    crowded: '#9B59B6',
    etc: '#95A5A6',
  };

  // 지도 중심점 및 배율 계산 (모든 등록된 장소 포함)
  const mapCenter = useMemo(() => {
    // 기본값: 서울 중심
    let centerLat = 37.5665;
    let centerLng = 126.9780;
    let latitudeDelta = 0.1; // 기본 배율
    let longitudeDelta = 0.1;

    const allCoords: Array<{ lat: number; lng: number }> = [];
    
    // 1. 여정 출발지/도착지 좌표 수집
    if (pathSelection.journeys && pathSelection.journeys.length > 0) {
      pathSelection.journeys.forEach((journey: any) => {
        if (journey.placeY && journey.placeX) {
          const lat = parseFloat(journey.placeY);
          const lng = parseFloat(journey.placeX);
          if (!isNaN(lat) && !isNaN(lng)) {
            allCoords.push({ lat, lng });
          }
        }
      });
    }

    // 2. 집 주소 좌표 수집
    if (places?.homeAddress) {
      const homeAddress = places.homeAddress;
      if (typeof homeAddress === 'object' && homeAddress.x && homeAddress.y) {
        const lat = parseFloat(homeAddress.y);
        const lng = parseFloat(homeAddress.x);
        if (!isNaN(lat) && !isNaN(lng)) {
          allCoords.push({ lat, lng });
        }
      }
    }

    // 3. 자주 가는 장소 좌표 수집
    if (places?.favoritePlaces && Array.isArray(places.favoritePlaces)) {
      places.favoritePlaces.forEach((place) => {
        if (place.x && place.y) {
          const lat = parseFloat(place.y);
          const lng = parseFloat(place.x);
          if (!isNaN(lat) && !isNaN(lng)) {
            allCoords.push({ lat, lng });
          }
        }
      });
    }

    // 4. 모든 좌표를 포함하는 중심점 및 배율 계산
    if (allCoords.length > 0) {
      // 중심점 계산
      const avgLat = allCoords.reduce((sum, c) => sum + c.lat, 0) / allCoords.length;
      const avgLng = allCoords.reduce((sum, c) => sum + c.lng, 0) / allCoords.length;
      centerLat = avgLat;
      centerLng = avgLng;

      // 최소/최대 좌표 계산
      const minLat = Math.min(...allCoords.map(c => c.lat));
      const maxLat = Math.max(...allCoords.map(c => c.lat));
      const minLng = Math.min(...allCoords.map(c => c.lng));
      const maxLng = Math.max(...allCoords.map(c => c.lng));

      // 배율 계산 (모든 좌표를 포함하도록 여유 공간 추가)
      const latRange = maxLat - minLat;
      const lngRange = maxLng - minLng;
      
      // 여유 공간을 위해 1.5배 확장
      latitudeDelta = Math.max(latRange * 1.5, 0.01); // 최소 0.01
      longitudeDelta = Math.max(lngRange * 1.5, 0.01); // 최소 0.01
      
      // 너무 넓지 않도록 최대값 제한
      latitudeDelta = Math.min(latitudeDelta, 0.5);
      longitudeDelta = Math.min(longitudeDelta, 0.5);
    }

    return { 
      lat: centerLat, 
      lng: centerLng, 
      latitudeDelta, 
      longitudeDelta 
    };
  }, [pathSelection, places]);

  // 재난 문자 조회용 좌표 (출발지/도착지만 사용)
  const allRouteCoords = useMemo(() => {
    const coords: Array<{ lat: number; lng: number }> = [];
    
    if (pathSelection.journeys && pathSelection.journeys.length > 0) {
      pathSelection.journeys.forEach((journey: any) => {
        if (journey.placeY && journey.placeX) {
          const lat = parseFloat(journey.placeY);
          const lng = parseFloat(journey.placeX);
          if (!isNaN(lat) && !isNaN(lng)) {
            coords.push({ lat, lng });
          }
        }
      });
    }
    
    return coords;
  }, [pathSelection]);

  // ODSAY 경로에서 정류장 좌표 추출
  const stopCoordinates = useMemo(() => {
    const stops: Array<{
      name: string;
      lat: number;
      lng: number;
      type: 'bus' | 'subway' | 'walk';
      segmentIndex: number;
      journeyKey: string; // 여정 키 추가
    }> = [];

    console.log('[SafetyGuard] stopCoordinates 생성 시작');
    console.log('[SafetyGuard] pathSelection.selectedPaths:', pathSelection.selectedPaths ? Object.keys(pathSelection.selectedPaths).length + '개 여정' : '없음');

    if (!pathSelection.selectedPaths) {
      console.warn('[SafetyGuard] ⚠️ pathSelection.selectedPaths가 없습니다!');
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
              journeyKey, // 여정 키 추가
            });
          }
        }

        // 경유 정류장/역 (버스/지하철의 경우)
        if (trafficType !== 3 && segment.passStopList) {
          let passStops: any[] = [];
          
          // passStopList가 배열인 경우
          if (Array.isArray(segment.passStopList)) {
            passStops = segment.passStopList;
          }
          // passStopList가 객체이고 stations 키를 가진 경우
          else if (typeof segment.passStopList === 'object' && segment.passStopList.stations) {
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
                journeyKey, // 여정 키 추가
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
              journeyKey, // 여정 키 추가
            });
          }
        }
      });
    });

    return stops;
  }, [pathSelection]);

  // 정류장 좌표를 역지오코딩하여 구 지역 정보 추출
  const [routeRegions, setRouteRegions] = useState<string[]>([]);
  const [isLoadingRegions, setIsLoadingRegions] = useState(false);

  useEffect(() => {
    const extractRegionsFromCoordinates = async () => {
      if (stopCoordinates.length === 0) {
        setRouteRegions([]);
        return;
      }

      setIsLoadingRegions(true);
      const regions = new Set<string>();

      try {
        console.log(`[SafetyGuard] 역지오코딩 시작: ${stopCoordinates.length}개 정류장`);
        
        // 모든 정류장 좌표를 역지오코딩 (도보 제외, 3칸씩 건너뛰기)
        const transitStops = stopCoordinates.filter(stop => stop.type !== 'walk');
        console.log(`[SafetyGuard] 역지오코딩 대상: ${transitStops.length}개 정류장 (도보 제외, 3칸씩 샘플링)`);

        // 3칸씩 건너뛰어서 역지오코딩 (성능 최적화)
        const sampledStops = [];
        for (let i = 0; i < transitStops.length; i += 3) {
          sampledStops.push(transitStops[i]);
        }
        // 마지막 정류장도 포함 (경로의 끝 지역 확인)
        if (transitStops.length > 0 && sampledStops[sampledStops.length - 1] !== transitStops[transitStops.length - 1]) {
          sampledStops.push(transitStops[transitStops.length - 1]);
        }
        
        console.log(`[SafetyGuard] 샘플링된 정류장: ${sampledStops.length}개 (전체 ${transitStops.length}개 중)`);

        // API 호출을 순차적으로 처리 (동시 호출 제한)
        for (let i = 0; i < sampledStops.length; i++) {
          const stop = sampledStops[i];
          try {
            console.log(`[SafetyGuard] 역지오코딩 중 (${i + 1}/${sampledStops.length}): ${stop.name}`);
            
            const addressData = await coordToAddress(
              stop.lng.toString(),
              stop.lat.toString()
            );
            
            // 시/군/구 정보 추출 (region_2depth_name)
            // 실제 API 응답 구조: { address: { region_2depth_name: ... }, road_address: { region_2depth_name: ... } }
            let region2: string | undefined;
            
            // 지번 주소에서 추출 (실제 응답 구조에 맞게 수정)
            if (addressData.address?.region_2depth_name) {
              region2 = addressData.address.region_2depth_name;
            }
            
            // 도로명 주소에서 추출 (지번 주소가 없으면)
            if (!region2 && addressData.road_address?.region_2depth_name) {
              region2 = addressData.road_address.region_2depth_name;
            }
            
            if (region2) {
              regions.add(region2);
              console.log(`[SafetyGuard] 지역 추출 성공: ${stop.name} -> ${region2}`);
            } else {
              console.warn(`[SafetyGuard] 지역 추출 실패: ${stop.name} - region_2depth_name을 찾을 수 없음`);
            }
            
            // API 호출 제한을 위해 약간의 딜레이 추가 (선택사항)
            if (i < sampledStops.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 100)); // 100ms 딜레이
            }
          } catch (error) {
            console.warn(`[SafetyGuard] 역지오코딩 실패 (${stop.name}):`, error);
          }
        }
        
        const sortedRegions = Array.from(regions).sort();
        console.log(`[SafetyGuard] 지역 추출 완료: ${sortedRegions.length}개 구`, sortedRegions);
        setRouteRegions(sortedRegions);
      } catch (error) {
        console.error('[SafetyGuard] 지역 추출 실패:', error);
        setRouteRegions([]);
      } finally {
        setIsLoadingRegions(false);
      }
    };

    extractRegionsFromCoordinates();
  }, [stopCoordinates]);

  // 여정별 색상 매핑 함수
  const getJourneyColor = useCallback((journeyKey: string): string => {
    // 여정 키를 기반으로 색상 생성 (일관된 색상 유지)
    // 더 구분되는 색상 팔레트 사용
    const colors = [
      '#FF6B6B', // 빨강
      '#4ECDC4', // 청록
      '#45B7D1', // 파랑
      '#FFA07A', // 연어색
      '#98D8C8', // 민트
      '#F7DC6F', // 노랑
      '#BB8FCE', // 보라
      '#85C1E2', // 하늘색
      '#FF8C42', // 주황
      '#6C5CE7', // 보라빨강
      '#00D2D3', // 청록
      '#FFD93D', // 노랑
      '#6BCB77', // 초록
      '#FF6B9D', // 핑크
      '#C44569', // 진한 핑크
      '#5F27CD', // 진한 보라
    ];
    
    // journeyKey를 해시하여 색상 선택 (더 나은 해시 함수)
    let hash = 0;
    for (let i = 0; i < journeyKey.length; i++) {
      const char = journeyKey.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit 정수로 변환
    }
    const colorIndex = Math.abs(hash) % colors.length;
    const selectedColor = colors[colorIndex];
    
    // 디버깅: 여정별 색상 확인
    console.log(`[SafetyGuard] 여정 색상: ${journeyKey} -> ${selectedColor} (인덱스: ${colorIndex})`);
    
    return selectedColor;
  }, []);

  // 전체 재난 문자 데이터 조회 (경로 필터링 없음, 최근 1개월치)
  // 항상 데이터를 가져오고, routeRegions가 결정되면 다시 가져옴
  const { data: disasterAlertsData, isLoading: isLoadingAlerts, refetch: refetchDisasterAlerts } = useGetAllDisasterAlertsQuery(
    1000, 
    30,
    true // 항상 활성화
  );

  // routeRegions가 변경되면 재난 문자를 다시 가져옴
  useEffect(() => {
    if (routeRegions.length > 0) {
      console.log('[SafetyGuard] 경로 지역 결정됨, 재난 문자 다시 가져오기:', routeRegions);
      refetchDisasterAlerts();
    }
  }, [routeRegions, refetchDisasterAlerts]);

  // 디버깅: 데이터 확인 (상세 출력)
  useEffect(() => {
    console.log('========================================');
    console.log('[SafetyGuard] 재난 문자 데이터 상태:', {
      hasData: !!disasterAlertsData,
      dataLength: disasterAlertsData?.length || 0,
      isLoading: isLoadingAlerts,
      routeRegionsCount: routeRegions.length,
      routeRegions: routeRegions,
    });
    
    if (disasterAlertsData && disasterAlertsData.length > 0) {
      console.log('[SafetyGuard] 전체 재난 문자 데이터 (처음 10개):');
      disasterAlertsData.slice(0, 10).forEach((alert, idx) => {
        console.log(`  [${idx + 1}] ID: ${alert.id}, Type: ${alert.type}, Region: ${alert.region}, Date: ${alert.date}`);
      });
      
      console.log('[SafetyGuard] 재난 문자 지역 목록:');
      const uniqueRegions = [...new Set(recentDisasterAlertsData.map(a => a.region).filter(Boolean))];
      console.log('  지역들:', uniqueRegions);
    } else {
      console.log('[SafetyGuard] ⚠️ 재난 문자 데이터가 없습니다!');
    }
    console.log('========================================');
  }, [disasterAlertsData, isLoadingAlerts, routeRegions]);

  // 최근 3일치 재난 문자만 필터링
  const recentDisasterAlertsData = useMemo(() => {
    if (!disasterAlertsData || disasterAlertsData.length === 0) {
      return [];
    }

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    threeDaysAgo.setHours(0, 0, 0, 0);

    const filtered = disasterAlertsData.filter((alert: DisasterAlert) => {
      const alertDate = new Date(alert.date);
      return alertDate >= threeDaysAgo;
    });

    console.log(`[SafetyGuard] 최근 3일치 재난 문자: ${filtered.length}개 (전체: ${disasterAlertsData.length}개)`);
    return filtered;
  }, [disasterAlertsData]);

  // 재난 유형별 마커 색상
  const getDisasterMarkerColor = useCallback((type: string): 'red' | 'blue' | 'yellow' | 'green' => {
    if (type.includes('호우') || type.includes('태풍') || type.includes('강풍') || type.includes('대설')) {
      return 'blue';
    }
    if (type.includes('사고') || type.includes('화재') || type.includes('지진')) {
      return 'red';
    }
    if (type.includes('폭염') || type.includes('한파')) {
      return 'yellow';
    }
    return 'red'; // 기본값
  }, []);

  // 지역명 매칭 헬퍼 함수 (단어 경계 고려)
  const isRegionMatch = useCallback((alertRegion: string, routeRegion: string): boolean => {
    const alertTrimmed = alertRegion.trim();
    const routeTrimmed = routeRegion.trim();
    
    // 1. 정확히 일치
    if (alertTrimmed === routeTrimmed) {
      return true;
    }
    
    // 2. 공백을 기준으로 마지막 부분만 추출하여 비교
    // 예: "경기도 양주시" -> "양주시", "남양주시" -> "남양주시"
    const alertParts = alertTrimmed.split(/\s+/);
    const routeParts = routeTrimmed.split(/\s+/);
    const alertLastPart = alertParts[alertParts.length - 1];
    const routeLastPart = routeParts[routeParts.length - 1];
    
    // 마지막 부분이 정확히 일치
    if (alertLastPart === routeLastPart) {
      return true;
    }
    
    // 3. "시", "구", "군" 등을 제거하고 비교
    const alertNormalized = alertLastPart.replace(/시$|구$|군$/, '').trim();
    const routeNormalized = routeLastPart.replace(/시$|구$|군$/, '').trim();
    
    if (alertNormalized === routeNormalized) {
      return true;
    }
    
    // 4. 단어 경계를 고려한 포함 관계 확인
    // "남양주"와 "양주"는 다른 단어이므로 매칭되지 않음
    // 하지만 "경기도 양주시"의 마지막 부분 "양주시"는 "양주시"와 매칭됨
    // 정규식을 사용하여 단어 경계를 고려
    const alertPattern = new RegExp(`^${routeNormalized}(시|구|군)?$`);
    const routePattern = new RegExp(`^${alertNormalized}(시|구|군)?$`);
    
    if (alertPattern.test(alertLastPart) || routePattern.test(routeLastPart)) {
      return true;
    }
    
    return false;
  }, []);

  // 재난 문자를 지역별로 그룹화
  const disasterAlertsByRegion = useMemo(() => {
    if (!recentDisasterAlertsData || recentDisasterAlertsData.length === 0) {
      console.log('[SafetyGuard] 재난 문자 데이터 없음 (disasterAlertsByRegion)');
      return {};
    }

    // 경로 지역이 없으면 전체 재난 문자를 지역별로 그룹화
    if (routeRegions.length === 0) {
      console.log('[SafetyGuard] 경로 지역이 없음, 전체 재난 문자를 지역별로 그룹화');
      const groups: { [region: string]: DisasterAlert[] } = {};
      recentDisasterAlertsData.forEach((alert: DisasterAlert) => {
        if (alert.region) {
          const region = alert.region.trim();
          if (!groups[region]) {
            groups[region] = [];
          }
          groups[region].push(alert);
        }
      });
      console.log(`[SafetyGuard] 지역별 그룹화 결과: ${Object.keys(groups).length}개 지역`);
      return groups;
    }

    // 경로 지역과 겹치는 재난 문자만 필터링
    const filteredAlerts = recentDisasterAlertsData.filter((alert: DisasterAlert) => {
      if (!alert.region) {
        return false;
      }
      
      // 재난 문자의 지역명이 경로 지역에 포함되는지 확인
      const alertRegion = alert.region.trim();
      return routeRegions.some(routeRegion => {
        return isRegionMatch(alertRegion, routeRegion);
      });
    });

    console.log(`[SafetyGuard] 경로 지역과 겹치는 재난 문자: ${filteredAlerts.length}개 (전체: ${recentDisasterAlertsData.length}개)`);

    // 지역별로 그룹화
    const groups: { [region: string]: DisasterAlert[] } = {};
    
    filteredAlerts.forEach((alert: DisasterAlert) => {
      // 재난 문자의 지역명을 경로 지역과 매칭
      const alertRegion = alert.region.trim();
      const matchedRegion = routeRegions.find(routeRegion => {
        return isRegionMatch(alertRegion, routeRegion);
      });
      
      if (matchedRegion) {
        if (!groups[matchedRegion]) {
          groups[matchedRegion] = [];
        }
        groups[matchedRegion].push(alert);
      }
    });

    console.log(`[SafetyGuard] 지역별 그룹화 결과: ${Object.keys(groups).length}개 지역`);
    return groups;
  }, [recentDisasterAlertsData, routeRegions, isRegionMatch]);

  // 지역별 중심 좌표 저장
  const [regionCoordinates, setRegionCoordinates] = useState<{ [region: string]: { lat: number; lng: number } }>({});
  const [isLoadingRegionCoordinates, setIsLoadingRegionCoordinates] = useState(false);
  const regionCoordinatesRef = useRef<{ [region: string]: { lat: number; lng: number } }>({});

  // regionCoordinates가 변경될 때마다 ref 업데이트
  useEffect(() => {
    regionCoordinatesRef.current = regionCoordinates;
  }, [regionCoordinates]);

  // 지역별 중심 좌표 구하기 (기존 좌표 유지, 새로운 지역만 추가)
  useEffect(() => {
    const fetchRegionCoordinates = async () => {
      if (Object.keys(disasterAlertsByRegion).length === 0) {
        // 재난 문자 데이터가 없어도 기존 좌표는 유지
        setIsLoadingRegionCoordinates(false);
        return;
      }

      const regions = Object.keys(disasterAlertsByRegion);
      
      // 현재 좌표를 ref에서 가져오기 (최신 값 보장)
      const currentCoords = regionCoordinatesRef.current;
      
      // 이미 좌표가 있는 지역은 제외하고, 새로운 지역만 찾기
      const newRegions = regions.filter(region => !currentCoords[region]);
      
      if (newRegions.length === 0) {
        // 모든 지역의 좌표가 이미 있으면 로딩 완료
        console.log('[SafetyGuard] 모든 지역 좌표가 이미 준비되어 있음');
        setIsLoadingRegionCoordinates(false);
        return;
      }

      console.log(`[SafetyGuard] 지역 좌표 검색 시작: ${newRegions.length}개 새 지역 (전체 ${regions.length}개 중)`);
      setIsLoadingRegionCoordinates(true);
      
      // 기존 좌표는 유지하고, 새로운 좌표만 추가
      const coords: { [region: string]: { lat: number; lng: number } } = { ...currentCoords };

      for (const region of newRegions) {
        try {
          // 지역명으로 좌표 검색
          let searchQuery = region;
          
          // 이미 시/도 정보가 포함되어 있는지 확인
          const hasProvince = /(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)/.test(region);
          
          // 시/도 정보가 없을 때만 휴리스틱 적용
          if (!hasProvince) {
            // "구"로 끝나면 "서울" 추가, "시"로 끝나면 "경기도" 추가
            if (region.endsWith('구')) {
              searchQuery = `서울 ${region}`;
            } else if (region.endsWith('시') || region.endsWith('군')) {
              searchQuery = `경기도 ${region}`;
            }
          }

          console.log(`[SafetyGuard] 지역 좌표 검색: ${region} -> ${searchQuery}`);
          
          const coord = await addressToCoord(searchQuery);
          coords[region] = {
            lat: parseFloat(coord.y),
            lng: parseFloat(coord.x),
          };
          
          console.log(`[SafetyGuard] 지역 좌표 성공: ${region} -> (${coord.y}, ${coord.x})`);
          
          // API 호출 제한을 위해 약간의 딜레이
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.warn(`[SafetyGuard] 지역 좌표 검색 실패 (${region}):`, error);
          // 실패 시 기본 좌표 사용 (서울시청)
          coords[region] = { lat: 37.5665, lng: 126.9780 };
        }
      }

      console.log(`[SafetyGuard] 지역 좌표 검색 완료: ${Object.keys(coords).length}개 지역 (기존 ${Object.keys(currentCoords).length}개 + 새로 추가 ${newRegions.length}개)`);
      setRegionCoordinates(coords);
      setIsLoadingRegionCoordinates(false);
    };

    fetchRegionCoordinates();
  }, [disasterAlertsByRegion]);

  // 지역별 재난문자 마커 생성 (좌표가 모두 준비된 후에만 생성)
  const regionDisasterMarkers = useMemo(() => {
    console.log('[SafetyGuard] regionDisasterMarkers 생성 시작:', {
      disasterAlertsByRegionCount: Object.keys(disasterAlertsByRegion).length,
      regionCoordinatesCount: Object.keys(regionCoordinates).length,
      isLoadingRegionCoordinates,
      disasterAlertsByRegion: Object.keys(disasterAlertsByRegion),
      regionCoordinates: Object.keys(regionCoordinates),
    });

    // 재난 문자 데이터가 없으면 빈 배열 반환
    if (Object.keys(disasterAlertsByRegion).length === 0) {
      console.log('[SafetyGuard] 재난 문자 데이터 없음, 마커 생성 안 함');
      return [];
    }

    // 좌표가 아직 로딩 중이어도 기존 마커는 유지 (새로운 지역만 추가 중일 수 있음)
    // 단, 아직 좌표가 하나도 없고 로딩 중이면 대기
    if (isLoadingRegionCoordinates && Object.keys(regionCoordinates).length === 0) {
      console.log('[SafetyGuard] 지역 좌표 초기 로딩 중, 마커 생성 대기');
      return [];
    }

    // 좌표가 준비된 지역만 마커 생성 (기존 마커 유지)
    const regions = Object.keys(disasterAlertsByRegion);
    const readyRegions = regions.filter(region => regionCoordinates[region]);
    const missingRegions = regions.filter(region => !regionCoordinates[region]);
    
    if (missingRegions.length > 0) {
      console.log(`[SafetyGuard] 일부 지역 좌표가 아직 준비되지 않음: ${missingRegions.length}개`, missingRegions);
      console.log(`[SafetyGuard] 좌표가 준비된 지역: ${readyRegions.length}개`, readyRegions);
    }

    // 좌표가 준비된 지역만 마커 생성 (기존 마커는 유지하고, 새로운 지역은 좌표가 준비되면 추가)
    if (readyRegions.length === 0) {
      console.log('[SafetyGuard] 좌표가 준비된 지역이 없음, 마커 생성 안 함');
      return [];
    }

    console.log(`[SafetyGuard] 마커 생성 시작: ${readyRegions.length}개 지역 (전체 ${regions.length}개 중)`);

    const markers = readyRegions
      .map((region) => {
        const alerts = disasterAlertsByRegion[region];
        // 지역명에서 "구", "시", "군" 제거하여 간단하게 표시
        const shortRegion = region.replace(/구$|시$|군$/, '');
        
        // 좌표는 이미 확인했으므로 반드시 존재함
        const coord = regionCoordinates[region];
        
        console.log(`[SafetyGuard] 지역 마커 생성: ${region}`, {
          coord,
          alertsCount: Array.isArray(alerts) ? alerts.length : 0,
        });

        return {
          title: `${region} ${Array.isArray(alerts) ? alerts.length : 0}개`,
          lat: coord.lat,
          lng: coord.lng,
          icon: `🚨 ${shortRegion} ${Array.isArray(alerts) ? alerts.length : 0}`, // 이모지와 짧은 지역명과 개수 표시
          anchor: { x: 0.5, y: 0.5 },
          markerType: 'region' as const, // 지역 마커 타입 지정
          regionData: { region, alerts }, // 원본 데이터 저장
          zIndex: 2000, // 가장 높은 zIndex
        };
      })
      .filter(Boolean); // null 제거
    
    console.log(`[SafetyGuard] 지역별 재난문자 마커 최종: ${markers.length}개`, markers.map(m => ({
      title: m.title,
      lat: m.lat,
      lng: m.lng,
      icon: m.icon,
    })));
    return markers;
  }, [disasterAlertsByRegion, regionCoordinates, isLoadingRegionCoordinates]);

  // 기존 재난 문자 마커 (개별 재난문자, 정확한 좌표가 있는 경우)
  // 주의: 지역별 마커(regionDisasterMarkers)가 이미 표시되므로, 개별 마커는 숨김 처리
  // 지역별 마커만 표시하여 사용자가 지역별로 재난 정보를 한눈에 볼 수 있도록 함
  const disasterMarkers = useMemo(() => {
    // 지역별 마커만 표시하도록 개별 마커는 빈 배열 반환
    return [];
  }, []);

  // 정류장 좌표를 지도 마커로 변환 (여정별 색상, 커스텀 앵커)
  // 각 여정별로 하나씩만 표시
  const stopMarkers = useMemo(() => {
    console.log(`[SafetyGuard] stopCoordinates 개수: ${stopCoordinates.length}`);
    
    if (stopCoordinates.length === 0) {
      console.warn('[SafetyGuard] ⚠️ stopCoordinates가 비어있습니다!');
      return [];
    }
    
    // 도보 제외하고 여정별로 그룹화
    const stopsByJourney = new Map<string, Array<{
      name: string;
      lat: number;
      lng: number;
      type: 'bus' | 'subway' | 'walk';
      segmentIndex: number;
      journeyKey: string;
    }>>();

    const nonWalkStops = stopCoordinates.filter((stop) => stop.type !== 'walk'); // 도보는 제외
    console.log(`[SafetyGuard] 도보 제외 정류장: ${nonWalkStops.length}개`);
    
    nonWalkStops.forEach((stop) => {
      if (!stopsByJourney.has(stop.journeyKey)) {
        stopsByJourney.set(stop.journeyKey, []);
      }
      stopsByJourney.get(stop.journeyKey)!.push(stop);
    });

    console.log(`[SafetyGuard] 여정별 그룹화: ${stopsByJourney.size}개 여정`);

    // 모든 정류장을 마커로 표시 (각 여정별로 모든 정류장)
    const allStops: Array<{
      name: string;
      lat: number;
      lng: number;
      type: 'bus' | 'subway' | 'walk';
      segmentIndex: number;
      journeyKey: string;
    }> = [];

    stopsByJourney.forEach((stops, journeyKey) => {
      // 각 여정의 모든 정류장 추가
      allStops.push(...stops);
      console.log(`[SafetyGuard] 여정 ${journeyKey}: ${stops.length}개 정류장 추가`);
    });

    console.log(`[SafetyGuard] 전체 정류장: ${allStops.length}개`);

    const markers = allStops.map((stop) => {
      const color = getJourneyColor(stop.journeyKey);
      // 디버깅: 여정별 색상 확인
      console.log(`[SafetyGuard] 정류장 마커: ${stop.name}, 여정: ${stop.journeyKey}, 색상: ${color}, 좌표: (${stop.lat}, ${stop.lng})`);
      return {
        title: stop.name,
        lat: stop.lat,
        lng: stop.lng,
        color, // 여정별 색상 사용
        anchor: { x: 0.2, y: 0.3 }, // 정류장 마커는 조금 더 아래로 (커스텀 위치)
        markerType: 'stop' as const, // 정류장 마커 타입 지정
        zIndex: 100, // 기본 zIndex
        stop, // 원본 데이터 저장
      };
    });
    
    // 여정별 색상 그룹화 확인
    const journeyColorMap = new Map<string, string>();
    markers.forEach(marker => {
      if (marker.stop?.journeyKey) {
        journeyColorMap.set(marker.stop.journeyKey, marker.color);
      }
    });
    console.log('[SafetyGuard] 여정별 색상 매핑:', Array.from(journeyColorMap.entries()));
    console.log(`[SafetyGuard] 정류장 마커 최종: ${markers.length}개 (모든 정류장)`);
    
    return markers;
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

    console.log(`[SafetyGuard] 여정 마커 (출발지/목적지): ${markers.length}개`);
    return markers;
  }, [pathSelection]);

  // 등록한 장소(집, 자주 가는 장소)를 지도 마커로 변환
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

    // 집 주소 마커 (places에서 가져오기 - 여정에 포함되지 않은 경우)
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
      places.favoritePlaces.forEach((place) => {
        if (place.x && place.y) {
          const lat = parseFloat(place.y);
          const lng = parseFloat(place.x);
          if (!isNaN(lat) && !isNaN(lng)) {
            markers.push({
              title: place.name,
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

    console.log(`[SafetyGuard] 등록한 장소 마커: ${markers.length}개`);
    return markers;
  }, [places, journeyMarkers]);

  // 위험제보 마커 생성 (검증 완료된 제보만)
  const riskReportMarkers = useMemo(() => {
    const verifiedReports = riskReports.filter(report => report.status === 'verified');
    
    const markers = verifiedReports.map((report) => {
      // 위험 유형에 따른 아이콘 선택
      let icon = '⚠️';
      let color = riskTypeColors.etc; // 기본 색상
      
      if (report.riskTypes.includes('flooding') || report.riskTypes.includes('침수')) {
        icon = '🌊';
        color = riskTypeColors.flooding || '#3498DB';
      } else if (report.riskTypes.includes('traffic_accident') || report.riskTypes.includes('교통사고')) {
        icon = '🚗';
        color = riskTypeColors.accident || '#E74C3C';
      } else if (report.riskTypes.includes('construction') || report.riskTypes.includes('공사')) {
        icon = '🚧';
        color = riskTypeColors.construction || '#F39C12';
      } else if (report.riskTypes.includes('obstacle') || report.riskTypes.includes('장애물')) {
        icon = '🚫';
        color = riskTypeColors.obstacle || '#E67E22';
      }
      
      return {
        title: `위험제보: ${report.riskTypes.join(', ')}`,
        lat: report.location.lat,
        lng: report.location.lng,
        icon,
        color, // 위험 유형별 색상 추가
        markerType: 'icon' as const,
        isRiskReport: true, // 위험제보 마커 구분용
        zIndex: 2500, // 재난 마커보다 위에 표시 (더 높은 우선순위)
      };
    });
    
    console.log(`[SafetyGuard] 위험제보 마커: ${markers.length}개 (검증 완료)`);
    return markers;
  }, [riskReports, riskTypeColors]);

  // 모든 마커 합치기 (지역별 재난문자 + 개별 재난문자 + 정류장 + 여정 마커 + 등록한 장소 + 위험제보)
  const allMarkers = useMemo(() => {
    console.log('[SafetyGuard] 마커 개수:', {
      regionDisaster: regionDisasterMarkers.length,
      disaster: disasterMarkers.length,
      stop: stopMarkers.length,
      journey: journeyMarkers.length,
      place: placeMarkers.length,
      riskReport: riskReportMarkers.length,
      total: regionDisasterMarkers.length + disasterMarkers.length + stopMarkers.length + journeyMarkers.length + placeMarkers.length + riskReportMarkers.length,
    });
    return [...regionDisasterMarkers, ...disasterMarkers, ...stopMarkers, ...journeyMarkers, ...placeMarkers, ...riskReportMarkers];
  }, [regionDisasterMarkers, disasterMarkers, stopMarkers, journeyMarkers, placeMarkers, riskReportMarkers]);

  // 정류장들을 경로별로 연결하는 polyline 생성
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

    // 여정 키를 정렬하여 일관된 색상 할당
    const journeyKeys = Object.keys(pathSelection.selectedPaths).sort();
    console.log('[SafetyGuard] 여정 목록:', journeyKeys);

    // 각 여정별로 처리
    journeyKeys.forEach((journeyKey, journeyIndex) => {
      const path = pathSelection.selectedPaths![journeyKey];
      if (!path || !path.subPath || !Array.isArray(path.subPath)) {
        return;
      }

      // 여정 이름 가져오기
      const [departId, arriveId] = journeyKey.split('|');
      const departJourney = pathSelection.journeys?.find((j: any) => j.id === departId);
      const arriveJourney = pathSelection.journeys?.find((j: any) => j.id === arriveId);
      const journeyName = departJourney && arriveJourney 
        ? `${departJourney.placeName} → ${arriveJourney.placeName}`
        : journeyKey;

      // 출발지와 도착지 좌표 가져오기
      const originCoord = departJourney && departJourney.placeY && departJourney.placeX
        ? { lat: parseFloat(departJourney.placeY), lng: parseFloat(departJourney.placeX) }
        : null;
      const destinationCoord = arriveJourney && arriveJourney.placeY && arriveJourney.placeX
        ? { lat: parseFloat(arriveJourney.placeY), lng: parseFloat(arriveJourney.placeX) }
        : null;

      // 첫 번째 세그먼트의 시작 정류장 좌표
      let firstStopCoord: { lat: number; lng: number } | null = null;
      // 마지막 세그먼트의 종료 정류장 좌표
      let lastStopCoord: { lat: number; lng: number } | null = null;

      // 여정별 색상 가져오기 (인덱스 기반으로 더 명확하게 구분)
      const journeyColor = getJourneyColor(journeyKey);
      console.log(`[SafetyGuard] Polyline - 여정 ${journeyIndex + 1}: ${journeyKey} -> 색상: ${journeyColor}`);

      // 세그먼트별로 정류장 그룹화
      path.subPath.forEach((segment: any, segIdx: number) => {
        const trafficType = segment.trafficType;
        const segmentStops: Array<{ lat: number; lng: number }> = [];

        // 이전 세그먼트의 종료 좌표 (세그먼트 간 도보 연결용)
        let prevSegmentEndCoord: { lat: number; lng: number } | null = null;
        if (segIdx > 0) {
          const prevSegment = path.subPath[segIdx - 1];
          if (prevSegment.endX && prevSegment.endY) {
            const lat = parseFloat(prevSegment.endY);
            const lng = parseFloat(prevSegment.endX);
            if (!isNaN(lat) && !isNaN(lng)) {
              prevSegmentEndCoord = { lat, lng };
            }
          }
        }

        // 시작 정류장/역
        let segmentStartCoord: { lat: number; lng: number } | null = null;
        if (segment.startX && segment.startY) {
          const lat = parseFloat(segment.startY);
          const lng = parseFloat(segment.startX);
          if (!isNaN(lat) && !isNaN(lng)) {
            segmentStops.push({ lat, lng });
            segmentStartCoord = { lat, lng };
            
            // 첫 번째 세그먼트의 시작 정류장 저장
            if (segIdx === 0) {
              firstStopCoord = { lat, lng };
            }
          }
        }

        // 경유 정류장/역 (버스/지하철의 경우)
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
              segmentStops.push({ lat, lng });
            }
          });
        }

        // 종료 정류장/역
        if (segment.endX && segment.endY) {
          const lat = parseFloat(segment.endY);
          const lng = parseFloat(segment.endX);
          if (!isNaN(lat) && !isNaN(lng)) {
            // 중복 제거
            const lastStop = segmentStops[segmentStops.length - 1];
            if (!lastStop || lastStop.lat !== lat || lastStop.lng !== lng) {
              segmentStops.push({ lat, lng });
            }
            
            // 마지막 세그먼트의 종료 정류장 저장
            if (segIdx === path.subPath.length - 1) {
              lastStopCoord = { lat, lng };
            }
          }
        }

        // 정류장이 2개 이상이면 polyline 생성
        if (segmentStops.length >= 2) {
          // 여정별 색상 사용 (도보는 약간 투명하게)
          let color = journeyColor;
          let strokeWeight = 5;
          let lineDashPattern: number[] | undefined = undefined;

          if (trafficType === 3) {
            // 도보: 점선 패턴 사용
            strokeWeight = 3;
            lineDashPattern = [10, 5]; // 10px 선, 5px 간격
            // 도보는 약간 투명하게 (alpha 값 추가)
            color = journeyColor + '80'; // 50% 투명도
          }

          polylines.push({
            name: `${journeyName} - 세그먼트 ${segIdx + 1} (${trafficType === 1 ? '지하철' : trafficType === 2 ? '버스' : '도보'})`,
            coords: segmentStops,
            color,
            strokeWeight,
            lineDashPattern,
          });
        }
      });

      // 출발지 → 첫 정류장 도보 경로 (점선, 여정별 색상)
      if (originCoord && firstStopCoord) {
        polylines.push({
          name: `${journeyName} - 출발지 도보`,
          coords: [originCoord, firstStopCoord],
          color: journeyColor + '80', // 여정별 색상, 50% 투명도
          strokeWeight: 3,
          lineDashPattern: [10, 5], // 점선
        });
      }

      // 마지막 정류장 → 도착지 도보 경로 (점선, 여정별 색상)
      if (lastStopCoord && destinationCoord) {
        polylines.push({
          name: `${journeyName} - 도착지 도보`,
          coords: [lastStopCoord, destinationCoord],
          color: journeyColor + '80', // 여정별 색상, 50% 투명도
          strokeWeight: 3,
          lineDashPattern: [10, 5], // 점선
        });
      }
    });

    return polylines;
  }, [pathSelection, getJourneyColor]);

  // 마커 클릭 핸들러
  const handleMarkerPress = (marker: any) => {
    // 지역별 재난문자 마커인 경우
    if (marker.regionData) {
      // 해당 지역의 재난문자 목록을 보여주기 위해 지역명을 selectedType으로 설정
      setSelectedType(marker.regionData.region);
      setIsTypeModalVisible(true);
      return;
    }
    
    // 개별 재난 문자 마커인 경우
    if (marker.alert) {
      setSelectedAlert(marker.alert);
      setIsAlertModalVisible(true);
    }
  };


  // 재난 문자 데이터 (UI 표시용) - 경로 지역과 겹치는 것만 필터링
  const filteredDisasterAlerts = useMemo(() => {
    if (!disasterAlertsData || disasterAlertsData.length === 0) {
      console.log('[SafetyGuard] 재난 문자 데이터가 없습니다.');
    return [];
    }

    // routeRegions가 없으면 전체 데이터 반환 (임시로 모든 데이터 표시)
    if (routeRegions.length === 0) {
      console.log('[SafetyGuard] 경로 지역이 아직 결정되지 않음, 전체 재난 문자 표시:', recentDisasterAlertsData.length);
      return recentDisasterAlertsData;
    }

    // 경로 지역과 겹치는 재난 문자만 필터링
    const filtered = recentDisasterAlertsData.filter((alert: DisasterAlert) => {
      if (!alert.region) {
        return false;
      }
      
      // 재난 문자의 지역명이 경로 지역에 포함되는지 확인
      const alertRegion = alert.region.trim();
      
      // routeRegions에 포함되는지 확인 (단어 경계 고려)
      const matches = routeRegions.some(routeRegion => {
        return isRegionMatch(alertRegion, routeRegion);
      });
      
      if (matches) {
        console.log(`[SafetyGuard] 재난 문자 매칭: "${alertRegion}" <-> 경로 지역: ${routeRegions.join(', ')}`);
      }
      
      return matches;
    });

    console.log('========================================');
    console.log(`[SafetyGuard] 재난 문자 필터링 결과:`);
    console.log(`  전체 데이터: ${recentDisasterAlertsData.length}개`);
    console.log(`  경로 지역: ${routeRegions.join(', ')}`);
    console.log(`  필터링된 데이터: ${filtered.length}개`);
    
    if (filtered.length > 0) {
      console.log('[SafetyGuard] 필터링된 재난 문자 상세:');
      filtered.slice(0, 5).forEach((alert, idx) => {
        console.log(`  [${idx + 1}] ID: ${alert.id}, Type: ${alert.type}, Region: ${alert.region}, Date: ${alert.date}`);
      });
    } else {
      console.log('[SafetyGuard] ⚠️ 필터링된 재난 문자가 없습니다!');
      console.log('[SafetyGuard] 디버깅: 매칭 실패한 재난 문자 샘플 (처음 5개):');
      disasterAlertsData.slice(0, 5).forEach((alert, idx) => {
        const alertRegion = alert.region || '(없음)';
        const matches = routeRegions.some(routeRegion => {
          return isRegionMatch(alertRegion, routeRegion);
        });
        console.log(`  [${idx + 1}] Region: "${alertRegion}" -> 매칭: ${matches ? '✅' : '❌'}`);
      });
    }
    console.log('========================================');

    return filtered;
  }, [recentDisasterAlertsData, routeRegions, isRegionMatch]);

  // 최근 3개 재난 문자 (날짜순 정렬)
  const recentDisasterAlerts = useMemo(() => {
    return [...filteredDisasterAlerts]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3);
  }, [filteredDisasterAlerts]);

  // 경로 구간별 재난 문자 필터링 (출발지, 경유지, 도착지)
  const disasterAlertsByRouteSegment = useMemo(() => {
    console.log('[SafetyGuard] disasterAlertsByRouteSegment 생성 시작:', {
      hasDisasterAlertsData: !!disasterAlertsData,
      disasterAlertsDataLength: disasterAlertsData?.length || 0,
      hasRecentDisasterAlertsData: !!recentDisasterAlertsData,
      recentDisasterAlertsDataLength: recentDisasterAlertsData?.length || 0,
      hasPathSelection: !!pathSelection,
      hasJourneys: !!pathSelection.journeys,
      journeysLength: pathSelection.journeys?.length || 0,
    });

    if (!recentDisasterAlertsData || recentDisasterAlertsData.length === 0 || !pathSelection.journeys || pathSelection.journeys.length === 0) {
      console.log('[SafetyGuard] 경로 구간별 재난 정보 없음 - 데이터 부족');
      return null; // null 반환하여 카드 자체를 숨김
    }

    // 첫 번째 여정의 출발지와 도착지 정보 가져오기
    const firstJourney = pathSelection.journeys[0];
    const originName = firstJourney?.placeName || '';
    const originAddress = firstJourney?.placeAddress || '';
    
    // 마지막 여정의 도착지 정보 가져오기
    const lastJourney = pathSelection.journeys[pathSelection.journeys.length - 1];
    const destinationName = lastJourney?.placeName || '';
    const destinationAddress = lastJourney?.placeAddress || '';

    // 주소에서 지역명 추출
    const extractRegionFromAddress = (address: string): string[] => {
      if (!address) return [];
      const regions: string[] = [];
      
      // 시/도 추출
      const provinceMatch = address.match(/(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)/);
      if (provinceMatch) {
        const province = provinceMatch[1];
        // 시/구/군 추출
        const cityMatch = address.match(new RegExp(`${province}[^시구군]*([시구군])`));
        if (cityMatch) {
          const cityName = address.substring(0, address.indexOf(cityMatch[1]) + 1);
          regions.push(cityName);
        }
        // 구 추출 (서울특별시 강남구 같은 경우)
        const guMatch = address.match(/([가-힣]+구)/);
        if (guMatch) {
          regions.push(guMatch[1]);
        }
      }
      
      return regions;
    };

    const originRegions = extractRegionFromAddress(originAddress || originName);
    const destinationRegions = extractRegionFromAddress(destinationAddress || destinationName);

    // 경유지 지역명 추출 (selectedPaths의 subPath에서)
    const waypointRegions: string[] = [];
    if (pathSelection.selectedPaths) {
      Object.values(pathSelection.selectedPaths).forEach((path: any) => {
        if (path?.subPath && Array.isArray(path.subPath)) {
          path.subPath.forEach((segment: any) => {
            if (segment.startName) {
              const regions = extractRegionFromAddress(segment.startName);
              waypointRegions.push(...regions);
            }
            if (segment.endName) {
              const regions = extractRegionFromAddress(segment.endName);
              waypointRegions.push(...regions);
            }
          });
        }
      });
    }

    // 재난 문자를 구간별로 필터링
    const originAlerts: DisasterAlert[] = [];
    const waypointAlerts: DisasterAlert[] = [];
    const destinationAlerts: DisasterAlert[] = [];

    console.log('[SafetyGuard] 지역 정보:', {
      originRegions,
      destinationRegions,
      waypointRegions,
      originName,
      destinationName,
    });

    recentDisasterAlertsData.forEach((alert: DisasterAlert) => {
      const alertRegion = alert.region || '';
      
      // 출발지 매칭
      if (originRegions.some(region => alertRegion.includes(region) || region.includes(alertRegion))) {
        originAlerts.push(alert);
        console.log(`[SafetyGuard] 출발지 매칭: ${alertRegion} -> ${originName}`);
        return;
      }
      
      // 경유지 매칭
      if (waypointRegions.some(region => alertRegion.includes(region) || region.includes(alertRegion))) {
        waypointAlerts.push(alert);
        console.log(`[SafetyGuard] 경유지 매칭: ${alertRegion}`);
        return;
      }
      
      // 도착지 매칭
      if (destinationRegions.some(region => alertRegion.includes(region) || region.includes(alertRegion))) {
        destinationAlerts.push(alert);
        console.log(`[SafetyGuard] 도착지 매칭: ${alertRegion} -> ${destinationName}`);
        return;
      }
    });

    const result = {
      origin: originAlerts
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 1),
      waypoints: waypointAlerts
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 1),
      destination: destinationAlerts
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 1),
      originName,
      destinationName,
    };

    console.log('[SafetyGuard] 경로 구간별 재난 정보 결과:', {
      originCount: result.origin.length,
      waypointsCount: result.waypoints.length,
      destinationCount: result.destination.length,
      originName: result.originName,
      destinationName: result.destinationName,
    });

    return result;
  }, [recentDisasterAlertsData, pathSelection]);

  // 재난 유형별로 그룹화
  const disasterAlertsByType = useMemo(() => {
    const groups: { [key: string]: DisasterAlert[] } = {};

    filteredDisasterAlerts.forEach((alert: DisasterAlert) => {
      const type = alert.type || '기타';
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(alert);
    });

    // 각 유형별로 날짜순 정렬 (최신순)
    Object.keys(groups).forEach(type => {
      groups[type].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });

    return groups;
  }, [filteredDisasterAlerts]);

  // 날짜별로 재난 문자 그룹화 (최근, 3일전, 5일전)
  const disasterAlertsByDate = useMemo(() => {
    const now = new Date();
    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(now.getDate() - 3);
    const fiveDaysAgo = new Date(now);
    fiveDaysAgo.setDate(now.getDate() - 5);

    const groups = {
      recent: [] as DisasterAlert[], // 최근 (오늘)
      threeDays: [] as DisasterAlert[], // 3일전
      fiveDays: [] as DisasterAlert[], // 5일전
    };

    filteredDisasterAlerts.forEach((alert: DisasterAlert) => {
      const alertDate = new Date(alert.date);
      
      if (alertDate >= threeDaysAgo) {
        groups.recent.push(alert);
      } else if (alertDate >= fiveDaysAgo) {
        groups.threeDays.push(alert);
      } else {
        groups.fiveDays.push(alert);
      }
    });

    return groups;
  }, [filteredDisasterAlerts]);

  // 카드 클릭 핸들러 (단일 재난 문자)
  const handleDisasterCardPress = (alert: DisasterAlert) => {
    setSelectedAlert(alert);
    setIsAlertModalVisible(true);
  };

  // 재난 유형별 카드 클릭 핸들러 (해당 유형의 모든 재난 문자 표시)
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [isTypeModalVisible, setIsTypeModalVisible] = useState(false);

  const handleTypeCardPress = (type: string) => {
    setSelectedType(type);
    setIsTypeModalVisible(true);
  };

  return (
    <Container>
      <AppHeader 
        subtitle="세이프티 가드"
        description="안전한 경로 추천 및 위험 지역을 한눈에 확인할 수 있습니다."
      />

      {/* 🆕 AI 검증 로딩 모달 */}
      <Modal visible={isValidating} transparent animationType="fade">
        <LoadingOverlay>
          <LoadingBox>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <LoadingText>AI 검증 중...</LoadingText>
            <LoadingSubText>시민 신고를 검증하고 있습니다</LoadingSubText>
          </LoadingBox>
        </LoadingOverlay>
      </Modal>

      {/* 🆕 재난 문자 상세 정보 모달 */}
      <Modal visible={isAlertModalVisible} transparent animationType="fade" onRequestClose={() => setIsAlertModalVisible(false)}>
        <LoadingOverlay>
          <LoadingBox style={{ maxWidth: '90%', padding: theme.spacing.lg }}>
            {selectedAlert && (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md }}>
                  <Text style={{ fontSize: 32, marginRight: theme.spacing.sm }}>{selectedAlert.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <DisasterAlertTitle>{selectedAlert.type}</DisasterAlertTitle>
                    <DisasterAlertTime>
                      {new Date(selectedAlert.date).toLocaleString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </DisasterAlertTime>
                  </View>
                  <TouchableOpacity
                    onPress={() => setIsAlertModalVisible(false)}
                    style={{
                      padding: theme.spacing.xs,
                      borderRadius: 20,
                      backgroundColor: '#f0f0f0',
                    }}
                  >
                    <Text style={{ fontSize: 20, color: theme.colors.text }}>✕</Text>
                  </TouchableOpacity>
                </View>
                <DisasterAlertText style={{ marginBottom: theme.spacing.sm }}>
                  {selectedAlert.message}
                </DisasterAlertText>
                <InfoText style={{ marginBottom: theme.spacing.xs }}>
                  📍 지역: {selectedAlert.region}
                </InfoText>
                {selectedAlert.distance && (
                  <InfoText style={{ marginBottom: theme.spacing.xs }}>
                    📏 경로로부터 거리: 약 {Math.round(selectedAlert.distance)}m
                  </InfoText>
                )}
                {selectedAlert.emergencyStep && (
                  <InfoText>
                    ⚠️ 비상 단계: {selectedAlert.emergencyStep}
                  </InfoText>
                )}
              </>
            )}
          </LoadingBox>
        </LoadingOverlay>
      </Modal>

      {/* 🆕 재난 유형별/지역별 목록 모달 */}
      <Modal visible={isTypeModalVisible} transparent animationType="slide" onRequestClose={() => setIsTypeModalVisible(false)}>
        <LoadingOverlay>
          <LoadingBox style={{ maxWidth: '95%', maxHeight: '80%', padding: theme.spacing.lg }}>
            {selectedType && (
              <>
                {/* 재난 유형별 목록 */}
                {disasterAlertsByType[selectedType] && (
                  <>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md }}>
                      <Text style={{ fontSize: 32, marginRight: theme.spacing.sm }}>
                        {disasterAlertsByType[selectedType][0]?.icon || '⚠️'}
                      </Text>
                      <View style={{ flex: 1 }}>
                        <DisasterAlertTitle>{selectedType}</DisasterAlertTitle>
                        <InfoText>총 {disasterAlertsByType[selectedType].length}개</InfoText>
                      </View>
                      <TouchableOpacity
                        onPress={() => setIsTypeModalVisible(false)}
                        style={{
                          padding: theme.spacing.xs,
                          borderRadius: 20,
                          backgroundColor: '#f0f0f0',
                        }}
                      >
                        <Text style={{ fontSize: 20, color: theme.colors.text }}>✕</Text>
                      </TouchableOpacity>
                    </View>
                    <ScrollView style={{ maxHeight: 500 }}>
                      {disasterAlertsByType[selectedType].map((alert, idx) => (
                        <TouchableOpacity
                          key={alert.id || idx}
                          onPress={() => {
                            setIsTypeModalVisible(false);
                            setSelectedAlert(alert);
                            setIsAlertModalVisible(true);
                          }}
                          style={{
                            backgroundColor: '#F5F5F5',
                            borderRadius: theme.borderRadius.md,
                            padding: theme.spacing.md,
                            marginBottom: theme.spacing.sm,
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.xs }}>
                            <Text style={{ fontSize: 20, marginRight: theme.spacing.xs }}>{alert.icon}</Text>
                            <Text style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>
                              {new Date(alert.date).toLocaleString('ko-KR', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </Text>
                          </View>
                          <Text style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text, marginBottom: theme.spacing.xs }}>
                            {alert.message}
                          </Text>
                          <Text style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>
                            📍 {alert.region}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </>
                )}
                
                {/* 지역별 목록 (지역명으로 선택된 경우) */}
                {disasterAlertsByRegion[selectedType] && (
                  <>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md }}>
                      <Text style={{ fontSize: 32, marginRight: theme.spacing.sm }}>🚨</Text>
                      <View style={{ flex: 1 }}>
                        <DisasterAlertTitle>{selectedType}</DisasterAlertTitle>
                        <InfoText>총 {disasterAlertsByRegion[selectedType].length}개</InfoText>
                      </View>
                      <TouchableOpacity
                        onPress={() => setIsTypeModalVisible(false)}
                        style={{
                          padding: theme.spacing.xs,
                          borderRadius: 20,
                          backgroundColor: '#f0f0f0',
                        }}
                      >
                        <Text style={{ fontSize: 20, color: theme.colors.text }}>✕</Text>
                      </TouchableOpacity>
                    </View>
                    <ScrollView style={{ maxHeight: 500 }}>
                      {disasterAlertsByRegion[selectedType].map((alert, idx) => (
                        <TouchableOpacity
                          key={alert.id || idx}
                          onPress={() => {
                            setIsTypeModalVisible(false);
                            setSelectedAlert(alert);
                            setIsAlertModalVisible(true);
                          }}
                          style={{
                            backgroundColor: '#F5F5F5',
                            borderRadius: theme.borderRadius.md,
                            padding: theme.spacing.md,
                            marginBottom: theme.spacing.sm,
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.xs }}>
                            <Text style={{ fontSize: 20, marginRight: theme.spacing.xs }}>{alert.icon}</Text>
                            <Text style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>
                              {new Date(alert.date).toLocaleString('ko-KR', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </Text>
                          </View>
                          <Text style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text, marginBottom: theme.spacing.xs }}>
                            {alert.message}
                          </Text>
                          <Text style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>
                            📍 {alert.region}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </>
                )}
              </>
            )}
          </LoadingBox>
        </LoadingOverlay>
      </Modal>

      <ScrollContent scrollEnabled showsVerticalScrollIndicator={false}>
        <Content>
          {/* 지도 표시 */}
          <MapContainer>
            <GoogleMapView
              markers={allMarkers}
              polylines={routePolylines}
              centerLat={mapCenter.lat}
              centerLng={mapCenter.lng}
              height={SCREEN_HEIGHT * 0.3}
              latitudeDelta={mapCenter.latitudeDelta}
              longitudeDelta={mapCenter.longitudeDelta}
              onMarkerPress={handleMarkerPress}
            />
          </MapContainer>

          {/* 경로가 지나가는 구 지역 정보 (역지오코딩 기반) */}
          <SectionTitle>📍 경로 지역</SectionTitle>
          {isLoadingRegions ? (
            <InfoBox bgColor="#E3F2FD" borderColor="#2196F3">
              <InfoText>구 지역 정보를 불러오는 중...</InfoText>
              <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginTop: theme.spacing.sm }} />
            </InfoBox>
          ) : routeRegions.length > 0 ? (
            <InfoBox bgColor="#E8F5E9" borderColor="#4CAF50">
              <InfoText style={{ fontWeight: '700', marginBottom: theme.spacing.sm }}>
                경로가 지나가는 구 지역 ({routeRegions.length}개):
              </InfoText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs }}>
                {routeRegions.map((region, idx) => (
                  <View
                    key={idx}
                    style={{
                      backgroundColor: theme.colors.primary,
                      paddingHorizontal: theme.spacing.sm,
                      paddingVertical: theme.spacing.xs,
                      borderRadius: theme.borderRadius.md,
                    }}
                  >
                    <InfoText style={{ color: '#FFFFFF', fontWeight: '600' }}>
                      {region}
                    </InfoText>
                  </View>
                ))}
                </View>
              </InfoBox>
          ) : (
            <InfoBox bgColor="#FFF8E1" borderColor="#FBC02D">
              <InfoText>📍 경로 데이터가 없거나 지역 정보를 불러올 수 없습니다.</InfoText>
            </InfoBox>
          )}

          {/* 🆕 재난 문자 섹션 */}
          <SectionTitle>
            🚨 재난 문자
            {isLoadingAlerts && (
              <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginLeft: theme.spacing.sm }} />
            )}
          </SectionTitle>
          {isLoadingAlerts ? (
            <InfoBox bgColor="#E3F2FD" borderColor="#2196F3">
              <InfoText>재난 문자 데이터를 불러오는 중...</InfoText>
          </InfoBox>
          ) : (
            <>
              {/* 최근 3개 재난문자 한 줄 나열 */}
              {recentDisasterAlerts.length > 0 && (
                <>
                  <SectionTitle style={{ fontSize: theme.fonts.sizes.md, marginTop: theme.spacing.md, marginBottom: theme.spacing.sm }}>
                    최근 재난 문자
                  </SectionTitle>
                  <RecentDisasterContainer horizontal showsHorizontalScrollIndicator={false}>
                    {recentDisasterAlerts.map((alert, idx) => {
                      // 각 재난 문자가 출발지/경유지/도착지 중 어디에 해당하는지 판단
                      const getSegmentLabel = (alert: DisasterAlert): { region: string; segment: string } | null => {
                        if (!pathSelection.journeys || pathSelection.journeys.length === 0) {
                          return null;
                        }

                        const firstJourney = pathSelection.journeys[0];
                        const originAddress = firstJourney?.placeAddress || firstJourney?.placeName || '';
                        const lastJourney = pathSelection.journeys[pathSelection.journeys.length - 1];
                        const destinationAddress = lastJourney?.placeAddress || lastJourney?.placeName || '';

                        // 주소에서 지역명 추출
                        const extractRegionFromAddress = (address: string): string[] => {
                          if (!address) return [];
                          const regions: string[] = [];
                          const provinceMatch = address.match(/(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)/);
                          if (provinceMatch) {
                            const province = provinceMatch[1];
                            const cityMatch = address.match(new RegExp(`${province}[^시구군]*([시구군])`));
                            if (cityMatch) {
                              const cityName = address.substring(0, address.indexOf(cityMatch[1]) + 1);
                              regions.push(cityName);
                            }
                            const guMatch = address.match(/([가-힣]+구)/);
                            if (guMatch) {
                              regions.push(guMatch[1]);
                            }
                          }
                          return regions;
                        };

                        const originRegions = extractRegionFromAddress(originAddress);
                        const destinationRegions = extractRegionFromAddress(destinationAddress);

                        // 경유지 지역명 추출
                        const waypointRegions: string[] = [];
                        if (pathSelection.selectedPaths) {
                          Object.values(pathSelection.selectedPaths).forEach((path: any) => {
                            if (path?.subPath && Array.isArray(path.subPath)) {
                              path.subPath.forEach((segment: any) => {
                                if (segment.startName) {
                                  const regions = extractRegionFromAddress(segment.startName);
                                  waypointRegions.push(...regions);
                                }
                                if (segment.endName) {
                                  const regions = extractRegionFromAddress(segment.endName);
                                  waypointRegions.push(...regions);
                                }
                              });
                            }
                          });
                        }

                        const alertRegion = alert.region || '';
                        
                        // 지역명에서 시/구/군만 추출
                        const regionMatch = alertRegion.match(/([가-힣]+(?:시|구|군|특별시|광역시))/);
                        const regionName = regionMatch ? regionMatch[1] : alertRegion;

                        // 출발지 매칭
                        if (originRegions.some(region => alertRegion.includes(region) || region.includes(alertRegion))) {
                          return { region: regionName, segment: '출발지' };
                        }
                        
                        // 경유지 매칭
                        if (waypointRegions.some(region => alertRegion.includes(region) || region.includes(alertRegion))) {
                          return { region: regionName, segment: '경유지' };
                        }
                        
                        // 도착지 매칭
                        if (destinationRegions.some(region => alertRegion.includes(region) || region.includes(alertRegion))) {
                          return { region: regionName, segment: '도착지' };
                        }

                        return null;
                      };

                      const segmentInfo = getSegmentLabel(alert);

                      return (
                        <RecentDisasterCard key={alert.id || idx} onPress={() => handleDisasterCardPress(alert)}>
                          <RecentDisasterCardIcon>{alert.icon}</RecentDisasterCardIcon>
                          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: theme.spacing.xs, marginBottom: theme.spacing.xs }}>
                            <RecentDisasterCardType>{alert.type}</RecentDisasterCardType>
                            {segmentInfo && (
                              <>
                                <View
                                  style={{
                                    backgroundColor: '#E3F2FD',
                                    borderRadius: theme.borderRadius.sm,
                                    paddingHorizontal: theme.spacing.xs,
                                    paddingVertical: 2,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 2,
                                  }}
                                >
                                  <Text style={{ color: '#1976D2', fontSize: theme.fonts.sizes.xs, fontWeight: '700' }}>
                                    [{segmentInfo.region}]
                                  </Text>
                                </View>
                                <View
                                  style={{
                                    backgroundColor: '#FFF3E0',
                                    borderRadius: theme.borderRadius.sm,
                                    paddingHorizontal: theme.spacing.xs,
                                    paddingVertical: 2,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 2,
                                  }}
                                >
                                  <Text style={{ color: '#E65100', fontSize: theme.fonts.sizes.xs, fontWeight: '700' }}>
                                    [{segmentInfo.segment}]
                                  </Text>
                                </View>
                              </>
                            )}
                          </View>
                          <RecentDisasterCardPreview numberOfLines={2}>
                            {alert.message}
                          </RecentDisasterCardPreview>
                        </RecentDisasterCard>
                      );
                    })}
                  </RecentDisasterContainer>
                </>
              )}

              {/* 재난 유형별 카드 */}
              {Object.keys(disasterAlertsByType).length > 0 && (
                <>
                  <SectionTitle style={{ fontSize: theme.fonts.sizes.md, marginTop: theme.spacing.lg, marginBottom: theme.spacing.md }}>
                    재난 유형별
                  </SectionTitle>
                  {Object.entries(disasterAlertsByType).map(([type, alerts]) => (
                    <TypeDisasterCard key={type} onPress={() => handleTypeCardPress(type)}>
                      <TypeDisasterCardContent>
                        <TypeDisasterCardIcon>{alerts[0]?.icon || '⚠️'}</TypeDisasterCardIcon>
                        <TypeDisasterCardTitle>{type}</TypeDisasterCardTitle>
                      </TypeDisasterCardContent>
                      <TypeDisasterCardCount>
                        <TypeDisasterCardCountText>{alerts.length}</TypeDisasterCardCountText>
                      </TypeDisasterCardCount>
                    </TypeDisasterCard>
                  ))}
                </>
              )}

              {/* 재난 문자가 없는 경우 */}
              {recentDisasterAlerts.length === 0 && Object.keys(disasterAlertsByType).length === 0 && (
          <InfoBox bgColor="#E8F5E9" borderColor="#4CAF50">
                  <InfoText>✅ 현재 활성화된 재난 문자가 없습니다.</InfoText>
          </InfoBox>
              )}
            </>
          )}



          {/* 🆕 경로 구간별 재난 정보 카드 */}
          {disasterAlertsByRouteSegment && (
            (disasterAlertsByRouteSegment.origin.length > 0 || 
             disasterAlertsByRouteSegment.waypoints.length > 0 || 
             disasterAlertsByRouteSegment.destination.length > 0) && (
            <>
              <SectionTitle>📍 경로 구간별 재난 정보</SectionTitle>
              <View style={{ gap: theme.spacing.sm, marginBottom: theme.spacing.lg }}>
                {/* 출발지 구간 */}
                <View
                  style={{
                    backgroundColor: '#E8F5E9',
                    borderLeftWidth: 4,
                    borderLeftColor: '#4CAF50',
                    borderRadius: theme.borderRadius.md,
                    padding: theme.spacing.md,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.xs }}>
                    <Text style={{ color: '#4CAF50', fontSize: theme.fonts.sizes.sm, fontWeight: '800', marginRight: theme.spacing.xs }}>
                      출발지
                    </Text>
                    <Text style={{ color: theme.colors.text, fontSize: theme.fonts.sizes.sm, fontWeight: '700' }}>
                      {disasterAlertsByRouteSegment.originName || '출발지'}
                    </Text>
                  </View>
                  {disasterAlertsByRouteSegment.origin.length > 0 ? (
                    <>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.xs / 2 }}>
                        <Text style={{ fontSize: 18, marginRight: theme.spacing.xs / 2 }}>
                          {disasterAlertsByRouteSegment.origin[0].icon || '⚠️'}
                        </Text>
                        <Text style={{ color: theme.colors.text, fontSize: theme.fonts.sizes.md, fontWeight: '700', flex: 1 }}>
                          {disasterAlertsByRouteSegment.origin[0].type || '재난'}
                        </Text>
                      </View>
                      <Text
                        style={{
                          color: theme.colors.text,
                          fontSize: theme.fonts.sizes.sm,
                          fontWeight: '600',
                          lineHeight: theme.fonts.sizes.sm * 1.4,
                          marginBottom: theme.spacing.xs / 2,
                        }}
                        numberOfLines={2}
                      >
                        {disasterAlertsByRouteSegment.origin[0].message || '재난 문자 내용'}
                      </Text>
                      <Text style={{ color: theme.colors.textSecondary, fontSize: theme.fonts.sizes.xs }}>
                        {disasterAlertsByRouteSegment.origin[0].region || ''} · {new Date(disasterAlertsByRouteSegment.origin[0].date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                      </Text>
                    </>
                  ) : (
                    <Text style={{ color: theme.colors.textSecondary, fontSize: theme.fonts.sizes.sm, fontWeight: '500' }}>
                      재난 정보 없음
                    </Text>
                  )}
                </View>

                {/* 경유지 구간 */}
                <View
                  style={{
                    backgroundColor: '#FFF3E0',
                    borderLeftWidth: 4,
                    borderLeftColor: '#FF9800',
                    borderRadius: theme.borderRadius.md,
                    padding: theme.spacing.md,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.xs }}>
                    <Text style={{ color: '#FF9800', fontSize: theme.fonts.sizes.sm, fontWeight: '800', marginRight: theme.spacing.xs }}>
                      경유지
                    </Text>
                    <Text style={{ color: theme.colors.text, fontSize: theme.fonts.sizes.sm, fontWeight: '700' }}>
                      경로상 정류장
                    </Text>
                  </View>
                  {disasterAlertsByRouteSegment.waypoints.length > 0 ? (
                    <>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.xs / 2 }}>
                        <Text style={{ fontSize: 18, marginRight: theme.spacing.xs / 2 }}>
                          {disasterAlertsByRouteSegment.waypoints[0].icon || '⚠️'}
                        </Text>
                        <Text style={{ color: theme.colors.text, fontSize: theme.fonts.sizes.md, fontWeight: '700', flex: 1 }}>
                          {disasterAlertsByRouteSegment.waypoints[0].type || '재난'}
                        </Text>
                      </View>
                      <Text
                        style={{
                          color: theme.colors.text,
                          fontSize: theme.fonts.sizes.sm,
                          fontWeight: '600',
                          lineHeight: theme.fonts.sizes.sm * 1.4,
                          marginBottom: theme.spacing.xs / 2,
                        }}
                        numberOfLines={2}
                      >
                        {disasterAlertsByRouteSegment.waypoints[0].message || '재난 문자 내용'}
                      </Text>
                      <Text style={{ color: theme.colors.textSecondary, fontSize: theme.fonts.sizes.xs }}>
                        {disasterAlertsByRouteSegment.waypoints[0].region || ''} · {new Date(disasterAlertsByRouteSegment.waypoints[0].date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                      </Text>
                    </>
                  ) : (
                    <Text style={{ color: theme.colors.textSecondary, fontSize: theme.fonts.sizes.sm, fontWeight: '500' }}>
                      재난 정보 없음
                    </Text>
                  )}
                </View>

                {/* 도착지 구간 */}
                <View
                  style={{
                    backgroundColor: '#E3F2FD',
                    borderLeftWidth: 4,
                    borderLeftColor: '#2196F3',
                    borderRadius: theme.borderRadius.md,
                    padding: theme.spacing.md,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.xs }}>
                    <Text style={{ color: '#2196F3', fontSize: theme.fonts.sizes.sm, fontWeight: '800', marginRight: theme.spacing.xs }}>
                      도착지
                    </Text>
                    <Text style={{ color: theme.colors.text, fontSize: theme.fonts.sizes.sm, fontWeight: '700' }}>
                      {disasterAlertsByRouteSegment.destinationName || '도착지'}
                    </Text>
                  </View>
                  {disasterAlertsByRouteSegment.destination.length > 0 ? (
                    <>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.xs / 2 }}>
                        <Text style={{ fontSize: 18, marginRight: theme.spacing.xs / 2 }}>
                          {disasterAlertsByRouteSegment.destination[0].icon || '⚠️'}
                        </Text>
                        <Text style={{ color: theme.colors.text, fontSize: theme.fonts.sizes.md, fontWeight: '700', flex: 1 }}>
                          {disasterAlertsByRouteSegment.destination[0].type || '재난'}
                        </Text>
                      </View>
                      <Text
                        style={{
                          color: theme.colors.text,
                          fontSize: theme.fonts.sizes.sm,
                          fontWeight: '600',
                          lineHeight: theme.fonts.sizes.sm * 1.4,
                          marginBottom: theme.spacing.xs / 2,
                        }}
                        numberOfLines={2}
                      >
                        {disasterAlertsByRouteSegment.destination[0].message || '재난 문자 내용'}
                      </Text>
                      <Text style={{ color: theme.colors.textSecondary, fontSize: theme.fonts.sizes.xs }}>
                        {disasterAlertsByRouteSegment.destination[0].region || ''} · {new Date(disasterAlertsByRouteSegment.destination[0].date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                      </Text>
                    </>
                  ) : (
                    <Text style={{ color: theme.colors.textSecondary, fontSize: theme.fonts.sizes.sm, fontWeight: '500' }}>
                      재난 정보 없음
                    </Text>
                  )}
                </View>
              </View>
            </>
            )
          )}

          {/* 🆕 사용자 신고 섹션 */}
          <SectionTitle>
            👥 사용자 신고
            {riskReports.length > 0 && (
              <DisasterCountBadge>
                <DisasterCountText>{riskReports.length}</DisasterCountText>
              </DisasterCountBadge>
            )}
          </SectionTitle>
          {riskReports.length > 0 ? (
            riskReports.map((report) => (
              <UserReportBox key={report.id}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <UserReportTitle>🚨 위험 요소 신고</UserReportTitle>
                    <UserReportText>{report.description}</UserReportText>
                    <UserReportText>📍 {report.location.address}</UserReportText>
                    {report.riskTypes.length > 0 && (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: theme.spacing.xs }}>
                        {report.riskTypes.map((riskTypeId, idx) => (
                          <RiskTypeTag
                            key={idx}
                            color={riskTypeColors[riskTypeId] || '#95A5A6'}
                          >
                            <RiskTypeTagText>
                              {RISK_TYPE_LABELS[riskTypeId] || riskTypeId}
                            </RiskTypeTagText>
                          </RiskTypeTag>
                        ))}
                      </View>
                    )}
                    {report.photos.length > 0 && (
                      <UserReportText style={{ marginTop: theme.spacing.sm }}>
                        📷 사진 {report.photos.length}개 첨부됨
                      </UserReportText>
                    )}
                  </View>
                </View>
                <UserReportTime>
                  {new Date(report.timestamp).toLocaleTimeString('ko-KR')} · 상태: {report.status === 'verified' ? '검증됨' : '검증 중'}
                </UserReportTime>
              </UserReportBox>
            ))
          ) : (
            <InfoBox bgColor="#E3F2FD" borderColor="#2196F3">
              <InfoText>📝 아직 신고된 위험 요소가 없습니다.</InfoText>
            </InfoBox>
          )}
        </Content>
      </ScrollContent>
    </Container>
  );
}

// 위험 타입 레이블
const RISK_TYPE_LABELS: { [key: string]: string } = {
  accident: '사고',
  construction: '공사',
  obstacle: '장애물',
  flooding: '침수/파손',
  crowded: '인파 밀집',
  etc: '기타',
};

