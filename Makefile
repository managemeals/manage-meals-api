.PHONY: default
default:
	echo default

.PHONY: build
build:
	docker compose build

.PHONY: up
up:
	docker compose up

.PHONY: down
down:
	docker compose down

.PHONY: clean
clean:
	docker compose down -v

.PHONY: restart
restart: down build up

.PHONY: recreate
recreate: clean build up
