package server

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

func (s *Server) presignMediaUpload(w http.ResponseWriter, r *http.Request) {
	var body struct {
		FileName    string `json:"fileName"`
		Filename    string `json:"filename"`
		ContentType string `json:"contentType"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeErr(w, 400, "invalid JSON body")
		return
	}

	fn := body.FileName
	if fn == "" {
		fn = body.Filename
	}
	if fn == "" {
		fn = "image.webp"
	}
	ct := body.ContentType
	if ct == "" {
		ct = "image/webp"
	}

	res, err := s.Storage.GetPresignedPutURL(r.Context(), fn, ct)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}

	writeJSON(w, 200, res)
}

func (s *Server) confirmPresignedMediaUpload(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Key      string `json:"key"`
		Filename string `json:"filename"`
	}
	if err := decodeJSON(r, &body); err != nil || strings.TrimSpace(body.Key) == "" {
		writeErr(w, 400, "key is required")
		return
	}

	fn := body.Filename
	if fn == "" {
		fn = filepath.Base(body.Key)
	}

	res, err := s.Storage.ConfirmPresignedUpload(r.Context(), body.Key, fn)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}

	status := 201
	if res.Deduplicated {
		status = 200
	}

	writeJSON(w, status, map[string]any{
		"url":          res.PublicURL,
		"publicUrl":    res.PublicURL,
		"key":          res.Key,
		"filename":     res.Filename,
		"hash":         res.Hash,
		"contentType":  res.ContentType,
		"fileSize":     res.FileSize,
		"deduplicated": res.Deduplicated,
	})
}

func (s *Server) directMediaUpload(w http.ResponseWriter, r *http.Request) {
	err := r.ParseMultipartForm(s.Cfg.UploadMaxBytes)
	if err != nil {
		writeErr(w, 400, "error parsing multipart form data")
		return
	}

	file, header, errFile := r.FormFile("file")
	if errFile != nil {
		file, header, errFile = r.FormFile("image")
	}
	if errFile != nil || file == nil {
		writeErr(w, 400, "file or image field is required")
		return
	}
	defer file.Close()

	res, err := s.Storage.UploadAndOptimizeImageDetailed(r.Context(), file, header.Filename)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}

	status := 201
	if res.Deduplicated {
		status = 200
	}

	writeJSON(w, status, map[string]any{
		"url":          res.PublicURL,
		"publicUrl":    res.PublicURL,
		"key":          res.Key,
		"filename":     res.Filename,
		"hash":         res.Hash,
		"contentType":  res.ContentType,
		"fileSize":     res.FileSize,
		"deduplicated": res.Deduplicated,
	})
}

func (s *Server) uploadMediaFromLink(w http.ResponseWriter, r *http.Request) {
	var body struct {
		URL string `json:"url"`
	}
	if err := decodeJSON(r, &body); err != nil || strings.TrimSpace(body.URL) == "" {
		writeErr(w, 400, "valid image URL is required")
		return
	}

	res, err := s.Storage.UploadFromLinkDetailed(r.Context(), body.URL)
	if err != nil {
		writeErr(w, 400, err.Error())
		return
	}

	status := 201
	if res.Deduplicated {
		status = 200
	}

	writeJSON(w, status, map[string]any{
		"url":          res.PublicURL,
		"publicUrl":    res.PublicURL,
		"key":          res.Key,
		"filename":     res.Filename,
		"hash":         res.Hash,
		"contentType":  res.ContentType,
		"fileSize":     res.FileSize,
		"deduplicated": res.Deduplicated,
	})
}

func (s *Server) getMediaAssetByHash(w http.ResponseWriter, r *http.Request) {
	hash := strings.TrimSpace(r.URL.Query().Get("hash"))
	if hash == "" {
		writeErr(w, 400, "hash parameter is required")
		return
	}

	asset, err := s.Storage.GetAssetByHash(r.Context(), hash)
	if err != nil || asset == nil || asset.PublicURL == "" {
		writeErr(w, 404, "media asset not found")
		return
	}

	writeJSON(w, 200, asset)
}

func (s *Server) mediaProxy(w http.ResponseWriter, r *http.Request) {
	rawURL := r.URL.Query().Get("url")
	if rawURL == "" {
		writeErr(w, 400, "url query parameter is required")
		return
	}

	req, err := http.NewRequestWithContext(r.Context(), http.MethodGet, rawURL, nil)
	if err != nil {
		writeErr(w, 400, "invalid target URL")
		return
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil || resp.StatusCode >= 400 {
		writeErr(w, 502, "failed to proxy image target")
		return
	}
	defer resp.Body.Close()

	for k, v := range resp.Header {
		if strings.HasPrefix(strings.ToLower(k), "content-") {
			w.Header()[k] = v
		}
	}
	w.Header().Set("Cache-Control", "public, max-age=86400")
	w.WriteHeader(resp.StatusCode)
	_, _ = io.Copy(w, resp.Body)
}

func (s *Server) serveUploads(w http.ResponseWriter, r *http.Request) {
	relPath := strings.TrimPrefix(r.URL.Path, "/uploads/")
	relPath = strings.TrimPrefix(relPath, "/")

	if relPath == "" {
		writeErr(w, 400, "invalid upload path")
		return
	}

	localFullPath := filepath.Join(s.Cfg.UploadsDir, relPath)

	// 1. If file exists on local disk, serve it with ETag and immutable cache headers
	if fi, err := os.Stat(localFullPath); err == nil && !fi.IsDir() {
		etag := fmt.Sprintf(`"%x-%x"`, fi.ModTime().UnixNano(), fi.Size())
		w.Header().Set("ETag", etag)
		w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
		if match := r.Header.Get("If-None-Match"); match == etag {
			w.WriteHeader(http.StatusNotModified)
			return
		}
		http.ServeFile(w, r, localFullPath)
		return
	}

	// 2. Try fetching from Tigris S3 via GetObject
	body, ct, err := s.Storage.GetObject(r.Context(), relPath)
	if err == nil && body != nil {
		defer body.Close()
		buf, errRead := io.ReadAll(body)
		if errRead == nil && len(buf) > 0 {
			// Cache to disk for future requests
			_ = os.MkdirAll(filepath.Dir(localFullPath), 0o755)
			_ = os.WriteFile(localFullPath, buf, 0o644)

			w.Header().Set("Content-Type", ct)
			w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
			w.WriteHeader(200)
			_, _ = w.Write(buf)
			return
		}
	}

	// 3. Fallback: redirect to high-res placeholder image
	w.Header().Set("Cache-Control", "public, max-age=3600")
	http.Redirect(w, r, "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=70", http.StatusFound)
}
