package storage

import (
	"context"
	"fmt"
	"path"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/google/uuid"
)

type R2Config struct {
	AccountID       string
	AccessKeyID     string
	SecretAccessKey string
	Bucket          string
	PublicBaseURL   string
	Endpoint        string // optional full endpoint URL
}

func (c R2Config) Enabled() bool {
	return c.AccessKeyID != "" && c.SecretAccessKey != "" && c.Bucket != "" && c.PublicBaseURL != "" &&
		(c.Endpoint != "" || c.AccountID != "")
}

func (c R2Config) endpointURL() string {
	if c.Endpoint != "" {
		return strings.TrimRight(c.Endpoint, "/")
	}
	return fmt.Sprintf("https://%s.r2.cloudflarestorage.com", c.AccountID)
}

type PresignResult struct {
	UploadURL string
	PublicURL string
	Headers   map[string]string
	ExpiresIn int
}

func PresignPut(ctx context.Context, cfg R2Config, contentType, filename string, maxBytes int64) (*PresignResult, error) {
	if !cfg.Enabled() {
		return nil, fmt.Errorf("r2 not configured")
	}
	ct := strings.ToLower(contentType)
	if ct != "image/jpeg" && ct != "image/png" && ct != "image/webp" {
		return nil, fmt.Errorf("content_type must be jpeg/png/webp")
	}
	ext := ".jpg"
	switch ct {
	case "image/png":
		ext = ".png"
	case "image/webp":
		ext = ".webp"
	}
	_ = filename
	_ = maxBytes
	key := "menu/" + uuid.New().String() + ext

	client := s3.New(s3.Options{
		Region:       "auto",
		BaseEndpoint: aws.String(cfg.endpointURL()),
		Credentials:  credentials.NewStaticCredentialsProvider(cfg.AccessKeyID, cfg.SecretAccessKey, ""),
		UsePathStyle: true,
	})
	presigner := s3.NewPresignClient(client)
	out, err := presigner.PresignPutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(cfg.Bucket),
		Key:         aws.String(key),
		ContentType: aws.String(ct),
	}, s3.WithPresignExpires(5 * time.Minute))
	if err != nil {
		return nil, err
	}
	public := strings.TrimRight(cfg.PublicBaseURL, "/") + "/" + path.Clean(key)
	return &PresignResult{
		UploadURL: out.URL,
		PublicURL: public,
		Headers:   map[string]string{"Content-Type": ct},
		ExpiresIn: 300,
	}, nil
}
