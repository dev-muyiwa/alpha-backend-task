from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class BriefingMetricCreate(BaseModel):
    """A financial metric for a briefing."""

    name: str = Field(
        min_length=1,
        max_length=100,
        description="Name of the metric",
        json_schema_extra={"example": "P/E Ratio"},
    )
    value: str = Field(
        min_length=1,
        max_length=200,
        description="Value of the metric",
        json_schema_extra={"example": "28.1x"},
    )


class BriefingCreate(BaseModel):
    """Request body for creating a new briefing."""

    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "companyName": "Acme Holdings",
                "ticker": "ACME",
                "sector": "Industrial Technology",
                "analystName": "Jane Doe",
                "summary": "Acme is benefiting from strong enterprise demand and improving operating leverage, though customer concentration remains a near-term risk.",
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
                    {"name": "P/E Ratio", "value": "28.1x"},
                ],
            }
        },
    )

    company_name: str = Field(
        min_length=1,
        max_length=200,
        alias="companyName",
        description="Full name of the company",
    )
    ticker: str = Field(
        min_length=1,
        max_length=10,
        description="Stock ticker symbol (automatically converted to uppercase)",
    )
    sector: str | None = Field(
        default=None,
        max_length=100,
        description="Industry sector of the company",
    )
    analyst_name: str | None = Field(
        default=None,
        max_length=100,
        alias="analystName",
        description="Name of the analyst who prepared the briefing",
    )
    summary: str = Field(
        min_length=1,
        description="Executive summary of the investment thesis",
    )
    recommendation: str = Field(
        min_length=1,
        description="Investment recommendation (e.g., Buy, Hold, Sell with rationale)",
    )
    key_points: list[str] = Field(
        min_length=2,
        alias="keyPoints",
        description="Key investment points as strings (minimum 2 required)",
    )
    risks: list[str] = Field(
        min_length=1,
        alias="risks",
        description="Risk factors as strings (minimum 1 required)",
    )
    metrics: list[BriefingMetricCreate] | None = Field(
        default=None,
        description="Financial metrics (optional, names must be unique)",
    )

    @field_validator("ticker")
    @classmethod
    def normalize_ticker(cls, v: str) -> str:
        return v.upper().strip()

    @field_validator("key_points")
    @classmethod
    def validate_key_points(cls, v: list[str]) -> list[str]:
        cleaned = [s.strip() for s in v if s.strip()]
        if len(cleaned) < 2:
            raise ValueError("At least 2 non-empty key points are required")
        return cleaned

    @field_validator("risks")
    @classmethod
    def validate_risks(cls, v: list[str]) -> list[str]:
        cleaned = [s.strip() for s in v if s.strip()]
        if len(cleaned) < 1:
            raise ValueError("At least 1 non-empty risk is required")
        return cleaned

    @model_validator(mode="after")
    def validate_unique_metric_names(self) -> "BriefingCreate":
        if self.metrics:
            names = [m.name for m in self.metrics]
            if len(names) != len(set(names)):
                raise ValueError("Metric names must be unique within a briefing")
        return self


class BriefingPointRead(BaseModel):
    """A key point or risk from a briefing."""

    model_config = ConfigDict(from_attributes=True)

    id: int = Field(description="Unique identifier of the point")
    point_type: str = Field(description="Type of point: 'key_point' or 'risk'")
    content: str = Field(description="Text content of the point")
    sort_order: int = Field(description="Display order within its type")


class BriefingMetricRead(BaseModel):
    """A financial metric from a briefing."""

    model_config = ConfigDict(from_attributes=True)

    id: int = Field(description="Unique identifier of the metric")
    name: str = Field(description="Name of the metric")
    value: str = Field(description="Value of the metric")


class BriefingRead(BaseModel):
    """Response body for a briefing."""

    model_config = ConfigDict(from_attributes=True)

    id: int = Field(description="Unique identifier of the briefing")
    company_name: str = Field(description="Full name of the company")
    ticker: str = Field(description="Stock ticker symbol (uppercase)")
    sector: str | None = Field(description="Industry sector")
    analyst_name: str | None = Field(description="Name of the analyst")
    summary: str = Field(description="Executive summary")
    recommendation: str = Field(description="Investment recommendation")
    is_generated: bool = Field(description="Whether the HTML report has been generated")
    generated_at: datetime | None = Field(description="Timestamp when the report was generated")
    created_at: datetime = Field(description="Timestamp when the briefing was created")
    points: list[BriefingPointRead] = Field(description="Key points and risks")
    metrics: list[BriefingMetricRead] = Field(description="Financial metrics")
