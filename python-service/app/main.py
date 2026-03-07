from fastapi import FastAPI

from app.api.briefings import router as briefings_router
from app.api.health import router as health_router
from app.api.sample_items import router as sample_items_router

app = FastAPI(
    title="InsightOps Briefing Service",
    version="1.0.0",
    description=(
        "## Mini Briefing Report Generator API\n\n"
        "This API provides endpoints for creating and managing investment briefing reports.\n\n"
        "### Features\n"
        "- Create briefings with company information, key points, risks, and metrics\n"
        "- Generate professional HTML reports from briefing data\n"
        "- Retrieve briefings and their rendered HTML content\n\n"
        "### Workflow\n"
        "1. **Create a briefing** - POST `/briefings` with company data\n"
        "2. **Generate the report** - POST `/briefings/{id}/generate` to render HTML\n"
        "3. **View the report** - GET `/briefings/{id}/html` to retrieve the HTML"
    ),
    openapi_tags=[
        {"name": "briefings", "description": "Investment briefing report operations"},
        {"name": "health", "description": "Health check endpoints"},
        {"name": "sample-items", "description": "Sample item operations (starter code)"},
    ],
    docs_url="/docs",
    openapi_url="/openapi.json",
)

app.include_router(health_router)
app.include_router(sample_items_router)
app.include_router(briefings_router)


@app.get("/")
def root() -> dict[str, str]:
    return {"service": "InsightOps", "status": "starter-ready"}
