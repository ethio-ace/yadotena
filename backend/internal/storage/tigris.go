package storage

import (
	"bytes"
	"context"
	"crypto/tls"
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
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/chai2010/webp"
	"github.com/google/uuid"
	_ "golang.org/x/image/bmp"
	"golang.org/x/image/draw"
	_ "golang.org/x/image/webp"
	"yadotena/internal/config"
)

type TigrisStorage struct {
	client        *s3.Client
	presignClient *s3.PresignClient
	bucket        string
	endpoint      string
	publicBaseURL string
	uploadsDir    string
	httpClient    *http.Client
}

func NewTigrisStorage(cfg config.Config) *TigrisStorage {
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
		httpClient: &http.Client{
			Transport: httpTr,
			Timeout:   15 * time.Second,
		},
	}
}

func (t *TigrisStorage) GetPresignedPutURL(ctx context.Context, fileName string, contentType string) (*PresignResult, error) {
	ext := path.Ext(fileName)
	if ext == "" {
		ext = ".webp"
	}
	key := fmt.Sprintf("uploads/%s/%s%s", time.Now().Format("2006/01/02"), uuid.New().String(), ext)

	req, err := t.presignClient.PresignPutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(t.bucket),
		Key:         aws.String(key),
		ContentType: aws.String(contentType),
	}, s3.WithPresignExpires(15*time.Minute))

	if err != nil {
		return nil, fmt.Errorf("tigris presign put error: %w", err)
	}

	publicURL := fmt.Sprintf("%s/%s/%s", t.endpoint, t.bucket, key)

	return &PresignResult{
		UploadURL: req.URL,
		Key:       key,
		PublicURL: publicURL,
		ExpiresIn: 900,
	}, nil
}

func (t *TigrisStorage) UploadAndOptimizeImage(ctx context.Context, r io.Reader, originalFilename string) (string, error) {
	buf, err := io.ReadAll(r)
	if err != nil {
		return "", fmt.Errorf("read image error: %w", err)
	}

	contentType := "image/webp"
	img, _, err := image.Decode(bytes.NewReader(buf))
	var finalBytes []byte
	ext := ".webp"

	if err != nil {
		log.Printf("tigris image decode notice (raw upload fallback): %v", err)
		finalBytes = buf
		contentType = http.DetectContentType(buf)
		if origExt := path.Ext(originalFilename); origExt != "" {
			ext = origExt
		}
	} else {
		bounds := img.Bounds()
		width := bounds.Dx()
		height := bounds.Dy()

		if width > 800 || height > 800 {
			maxWidth, maxHeight := 800, 800
			ratioW := float64(maxWidth) / float64(width)
			ratioH := float64(maxHeight) / float64(height)

			ratio := ratioW
			if ratioH < ratioW {
				ratio = ratioH
			}

			newWidth := int(float64(width) * ratio)
			newHeight := int(float64(height) * ratio)

			dst := image.NewRGBA(image.Rect(0, 0, newWidth, newHeight))
			draw.BiLinear.Scale(dst, dst.Bounds(), img, bounds, draw.Over, nil)
			img = dst
		}

		outBuf := new(bytes.Buffer)
		if err := webp.Encode(outBuf, img, &webp.Options{Lossless: false, Quality: 85}); err != nil {
			log.Printf("webp encode failed, uploading raw: %v", err)
			finalBytes = buf
			contentType = http.DetectContentType(buf)
			if origExt := path.Ext(originalFilename); origExt != "" {
				ext = origExt
			}
		} else {
			finalBytes = outBuf.Bytes()
		}
	}

	uniqueName := fmt.Sprintf("%s%s", uuid.New().String(), ext)
	dateSubdir := time.Now().Format("2006/01")
	localRelPath := fmt.Sprintf("media/%s/%s", dateSubdir, uniqueName)
	localFullPath := filepath.Join(t.uploadsDir, localRelPath)

	_ = os.MkdirAll(filepath.Dir(localFullPath), 0o755)
	if errWrite := os.WriteFile(localFullPath, finalBytes, 0o644); errWrite != nil {
		log.Printf("local upload write notice: %v", errWrite)
	}

	// Also upload to Tigris S3 asynchronously
	key := fmt.Sprintf("media/%s/%s", dateSubdir, uniqueName)
	go func(b []byte, k, ct string) {
		_, errPut := t.client.PutObject(context.Background(), &s3.PutObjectInput{
			Bucket:      aws.String(t.bucket),
			Key:         aws.String(k),
			Body:        bytes.NewReader(b),
			ContentType: aws.String(ct),
		})
		if errPut != nil {
			log.Printf("tigris upload async notice: %v", errPut)
		} else {
			log.Printf("tigris upload success: %s", k)
		}
	}(finalBytes, key, contentType)

	baseURL := strings.TrimRight(t.publicBaseURL, "/")
	if baseURL == "" || baseURL == "http://localhost:3000" || strings.Contains(baseURL, "onrender.com") {
		baseURL = fmt.Sprintf("%s/%s", t.endpoint, t.bucket)
	}
	publicURL := fmt.Sprintf("%s/%s", baseURL, localRelPath)
	return publicURL, nil
}

func (t *TigrisStorage) UploadFromLink(ctx context.Context, imageURL string) (string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, imageURL, nil)
	if err != nil {
		return "", fmt.Errorf("invalid image URL: %w", err)
	}

	resp, err := t.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to fetch image from URL: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return "", fmt.Errorf("fetching image returned status %d", resp.StatusCode)
	}

	return t.UploadAndOptimizeImage(ctx, resp.Body, path.Base(imageURL))
}
