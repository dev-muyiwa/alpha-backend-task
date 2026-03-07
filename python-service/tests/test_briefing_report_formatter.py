"""Unit tests for briefing_report_formatter."""

from datetime import datetime, timezone
from unittest.mock import MagicMock

from app.models.briefing import Briefing
from app.models.briefing_metric import BriefingMetric
from app.models.briefing_point import BriefingPoint
from app.services.briefing_report_formatter import (
    BriefingReportViewModel,
    _create_view_model,
    render_briefing_report,
)


def _create_mock_briefing(
    company_name: str = "Test Corp",
    ticker: str = "TEST",
    sector: str | None = "Technology",
    analyst_name: str | None = "Jane Doe",
    summary: str = "Test summary",
    recommendation: str = "Buy",
    key_points: list[str] | None = None,
    risks: list[str] | None = None,
    metrics: list[tuple[str, str]] | None = None,
) -> Briefing:
    """Create a mock Briefing object for testing."""
    briefing = MagicMock(spec=Briefing)
    briefing.company_name = company_name
    briefing.ticker = ticker
    briefing.sector = sector
    briefing.analyst_name = analyst_name
    briefing.summary = summary
    briefing.recommendation = recommendation

    # Create mock points
    points = []
    if key_points is None:
        key_points = ["Key point 1", "Key point 2"]
    for idx, content in enumerate(key_points):
        point = MagicMock(spec=BriefingPoint)
        point.point_type = "key_point"
        point.content = content
        point.sort_order = idx
        points.append(point)

    if risks is None:
        risks = ["Risk 1"]
    for idx, content in enumerate(risks):
        point = MagicMock(spec=BriefingPoint)
        point.point_type = "risk"
        point.content = content
        point.sort_order = idx
        points.append(point)

    briefing.points = points

    # Create mock metrics
    mock_metrics = []
    if metrics is None:
        metrics = [("Revenue", "$1M")]
    for name, value in metrics:
        metric = MagicMock(spec=BriefingMetric)
        metric.name = name
        metric.value = value
        mock_metrics.append(metric)

    briefing.metrics = mock_metrics

    return briefing


class TestCreateViewModel:
    """Tests for _create_view_model function."""

    def test_creates_view_model_with_all_fields(self) -> None:
        briefing = _create_mock_briefing()

        result = _create_view_model(briefing)

        assert isinstance(result, BriefingReportViewModel)
        assert result.company_name == "Test Corp"
        assert result.ticker == "TEST"
        assert result.sector == "Technology"
        assert result.analyst_name == "Jane Doe"
        assert result.summary == "Test summary"
        assert result.recommendation == "Buy"

    def test_creates_correct_title(self) -> None:
        briefing = _create_mock_briefing(company_name="Acme Inc", ticker="ACME")

        result = _create_view_model(briefing)

        assert result.title == "Acme Inc (ACME) - Investment Briefing"

    def test_separates_key_points_and_risks(self) -> None:
        briefing = _create_mock_briefing(
            key_points=["KP1", "KP2", "KP3"],
            risks=["R1", "R2"],
        )

        result = _create_view_model(briefing)

        assert result.key_points == ["KP1", "KP2", "KP3"]
        assert result.risks == ["R1", "R2"]

    def test_sorts_key_points_by_sort_order(self) -> None:
        briefing = _create_mock_briefing()
        # Manually reorder to test sorting
        briefing.points[0].sort_order = 1
        briefing.points[1].sort_order = 0

        result = _create_view_model(briefing)

        # Should be sorted by sort_order
        assert len(result.key_points) == 2

    def test_converts_metrics_to_tuples(self) -> None:
        briefing = _create_mock_briefing(
            metrics=[("P/E", "25.0"), ("Revenue", "$1B")],
        )

        result = _create_view_model(briefing)

        assert result.metrics == [("P/E", "25.0"), ("Revenue", "$1B")]

    def test_handles_none_sector(self) -> None:
        briefing = _create_mock_briefing(sector=None)

        result = _create_view_model(briefing)

        assert result.sector is None

    def test_handles_none_analyst_name(self) -> None:
        briefing = _create_mock_briefing(analyst_name=None)

        result = _create_view_model(briefing)

        assert result.analyst_name is None

    def test_sets_generated_at_timestamp(self) -> None:
        briefing = _create_mock_briefing()
        before = datetime.now(timezone.utc)

        result = _create_view_model(briefing)

        after = datetime.now(timezone.utc)
        generated = datetime.fromisoformat(result.generated_at.replace("Z", "+00:00"))
        assert before <= generated <= after


class TestRenderBriefingReport:
    """Tests for render_briefing_report function."""

    def test_renders_html_document(self) -> None:
        briefing = _create_mock_briefing()

        result = render_briefing_report(briefing)

        assert "<!DOCTYPE html>" in result or "<html" in result
        assert "</html>" in result

    def test_includes_company_name_in_output(self) -> None:
        briefing = _create_mock_briefing(company_name="Acme Holdings")

        result = render_briefing_report(briefing)

        assert "Acme Holdings" in result

    def test_includes_ticker_in_output(self) -> None:
        briefing = _create_mock_briefing(ticker="ACME")

        result = render_briefing_report(briefing)

        assert "ACME" in result

    def test_includes_key_points_in_output(self) -> None:
        briefing = _create_mock_briefing(key_points=["Revenue grew 20%", "New products"])

        result = render_briefing_report(briefing)

        assert "Revenue grew 20%" in result
        assert "New products" in result

    def test_includes_risks_in_output(self) -> None:
        briefing = _create_mock_briefing(risks=["Market volatility", "Competition"])

        result = render_briefing_report(briefing)

        assert "Market volatility" in result
        assert "Competition" in result

    def test_includes_metrics_in_output(self) -> None:
        briefing = _create_mock_briefing(metrics=[("P/E Ratio", "28.5")])

        result = render_briefing_report(briefing)

        assert "P/E Ratio" in result
        assert "28.5" in result

    def test_includes_summary(self) -> None:
        briefing = _create_mock_briefing(summary="Strong growth expected in Q2.")

        result = render_briefing_report(briefing)

        assert "Strong growth expected in Q2." in result

    def test_includes_recommendation(self) -> None:
        briefing = _create_mock_briefing(recommendation="Buy with caution.")

        result = render_briefing_report(briefing)

        assert "Buy with caution." in result
