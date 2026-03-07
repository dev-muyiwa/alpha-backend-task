"""Unit tests for briefing_service."""

from sqlalchemy.orm import Session

from app.schemas.briefing import BriefingCreate, BriefingMetricCreate
from app.services.briefing_service import create_briefing, generate_briefing_html, get_briefing


def _valid_briefing_create() -> BriefingCreate:
    return BriefingCreate(
        company_name="Test Company",
        ticker="TEST",
        sector="Technology",
        analyst_name="John Analyst",
        summary="This is a test summary.",
        recommendation="Buy and hold.",
        key_points=["Point one", "Point two"],
        risks=["Risk one"],
        metrics=[BriefingMetricCreate(name="P/E", value="25.0")],
    )


class TestCreateBriefing:
    """Tests for create_briefing function."""

    def test_creates_briefing_with_all_fields(self, db_session: Session) -> None:
        payload = _valid_briefing_create()

        result = create_briefing(db_session, payload)

        assert result.company_name == "Test Company"
        assert result.ticker == "TEST"
        assert result.sector == "Technology"
        assert result.analyst_name == "John Analyst"
        assert result.summary == "This is a test summary."
        assert result.recommendation == "Buy and hold."
        assert result.is_generated is False
        assert result.generated_at is None

    def test_creates_key_points_with_correct_sort_order(self, db_session: Session) -> None:
        payload = _valid_briefing_create()

        result = create_briefing(db_session, payload)

        key_points = [p for p in result.points if p.point_type == "key_point"]
        assert len(key_points) == 2
        assert key_points[0].content == "Point one"
        assert key_points[0].sort_order == 0
        assert key_points[1].content == "Point two"
        assert key_points[1].sort_order == 1

    def test_creates_risks_with_correct_sort_order(self, db_session: Session) -> None:
        payload = BriefingCreate(
            company_name="Test",
            ticker="TST",
            summary="Summary",
            recommendation="Rec",
            key_points=["KP1", "KP2"],
            risks=["Risk A", "Risk B", "Risk C"],
        )

        result = create_briefing(db_session, payload)

        risks = [p for p in result.points if p.point_type == "risk"]
        assert len(risks) == 3
        assert risks[0].content == "Risk A"
        assert risks[0].sort_order == 0
        assert risks[2].content == "Risk C"
        assert risks[2].sort_order == 2

    def test_creates_metrics(self, db_session: Session) -> None:
        payload = _valid_briefing_create()

        result = create_briefing(db_session, payload)

        assert len(result.metrics) == 1
        assert result.metrics[0].name == "P/E"
        assert result.metrics[0].value == "25.0"

    def test_creates_without_optional_fields(self, db_session: Session) -> None:
        payload = BriefingCreate(
            company_name="Minimal Corp",
            ticker="MIN",
            summary="Minimal summary.",
            recommendation="Hold.",
            key_points=["Point 1", "Point 2"],
            risks=["Risk 1"],
        )

        result = create_briefing(db_session, payload)

        assert result.sector is None
        assert result.analyst_name is None
        assert result.metrics == []

    def test_strips_whitespace_from_fields(self, db_session: Session) -> None:
        payload = BriefingCreate(
            company_name="  Whitespace Corp  ",
            ticker="  WS  ",
            sector="  Tech  ",
            analyst_name="  Analyst  ",
            summary="  Summary  ",
            recommendation="  Rec  ",
            key_points=["P1", "P2"],
            risks=["R1"],
        )

        result = create_briefing(db_session, payload)

        assert result.company_name == "Whitespace Corp"
        assert result.ticker == "WS"
        assert result.sector == "Tech"
        assert result.analyst_name == "Analyst"
        assert result.summary == "Summary"
        assert result.recommendation == "Rec"

    def test_uppercases_ticker(self, db_session: Session) -> None:
        payload = BriefingCreate(
            company_name="Test",
            ticker="lowercase",
            summary="Summary",
            recommendation="Rec",
            key_points=["KP1", "KP2"],
            risks=["R1"],
        )

        result = create_briefing(db_session, payload)

        assert result.ticker == "LOWERCASE"


class TestGetBriefing:
    """Tests for get_briefing function."""

    def test_returns_briefing_when_found(self, db_session: Session) -> None:
        created = create_briefing(db_session, _valid_briefing_create())

        result = get_briefing(db_session, created.id)

        assert result is not None
        assert result.id == created.id
        assert result.company_name == "Test Company"

    def test_returns_none_when_not_found(self, db_session: Session) -> None:
        result = get_briefing(db_session, 99999)

        assert result is None

    def test_eager_loads_points_and_metrics(self, db_session: Session) -> None:
        created = create_briefing(db_session, _valid_briefing_create())

        result = get_briefing(db_session, created.id)

        assert result is not None
        assert len(result.points) == 3  # 2 key_points + 1 risk
        assert len(result.metrics) == 1


class TestGenerateBriefingHtml:
    """Tests for generate_briefing_html function."""

    def test_generates_html_and_updates_briefing(self, db_session: Session) -> None:
        created = create_briefing(db_session, _valid_briefing_create())
        assert created.is_generated is False
        assert created.html_content is None

        result = generate_briefing_html(db_session, created.id)

        assert result is not None
        assert result.is_generated is True
        assert result.generated_at is not None
        assert result.html_content is not None
        assert "Test Company" in result.html_content

    def test_returns_none_when_briefing_not_found(self, db_session: Session) -> None:
        result = generate_briefing_html(db_session, 99999)

        assert result is None

    def test_html_contains_expected_content(self, db_session: Session) -> None:
        payload = BriefingCreate(
            company_name="Acme Inc",
            ticker="ACME",
            sector="Industrial",
            summary="Strong growth expected.",
            recommendation="Buy.",
            key_points=["Revenue up 20%", "New products launched"],
            risks=["Market volatility"],
            metrics=[BriefingMetricCreate(name="Revenue", value="$1B")],
        )
        created = create_briefing(db_session, payload)

        result = generate_briefing_html(db_session, created.id)

        assert result is not None
        assert "Acme Inc" in result.html_content
        assert "ACME" in result.html_content
        assert "Revenue up 20%" in result.html_content
        assert "Market volatility" in result.html_content
