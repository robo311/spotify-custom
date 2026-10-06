# Helper build, checks and packaging. Called from the root Makefile; see CONVENTIONS.md.
VERSION     ?= 0.1.0
OUT         ?= $(abspath ../dist)
BUILD       := $(OUT)/.build
APP         := $(OUT)/SpotifyCustom.app
LDFLAGS     := -s -w -X main.version=$(VERSION)
PKG         := ./cmd/spotifycustom
TOOLS       := $(abspath .tools)
STATICCHECK := $(TOOLS)/staticcheck
WINRES      := go run github.com/tc-hib/go-winres@latest

.PHONY: build test lint vet icons release release-mac release-dmg release-windows live-test chrome-test

build:
	go build -o $(BUILD)/spotifycustom $(PKG)

test:
	go test -race ./...

vet:
	go vet ./...
	GOOS=windows CGO_ENABLED=0 go vet ./...

lint: vet $(STATICCHECK)
	@test -z "$$(gofmt -l .)" || (echo "gofmt needed:"; gofmt -l .; false)
	$(STATICCHECK) ./...
	GOOS=windows CGO_ENABLED=0 $(STATICCHECK) ./...

# Built for the host so it can analyse other GOOS targets.
$(STATICCHECK):
	GOBIN=$(TOOLS) go install honnef.co/go/tools/cmd/staticcheck@latest

## Read-only checks against the running Spotify (needs --remote-debugging-port, SC_PORT default 9222).
live-test:
	go test -tags live -run Live -v ./internal/cdp ./internal/spotify

## Reload regression against a real headless Chrome (CHROME=… to override; SC_PAYLOAD=… for the real bundle).
chrome-test:
	SC_PAYLOAD=$(if $(SC_PAYLOAD),$(abspath $(SC_PAYLOAD))) go test -tags chrome -count=1 -run Chrome -v ./internal/inject

## Regenerate app + tray icons from vectors (tools/mkicon).
icons:
	go run ./tools/mkicon -assets assets -tray internal/tray/assets

release: release-mac release-dmg release-windows
	rm -rf $(BUILD)
	@echo "artefacts in $(OUT)"

## Universal (arm64 + x86_64) menu bar app, ad-hoc signed, zipped.
release-mac:
	mkdir -p $(BUILD)
	CGO_ENABLED=1 GOOS=darwin GOARCH=arm64 go build -trimpath -ldflags "$(LDFLAGS)" -o $(BUILD)/sc-arm64 $(PKG)
	CGO_ENABLED=1 GOOS=darwin GOARCH=amd64 go build -trimpath -ldflags "$(LDFLAGS)" -o $(BUILD)/sc-amd64 $(PKG)
	lipo -create -output $(BUILD)/SpotifyCustom $(BUILD)/sc-arm64 $(BUILD)/sc-amd64
	rm -rf $(APP)
	mkdir -p $(APP)/Contents/MacOS $(APP)/Contents/Resources
	cp $(BUILD)/SpotifyCustom $(APP)/Contents/MacOS/SpotifyCustom
	sed 's/__VERSION__/$(VERSION)/g' packaging/darwin/Info.plist > $(APP)/Contents/Info.plist
	iconutil -c icns assets/AppIcon.iconset -o $(APP)/Contents/Resources/AppIcon.icns
	codesign --force --deep --sign - $(APP)
	rm -f $(OUT)/SpotifyCustom-mac.zip
	cd $(OUT) && ditto -c -k --keepParent SpotifyCustom.app SpotifyCustom-mac.zip

## First-install disk image: the app next to an Applications shortcut. (The zip above is what updates download.)
release-dmg: release-mac
	rm -rf $(BUILD)/dmg $(OUT)/SpotifyCustom.dmg
	mkdir -p $(BUILD)/dmg
	ditto $(APP) $(BUILD)/dmg/SpotifyCustom.app
	ln -s /Applications $(BUILD)/dmg/Applications
	hdiutil create -volname "Spotify Custom" -srcfolder $(BUILD)/dmg -format UDZO -o $(OUT)/SpotifyCustom.dmg

## Single GUI-subsystem .exe with embedded icon and version info.
release-windows:
	mkdir -p $(BUILD)
	cd cmd/spotifycustom && $(WINRES) simply --arch amd64 --icon ../../assets/icon-512.png --manifest gui \
		--product-name "Spotify Custom" --file-description "Spotify Custom" \
		--product-version $(VERSION) --file-version $(VERSION)
	GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags "$(LDFLAGS) -H windowsgui" -o $(OUT)/SpotifyCustom.exe $(PKG); \
		status=$$?; rm -f cmd/spotifycustom/rsrc_windows_*.syso; exit $$status
