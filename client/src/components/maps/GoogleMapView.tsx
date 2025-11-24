/**
 * Google Maps 컴포넌트
 *
 * react-native-maps를 사용하여 Google 지도를 표시합니다.
 *
 * 헌법 준수:
 * - AGENTS.md [제2장]: Styled-components 사용
 * - AGENTS.md [제3장]: 데이터 페칭 (부모에서 상태 관리)
 */

import React from 'react';
import { View, ActivityIndicator, Platform, Text } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import styled from 'styled-components/native';
import { theme } from '../../styles/theme';

interface MapMarker {
  title: string;
  lat: number;
  lng: number;
  color?: string; // 마커 색상 (hex 코드 또는 색상 이름)
  icon?: string; // 마커 아이콘 (이모지 등, 선택사항)
  anchor?: { x: number; y: number }; // 마커 앵커 위치 (선택사항, 기본값: { x: 0.5, y: 0.6 })
  markerType?: 'icon' | 'region' | 'stop'; // 마커 타입 (아이콘, 지역, 정류장)
  zIndex?: number; // 마커 zIndex (선택사항)
  alert?: any; // 재난 마커 구분용 (alert 속성이 있으면 재난 마커)
  isRiskReport?: boolean; // 위험제보 마커 구분용
}

interface MapPolyline {
  name: string;
  coords: Array<{ lat: number; lng: number }>;
  color?: string;
  strokeWeight?: number;
  lineDashPattern?: number[]; // 점선 패턴 (예: [5, 5] = 5px 선, 5px 간격)
}

interface GoogleMapViewProps {
  markers: MapMarker[];
  polylines?: MapPolyline[];
  centerLat?: number;
  centerLng?: number;
  height?: number;
  zoom?: number;
  latitudeDelta?: number; // 직접 지정 가능한 위도 범위
  longitudeDelta?: number; // 직접 지정 가능한 경도 범위
  onMarkerPress?: (marker: MapMarker, index: number) => void;
}

const Container = styled.View`
  background-color: ${theme.colors.background};
  border-radius: 12px;
  overflow: visible; /* 마커가 잘리지 않도록 visible로 변경 */
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  elevation: 2;
  padding: 10px; /* 마커가 잘리지 않도록 패딩 추가 */
`;

const LoadingContainer = styled.View<{ height: number }>`
  height: ${(props) => props.height}px;
  justify-content: center;
  align-items: center;
  background-color: #f5f5f5;
`;

// 마커 색상 매핑 (기본 색상 이름 지원)
const markerColorMap: Record<string, string> = {
  red: '#FF0000',
  blue: '#0066FF',
  yellow: '#FFFF00',
  green: '#00FF00',
};

// 색상 코드 가져오기 (hex 코드면 그대로, 색상 이름이면 매핑에서 찾기)
const getMarkerColor = (color?: string): string => {
  if (!color) return '#FF0000'; // 기본값: 빨강
  // 이미 hex 코드인 경우
  if (color.startsWith('#')) {
    return color;
  }
  // 색상 이름인 경우 매핑에서 찾기
  return markerColorMap[color] || color;
};

// 원형 마커 컴포넌트 (styled-components 대신 일반 View 사용)
const CircleMarker: React.FC<{ color: string }> = ({ color }) => (
  <View
    collapsable={false}
    style={{
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: color,
      borderWidth: 2,
      borderColor: '#FFFFFF',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 2,
      elevation: 3,
    }}
  />
);

/**
 * Google Maps 컴포넌트
 */
