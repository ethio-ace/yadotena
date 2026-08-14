package server

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type AddonItem struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	Description  string    `json:"description,omitempty"`
	Price        float64   `json:"price"`
	ImageURL     string    `json:"imageUrl,omitempty"`
	Scope        string    `json:"scope"` // "GLOBAL", "CATEGORY", "ITEM"
	CategoryID   *string   `json:"categoryId,omitempty"`
	CategoryName *string   `json:"categoryName,omitempty"`
	MenuItemID   *string   `json:"menuItemId,omitempty"`
	MenuItemName *string   `json:"menuItemName,omitempty"`
	IsGlobal     bool      `json:"isGlobal"`
	IsActive     bool      `json:"isActive"`
	SortOrder    int       `json:"sortOrder"`
	CreatedAt    time.Time `json:"createdAt"`
}

func (s *Server) listAddons(w http.ResponseWriter, r *http.Request) {
	catFilter := r.URL.Query().Get("category_id")
	itemFilter := r.URL.Query().Get("menu_item_id")
	scopeFilter := r.URL.Query().Get("scope")

	q := `
		SELECT a.id, a.name, COALESCE(a.description, ''), a.price::float8, COALESCE(a.image_url, ''),
		       a.category_id, c.name, a.menu_item_id, m.name,
		       COALESCE(a.is_global, false), COALESCE(a.is_active, true), COALESCE(a.sort_order, 0),
		       COALESCE(a.created_at, now())
		FROM menu_item_addons a
		LEFT JOIN menu_categories c ON c.id = a.category_id
		LEFT JOIN menu_items m ON m.id = a.menu_item_id
		WHERE 1=1`

	args := []any{}
	n := 1

	if catFilter != "" {
		q += fmt.Sprintf(" AND a.category_id = $%d", n)
		args = append(args, catFilter)
		n++
	}
	if itemFilter != "" {
		q += fmt.Sprintf(" AND a.menu_item_id = $%d", n)
		args = append(args, itemFilter)
		n++
	}
	if scopeFilter == "GLOBAL" {
		q += " AND COALESCE(a.is_global, false) = true"
	} else if scopeFilter == "CATEGORY" {
		q += " AND a.category_id IS NOT NULL"
	} else if scopeFilter == "ITEM" {
		q += " AND a.menu_item_id IS NOT NULL"
	}

	q += " ORDER BY a.is_global DESC, c.name ASC NULLS LAST, m.name ASC NULLS LAST, a.name ASC"

	rows, err := s.Pool.Query(r.Context(), q, args...)
	if err != nil {
		// Fallback query if migration 000014 columns are missing
		fallbackRows, errFb := s.Pool.Query(r.Context(), `SELECT id, name, price::float8, menu_item_id FROM menu_item_addons`)
		if errFb != nil {
			writeJSON(w, 200, []AddonItem{})
			return
		}
		defer fallbackRows.Close()
		addonsFb := make([]AddonItem, 0)
		for fallbackRows.Next() {
			var a AddonItem
			if errScan := fallbackRows.Scan(&a.ID, &a.Name, &a.Price, &a.MenuItemID); errScan == nil {
				a.Scope = "ITEM"
				a.IsActive = true
				addonsFb = append(addonsFb, a)
			}
		}
		writeJSON(w, 200, addonsFb)
		return
	}
	defer rows.Close()

	addons := make([]AddonItem, 0)
	for rows.Next() {
		var a AddonItem
		if errScan := rows.Scan(
			&a.ID, &a.Name, &a.Description, &a.Price, &a.ImageURL, &a.CategoryID, &a.CategoryName,
			&a.MenuItemID, &a.MenuItemName, &a.IsGlobal, &a.IsActive, &a.SortOrder, &a.CreatedAt,
		); errScan == nil {
			if a.IsGlobal {
				a.Scope = "GLOBAL"
			} else if a.CategoryID != nil && *a.CategoryID != "" {
				a.Scope = "CATEGORY"
			} else {
				a.Scope = "ITEM"
			}
			addons = append(addons, a)
		}
	}
	writeJSON(w, 200, addons)
}

