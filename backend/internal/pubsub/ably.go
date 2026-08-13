package pubsub

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"yadotena/internal/config"
)

type AblyClient struct {
	apiKey     string
	appID      string
	httpClient *http.Client
}

func NewAblyClient(cfg config.Config) *AblyClient {
	if cfg.AblyAPIKey == "" {
		log.Println("ably: API key not provided, Ably publishing will be disabled")
	}
	return &AblyClient{
		apiKey: cfg.AblyAPIKey,
		appID:  cfg.AblyAppID,
		httpClient: &http.Client{
			Timeout: 5 * time.Second,
		},
	}
}

type AblyMessage struct {
	Name string `json:"name"`
	Data any    `json:"data"`
}

func (a *AblyClient) Publish(ctx context.Context, channel string, eventName string, data any) error {
	if a.apiKey == "" {
		return nil
	}
	if channel == "" {
		channel = "yadotena-realtime"
	}

	url := fmt.Sprintf("https://rest.ably.io/channels/%s/messages", channel)

	msg := AblyMessage{
		Name: eventName,
		Data: data,
	}

	payload, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("ably marshal error: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewBuffer(payload))
	if err != nil {
		return fmt.Errorf("ably request creation error: %w", err)
	}

	encodedKey := base64.StdEncoding.EncodeToString([]byte(a.apiKey))
	req.Header.Set("Authorization", "Basic "+encodedKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := a.httpClient.Do(req)
	if err != nil {
		log.Printf("ably publish error for event %s: %v", eventName, err)
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		log.Printf("ably publish returned status %d for event %s", resp.StatusCode, eventName)
		return fmt.Errorf("ably status %d", resp.StatusCode)
	}

	log.Printf("ably published event '%s' to channel '%s'", eventName, channel)
	return nil
}

type TokenResponse struct {
	Token  string `json:"token,omitempty"`
	ApiKey string `json:"apiKey,omitempty"`
	AppID  string `json:"appId,omitempty"`
}

func (a *AblyClient) GetClientDetails() TokenResponse {
	return TokenResponse{
		ApiKey: a.apiKey,
		AppID:  a.appID,
	}
}
