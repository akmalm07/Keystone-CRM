package api

import (
	"crypto/pbkdf2"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"

	"nodistractions/internal/store"
)

const maxBodyBytes = 1 << 20

var usernamePattern = regexp.MustCompile(`^[a-zA-Z0-9_]{3,32}$`)

type Handler struct {
	store store.Store
	mux   *http.ServeMux
}

func NewHandler(s store.Store) http.Handler {
	h := &Handler{store: s, mux: http.NewServeMux()}
	h.mux.HandleFunc("GET /health", h.health)
	h.mux.HandleFunc("POST /api/register", h.register)
	h.mux.HandleFunc("POST /api/create-group", h.requireAuth(h.createGroup))
	h.mux.HandleFunc("POST /api/get-group", h.requireAuth(h.getGroup))
	h.mux.HandleFunc("POST /api/get-chats", h.requireAuth(h.getChats))
	h.mux.HandleFunc("POST /api/send-chats", h.requireAuth(h.sendChats))
	return h.cors(h.mux)
}

func (h *Handler) cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:5173")
		w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
func (h *Handler) health(w http.ResponseWriter, r *http.Request) {
	respond(w, http.StatusOK, map[string]string{"status": "ok"})
}
func respond(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
func fail(w http.ResponseWriter, status int, message string) {
	respond(w, status, map[string]string{"error": message})
}
func decode(r *http.Request, out any) error {
	r.Body = http.MaxBytesReader(nil, r.Body, maxBodyBytes)
	defer r.Body.Close()
	d := json.NewDecoder(r.Body)
	d.DisallowUnknownFields()
	if err := d.Decode(out); err != nil {
		return err
	}
	if err := d.Decode(&struct{}{}); err != io.EOF {
		return errors.New("request body must contain one JSON object")
	}
	return nil
}

type registerRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
	TOTP     string `json:"totp,omitempty"`
}

func (h *Handler) register(w http.ResponseWriter, r *http.Request) {
	var req registerRequest
	if err := decode(r, &req); err != nil {
		fail(w, 400, "invalid JSON request")
		return
	}
	req.Username = strings.TrimSpace(req.Username)
	if !usernamePattern.MatchString(req.Username) {
		fail(w, 400, "username must be 3-32 letters, numbers, or underscores")
		return
	}
	if len(req.Password) < 10 || len(req.Password) > 128 {
		fail(w, 400, "password must be 10-128 characters")
		return
	}
	if req.TOTP != "" {
		fail(w, 400, "TOTP is not configured in this prototype")
		return
	}
	hash, err := hashPassword(req.Password)
	if err != nil {
		fail(w, 500, "could not create account")
		return
	}
	u, err := h.store.CreateUser(strings.ToLower(req.Username), hash)
	if errors.Is(err, store.ErrDuplicateUsername) {
		fail(w, 409, "username already exists")
		return
	}
	if err != nil {
		fail(w, 500, "could not create account")
		return
	}
	token, err := randomToken()
	if err != nil {
		fail(w, 500, "could not create session")
		return
	}
	h.store.CreateSession(u.ID, token)
	respond(w, 201, map[string]any{"user": u, "token": token})
}

type authHandler func(http.ResponseWriter, *http.Request, store.User)

func (h *Handler) requireAuth(next authHandler) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		fields := strings.Fields(r.Header.Get("Authorization"))
		if len(fields) != 2 || fields[0] != "Bearer" {
			fail(w, 401, "missing or invalid bearer token")
			return
		}
		u, ok := h.store.UserForToken(fields[1])
		if !ok {
			fail(w, 401, "invalid session")
			return
		}
		next(w, r, u)
	}
}

type createGroupRequest struct {
	Name               string `json:"name"`
	EntryDetailsConfig struct {
		InviteCode string `json:"invite_code"`
	} `json:"entry_details_config"`
}

