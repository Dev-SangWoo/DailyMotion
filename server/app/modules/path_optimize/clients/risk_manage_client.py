"""
Risk Manage 모듈과의 통신을 위한 Service Interface

규칙: path_optimize 모듈은 risk_manage 모듈과 이 interface를 통해서만 통신합니다.

risk_manage 모듈의 책임 (AGENTS.md):
- 시민 리포트 기반의 위험 지역(침수, 정체, 교통사고 등) 관리
- 경로의 안전도 평가
- "세이프티 가드" 역할 (사용자에게 안전한 경로만 제시)

이 interface를 통해:
1. 경로의 안전도 확인 (위험 지역 통과 여부)
2. 특정 지역의 위험 지역 정보 조회 (PostGIS 공간 쿼리)
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional


class RiskManageService(ABC):
    """
    Risk Manage 모듈의 Service Layer Interface.

    모든 구현은 이 interface를 상속받아야 합니다.
    path_optimize는 구현체의 타입을 알 필요가 없습니다. (다형성)
    """

    @abstractmethod
    def check_route_safety(
        self,
        route_id: str,
        path_details: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        경로의 안전도를 확인합니다.

        추천하려는 경로가 시민 리포트 기반 위험 지역을 통과하는지 확인하고,
        안전 수준을 평가합니다.

        Args:
            route_id: 경로 ID (예: "route_123")
            path_details: 경로 상세 정보
                {
                    "segments": ["bus_146", "subway_2"],
                    "transfers": 1,
                    "stations": [
                        {"lat": 37.4979, "lng": 127.0276, "name": "강남역"},
                        {"lat": 37.4848, "lng": 127.0956, "name": "을지로입구"}
                    ]
                }

        Returns:
            {
                "route_id": str,
                "is_safe": bool,  # True=안전, False=위험 지역 통과
                "risk_level": str,  # "LOW" / "MEDIUM" / "HIGH" / "CRITICAL"
                "danger_zones": List[Dict],  # 통과하는 위험 지역 목록
                "warnings": List[str],  # 사용자에게 표시할 경고 메시지
                "is_available": bool,  # 서비스 가용성
                "message": Optional[str]
            }

        Note:
            - is_safe=False인 경로는 path_optimize에서 제시하지 않아야 함
            - risk_level이 "HIGH"이상이면 사용자에게 경고 메시지 표시
        """
        pass

    @abstractmethod
    def get_danger_zones(
        self,
        latitude: float,
        longitude: float,
        radius_meters: int = 500
    ) -> Dict[str, Any]:
        """
        특정 지역의 위험 지역 정보를 조회합니다.

        PostGIS의 ST_DWithin 등 공간 쿼리를 사용하여
        반경 내의 위험 지역을 조회합니다.

        Args:
            latitude: 위도 (37.0~38.0)
            longitude: 경도 (126.0~128.0)
            radius_meters: 검색 반경 (기본값: 500m)

        Returns:
            {
                "location": {"lat": float, "lng": float},
                "radius_meters": int,
                "danger_zones": [
                    {
                        "zone_id": str,  # "DANGER_001"
                        "type": str,  # "flooding" / "traffic_accident" / "congestion"
                        "severity": str,  # "LOW" / "MEDIUM" / "HIGH" / "CRITICAL"
                        "coordinates": {"lat": float, "lng": float},
                        "description": str,  # "을지로 교차로 심각 정체"
                        "report_count": int,  # 시민 리포트 개수
                        "last_updated": str,  # ISO 8601 형식
                        "expected_resolution": Optional[str]  # 예상 해소 시간
                    }
                ],
                "is_available": bool
            }

        Note:
            - PostGIS ST_Intersects 또는 ST_DWithin 사용
            - 시민 리포트 기반이므로 경고, 감지 지역 등 실시간 정보 포함
        """
        pass


