/**
 * Google Maps Directions API 서비스
 *
 * 실제 도로를 따라가는 경로 좌표를 가져옵니다.
 *
 * 헌법 준수:
 * - AGENTS.md [제3장]: 데이터 페칭은 React Query를 통해 관리
 */

/**
 * Google Maps Routes API 응답 타입
 */
interface RoutesResponse {
  routes: Array<{
    legs: Array<{
      steps: Array<{
        polyline: {
          encodedPolyline: string; // Routes API는 encodedPolyline 사용
        };
      }>;
      polyline?: {
        encodedPolyline: string;
      };
    }>;
    polyline?: {
      encodedPolyline: string;
    };
  }>;
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

/**
 * 좌표 보간 (ZERO_RESULTS 대체용)
 * 
 * @param from 시작 좌표
 * @param to 종료 좌표
 * @param points 보간할 점의 개수
 * @returns 보간된 좌표 배열
 */
function interpolateCoordinates(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  points: number = 10
): Array<{ lat: number; lng: number }> {
  const coords: Array<{ lat: number; lng: number }> = [];
  for (let i = 0; i <= points; i++) {
    const ratio = i / points;
    coords.push({
      lat: from.lat + (to.lat - from.lat) * ratio,
      lng: from.lng + (to.lng - from.lng) * ratio,
    });
  }
  return coords;
}

/**
 * Polyline 디코딩 (Google Maps 인코딩 형식)
 * 
 * @param encoded 인코딩된 polyline 문자열
 * @returns 좌표 배열 [{ lat, lng }]
 */
function decodePolyline(encoded: string): Array<{ lat: number; lng: number }> {
  const poly: Array<{ lat: number; lng: number }> = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    poly.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return poly;
}

/**
 * Google Maps Routes API를 사용하여 경로 좌표 가져오기
 * Routes API는 Directions API보다 더 정확하고 대중교통 경로를 지원합니다.
 *
 * @param origin 출발지 좌표 { lat, lng }
 * @param destination 도착지 좌표 { lat, lng }
 * @param waypoints 경유지 좌표 배열 (선택)
 * @returns 경로 좌표 배열
 */
export async function getDirectionsRoute(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  waypoints?: Array<{ lat: number; lng: number }>
): Promise<Array<{ lat: number; lng: number }>> {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY || 
                 process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY;

  if (!apiKey) {
    console.warn('[Directions Service] Google Maps API key not found');
    return [origin, destination];
  }

  try {
    // 거리 계산 (하버사인 공식)
    const R = 6371; // 지구 반지름 (km)
    const dLat = (destination.lat - origin.lat) * Math.PI / 180;
    const dLng = (destination.lng - origin.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(origin.lat * Math.PI / 180) * Math.cos(destination.lat * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = R * c;
    
    // 거리가 너무 가까우면 (100m 이하) 보간 사용
    if (distanceKm < 0.1) {
      console.warn(`[Directions Service] Distance too close (${(distanceKm * 1000).toFixed(0)}m), using interpolation`);
      return interpolateCoordinates(origin, destination, Math.max(5, Math.ceil(distanceKm * 50)));
    }

    // Routes API는 POST 요청 사용
    const url = `https://routes.googleapis.com/directions/v2:computeRoutes`;
    
    // 단순 경로부터: 출발지 → 도착지
    const travelMode = waypoints && waypoints.length > 0 ? 'DRIVE' : (distanceKm < 1 ? 'WALK' : 'DRIVE');
    
    // Routes API 요청 본문 구성 (문서 참고)
    const requestBody: any = {
      origin: {
        location: {
          latLng: {
            latitude: origin.lat,
            longitude: origin.lng,
          },
        },
      },
      destination: {
        location: {
          latLng: {
            latitude: destination.lat,
            longitude: destination.lng,
          },
        },
      },
      travelMode: travelMode,
      // WALK/BICYCLE 모드에서는 routingPreference 설정 불가
      ...(travelMode === 'DRIVE' ? { routingPreference: 'TRAFFIC_AWARE' } : {}),
      computeAlternativeRoutes: false,
      polylineEncoding: 'ENCODED_POLYLINE',
      polylineQuality: 'HIGH_QUALITY', // 상세한 경로를 위해
    };

    // 경유지 추가 (최대 25개)
    if (waypoints && waypoints.length > 0 && travelMode === 'DRIVE') {
      requestBody.intermediates = waypoints.slice(0, 25).map(wp => ({
        location: {
          latLng: {
            latitude: wp.lat,
            longitude: wp.lng,
          },
        },
      }));
    }

    // 필드 마스크: 더 넓은 범위로 요청 (경로 정보 포함)
    const fieldMask = 'routes.polyline,routes.legs.polyline,routes.legs.steps.polyline,routes.duration,routes.distanceMeters';

    console.log(`[Directions Service] 🔵 Routes API 요청 시작 (mode: ${travelMode}, distance: ${distanceKm.toFixed(2)}km, waypoints: ${waypoints?.length || 0})...`);
    console.log(`[Directions Service] 🔵 API Key 존재 여부:`, !!apiKey);
    console.log(`[Directions Service] 🔵 Request URL:`, url);
    console.log(`[Directions Service] 🔵 Request body:`, JSON.stringify(requestBody, null, 2));
    console.log(`[Directions Service] 🔵 Field mask:`, fieldMask);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': fieldMask,
      },
      body: JSON.stringify(requestBody),
    });

    console.log('[Directions Service] 🔵 Routes API HTTP 상태:', response.status, response.statusText);
    console.log('[Directions Service] 🔵 Routes API 응답 헤더:', {
      'content-type': response.headers.get('content-type'),
      'x-goog-api-version': response.headers.get('x-goog-api-version'),
      'x-goog-request-params': response.headers.get('x-goog-request-params'),
    });
    
    const responseText = await response.text();
    console.log('[Directions Service] 🔵 Routes API 응답 본문 (raw):', responseText);
    console.log('[Directions Service] 🔵 Routes API 응답 본문 길이:', responseText.length);
    
    if (!response.ok) {
      console.error('[Directions Service] ❌ Routes API HTTP error:', response.status, response.statusText);
      console.error('[Directions Service] ❌ Routes API 응답 본문:', responseText);
      
      // HTTP 에러 응답도 JSON으로 파싱 시도
      try {
        const errorData = JSON.parse(responseText);
        console.error('[Directions Service] ❌ Routes API 에러 상세:', JSON.stringify(errorData, null, 2));
      } catch (e) {
        // 파싱 실패는 무시
      }
      
      // Routes API 실패 시 Directions API로 fallback
      return await getDirectionsRouteFallback(origin, destination, waypoints, distanceKm);
    }
    
    let data: RoutesResponse;
    try {
      if (!responseText || responseText.trim() === '' || responseText === '{}') {
        console.error('[Directions Service] ❌ Routes API 응답이 비어있음!');
        console.error('[Directions Service] ❌ HTTP 상태:', response.status);
        console.error('[Directions Service] ❌ 응답 헤더:', Object.fromEntries(response.headers.entries()));
        console.error('[Directions Service] ❌ API 키 확인 필요 또는 Routes API 활성화 필요');
        return await getDirectionsRouteFallback(origin, destination, waypoints, distanceKm);
      }
      
      data = JSON.parse(responseText);
      console.log('[Directions Service] 🔵 Routes API 응답 파싱 성공:', {
        hasRoutes: !!data.routes,
        routesCount: data.routes?.length || 0,
        hasError: !!data.error,
        error: data.error,
      });
    } catch (parseError) {
      console.error('[Directions Service] ❌ Routes API 응답 파싱 실패:', parseError);
      console.error('[Directions Service] ❌ 응답 본문:', responseText);
      return await getDirectionsRouteFallback(origin, destination, waypoints, distanceKm);
    }

    console.log('[Directions Service] 🔵 Routes API 응답 구조 분석:', {
      hasError: !!data.error,
      hasRoutes: !!data.routes,
      routesCount: data.routes?.length || 0,
      error: data.error,
      fullResponse: JSON.stringify(data, null, 2).substring(0, 500), // 처음 500자만
    });

    if (data.error) {
      const errorMsg = JSON.stringify(data.error);
      console.error('[Directions Service] ❌ Routes API error:', errorMsg);
      console.error('[Directions Service] ❌ 전체 응답:', JSON.stringify(data, null, 2));
      
      // Routes API 실패 시 Directions API로 fallback
      return await getDirectionsRouteFallback(origin, destination, waypoints, distanceKm);
    }

    if (!data.routes || data.routes.length === 0) {
      console.error('[Directions Service] ❌ Routes API: No routes returned');
      console.error('[Directions Service] ❌ 전체 응답:', JSON.stringify(data, null, 2));
      
      // Routes API 실패 시 Directions API로 fallback
      return await getDirectionsRouteFallback(origin, destination, waypoints, distanceKm);
    }

    // Routes API 응답에서 polyline 추출
    const allCoords: Array<{ lat: number; lng: number }> = [];
    const route = data.routes[0];
    
    console.log('[Directions Service] 🔵 Route 구조 분석:', {
      hasRoute: !!route,
      hasLegs: !!(route?.legs),
      legsCount: route?.legs?.length || 0,
      hasPolyline: !!(route?.polyline),
      routeKeys: route ? Object.keys(route) : [],
    });
    
    // 1순위: 각 leg의 steps에서 polyline 추출 (가장 상세한 경로)
    if (route.legs && route.legs.length > 0) {
      console.log('[Directions Service] 🔵 Legs 처리 시작:', route.legs.length, 'legs');
      route.legs.forEach((leg: any, legIdx: number) => {
        console.log(`[Directions Service] 🔵 Leg ${legIdx}:`, {
          hasSteps: !!(leg.steps),
          stepsCount: leg.steps?.length || 0,
          hasPolyline: !!(leg.polyline),
          legKeys: Object.keys(leg),
        });
        
        if (leg.steps && Array.isArray(leg.steps)) {
          leg.steps.forEach((step: any, stepIdx: number) => {
            // Routes API는 encodedPolyline 사용
            if (step.polyline && step.polyline.encodedPolyline) {
              const stepCoords = decodePolyline(step.polyline.encodedPolyline);
              console.log(`[Directions Service] 🔵 Leg ${legIdx} Step ${stepIdx}: ${stepCoords.length}개 좌표 추출`);
              
              // 중복 제거
              if (allCoords.length > 0) {
                const lastCoord = allCoords[allCoords.length - 1];
                const firstStepCoord = stepCoords[0];
                if (Math.abs(lastCoord.lat - firstStepCoord.lat) < 0.00001 && 
                    Math.abs(lastCoord.lng - firstStepCoord.lng) < 0.00001) {
                  allCoords.push(...stepCoords.slice(1));
                } else {
                  allCoords.push(...stepCoords);
                }
              } else {
                allCoords.push(...stepCoords);
              }
            } else {
              console.warn(`[Directions Service] ⚠️ Leg ${legIdx} Step ${stepIdx}: polyline 없음`);
            }
          });
        }
        
        // 2순위: leg의 polyline 확인 (steps가 없을 경우)
        if (leg.polyline && leg.polyline.encodedPolyline && allCoords.length === 0) {
          const legCoords = decodePolyline(leg.polyline.encodedPolyline);
          allCoords.push(...legCoords);
          console.log(`[Directions Service] 🔵 Leg ${legIdx} polyline 사용: ${legCoords.length}개 좌표`);
        }
      });
    }
    
    // 3순위: route의 전체 polyline 사용 (fallback)
    if (allCoords.length === 0 && route.polyline) {
      console.log('[Directions Service] 🔵 Route polyline 확인:', {
        hasEncodedPolyline: !!(route.polyline.encodedPolyline),
        polylineKeys: Object.keys(route.polyline),
      });
      
      if (route.polyline.encodedPolyline) {
        const routeCoords = decodePolyline(route.polyline.encodedPolyline);
        allCoords.push(...routeCoords);
        console.log('[Directions Service] 🔵 Route polyline 사용:', routeCoords.length, '개 좌표');
      } else {
        console.warn('[Directions Service] ⚠️ Route polyline에 encodedPolyline 없음');
      }
    }

    console.log('[Directions Service] ✅ Routes API fetched:', {
      origin: `${origin.lat},${origin.lng}`,
      destination: `${destination.lat},${destination.lng}`,
      waypointsCount: waypoints?.length || 0,
      coordsCount: allCoords.length,
    });

    return allCoords.length > 0 ? allCoords : [origin, destination];
  } catch (error) {
    console.error('[Directions Service] Error fetching Routes API:', error);
    // 에러 발생 시 Directions API로 fallback
    return await getDirectionsRouteFallback(origin, destination, waypoints);
  }
}

