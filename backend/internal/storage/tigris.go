package storage

import (
	"bytes"
	"context"
	"crypto/sha256"
	"crypto/tls"
	"encoding/hex"
	"fmt"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"log"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"
	"github.com/chai2010/webp"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	_ "golang.org/x/image/bmp"
	"golang.org/x/image/draw"
	_ "golang.org/x/image/webp"
	"yadotena/internal/config"
)

type MediaAsset struct {
	ID               string    `json:"id"`
	SHA256Hash       string    `json:"sha256Hash"`
	OriginalFilename string    `json:"originalFilename"`
	StorageKey       string    `json:"storageKey"`
	PublicURL        string    `json:"publicUrl"`
	ContentType      string    `json:"contentType"`
	FileSize         int64     `json:"fileSize"`
	Width            int       `json:"width"`
	Height           int       `json:"height"`
	CreatedAt        time.Time `json:"createdAt"`
}

type UploadResult struct {
	PublicURL    string `json:"publicUrl"`
	URL          string `json:"url"`
	Key          string `json:"key"`
	Hash         string `json:"hash"`
	Filename     string `json:"filename"`
	ContentType  string `json:"contentType"`
	FileSize     int64  `json:"fileSize"`
	Deduplicated bool   `json:"deduplicated"`
}

type PresignResult struct {
	UploadURL string            `json:"uploadUrl"`
	Key       string            `json:"key,omitempty"`
	PublicURL string            `json:"publicUrl"`
	Headers   map[string]string `json:"headers,omitempty"`
	ExpiresIn int               `json:"expiresIn,omitempty"`
}

type TigrisStorage struct {
	client        *s3.Client
	presignClient *s3.PresignClient
	bucket        string
	endpoint      string
	publicBaseURL string
	uploadsDir    string
	httpClient    *http.Client
	pool          *pgxpool.Pool
	mu            sync.RWMutex
	memoryCache   map[string]*MediaAsset
}

func NewTigrisStorage(cfg config.Config, pool *pgxpool.Pool) *TigrisStorage {
	if cfg.TigrisAccessKeyID == "" || cfg.TigrisSecretAccessKey == "" {
		log.Println("tigris: credentials missing, fallback mode")
	}

	customResolver := aws.EndpointResolverWithOptionsFunc(func(service, region string, options ...interface{}) (aws.Endpoint, error) {
		return aws.Endpoint{
			URL:               cfg.TigrisEndpoint,
			SigningRegion:     "auto",
			HostnameImmutable: true,
		}, nil
	})

	awsCfg := aws.Config{
		Region:                      "auto",
		Credentials:                 credentials.NewStaticCredentialsProvider(cfg.TigrisAccessKeyID, cfg.TigrisSecretAccessKey, ""),
		EndpointResolverWithOptions: customResolver,
	}

	client := s3.NewFromConfig(awsCfg, func(o *s3.Options) {
		o.UsePathStyle = true
	})

	presignClient := s3.NewPresignClient(client)

	httpTr := &http.Transport{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: false},
	}

	upDir := cfg.UploadsDir
	if upDir == "" {
		upDir = "uploads"
	}
	_ = os.MkdirAll(upDir, 0o755)

	return &TigrisStorage{
		client:        client,
		presignClient: presignClient,
		bucket:        cfg.TigrisBucket,
		endpoint:      strings.TrimRight(cfg.TigrisEndpoint, "/"),
		publicBaseURL: cfg.PublicBaseURL,
		uploadsDir:    upDir,
		pool:          pool,
		memoryCache:   make(map[string]*MediaAsset),
		httpClient: &http.Client{
			Transport: httpTr,
			Timeout:   15 * time.Second,
		},
	}
}