class MockRiskManageService(RiskManageService):
    """
    Risk Manage 모듈의 Mock 구현.

    risk_manage 모듈이 없어도 path_optimize를 테스트할 수 있습니다.
    실제 risk_manage 모듈이 완성되면, 이 Mock을 RealRiskManageService로 교체하면 됩니다.
    """

    def __init__(self):
        """Mock 위험 지역 데이터 초기화"""
        self.mock_danger_zones = {
            # (lat, lng) 근처에 위험 지역이 있음
            (37.4979, 127.0276): {  # 강남역 근처
                "zone_id": "DANGER_001",
                "type": "flooding",
                "severity": "MEDIUM",
                "description": "강남역 지하상가 침수 주의"
            },
            (37.4848, 127.0956): {  # 을지로입구 근처
                "zone_id": "DANGER_002",
                "type": "traffic_accident",
                "severity": "HIGH",
                "description": "을지로 교차로 교통사고 발생"
            },
            (37.5665, 126.9780): {  # 서울 중심부
                "zone_id": "DANGER_003",
                "type": "congestion",
                "severity": "LOW",
                "description": "시청 주변 일반 정체"
            }
        }

    def check_route_safety(
        self,
        route_id: str,
        path_details: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Mock 구현: 경로의 안전도 확인"""

        # 경로에 포함된 역의 좌표를 확인
        stations = path_details.get("stations", [])
        danger_zones = []
        max_severity_level = 0  # 0=LOW, 1=MEDIUM, 2=HIGH, 3=CRITICAL

        severity_map = {"LOW": 0, "MEDIUM": 1, "HIGH": 2, "CRITICAL": 3}
        level_to_string = {0: "LOW", 1: "MEDIUM", 2: "HIGH", 3: "CRITICAL"}

        for station in stations:
            station_lat = station["lat"]
            station_lng = station["lng"]

            # 근처 위험 지역 확인 (Mock: 정확한 좌표 매칭)
            for (danger_lat, danger_lng), zone_info in self.mock_danger_zones.items():
                # 간단한 거리 계산 (완전한 Haversine은 아님)
                distance = ((station_lat - danger_lat) ** 2 + (station_lng - danger_lng) ** 2) ** 0.5
                if distance < 0.01:  # 대략 1km 이내
                    danger_zones.append({
                        "zone_id": zone_info["zone_id"],
                        "type": zone_info["type"],
                        "severity": zone_info["severity"],
                        "description": zone_info["description"],
                        "station": station["name"]
                    })
                    severity = severity_map.get(zone_info["severity"], 0)
                    max_severity_level = max(max_severity_level, severity)

        # 판정
        is_safe = max_severity_level <= 1  # HIGH 이상이면 위험
        risk_level = level_to_string[max_severity_level]
        warnings = []

        if max_severity_level >= 2:  # HIGH 이상
            warnings.append(f"경로상 위험 지역이 있습니다: {danger_zones[0]['description']}")

        return {
            "route_id": route_id,
            "is_safe": is_safe,
            "risk_level": risk_level,
            "danger_zones": danger_zones,
            "warnings": warnings,
            "is_available": True,
            "message": None if is_safe else "위험 지역을 통과합니다"
        }

    def get_danger_zones(
        self,
        latitude: float,
        longitude: float,
        radius_meters: int = 500
    ) -> Dict[str, Any]:
        """Mock 구현: 위험 지역 조회"""

        nearby_zones = []

        # 반경 내의 위험 지역 찾기 (간단한 거리 계산)
        for (danger_lat, danger_lng), zone_info in self.mock_danger_zones.items():
            distance = ((latitude - danger_lat) ** 2 + (longitude - danger_lng) ** 2) ** 0.5
            # 거리 수치 조정 (0.01 ≈ 1km, 따라서 0.005 = 500m)
            if distance < (radius_meters / 100000.0):
                nearby_zones.append({
                    "zone_id": zone_info["zone_id"],
                    "type": zone_info["type"],
                    "severity": zone_info["severity"],
                    "coordinates": {"lat": danger_lat, "lng": danger_lng},
                    "description": zone_info["description"],
                    "report_count": 5,  # Mock 데이터
                    "last_updated": "2025-11-15T10:30:00Z",
                    "expected_resolution": "2025-11-15T14:00:00Z"
                })

        return {
            "location": {"lat": latitude, "lng": longitude},
            "radius_meters": radius_meters,
            "danger_zones": nearby_zones,
            "is_available": True
        }