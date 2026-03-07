from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.models.briefing import Briefing

_TEMPLATE_DIR = Path(__file__).resolve().parents[1] / "templates"


@dataclass
class BriefingReportViewModel:
    title: str
    company_name: str
    ticker: str
    sector: str | None
    analyst_name: str | None
    summary: str
    recommendation: str
    key_points: list[str]
    risks: list[str]
    metrics: list[tuple[str, str]]
    generated_at: str


def _create_view_model(briefing: Briefing) -> BriefingReportViewModel:
    key_points = sorted(
        [p for p in briefing.points if p.point_type == "key_point"],
        key=lambda p: p.sort_order,
    )
    risks = sorted(
        [p for p in briefing.points if p.point_type == "risk"],
        key=lambda p: p.sort_order,
    )

    return BriefingReportViewModel(
        title=f"{briefing.company_name} ({briefing.ticker}) - Investment Briefing",
        company_name=briefing.company_name,
        ticker=briefing.ticker,
        sector=briefing.sector,
        analyst_name=briefing.analyst_name,
        summary=briefing.summary,
        recommendation=briefing.recommendation,
        key_points=[p.content for p in key_points],
        risks=[r.content for r in risks],
        metrics=[(m.name, m.value) for m in briefing.metrics],
        generated_at=datetime.now(timezone.utc).isoformat(),
    )


def render_briefing_report(briefing: Briefing) -> str:
    env = Environment(
        loader=FileSystemLoader(str(_TEMPLATE_DIR)),
        autoescape=select_autoescape(enabled_extensions=("html", "xml"), default_for_string=True),
    )
    template = env.get_template("briefing_report.html")
    vm = _create_view_model(briefing)
    return template.render(vm=vm)
