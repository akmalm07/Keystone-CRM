package main

import (
	"context"
	"log"
	"net/http"
	"os"

	"github.com/joho/godotenv"

	"nodistractions/internal/api"
	"nodistractions/internal/store"
)

func main() {
	_ = godotenv.Load(".env.local", ".env")
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Fatal("DATABASE_URL is required; run `npx neon@latest env pull` after linking a Neon project")
	}
	database, err := store.NewPostgresStore(context.Background(), databaseURL)
	if err != nil {
		log.Fatalf("connect to Neon Postgres: %v", err)
	}
	defer database.Close()

	handler := api.NewHandler(database)
	server := &http.Server{Addr: ":" + port, Handler: handler}
	log.Printf("NoDistractions API listening on http://localhost:%s", port)
	log.Fatal(server.ListenAndServe())
}
