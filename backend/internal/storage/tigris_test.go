package storage

import (
	"bytes"
	"context"
	"image"
	"image/color"
	"image/png"
	"os"
	"testing"
	"yadotena/internal/config"
)

func createDummyPNG() []byte {
	img := image.NewRGBA(image.Rect(0, 0, 100, 100))
	for x := 0; x < 100; x++ {
		for y := 0; y < 100; y++ {
			img.Set(x, y, color.RGBA{R: 200, G: 100, B: 50, A: 255})
		}
	}
	var buf bytes.Buffer
	_ = png.Encode(&buf, img)
	return buf.Bytes()
}

func TestUploadDeduplicationAndOptimization(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "tigris_test_*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	cfg := config.Config{
		UploadsDir:    tempDir,
		PublicBaseURL: "http://localhost:8080",
	}

	st := NewTigrisStorage(cfg, nil)
	ctx := context.Background()

	pngBytes := createDummyPNG()

	// First upload
	res1, err := st.UploadAndOptimizeImageDetailed(ctx, bytes.NewReader(pngBytes), "test_image.png")
	if err != nil {
		t.Fatalf("first upload failed: %v", err)
	}

	if res1.Deduplicated {
		t.Errorf("expected first upload to not be deduplicated")
	}

	if res1.Hash == "" {
		t.Errorf("expected hash to be non-empty")
	}

	if !bytes.HasPrefix([]byte(res1.PublicURL), []byte("http://localhost:8080/uploads/media/")) {
		t.Errorf("unexpected public URL format: %s", res1.PublicURL)
	}

	// Second upload with exact same bytes
	res2, err := st.UploadAndOptimizeImageDetailed(ctx, bytes.NewReader(pngBytes), "duplicate_test.png")
	if err != nil {
		t.Fatalf("second upload failed: %v", err)
	}

	if !res2.Deduplicated {
		t.Errorf("expected second upload to be deduplicated")
	}

	if res2.PublicURL != res1.PublicURL {
		t.Errorf("expected deduplicated URL to match first upload URL (%s vs %s)", res2.PublicURL, res1.PublicURL)
	}

	if res2.Hash != res1.Hash {
		t.Errorf("expected hashes to match (%s vs %s)", res2.Hash, res1.Hash)
	}
}
