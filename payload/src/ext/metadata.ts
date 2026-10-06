// Reads optional `// @name` / `// @description` header lines from a user extension file, so the Extensions tab can
// show a friendly name before the (disabled-by-default) code is ever evaluated.

export interface ExtensionMetadata {
  name?: string
  description?: string
}

const HEADER_TAG = /^\s*\/\/\s*@(name|description)\s+(.+?)\s*$/

/** Pure: scans the leading comment block only (stops at the first non-comment, non-blank line). */
export function parseExtensionMetadata(source: string): ExtensionMetadata {
  const metadata: ExtensionMetadata = {}
  for (const line of source.split(/\r?\n/)) {
    if (line.trim() === '') continue
    if (!line.trimStart().startsWith('//')) break
    const match = HEADER_TAG.exec(line)
    if (match?.[1] === 'name') metadata.name = match[2]
    if (match?.[1] === 'description') metadata.description = match[2]
  }
  return metadata
}

/** "my-cool_thing.js" → "My cool thing" */
export function nameFromFile(file: string): string {
  const base = file.replace(/\.js$/i, '').replace(/[-_]+/g, ' ').trim()
  return base ? base.charAt(0).toUpperCase() + base.slice(1) : file
}
