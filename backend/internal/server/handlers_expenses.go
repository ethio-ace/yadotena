package server

import (
	"net/http"
	"time"

	"github.com/google/uuid"
	"yadotena/internal/dto"
	"yadotena/internal/models"
)

func (s *Server) listExpenses(w http.ResponseWriter, r *http.Request) {
	rows, err := s.Pool.Query(r.Context(), `
		SELECT e.id, e.amount, e.category, e.description, e.expense_date, e.payment_method,
		       e.recorded_by, COALESCE(st.name,''), e.created_at, e.updated_at
		FROM expenses e
		LEFT JOIN staff st ON st.id = e.recorded_by
		WHERE e.deleted_at IS NULL
		ORDER BY e.expense_date DESC, e.created_at DESC`)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	defer rows.Close()
	list := []map[string]any{}
	for rows.Next() {
		var e models.Expense
		if err := rows.Scan(&e.ID, &e.Amount, &e.Category, &e.Description, &e.ExpenseDate,
			&e.PaymentMethod, &e.RecordedBy, &e.RecordedName, &e.CreatedAt, &e.UpdatedAt); err != nil {
			writeErr(w, 500, err.Error())
			return
		}
		out := dto.ExpenseAPI(e)
		if e.RecordedName != "" {
			out["recordedByName"] = e.RecordedName
		}
		list = append(list, out)
	}
	writeJSON(w, 200, list)
}

func (s *Server) createExpense(w http.ResponseWriter, r *http.Request) {
	c := claimsFrom(r)
	var body struct {
		Amount        float64 `json:"amount"`
		Category      string  `json:"category"`
		Description   string  `json:"description"`
		Date          string  `json:"date"`
		PaymentMethod string  `json:"paymentMethod"`
		// snake_case aliases
		PaymentMethodSnake string `json:"payment_method"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeErr(w, 400, "invalid body")
		return
	}
	if body.PaymentMethod == "" {
		body.PaymentMethod = body.PaymentMethodSnake
	}
	if body.Amount <= 0 || body.Category == "" || body.Description == "" || body.PaymentMethod == "" {
		writeErr(w, 400, "amount, category, description, paymentMethod required")
		return
	}
	dateStr := body.Date
	if dateStr == "" {
		dateStr = time.Now().Format("2006-01-02")
	}
	d, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		writeErr(w, 400, "date must be YYYY-MM-DD")
		return
	}
	var e models.Expense
	err = s.Pool.QueryRow(r.Context(), `
		INSERT INTO expenses (amount, category, description, expense_date, payment_method, recorded_by)
		VALUES ($1,$2,$3,$4::date,$5,$6)
		RETURNING id, amount, category, description, expense_date, payment_method, recorded_by, created_at, updated_at`,
		body.Amount, body.Category, body.Description, d, body.PaymentMethod, c.StaffID).
		Scan(&e.ID, &e.Amount, &e.Category, &e.Description, &e.ExpenseDate, &e.PaymentMethod, &e.RecordedBy, &e.CreatedAt, &e.UpdatedAt)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	_ = s.Log.Write(r.Context(), &c.StaffID, c.Name, "create_expense", "expense", e.ID.String(), map[string]any{"amount": e.Amount})
	writeJSON(w, 201, dto.ExpenseAPI(e))
}

func (s *Server) patchExpense(w http.ResponseWriter, r *http.Request) {
	c := claimsFrom(r)
	id, err := uuid.Parse(chiURLParam(r, "id"))
	if err != nil {
		writeErr(w, 400, "bad id")
		return
	}
	var body struct {
		Amount        *float64 `json:"amount"`
		Category      *string  `json:"category"`
		Description   *string  `json:"description"`
		Date          *string  `json:"date"`
		PaymentMethod *string  `json:"paymentMethod"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeErr(w, 400, "invalid body")
		return
	}
	var exists bool
	_ = s.Pool.QueryRow(r.Context(), `SELECT EXISTS(SELECT 1 FROM expenses WHERE id=$1 AND deleted_at IS NULL)`, id).Scan(&exists)
	if !exists {
		writeErr(w, 404, "not found")
		return
	}
	if body.Amount != nil {
		if *body.Amount <= 0 {
			writeErr(w, 400, "amount must be positive")
			return
		}
		_, _ = s.Pool.Exec(r.Context(), `UPDATE expenses SET amount=$1, updated_at=now() WHERE id=$2`, *body.Amount, id)
	}
	if body.Category != nil {
		_, _ = s.Pool.Exec(r.Context(), `UPDATE expenses SET category=$1, updated_at=now() WHERE id=$2`, *body.Category, id)
	}
	if body.Description != nil {
		_, _ = s.Pool.Exec(r.Context(), `UPDATE expenses SET description=$1, updated_at=now() WHERE id=$2`, *body.Description, id)
	}
	if body.Date != nil {
		d, err := time.Parse("2006-01-02", *body.Date)
		if err != nil {
			writeErr(w, 400, "date must be YYYY-MM-DD")
			return
		}
		_, _ = s.Pool.Exec(r.Context(), `UPDATE expenses SET expense_date=$1::date, updated_at=now() WHERE id=$2`, d, id)
	}
	if body.PaymentMethod != nil {
		_, _ = s.Pool.Exec(r.Context(), `UPDATE expenses SET payment_method=$1, updated_at=now() WHERE id=$2`, *body.PaymentMethod, id)
	}
	_ = s.Log.Write(r.Context(), &c.StaffID, c.Name, "update_expense", "expense", id.String(), nil)

	var e models.Expense
	err = s.Pool.QueryRow(r.Context(), `
		SELECT id, amount, category, description, expense_date, payment_method, recorded_by, created_at, updated_at
		FROM expenses WHERE id=$1`, id).
		Scan(&e.ID, &e.Amount, &e.Category, &e.Description, &e.ExpenseDate, &e.PaymentMethod, &e.RecordedBy, &e.CreatedAt, &e.UpdatedAt)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, dto.ExpenseAPI(e))
}

func (s *Server) deleteExpense(w http.ResponseWriter, r *http.Request) {
	c := claimsFrom(r)
	id, err := uuid.Parse(chiURLParam(r, "id"))
	if err != nil {
		writeErr(w, 400, "bad id")
		return
	}
	tag, err := s.Pool.Exec(r.Context(), `
		UPDATE expenses SET deleted_at=now(), updated_at=now()
		WHERE id=$1 AND deleted_at IS NULL`, id)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	if tag.RowsAffected() == 0 {
		writeErr(w, 404, "not found")
		return
	}
	_ = s.Log.Write(r.Context(), &c.StaffID, c.Name, "delete_expense", "expense", id.String(), nil)
	writeJSON(w, 200, map[string]any{"ok": true})
}
