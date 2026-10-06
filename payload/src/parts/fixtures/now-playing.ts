// Test fixture: Spotify 1.3.3's Now playing panel, trimmed from the live DOM (one element per section kind,
// headings anonymised, hashed classes dropped).
export const NOW_PLAYING_HTML = `
<aside id="Desktop_PanelContainer_Id"><div data-testid="NPV_Panel_OpenDiv">
  <div id="track">
    <div><div data-testid="track-visual-enhancement"><a data-testid="context-link" href="/album/1"></a></div></div>
    <div><div data-testid="minimized-track-visual-enhancement"></div><div data-testid="context-item-info-title">Song</div></div>
  </div>
  <div data-testid="lyrics-npv-section" style="--lyrics-color-background: rgba(101, 0, 0, 1);">
    <h2>Lyrics preview</h2><div data-testid="lyrics-line"><div>la la</div></div>
  </div>
  <div><h2>Related music videos</h2><div data-testid="video-card-image"></div></div>
  <div><h2>About the artist</h2><button data-testid="npv-artist-bio-button"></button></div>
  <div><h2>Credits</h2><div data-encore-id="listRow" role="group"></div></div>
  <div><h2>On tour</h2><a href="/concert/4Y6mgQTz3NQcS4SjWYI6Nm">Chicago</a></div>
  <div><h2>Merch</h2><span data-testid="offer-name">Shirt</span></div>
  <div><h2>Next in queue</h2><ul><li role="row"><div data-encore-id="listRow"></div></li></ul></div>
  <div id="unknown"><h2>Something new</h2><p>?</p></div>
</div></aside>
`

export function mountNowPlaying(): HTMLElement {
  document.body.innerHTML = `<div data-testid="root">${NOW_PLAYING_HTML}</div>`
  const container = document.querySelector<HTMLElement>('[data-testid="NPV_Panel_OpenDiv"]')
  if (!container) throw new Error('fixture broken')
  return container
}
