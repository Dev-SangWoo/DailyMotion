import aiohttp
import logging
from typing import List, Dict, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


class HazardAPIClient:
    """행정안전부 재난문자 API 클라이언트"""

    def __init__(self, api_key: str, api_url: str):
        self.api_key = api_key
        self.api_url = api_url
        self.session: Optional[aiohttp.ClientSession] = None

    async def initialize(self):
        """세션 초기화"""
        self.session = aiohttp.ClientSession()
        logger.info("HazardAPIClient initialized")

    async def close(self):
        """세션 종료"""
        if self.session:
            await self.session.close()
            logger.info("HazardAPIClient closed")

    async def get_disaster_alerts(self, region: str) -> List[Dict]:
        """
        지역별 재난 알림 조회

        Args:
            region: 지역 코드 (예: "서울")

        Returns:
            재난 알림 목록
        """
        if not self.session:
            await self.initialize()

        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }

            params = {
                "region": region,
                "active": True,
            }

            async with self.session.get(
                f"{self.api_url}/disasters",
                headers=headers,
                params=params,
                timeout=aiohttp.ClientTimeout(total=10),
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    logger.info(
                        f"Retrieved {len(data.get('disasters', []))} disaster alerts for {region}"
                    )
                    return data.get("disasters", [])
                else:
                    logger.error(f"API Error: {response.status}")
                    return []

        except aiohttp.ClientError as e:
            logger.error(f"Connection error: {str(e)}")
            return []
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")
            return []

    async def subscribe_to_alerts(self, region: str, callback=None):
        """
        재난 알림 구독 (WebSocket)

        Args:
            region: 지역 코드
            callback: 알림 수신 시 호출할 콜백 함수
        """
        if not self.session:
            await self.initialize()

        try:
            ws_url = f"{self.api_url}/disasters/subscribe"
            async with self.session.ws_connect(ws_url) as ws:
                logger.info(f"WebSocket connected for region: {region}")

                # 구독 요청
                await ws.send_json(
                    {
                        "action": "subscribe",
                        "region": region,
                        "api_key": self.api_key,
                    }
                )

                # 메시지 수신 루프
                async for msg in ws:
                    if msg.type == aiohttp.WSMsgType.TEXT:
                        alert_data = msg.json()
                        logger.info(f"New alert received: {alert_data}")
                        if callback:
                            await callback(alert_data)
                    elif msg.type == aiohttp.WSMsgType.ERROR:
                        logger.error("WebSocket error occurred")
                        break

        except aiohttp.ClientError as e:
            logger.error(f"WebSocket connection error: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error in subscribe_to_alerts: {str(e)}")

    async def get_alert_by_region_and_type(self, region: str, alert_type: str) -> List[Dict]:
        """
        특정 지역의 특정 유형 재난 알림 조회

        Args:
            region: 지역 코드
            alert_type: 재난 유형 (예: "지진", "태풍", "폭우" 등)

        Returns:
            필터링된 재난 알림 목록
        """
        alerts = await self.get_disaster_alerts(region)

        # alert_type으로 필터링
        filtered_alerts = [
            alert for alert in alerts if alert.get("type", "").lower() == alert_type.lower()
        ]

        logger.info(f"Found {len(filtered_alerts)} {alert_type} alerts in {region}")
        return filtered_alerts


# 싱글톤 인스턴스
_hazard_client: Optional[HazardAPIClient] = None


def get_hazard_client(api_key: str, api_url: str) -> HazardAPIClient:
    """HazardAPIClient 싱글톤 반환"""
    global _hazard_client
    if _hazard_client is None:
        _hazard_client = HazardAPIClient(api_key, api_url)
    return _hazard_client


async def initialize_hazard_client(api_key: str, api_url: str):
    """HazardAPIClient 초기화"""
    client = get_hazard_client(api_key, api_url)
    await client.initialize()
    return client


async def close_hazard_client():
    """HazardAPIClient 종료"""
    global _hazard_client
    if _hazard_client:
        await _hazard_client.close()
        _hazard_client = None
