"""Unit tests for Pydantic schemas validation."""

import pytest
from pydantic import ValidationError

from app.schemas.briefing import BriefingCreate, BriefingMetricCreate
from app.schemas.sample_item import SampleItemCreate, SampleItemRead


class TestSampleItemCreate:
    """Tests for SampleItemCreate schema validation."""

    def test_valid_with_name_only(self) -> None:
        item = SampleItemCreate(name="Test Item")

        assert item.name == "Test Item"
        assert item.description is None

    def test_valid_with_name_and_description(self) -> None:
        item = SampleItemCreate(name="Test Item", description="A description")

        assert item.name == "Test Item"
        assert item.description == "A description"

    def test_rejects_empty_name(self) -> None:
        with pytest.raises(ValidationError) as exc_info:
            SampleItemCreate(name="")

        errors = exc_info.value.errors()
        assert any(e["loc"] == ("name",) for e in errors)

    def test_rejects_name_too_long(self) -> None:
        with pytest.raises(ValidationError) as exc_info:
            SampleItemCreate(name="a" * 121)

        errors = exc_info.value.errors()
        assert any(e["loc"] == ("name",) for e in errors)

    def test_accepts_name_at_max_length(self) -> None:
        item = SampleItemCreate(name="a" * 120)

        assert len(item.name) == 120

    def test_rejects_description_too_long(self) -> None:
        with pytest.raises(ValidationError) as exc_info:
            SampleItemCreate(name="Test", description="a" * 501)

        errors = exc_info.value.errors()
        assert any(e["loc"] == ("description",) for e in errors)

    def test_accepts_description_at_max_length(self) -> None:
        item = SampleItemCreate(name="Test", description="a" * 500)

        assert len(item.description) == 500


class TestBriefingMetricCreate:
    """Tests for BriefingMetricCreate schema validation."""

    def test_valid_metric(self) -> None:
        metric = BriefingMetricCreate(name="P/E Ratio", value="28.5")

        assert metric.name == "P/E Ratio"
        assert metric.value == "28.5"

    def test_rejects_empty_name(self) -> None:
        with pytest.raises(ValidationError) as exc_info:
            BriefingMetricCreate(name="", value="25.0")

        errors = exc_info.value.errors()
        assert any(e["loc"] == ("name",) for e in errors)

    def test_rejects_empty_value(self) -> None:
        with pytest.raises(ValidationError) as exc_info:
            BriefingMetricCreate(name="P/E", value="")

        errors = exc_info.value.errors()
        assert any(e["loc"] == ("value",) for e in errors)

    def test_rejects_name_too_long(self) -> None:
        with pytest.raises(ValidationError) as exc_info:
            BriefingMetricCreate(name="a" * 101, value="25.0")

        errors = exc_info.value.errors()
        assert any(e["loc"] == ("name",) for e in errors)

    def test_rejects_value_too_long(self) -> None:
        with pytest.raises(ValidationError) as exc_info:
            BriefingMetricCreate(name="P/E", value="a" * 201)

        errors = exc_info.value.errors()
        assert any(e["loc"] == ("value",) for e in errors)


class TestBriefingCreate:
    """Tests for BriefingCreate schema validation."""

    def _valid_payload(self) -> dict:
        return {
            "companyName": "Test Company",
            "ticker": "TEST",
            "summary": "A summary.",
            "recommendation": "Buy.",
            "keyPoints": ["Point 1", "Point 2"],
            "risks": ["Risk 1"],
        }

    def test_valid_minimal_briefing(self) -> None:
        briefing = BriefingCreate(**self._valid_payload())

        assert briefing.company_name == "Test Company"
        assert briefing.ticker == "TEST"
        assert briefing.sector is None
        assert briefing.analyst_name is None
        assert briefing.metrics is None

    def test_valid_full_briefing(self) -> None:
        payload = self._valid_payload()
        payload["sector"] = "Technology"
        payload["analystName"] = "Jane Doe"
        payload["metrics"] = [{"name": "P/E", "value": "25.0"}]

        briefing = BriefingCreate(**payload)

        assert briefing.sector == "Technology"
        assert briefing.analyst_name == "Jane Doe"
        assert len(briefing.metrics) == 1

    def test_ticker_normalized_to_uppercase(self) -> None:
        payload = self._valid_payload()
        payload["ticker"] = "lowercase"

        briefing = BriefingCreate(**payload)

        assert briefing.ticker == "LOWERCASE"

    def test_ticker_strips_whitespace(self) -> None:
        payload = self._valid_payload()
        payload["ticker"] = "  test  "

        briefing = BriefingCreate(**payload)

        assert briefing.ticker == "TEST"

    def test_rejects_less_than_2_key_points(self) -> None:
        payload = self._valid_payload()
        payload["keyPoints"] = ["Only one point"]

        with pytest.raises(ValidationError) as exc_info:
            BriefingCreate(**payload)

        assert "key_points" in str(exc_info.value).lower() or "keyPoints" in str(exc_info.value)

    def test_rejects_empty_key_points(self) -> None:
        payload = self._valid_payload()
        payload["keyPoints"] = []

        with pytest.raises(ValidationError):
            BriefingCreate(**payload)

    def test_filters_empty_string_key_points(self) -> None:
        payload = self._valid_payload()
        payload["keyPoints"] = ["Valid 1", "", "  ", "Valid 2"]

        briefing = BriefingCreate(**payload)

        assert briefing.key_points == ["Valid 1", "Valid 2"]

    def test_rejects_zero_risks(self) -> None:
        payload = self._valid_payload()
        payload["risks"] = []

        with pytest.raises(ValidationError):
            BriefingCreate(**payload)

    def test_filters_empty_string_risks(self) -> None:
        payload = self._valid_payload()
        payload["risks"] = ["Valid risk", "", "  "]

        briefing = BriefingCreate(**payload)

        assert briefing.risks == ["Valid risk"]

    def test_rejects_duplicate_metric_names(self) -> None:
        payload = self._valid_payload()
        payload["metrics"] = [
            {"name": "P/E", "value": "25.0"},
            {"name": "P/E", "value": "26.0"},
        ]

        with pytest.raises(ValidationError) as exc_info:
            BriefingCreate(**payload)

        assert "unique" in str(exc_info.value).lower()

    def test_accepts_unique_metric_names(self) -> None:
        payload = self._valid_payload()
        payload["metrics"] = [
            {"name": "P/E", "value": "25.0"},
            {"name": "Revenue", "value": "$1B"},
        ]

        briefing = BriefingCreate(**payload)

        assert len(briefing.metrics) == 2

    def test_rejects_empty_company_name(self) -> None:
        payload = self._valid_payload()
        payload["companyName"] = ""

        with pytest.raises(ValidationError):
            BriefingCreate(**payload)

    def test_rejects_company_name_too_long(self) -> None:
        payload = self._valid_payload()
        payload["companyName"] = "a" * 201

        with pytest.raises(ValidationError):
            BriefingCreate(**payload)

    def test_rejects_ticker_too_long(self) -> None:
        payload = self._valid_payload()
        payload["ticker"] = "a" * 11

        with pytest.raises(ValidationError):
            BriefingCreate(**payload)

    def test_rejects_empty_summary(self) -> None:
        payload = self._valid_payload()
        payload["summary"] = ""

        with pytest.raises(ValidationError):
            BriefingCreate(**payload)

    def test_rejects_empty_recommendation(self) -> None:
        payload = self._valid_payload()
        payload["recommendation"] = ""

        with pytest.raises(ValidationError):
            BriefingCreate(**payload)