func (s *Server) getRespectiveAddonsForMenuItem(w http.ResponseWriter, r *http.Request) {
	menuItemID := chi.URLParam(r, "id")
	if menuItemID == "" {
		writeErr(w, 400, "menu item id is required")
		return
	}

	q := `
		SELECT a.id, a.name, COALESCE(a.description, ''), a.price::float8, COALESCE(a.image_url, ''),
		       a.category_id, c.name, a.menu_item_id, m.name,
		       COALESCE(a.is_global, false), COALESCE(a.is_active, true), COALESCE(a.sort_order, 0),
		       COALESCE(a.created_at, now())
		FROM menu_item_addons a
		LEFT JOIN menu_categories c ON c.id = a.category_id
		LEFT JOIN menu_items m ON m.id = a.menu_item_id
		LEFT JOIN menu_items target_item ON target_item.id = $1
		WHERE COALESCE(a.is_active, true) = true
		  AND (
		    COALESCE(a.is_global, false) = true
		    OR a.menu_item_id = $1
		    OR (a.category_id IS NOT NULL AND target_item.category_id = a.category_id)
		  )
		ORDER BY a.is_global DESC, a.name ASC`

	rows, err := s.Pool.Query(r.Context(), q, menuItemID)
	if err != nil {
		writeJSON(w, 200, []AddonItem{})
		return
	}
	defer rows.Close()

	addons := make([]AddonItem, 0)
	for rows.Next() {
		var a AddonItem
		if errScan := rows.Scan(
			&a.ID, &a.Name, &a.Description, &a.Price, &a.ImageURL, &a.CategoryID, &a.CategoryName,
			&a.MenuItemID, &a.MenuItemName, &a.IsGlobal, &a.IsActive, &a.SortOrder, &a.CreatedAt,
		); errScan == nil {
			if a.IsGlobal {
				a.Scope = "GLOBAL"
			} else if a.CategoryID != nil && *a.CategoryID != "" {
				a.Scope = "CATEGORY"
			} else {
				a.Scope = "ITEM"
			}
			addons = append(addons, a)
		}
	}
	writeJSON(w, 200, addons)
}

