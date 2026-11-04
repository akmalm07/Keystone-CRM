package main

import (
	"context"
	"log"
	"os"

	"github.com/joho/godotenv"

	"nodistractions/internal/store"
)

func main() {
	_ = godotenv.Load(".env.local", ".env")
	databaseURL := os.Getenv("DATABASE_URL_UNPOOLED")
	if databaseURL == "" {
		log.Fatal("DATABASE_URL_UNPOOLED is required for migrations; use Neon's direct connection string")
	}
	database, err := store.NewPostgresStore(context.Background(), databaseURL)
	if err != nil {
		log.Fatalf("connect to Neon Postgres: %v", err)
	}
	defer database.Close()
	if err := database.Migrate(context.Background()); err != nil {
		log.Fatalf("apply migrations: %v", err)
	}
	log.Print("Neon Postgres migrations are current")
}
