#!/bin/sh
# Writes latest.json, the update manifest the helper reads (internal/update/manifest.go).
# Usage: manifest.sh <version> <owner/repo> <mac update zip> <windows setup exe>
set -eu
version=$1 repo=$2 mac=$3 win=$4
base="https://github.com/$repo/releases/download/v$version"
sha() { shasum -a 256 "$1" | cut -d' ' -f1; }
cat <<EOF
{
  "version": "$version",
  "page": "https://github.com/$repo/releases/tag/v$version",
  "assets": {
    "darwin": { "url": "$base/$(basename "$mac")", "sha256": "$(sha "$mac")" },
    "windows": { "url": "$base/$(basename "$win")", "sha256": "$(sha "$win")" }
  }
}
EOF
