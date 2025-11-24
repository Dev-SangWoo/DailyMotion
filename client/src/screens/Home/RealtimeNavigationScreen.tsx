/**
 * 실시간 경로 추적 네비게이션 화면
 *
 * 사용자의 현재 위치와 선택된 경로를 지도에 표시합니다.
 * - 현재 GPS 위치 마커
 * - 경로 라인 오버레이
 * - 다음 정류장/역 정보
 * - 실시간 이동 속도
 *
 * 헌법 준수:
 * - AGENTS.md [제2장]: Styled-components 사용
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import styled from 'styled-components/native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { useTrackingState, useCurrentLocation } from '../../stores/useTrackingStore';
import { formatTime, formatDistance } from '../../services/routeTrackingService';
import { useOnboardingData } from '../Onboarding/stores/useOnboardingStore';
import { GoogleMapView } from '../../components/maps/GoogleMapView';
import { HomeStackParamList } from './HomeNavigator';

type NavigationProp = StackNavigationProp<HomeStackParamList, 'RealtimeNavigation'>;

const Container = styled.View`
  flex: 1;
  background-color: ${theme.colors.background};
`;

const Header = styled.View`
  background-color: ${theme.colors.primary};
  padding: ${theme.spacing.lg}px;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding-top: ${theme.spacing.xl}px;
  shadow-color: #000;
  shadow-opacity: 0.1;
  shadow-radius: 4px;
  elevation: 2;
`;

const HeaderTitle = styled.Text`
  color: white;
  font-size: ${theme.fonts.sizes.lg}px;
  font-weight: 700;
`;

const CloseButton = styled.Text`
  color: white;
  font-size: ${theme.fonts.sizes.xl}px;
`;

const MapContainer = styled.View`
  margin: ${theme.spacing.md}px;
  border-radius: ${theme.borderRadius.lg}px;
  overflow: hidden;
  shadow-color: #000;
  shadow-opacity: 0.1;
  shadow-radius: 4px;
  elevation: 2;
`;

const InfoCard = styled.View`
  background-color: white;
  margin: ${theme.spacing.md}px;
  border-radius: ${theme.borderRadius.lg}px;
  padding: ${theme.spacing.lg}px;
  shadow-color: #000;
  shadow-opacity: 0.1;
  shadow-radius: 4px;
  elevation: 2;
`;

const InfoRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.md}px;
  padding-bottom: ${theme.spacing.md}px;
  border-bottom-width: 1px;
  border-bottom-color: ${theme.colors.border};
`;

const InfoRowLast = styled(InfoRow)`
  border-bottom-width: 0;
  margin-bottom: 0;
  padding-bottom: 0;
`;

const InfoLabel = styled.Text`
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fonts.sizes.sm}px;
  font-weight: 600;
`;

const InfoValue = styled.Text`
  color: ${theme.colors.text};
  font-size: ${theme.fonts.sizes.md}px;
  font-weight: 700;
`;

const StatusBadge = styled.View<{ status: 'walking' | 'transit' | 'waiting' }>`
  background-color: ${(props) => {
    switch (props.status) {
      case 'walking':
        return '#4CAF50';
      case 'transit':
        return '#2196F3';
      case 'waiting':
        return '#FF9800';
      default:
        return '#999';
    }
  }};
  padding: ${theme.spacing.sm}px ${theme.spacing.md}px;
  border-radius: ${theme.borderRadius.md}px;
`;

const StatusText = styled.Text`
  color: white;
  font-size: ${theme.fonts.sizes.sm}px;
  font-weight: 600;
`;

const CloseButtonContainer = styled.View`
  margin: ${theme.spacing.md}px;
`;

const CloseBtnText = styled.Text`
  color: white;
  font-size: ${theme.fonts.sizes.md}px;
  font-weight: 700;
  text-align: center;
`;

const CloseBtn = styled.View`
  background-color: ${theme.colors.primary};
  padding: ${theme.spacing.md}px ${theme.spacing.lg}px;
  border-radius: ${theme.borderRadius.lg}px;
  shadow-color: ${theme.colors.primary};
  shadow-opacity: 0.3;
  shadow-radius: 4px;
  elevation: 2;
`;

const MapButtonContainer = styled.View`
  position: absolute;
  bottom: ${theme.spacing.md}px;
  right: ${theme.spacing.md}px;
  z-index: 1000;
`;

const CurrentLocationButton = styled.TouchableOpacity`
  background-color: white;
  width: 48px;
  height: 48px;
  border-radius: 24px;
  justify-content: center;
  align-items: center;
  shadow-color: #000;
  shadow-opacity: 0.3;
  shadow-radius: 4px;
  elevation: 5;
  border-width: 1px;
  border-color: ${theme.colors.border};
`;

interface RealtimeNavigationScreenProps {
  route: {
    params: {
      originName: string;
      destinationName: string;
      selectedPath: any;
    };
  };
}

const RealtimeNavigationScreen: React.FC<RealtimeNavigationScreenProps> = ({ route }) => {
  const navigation = useNavigation<NavigationProp>();
  const trackingState = useTrackingState();
  const currentLocation = useCurrentLocation();
  const { originName, destinationName, selectedPath } = route.params;
  const { places, pathSelection } = useOnboardingData();
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const mapViewRef = useRef<any>(null);

  // 집 주소 좌표 가져오기
  const homeCoordinates = useMemo(() => {
    console.log('[RealtimeNavigationScreen] places:', places);
    console.log('[RealtimeNavigationScreen] places.homeAddress:', places.homeAddress);
    console.log('[RealtimeNavigationScreen] typeof places.homeAddress:', typeof places.homeAddress);

    if (typeof places.homeAddress === 'object' && places.homeAddress) {
      const coords = {
        lat: parseFloat(places.homeAddress.y || '37.4979'),
        lng: parseFloat(places.homeAddress.x || '127.0276'),
        address: places.homeAddress.address || '집',
      };
      console.log('[RealtimeNavigationScreen] Using homeAddress object:', coords);
      return coords;
    }
    // 기본값: 강남역
    const defaultCoords = {
      lat: 37.4979,
      lng: 127.0276,
      address: '집',
    };
    console.log('[RealtimeNavigationScreen] Using default coords:', defaultCoords);
    return defaultCoords;
  }, [places]);

  // 경로 polyline 생성
  const routePolylines = useMemo(() => {
    const polylines: Array<{
      name: string;
      coords: Array<{ lat: number; lng: number }>;
      color: string;
      strokeWeight: number;
      lineDashPattern?: number[];
    }> = [];

    if (!selectedPath || !selectedPath.subPath || !Array.isArray(selectedPath.subPath)) {
      console.log('[RealtimeNavigationScreen] 경로 데이터 없음');
      return polylines;
    }

    console.log('[RealtimeNavigationScreen] 경로 세그먼트 개수:', selectedPath.subPath.length);

    selectedPath.subPath.forEach((segment: any, segIdx: number) => {
      const trafficType = segment.trafficType;
      const segmentCoords: Array<{ lat: number; lng: number }> = [];

      // 시작 정류장/역 좌표
      if (segment.startX && segment.startY) {
        const lat = parseFloat(segment.startY);
        const lng = parseFloat(segment.startX);
        if (!isNaN(lat) && !isNaN(lng)) {
          segmentCoords.push({ lat, lng });
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
            segmentCoords.push({ lat, lng });
          }
        });
      }

      // 종료 정류장/역 좌표
      if (segment.endX && segment.endY) {
        const lat = parseFloat(segment.endY);
        const lng = parseFloat(segment.endX);
        if (!isNaN(lat) && !isNaN(lng)) {
          // 중복 제거
          const lastCoord = segmentCoords[segmentCoords.length - 1];
          if (!lastCoord || lastCoord.lat !== lat || lastCoord.lng !== lng) {
            segmentCoords.push({ lat, lng });
          }
        }
      }

      // 정류장이 2개 이상이면 polyline 생성
      if (segmentCoords.length >= 2) {
        let color = '#0066FF'; // 기본 파란색
        let strokeWeight = 5;
        let lineDashPattern: number[] | undefined = undefined;

        if (trafficType === 3) {
          // 도보: 점선 패턴
          strokeWeight = 3;
          lineDashPattern = [10, 5];
          color = '#0066FF80'; // 50% 투명도
        } else if (trafficType === 1) {
          // 지하철: 파란색
          color = '#0066FF';
        } else if (trafficType === 2) {
          // 버스: 초록색
          color = '#4CAF50';
        }

        polylines.push({
          name: `세그먼트 ${segIdx + 1} (${trafficType === 1 ? '지하철' : trafficType === 2 ? '버스' : '도보'})`,
          coords: segmentCoords,
          color,
          strokeWeight,
          lineDashPattern,
        });
      }
    });

    console.log('[RealtimeNavigationScreen] 생성된 polyline 개수:', polylines.length);
    return polylines;
  }, [selectedPath]);

  // 마커 생성 (출발지, 목적지, 현재 위치, 정류장)
  const markers = useMemo(() => {
    const markerList: Array<{
      title: string;
      lat: number;
      lng: number;
      color?: string;
      icon?: string;
      markerType?: 'icon' | 'region' | 'stop';
      zIndex?: number;
    }> = [];

    // 출발지 마커
    if (homeCoordinates) {
      markerList.push({
        title: '🏠 ' + homeCoordinates.address,
        lat: homeCoordinates.lat,
        lng: homeCoordinates.lng,
        color: '#0066FF',
        icon: '🏠',
        markerType: 'icon' as const,
        zIndex: 1500,
      });
    }

    // 현재 위치 마커 (currentLocation에서 가져오기)
    if (currentLocation) {
      markerList.push({
        title: '📍 현재 위치',
        lat: currentLocation.latitude,
        lng: currentLocation.longitude,
        color: '#FF5252',
        icon: '📍',
        markerType: 'icon' as const,
        zIndex: 2000, // 가장 위에 표시
      });
    }

    // 정류장 마커 (경로의 시작/종료 정류장)
    if (selectedPath?.subPath && Array.isArray(selectedPath.subPath)) {
      selectedPath.subPath.forEach((segment: any, idx: number) => {
        // 시작 정류장
        if (segment.startX && segment.startY) {
          const lat = parseFloat(segment.startY);
          const lng = parseFloat(segment.startX);
          if (!isNaN(lat) && !isNaN(lng)) {
            markerList.push({
              title: segment.startName || `정류장 ${idx + 1}`,
              lat,
              lng,
              color: segment.trafficType === 1 ? '#0066FF' : segment.trafficType === 2 ? '#4CAF50' : '#999',
              markerType: 'stop' as const,
              zIndex: 100,
            });
          }
        }
        // 종료 정류장
        if (segment.endX && segment.endY) {
          const lat = parseFloat(segment.endY);
          const lng = parseFloat(segment.endX);
          if (!isNaN(lat) && !isNaN(lng)) {
            markerList.push({
              title: segment.endName || `정류장 ${idx + 1}`,
              lat,
              lng,
              color: segment.trafficType === 1 ? '#0066FF' : segment.trafficType === 2 ? '#4CAF50' : '#999',
              markerType: 'stop' as const,
              zIndex: 100,
            });
          }
        }
      });
    }

    return markerList;
  }, [homeCoordinates, currentLocation, selectedPath]);

  // 지도 중심점 계산 (모든 마커 포함)
  const calculatedMapCenter = useMemo(() => {
    if (mapCenter) {
      return mapCenter;
    }

    const allCoords: Array<{ lat: number; lng: number }> = [];
    
    // 마커 좌표 수집
    markers.forEach(marker => {
      allCoords.push({ lat: marker.lat, lng: marker.lng });
    });

    if (allCoords.length === 0) {
      return { lat: homeCoordinates.lat, lng: homeCoordinates.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 };
    }

    // 모든 좌표의 중심점 계산
    const avgLat = allCoords.reduce((sum, coord) => sum + coord.lat, 0) / allCoords.length;
    const avgLng = allCoords.reduce((sum, coord) => sum + coord.lng, 0) / allCoords.length;

    // 범위 계산
    const minLat = Math.min(...allCoords.map(c => c.lat));
    const maxLat = Math.max(...allCoords.map(c => c.lat));
    const minLng = Math.min(...allCoords.map(c => c.lng));
    const maxLng = Math.max(...allCoords.map(c => c.lng));

    const latDelta = Math.max((maxLat - minLat) * 1.5, 0.01);
    const lngDelta = Math.max((maxLng - minLng) * 1.5, 0.01);

    return {
      lat: avgLat,
      lng: avgLng,
      latitudeDelta: latDelta,
      longitudeDelta: lngDelta,
    };
  }, [markers, homeCoordinates, mapCenter]);

  // 현재 위치로 이동
  const handleCurrentLocationPress = () => {
    if (currentLocation) {
      setMapCenter({
        lat: currentLocation.latitude,
        lng: currentLocation.longitude,
      });
    } else {
      // 현재 위치가 없으면 집 위치로 이동
      setMapCenter({
        lat: homeCoordinates.lat,
        lng: homeCoordinates.lng,
      });
    }
  };

  const getStatusLabel = (status: string | undefined): string => {
    switch (status) {
      case 'walking':
        return '도보 중';
      case 'waiting_at_stop':
        return '정류장 대기';
      case 'boarding':
        return '탑승 중';
      case 'on_transit':
        return '이동 중';
      case 'route_deviation':
        return '경로 이탈';
      case 'destination_reached':
        return '도착 완료';
      default:
        return '추적 중';
    }
  };

  const getStatusType = (status: string | undefined): 'walking' | 'transit' | 'waiting' => {
    switch (status) {
      case 'walking':
      case 'boarding':
        return 'walking';
      case 'on_transit':
        return 'transit';
      case 'waiting_at_stop':
        return 'waiting';
      default:
        return 'transit';
    }
  };

  return (
    <Container>
      <Header>
        <HeaderTitle>실시간 경로 추적</HeaderTitle>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <CloseButton>✕</CloseButton>
        </TouchableOpacity>
      </Header>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: theme.spacing.lg }}
        scrollEnabled={true}
      >
        {/* 실시간 경로 지도 */}
        <MapContainer>
          {console.log('[RealtimeNavigationScreen] 맵 렌더링:', { 
            markersCount: markers.length,
            polylinesCount: routePolylines.length,
            center: calculatedMapCenter 
          })}
          <GoogleMapView
            markers={markers}
            polylines={routePolylines}
            centerLat={calculatedMapCenter.lat}
            centerLng={calculatedMapCenter.lng}
            latitudeDelta={calculatedMapCenter.latitudeDelta}
            longitudeDelta={calculatedMapCenter.longitudeDelta}
            height={350}
            zoom={15}
          />
          {/* 현재 위치로 이동 버튼 */}
          <MapButtonContainer>
            <CurrentLocationButton onPress={handleCurrentLocationPress}>
              <MaterialIcons name="my-location" size={24} color={theme.colors.primary} />
            </CurrentLocationButton>
          </MapButtonContainer>
        </MapContainer>

        {/* 여정 정보 */}
        <InfoCard>
          <InfoRow>
            <InfoLabel>출발지</InfoLabel>
            <InfoValue>{originName}</InfoValue>
          </InfoRow>
          <InfoRow>
            <InfoLabel>목적지</InfoLabel>
            <InfoValue>{destinationName}</InfoValue>
          </InfoRow>
          <InfoRowLast>
            <InfoLabel>예상 소요 시간</InfoLabel>
            <InfoValue>{selectedPath?.totalTimeMinutes || '--'}분</InfoValue>
          </InfoRowLast>
        </InfoCard>

        {/* 실시간 추적 정보 */}
        {trackingState && (
          <InfoCard>
            <InfoRow>
              <InfoLabel>현재 상태</InfoLabel>
              <StatusBadge status={getStatusType(trackingState.status)}>
                <StatusText>{getStatusLabel(trackingState.status)}</StatusText>
              </StatusBadge>
            </InfoRow>
            <InfoRow>
              <InfoLabel>현재 속도</InfoLabel>
              <InfoValue>{trackingState.movementSpeed.toFixed(1)} km/h</InfoValue>
            </InfoRow>
            <InfoRow>
              <InfoLabel>다음 정류장까지</InfoLabel>
              <InfoValue>{formatDistance(trackingState.distanceToNextStop)}</InfoValue>
            </InfoRow>
            <InfoRow>
              <InfoLabel>예상 도착 시간</InfoLabel>
              <InfoValue>{formatTime(trackingState.estimatedTimeToNextStop)}</InfoValue>
            </InfoRow>
            <InfoRowLast>
              <InfoLabel>경로 상태</InfoLabel>
              <InfoValue style={{ color: trackingState.isOnRoute ? '#4CAF50' : '#F44336' }}>
                {trackingState.isOnRoute ? '✓ 정상' : '✕ 이탈'}
              </InfoValue>
            </InfoRowLast>
          </InfoCard>
        )}

        {/* 닫기 버튼 */}
        <CloseButtonContainer>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <CloseBtn>
              <CloseBtnText>닫기</CloseBtnText>
            </CloseBtn>
          </TouchableOpacity>
        </CloseButtonContainer>
      </ScrollView>
    </Container>
  );
};

export default RealtimeNavigationScreen;
