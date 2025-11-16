"""Add last_bus_schedule table for retreat mode last bus alerts.

Revision ID: 4a2f9c7d9b1b
Revises: 83d6e363514e
Create Date: 2025-11-17 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from datetime import time


# revision identifiers, used by Alembic.
revision: str = "4a2f9c7d9b1b"
down_revision: Union[str, Sequence[str], None] = "83d6e363514e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create last_bus_schedule table and insert minimal seed data."""
    op.create_table(
        "last_bus_schedule",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("route_choice", sa.String(length=1), nullable=False, index=True),
        sa.Column("route_name", sa.String(length=50), nullable=True),
        sa.Column("transport_type", sa.String(length=20), nullable=False, server_default="BUS"),
        sa.Column("transport_name", sa.String(length=50), nullable=True),
        sa.Column("last_bus_time", sa.Time(), nullable=False),
        sa.Column("day_of_week", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    # 개발/테스트용 기본 막차 시간 샘플 데이터
    last_bus_schedule = sa.table(
        "last_bus_schedule",
        sa.column("route_choice", sa.String),
        sa.column("route_name", sa.String),
        sa.column("transport_type", sa.String),
        sa.column("transport_name", sa.String),
        sa.column("last_bus_time", sa.Time),
        sa.column("day_of_week", sa.Integer),
    )

    op.bulk_insert(
        last_bus_schedule,
        [
            {
                "route_choice": "A",
                "route_name": "A. 가장 빠르게",
                "transport_type": "SUBWAY",
                "transport_name": "수도권 7호선",
                "last_bus_time": time(23, 50),
                "day_of_week": None,
            },
            {
                "route_choice": "B",
                "route_name": "B. 편안하게",
                "transport_type": "SUBWAY",
                "transport_name": "수도권 7호선",
                "last_bus_time": time(23, 30),
                "day_of_week": None,
            },
            {
                "route_choice": "C",
                "route_name": "C. 평소 경로",
                "transport_type": "SUBWAY",
                "transport_name": "수도권 7호선",
                "last_bus_time": time(23, 40),
                "day_of_week": None,
            },
        ],
    )


def downgrade() -> None:
    """Drop last_bus_schedule table."""
    op.drop_table("last_bus_schedule")

