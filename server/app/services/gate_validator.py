"""
Gate Validator Service

Phase 5: Logic 2.2 - 고신뢰 대안 경로 제안 (High-Confidence Route Suggestion)

v3.0 명세서:
- Logic 2.2: 다가오는 환승 지점을 기준으로 3가지 엄격한 조건(Gate)을 통과해야만 제안
  * Gate 1: 확실한 이득 (High Threshold)
  * Gate 2: 환승 확정성 (Transfer Certainty)
  * Gate 3: 경험의 질 (Quality of Experience)
"""

from typing import Dict, Any, Optional
import logging

from app.modules.path_optimize.models import SystemMode

logger = logging.getLogger(__name__)


class GateValidator:
    """
    고신뢰 대안 경로 제안의 3가지 Gate 조건 검증

    Phase 2.2: Logic 2.2 - 고신뢰 대안 경로 제안
    """

    # Gate 1: 확실한 이득 (High Threshold) - 임계값
    GATE_1_COMMUTE_TIME_BENEFIT_MIN = 7  # 출근: 최소 7분 이상 단축
    GATE_1_RETREAT_SEATING_CONGESTION_MAX = 50  # 퇴근: 혼잡도 50% 이하면 착석 가능

    # Gate 2: 환승 확정성 (Transfer Certainty) - 임계값
    GATE_2_TRANSFER_TIME_MIN = 3  # 최소 3분 환승 여유 필요

    # Gate 3: 경험의 질 (Quality of Experience) - 임계값
    GATE_3_CONGESTION_MAX = 80  # 혼잡도 80% 이상이면 제안하지 않음

    def __init__(self):
        """GateValidator 초기화"""
        logger.info("✅ GateValidator 초기화")

    # ========================================
    # Gate 1: 확실한 이득 (High Threshold)
    # ========================================

    def validate_gate_1_benefit(
        self,
        current_route_time: int,
        alternative_route_time: int,
        mode: SystemMode,
        congestion_level: Optional[int] = None
    ) -> bool:
        """
        Gate 1: 확실한 이득 (High Threshold) 검증

        출근 모드: 현저한 시간 단축 (7분 이상)
        퇴근 모드: 착석 가능성 높음 (혼잡도 50% 이하)

        Args:
            current_route_time: 현재 경로 소요 시간 (분)
            alternative_route_time: 대안 경로 소요 시간 (분)
            mode: 시스템 모드 (COMMUTE/RETREAT)
            congestion_level: 혼잡도 (퇴근 모드에서만 필요)

        Returns:
            Gate 1 통과 여부
        """
        if mode == SystemMode.COMMUTE:
            # 출근 모드: 시간 단축이 7분 이상
            time_benefit = current_route_time - alternative_route_time
            gate_1_pass = time_benefit >= self.GATE_1_COMMUTE_TIME_BENEFIT_MIN
            logger.info(
                f"🚗 Gate 1 (출근): 시간 단축 {time_benefit}분 "
                f"(필요: {self.GATE_1_COMMUTE_TIME_BENEFIT_MIN}분 이상) → "
                f"{'PASS ✅' if gate_1_pass else 'FAIL ❌'}"
            )
            return gate_1_pass

        elif mode == SystemMode.RETREAT:
            # 퇴근 모드: 착석 가능성 높음 (혼잡도 낮음)
            if congestion_level is None:
                logger.warning("⚠️ 퇴근 모드에서 혼잡도 정보 없음")
                return False

            gate_1_pass = congestion_level <= self.GATE_1_RETREAT_SEATING_CONGESTION_MAX
            logger.info(
                f"🏠 Gate 1 (퇴근): 혼잡도 {congestion_level}% "
                f"(필요: {self.GATE_1_RETREAT_SEATING_CONGESTION_MAX}% 이하) → "
                f"{'PASS ✅' if gate_1_pass else 'FAIL ❌'}"
            )
            return gate_1_pass

        else:
            logger.warning(f"⚠️ 알 수 없는 모드: {mode}")
            return False

    # ========================================
    # Gate 2: 환승 확정성 (Transfer Certainty)
    # ========================================

    def validate_gate_2_transfer_certainty(
        self,
        current_bus_arrival_minutes: int,
        current_bus_duration_minutes: int,
        transfer_bus_arrival_minutes: int
    ) -> bool:
        """
        Gate 2: 환승 확정성 (Transfer Certainty) 검증

        현재 버스에서 내려서 다음 버스에 탑승하기까지의 시간이 최소 3분 이상 필요
        "내렸는데 버스 떠나는" 상황 방지

        Args:
            current_bus_arrival_minutes: 현재 버스 도착 시간 (현재부터 N분)
            current_bus_duration_minutes: 현재 버스 정차 + 하차 시간 (분)
            transfer_bus_arrival_minutes: 환승 버스 도착 시간 (현재부터 N분)

        Returns:
            Gate 2 통과 여부
        """
        # 현재 버스 하차 시간
        current_bus_departure = current_bus_arrival_minutes + current_bus_duration_minutes

        # 환승 여유 시간
        transfer_time_available = transfer_bus_arrival_minutes - current_bus_departure

        gate_2_pass = transfer_time_available >= self.GATE_2_TRANSFER_TIME_MIN

        logger.info(
            f"🔄 Gate 2 (환승): 여유 시간 {transfer_time_available}분 "
            f"(필요: {self.GATE_2_TRANSFER_TIME_MIN}분 이상) → "
            f"{'PASS ✅' if gate_2_pass else 'FAIL ❌'}"
        )
        return gate_2_pass

    # ========================================
    # Gate 3: 경험의 질 (Quality of Experience)
    # ========================================

    def validate_gate_3_experience_quality(
        self,
        transfer_bus_congestion: int
    ) -> bool:
        """
        Gate 3: 경험의 질 (Quality of Experience) 검증

        환승 버스의 혼잡도가 80% 이상이면 제안하지 않음
        사용자 경험 저하 방지

        Args:
            transfer_bus_congestion: 환승 버스 혼잡도 (백분율)

        Returns:
            Gate 3 통과 여부
        """
        gate_3_pass = transfer_bus_congestion < self.GATE_3_CONGESTION_MAX

        congestion_label = self._get_congestion_label(transfer_bus_congestion)
        logger.info(
            f"👥 Gate 3 (혼잡도): {transfer_bus_congestion}% ({congestion_label}) "
            f"(제한: {self.GATE_3_CONGESTION_MAX}% 이상 불가) → "
            f"{'PASS ✅' if gate_3_pass else 'FAIL ❌'}"
        )
        return gate_3_pass

    # ========================================
    # Gate 통합 검증
    # ========================================

    def validate_all_gates(
        self,
        current_route_time: int,
        alternative_route_time: int,
        mode: SystemMode,
        current_bus_arrival_minutes: int,
        current_bus_duration_minutes: int,
        transfer_bus_arrival_minutes: int,
        transfer_bus_congestion: int,
        congestion_level: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        모든 Gate를 검증하고 결과 반환

        Args:
            current_route_time: 현재 경로 소요 시간
            alternative_route_time: 대안 경로 소요 시간
            mode: 시스템 모드
            current_bus_arrival_minutes: 현재 버스 도착까지 시간
            current_bus_duration_minutes: 현재 버스 정차 + 하차 시간
            transfer_bus_arrival_minutes: 환승 버스 도착까지 시간
            transfer_bus_congestion: 환승 버스 혼잡도
            congestion_level: 혼잡도 (퇴근 모드)

        Returns:
            {
                "all_pass": bool,
                "gate_1_pass": bool,
                "gate_2_pass": bool,
                "gate_3_pass": bool,
                "time_benefit": int,
                "transfer_time": int,
                "reasons": [str]  # 실패 이유
            }
        """
        gate_1_pass = self.validate_gate_1_benefit(
            current_route_time,
            alternative_route_time,
            mode,
            congestion_level
        )

        gate_2_pass = self.validate_gate_2_transfer_certainty(
            current_bus_arrival_minutes,
            current_bus_duration_minutes,
            transfer_bus_arrival_minutes
        )

        gate_3_pass = self.validate_gate_3_experience_quality(
            transfer_bus_congestion
        )

        all_pass = gate_1_pass and gate_2_pass and gate_3_pass

        # 시간 단축 및 환승 여유 계산
        time_benefit = current_route_time - alternative_route_time
        transfer_time = transfer_bus_arrival_minutes - (
            current_bus_arrival_minutes + current_bus_duration_minutes
        )

        # 실패 이유
        reasons = []
        if not gate_1_pass:
            if mode == SystemMode.COMMUTE:
                reasons.append(
                    f"Gate 1 실패: 시간 단축이 {time_benefit}분으로 "
                    f"{self.GATE_1_COMMUTE_TIME_BENEFIT_MIN}분 미만"
                )
            else:
                reasons.append(
                    f"Gate 1 실패: 혼잡도가 높음 (착석 불가능)"
                )

        if not gate_2_pass:
            reasons.append(
                f"Gate 2 실패: 환승 여유가 {transfer_time}분으로 "
                f"{self.GATE_2_TRANSFER_TIME_MIN}분 미만"
            )

        if not gate_3_pass:
            congestion_label = self._get_congestion_label(transfer_bus_congestion)
            reasons.append(
                f"Gate 3 실패: 환승 버스 혼잡도가 {transfer_bus_congestion}% ({congestion_label})"
            )

        result = {
            "all_pass": all_pass,
            "gate_1_pass": gate_1_pass,
            "gate_2_pass": gate_2_pass,
            "gate_3_pass": gate_3_pass,
            "time_benefit": time_benefit,
            "transfer_time": transfer_time,
            "reasons": reasons
        }

        status_str = "✅ 모든 Gate 통과 → 경로 제안" if all_pass else "❌ Gate 실패 → 제안 안 함"
        logger.info(f"🎯 종합: {status_str} | {len(reasons)}개 실패 이유")

        return result

    # ========================================
    # 유틸리티
    # ========================================

    def _get_congestion_label(self, congestion: int) -> str:
        """혼잡도를 레이블로 변환"""
        if congestion < 30:
            return "여유 있음"
        elif congestion < 50:
            return "보통"
        elif congestion < 70:
            return "혼잡"
        elif congestion < 85:
            return "매우 혼잡"
        else:
            return "심각"

    def generate_route_suggestion_message(
        self,
        time_benefit: int,
        transfer_location: str,
        transfer_line: str,
        transfer_bus_congestion: int
    ) -> str:
        """
        경로 제안 메시지 생성

        v3.0 명세서 포맷:
        "더 빠른 경로 발견! (10분 단축) / 다음 'A역' [9호선 급행] 환승하세요. (단, 현재 혼잡도 '매우 높음')"

        Args:
            time_benefit: 시간 단축 (분)
            transfer_location: 환승 지점 (예: "A역")
            transfer_line: 환승 노선 (예: "9호선 급행")
            transfer_bus_congestion: 혼잡도 (백분율)

        Returns:
            메시지 문자열
        """
        congestion_label = self._get_congestion_label(transfer_bus_congestion)

        message = (
            f"더 빠른 경로 발견! ({time_benefit}분 단축) / "
            f"다음 '{transfer_location}' [{transfer_line}] 환승하세요. "
            f"(단, 현재 혼잡도 '{congestion_label}')"
        )

        logger.info(f"💬 메시지 생성: {message}")
        return message


# 전역 인스턴스
gate_validator = GateValidator()