func (t *TigrisStorage) GetAssetByHash(ctx context.Context, hash string) (*MediaAsset, error) {
	if hash == "" {
		return nil, nil
	}

	// 1. Check in-memory cache
	t.mu.RLock()
	cachedAsset, ok := t.memoryCache[hash]
	t.mu.RUnlock()
	if ok && cachedAsset != nil {
		return cachedAsset, nil
	}

	// 2. Query Postgres DB
	if t.pool == nil {
		return nil, nil
	}

	var a MediaAsset
	err := t.pool.QueryRow(ctx, `
		SELECT id::text, sha256_hash, original_filename, storage_key, public_url, content_type, file_size, width, height, created_at
		FROM media_assets
		WHERE sha256_hash = $1
		LIMIT 1
	`, hash).Scan(&a.ID, &a.SHA256Hash, &a.OriginalFilename, &a.StorageKey, &a.PublicURL, &a.ContentType, &a.FileSize, &a.Width, &a.Height, &a.CreatedAt)

	if err != nil {
		return nil, err
	}

	// Save to in-memory cache for ultra-fast subsequent lookups
	t.mu.Lock()
	t.memoryCache[hash] = &a
	t.mu.Unlock()

	return &a, nil
}

func (t *TigrisStorage) GetPresignedPutURL(ctx context.Context, fileName string, contentType string) (*PresignResult, error) {
	ext := path.Ext(fileName)
	if ext == "" {
		ext = ".webp"
	}
	key := fmt.Sprintf("uploads/%s/%s%s", time.Now().Format("2006/01"), uuid.New().String(), ext)

	req, err := t.presignClient.PresignPutObject(ctx, &s3.PutObjectInput{
		Bucket:       aws.String(t.bucket),
		Key:          aws.String(key),
		ContentType:  aws.String(contentType),
		CacheControl: aws.String("public, max-age=31536000, immutable"),
	}, s3.WithPresignExpires(15*time.Minute))

	if err != nil {
		return nil, fmt.Errorf("tigris presign put error: %w", err)
	}

	uploadURL := req.URL
	var publicURL string
	baseURL := strings.TrimRight(t.publicBaseURL, "/")
	if baseURL != "" {
		publicURL = fmt.Sprintf("%s/uploads/%s", baseURL, key)
	} else if t.endpoint != "" && t.bucket != "" {
		publicURL = fmt.Sprintf("%s/%s/%s", t.endpoint, t.bucket, key)
	} else {
		publicURL = fmt.Sprintf("/uploads/%s", key)
	}

	return &PresignResult{
		UploadURL: uploadURL,
		Key:       key,
		PublicURL: publicURL,
		ExpiresIn: 900,
	}, nil
}

func (t *TigrisStorage) ConfirmPresignedUpload(ctx context.Context, key, originalFilename string) (*UploadResult, error) {
	key = strings.TrimPrefix(key, "/")
	body, _, err := t.GetObject(ctx, key)
	if err != nil || body == nil {
		return nil, fmt.Errorf("failed to retrieve presigned uploaded object at key %s: %w", key, err)
	}
	defer body.Close()

	return t.UploadAndOptimizeImageDetailed(ctx, body, originalFilename)
}

func (t *TigrisStorage) UploadAndOptimizeImage(ctx context.Context, r io.Reader, originalFilename string) (string, error) {
	res, err := t.UploadAndOptimizeImageDetailed(ctx, r, originalFilename)
	if err != nil {
		return "", err
	}
	return res.PublicURL, nil
}

