package store

import (
	"context"
	_ "embed"
	"errors"
	"fmt"
	"sync/atomic"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed migrations/001_initial.sql
var initialMigration string

type PostgresStore struct {
	pool     *pgxpool.Pool
	sequence atomic.Uint64
}

func NewPostgresStore(ctx context.Context, databaseURL string) (*PostgresStore, error) {
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		return nil, err
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, err
	}
	return &PostgresStore{pool: pool}, nil
}

func (s *PostgresStore) Close() { s.pool.Close() }

func (s *PostgresStore) Migrate(ctx context.Context) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if _, err = tx.Exec(ctx, `CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`); err != nil {
		return err
	}
	var applied bool
	if err = tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version = '001_initial')`).Scan(&applied); err != nil {
		return err
	}
	if !applied {
		if _, err = tx.Exec(ctx, initialMigration); err != nil {
			return err
		}
		if _, err = tx.Exec(ctx, `INSERT INTO schema_migrations (version) VALUES ('001_initial')`); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

func (s *PostgresStore) nextID(kind string) string {
	n := s.sequence.Add(1)
	return fmt.Sprintf("%s_%s_%d", kind, time.Now().UTC().Format("20060102150405.000000000"), n)
}

func (s *PostgresStore) CreateUser(username, passwordHash string) (User, error) {
	user := User{ID: s.nextID("usr"), Username: username, PasswordHash: passwordHash, CreatedAt: time.Now().UTC()}
	err := s.pool.QueryRow(context.Background(), `INSERT INTO users (id, username, password_hash, created_at) VALUES ($1, $2, $3, $4) RETURNING created_at`, user.ID, user.Username, user.PasswordHash, user.CreatedAt).Scan(&user.CreatedAt)
	if isUniqueViolation(err) {
		return User{}, ErrDuplicateUsername
	}
	return user, err
}

func (s *PostgresStore) CreateSession(userID, token string) {
	_, _ = s.pool.Exec(context.Background(), `INSERT INTO sessions (token, user_id) VALUES ($1, $2)`, token, userID)
}
func (s *PostgresStore) UserForToken(token string) (User, bool) {
	var user User
	err := s.pool.QueryRow(context.Background(), `SELECT u.id, u.username, u.password_hash, u.created_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = $1`, token).Scan(&user.ID, &user.Username, &user.PasswordHash, &user.CreatedAt)
	return user, err == nil
}

func (s *PostgresStore) CreateGroup(name, slug, inviteCode, creatorID string) (Group, error) {
	ctx := context.Background()
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return Group{}, err
	}
	defer tx.Rollback(ctx)
	group := Group{ID: s.nextID("grp"), Name: name, Slug: slug, InviteCode: inviteCode, CreatedByID: creatorID, CreatedAt: time.Now().UTC()}
	err = tx.QueryRow(ctx, `INSERT INTO groups (id, name, slug, invite_code, created_by_user_id, created_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING created_at`, group.ID, group.Name, group.Slug, group.InviteCode, group.CreatedByID, group.CreatedAt).Scan(&group.CreatedAt)
	if isUniqueViolation(err) {
		return Group{}, ErrDuplicateSlug
	}
	if err != nil {
		return Group{}, err
	}
	if _, err = tx.Exec(ctx, `INSERT INTO group_memberships (group_id, user_id, role) VALUES ($1, $2, 'owner')`, group.ID, creatorID); err != nil {
		return Group{}, err
	}
	if err = tx.Commit(ctx); err != nil {
		return Group{}, err
	}
	return group, nil
}

func (s *PostgresStore) GroupBySlug(slug string) (Group, bool) {
	var group Group
	err := s.pool.QueryRow(context.Background(), `SELECT id, name, slug, invite_code, created_by_user_id, created_at FROM groups WHERE slug = $1`, slug).Scan(&group.ID, &group.Name, &group.Slug, &group.InviteCode, &group.CreatedByID, &group.CreatedAt)
	return group, err == nil
}
func (s *PostgresStore) AddMember(groupID, userID string) {
	_, _ = s.pool.Exec(context.Background(), `INSERT INTO group_memberships (group_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, groupID, userID)
}
func (s *PostgresStore) IsMember(groupID, userID string) bool {
	var exists bool
	_ = s.pool.QueryRow(context.Background(), `SELECT EXISTS(SELECT 1 FROM group_memberships WHERE group_id=$1 AND user_id=$2)`, groupID, userID).Scan(&exists)
	return exists
}
func (s *PostgresStore) AddMessage(groupID, userID, username, body string) Message {
	message := Message{ID: s.nextID("msg"), GroupID: groupID, SenderUserID: userID, SenderName: username, Body: body, CreatedAt: time.Now().UTC()}
	_ = s.pool.QueryRow(context.Background(), `INSERT INTO messages (id,group_id,sender_user_id,body,created_at) VALUES ($1,$2,$3,$4,$5) RETURNING sequence_id,created_at`, message.ID, message.GroupID, message.SenderUserID, message.Body, message.CreatedAt).Scan(&message.order, &message.CreatedAt)
	return message
}

func (s *PostgresStore) MessagesBefore(groupID, cursor string, limit int) ([]Message, string, error) {
	ctx := context.Background()
	var rows pgx.Rows
	var err error
	if cursor == "" {
		rows, err = s.pool.Query(ctx, `SELECT m.id,m.group_id,m.sender_user_id,u.username,m.body,m.created_at,m.sequence_id FROM messages m JOIN users u ON u.id=m.sender_user_id WHERE m.group_id=$1 ORDER BY m.sequence_id DESC LIMIT $2`, groupID, limit+1)
	} else {
		var cursorOrder uint64
		err = s.pool.QueryRow(ctx, `SELECT sequence_id FROM messages WHERE group_id=$1 AND id=$2`, groupID, cursor).Scan(&cursorOrder)
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, "", ErrNotFound
		}
		if err != nil {
			return nil, "", err
		}
		rows, err = s.pool.Query(ctx, `SELECT m.id,m.group_id,m.sender_user_id,u.username,m.body,m.created_at,m.sequence_id FROM messages m JOIN users u ON u.id=m.sender_user_id WHERE m.group_id=$1 AND m.sequence_id<$2 ORDER BY m.sequence_id DESC LIMIT $3`, groupID, cursorOrder, limit+1)
	}
	if err != nil {
		return nil, "", err
	}
	defer rows.Close()
	messages := make([]Message, 0, limit+1)
	for rows.Next() {
		var message Message
		if err := rows.Scan(&message.ID, &message.GroupID, &message.SenderUserID, &message.SenderName, &message.Body, &message.CreatedAt, &message.order); err != nil {
			return nil, "", err
		}
		messages = append(messages, message)
	}
	if err := rows.Err(); err != nil {
		return nil, "", err
	}
	next := ""
	if len(messages) > limit {
		messages = messages[:limit]
		next = messages[len(messages)-1].ID
	}
	return messages, next, nil
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}
