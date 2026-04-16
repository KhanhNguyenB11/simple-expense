#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f ".env" ]]; then
  echo "Missing .env. Creating from .env.example"
  cp .env.example .env
fi

if [[ ! -f "backend/.env" ]]; then
  echo "Missing backend/.env. Creating from backend/.env.example"
  cp backend/.env.example backend/.env
fi

if [[ ! -f "frontend/.env" ]]; then
  echo "Missing frontend/.env. Creating from frontend/.env.example"
  cp frontend/.env.example frontend/.env
fi

echo "Starting services (postgres, minio, backend, frontend)..."
docker compose up -d --build

echo "Running DB migrations..."
docker compose exec backend npx prisma migrate dev

echo "Seeding admin user..."
docker compose exec backend npx prisma db seed

echo ""
echo "Up and running:"
echo "- Frontend:     http://localhost:3000"
echo "- Backend API:  http://localhost:8001/api"
echo "- Swagger:      http://localhost:8001/api/docs"
echo "- MinIO:        http://localhost:9001 (minioadmin/minioadmin)"
echo ""
echo "Seeded admin (from backend/.env):"
echo "- Email:    admin@expense.local"
echo "- Password: Admin123!"