/**
 * Directions API로 fallback (Routes API 실패 시)
 */
async function getDirectionsRouteFallback(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  waypoints?: Array<{ lat: number; lng: number }>,
  distanceKm?: number
): Promise<Array<{ lat: number; lng: number }>> {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY || 
                 process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY;

  if (!apiKey) {
    return [origin, destination];
  }

  try {
    let waypointsParam = '';
    if (waypoints && waypoints.length > 0) {
      const waypointsStr = waypoints.map(wp => `${wp.lat},${wp.lng}`).join('|');
      waypointsParam = `&waypoints=${waypointsStr}`;
    }

    const mode = waypoints && waypoints.length > 0 ? 'driving' : 'walking';
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}${waypointsParam}&mode=${mode}&key=${apiKey}`;

    console.log(`[Directions Service] Fallback to Directions API (mode: ${mode})...`);
    const response = await fetch(url);
    const data: any = await response.json();

    if (data.status !== 'OK' || !data.routes || data.routes.length === 0) {
      console.warn('[Directions Service] Directions API also failed:', data.status);
      // 보간 사용
      const dist = distanceKm || 1;
      return interpolateCoordinates(origin, destination, Math.max(10, Math.ceil(dist * 20)));
    }

    // Directions API 응답 처리
    const allCoords: Array<{ lat: number; lng: number }> = [];
    const route = data.routes[0];
    
    if (route.legs && route.legs.length > 0) {
      route.legs.forEach((leg: any) => {
        if (leg.steps && Array.isArray(leg.steps)) {
          leg.steps.forEach((step: any) => {
            if (step.polyline && step.polyline.points) {
              const stepCoords = decodePolyline(step.polyline.points);
              if (allCoords.length > 0) {
                const lastCoord = allCoords[allCoords.length - 1];
                const firstStepCoord = stepCoords[0];
                if (Math.abs(lastCoord.lat - firstStepCoord.lat) < 0.00001 && 
                    Math.abs(lastCoord.lng - firstStepCoord.lng) < 0.00001) {
                  allCoords.push(...stepCoords.slice(1));
                } else {
                  allCoords.push(...stepCoords);
                }
              } else {
                allCoords.push(...stepCoords);
              }
            }
          });
        }
      });
    }

    if (allCoords.length === 0 && route.overview_polyline && route.overview_polyline.points) {
      const overviewCoords = decodePolyline(route.overview_polyline.points);
      allCoords.push(...overviewCoords);
    }

    console.log(`[Directions Service] ✅ Directions API fallback: ${allCoords.length} coordinates`);
    return allCoords.length > 0 ? allCoords : [origin, destination];
  } catch (error) {
    console.error('[Directions Service] Directions API fallback error:', error);
    const dist = distanceKm || 1;
    return interpolateCoordinates(origin, destination, Math.max(10, Math.ceil(dist * 20)));
  }
}

/**
 * ODSAY 경로 데이터를 기반으로 실제 도로 경로 가져오기
 *
 * @param subPath ODSAY subPath 배열 (없을 수 있음)
 * @param origin 출발지 좌표
 * @param destination 도착지 좌표
 * @returns 경로 좌표 배열
 */
export async function getRouteFromOdsayPath(
  subPath: Array<any> | null | undefined,
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<Array<{ lat: number; lng: number }>> {
  // subPath가 없거나 비어있으면 출발지-도착지 간 직접 경로 가져오기
  if (!subPath || !Array.isArray(subPath) || subPath.length === 0) {
    return await getDirectionsRoute(origin, destination);
  }

  // 🆕 각 세그먼트를 순서대로 처리하여 실제 도로/노선 경로 가져오기
  // 지하철/버스 구간: 정류장/역 좌표들을 실제 도로로 연결
  // 도보 구간: 실제 도로 경로로 연결
  const allRouteCoords: Array<{ lat: number; lng: number }> = [];

  console.log(`[getRouteFromOdsayPath] Processing ${subPath.length} segments to build route...`);
  
  // 모든 세그먼트의 trafficType 확인
  const trafficTypes = subPath.map((seg: any) => seg.trafficType);
  console.log('[getRouteFromOdsayPath] Traffic types:', trafficTypes);

  for (let segIdx = 0; segIdx < subPath.length; segIdx++) {
    const segment = subPath[segIdx];
    const trafficType = segment.trafficType;
    const isFirstSegment = segIdx === 0;
    const isLastSegment = segIdx === subPath.length - 1;

    let segFrom: { lat: number; lng: number } | null = null;
    let segTo: { lat: number; lng: number } | null = null;
    let segmentStops: Array<{ lat: number; lng: number }> = [];

    if (trafficType === 3) {
      // 도보 세그먼트: 앞뒤 세그먼트의 좌표 사용
      if (isFirstSegment) {
        segFrom = origin;
        if (segIdx + 1 < subPath.length) {
          const nextSegment = subPath[segIdx + 1];
          if (nextSegment.startX && nextSegment.startY) {
            segTo = { lat: parseFloat(nextSegment.startY), lng: parseFloat(nextSegment.startX) };
          }
        }
      } else if (isLastSegment) {
        const prevSegment = subPath[segIdx - 1];
        if (prevSegment.endX && prevSegment.endY) {
          segFrom = { lat: parseFloat(prevSegment.endY), lng: parseFloat(prevSegment.endX) };
        }
        segTo = destination;
      } else {
        const prevSegment = subPath[segIdx - 1];
        const nextSegment = subPath[segIdx + 1];
        if (prevSegment.endX && prevSegment.endY && nextSegment.startX && nextSegment.startY) {
          segFrom = { lat: parseFloat(prevSegment.endY), lng: parseFloat(prevSegment.endX) };
          segTo = { lat: parseFloat(nextSegment.startY), lng: parseFloat(nextSegment.startX) };
        }
      }
    } else {
      // 버스/지하철 세그먼트: 시작점, 경유지, 종료점 수집
      console.log(`[getRouteFromOdsayPath] Segment ${segIdx} (${trafficType === 1 ? 'SUBWAY' : 'BUS'}) 원본 데이터:`, {
        hasStartX: !!segment.startX,
        hasStartY: !!segment.startY,
        hasEndX: !!segment.endX,
        hasEndY: !!segment.endY,
        hasPassStopList: !!segment.passStopList,
        passStopListType: Array.isArray(segment.passStopList) ? 'array' : typeof segment.passStopList,
        passStopListLength: Array.isArray(segment.passStopList) ? segment.passStopList.length : 'N/A',
        segmentKeys: Object.keys(segment),
      });

      if (segment.startX && segment.startY) {
        segFrom = { lat: parseFloat(segment.startY), lng: parseFloat(segment.startX) };
        segmentStops.push(segFrom);
        console.log(`[getRouteFromOdsayPath] Segment ${segIdx}: 시작점 추가 - lat: ${segFrom.lat}, lng: ${segFrom.lng}`);
      }

      // 경유 정류장/역 추가
      // ODSAY API 응답에서 passStopList는 객체일 수도 있고 배열일 수도 있음
      console.log(`[getRouteFromOdsayPath] Segment ${segIdx}: passStopList 전체 구조:`, JSON.stringify(segment.passStopList, null, 2));
      
      let passStopArray: any[] = [];
      
      if (Array.isArray(segment.passStopList)) {
        // 배열인 경우
        passStopArray = segment.passStopList;
        console.log(`[getRouteFromOdsayPath] Segment ${segIdx}: passStopList는 배열 - ${passStopArray.length}개 정류장`);
      } else if (segment.passStopList && typeof segment.passStopList === 'object') {
        // 객체인 경우 - 여러 가능성 확인
        // 1. 객체 안에 배열이 있는 경우 (예: {stations: [...]})
        // 2. 객체의 값들이 배열인 경우
        // 3. 객체 자체가 정류장 정보인 경우
        const passStopObj = segment.passStopList as any;
        const objKeys = Object.keys(passStopObj);
        console.log(`[getRouteFromOdsayPath] Segment ${segIdx}: passStopList는 객체, 키들:`, objKeys);
        
        // 객체의 값 중 배열 찾기
        for (const key of objKeys) {
          if (Array.isArray(passStopObj[key])) {
            console.log(`[getRouteFromOdsayPath] Segment ${segIdx}: 키 "${key}"에 배열 발견 - ${passStopObj[key].length}개`);
            passStopArray = passStopObj[key];
            break;
          }
        }
        
        // 배열을 찾지 못한 경우, 객체 자체를 배열로 변환 시도
        if (passStopArray.length === 0 && objKeys.length > 0) {
          // 객체가 정류장 정보 하나일 수도 있음
          if (passStopObj.x && passStopObj.y) {
            passStopArray = [passStopObj];
            console.log(`[getRouteFromOdsayPath] Segment ${segIdx}: passStopList가 단일 정류장 객체로 파싱됨`);
          } else {
            // 객체의 값들을 배열로 변환
            passStopArray = Object.values(passStopObj).filter((v: any) => v && typeof v === 'object' && (v.x || v.y));
            console.log(`[getRouteFromOdsayPath] Segment ${segIdx}: passStopList 객체의 값들을 배열로 변환 - ${passStopArray.length}개`);
          }
        }
      }
      
      // 경유 정류장 좌표 추출
      if (passStopArray.length > 0) {
        passStopArray.forEach((stop: any, stopIdx: number) => {
          console.log(`[getRouteFromOdsayPath] Segment ${segIdx} Stop ${stopIdx}:`, {
            hasX: !!stop.x,
            hasY: !!stop.y,
            x: stop.x,
            y: stop.y,
            stopKeys: Object.keys(stop),
            stopType: typeof stop,
          });
          
          // 좌표 추출 (x/y 또는 longitude/latitude 등 다양한 형식 지원)
          let lat: number | null = null;
          let lng: number | null = null;
          
          if (stop.y && stop.x) {
            // ODSAY 형식: y=위도, x=경도
            lat = parseFloat(stop.y);
            lng = parseFloat(stop.x);
          } else if (stop.lat && stop.lng) {
            // 일반 형식: lat=위도, lng=경도
            lat = parseFloat(stop.lat);
            lng = parseFloat(stop.lng);
          } else if (stop.latitude && stop.longitude) {
            // Google Maps 형식
            lat = parseFloat(stop.latitude);
            lng = parseFloat(stop.longitude);
          }
          
          if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
            segmentStops.push({ lat, lng });
            console.log(`[getRouteFromOdsayPath] Segment ${segIdx}: 경유지 ${stopIdx} 추가 - lat: ${lat}, lng: ${lng}`);
          } else {
            console.warn(`[getRouteFromOdsayPath] Segment ${segIdx} Stop ${stopIdx}: 좌표 추출 실패`, stop);
          }
        });
      } else {
        console.warn(`[getRouteFromOdsayPath] Segment ${segIdx}: ⚠️ passStopList에서 정류장을 추출하지 못함!`);
      }

      if (segment.endX && segment.endY) {
        segTo = { lat: parseFloat(segment.endY), lng: parseFloat(segment.endX) };
        segmentStops.push(segTo);
        console.log(`[getRouteFromOdsayPath] Segment ${segIdx}: 종료점 추가 - lat: ${segTo.lat}, lng: ${segTo.lng}`);
      }

      console.log(`[getRouteFromOdsayPath] Segment ${segIdx}: 최종 정류장 개수 - ${segmentStops.length}개`);
      if (segmentStops.length > 0) {
        console.log(`[getRouteFromOdsayPath] Segment ${segIdx}: 정류장 좌표:`, segmentStops);
      }
    }

    // 세그먼트 경로 가져오기
    if (segFrom && segTo) {
      if (trafficType === 3) {
        // 도보: 실제 도로 경로
        const latDiff = Math.abs(segTo.lat - segFrom.lat);
        const lngDiff = Math.abs(segTo.lng - segFrom.lng);
        const distanceKm = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111;
        
        console.log(`[getRouteFromOdsayPath] Segment ${segIdx} (WALK): Fetching walking route (distance: ${distanceKm.toFixed(2)}km)...`);
        try {
          let walkRoute = await getDirectionsRoute(segFrom, segTo);
          
          // ZERO_RESULTS이거나 좌표가 2개 이하면 보간 사용
          if (walkRoute.length <= 2) {
            console.warn(`[getRouteFromOdsayPath] WALK segment ${segIdx}: Only ${walkRoute.length} coords, using interpolation`);
            const interpolatedPoints = Math.max(10, Math.ceil(distanceKm * 30)); // 도보는 더 많은 점
            walkRoute = interpolateCoordinates(segFrom, segTo, interpolatedPoints);
            console.log(`[getRouteFromOdsayPath] ✅ Interpolated ${walkRoute.length} coordinates for WALK`);
          }
          
          if (walkRoute.length > 0) {
            // 중복 제거
            if (allRouteCoords.length > 0) {
              const lastCoord = allRouteCoords[allRouteCoords.length - 1];
              const firstCoord = walkRoute[0];
              if (Math.abs(lastCoord.lat - firstCoord.lat) < 0.0001 && 
                  Math.abs(lastCoord.lng - firstCoord.lng) < 0.0001) {
                allRouteCoords.push(...walkRoute.slice(1));
              } else {
                allRouteCoords.push(...walkRoute);
              }
            } else {
              allRouteCoords.push(...walkRoute);
            }
            console.log(`[getRouteFromOdsayPath] ✅ WALK segment ${segIdx}: ${walkRoute.length} coordinates`);
          }
        } catch (error) {
          console.warn(`[getRouteFromOdsayPath] Failed WALK segment ${segIdx}:`, error);
          // 에러 시 보간 사용
          const interpolatedPoints = Math.max(10, Math.ceil(distanceKm * 30));
          const interpolated = interpolateCoordinates(segFrom, segTo, interpolatedPoints);
          allRouteCoords.push(...interpolated);
        }
      } else {
        // 버스/지하철: 정류장/역들을 waypoints로 사용하여 실제 도로로 한 번에 연결
        // ODSAY에서 경로 정보를 가져왔으므로, Routes API는 단순히 정류장들을 실제 도로로 연결만 해주면 됨
        console.log(`[getRouteFromOdsayPath] Segment ${segIdx} (${trafficType === 1 ? 'SUBWAY' : 'BUS'}): ${segmentStops.length} stops`);
        
        if (segmentStops.length >= 2) {
          const firstStop = segmentStops[0];
          const lastStop = segmentStops[segmentStops.length - 1];
          const waypoints = segmentStops.slice(1, -1); // 중간 정류장들만 waypoints로
          
          console.log(`[getRouteFromOdsayPath] Calling Routes API: ${segmentStops.length} stops (waypoints: ${waypoints.length})`);
          
          try {
            // 시작점-중간정류장들-끝점을 한 번에 Routes API로 연결
            // 정류장이 2개뿐이면 waypoints 없이 직접 연결
            const transitRoute = await getDirectionsRoute(
              firstStop, 
              lastStop, 
              waypoints.length > 0 ? waypoints : undefined
            );
            
            if (transitRoute.length > 2) {
              // 중복 제거
              if (allRouteCoords.length > 0) {
                const lastCoord = allRouteCoords[allRouteCoords.length - 1];
                const firstCoord = transitRoute[0];
                if (Math.abs(lastCoord.lat - firstCoord.lat) < 0.0001 && 
                    Math.abs(lastCoord.lng - firstCoord.lng) < 0.0001) {
                  allRouteCoords.push(...transitRoute.slice(1));
                } else {
                  allRouteCoords.push(...transitRoute);
                }
              } else {
                allRouteCoords.push(...transitRoute);
              }
              console.log(`[getRouteFromOdsayPath] ✅ ${trafficType === 1 ? 'SUBWAY' : 'BUS'} segment ${segIdx}: Added ${transitRoute.length} coordinates through ${segmentStops.length} stops`);
            } else {
              // ⚠️ Routes API가 실패했지만, 정류장 좌표는 있으므로 각 정류장 사이를 개별적으로 Directions API 호출
              console.warn(`[getRouteFromOdsayPath] ⚠️ Routes API returned only ${transitRoute.length} coords for ${trafficType === 1 ? 'SUBWAY' : 'BUS'} segment ${segIdx}`);
              console.warn(`[getRouteFromOdsayPath] ⚠️ ${segmentStops.length}개 정류장 사이를 개별적으로 Directions API 호출 시도...`);
              
              // 정류장들 사이를 개별적으로 Directions API 호출 (waypoints 없이)
              for (let i = 0; i < segmentStops.length - 1; i++) {
                const from = segmentStops[i];
                const to = segmentStops[i + 1];
                
                // 거리 계산
                const latDiff = Math.abs(to.lat - from.lat);
                const lngDiff = Math.abs(to.lng - from.lng);
                const distanceKm = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111;
                
                try {
                  // 각 정류장 사이를 개별적으로 Directions API 호출 (waypoints 없이)
                  console.log(`[getRouteFromOdsayPath] Stop ${i} → ${i + 1}: Calling Directions API (distance: ${distanceKm.toFixed(2)}km)...`);
                  const segmentRoute = await getDirectionsRouteFallback(from, to, undefined, distanceKm);
                  
                  if (segmentRoute.length > 2) {
                    // API 성공
                    if (i === 0) {
                      allRouteCoords.push(...segmentRoute);
                    } else {
                      // 중복 제거
                      const lastCoord = allRouteCoords[allRouteCoords.length - 1];
                      const firstCoord = segmentRoute[0];
                      if (Math.abs(lastCoord.lat - firstCoord.lat) < 0.0001 && 
                          Math.abs(lastCoord.lng - firstCoord.lng) < 0.0001) {
                        allRouteCoords.push(...segmentRoute.slice(1));
                      } else {
                        allRouteCoords.push(...segmentRoute);
                      }
                    }
                    console.log(`[getRouteFromOdsayPath] ✅ Stop ${i} → ${i + 1}: ${segmentRoute.length} coordinates`);
                  } else {
                    // API 실패 시 보간 사용
                    console.warn(`[getRouteFromOdsayPath] ⚠️ Stop ${i} → ${i + 1}: API failed (${segmentRoute.length} coords), using interpolation`);
                    const interpolatedPoints = Math.max(5, Math.ceil(distanceKm * 20));
                    const interpolated = interpolateCoordinates(from, to, interpolatedPoints);
                    if (i === 0) {
                      allRouteCoords.push(...interpolated);
                    } else {
                      allRouteCoords.push(...interpolated.slice(1)); // 중복 제거
                    }
                  }
                } catch (error) {
                  console.warn(`[getRouteFromOdsayPath] ⚠️ Stop ${i} → ${i + 1}: Error, using interpolation`, error);
                  const interpolatedPoints = Math.max(5, Math.ceil(distanceKm * 20));
                  const interpolated = interpolateCoordinates(from, to, interpolatedPoints);
                  if (i === 0) {
                    allRouteCoords.push(...interpolated);
                  } else {
                    allRouteCoords.push(...interpolated.slice(1)); // 중복 제거
                  }
                }
              }
              
              console.log(`[getRouteFromOdsayPath] ✅ ${trafficType === 1 ? 'SUBWAY' : 'BUS'} segment ${segIdx}: Added ${allRouteCoords.length} coordinates through ${segmentStops.length} stops (individual API calls)`);
            }
          } catch (error) {
            console.warn(`[getRouteFromOdsayPath] ⚠️ Error fetching route for ${trafficType === 1 ? 'SUBWAY' : 'BUS'} segment ${segIdx}:`, error);
            // 에러 시 정류장들을 보간으로 연결
            for (let i = 0; i < segmentStops.length - 1; i++) {
              const from = segmentStops[i];
              const to = segmentStops[i + 1];
              const interpolated = interpolateCoordinates(from, to, 10);
              if (i === 0) {
                allRouteCoords.push(...interpolated);
              } else {
                allRouteCoords.push(...interpolated.slice(1)); // 중복 제거
              }
            }
          }
        } else {
          // 정류장이 2개 미만이면 직접 연결
          if (segFrom && segTo) {
            allRouteCoords.push(segFrom, segTo);
          }
        }
      }
    }
  }

  console.log(`[getRouteFromOdsayPath] ✅ Final route: ${allRouteCoords.length} coordinates`);
  
  if (allRouteCoords.length === 0) {
    console.warn(`[getRouteFromOdsayPath] ⚠️ No route coordinates generated, using direct route`);
    return await getDirectionsRoute(origin, destination);
  }
  
  return allRouteCoords;
}

