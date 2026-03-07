from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models import Briefing, BriefingMetric, BriefingPoint  # noqa: F401


@pytest.fixture()
def client() -> Generator[TestClient, None, None]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    testing_session_local = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)

    Base.metadata.create_all(bind=engine)

    def override_get_db() -> Generator[Session, None, None]:
        db = testing_session_local()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)


def _valid_briefing_payload() -> dict:
    return {
        "companyName": "Acme Holdings",
        "ticker": "acme",
        "sector": "Industrial Technology",
        "analystName": "Jane Doe",
        "summary": "Acme is benefiting from strong enterprise demand and improving operating leverage.",
        "recommendation": "Monitor for margin expansion and customer diversification before increasing exposure.",
        "keyPoints": [
            "Revenue grew 18% year-over-year in the latest quarter.",
            "Management raised full-year guidance.",
            "Enterprise subscriptions now account for 62% of recurring revenue.",
        ],
        "risks": [
            "Top two customers account for 41% of total revenue.",
            "International expansion may pressure margins over the next two quarters.",
        ],
        "metrics": [
            {"name": "Revenue Growth", "value": "18%"},
            {"name": "Operating Margin", "value": "22.4%"},
        ],
    }


def test_create_briefing_success(client: TestClient) -> None:
    response = client.post("/briefings", json=_valid_briefing_payload())

    assert response.status_code == 201
    data = response.json()
    assert data["company_name"] == "Acme Holdings"
    assert data["ticker"] == "ACME"
    assert data["sector"] == "Industrial Technology"
    assert data["analyst_name"] == "Jane Doe"
    assert data["is_generated"] is False
    assert data["generated_at"] is None
    assert len(data["points"]) == 5  # 3 key_points + 2 risks
    assert len(data["metrics"]) == 2


def test_create_briefing_ticker_uppercase(client: TestClient) -> None:
    payload = _valid_briefing_payload()
    payload["ticker"] = "lowercase"

    response = client.post("/briefings", json=payload)

    assert response.status_code == 201
    assert response.json()["ticker"] == "LOWERCASE"


def test_create_briefing_min_key_points_validation(client: TestClient) -> None:
    payload = _valid_briefing_payload()
    payload["keyPoints"] = ["Only one point"]

    response = client.post("/briefings", json=payload)

    assert response.status_code == 422


def test_create_briefing_min_risks_validation(client: TestClient) -> None:
    payload = _valid_briefing_payload()
    payload["risks"] = []

    response = client.post("/briefings", json=payload)

    assert response.status_code == 422


def test_create_briefing_unique_metric_names(client: TestClient) -> None:
    payload = _valid_briefing_payload()
    payload["metrics"] = [
        {"name": "P/E Ratio", "value": "25.5"},
        {"name": "P/E Ratio", "value": "26.0"},
    ]

    response = client.post("/briefings", json=payload)

    assert response.status_code == 422


def test_get_briefing_success(client: TestClient) -> None:
    create_response = client.post("/briefings", json=_valid_briefing_payload())
    briefing_id = create_response.json()["id"]

    response = client.get(f"/briefings/{briefing_id}")

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == briefing_id
    assert data["company_name"] == "Acme Holdings"


def test_get_briefing_not_found(client: TestClient) -> None:
    response = client.get("/briefings/999")

    assert response.status_code == 404
    assert response.json()["detail"] == "Briefing not found"


def test_generate_briefing_success(client: TestClient) -> None:
    create_response = client.post("/briefings", json=_valid_briefing_payload())
    briefing_id = create_response.json()["id"]

    response = client.post(f"/briefings/{briefing_id}/generate")

    assert response.status_code == 200
    data = response.json()
    assert data["is_generated"] is True
    assert data["generated_at"] is not None


def test_generate_briefing_not_found(client: TestClient) -> None:
    response = client.post("/briefings/999/generate")

    assert response.status_code == 404


def test_get_html_before_generate_returns_409(client: TestClient) -> None:
    create_response = client.post("/briefings", json=_valid_briefing_payload())
    briefing_id = create_response.json()["id"]

    response = client.get(f"/briefings/{briefing_id}/html")

    assert response.status_code == 409
    assert "not been generated" in response.json()["detail"]


def test_get_html_after_generate_returns_html(client: TestClient) -> None:
    create_response = client.post("/briefings", json=_valid_briefing_payload())
    briefing_id = create_response.json()["id"]

    client.post(f"/briefings/{briefing_id}/generate")
    response = client.get(f"/briefings/{briefing_id}/html")

    assert response.status_code == 200
    assert response.headers["content-type"] == "text/html; charset=utf-8"
    assert "Acme Holdings" in response.text
    assert "ACME" in response.text
    assert "Revenue grew 18%" in response.text


def test_get_html_not_found(client: TestClient) -> None:
    response = client.get("/briefings/999/html")

    assert response.status_code == 404


def test_create_briefing_without_optional_fields(client: TestClient) -> None:
    payload = {
        "companyName": "Simple Corp",
        "ticker": "SMPL",
        "summary": "A simple company summary.",
        "recommendation": "Hold.",
        "keyPoints": [
            "Point one",
            "Point two",
        ],
        "risks": [
            "Risk one",
        ],
    }

    response = client.post("/briefings", json=payload)

    assert response.status_code == 201
    data = response.json()
    assert data["sector"] is None
    assert data["analyst_name"] is None
    assert data["metrics"] == []
