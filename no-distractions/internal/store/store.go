package store

import (
	"errors"
	"sort"
	"sync"
	"time"
)

var (
	ErrDuplicateUsername = errors.New("username already exists")
	ErrDuplicateSlug     = errors.New("group name is already in use")
	ErrNotFound          = errors.New("not found")
)

// Store captures the persistence operations used by the HTTP API. MemoryStore
// supports fast unit tests; PostgresStore is the Neon-backed runtime store.
type Store interface {
	CreateUser(username, passwordHash string) (User, error)
	CreateSession(userID, token string)
	UserForToken(token string) (User, bool)
	CreateGroup(name, slug, inviteCode, creatorID string) (Group, error)
	GroupBySlug(slug string) (Group, bool)
	AddMember(groupID, userID string)
	IsMember(groupID, userID string) bool
	AddMessage(groupID, userID, username, body string) Message
	MessagesBefore(groupID, cursor string, limit int) ([]Message, string, error)
}

type User struct {
	ID           string    `json:"id"`
	Username     string    `json:"username"`
	PasswordHash string    `json:"-"`
	CreatedAt    time.Time `json:"created_at"`
}

type Group struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Slug        string    `json:"slug"`
	InviteCode  string    `json:"-"`
	CreatedByID string    `json:"created_by_user_id"`
	CreatedAt   time.Time `json:"created_at"`
}

type Message struct {
	ID           string    `json:"id"`
	GroupID      string    `json:"group_id"`
	SenderUserID string    `json:"sender_user_id"`
	SenderName   string    `json:"sender_name"`
	Body         string    `json:"body"`
	CreatedAt    time.Time `json:"created_at"`
	order        uint64
}

type MemoryStore struct {
	mu          sync.RWMutex
	users       map[string]User
	usernames   map[string]string
	groups      map[string]Group
	slugs       map[string]string
	memberships map[string]map[string]bool
	messages    map[string][]Message
	sessions    map[string]string
	sequence    uint64
}

func NewMemoryStore() *MemoryStore {
	return &MemoryStore{users: map[string]User{}, usernames: map[string]string{}, groups: map[string]Group{}, slugs: map[string]string{}, memberships: map[string]map[string]bool{}, messages: map[string][]Message{}, sessions: map[string]string{}}
}

func (s *MemoryStore) nextID(kind string) string {
	s.sequence++
	return kind + "_" + time.Now().UTC().Format("20060102150405.000000000") + "_" + stringID(s.sequence)
}

func stringID(n uint64) string {
	const chars = "0123456789abcdefghijklmnopqrstuvwxyz"
	if n == 0 {
		return "0"
	}
	result := ""
	for n > 0 {
		result = string(chars[n%36]) + result
		n /= 36
	}
	return result
}

func (s *MemoryStore) CreateUser(username, passwordHash string) (User, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, exists := s.usernames[username]; exists {
		return User{}, ErrDuplicateUsername
	}
	u := User{ID: s.nextID("usr"), Username: username, PasswordHash: passwordHash, CreatedAt: time.Now().UTC()}
	s.users[u.ID], s.usernames[username] = u, u.ID
	return u, nil
}

func (s *MemoryStore) CreateSession(userID, token string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.sessions[token] = userID
}
func (s *MemoryStore) UserForToken(token string) (User, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	id, ok := s.sessions[token]
	if !ok {
		return User{}, false
	}
	u, ok := s.users[id]
	return u, ok
}

func (s *MemoryStore) CreateGroup(name, slug, inviteCode, creatorID string) (Group, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, exists := s.slugs[slug]; exists {
		return Group{}, ErrDuplicateSlug
	}
	g := Group{ID: s.nextID("grp"), Name: name, Slug: slug, InviteCode: inviteCode, CreatedByID: creatorID, CreatedAt: time.Now().UTC()}
	s.groups[g.ID], s.slugs[slug] = g, g.ID
	s.memberships[g.ID] = map[string]bool{creatorID: true}
	return g, nil
}

func (s *MemoryStore) GroupBySlug(slug string) (Group, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	id, ok := s.slugs[slug]
	if !ok {
		return Group{}, false
	}
	g, ok := s.groups[id]
	return g, ok
}
func (s *MemoryStore) AddMember(groupID, userID string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.memberships[groupID] == nil {
		s.memberships[groupID] = map[string]bool{}
	}
	s.memberships[groupID][userID] = true
}
func (s *MemoryStore) IsMember(groupID, userID string) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.memberships[groupID][userID]
}

func (s *MemoryStore) AddMessage(groupID, userID, username, body string) Message {
	s.mu.Lock()
	defer s.mu.Unlock()
	m := Message{ID: s.nextID("msg"), GroupID: groupID, SenderUserID: userID, SenderName: username, Body: body, CreatedAt: time.Now().UTC(), order: s.sequence}
	s.messages[groupID] = append(s.messages[groupID], m)
	return m
}

// MessagesBefore returns newest-first records strictly older than cursor. An empty cursor starts at the newest record.
func (s *MemoryStore) MessagesBefore(groupID, cursor string, limit int) ([]Message, string, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	all := append([]Message(nil), s.messages[groupID]...)
	if cursor != "" {
		index := -1
		for i, m := range all {
			if m.ID == cursor {
				index = i
				break
			}
		}
		if index == -1 {
			return nil, "", ErrNotFound
		}
		all = all[:index]
	}
	sort.Slice(all, func(i, j int) bool {
		if all[i].CreatedAt.Equal(all[j].CreatedAt) {
			return all[i].order > all[j].order
		}
		return all[i].CreatedAt.After(all[j].CreatedAt)
	})
	if len(all) == 0 {
		return []Message{}, "", nil
	}
	if len(all) <= limit {
		return all, "", nil
	}
	page := all[:limit]
	return page, page[len(page)-1].ID, nil
}
