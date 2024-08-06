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

.PHONY: pull-infra
pull-infra:
	docker compose \
	-f docker-compose.infra.yaml \
	-f docker-compose.infra.override.yaml \
	pull

.PHONY: restart-infra
restart-infra: stop-infra build-infra up-infra

.PHONY: recreate-infra
recreate-infra: clean-infra build-infra up-infra

# infra and app
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

.PHONY: pull-app
pull-app:
	docker compose \
	-f docker-compose.infra.yaml \
	-f docker-compose.app.yaml \
	-f docker-compose.infra.override.yaml \
	-f docker-compose.app.override.yaml \
	pull

.PHONY: restart-app
restart-app: stop-app build-app up-app

.PHONY: restartd-app
restartd-app: stop-app build-app upd-app

.PHONY: recreate-app
recreate-app: clean-app build-app up-app

# self hosted
.PHONY: build-selfhost
build-selfhost:
	docker compose \
	-f docker-compose.selfhost.yaml \
	-f docker-compose.selfhost.override.yaml \
	build

.PHONY: up-selfhost
up-selfhost:
	docker compose \
	-f docker-compose.selfhost.yaml \
	-f docker-compose.selfhost.override.yaml \
	up

.PHONY: upd-selfhost
upd-selfhost:
	docker compose \
	-f docker-compose.selfhost.yaml \
	-f docker-compose.selfhost.override.yaml \
	up -d

.PHONY: stop-selfhost
stop-selfhost:
	docker compose \
	-f docker-compose.selfhost.yaml \
	-f docker-compose.selfhost.override.yaml \
	stop

.PHONY: clean-selfhost
clean-selfhost:
	docker compose \
	-f docker-compose.selfhost.yaml \
	-f docker-compose.selfhost.override.yaml \
	down -v

.PHONY: pull-selfhost
pull-selfhost:
	docker compose \
	-f docker-compose.selfhost.yaml \
	-f docker-compose.selfhost.override.yaml \
	pull

.PHONY: restart-selfhost
restart-selfhost: stop-selfhost build-selfhost up-selfhost

.PHONY: restartd-selfhost
restartd-selfhost: stop-selfhost build-selfhost upd-selfhost

.PHONY: recreate-selfhost
recreate-selfhost: clean-selfhost build-selfhost up-selfhost