func (s *Server) createAddon(w http.ResponseWriter, r *http.Request) {
	contentType := r.Header.Get("Content-Type")

	var name, description, scope, imageURL string
	var price float64
	var categoryID, menuItemID *string
	var isGlobal bool = false
	var isActive bool = true

	if strings.HasPrefix(contentType, "multipart/form-data") {
		err := r.ParseMultipartForm(s.Cfg.UploadMaxBytes)
		if err != nil {
			writeErr(w, 400, "error parsing multipart form")
			return
		}
		name = r.FormValue("name")
		description = r.FormValue("description")
		scope = r.FormValue("scope")
		imageURL = r.FormValue("imageUrl")
		if imageURL == "" {
			imageURL = r.FormValue("image")
		}

		if pStr := r.FormValue("price"); pStr != "" {
			price, _ = strconv.ParseFloat(pStr, 64)
		}
		if catStr := r.FormValue("categoryId"); catStr != "" {
			categoryID = &catStr
		}
		if miStr := r.FormValue("menuItemId"); miStr != "" {
			menuItemID = &miStr
		}
		if igStr := r.FormValue("isGlobal"); igStr != "" {
			isGlobal = igStr == "true" || igStr == "1"
		}
		if iaStr := r.FormValue("isActive"); iaStr != "" {
			isActive = iaStr == "true" || iaStr == "1"
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
			Name        string  `json:"name"`
			Description string  `json:"description"`
			Price       float64 `json:"price"`
			Image       string  `json:"image"`
			ImageUrl    string  `json:"imageUrl"`
			Scope       string  `json:"scope"`
			CategoryID  *string `json:"categoryId"`
			MenuItemID  *string `json:"menuItemId"`
			IsGlobal    *bool   `json:"isGlobal"`
			IsActive    *bool   `json:"isActive"`
		}
		if err := decodeJSON(r, &body); err != nil {
			writeErr(w, 400, "invalid JSON body")
			return
		}
		name = body.Name
		description = body.Description
		price = body.Price
		imageURL = body.Image
		if imageURL == "" {
			imageURL = body.ImageUrl
		}
		scope = body.Scope
		categoryID = body.CategoryID
		menuItemID = body.MenuItemID
		if body.IsGlobal != nil {
			isGlobal = *body.IsGlobal
		}
		if body.IsActive != nil {
			isActive = *body.IsActive
		}
	}

	name = strings.TrimSpace(name)
	if name == "" {
		writeErr(w, 400, "addon name is required")
		return
	}

	scopeUpper := strings.ToUpper(strings.TrimSpace(scope))
	if scopeUpper == "GLOBAL" || (isGlobal && categoryID == nil && menuItemID == nil) {
		isGlobal = true
		categoryID = nil
		menuItemID = nil
		scopeUpper = "GLOBAL"
	} else if scopeUpper == "CATEGORY" || (categoryID != nil && *categoryID != "") {
		if categoryID == nil || *categoryID == "" {
			writeErr(w, 400, "category_id is required for CATEGORY scoped addons")
			return
		}
		isGlobal = false
		menuItemID = nil
		scopeUpper = "CATEGORY"
	} else if scopeUpper == "ITEM" || (menuItemID != nil && *menuItemID != "") {
		if menuItemID == nil || *menuItemID == "" {
			writeErr(w, 400, "menu_item_id is required for ITEM scoped addons")
			return
		}
		isGlobal = false
		categoryID = nil
		scopeUpper = "ITEM"
	} else {
		isGlobal = true
		categoryID = nil
		menuItemID = nil
		scopeUpper = "GLOBAL"
	}

	// Optimize image link if external URL
	if imageURL != "" && strings.HasPrefix(imageURL, "http") && !strings.Contains(imageURL, s.Cfg.TigrisBucket) {
		if optimizedURL, errLink := s.Storage.UploadFromLink(r.Context(), imageURL); errLink == nil && optimizedURL != "" {
			imageURL = optimizedURL
		}
	}

	id := fmt.Sprintf("addon-%s", uuid.New().String()[:8])

	var a AddonItem
	err := s.Pool.QueryRow(r.Context(), `
		INSERT INTO menu_item_addons (id, name, description, price, image_url, category_id, menu_item_id, is_global, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, name, COALESCE(description, ''), price::float8, COALESCE(image_url, ''), category_id, menu_item_id, is_global, is_active, sort_order, created_at`,
		id, name, description, price, imageURL, categoryID, menuItemID, isGlobal, isActive,
	).Scan(&a.ID, &a.Name, &a.Description, &a.Price, &a.ImageURL, &a.CategoryID, &a.MenuItemID, &a.IsGlobal, &a.IsActive, &a.SortOrder, &a.CreatedAt)

	if err != nil {
		// Fallback for pre-migration 000014 schema
		_ = s.Pool.QueryRow(r.Context(), `
			INSERT INTO menu_item_addons (id, name, price, menu_item_id)
			VALUES ($1, $2, $3, $4)
			RETURNING id, name, price::float8, menu_item_id`,
			id, name, price, menuItemID,
		).Scan(&a.ID, &a.Name, &a.Price, &a.MenuItemID)
	}

	a.Scope = scopeUpper
	s.LogActivityFromReq(r, "CREATE_ADDON", "ADDON", a.ID, fmt.Sprintf("Created new %s addon '%s' (ETB %.2f)", scopeUpper, name, price), nil, a)
	writeJSON(w, 201, a)
}

