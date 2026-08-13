package server

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type Addon struct {
	ID    string  `json:"id"`
	Name  string  `json:"name"`
	Price float64 `json:"price"`
}

type MenuItem struct {
	ID              string    `json:"id"`
	Name            string    `json:"name"`
	Description     string    `json:"description"`
	Price           float64   `json:"price"`
	Category        string    `json:"category"`
	CategoryId      string    `json:"categoryId,omitempty"`
	Image           string    `json:"image"`
	Available       bool      `json:"available"`
	PreparationTime int       `json:"preparationTime"`
	DietaryTags     []string  `json:"dietaryTags"`
	CustomAddons    []Addon   `json:"customAddons"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

func (s *Server) listMenuItems(w http.ResponseWriter, r *http.Request) {
	categoryFilter := r.URL.Query().Get("category")
	availableFilter := r.URL.Query().Get("available")
	searchFilter := r.URL.Query().Get("search")

	q := `
		SELECT m.id, m.name, m.description, m.price::float8, COALESCE(c.name, ''), COALESCE(m.category_id, ''),
		       COALESCE(m.image, ''), m.available, m.preparation_time, m.dietary_tags, m.created_at, m.updated_at
		FROM menu_items m
		LEFT JOIN menu_categories c ON c.id = m.category_id
		WHERE 1=1`

	args := []any{}
	n := 1

	if categoryFilter != "" {
		if strings.HasPrefix(categoryFilter, "cat-") {
			q += fmt.Sprintf(" AND m.category_id = $%d", n)
			args = append(args, categoryFilter)
			n++
		} else {
			q += fmt.Sprintf(" AND LOWER(c.name) = LOWER($%d)", n)
			args = append(args, categoryFilter)
			n++
		}
	}

	if availableFilter != "" {
		avail := availableFilter == "true" || availableFilter == "1"
		q += fmt.Sprintf(" AND m.available = $%d", n)
		args = append(args, avail)
		n++
	}

	if searchFilter != "" {
		q += fmt.Sprintf(" AND (m.name ILIKE $%d OR m.description ILIKE $%d)", n, n)
		args = append(args, "%"+searchFilter+"%")
		n++
	}

	q += " ORDER BY c.sort_order, m.name"

	rows, err := s.Pool.Query(r.Context(), q, args...)
	if err != nil {
		writeJSON(w, 200, []MenuItem{})
		return
	}
	defer rows.Close()

	items := make([]MenuItem, 0)
	for rows.Next() {
		var item MenuItem
		var dietaryTagsRaw []byte
		if err := rows.Scan(
			&item.ID, &item.Name, &item.Description, &item.Price, &item.Category, &item.CategoryId,
			&item.Image, &item.Available, &item.PreparationTime, &dietaryTagsRaw, &item.CreatedAt, &item.UpdatedAt,
		); err == nil {
			if len(dietaryTagsRaw) > 0 {
				_ = json.Unmarshal(dietaryTagsRaw, &item.DietaryTags)
			}
			if item.DietaryTags == nil {
				item.DietaryTags = []string{}
			}

			// Load custom addons
			addonRows, errAdd := s.Pool.Query(r.Context(), `SELECT id, name, price::float8 FROM menu_item_addons WHERE menu_item_id = $1`, item.ID)
			if errAdd == nil {
				item.CustomAddons = make([]Addon, 0)
				for addonRows.Next() {
					var ad Addon
					if errScan := addonRows.Scan(&ad.ID, &ad.Name, &ad.Price); errScan == nil {
						item.CustomAddons = append(item.CustomAddons, ad)
					}
				}
				addonRows.Close()
			} else {
				item.CustomAddons = []Addon{}
			}

			items = append(items, item)
		}
	}

	writeJSON(w, 200, items)
}

func (s *Server) getMenuItem(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var item MenuItem
	var dietaryTagsRaw []byte

	err := s.Pool.QueryRow(r.Context(), `
		SELECT m.id, m.name, m.description, m.price::float8, COALESCE(c.name, ''), COALESCE(m.category_id, ''),
		       COALESCE(m.image, ''), m.available, m.preparation_time, m.dietary_tags, m.created_at, m.updated_at
		FROM menu_items m
		LEFT JOIN menu_categories c ON c.id = m.category_id
		WHERE m.id = $1`, id).Scan(
		&item.ID, &item.Name, &item.Description, &item.Price, &item.Category, &item.CategoryId,
		&item.Image, &item.Available, &item.PreparationTime, &dietaryTagsRaw, &item.CreatedAt, &item.UpdatedAt,
	)

	if err != nil {
		writeErr(w, 404, "Menu item not found")
		return
	}

	if len(dietaryTagsRaw) > 0 {
		_ = json.Unmarshal(dietaryTagsRaw, &item.DietaryTags)
	}
	if item.DietaryTags == nil {
		item.DietaryTags = []string{}
	}

	// Load custom addons
	addonRows, errAdd := s.Pool.Query(r.Context(), `SELECT id, name, price::float8 FROM menu_item_addons WHERE menu_item_id = $1`, item.ID)
	if errAdd == nil {
		item.CustomAddons = make([]Addon, 0)
		for addonRows.Next() {
			var ad Addon
			if errScan := addonRows.Scan(&ad.ID, &ad.Name, &ad.Price); errScan == nil {
				item.CustomAddons = append(item.CustomAddons, ad)
			}
		}
		addonRows.Close()
	} else {
		item.CustomAddons = []Addon{}
	}

	writeJSON(w, 200, item)
}

func (s *Server) createMenuItem(w http.ResponseWriter, r *http.Request) {
	contentType := r.Header.Get("Content-Type")

	var name, description, category, imageURL string
	var price float64
	var prepTime int = 15
	var available bool = true
	var dietaryTags []string
	var customAddons []Addon

	if strings.HasPrefix(contentType, "multipart/form-data") {
		err := r.ParseMultipartForm(s.Cfg.UploadMaxBytes)
		if err != nil {
			writeErr(w, 400, "error parsing multipart form")
			return
		}
		name = r.FormValue("name")
		description = r.FormValue("description")
		category = r.FormValue("category")
		imageURL = r.FormValue("imageUrl")
		if imageURL == "" {
			imageURL = r.FormValue("image")
		}

		if pStr := r.FormValue("price"); pStr != "" {
			price, _ = strconv.ParseFloat(pStr, 64)
		}
		if ptStr := r.FormValue("preparationTime"); ptStr != "" {
			prepTime, _ = strconv.Atoi(ptStr)
		}
		if avStr := r.FormValue("available"); avStr != "" {
			available = avStr == "true" || avStr == "1"
		}

		if dtStr := r.FormValue("dietaryTags"); dtStr != "" {
			_ = json.Unmarshal([]byte(dtStr), &dietaryTags)
		}
		if caStr := r.FormValue("customAddons"); caStr != "" {
			_ = json.Unmarshal([]byte(caStr), &customAddons)
		}

		// Handle file upload if present
		file, header, errFile := r.FormFile("image")
		if errFile == nil && file != nil {
			defer file.Close()
			uploadedURL, errUp := s.Storage.UploadAndOptimizeImage(r.Context(), file, header.Filename)
			if errUp == nil && uploadedURL != "" {
				imageURL = uploadedURL
			}
		}
	} else {
		var body struct {
			Name            string   `json:"name"`
			Description     string   `json:"description"`
			Price           float64  `json:"price"`
			Category        string   `json:"category"`
			Image           string   `json:"image"`
			ImageUrl        string   `json:"imageUrl"`
			Available       *bool    `json:"available"`
			PreparationTime int      `json:"preparationTime"`
			DietaryTags     []string `json:"dietaryTags"`
			CustomAddons    []Addon  `json:"customAddons"`
		}
		if err := decodeJSON(r, &body); err != nil {
			writeErr(w, 400, "invalid JSON body")
			return
		}
		name = body.Name
		description = body.Description
		price = body.Price
		category = body.Category
		imageURL = body.Image
		if imageURL == "" {
			imageURL = body.ImageUrl
		}
		if body.Available != nil {
			available = *body.Available
		}
		if body.PreparationTime > 0 {
			prepTime = body.PreparationTime
		}
		dietaryTags = body.DietaryTags
		customAddons = body.CustomAddons
	}

	if name == "" {
		writeErr(w, 400, "name is required")
		return
	}

	// Handle external link import if image URL is provided and not already on Tigris S3
	if imageURL != "" && strings.HasPrefix(imageURL, "http") && !strings.Contains(imageURL, s.Cfg.TigrisBucket) {
		if optimizedURL, errLink := s.Storage.UploadFromLink(r.Context(), imageURL); errLink == nil && optimizedURL != "" {
			imageURL = optimizedURL
		}
	}

	// Find or resolve category ID
	var catID string
	if category != "" {
		if strings.HasPrefix(category, "cat-") {
			catID = category
		} else {
			_ = s.Pool.QueryRow(r.Context(), `SELECT id FROM menu_categories WHERE LOWER(name) = LOWER($1)`, category).Scan(&catID)
		}
	}

	if catID == "" {
		// Use first category or create default
		_ = s.Pool.QueryRow(r.Context(), `SELECT id FROM menu_categories ORDER BY sort_order LIMIT 1`).Scan(&catID)
		if catID == "" {
			catID = fmt.Sprintf("cat-%s", uuid.New().String()[:8])
			_, _ = s.Pool.Exec(r.Context(), `INSERT INTO menu_categories (id, name) VALUES ($1, 'General')`, catID)
		}
	}

	id := fmt.Sprintf("m-%s", uuid.New().String()[:8])
	dtBytes, _ := json.Marshal(dietaryTags)

	var item MenuItem
	err := s.Pool.QueryRow(r.Context(), `
		INSERT INTO menu_items (id, name, description, price, category_id, image, available, preparation_time, dietary_tags)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, name, description, price::float8, category_id, COALESCE(image, ''), available, preparation_time, created_at, updated_at`,
		id, name, description, price, catID, imageURL, available, prepTime, dtBytes,
	).Scan(&item.ID, &item.Name, &item.Description, &item.Price, &item.CategoryId, &item.Image, &item.Available, &item.PreparationTime, &item.CreatedAt, &item.UpdatedAt)

	if err != nil {
		writeErr(w, 400, err.Error())
		return
	}

	item.Category = category
	item.DietaryTags = dietaryTags
	if item.DietaryTags == nil {
		item.DietaryTags = []string{}
	}

	// Save custom addons
	item.CustomAddons = make([]Addon, 0)
	for _, ad := range customAddons {
		adID := fmt.Sprintf("add-%s", uuid.New().String()[:8])
		_, errAdd := s.Pool.Exec(r.Context(), `INSERT INTO menu_item_addons (id, menu_item_id, name, price) VALUES ($1, $2, $3, $4)`, adID, item.ID, ad.Name, ad.Price)
		if errAdd == nil {
			ad.ID = adID
			item.CustomAddons = append(item.CustomAddons, ad)
		}
	}

	writeJSON(w, 201, item)
}

func (s *Server) updateMenuItem(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	contentType := r.Header.Get("Content-Type")

	var item MenuItem
	var dietaryTagsRaw []byte
	err := s.Pool.QueryRow(r.Context(), `
		SELECT m.id, m.name, m.description, m.price::float8, COALESCE(c.name, ''), COALESCE(m.category_id, ''),
		       COALESCE(m.image, ''), m.available, m.preparation_time, m.dietary_tags, m.created_at, m.updated_at
		FROM menu_items m
		LEFT JOIN menu_categories c ON c.id = m.category_id
		WHERE m.id = $1`, id).Scan(
		&item.ID, &item.Name, &item.Description, &item.Price, &item.Category, &item.CategoryId,
		&item.Image, &item.Available, &item.PreparationTime, &dietaryTagsRaw, &item.CreatedAt, &item.UpdatedAt,
	)

	if err != nil {
		writeErr(w, 404, "Menu item not found")
		return
	}

	if strings.HasPrefix(contentType, "multipart/form-data") {
		_ = r.ParseMultipartForm(s.Cfg.UploadMaxBytes)
		if name := r.FormValue("name"); name != "" {
			item.Name = name
		}
		if desc := r.FormValue("description"); desc != "" {
			item.Description = desc
		}
		if pStr := r.FormValue("price"); pStr != "" {
			item.Price, _ = strconv.ParseFloat(pStr, 64)
		}
		if ptStr := r.FormValue("preparationTime"); ptStr != "" {
			item.PreparationTime, _ = strconv.Atoi(ptStr)
		}
		if avStr := r.FormValue("available"); avStr != "" {
			item.Available = avStr == "true" || avStr == "1"
		}
		if img := r.FormValue("image"); img != "" {
			item.Image = img
		}

		file, header, errFile := r.FormFile("image")
		if errFile == nil && file != nil {
			defer file.Close()
			uploadedURL, errUp := s.Storage.UploadAndOptimizeImage(r.Context(), file, header.Filename)
			if errUp == nil && uploadedURL != "" {
				item.Image = uploadedURL
			}
		}
	} else {
		var body map[string]any
		if err := decodeJSON(r, &body); err == nil {
			if name, ok := body["name"].(string); ok {
				item.Name = name
			}
			if desc, ok := body["description"].(string); ok {
				item.Description = desc
			}
			if price, ok := body["price"].(float64); ok {
				item.Price = price
			}
			if prep, ok := body["preparationTime"].(float64); ok {
				item.PreparationTime = int(prep)
			}
			if avail, ok := body["available"].(bool); ok {
				item.Available = avail
			}
			if img, ok := body["image"].(string); ok {
				item.Image = img
			}
		}
	}

	_, _ = s.Pool.Exec(r.Context(), `
		UPDATE menu_items SET name=$1, description=$2, price=$3, image=$4, available=$5, preparation_time=$6, updated_at=now() WHERE id=$7`,
		item.Name, item.Description, item.Price, item.Image, item.Available, item.PreparationTime, id)

	writeJSON(w, 200, item)
}

func (s *Server) toggleMenuItemAvailability(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var item MenuItem
	err := s.Pool.QueryRow(r.Context(), `
		SELECT id, name, available FROM menu_items WHERE id = $1`, id).Scan(&item.ID, &item.Name, &item.Available)
	if err != nil {
		writeErr(w, 404, "Menu item not found")
		return
	}

	item.Available = !item.Available
	_, _ = s.Pool.Exec(r.Context(), `UPDATE menu_items SET available=$1, updated_at=now() WHERE id=$2`, item.Available, id)
	writeJSON(w, 200, item)
}

func (s *Server) deleteMenuItem(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	_, _ = s.Pool.Exec(r.Context(), `DELETE FROM menu_items WHERE id = $1`, id)
	w.WriteHeader(204)
}
