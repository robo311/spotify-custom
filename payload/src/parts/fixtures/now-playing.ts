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

// Spotify 1.3.4's Now playing panel (1.3.4.258): rebuilt without test ids on its structure. Under [data-npv-root] the
// scroll content holds the cover slot (the Canvas bleeds out of it, full width) and a details column: the "switch to
// video" row, the title row, a column of cards, then the queue in a wrapper of its own.
export const NOW_PLAYING_134_HTML = `
<aside id="Desktop_PanelContainer_Id"><div data-npv-root="true">
  <div id="npv-header"><button data-testid="more-button" data-encore-id="buttonTertiary"></button></div>
  <div data-overlayscrollbars="host"><div data-overlayscrollbars-viewport="scrollbarHidden">
    <div id="body">
      <div id="cover"><div><div data-canvas-surface="true"><div>
        <div><video></video></div>
        <div aria-hidden="true" id="shade"><div></div><div></div><div></div></div>
      </div></div></div></div>
      <div id="details">
        <div id="switch-row"><div><button id="video-switch"><svg></svg><span data-encore-id="text">Switch to video</span></button></div></div>
        <div id="title-row">
          <div><div id="title"><span><a href="/album/1"><span data-encore-id="text">Song</span></a></span></div><div><a href="/artist/1">Artist</a></div></div>
          <div>
            <button data-encore-id="buttonTertiary"></button>
            <button id="hide-switch" role="switch" aria-checked="false" data-encore-id="buttonTertiary"></button>
            <button id="like" aria-checked="true" data-encore-id="buttonTertiary"></button>
          </div>
        </div>
        <div id="cards">
          <div data-testid="lyrics-npv-section"><div><h2>Lyrics preview</h2></div><div data-testid="lyrics-line"><div>la la</div></div></div>
          <div><div><h2>Related music videos</h2></div><div data-testid="video-card-image"></div></div>
          <div><div data-testid="npv-artist-bio-button"><h2>About the artist</h2><a data-testid="npv-artist-link" href="/artist/1"></a></div></div>
          <section><div><div><h2>Credits</h2></div><div data-encore-id="listRow" role="group"><p data-encore-id="listRowSubtitle" id="listrow-subtitle-spotify:artist:1"></p></div></div></section>
          <div><div><h2>On tour</h2></div><a href="/concert/1">Jakarta</a></div>
          <div id="unknown-134"><h2>Something new</h2></div>
        </div>
        <div id="queue-wrap"><section><div><div><h2>Next in queue</h2></div>
          <div data-encore-id="listRow" role="group"><p data-encore-id="listRowTitle" id="listrow-title-traits-list-row-spotify:track:1"><span>Next</span></p></div>
        </div></section></div>
      </div>
    </div>
  </div></div>
</div></aside>
`

export function mountNowPlaying134(): HTMLElement {
  document.body.innerHTML = `<div data-testid="root">${NOW_PLAYING_134_HTML}</div>`
  const details = document.getElementById('details')
  if (!details) throw new Error('fixture broken')
  return details
}
