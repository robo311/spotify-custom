# Writing extensions

An extension is a small JavaScript file that adds something of your own to Spotify, such as a custom shelf on Home. It runs
inside Spotify's page with a small, stable API, so you never have to touch Spotify's internals yourself.

The built-in **Listening stats** shelf is an extension written against exactly this API
(`payload/src/ext/stats/`). Read it if you want a full-size example.

## Quick start

1. Open the customisations folder (tray menu → *Open my customisations folder*, or 🎨 → *Advanced*).
2. Create `extensions/hello.js`:

   ```js
   // @name Hello shelf
   // @description Says hi at the top of Home.
   SC.registerExtension({
     id: 'hello',
     name: 'Hello shelf',
     start(ctx) {
       ctx.addHomeShelf({
         id: 'hello',
         title: 'Hello',
         render(el) {
           el.innerHTML = `
             <style>
               p { margin: 0 0 24px; padding: 16px 20px; border-radius: var(--sc-radius);
                   background: var(--sc-elevated); color: var(--sc-text); font: 600 16px var(--sc-font-ui); }
               b { color: var(--sc-accent); }
             </style>
             <p>Hi! This shelf is <b>yours</b>.</p>`
         },
       })
     },
   })
   ```

3. Restart Spotify through the tray (*Restart themed*) so the new file is picked up.
4. In 🎨 → *Extensions*, switch **Hello shelf** on.

User extensions are **off until you switch them on**. The file isn't even run before that, because an extension can do
anything inside Spotify. Only enable files you wrote yourself or trust.

## File format

- One extension per file, in `extensions/<anything>.js`.
- Optional header lines at the very top. The Extensions tab shows them before the file is ever run:
  `// @name …` and `// @description …`. Without them, the name comes from the file name.
- The file calls `SC.registerExtension(definition)` exactly once.

## API

### `SC.registerExtension(definition)`

| Field | Type | |
|---|---|---|
| `id` | `string` | Unique, stable id. |
| `name` | `string` | Shown in the Extensions tab. |
| `description` | `string?` | One line, shown under the name. |
| `start(ctx)` | `(ctx) => void \| (() => void)` | Called when the extension is switched on (and on every Spotify start while it's on). May return a cleanup function, which is called when it's switched off. |

Everything you create through `ctx` (shelves, listeners, subscriptions) is cleaned up automatically when the extension
stops. The cleanup function you return is only for things you created yourself, such as timers or global listeners.

### `ctx.addHomeShelf({ id, title, render })`

Adds a shelf to Home, above Spotify's own shelves. It appears in 🎨 → *Home*, where the user can hide or reorder it like any
other shelf (its key there is `ext:<id>`).

`render(el)` receives an empty element inside a **shadow root**:

- Spotify's CSS doesn't reach it, and your CSS doesn't leak out. Put a `<style>` inside `el`.
- Theme colours and fonts *do* reach it, as CSS variables (see below). That means your shelf follows the user's theme and
  morphs along with Album Mode.
- Return a function to clean up when the shelf is removed.
- Draw your own heading if you want one. The `title` is used in the Home settings list.

### `ctx.navigate(path)` / `ctx.onNavigate(fn)`

In-app navigation through Spotify's own router. Paths look like `/artist/<id>`, `/track/<id>`, `/album/<id>`,
`/playlist/<id>`, `/search`, `/`. `onNavigate(fn)` calls `fn(path)` after every navigation and returns an unsubscribe
function.

A Spotify URI converts to a path like this: `spotify:artist:abc` → `/artist/abc`.

### `ctx.spotify.query(operationName, variables)`

Calls Spotify's **internal** GraphQL API with the user's own session, the same calls the Spotify app makes itself. It resolves
to the response's `data`.

- The result is untyped (`unknown`). Check the shape before using it: Spotify can change it in any update.
- Persisted-query hashes are found automatically in Spotify's code. You only need the operation name and variables.
- It rejects with a `SpotifyQueryError` whose `failure` is `'no-session' | 'unknown-operation' | 'http' | 'graphql'`.
  Always show a friendly fallback.
- To find operation names and variables: run Spotify with DevTools, open the page that shows the data you want, and look
  at the `pathfinder/v2/query` requests.

Verified operation (Spotify 1.3.3):

```js
const data = await ctx.spotify.query('userTopContent', {
  includeTopArtists: true,
  topArtistsInput: { offset: 0, limit: 10, sortBy: 'AFFINITY', timeRange: 'SHORT_TERM' }, // or MID_TERM, LONG_TERM
  includeTopTracks: true,
  topTracksInput: { offset: 0, limit: 10, sortBy: 'AFFINITY', timeRange: 'SHORT_TERM' },
})
// data.me.profile.topArtists.items[i].data → { __typename: 'Artist', uri, profile: { name }, visuals: { avatarImage: { sources } } }
// data.me.profile.topTracks.items[i].data  → { __typename: 'Track', uri, name, artists: { items }, albumOfTrack: { coverArt: { sources } } }
```

### `ctx.settings.get(key)` / `ctx.settings.set(key, value)`

Per-extension saved settings, stored in the user's `settings.json`. Values must be JSON-serialisable. `get` returns
`unknown`, so validate it, because the file may have been edited by hand.

### `ctx.theme.get()` / `ctx.theme.subscribe(fn)`

The active theme (`name`, `palette`, `font`, `radius`, `effects`, …) and a subscription that fires when it changes. You
rarely need it: the CSS variables below already follow the theme.

## CSS variables

Available inside your shelf:

| Variable | Meaning |
|---|---|
| `--sc-background` | App background |
| `--sc-surface` | Panels (sidebar, player bar) |
| `--sc-elevated` | Cards, menus, hover surfaces |
| `--sc-text` / `--sc-text-subdued` | Text, secondary text |
| `--sc-accent` / `--sc-on-accent` | Accent and the text colour drawn on top of it |
| `--sc-border` | Hairlines |
| `--sc-radius` | Corner roundness |
| `--sc-font-ui` / `--sc-font-mono` | UI font and monospace font |

## When things go wrong

- If `start`, a shelf's `render` or any callback throws, **only your extension stops**. The error appears in
  🎨 → *Extensions*, and the full stack trace is in DevTools under `spotify-custom/extensions/<file>`.
- Switching the extension off and on again retries it.
