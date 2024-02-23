.PHONY: default
default:
	echo default

# infra
.PHONY: build-infra
build-infra:
	docker compose -f docker-compose.infra.yaml -f docker-compose.infra.override.yaml build

.PHONY: up-infra
up-infra:
	docker compose -f docker-compose.infra.yaml -f docker-compose.infra.override.yaml up

.PHONY: down-infra
down-infra:
	docker compose -f docker-compose.infra.yaml -f docker-compose.infra.override.yaml down

.PHONY: clean-infra
clean-infra:
	docker compose -f docker-compose.infra.yaml -f docker-compose.infra.override.yaml down -v

.PHONY: restart-infra
restart-infra: down-infra build-infra up-infra

.PHONY: recreate-infra
recreate-infra: clean-infra build-infra up-infra

# app
.PHONY: build-app
build-app:
	docker compose -f docker-compose.app.yaml build

.PHONY: up-app
up-app:
	docker compose -f docker-compose.app.yaml up

.PHONY: down-app
down-app:
	docker compose -f docker-compose.app.yaml down

.PHONY: clean-app
clean-app:
	docker compose -f docker-compose.app.yaml down -v

.PHONY: restart-app
restart-app: down-app build-app up-app

.PHONY: recreate-app
recreate-app: clean-app build-app up-app
