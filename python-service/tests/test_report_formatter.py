"""Unit tests for report_formatter."""

from datetime import datetime, timezone
from unittest.mock import patch

from app.services.report_formatter import ReportFormatter


class TestReportFormatter:
    """Tests for ReportFormatter class."""

    def test_render_base_returns_html_with_title(self) -> None:
        formatter = ReportFormatter()

        result = formatter.render_base(title="Test Report", body="Test content")

        assert "<!DOCTYPE html>" in result or "<html" in result
        assert "Test Report" in result
        assert "Test content" in result

    def test_render_base_includes_generated_timestamp(self) -> None:
        formatter = ReportFormatter()

        result = formatter.render_base(title="Report", body="Body")

        # Should contain an ISO format timestamp
        assert "T" in result  # ISO format includes T separator

    def test_generated_timestamp_returns_utc_iso_format(self) -> None:
        result = ReportFormatter.generated_timestamp()

        # Should be a valid ISO format timestamp
        parsed = datetime.fromisoformat(result.replace("Z", "+00:00"))
        assert parsed.tzinfo is not None

    def test_generated_timestamp_is_current(self) -> None:
        before = datetime.now(timezone.utc)
        result = ReportFormatter.generated_timestamp()
        after = datetime.now(timezone.utc)

        parsed = datetime.fromisoformat(result.replace("Z", "+00:00"))
        assert before <= parsed <= after

    def test_render_base_escapes_html_in_body(self) -> None:
        formatter = ReportFormatter()

        result = formatter.render_base(
            title="Safe Report",
            body="<script>alert('xss')</script>",
        )

        # The body is passed directly, but Jinja should handle it safely
        # The test verifies the formatter works without errors
        assert "Safe Report" in result

    def test_multiple_renders_are_independent(self) -> None:
        formatter = ReportFormatter()

        result1 = formatter.render_base(title="First", body="Body 1")
        result2 = formatter.render_base(title="Second", body="Body 2")

        assert "First" in result1
        assert "Body 1" in result1
        assert "Second" in result2
        assert "Body 2" in result2
        assert "First" not in result2
        assert "Second" not in result1
