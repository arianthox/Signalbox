SHELL := /bin/zsh
NODE_BIN := $(HOME)/.nvm/versions/node/v22.21.1/bin
NPM := PATH="$(NODE_BIN):$(PATH)" npm

.PHONY: help install dev dev-electron test typecheck build lint package verify clean

help:
	@printf "Signalbox tasks:\n"
	@printf "  make install       Install npm dependencies\n"
	@printf "  make dev           Start the Vite renderer dev server\n"
	@printf "  make dev-electron  Start the Electron app in development mode\n"
	@printf "  make test          Run unit tests\n"
	@printf "  make typecheck     Run TypeScript checks\n"
	@printf "  make build         Build renderer and Electron main/preload code\n"
	@printf "  make lint          Run ESLint\n"
	@printf "  make package       Build and package the desktop app\n"
	@printf "  make verify        Run test, typecheck, and build\n"
	@printf "  make clean         Remove generated build artifacts\n"

install:
	$(NPM) install

dev:
	$(NPM) run dev

dev-electron:
	$(NPM) run dev:electron

test:
	$(NPM) test

typecheck:
	$(NPM) run typecheck

build:
	$(NPM) run build

lint:
	$(NPM) run lint

package:
	$(NPM) run package

verify: test typecheck build

clean:
	rm -rf dist dist-electron release coverage
