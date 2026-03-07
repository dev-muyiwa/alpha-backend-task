from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Briefing(Base):
    __tablename__ = "briefings"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    company_name: Mapped[str] = mapped_column(String(200), nullable=False)
    ticker: Mapped[str] = mapped_column(String(10), nullable=False)
    sector: Mapped[str | None] = mapped_column(String(100), nullable=True)
    analyst_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    recommendation: Mapped[str] = mapped_column(Text, nullable=False)
    html_content: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_generated: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    generated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    points: Mapped[list["BriefingPoint"]] = relationship(
        "BriefingPoint",
        back_populates="briefing",
        cascade="all, delete-orphan",
        order_by="BriefingPoint.sort_order",
    )
    metrics: Mapped[list["BriefingMetric"]] = relationship(
        "BriefingMetric",
        back_populates="briefing",
        cascade="all, delete-orphan",
    )


from app.models.briefing_point import BriefingPoint  # noqa: E402
from app.models.briefing_metric import BriefingMetric  # noqa: E402, F401
