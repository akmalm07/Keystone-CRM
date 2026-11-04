package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"nodistractions/internal/store"
)

func request(t *testing.T, h http.Handler, method, path, token, payload string) *httptest.ResponseRecorder {
	t.Helper()
	r := httptest.NewRequest(method, path, bytes.NewBufferString(payload))
	r.Header.Set("Content-Type", "application/json")
	if token != "" {
		r.Header.Set("Authorization", "Bearer "+token)
	}
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	return w
}
func tokenFrom(t *testing.T, w *httptest.ResponseRecorder) string {
	t.Helper()
	var v struct {
		Token string `json:"token"`
	}
	if err := json.NewDecoder(w.Body).Decode(&v); err != nil {
		t.Fatal(err)
	}
	return v.Token
}
func TestGroupChatFlowAndAuthorization(t *testing.T) {
	h := NewHandler(store.NewMemoryStore())
	r := request(t, h, "POST", "/api/register", "", `{"username":"alice","password":"verysecurepassword"}`)
	if r.Code != 201 {
		t.Fatalf("register: %d %s", r.Code, r.Body.String())
	}
	token := tokenFrom(t, r)
	r = request(t, h, "POST", "/api/create-group", token, `{"name":"Study Room","entry_details_config":{"invite_code":"read-more"}}`)
	if r.Code != 201 {
		t.Fatalf("group: %d %s", r.Code, r.Body.String())
	}
	var group struct {
		Group struct {
			ID string `json:"id"`
		} `json:"group"`
	}
	_ = json.NewDecoder(r.Body).Decode(&group)
	r = request(t, h, "POST", "/api/send-chats", "", `{"group_id":"`+group.Group.ID+`","message_body":"hello"}`)
	if r.Code != 401 {
		t.Fatalf("expected unauthenticated rejection, got %d", r.Code)
	}
	r = request(t, h, "POST", "/api/send-chats", token, `{"group_id":"`+group.Group.ID+`","message_body":"hello"}`)
	if r.Code != 201 {
		t.Fatalf("send: %d %s", r.Code, r.Body.String())
	}
	r = request(t, h, "POST", "/api/get-chats", token, `{"group_id":"`+group.Group.ID+`"}`)
	if r.Code != 200 {
		t.Fatalf("chats: %d %s", r.Code, r.Body.String())
	}
	var page struct {
		Messages []store.Message `json:"messages"`
	}
	_ = json.NewDecoder(r.Body).Decode(&page)
	if len(page.Messages) != 1 || page.Messages[0].Body != "hello" {
		t.Fatalf("unexpected messages: %#v", page.Messages)
	}
}
func TestEntryCodeIsRequired(t *testing.T) {
	h := NewHandler(store.NewMemoryStore())
	a := request(t, h, "POST", "/api/register", "", `{"username":"owner","password":"verysecurepassword"}`)
	token := tokenFrom(t, a)
	r := request(t, h, "POST", "/api/create-group", token, `{"name":"Private group","entry_details_config":{"invite_code":"correct-code"}}`)
	var response struct {
		Group struct {
			ID string `json:"id"`
		} `json:"group"`
	}
	_ = json.NewDecoder(r.Body).Decode(&response)
	b := request(t, h, "POST", "/api/register", "", `{"username":"reader","password":"verysecurepassword"}`)
	reader := tokenFrom(t, b)
	r = request(t, h, "POST", "/api/get-group", reader, `{"name":"Private group","entry_details":{"invite_code":"wrong"}}`)
	if r.Code != 403 {
		t.Fatalf("expected bad code rejection, got %d", r.Code)
	}
	r = request(t, h, "POST", "/api/get-chats", reader, `{"group_id":"`+response.Group.ID+`"}`)
	if r.Code != 403 {
		t.Fatalf("expected membership rejection, got %d", r.Code)
	}
}

func TestChatPaginationUsesFiftyThenOneHundred(t *testing.T) {
	s := store.NewMemoryStore()
	u, err := s.CreateUser("pager", "irrelevant-for-store-test")
	if err != nil {
		t.Fatal(err)
	}
	s.CreateSession(u.ID, "page-token")
	g, err := s.CreateGroup("Pagination room", "pagination-room", "page-code", u.ID)
	if err != nil {
		t.Fatal(err)
	}
	for i := 0; i < 151; i++ {
		s.AddMessage(g.ID, u.ID, u.Username, fmt.Sprintf("message %d", i))
	}
	h := NewHandler(s)
	first := request(t, h, "POST", "/api/get-chats", "page-token", `{"group_id":"`+g.ID+`"}`)
	if first.Code != 200 {
		t.Fatalf("first page: %d %s", first.Code, first.Body.String())
	}
	var firstPage struct {
		Messages   []store.Message `json:"messages"`
		NextCursor string          `json:"next_cursor"`
	}
	if err := json.NewDecoder(first.Body).Decode(&firstPage); err != nil {
		t.Fatal(err)
	}
	if len(firstPage.Messages) != 50 || firstPage.Messages[0].Body != "message 150" || firstPage.NextCursor == "" {
		t.Fatalf("unexpected first page: %#v", firstPage)
	}
	second := request(t, h, "POST", "/api/get-chats", "page-token", `{"group_id":"`+g.ID+`","cursor":"`+firstPage.NextCursor+`"}`)
	if second.Code != 200 {
		t.Fatalf("second page: %d %s", second.Code, second.Body.String())
	}
	var secondPage struct {
		Messages   []store.Message `json:"messages"`
		NextCursor string          `json:"next_cursor"`
	}
	if err := json.NewDecoder(second.Body).Decode(&secondPage); err != nil {
		t.Fatal(err)
	}
	if len(secondPage.Messages) != 100 || secondPage.Messages[0].Body != "message 100" || secondPage.Messages[99].Body != "message 1" || secondPage.NextCursor == "" {
		t.Fatalf("unexpected second page: %#v", secondPage)
	}
}
