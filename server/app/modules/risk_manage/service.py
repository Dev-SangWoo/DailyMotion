"""
위험 관리 & 시민 리포트 서비스
위험 지역 관리 및 시민 리포트를 처리하는 비즈니스 로직입니다.
"""
from typing import List, Dict, Any, Optional
from app.services.disaster_alert_parser import (
    parse_excel_file,
    filter_alerts_by_date,
    filter_alerts_by_route,
)


class RiskManageService:
    """위험 관리 서비스 클래스"""
    
    def create_report(
        self,
        reporter_id: int,
        location: Dict[str, Any],
        risk_type: str,
        description: str
    ) -> Dict[str, Any]:
        """
        시민 리포트를 생성합니다.
        
        Args:
            reporter_id: 리포트 작성자 ID
            location: 위치 정보 (PostGIS Point)
            risk_type: 위험 유형
            description: 상세 설명
            
        Returns:
            생성된 리포트 정보
        """
        # TODO: 데이터베이스에 리포트 저장
        # TODO: 위험 지역 업데이트
        return {
            "report_id": 1,
            "status": "created",
            "location": location
        }
    
    def get_reports(
        self,
        filters: Dict[str, Any] = None
    ) -> List[Dict[str, Any]]:
        """
        리포트 목록을 조회합니다.
        
        Args:
            filters: 필터 조건 (위험 유형, 지역 등)
            
        Returns:
            리포트 목록
        """
        # TODO: 데이터베이스에서 리포트 조회
        # TODO: 필터 적용
        return []
    
    def get_risk_zones(
        self,
        bounds: Dict[str, Any] = None
    ) -> List[Dict[str, Any]]:
        """
        위험 지역을 조회합니다.
        
        Args:
            bounds: 조회 범위 (bounding box)
            
        Returns:
            위험 지역 목록 (PostGIS Geometry)
        """
        # TODO: PostGIS를 사용한 공간 쿼리
        # TODO: 리포트 데이터를 기반으로 위험 지역 계산
        return []
    
    def update_risk_zone(self, zone_id: int, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        위험 지역을 업데이트합니다.
        
        Args:
            zone_id: 위험 지역 ID
            data: 업데이트할 데이터
            
        Returns:
            업데이트된 위험 지역 정보
        """
        # TODO: 위험 지역 업데이트 로직
        return {
            "zone_id": zone_id,
            "status": "updated"
        }
    
    def get_disaster_alerts(
        self,
        route_coords: List[Dict[str, float]],
        radius_meters: float = 500,
        days: int = 21
    ) -> List[Dict[str, Any]]:
        """
        경로 근처의 재난 문자를 조회합니다.
        
        Args:
            route_coords: 경로 좌표 리스트 [{"lat": 37.5665, "lng": 126.9780}, ...]
            radius_meters: 반경 (미터, 기본값: 500m)
            days: 조회할 일수 (기본값: 21일 = 3주)
            
        Returns:
            재난 문자 리스트
        """
        # Excel 파일 파싱
        all_alerts = parse_excel_file()
        
        # 날짜 필터링 (3주 이내)
        date_filtered = filter_alerts_by_date(all_alerts, days=days)
        
        # 경로 근처 필터링
        route_filtered = filter_alerts_by_route(
            date_filtered,
            route_coords,
            radius_meters=radius_meters
        )
        
        return route_filtered
    
    def get_all_disaster_alerts(
        self,
        days: int = 30,
        limit: int = 1000
    ) -> List[Dict[str, Any]]:
        """
        전체 재난 문자를 조회합니다 (경로 필터링 없음, 날짜 필터링 적용).
        
        Args:
            days: 조회할 일수 (기본값: 30일 = 1개월)
            limit: 반환할 최대 개수 (기본값: 10개)
            
        Returns:
            재난 문자 리스트 (location 정보 포함, 최대 limit개)
        """
        # Excel 파일 파싱
        all_alerts = parse_excel_file()
        
        # 날짜 필터링 (최근 N일치만)
        from app.services.disaster_alert_parser import filter_alerts_by_date, get_region_coordinates
        date_filtered = filter_alerts_by_date(all_alerts, days=days)
        
        # location 정보 추가 (지역명을 좌표로 변환, 실패해도 재난 문자는 포함)
        alerts_with_location = []
        for alert in date_filtered[:limit]:
            alert_with_location = alert.copy()
            
            # 지역명이 있으면 좌표 변환 시도
            region = alert.get("region", "")
            if region:
                coords = get_region_coordinates(region)
                if coords:
                    alert_with_location["location"] = {
                        "lat": coords[0],
                        "lng": coords[1],
                    }
                    alert_with_location["hasAccurateLocation"] = True
                else:
                    # 좌표 변환 실패해도 재난 문자는 포함 (location은 None)
                    alert_with_location["location"] = None
                    alert_with_location["hasAccurateLocation"] = False
            else:
                alert_with_location["location"] = None
                alert_with_location["hasAccurateLocation"] = False
            
            alerts_with_location.append(alert_with_location)
        
        # 로그 출력: 재난 문자 데이터
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"[RiskManageService] 재난 문자 데이터 조회 완료: {len(alerts_with_location)}개")
        if alerts_with_location:
            logger.info(f"[RiskManageService] 첫 번째 재난 문자: ID={alerts_with_location[0].get('id')}, Type={alerts_with_location[0].get('type')}, Region={alerts_with_location[0].get('region')}, Date={alerts_with_location[0].get('date')}")
            logger.info(f"[RiskManageService] 재난 문자 지역 목록: {list(set([a.get('region', '') for a in alerts_with_location if a.get('region')]))}")
            logger.info(f"[RiskManageService] 재난 문자 샘플 (처음 5개):")
            for idx, alert in enumerate(alerts_with_location[:5], 1):
                logger.info(f"  [{idx}] ID: {alert.get('id')}, Type: {alert.get('type')}, Region: {alert.get('region')}, Date: {alert.get('date')}, Location: {alert.get('location')}")
        
        return alerts_with_location

