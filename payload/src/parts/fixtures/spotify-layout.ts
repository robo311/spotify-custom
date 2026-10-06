// Test fixture: Spotify 1.3.3's layout skeleton, trimmed from the live DOM to the hooks the parts module uses
// (hashed classes kept only where they show what we must NOT depend on). No personal data.
export const SPOTIFY_LAYOUT_HTML = `
<div data-testid="root">
  <div class="zXqmJUq4Orp0Adt90GGA">
    <div id="global-nav-bar" data-testid="global-nav-bar">
      <div><div>
        <div></div>
        <div>
          <button data-testid="top-bar-back-button" data-encore-id="buttonTertiary"></button>
          <button data-testid="top-bar-forward-button" data-encore-id="buttonTertiary"></button>
        </div>
      </div></div>
      <div><div>
        <button id="home" data-testid="home-button" data-encore-id="buttonTertiary"><span><svg><path d="M1 1"/></svg></span></button>
        <div><form data-encore-id="formInputIcon" role="search">
          <button data-testid="search-icon" data-encore-id="buttonTertiary"><span><svg><path d="M1 1"/></svg></span></button>
          <input data-testid="search-input" data-encore-id="formInput">
        </form></div>
      </div></div>
      <div><div>
        <div>
          <button data-testid="whats-new-feed-button"></button>
          <button data-testid="friend-activity-button"></button>
        </div>
        <button data-testid="user-widget-link"></button>
      </div></div>
    </div>
    <div id="Desktop_LeftSidebar_Id" class="PIP22o58Crv8RXY4wB2o">
      <nav><div data-testid="LayoutResizer__resize-bar"></div></nav>
    </div>
    <div>
      <aside data-testid="now-playing-bar"><div>
        <div data-testid="now-playing-widget">
          <div data-testid="CoverSlotCollapsed__container"><img data-testid="cover-art-image"></div>
          <div data-testid="context-item-info-title"><a id="track-link" data-testid="context-item-link">Track</a></div>
          <div data-testid="context-item-info-quality">Lossless</div>
        </div>
        <div data-testid="player-controls">
          <div data-testid="general-controls">
            <button id="shuffle" data-encore-id="buttonTertiary"><span><svg><path d="M13.151.922a.75.75 0 1 0"/></svg></span></button>
            <button data-testid="control-button-skip-back" data-encore-id="buttonTertiary"><span><svg><path d="M3.3 1a.7.7"/></svg></span></button>
            <button data-testid="control-button-playpause" data-encore-id="buttonPrimary">
              <span class="encore-inverted-light-set"><span><svg><path d="M3 1.713a.7.7 0 0 1 1.05-.607z"/></svg></span></span>
            </button>
            <button data-testid="control-button-skip-forward" data-encore-id="buttonTertiary"><span><svg><path d="M12.7 1a.7.7"/></svg></span></button>
            <button data-testid="control-button-repeat" role="checkbox" aria-checked="false"><span><svg><path d="M0 4.75"/></svg></span></button>
          </div>
          <div data-testid="playback-progressbar"><div data-testid="progress-bar"></div></div>
        </div>
        <button data-testid="lyrics-button"><svg><path d="M1 1"/></svg></button>
        <button data-testid="control-button-queue"><svg><path d="M1 1"/></svg></button>
        <div data-testid="volume-bar">
          <button data-testid="volume-bar-toggle-mute-button"><span><svg><path d="M1 1"/></svg></span></button>
          <div data-testid="progress-bar"></div>
        </div>
        <button data-testid="pip-toggle-button"></button>
        <button data-testid="fullscreen-mode-button"></button>
      </div></aside>
    </div>
    <div id="main-view">
      <main><section data-testid="home-page"><div>
        <section aria-label="Good morning"><div id="shortcut-grid">
          <div id="shortcut" class="qqdeiPoFoM_sPX0pRHsT"><div draggable="true">
            <a href="/playlist/37i9dQZF1F5p3rmiWPIY"><div><div><img data-testid="shortcut-image"></div></div></a>
            <div><a href="/playlist/37i9dQZF1F5p3rmiWPIY"><p id="shortcut-title" data-encore-id="text">Daily Mix</p></a></div>
            <div data-testid="shortcut-background"></div>
          </div></div>
        </div></section>
        <section class="sc-shelf" data-sc-shelf-key="ext:stats" id="stats-shelf"></section>
        <section data-testid="component-shelf">
          <h2 id="shelf-title">Shelf</h2>
          <a data-testid="see-all-link" href="/section/0JQ5DAnM3wGh0gz1MXnukA">Show all</a>
          <button data-encore-id="chip">Music</button>
          <div id="card" data-encore-id="card" role="listitem">
            <div id="card-image" data-testid="card-image"></div>
            <button id="card-play" data-testid="play-button" data-encore-id="buttonPrimary">
              <span class="encore-bright-accent-set"><span><svg><path d="m7.05 3.606 13.49 7.788z"/></svg></span></span>
            </button>
          </div>
        </section>
      </div></section></main>
    </div>
    <div><div><div><aside id="Desktop_PanelContainer_Id"><p id="panel-text">Queue</p>
      <div data-testid="NPV_Panel_OpenDiv"><div data-sc-panel-key="track"></div><div id="npv-credits" data-sc-panel-key="credits"></div></div>
    </aside></div></div></div>
  </div>
</div>
<p id="outside">Not Spotify</p>
`

export function mountSpotifyLayout(): void {
  document.body.innerHTML = SPOTIFY_LAYOUT_HTML
}