export const GoogleMapView: React.FC<GoogleMapViewProps> = ({
  markers,
  polylines,
  centerLat = 37.5665,  // 서울시청 위도
  centerLng = 126.9780, // 서울시청 경도
  height = 300,
  zoom = 15,
  latitudeDelta,
  longitudeDelta,
  onMarkerPress,
}) => {
  // zoom level을 Google Maps의 zoom level로 변환 (카카오맵과 비슷한 범위)
  const googleZoom = Math.max(1, Math.min(20, zoom));
  
  // delta가 직접 지정된 경우 사용, 아니면 zoom 기반으로 계산
  const finalLatitudeDelta = latitudeDelta ?? (0.01 * (21 - googleZoom) / 10);
  const finalLongitudeDelta = longitudeDelta ?? (0.01 * (21 - googleZoom) / 10);

  // 🔍 디버깅: GoogleMapView에 전달되는 데이터 확인
  console.log('[GoogleMapView] 렌더링:', {
    markersCount: markers?.length || 0,
    markers: markers,
    polylinesCount: polylines?.length || 0,
    center: { lat: centerLat, lng: centerLng },
    zoom: googleZoom,
  });
  
  // 마커 상세 정보 로그
  if (markers && markers.length > 0) {
    console.log('[GoogleMapView] 마커 상세 정보:');
    markers.forEach((marker, idx) => {
      console.log(`  [${idx}] ${marker.title}: lat=${marker.lat}, lng=${marker.lng}, type=${marker.markerType || 'auto'}, icon=${marker.icon || 'none'}`);
    });
  } else {
    console.warn('[GoogleMapView] ⚠️ 마커가 없습니다!');
  }
  
  if (polylines && polylines.length > 0) {
    polylines.forEach((polyline, idx) => {
      console.log(`[GoogleMapView] Polyline ${idx}: ${polyline.name} - ${polyline.coords.length}개 좌표`);
      if (polyline.coords.length > 0) {
        console.log(`[GoogleMapView] Polyline ${idx} 첫 좌표:`, polyline.coords[0]);
        console.log(`[GoogleMapView] Polyline ${idx} 마지막 좌표:`, polyline.coords[polyline.coords.length - 1]);
      }
    });
  }

  return (
    <Container>
      <MapView
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined} // iOS는 기본적으로 Google Maps
        style={{ 
          height, 
          width: '100%',
          borderRadius: 12, // Container의 borderRadius를 MapView에 직접 적용
          overflow: 'visible', // 마커가 잘리지 않도록 visible로 변경
        }}
        initialRegion={{
          latitude: centerLat,
          longitude: centerLng,
          latitudeDelta: finalLatitudeDelta,
          longitudeDelta: finalLongitudeDelta,
        }}
        scrollEnabled={true}
        zoomEnabled={true}
        pitchEnabled={true}
        rotateEnabled={true}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={true}
        showsScale={false}
      >
        {/* 마커 표시 (원형 또는 아이콘) - 경로 위에 표시되도록 마커를 먼저 렌더링 */}
        {markers.map((marker, index) => {
          const markerType = marker.markerType || (marker.icon ? 'icon' : 'stop');
          const isRegionMarker = markerType === 'region';
          const isIconMarker = markerType === 'icon';
          
          // 지역 마커는 더 높은 zIndex
          const markerZIndex = marker.zIndex || (isRegionMarker ? 2000 : isIconMarker ? 1500 : 100);
          
          // 디버깅: 마커 정보 로그 (region 마커는 모두 로그)
          if (isRegionMarker || index < 5) {
            console.log(`[GoogleMapView] 마커 ${index}:`, {
              title: marker.title,
              type: markerType,
              lat: marker.lat,
              lng: marker.lng,
              icon: marker.icon,
              color: marker.color,
              zIndex: markerZIndex,
              hasAlert: !!marker.alert,
              isIconMarker,
              isRegionMarker,
            });
          }
          
          // 좌표 유효성 검사
          if (isNaN(marker.lat) || isNaN(marker.lng)) {
            console.warn(`[GoogleMapView] 유효하지 않은 좌표:`, marker);
            return null;
          }

          return (
            <Marker
              key={`marker-${index}-${marker.lat}-${marker.lng}`}
              coordinate={{
                latitude: marker.lat,
                longitude: marker.lng,
              }}
              title={marker.title}
              description={marker.title}
              onPress={() => onMarkerPress?.(marker, index)}
              anchor={isRegionMarker ? { x: 0.5, y: 0.5 } : (marker.anchor || { x: 0.5, y: 0.6 })}
              zIndex={markerZIndex}
              tracksViewChanges={true} // 커스텀 뷰를 위해 true로 변경
            >
              {isRegionMarker ? (
                // 지역별 재난문자 마커 (지도에서 여러 마커가 표시되므로 작은 크기: 36px)
                <View
                  collapsable={false}
                  pointerEvents="box-none"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: '#FFFFFF',
                    borderWidth: 2,
                    borderColor: '#FF5252',
                    borderStyle: 'solid',
                    justifyContent: 'center', 
                    alignItems: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.25,
                    shadowRadius: 2,
                    elevation: 6,
                  }}
                >
                  <Text 
                    style={{ 
                      fontSize: 10, 
                      fontWeight: 'bold',
                      color: '#FF5252',
                      textAlign: 'center',
                      lineHeight: 12,
                      includeFontPadding: false,
                    }}
                    numberOfLines={1}
                  >
                    {marker.icon || '🚨'}
                  </Text>
                </View>
              ) : isIconMarker ? (
                // 재난 마커는 테두리/배경 없이 아이콘만, 일반 마커는 테두리/배경 있음
                marker.alert ? (
                  // 재난 마커 (테두리/배경 없이 아이콘만, 작은 크기)
                  <View
                    collapsable={false}
                    pointerEvents="box-none"
                    style={{
                      justifyContent: 'center',
                      alignItems: 'center',
                      overflow: 'visible',
                    }}
                  >
                    <Text 
                      style={{ 
                        fontSize: 24, 
                        textAlign: 'center',
                        textAlignVertical: 'center',
                        includeFontPadding: false,
                        lineHeight: 24,
                      }}
                    >
                      {marker.icon || '⚠️'}
                    </Text>
                  </View>
                ) : (
                  // 일반 아이콘 마커 (집, 자주 가는 장소, 위험제보 등 - 지도에서 여러 마커가 표시되므로 작은 크기)
                  <View
                    collapsable={false}
                    pointerEvents="box-none"
                    style={{
                      width: marker.isRiskReport ? 36 : 32, // 위험제보: 36px, 일반: 32px
                      height: marker.isRiskReport ? 36 : 32,
                      borderRadius: marker.isRiskReport ? 18 : 16, // 원형
                      backgroundColor: marker.isRiskReport ? '#FFF3E0' : '#FFFFF0', // 위험제보는 주황색 배경
                      borderWidth: 2,
                      borderColor: marker.color || (marker.isRiskReport ? '#FF9800' : '#4ECDC4'),
                      borderStyle: 'solid',
                      justifyContent: 'center',
                      alignItems: 'center',
                      overflow: 'visible',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: marker.isRiskReport ? 0.35 : 0.25,
                      shadowRadius: 2,
                      elevation: marker.isRiskReport ? 6 : 5,
                    }}
                  >
                    <Text 
                      style={{ 
                        fontSize: marker.isRiskReport ? 16 : 14, // 위험제보: 16px, 일반: 14px
                        textAlign: 'center',
                        textAlignVertical: 'center',
                        includeFontPadding: false,
                        lineHeight: marker.isRiskReport ? 18 : 16,
                      }}
                    >
                      {marker.icon || '📍'}
                    </Text>
                  </View>
                )
              ) : (
                // 정류장 원형 마커
                <View collapsable={false}>
                  <CircleMarker color={getMarkerColor(marker.color)} />
                </View>
              )}
            </Marker>
          );
        })}

        {/* 경로선 표시 */}
        {polylines?.map((polyline, index) => (
          <Polyline
            key={index}
            coordinates={polyline.coords.map(coord => ({
              latitude: coord.lat,
              longitude: coord.lng,
            }))}
            strokeColor={polyline.color || '#0066FF'}
            strokeWidth={polyline.strokeWeight || 3}
            lineDashPattern={polyline.lineDashPattern} // 점선 패턴 (도보용)
          />
        ))}
      </MapView>
    </Container>
  );
};

export default GoogleMapView;


