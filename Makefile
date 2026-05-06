.PHONY: up down logs reset-db ps install build

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f

ps:
	docker compose ps

reset-db:
	docker compose down -v
	docker compose up -d postgres

install:
	pnpm install

build:
	pnpm build
