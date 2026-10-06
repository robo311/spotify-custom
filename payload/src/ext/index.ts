// Extensions module: hosts built-in and user extensions behind the documented ExtensionContext API (docs/extensions.md).
import type { ExtensionInfo, Store, UserExtensionFile } from '../types'
import type { HomeController } from '../home'
import { BUILT_IN_EXTENSIONS } from './builtins'
import { createExtensionHost, type ExtensionHost } from './host'

export type { ExtensionHost } from './host'

/** Starts built-in + user extensions according to store settings.extensions; reacts to enable/disable. */
export function startExtensions(opts: {
  store: Store
  home: HomeController
  userFiles: UserExtensionFile[]
  onChange: (list: ExtensionInfo[]) => void
}): ExtensionHost {
  const host = createExtensionHost({ store: opts.store, home: opts.home, onChange: opts.onChange })
  for (const file of opts.userFiles) host.addUserFile(file)
  for (const def of BUILT_IN_EXTENSIONS) host.register(def, true)
  host.sync()
  return host
}
