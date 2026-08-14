package server

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type AddonItem struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	Price        float64   `json:"price"`
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
		SELECT a.id, a.name, a.price::float8, a.category_id, c.name, a.menu_item_id, m.name,
		       a.is_global, a.is_active, a.sort_order, a.created_at
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
		q += " AND a.is_global = true"
	} else if scopeFilter == "CATEGORY" {
		q += " AND a.category_id IS NOT NULL"
	} else if scopeFilter == "ITEM" {
		q += " AND a.menu_item_id IS NOT NULL"
	}

	q += " ORDER BY a.is_global DESC, c.name ASC NULLS LAST, m.name ASC NULLS LAST, a.name ASC"

	rows, err := s.Pool.Query(r.Context(), q, args...)
	if err != nil {
		writeJSON(w, 200, []AddonItem{})
		return
	}
	defer rows.Close()

	addons := make([]AddonItem, 0)
	for rows.Next() {
		var a AddonItem
		if errScan := rows.Scan(
			&a.ID, &a.Name, &a.Price, &a.CategoryID, &a.CategoryName,
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

	// Retrieve respective addons (Item specific + Category matching + Global)
	q := `
		SELECT a.id, a.name, a.price::float8, a.category_id, c.name, a.menu_item_id, m.name,
		       a.is_global, a.is_active, a.sort_order, a.created_at
		FROM menu_item_addons a
		LEFT JOIN menu_categories c ON c.id = a.category_id
		LEFT JOIN menu_items m ON m.id = a.menu_item_id
		LEFT JOIN menu_items target_item ON target_item.id = $1
		WHERE a.is_active = true
		  AND (
		    a.is_global = true
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
			&a.ID, &a.Name, &a.Price, &a.CategoryID, &a.CategoryName,
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
	var body struct {
		Name       string  `json:"name"`
		Price      float64 `json:"price"`
		Scope      string  `json:"scope"` // "GLOBAL", "CATEGORY", "ITEM"
		CategoryID *string `json:"categoryId"`
		MenuItemID *string `json:"menuItemId"`
		IsGlobal   *bool   `json:"isGlobal"`
		IsActive   *bool   `json:"isActive"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeErr(w, 400, "invalid JSON body")
		return
	}

	name := strings.TrimSpace(body.Name)
	if name == "" {
		writeErr(w, 400, "addon name is required")
		return
	}

	scope := strings.ToUpper(strings.TrimSpace(body.Scope))
	isGlobal := false
	var categoryID *string = body.CategoryID
	var menuItemID *string = body.MenuItemID

	if scope == "GLOBAL" || (body.IsGlobal != nil && *body.IsGlobal) {
		isGlobal = true
		categoryID = nil
		menuItemID = nil
		scope = "GLOBAL"
	} else if scope == "CATEGORY" || (categoryID != nil && *categoryID != "") {
		isGlobal = false
		menuItemID = nil
		scope = "CATEGORY"
	} else {
		isGlobal = false
		categoryID = nil
		scope = "ITEM"
	}

	isActive := true
	if body.IsActive != nil {
		isActive = *body.IsActive
	}

	id := fmt.Sprintf("addon-%s", uuid.New().String()[:8])

	var a AddonItem
	err := s.Pool.QueryRow(r.Context(), `
		INSERT INTO menu_item_addons (id, name, price, category_id, menu_item_id, is_global, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, name, price::float8, category_id, menu_item_id, is_global, is_active, sort_order, created_at`,
		id, name, body.Price, categoryID, menuItemID, isGlobal, isActive,
	).Scan(&a.ID, &a.Name, &a.Price, &a.CategoryID, &a.MenuItemID, &a.IsGlobal, &a.IsActive, &a.SortOrder, &a.CreatedAt)

	if err != nil {
		writeErr(w, 400, err.Error())
		return
	}

	a.Scope = scope
	s.LogActivityFromReq(r, "CREATE_ADDON", "ADDON", a.ID, fmt.Sprintf("Created new %s addon '%s' (ETB %.2f)", scope, name, body.Price), nil, a)
	writeJSON(w, 201, a)
}

func (s *Server) updateAddon(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var body map[string]any
	if err := decodeJSON(r, &body); err != nil {
		writeErr(w, 400, "invalid JSON body")
		return
	}

	var a AddonItem
	err := s.Pool.QueryRow(r.Context(), `
		SELECT id, name, price::float8, category_id, menu_item_id, is_global, is_active, sort_order, created_at
		FROM menu_item_addons WHERE id = $1`, id).Scan(
		&a.ID, &a.Name, &a.Price, &a.CategoryID, &a.MenuItemID, &a.IsGlobal, &a.IsActive, &a.SortOrder, &a.CreatedAt,
	)
	if err != nil {
		writeErr(w, 404, "Addon not found")
		return
	}

	prevState := a

	if name, ok := body["name"].(string); ok && strings.TrimSpace(name) != "" {
		a.Name = strings.TrimSpace(name)
	}
	if pr, ok := body["price"].(float64); ok {
		a.Price = pr
	}
	if act, ok := body["isActive"].(bool); ok {
		a.IsActive = act
	}

	if scope, ok := body["scope"].(string); ok {
		scUpper := strings.ToUpper(strings.TrimSpace(scope))
		if scUpper == "GLOBAL" {
			a.IsGlobal = true
			a.CategoryID = nil
			a.MenuItemID = nil
			a.Scope = "GLOBAL"
		} else if scUpper == "CATEGORY" {
			a.IsGlobal = false
			a.MenuItemID = nil
			if catID, okCat := body["categoryId"].(string); okCat && catID != "" {
				a.CategoryID = &catID
			}
			a.Scope = "CATEGORY"
		} else if scUpper == "ITEM" {
			a.IsGlobal = false
			a.CategoryID = nil
			if itemID, okItem := body["menuItemId"].(string); okItem && itemID != "" {
				a.MenuItemID = &itemID
			}
			a.Scope = "ITEM"
		}
	}

	_, _ = s.Pool.Exec(r.Context(), `
		UPDATE menu_item_addons
		SET name = $1, price = $2, category_id = $3, menu_item_id = $4, is_global = $5, is_active = $6
		WHERE id = $7`,
		a.Name, a.Price, a.CategoryID, a.MenuItemID, a.IsGlobal, a.IsActive, id,
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
