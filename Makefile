# ─────────────────────────────────────────────────────────────────────────────
#  H-2 Visa Scanner Pro — Makefile
# ─────────────────────────────────────────────────────────────────────────────

.PHONY: setup build up down dev logs restart clean help

## Configura o ambiente (cria .env a partir do exemplo)
setup:
	@[ -f .env ] || cp .env.example .env
	@echo "✅  Arquivo .env criado. Edite com suas chaves de API."

## Build da imagem de produção
build:
	docker compose build

## Sobe em produção (http://localhost:3001)
up: setup
	docker compose up -d --build
	@echo ""
	@echo "🛂  H-2 Visa Scanner rodando em: http://localhost:3001"
	@echo "📋  Logs: make logs"

## Para os containers
down:
	docker compose down

## Modo desenvolvimento com hot-reload (frontend :3000, backend :3001)
dev: setup
	docker compose --profile dev up --build

## Exibe logs em tempo real
logs:
	docker compose logs -f app

## Reinicia o container de produção
restart:
	docker compose restart app

## Remove containers, imagens e volumes
clean:
	docker compose down --rmi all --volumes --remove-orphans
	@echo "🧹  Ambiente limpo."

## Ajuda
help:
	@echo ""
	@echo "  H-2 Visa Scanner Pro — Comandos disponíveis:"
	@echo ""
	@echo "  make setup    Cria o arquivo .env (primeira vez)"
	@echo "  make up       Sobe em modo produção (porta 3001)"
	@echo "  make dev      Sobe em modo desenvolvimento (hot reload)"
	@echo "  make down     Para todos os containers"
	@echo "  make logs     Exibe logs ao vivo"
	@echo "  make restart  Reinicia o servidor"
	@echo "  make clean    Remove tudo (containers + imagens)"
	@echo ""