func (t *TigrisStorage) UploadAndOptimizeImageDetailed(ctx context.Context, r io.Reader, originalFilename string) (*UploadResult, error) {
	buf, err := io.ReadAll(r)
	if err != nil {
		return nil, fmt.Errorf("read image error: %w", err)
	}
	if len(buf) == 0 {
		return nil, fmt.Errorf("uploaded file is empty")
	}

	// 1. Compute raw payload SHA-256 hash
	rawHashBytes := sha256.Sum256(buf)
	rawHash := hex.EncodeToString(rawHashBytes[:])

	// Deduplication Check 1: Check if this exact input file hash exists
	if asset, _ := t.GetAssetByHash(ctx, rawHash); asset != nil && asset.PublicURL != "" {
		log.Printf("tigris storage: deduplicated image upload by raw hash (%s)", rawHash[:12])
		return &UploadResult{
			PublicURL:    asset.PublicURL,
			URL:          asset.PublicURL,
			Key:          asset.StorageKey,
			Hash:         asset.SHA256Hash,
			Filename:     originalFilename,
			ContentType:  asset.ContentType,
			FileSize:     asset.FileSize,
			Deduplicated: true,
		}, nil
	}

	// 2. Decode and optimize image
	contentType := "image/webp"
	img, _, errDecode := image.Decode(bytes.NewReader(buf))
	var finalBytes []byte
	ext := ".webp"
	imgWidth, imgHeight := 0, 0

	if errDecode != nil {
		log.Printf("tigris image decode notice (raw upload fallback): %v", errDecode)
		finalBytes = buf
		contentType = http.DetectContentType(buf)
		if origExt := path.Ext(originalFilename); origExt != "" {
			ext = origExt
		}
	} else {
		bounds := img.Bounds()
		imgWidth = bounds.Dx()
		imgHeight = bounds.Dy()

		if imgWidth > 800 || imgHeight > 800 {
			maxWidth, maxHeight := 800, 800
			ratioW := float64(maxWidth) / float64(imgWidth)
			ratioH := float64(maxHeight) / float64(imgHeight)

			ratio := ratioW
			if ratioH < ratioW {
				ratio = ratioH
			}

			newWidth := int(float64(imgWidth) * ratio)
			newHeight := int(float64(imgHeight) * ratio)

			dst := image.NewRGBA(image.Rect(0, 0, newWidth, newHeight))
			draw.BiLinear.Scale(dst, dst.Bounds(), img, bounds, draw.Over, nil)
			img = dst
			imgWidth = newWidth
			imgHeight = newHeight
		}

		outBuf := new(bytes.Buffer)
		if errWebp := webp.Encode(outBuf, img, &webp.Options{Lossless: false, Quality: 85}); errWebp != nil {
			log.Printf("webp encode failed, uploading raw: %v", errWebp)
			finalBytes = buf
			contentType = http.DetectContentType(buf)
			if origExt := path.Ext(originalFilename); origExt != "" {
				ext = origExt
			}
		} else {
			finalBytes = outBuf.Bytes()
		}
	}

	// 3. Compute final SHA-256 hash of processed output bytes
	finalHashBytes := sha256.Sum256(finalBytes)
	finalHash := hex.EncodeToString(finalHashBytes[:])

	// Deduplication Check 2: Check if final WebP hash exists
	if finalHash != rawHash {
		if asset, _ := t.GetAssetByHash(ctx, finalHash); asset != nil && asset.PublicURL != "" {
			log.Printf("tigris storage: deduplicated image upload by final hash (%s)", finalHash[:12])
			return &UploadResult{
				PublicURL:    asset.PublicURL,
				URL:          asset.PublicURL,
				Key:          asset.StorageKey,
				Hash:         asset.SHA256Hash,
				Filename:     originalFilename,
				ContentType:  asset.ContentType,
				FileSize:     asset.FileSize,
				Deduplicated: true,
			}, nil
		}
	}

	// 4. Construct content-addressed clean key & filename
	dateSubdir := time.Now().Format("2006/01")
	filename := fmt.Sprintf("%s%s", finalHash[:16], ext)
	localRelPath := fmt.Sprintf("media/%s/%s", dateSubdir, filename)
	localFullPath := filepath.Join(t.uploadsDir, localRelPath)
	key := localRelPath

	// 5. Write to local disk
	_ = os.MkdirAll(filepath.Dir(localFullPath), 0o755)
	if errWrite := os.WriteFile(localFullPath, finalBytes, 0o644); errWrite != nil {
		log.Printf("local upload write notice: %v", errWrite)
	}

	// 6. Build public URL
	var publicURL string
	baseURL := strings.TrimRight(t.publicBaseURL, "/")
	if baseURL != "" {
		publicURL = fmt.Sprintf("%s/uploads/%s", baseURL, localRelPath)
	} else {
		publicURL = fmt.Sprintf("/uploads/%s", localRelPath)
	}

	fileSize := int64(len(finalBytes))
	canonicalAsset := &MediaAsset{
		SHA256Hash:       finalHash,
		OriginalFilename: originalFilename,
		StorageKey:       key,
		PublicURL:        publicURL,
		ContentType:      contentType,
		FileSize:         fileSize,
		Width:            imgWidth,
		Height:           imgHeight,
		CreatedAt:        time.Now(),
	}

	// 7. Store asset record in Postgres DB
	if t.pool != nil {
		_, errDB := t.pool.Exec(ctx, `
			INSERT INTO media_assets (sha256_hash, original_filename, storage_key, public_url, content_type, file_size, width, height)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
			ON CONFLICT (sha256_hash) DO UPDATE SET public_url = EXCLUDED.public_url
		`, finalHash, originalFilename, key, publicURL, contentType, fileSize, imgWidth, imgHeight)

		if errDB != nil {
			log.Printf("tigris db asset save notice: %v", errDB)
		}

		if rawHash != finalHash {
			_, _ = t.pool.Exec(ctx, `
				INSERT INTO media_assets (sha256_hash, original_filename, storage_key, public_url, content_type, file_size, width, height)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
				ON CONFLICT (sha256_hash) DO UPDATE SET public_url = EXCLUDED.public_url
			`, rawHash, originalFilename, key, publicURL, contentType, fileSize, imgWidth, imgHeight)
		}
	}

	// 8. Update in-memory cache for both raw and final hashes
	t.mu.Lock()
	t.memoryCache[rawHash] = canonicalAsset
	t.memoryCache[finalHash] = canonicalAsset
	t.mu.Unlock()

	// 9. Asynchronously upload to Tigris S3 with Cache-Control header & public-read ACL
	go func(b []byte, k, ct string) {
		cacheControl := "public, max-age=31536000, immutable"
		_, errPut := t.client.PutObject(context.Background(), &s3.PutObjectInput{
			Bucket:       aws.String(t.bucket),
			Key:          aws.String(k),
			Body:         bytes.NewReader(b),
			ContentType:  aws.String(ct),
			CacheControl: aws.String(cacheControl),
			ACL:          types.ObjectCannedACLPublicRead,
		})
		if errPut != nil {
			log.Printf("tigris upload async notice: %v", errPut)
		} else {
			log.Printf("tigris upload success: %s", k)
		}
	}(finalBytes, key, contentType)

	return &UploadResult{
		PublicURL:    publicURL,
		URL:          publicURL,
		Key:          key,
		Hash:         finalHash,
		Filename:     filename,
		ContentType:  contentType,
		FileSize:     fileSize,
		Deduplicated: false,
	}, nil
}

func (t *TigrisStorage) UploadFromLink(ctx context.Context, imageURL string) (string, error) {
	res, err := t.UploadFromLinkDetailed(ctx, imageURL)
	if err != nil {
		return "", err
	}
	return res.PublicURL, nil
}

func (t *TigrisStorage) UploadFromLinkDetailed(ctx context.Context, imageURL string) (*UploadResult, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, imageURL, nil)
	if err != nil {
		return nil, fmt.Errorf("invalid image URL: %w", err)
	}

	resp, err := t.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch image from URL: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("fetching image returned status %d", resp.StatusCode)
	}

	return t.UploadAndOptimizeImageDetailed(ctx, resp.Body, path.Base(imageURL))
}

func (t *TigrisStorage) GetObject(ctx context.Context, key string) (io.ReadCloser, string, error) {
	key = strings.TrimPrefix(key, "/")
	out, err := t.client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(t.bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		return nil, "", err
	}
	ct := "image/webp"
	if out.ContentType != nil && *out.ContentType != "" {
		ct = *out.ContentType
	}
	return out.Body, ct, nil
}
