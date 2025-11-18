/**
 * 카카오맵 WebView 컴포넌트
 *
 * 카카오 Local API와 JavaScript SDK를 통합하여 지도를 표시합니다.
 *
 * 헌법 준수:
 * - AGENTS.md [제2장]: Styled-components 사용
 * - CLAUDE.md: React Query 활용 권장 (현재는 직접 호출)
 */

import React, { useMemo } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import styled from 'styled-components/native';
import { theme } from '../../styles/theme';

interface MapMarker {
  title: string;
  lat: number;
  lng: number;
  color?: 'red' | 'blue' | 'yellow' | 'green'; // 마커 색상
}

interface KakaoMapViewProps {
  markers: MapMarker[];
  centerLat?: number;
  centerLng?: number;
  height?: number;
  zoom?: number;
}

const Container = styled.View`
  background-color: ${theme.colors.background};
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  elevation: 2;
`;

const LoadingContainer = styled.View`
  height: ${(props: { height: number }) => props.height}px;
  justify-content: center;
  align-items: center;
  background-color: #f5f5f5;
`;

/**
 * 카카오맵 HTML 생성
 */
const generateMapHTML = (
  markers: MapMarker[],
  centerLat: number,
  centerLng: number,
  zoom: number
): string => {
  const apiKey = process.env.EXPO_PUBLIC_KAKAO_JAVASCRIPT_KEY || process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY;

  // 마커 색상 매핑
  const markerColorMap: Record<string, string> = {
    red: '#FF0000',
    blue: '#0000FF',
    yellow: '#FFFF00',
    green: '#00FF00',
  };

  // 마커 HTML 생성
  const markersHTML = markers
    .map((marker, index) => {
      const color = markerColorMap[marker.color || 'red'];
      return `
        {
          title: '${marker.title}',
          latlng: new kakao.maps.LatLng(${marker.lat}, ${marker.lng}),
          color: '${color}'
        }
      `;
    })
    .join(',');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
        <script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}"></script>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          html, body {
            width: 100%;
            height: 100%;
          }
          #map {
            width: 100%;
            height: 100%;
          }
          .custom-info-window {
            background: white;
            border: 2px solid #007AFF;
            border-radius: 8px;
            padding: 8px 12px;
            font-size: 13px;
            font-weight: 600;
            color: #333;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          function createMarkerImage(color) {
            const imageSize = new kakao.maps.Size(40, 40);
            const imageOption = { offset: new kakao.maps.Point(20, 40) };
            return new kakao.maps.MarkerImage(
              'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><circle cx="20" cy="15" r="12" fill="' + color + '"/><path d="M20 27 L10 40 L30 40 Z" fill="' + color + '"/></svg>',
              imageSize,
              imageOption
            );
          }

          function initMap() {
            try {
              const container = document.getElementById('map');
              if (!container) {
                console.error('Map container not found');
                return;
              }

              const options = {
                center: new kakao.maps.LatLng(${centerLat}, ${centerLng}),
                level: ${zoom}
              };
              const map = new kakao.maps.Map(container, options);

              // 마커 데이터
              const markersData = [${markersHTML}];

              // 마커 생성 및 지도에 추가
              markersData.forEach((data) => {
                const marker = new kakao.maps.Marker({
                  position: data.latlng,
                  title: data.title,
                  image: createMarkerImage(data.color)
                });
                marker.setMap(map);

                // 인포윈도우
                const infowindow = new kakao.maps.InfoWindow({
                  content: '<div class="custom-info-window">' + data.title + '</div>'
                });

                // 마커에 마우스 오버 이벤트
                kakao.maps.event.addListener(marker, 'mouseover', function() {
                  infowindow.open(map, marker);
                });

                // 마커에 마우스 아웃 이벤트
                kakao.maps.event.addListener(marker, 'mouseout', function() {
                  infowindow.close();
                });
              });

              console.log('Map initialized successfully with ' + markersData.length + ' markers');
            } catch (error) {
              console.error('Error initializing map:', error);
            }
          }

          // 카카오맵 SDK 로드 확인 후 초기화
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initMap);
          } else {
            // 이미 로드됨 (WebView의 경우 대부분 여기에 해당)
            setTimeout(initMap, 100);
          }
        </script>
      </body>
    </html>
  `;
};

export const KakaoMapView: React.FC<KakaoMapViewProps> = ({
  markers,
  centerLat = 37.5665,  // 서울시청 위도
  centerLng = 126.9780, // 서울시청 경도
  height = 300,
  zoom = 5,
}) => {
  const mapHTML = useMemo(
    () => generateMapHTML(markers, centerLat, centerLng, zoom),
    [markers, centerLat, centerLng, zoom]
  );

  return (
    <Container>
      <WebView
        source={{ html: mapHTML }}
        style={{ height }}
        scrollEnabled={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState
        scalesPageToFit={false}
        renderLoading={() => (
          <LoadingContainer height={height}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </LoadingContainer>
        )}
        onError={(error) => console.log('WebView Error:', error)}
      />
    </Container>
  );
};

export default KakaoMapView;
