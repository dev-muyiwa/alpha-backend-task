CREATE TABLE IF NOT EXISTS briefings (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(200) NOT NULL,
    ticker VARCHAR(10) NOT NULL,
    sector VARCHAR(100),
    analyst_name VARCHAR(100),
    summary TEXT NOT NULL,
    recommendation TEXT NOT NULL,
    html_content TEXT,
    is_generated BOOLEAN DEFAULT false,
    generated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS briefing_points (
    id SERIAL PRIMARY KEY,
    briefing_id INTEGER NOT NULL REFERENCES briefings(id) ON DELETE CASCADE,
    point_type VARCHAR(20) NOT NULL CHECK (point_type IN ('key_point', 'risk')),
    content TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_briefing_points_briefing_id ON briefing_points(briefing_id);

CREATE TABLE IF NOT EXISTS briefing_metrics (
    id SERIAL PRIMARY KEY,
    briefing_id INTEGER NOT NULL REFERENCES briefings(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    value VARCHAR(200) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (briefing_id, name)
);
CREATE INDEX idx_briefing_metrics_briefing_id ON briefing_metrics(briefing_id);
