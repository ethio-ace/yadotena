package server

import (
	"net/http"
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

	publicURL, err := s.Storage.UploadAndOptimizeImage(r.Context(), file, header.Filename)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}

	writeJSON(w, 201, map[string]string{
		"url":       publicURL,
		"publicUrl": publicURL,
		"filename":  header.Filename,
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

	publicURL, err := s.Storage.UploadFromLink(r.Context(), body.URL)
	if err != nil {
		writeErr(w, 400, err.Error())
		return
	}

	writeJSON(w, 201, map[string]string{
		"url":       publicURL,
		"publicUrl": publicURL,
	})
}
