// Test fixture: Spotify 1.3.3's Home page shelf container, trimmed from the live DOM (titles anonymised).
export const HOME_HTML = `
<div id="main-view"><main>
  <section data-testid="home-page"><div id="shelves">
    <section id="shortcuts"></section>
    <section data-testid="component-shelf" data-shelf="carousel">
      <h2><a href="/section/0JQ5DAnM3wGh0gz1MXnukA">New Music Friday</a></h2>
      <a data-testid="see-all-link" href="/section/0JQ5DAnM3wGh0gz1MXnukA">Show all</a>
    </section>
    <section data-testid="component-shelf" data-shelf="carousel">
      <h2>Recents</h2>
      <a data-testid="see-all-link" href="https://open.spotify.com/recents?x=1">Show all</a>
    </section>
    <section data-testid="component-shelf" data-shelf="shelf">
      <h2>Daily mix</h2>
      <div data-encore-id="card"><a href="/playlist/37i9dQZF1E8abc">Mix</a></div>
    </section>
    <section data-testid="component-shelf" data-shelf="shelf"><h2>Nothing linkable</h2></section>
  </div></section>
</main></div>
`

export function mountHome(): HTMLElement {
  document.body.innerHTML = HOME_HTML
  const container = document.getElementById('shelves')
  if (!container) throw new Error('fixture broken')
  return container
}
