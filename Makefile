.PHONY: default
default:
	echo default

# infra only
.PHONY: build-infra
build-infra:
	docker compose \
	-f docker-compose.infra.yaml \
	-f docker-compose.infra.override.yaml \
	build

.PHONY: up-infra
up-infra:
	docker compose \
	-f docker-compose.infra.yaml \
	-f docker-compose.infra.override.yaml \
	up

.PHONY: stop-infra
stop-infra:
	docker compose \
	-f docker-compose.infra.yaml \
	-f docker-compose.infra.override.yaml \
	stop

.PHONY: clean-infra
clean-infra:
	docker compose \
	-f docker-compose.infra.yaml \
	-f docker-compose.infra.override.yaml \
	down -v

.PHONY: restart-infra
restart-infra: stop-infra build-infra up-infra

.PHONY: recreate-infra
recreate-infra: clean-infra build-infra up-infra

# everything
.PHONY: build-app
build-app:
	docker compose \
	-f docker-compose.infra.yaml \
	-f docker-compose.app.yaml \
	-f docker-compose.infra.override.yaml \
	-f docker-compose.app.override.yaml \
	build

.PHONY: up-app
up-app:
	docker compose \
	-f docker-compose.infra.yaml \
	-f docker-compose.app.yaml \
	-f docker-compose.infra.override.yaml \
	-f docker-compose.app.override.yaml \
	up

.PHONY: upd-app
upd-app:
	docker compose \
	-f docker-compose.infra.yaml \
	-f docker-compose.app.yaml \
	-f docker-compose.infra.override.yaml \
	-f docker-compose.app.override.yaml \
	up -d

.PHONY: stop-app
stop-app:
	docker compose \
	-f docker-compose.infra.yaml \
	-f docker-compose.app.yaml \
	-f docker-compose.infra.override.yaml \
	-f docker-compose.app.override.yaml \
	stop

.PHONY: clean-app
clean-app:
	docker compose \
	-f docker-compose.infra.yaml \
	-f docker-compose.app.yaml \
	-f docker-compose.infra.override.yaml \
	-f docker-compose.app.override.yaml \
	down -v

.PHONY: restart-app
restart-app: stop-app build-app up-app

.PHONY: recreate-app
recreate-app: clean-app build-app up-app