func (s *Server) updateAddon(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	contentType := r.Header.Get("Content-Type")
	var scope string

	// Fetch existing
	var a AddonItem
	errScanOld := s.Pool.QueryRow(r.Context(), `
		SELECT id, name, COALESCE(description, ''), price::float8, COALESCE(image_url, ''),
		       category_id, menu_item_id, COALESCE(is_global, false), COALESCE(is_active, true),
		       COALESCE(sort_order, 0), COALESCE(created_at, now())
		FROM menu_item_addons WHERE id = $1`, id).Scan(
		&a.ID, &a.Name, &a.Description, &a.Price, &a.ImageURL,
		&a.CategoryID, &a.MenuItemID, &a.IsGlobal, &a.IsActive, &a.SortOrder, &a.CreatedAt,
	)
	if errScanOld != nil {
		writeErr(w, 404, "Addon not found")
		return
	}

	prevState := a

	if strings.HasPrefix(contentType, "multipart/form-data") {
		_ = r.ParseMultipartForm(s.Cfg.UploadMaxBytes)
		if n := r.FormValue("name"); n != "" {
			a.Name = strings.TrimSpace(n)
		}
		if d := r.FormValue("description"); d != "" {
			a.Description = strings.TrimSpace(d)
		}
		if pStr := r.FormValue("price"); pStr != "" {
			a.Price, _ = strconv.ParseFloat(pStr, 64)
		}
		if scStr := r.FormValue("scope"); scStr != "" {
			scope = scStr
		}
		if catStr := r.FormValue("categoryId"); catStr != "" {
			a.CategoryID = &catStr
		}
		if miStr := r.FormValue("menuItemId"); miStr != "" {
			a.MenuItemID = &miStr
		}
		if igStr := r.FormValue("isGlobal"); igStr != "" {
			a.IsGlobal = igStr == "true" || igStr == "1"
		}
		if iaStr := r.FormValue("isActive"); iaStr != "" {
			a.IsActive = iaStr == "true" || iaStr == "1"
		}

		file, header, errFile := r.FormFile("image")
		if errFile == nil && file != nil {
			defer file.Close()
			uploadedURL, errUp := s.Storage.UploadAndOptimizeImage(r.Context(), file, header.Filename)
			if errUp == nil && uploadedURL != "" {
				a.ImageURL = uploadedURL
			}
		}
	} else {
		var body map[string]any
		if err := decodeJSON(r, &body); err == nil {
			if n, ok := body["name"].(string); ok && strings.TrimSpace(n) != "" {
				a.Name = strings.TrimSpace(n)
			}
			if d, ok := body["description"].(string); ok {
				a.Description = strings.TrimSpace(d)
			}
			if pr, ok := body["price"].(float64); ok {
				a.Price = pr
			}
			if img, ok := body["image"].(string); ok && img != "" {
				a.ImageURL = img
			}
			if imgUrl, ok := body["imageUrl"].(string); ok && imgUrl != "" {
				a.ImageURL = imgUrl
			}
			if act, ok := body["isActive"].(bool); ok {
				a.IsActive = act
			}
			if sc, ok := body["scope"].(string); ok {
				scope = sc
			}
		}
	}

	if scope != "" {
		scUpper := strings.ToUpper(strings.TrimSpace(scope))
		if scUpper == "GLOBAL" {
			a.IsGlobal = true
			a.CategoryID = nil
			a.MenuItemID = nil
			a.Scope = "GLOBAL"
		} else if scUpper == "CATEGORY" {
			a.IsGlobal = false
			a.MenuItemID = nil
			a.Scope = "CATEGORY"
		} else if scUpper == "ITEM" {
			a.IsGlobal = false
			a.CategoryID = nil
			a.Scope = "ITEM"
		}
	}

	_, _ = s.Pool.Exec(r.Context(), `
		UPDATE menu_item_addons
		SET name = $1, description = $2, price = $3, image_url = $4, category_id = $5, menu_item_id = $6, is_global = $7, is_active = $8
		WHERE id = $9`,
		a.Name, a.Description, a.Price, a.ImageURL, a.CategoryID, a.MenuItemID, a.IsGlobal, a.IsActive, id,
	)

	s.LogActivityFromReq(r, "UPDATE_ADDON", "ADDON", id, fmt.Sprintf("Updated addon '%s'", a.Name), prevState, a)
	writeJSON(w, 200, a)
}

func (s *Server) deleteAddon(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	_, err := s.Pool.Exec(r.Context(), `DELETE FROM menu_item_addons WHERE id = $1`, id)
	if err != nil {
		writeErr(w, 400, err.Error())
		return
	}
	s.LogActivityFromReq(r, "DELETE_ADDON", "ADDON", id, fmt.Sprintf("Deleted addon '%s'", id), nil, nil)
	w.WriteHeader(204)
}
