

"""
ODSAY API 클라이언트
경로 검색 API를 통해 대중교통 경로 정보 조회
"""

import aiohttp
import logging
import json
from typing import Optional, Dict, Any
from datetime import datetime
import os

logger = logging.getLogger(__name__)


class OdsayAPIClient:
    """ODSAY 경로 검색 API 클라이언트"""

    BASE_URL = "https://api.odsay.com/v1/api"

    def __init__(self, api_key: Optional[str] = None):
        """
        초기화

        Args:
            api_key: ODSAY API Key (기본값: 환경변수 ODSAY_API_KEY)

        Raises:
            ValueError: API Key가 없을 경우
        """
        self.api_key = api_key or os.getenv("ODSAY_API_KEY")
        if not self.api_key:
            raise ValueError("ODSAY_API_KEY 환경변수가 설정되지 않았습니다")
        logger.info(f"✅ OdsayAPIClient 초기화 완료 (Key: {self.api_key[:10]}...)")

    async def search_station(
        self,
        station_name: str,
        station_class: str = "1:2",  # 1=버스, 2=지하철
        display_cnt: int = 10
    ) -> Dict[str, Any]:
        """
        정류장/역 검색

        Args:
            station_name: 검색할 역/정류장 이름 (최소 2글자)
            station_class: 정류장 타입 (콜론으로 구분: 1=버스, 2=지하철, 기본값: "1:2" = 둘다)
            display_cnt: 반환할 결과 개수 (기본값: 10)

        Returns:
            Dict: ODSAY API 응답
                {
                    "code": 0,
                    "result": {
                        "station": [
                            {
                                "stationID": "...",
                                "stationName": "강남역",
                                "x": 127.0276,
                                "y": 37.4979,
                                ...
                            }
                        ],
                        "totalCount": 5
                    }
                }

        Example:
            >>> client = OdsayAPIClient()
            >>> response = await client.search_station(station_name="강남역")
            >>> stations = response.get("result", {}).get("station", [])
            >>> first_station = stations[0]
            >>> print(f"좌표: ({first_station['x']}, {first_station['y']})")
        """
        url = f"{self.BASE_URL}/searchStation"
        params = {
            "apiKey": self.api_key,
            "stationName": station_name,
            "stationClass": station_class,
            "displayCnt": display_cnt
        }

        try:
            logger.info(f"🔍 ODSAY Station 검색: '{station_name}'")

            async with aiohttp.ClientSession() as session:
                async with session.get(
                    url,
                    params=params,
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    if response.status == 200:
                        result = await response.json()

                        # ODSAY API는 error 필드 또는 result 필드를 반환
                        if "error" in result:
                            logger.warning(f"⚠️ Station 검색 오류: {result.get('error')}")
                            return result
                        elif "result" in result:
                            station_count = len(result.get("result", {}).get("station", []))
                            logger.info(f"✅ Station 검색 성공: {station_count}개 발견")
                            # 표준 응답 형식으로 code 필드 추가
                            result["code"] = 0
                            return result
                        else:
                            logger.warning(f"⚠️ Station 검색 예상치 못한 응답 형식")
                            return result
                    else:
                        logger.error(f"❌ Station 검색 HTTP 에러 (상태: {response.status})")
                        return {"code": response.status, "message": f"HTTP {response.status}"}

        except aiohttp.ClientConnectorError as e:
            logger.error(f"❌ Station 검색 연결 오류: {str(e)}")
            return {"code": -1, "message": f"연결 실패: {str(e)}"}
        except aiohttp.ClientError as e:
            logger.error(f"❌ Station 검색 네트워크 오류: {str(e)}")
            return {"code": -1, "message": f"네트워크 오류: {str(e)}"}
        except asyncio.TimeoutError:
            logger.error(f"❌ Station 검색 타임아웃 (10초)")
            return {"code": -3, "message": "요청 타임아웃 (10초)"}
        except Exception as e:
            logger.error(f"❌ Station 검색 예상치 못한 오류: {str(e)}")
            return {"code": -2, "message": f"오류: {str(e)}"}

    async def search_route(
        self,
        start_x: float,
        start_y: float,
        end_x: float,
        end_y: float,
        search_type: int = 0,
        departure_time: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        대중교통 경로 검색

        Args:
            start_x: 출발지 경도 (예: 127.0276)
            start_y: 출발지 위도 (예: 37.4979)
            end_x: 도착지 경도 (예: 127.2748)
            end_y: 도착지 위도 (예: 37.5653)
            search_type: 0=모두, 1=지하철, 2=버스 (기본값: 0)
            departure_time: 출발 시간 (기본값: 현재 시간)

        Returns:
            Dict: ODSAY API 응답 (JSON)

        Example:
            >>> client = OdsayAPIClient()
            >>> response = await client.search_route(
            ...     start_x=127.0276, start_y=37.4979,
            ...     end_x=127.2748, end_y=37.5653
            ... )
            >>> print(response.get('code'))  # 0 = 성공
        """
        if departure_time is None:
            departure_time = datetime.now()

        url = f"{self.BASE_URL}/searchPubTransPathT"
        params = {
            "apiKey": self.api_key,
            "SX": start_x,
            "SY": start_y,
            "EX": end_x,
            "EY": end_y,
            "SearchPathType": search_type,
            "OPT": 0,  # 0: 결과내 추천경로순
            "lang": 0  # 0: 국문, 1: 영문, 2: 일문, 3: 중문
        }

        try:
            logger.info(f"🔍 ODSAY API 호출: ({start_x},{start_y}) → ({end_x},{end_y})")

            async with aiohttp.ClientSession() as session:
                async with session.get(
                    url,
                    params=params,
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    if response.status == 200:
                        result = await response.json()

                        # ODSAY API는 error 필드 또는 result 필드를 반환
                        if "error" in result:
                            logger.warning(f"⚠️ 경로 검색 오류: {result.get('error')}")
                            return result
                        elif "result" in result:
                            path_count = len(result.get("result", {}).get("path", []))
                            logger.info(f"✅ ODSAY API 성공: {path_count}개 경로 검색됨")
                            # 표준 응답 형식으로 code 필드 추가
                            result["code"] = 0
                            return result
                        else:
                            logger.warning(f"⚠️ 경로 검색 예상치 못한 응답 형식")
                            return result
                    else:
                        logger.error(f"❌ ODSAY API HTTP 에러 (상태: {response.status})")
                        return {"code": response.status, "message": f"HTTP {response.status}"}

        except aiohttp.ClientConnectorError as e:
            logger.error(f"❌ ODSAY API 연결 오류: {str(e)}")
            return {"code": -1, "message": f"연결 실패: {str(e)}"}
        except aiohttp.ClientError as e:
            logger.error(f"❌ ODSAY API 네트워크 오류: {str(e)}")
            return {"code": -1, "message": f"네트워크 오류: {str(e)}"}
        except asyncio.TimeoutError:
            logger.error(f"❌ ODSAY API 타임아웃 (10초)")
            return {"code": -3, "message": "요청 타임아웃 (10초)"}
        except Exception as e:
            logger.error(f"❌ ODSAY API 예상치 못한 오류: {str(e)}")
            return {"code": -2, "message": f"오류: {str(e)}"}

    def parse_route_info(self, api_response: Dict[str, Any]) -> Dict[str, Any]:
        """
        ODSAY API 응답을 우리 포맷으로 변환

        Args:
            api_response: ODSAY API 응답

        Returns:
            Dict: {
                "code": 0,
                "paths": [
                    {
                        "id": "path_1",
                        "totalTime": 3600,  # 초 단위
                        "totalDistance": 15400,  # 미터 단위
                        "totalPrice": 2500,  # 원
                        "busCount": 1,
                        "subwayCount": 1,
                        "pathType": 1,
                        "legs": [...]
                    }
                ]
            } 또는 {"code": -1, "error": "..."}

        Example:
            >>> response = await client.search_route(...)
            >>> parsed = client.parse_route_info(response)
            >>> for path in parsed.get("paths", []):
            ...     print(f"소요시간: {path['totalTime']}초")
        """
        # 응답 코드 확인
        code = api_response.get("code", -1)
        if code != 0:
            error_msg = api_response.get("message", "알 수 없는 오류")
            logger.error(f"❌ API 응답 오류 (코드: {code}): {error_msg}")
            return {"code": code, "error": error_msg, "paths": []}

        try:
            result = api_response.get("result", {})
            paths = result.get("path", [])

            if not paths:
                logger.warning("⚠️ ODSAY API 응답에 경로가 없습니다")
                return {"code": 0, "paths": []}

            formatted_paths = []
            for idx, path in enumerate(paths):
                info = path.get("info", {})
                legs = path.get("legs", [])

                # 총 소요시간을 분 단위로도 계산
                total_time_seconds = info.get("totalTime", 0)
                total_time_minutes = total_time_seconds // 60

                # 총 거리를 km 단위로도 계산
                total_distance_meters = info.get("totalDistance", 0)
                total_distance_km = total_distance_meters / 1000

                formatted_path = {
                    "id": f"path_{idx + 1}",
                    "pathType": path.get("pathType", 1),
                    "totalTime": total_time_seconds,  # 초 단위
                    "totalTimeMinutes": total_time_minutes,  # 분 단위
                    "totalDistance": total_distance_meters,  # 미터 단위
                    "totalDistanceKm": f"{total_distance_km:.1f}",  # km 단위
                    "totalPrice": info.get("totalPrice", 0),  # 요금 (원)
                    "busCount": info.get("busCount", 0),
                    "subwayCount": info.get("subwayCount", 0),
                    "transferCount": info.get("transferCount", 0),
                    "legs": legs  # 상세 구간 정보
                }
                formatted_paths.append(formatted_path)

            logger.info(f"✅ 응답 파싱 성공: {len(formatted_paths)}개 경로")
            return {"code": 0, "paths": formatted_paths}

        except KeyError as e:
            logger.error(f"❌ 응답 파싱 중 필드 누락: {str(e)}")
            return {"code": -4, "error": f"필드 누락: {str(e)}", "paths": []}
        except Exception as e:
            logger.error(f"❌ 응답 파싱 실패: {str(e)}")
            return {"code": -2, "error": f"파싱 오류: {str(e)}", "paths": []}

    def print_route_summary(self, paths: list) -> None:
        """
        경로 정보를 보기 좋게 출력

        Args:
            paths: 파싱된 경로 목록
        """
        if not paths:
            print("❌ 검색된 경로가 없습니다\n")
            return

        print(f"\n📊 검색된 경로: {len(paths)}개\n")

        for idx, path in enumerate(paths, 1):
            print(f"{'='*60}")
            print(f"🚌 경로 {idx}: {path['id']}")
            print(f"{'='*60}")
            print(f"  ⏱️  소요시간: {path['totalTimeMinutes']}분 ({path['totalTime']}초)")
            print(f"  📏 총 거리: {path['totalDistanceKm']}km ({path['totalDistance']}m)")
            print(f"  💰 요금: {path['totalPrice']:,}원")
            print(f"  🚍 버스: {path['busCount']}개, 🚇 지하철: {path['subwayCount']}개, 환승: {path['transferCount']}회")

            # 상세 구간 정보
            if path['legs']:
                print(f"\n  📍 상세 구간:")
                for leg_idx, leg in enumerate(path['legs'], 1):
                    leg_type = leg.get("type", "UNKNOWN")
                    start = leg.get("startName", "?")
                    end = leg.get("endName", "?")
                    leg_time = leg.get("time", 0) // 60

                    type_emoji = {
                        "SUBWAY": "🚇",
                        "BUS": "🚌",
                        "WALK": "🚶",
                        "TRANSFER": "↔️"
                    }.get(leg_type, "📍")

                    print(f"    {leg_idx}. {type_emoji} [{leg_type}] {start} → {end} ({leg_time}분)")

            print()


# asyncio 임포트 (위에서 사용)
import asyncio
