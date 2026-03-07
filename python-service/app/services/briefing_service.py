from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.briefing import Briefing
from app.models.briefing_metric import BriefingMetric
from app.models.briefing_point import BriefingPoint
from app.schemas.briefing import BriefingCreate
from app.services.briefing_report_formatter import render_briefing_report


def create_briefing(db: Session, payload: BriefingCreate) -> Briefing:
    briefing = Briefing(
        company_name=payload.company_name.strip(),
        ticker=payload.ticker,
        sector=payload.sector.strip() if payload.sector else None,
        analyst_name=payload.analyst_name.strip() if payload.analyst_name else None,
        summary=payload.summary.strip(),
        recommendation=payload.recommendation.strip(),
    )
    db.add(briefing)
    db.flush()

    for idx, point in enumerate(payload.key_points):
        db.add(
            BriefingPoint(
                briefing_id=briefing.id,
                point_type="key_point",
                content=point,
                sort_order=idx,
            )
        )

    for idx, risk in enumerate(payload.risks):
        db.add(
            BriefingPoint(
                briefing_id=briefing.id,
                point_type="risk",
                content=risk,
                sort_order=idx,
            )
        )

    if payload.metrics:
        for metric in payload.metrics:
            db.add(
                BriefingMetric(
                    briefing_id=briefing.id,
                    name=metric.name.strip(),
                    value=metric.value.strip(),
                )
            )

    db.commit()
    return get_briefing(db, briefing.id)  # type: ignore[return-value]


def get_briefing(db: Session, briefing_id: int) -> Briefing | None:
    query = (
        select(Briefing)
        .where(Briefing.id == briefing_id)
        .options(selectinload(Briefing.points), selectinload(Briefing.metrics))
    )
    return db.scalar(query)


def generate_briefing_html(db: Session, briefing_id: int) -> Briefing | None:
    briefing = get_briefing(db, briefing_id)
    if briefing is None:
        return None

    html_content = render_briefing_report(briefing)
    briefing.html_content = html_content
    briefing.is_generated = True
    briefing.generated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(briefing)
    return briefing
