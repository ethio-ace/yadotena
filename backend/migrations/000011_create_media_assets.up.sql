CREATE TABLE IF NOT EXISTS media_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sha256_hash VARCHAR(64) UNIQUE NOT NULL,
    original_filename VARCHAR(255) NOT NULL DEFAULT '',
    storage_key VARCHAR(512) NOT NULL,
    public_url VARCHAR(1024) NOT NULL,
    content_type VARCHAR(100) NOT NULL DEFAULT 'image/webp',
    file_size BIGINT NOT NULL DEFAULT 0,
    width INT DEFAULT 0,
    height INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_assets_hash ON media_assets(sha256_hash);
