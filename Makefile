# Entry points for development, checks and release. See CONVENTIONS.md.
PAYLOAD     := payload
HELPER      := helper
EMBED       := $(HELPER)/internal/inject/payload.js

.PHONY: payload dev typecheck lint test check e2e release publish clean

## Build the injected bundle and copy it where the helper embeds it.
payload:
	cd $(PAYLOAD) && npm run build
	cp $(PAYLOAD)/dist/payload.js $(EMBED)

## Live development: rebuild payload on save, helper re-injects into running Spotify.
dev:
	cd $(PAYLOAD) && npx vite build --watch & \
	cd $(HELPER) && go run ./cmd/spotifycustom --dev --payload ../$(PAYLOAD)/dist/payload.js; \
	kill %1

typecheck:
	cd $(PAYLOAD) && npx tsc --noEmit
	$(MAKE) -C $(HELPER) vet

## Helper lint covers both macOS and Windows targets (gofmt, vet, staticcheck).
lint:
	cd $(PAYLOAD) && npx eslint .
	$(MAKE) -C $(HELPER) lint

test:
	cd $(PAYLOAD) && npx vitest run
	$(MAKE) -C $(HELPER) test

## Everything CI would run.
check: typecheck lint test

## Live checks against the real Spotify on this machine (spec §12.2).
e2e: payload
	node e2e/run.mjs

## Mac .dmg + update zip, Windows .exe into dist/ (spec §11). VERSION=x.y.z sets the version. The Windows
## installer is built by CI (Inno Setup runs on Windows); see docs/releasing.md.
release: check payload
	$(MAKE) -C $(HELPER) release OUT=$(abspath dist)

## Publish a release: tags vVERSION and pushes the tag; GitHub Actions builds, tests and publishes it, and
## installed copies offer the update within hours. Usage: make publish VERSION=0.2.0
publish:
	@test -n "$(VERSION)" || (echo "usage: make publish VERSION=x.y.z"; false)
	@echo "$(VERSION)" | grep -Eq "^[0-9]+\.[0-9]+\.[0-9]+$$" || (echo "VERSION must be x.y.z"; false)
	@test -z "$$(git status --porcelain)" || (echo "commit or stash your changes first"; false)
	@test "$$(git branch --show-current)" = main || (echo "publish from main"; false)
	git push origin main
	git tag -a v$(VERSION) -m "Spotify Custom $(VERSION)"
	git push origin v$(VERSION)
	@echo "Release v$(VERSION) is building: https://github.com/robo311/spotify-custom/actions"

clean:
	rm -rf dist $(PAYLOAD)/dist
