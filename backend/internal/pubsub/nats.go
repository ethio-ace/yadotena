package pubsub

import (
	"encoding/json"
	"log"
	"time"

	"github.com/nats-io/nats.go"
	"github.com/nats-io/nkeys"
	"yadotena/internal/config"
)

type NATSClient struct {
	conn *nats.Conn
}

func NewNATSClient(cfg config.Config) *NATSClient {
	if cfg.NATSNkeySeed == "" || cfg.NATSUserJWT == "" {
		log.Println("nats: JWT or NKEY seed missing, NATS client disabled")
		return &NATSClient{conn: nil}
	}

	opts := []nats.Option{
		nats.UserJWT(
			func() (string, error) {
				return cfg.NATSUserJWT, nil
			},
			func(nonce []byte) ([]byte, error) {
				kp, err := nkeys.FromSeed([]byte(cfg.NATSNkeySeed))
				if err != nil {
					return nil, err
				}
				return kp.Sign(nonce)
			},
		),
		nats.Timeout(5 * time.Second),
		nats.ReconnectWait(2 * time.Second),
		nats.MaxReconnects(5),
	}

	nc, err := nats.Connect(cfg.NATSURL, opts...)
	if err != nil {
		log.Printf("nats: connection warning to %s: %v", cfg.NATSURL, err)
		return &NATSClient{conn: nil}
	}

	log.Printf("nats: connected successfully to Cloud NATS (NGS) at %s", cfg.NATSURL)
	return &NATSClient{conn: nc}
}

func (n *NATSClient) Publish(subject string, data any) {
	if n.conn == nil {
		return
	}
	payload, err := json.Marshal(data)
	if err != nil {
		log.Printf("nats: marshal error: %v", err)
		return
	}
	if err := n.conn.Publish(subject, payload); err != nil {
		log.Printf("nats: publish error to %s: %v", subject, err)
	}
}

func (n *NATSClient) Close() {
	if n.conn != nil {
		n.conn.Close()
	}
}