func (h *Handler) createGroup(w http.ResponseWriter, r *http.Request, u store.User) {
	var req createGroupRequest
	if err := decode(r, &req); err != nil {
		fail(w, 400, "invalid JSON request")
		return
	}
	req.Name = strings.TrimSpace(req.Name)
	slug := slugify(req.Name)
	if len(req.Name) < 3 || len(req.Name) > 64 || slug == "" {
		fail(w, 400, "group name must be 3-64 characters and include a letter or number")
		return
	}
	if len(req.EntryDetailsConfig.InviteCode) < 4 || len(req.EntryDetailsConfig.InviteCode) > 64 {
		fail(w, 400, "invite_code must be 4-64 characters")
		return
	}
	g, err := h.store.CreateGroup(req.Name, slug, req.EntryDetailsConfig.InviteCode, u.ID)
	if errors.Is(err, store.ErrDuplicateSlug) {
		fail(w, 409, "a group with that name already exists")
		return
	}
	if err != nil {
		fail(w, 500, "could not create group")
		return
	}
	respond(w, 201, map[string]any{"group": publicGroup(g), "subdomain": g.Slug + ".nodistractions.online"})
}

type groupRequest struct {
	Name         string `json:"name"`
	EntryDetails struct {
		InviteCode string `json:"invite_code"`
	} `json:"entry_details"`
}

func (h *Handler) getGroup(w http.ResponseWriter, r *http.Request, u store.User) {
	var req groupRequest
	if err := decode(r, &req); err != nil {
		fail(w, 400, "invalid JSON request")
		return
	}
	g, ok := h.store.GroupBySlug(slugify(req.Name))
	if !ok {
		fail(w, 404, "group not found")
		return
	}
	if subtle.ConstantTimeCompare([]byte(req.EntryDetails.InviteCode), []byte(g.InviteCode)) != 1 {
		fail(w, 403, "entry details were not accepted")
		return
	}
	h.store.AddMember(g.ID, u.ID)
	respond(w, 200, map[string]any{"group": publicGroup(g), "membership": "member"})
}

type chatsRequest struct {
	GroupID string `json:"group_id"`
	Cursor  string `json:"cursor,omitempty"`
}

func (h *Handler) getChats(w http.ResponseWriter, r *http.Request, u store.User) {
	var req chatsRequest
	if err := decode(r, &req); err != nil {
		fail(w, 400, "invalid JSON request")
		return
	}
	if !h.store.IsMember(req.GroupID, u.ID) {
		fail(w, 403, "you do not have access to this group")
		return
	}
	limit := 50
	if req.Cursor != "" {
		limit = 100
	}
	messages, next, err := h.store.MessagesBefore(req.GroupID, req.Cursor, limit)
	if errors.Is(err, store.ErrNotFound) {
		fail(w, 400, "invalid cursor")
		return
	}
	respond(w, 200, map[string]any{"messages": messages, "next_cursor": next})
}

type sendRequest struct {
	GroupID     string `json:"group_id"`
	MessageBody string `json:"message_body"`
}

func (h *Handler) sendChats(w http.ResponseWriter, r *http.Request, u store.User) {
	var req sendRequest
	if err := decode(r, &req); err != nil {
		fail(w, 400, "invalid JSON request")
		return
	}
	req.MessageBody = strings.TrimSpace(req.MessageBody)
	if !h.store.IsMember(req.GroupID, u.ID) {
		fail(w, 403, "you do not have access to this group")
		return
	}
	if req.MessageBody == "" || len(req.MessageBody) > 2000 {
		fail(w, 400, "message_body must be 1-2000 characters")
		return
	}
	message := h.store.AddMessage(req.GroupID, u.ID, u.Username, req.MessageBody)
	respond(w, 201, map[string]any{"message": message})
}
func publicGroup(g store.Group) map[string]any {
	return map[string]any{"id": g.ID, "name": g.Name, "slug": g.Slug, "created_by_user_id": g.CreatedByID, "created_at": g.CreatedAt}
}
func slugify(input string) string {
	input = strings.ToLower(strings.TrimSpace(input))
	var b strings.Builder
	lastDash := false
	for _, r := range input {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			b.WriteRune(r)
			lastDash = false
		} else if !lastDash && b.Len() > 0 {
			b.WriteByte('-')
			lastDash = true
		}
	}
	return strings.Trim(b.String(), "-")
}
func randomToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}
func hashPassword(password string) (string, error) {
	salt := make([]byte, 16)
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}
	key, err := pbkdf2.Key(sha256.New, password, salt, 600000, 32)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("pbkdf2-sha256$600000$%s$%s", base64.RawStdEncoding.EncodeToString(salt), base64.RawStdEncoding.EncodeToString(key)), nil
}
