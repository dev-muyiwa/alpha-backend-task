from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Response, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.briefing import BriefingCreate, BriefingRead
from app.services.briefing_service import create_briefing, generate_briefing_html, get_briefing

router = APIRouter(prefix="/briefings", tags=["briefings"])


@router.post(
    "",
    response_model=BriefingRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new briefing",
    description="""
Create a new investment briefing with company information, key points, risks, and optional metrics.

**Validation Rules:**
- `companyName`: Required, 1-200 characters
- `ticker`: Required, 1-10 characters, automatically converted to uppercase
- `keyPoints`: Minimum 2 required
- `risks`: Minimum 1 required
- `metrics`: Optional, but metric names must be unique within a briefing
    """,
    responses={
        201: {"description": "Briefing created successfully"},
        422: {"description": "Validation error (e.g., insufficient key points, duplicate metric names)"},
    },
)
def create_briefing_endpoint(
    payload: BriefingCreate,
    db: Annotated[Session, Depends(get_db)],
) -> BriefingRead:
    """Create a new investment briefing report."""
    briefing = create_briefing(db, payload)
    return BriefingRead.model_validate(briefing)


@router.get(
    "/{briefing_id}",
    response_model=BriefingRead,
    summary="Get a briefing by ID",
    description="Retrieve a briefing's full data including key points, risks, and metrics.",
    responses={
        200: {"description": "Briefing found and returned"},
        404: {"description": "Briefing not found"},
    },
)
def get_briefing_endpoint(
    briefing_id: Annotated[int, Path(description="The unique identifier of the briefing", ge=1)],
    db: Annotated[Session, Depends(get_db)],
) -> BriefingRead:
    """Retrieve a briefing by its ID."""
    briefing = get_briefing(db, briefing_id)
    if briefing is None:
        raise HTTPException(status_code=404, detail="Briefing not found")
    return BriefingRead.model_validate(briefing)


@router.post(
    "/{briefing_id}/generate",
    response_model=BriefingRead,
    summary="Generate HTML report for a briefing",
    description="""
Generate the HTML report for a briefing. This renders the briefing data into a
professional HTML document and stores it for later retrieval.

After calling this endpoint:
- `is_generated` will be set to `true`
- `generated_at` will contain the generation timestamp
- The HTML can be retrieved via `GET /briefings/{id}/html`
    """,
    responses={
        200: {"description": "Report generated successfully"},
        404: {"description": "Briefing not found"},
    },
)
def generate_briefing_endpoint(
    briefing_id: Annotated[int, Path(description="The unique identifier of the briefing", ge=1)],
    db: Annotated[Session, Depends(get_db)],
) -> BriefingRead:
    """Generate the HTML report for a briefing."""
    briefing = generate_briefing_html(db, briefing_id)
    if briefing is None:
        raise HTTPException(status_code=404, detail="Briefing not found")
    return BriefingRead.model_validate(briefing)


@router.get(
    "/{briefing_id}/html",
    response_class=Response,
    summary="Get the rendered HTML report",
    description="""
Retrieve the rendered HTML report for a briefing.

**Prerequisites:** The report must be generated first by calling `POST /briefings/{id}/generate`.

**Returns:** HTML content with `Content-Type: text/html`
    """,
    responses={
        200: {
            "description": "HTML report returned successfully",
            "content": {"text/html": {"example": "<!DOCTYPE html><html>...</html>"}},
        },
        404: {"description": "Briefing not found"},
        409: {"description": "Report not yet generated. Call POST /briefings/{id}/generate first."},
    },
)
def get_briefing_html_endpoint(
    briefing_id: Annotated[int, Path(description="The unique identifier of the briefing", ge=1)],
    db: Annotated[Session, Depends(get_db)],
) -> Response:
    """Get the rendered HTML report for a briefing."""
    briefing = get_briefing(db, briefing_id)
    if briefing is None:
        raise HTTPException(status_code=404, detail="Briefing not found")

    if not briefing.is_generated:
        raise HTTPException(
            status_code=409,
            detail="Briefing report has not been generated. Call POST /briefings/{id}/generate first.",
        )

    return Response(content=briefing.html_content, media_type="text/html")
