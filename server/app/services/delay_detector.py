"""
Delay Detector Service

Phase 7: Logic 3.1 - 돌발상황 감지 (Exception Handling - Delay Detection)

v3.0 명세서:
- Logic 3.1: 예상-평균 지연차 기반 감지
  * 평소 소요시간 vs 실시간 예상 소요시간 비교
  * 5분 이상 지연 시 경고
  * 통계 데이터 부족 시 TPEG 폴백
"""

from typing import Dict, Any, Optional, List
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class DelayDetector:
    """
    지연 감지 엔진

    Phase 3.1: Logic 3.1 - 돌발상황 감지
    """

    # 지연 감지 임계값
    DELAY_THRESHOLD_MINUTES = 5  # 5분 이상 지연 시 경고
    DELAY_THRESHOLD_PERCENT = 30  # 평소 대비 30% 이상 지연 시 경고
    CRITICAL_DELAY_THRESHOLD_MINUTES = 10  # 10분 이상은 CRITICAL

    # 통계 데이터 신뢰도 기준
    MIN_SAMPLE_COUNT_FOR_RELIABILITY = 100  # 최소 100개 샘플

    def __init__(self):
        """DelayDetector 초기화"""
        logger.info("✅ DelayDetector 초기화")

    # ========================================
    # 구간별 평균 소요시간 조회
    # ========================================

    def get_segment_average_duration(
        self,
        segment_id: str,
        hour: int,
        day_of_week: int,
        statistical_data: Optional[Dict[str, Any]] = None
    ) -> Optional[Dict[str, Any]]:
        """
        구간별 평균 소요시간 조회

        Args:
            segment_id: 구간 ID (예: "SEG_001")
            hour: 시간대 (0-23)
            day_of_week: 요일 (0=일요일, 1=월요일, ...)
            statistical_data: 통계 데이터 (Mock용)

        Returns:
            {
                "segment_id": "SEG_001",
                "hour": 8,
                "day_of_week": 1,
                "avg_duration_seconds": 300,
                "sample_count": 2545,
                "data_quality": "HIGH"
            }
            또는 None (데이터 없음)
        """
        # Mock 데이터가 제공된 경우
        if statistical_data:
            return statistical_data

        # 실제 구현에서는 DB 또는 ai_pattern 모듈에서 조회
        logger.info(
            f"📊 구간 평균 조회: {segment_id} (시간대: {hour}시, 요일: {day_of_week})"
        )

        # 데이터 없음
        return None

    # ========================================
    # 실시간 예상 소요시간 조회
    # ========================================

    def get_real_time_duration(
        self,
        segment_id: str,
        real_time_data: Optional[Dict[str, Any]] = None
    ) -> Optional[Dict[str, Any]]:
        """
        실시간 예상 소요시간 조회 (TPEG 또는 Odsay)

        Args:
            segment_id: 구간 ID
            real_time_data: 실시간 데이터 (Mock용)

        Returns:
            {
                "segment_id": "SEG_001",
                "predicted_duration_seconds": 600,
                "data_source": "TPEG",
                "last_updated": "2025-11-12T08:15:00",
                "confidence": 0.95
            }
            또는 None (데이터 없음)
        """
        # Mock 데이터가 제공된 경우
        if real_time_data:
            return real_time_data

        # 실제 구현에서는 TPEG 또는 Odsay API에서 조회
        logger.info(f"🚦 실시간 데이터 조회: {segment_id}")

        # 데이터 없음
        return None

    # ========================================
    # 지연차 계산
    # ========================================

    def calculate_delay(
        self,
        avg_duration_seconds: int,
        predicted_duration_seconds: int
    ) -> Dict[str, Any]:
        """
        지연차 계산

        Args:
            avg_duration_seconds: 평소 소요시간 (초)
            predicted_duration_seconds: 실시간 예상 소요시간 (초)

        Returns:
            {
                "delay_seconds": 300,
                "delay_minutes": 5,
                "delay_percentage": 100  # (지연차 / 평소) * 100
            }
        """
        delay_seconds = predicted_duration_seconds - avg_duration_seconds
        delay_minutes = delay_seconds // 60
        delay_percentage = (delay_seconds / avg_duration_seconds * 100) if avg_duration_seconds > 0 else 0

        logger.info(
            f"📉 지연차 계산: {delay_minutes}분 ({delay_percentage:.1f}%) "
            f"| 평소: {avg_duration_seconds}초, 현재 예상: {predicted_duration_seconds}초"
        )

        return {
            "delay_seconds": delay_seconds,
            "delay_minutes": delay_minutes,
            "delay_percentage": delay_percentage
        }

    # ========================================
    # 지연 감지 (임계값 체크)
    # ========================================

    def detect_exception(
        self,
        delay_minutes: int,
        delay_percentage: float,
        segment_info: Dict[str, str]
    ) -> Dict[str, Any]:
        """
        지연 감지 (임계값 체크)

        Args:
            delay_minutes: 지연 시간 (분)
            segment_info: 구간 정보

        Returns:
            {
                "is_delayed": True/False,
                "action": "EXCEPTION_DETECTED" or "NO_ACTION",
                "type": "DELAY_WARNING",
                "priority": "CRITICAL" or "HIGH" or None,
                "message": "지연 감지 메시지"
            }
        """
        # 1️⃣ 지연 여부 판정 (분 절대값 + 퍼센트 기준 병행)
        is_delayed = (
            delay_minutes >= self.DELAY_THRESHOLD_MINUTES
            or delay_percentage >= self.DELAY_THRESHOLD_PERCENT
        )

        if not is_delayed:
            logger.info(f"✅ 정상 운행: {delay_minutes}분 지연 (임계값 미만)")
            return {
                "is_delayed": False,
                "action": "NO_ACTION",
                "type": None,
                "priority": None,
                "message": None
            }

        # 2️⃣ 지연 심각도 판정 (우선 분 기준으로 CRITICAL / HIGH 구분)
        priority = "CRITICAL" if delay_minutes >= self.CRITICAL_DELAY_THRESHOLD_MINUTES else "HIGH"

        # 3️⃣ 메시지 생성
        from_station = segment_info.get("from_station", "알 수 없음")
        message = (
            f"⚠️지연 감지! [{from_station}] 부근이 "
            f"평소보다 {delay_minutes}분 이상 늦어지고 있습니다."
        )

        logger.warning(f"🚨 {message} (우선순위: {priority})")

        return {
            "is_delayed": True,
            "action": "EXCEPTION_DETECTED",
            "type": "DELAY_WARNING",
            "priority": priority,
            "message": message
        }

    # ========================================
    # 통계 데이터 신뢰도 평가
    # ========================================

    def is_statistical_data_reliable(
        self,
        sample_count: int,
        data_quality: Optional[str] = None
    ) -> bool:
        """
        통계 데이터 신뢰도 평가

        Args:
            sample_count: 샘플 개수
            data_quality: 데이터 품질 레이블 (HIGH/MEDIUM/LOW)

        Returns:
            신뢰도 있는지 여부
        """
        if sample_count < self.MIN_SAMPLE_COUNT_FOR_RELIABILITY:
            logger.warning(
                f"⚠️ 통계 데이터 신뢰도 낮음: {sample_count}개 샘플 "
                f"(필요: {self.MIN_SAMPLE_COUNT_FOR_RELIABILITY}개 이상)"
            )
            return False

        if data_quality == "LOW":
            logger.warning("⚠️ 데이터 품질이 낮음")
            return False

        return True

    # ========================================
    # 지연 감지 통합 로직
    # ========================================

    def detect_delay_on_segment(
        self,
        segment_id: str,
        segment_info: Dict[str, str],
        current_hour: int,
        current_day_of_week: int,
        statistical_data: Optional[Dict[str, Any]] = None,
        real_time_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        구간 지연 감지 (통합 로직)

        Args:
            segment_id: 구간 ID
            segment_info: 구간 정보 (from_station, to_station, segment_name)
            current_hour: 현재 시간대
            current_day_of_week: 현재 요일
            statistical_data: 통계 데이터 (Mock용)
            real_time_data: 실시간 데이터 (Mock용)

        Returns:
            {
                "segment_id": "SEG_001",
                "segment_name": "A정류장 → B정류장",
                "is_delayed": True,
                "action": "EXCEPTION_DETECTED",
                "type": "DELAY_WARNING",
                "message": "⚠️지연 감지! [A정류장] 부근이...",
                "delay_minutes": 5,
                "priority": "HIGH",
                "data_source": "STATISTICAL" or "TPEG",
                "confidence": 0.95
            }
        """
        # 1️⃣ 평균 소요시간 조회
        avg_data = self.get_segment_average_duration(
            segment_id,
            current_hour,
            current_day_of_week,
            statistical_data
        )

        # 2️⃣ 실시간 예상 소요시간 조회
        real_time = self.get_real_time_duration(
            segment_id,
            real_time_data
        )

        # 3️⃣ 데이터 소스 판정
        data_source = "UNKNOWN"
        confidence = 0.0

        # 평균 데이터가 신뢰도 있으면 사용
        if avg_data and self.is_statistical_data_reliable(
            avg_data.get("sample_count", 0),
            avg_data.get("data_quality")
        ):
            # data_source 의미:
            # - STATISTICAL: 평균/통계를 baseline으로 삼아, 그 대비 지연 여부를 판단함
            #   (실시간 데이터가 함께 있어도 baseline은 통계 데이터로 간주)
            # - TPEG: 통계 부족 시 TPEG/실시간만 존재 (현재는 NO_ACTION 처리)
            # - NONE: 통계/실시간 모두 없음 (판정 불가)
            data_source = "STATISTICAL"
            avg_duration = avg_data["avg_duration_seconds"]
            confidence = 0.9
        elif real_time:
            # 평균 데이터 없으면 TPEG로 폴백
            data_source = "TPEG"
            logger.info("🔄 TPEG 폴백: 통계 데이터 부족")
            # TPEG만으로는 지연 판정 불가능 → NO_ACTION
            return {
                "segment_id": segment_id,
                "segment_name": segment_info.get("segment_name", "알 수 없음"),
                "is_delayed": False,
                "action": "NO_ACTION",
                "type": None,
                "message": None,
                "delay_minutes": 0,
                "priority": None,
                "data_source": "TPEG",
                "confidence": real_time.get("confidence", 0.0),
                "reason": "TPEG 데이터로만 판정 불가"
            }
        else:
            # 데이터 없음
            logger.warning(f"⚠️ {segment_id} 지연 판정 데이터 없음")
            return {
                "segment_id": segment_id,
                "segment_name": segment_info.get("segment_name", "알 수 없음"),
                "is_delayed": False,
                "action": "NO_ACTION",
                "type": None,
                "message": None,
                "delay_minutes": 0,
                "priority": None,
                "data_source": "NONE",
                "confidence": 0.0,
                "reason": "데이터 없음"
            }

        # 4️⃣ 지연차 계산
        if not real_time:
            logger.warning(f"⚠️ {segment_id} 실시간 데이터 없음")
            return {
                "segment_id": segment_id,
                "segment_name": segment_info.get("segment_name", "알 수 없음"),
                "is_delayed": False,
                "action": "NO_ACTION",
                "type": None,
                "message": None,
                "delay_minutes": 0,
                "priority": None,
                "data_source": data_source,
                "confidence": confidence,
                "reason": "실시간 데이터 없음"
            }

        delay_info = self.calculate_delay(
            avg_duration,
            real_time["predicted_duration_seconds"]
        )

        # 5️⃣ 지연 감지 (분 + 퍼센트 기준)
        exception_info = self.detect_exception(
            delay_info["delay_minutes"],
            delay_info["delay_percentage"],
            segment_info
        )

        # 6️⃣ 결과 통합
        result = {
            "segment_id": segment_id,
            "segment_name": segment_info.get("segment_name", "알 수 없음"),
            "is_delayed": exception_info["is_delayed"],
            "action": exception_info["action"],
            "type": exception_info["type"],
            "message": exception_info["message"],
            "delay_minutes": delay_info["delay_minutes"],
            "priority": exception_info["priority"],
            "data_source": data_source,
            "confidence": confidence,
            "avg_duration_seconds": avg_duration if data_source == "STATISTICAL" else None,
            "predicted_duration_seconds": real_time["predicted_duration_seconds"]
        }

        return result

    # ========================================
    # 여러 구간 지연 감지
    # ========================================

    def detect_delays_on_route(
        self,
        segments: List[Dict[str, Any]],
        current_hour: int,
        current_day_of_week: int,
        statistical_data_map: Dict[str, Dict[str, Any]] = None,
        real_time_data_map: Dict[str, Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        경로의 여러 구간에서 지연 감지

        Args:
            segments: 구간 리스트
            current_hour: 현재 시간
            current_day_of_week: 현재 요일
            statistical_data_map: 구간별 통계 데이터
            real_time_data_map: 구간별 실시간 데이터

        Returns:
            {
                "total_segments": 3,
                "delayed_count": 1,
                "delayed_segments": [
                    {
                        "segment_id": "SEG_002",
                        "delay_minutes": 8,
                        "priority": "HIGH"
                    }
                ],
                "most_critical": {...}
            }
        """
        if statistical_data_map is None:
            statistical_data_map = {}
        if real_time_data_map is None:
            real_time_data_map = {}

        delayed_segments = []

        for segment in segments:
            result = self.detect_delay_on_segment(
                segment["segment_id"],
                segment,
                current_hour,
                current_day_of_week,
                statistical_data_map.get(segment["segment_id"]),
                real_time_data_map.get(segment["segment_id"])
            )

            if result["is_delayed"]:
                delayed_segments.append(result)

        # 가장 심각한 구간
        most_critical = None
        if delayed_segments:
            most_critical = max(
                delayed_segments,
                key=lambda x: (x["priority"] == "CRITICAL", x["delay_minutes"])
            )

        logger.info(
            f"📊 경로 지연 분석: 총 {len(segments)}개 구간, "
            f"지연 {len(delayed_segments)}개"
        )

        return {
            "total_segments": len(segments),
            "delayed_count": len(delayed_segments),
            "delayed_segments": delayed_segments,
            "most_critical": most_critical,
            "has_critical": any(s["priority"] == "CRITICAL" for s in delayed_segments)
        }


# 전역 인스턴스
delay_detector = DelayDetector()
