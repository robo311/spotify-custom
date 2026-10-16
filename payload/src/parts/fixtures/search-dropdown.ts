// The top bar's search suggestions, trimmed from Spotify 1.3.4's live DOM (hashed classes, SVG paths and localised
// labels dropped): the keyboard hint bar, a search term, a song and an artist.
export const SEARCH_DROPDOWN_DOM = `
<div data-testid="global-nav-bar"><form role="search">
  <input data-testid="search-input" role="combobox" type="search">
  <div><div><div id="search-dropdown" role="listbox" data-testid="search-dropdown">
    <div data-overlayscrollbars-initialize="true" data-overlayscrollbars="host" id="panel"><div data-overlayscrollbars-viewport="scrollbarHidden">
      <div id="hints" aria-label="Use the arrow keys"><div><span data-encore-id="text">Navigate</span></div><div><span data-encore-id="text">Search</span></div></div>
      <ul role="grid" data-encore-id="typeList">
        <div data-encore-id="listRow" role="row" id="term-row">
          <div data-testid="mouse-only-link"></div>
          <div><div><a aria-hidden="true" tabindex="-1" href="/search/endless%20love"><div id="term-image" style="width: 48px; height: 48px;"><div>
            <svg data-encore-id="icon" data-testid="autocomplete" id="term-icon" viewBox="0 0 24 24"></svg>
          </div></div></a></div></div>
          <div><div><div role="gridcell"><a href="/search/endless%20love" tabindex="-1"><p data-encore-id="listRowTitle"><span><span data-encore-id="text" id="term-title">endless love</span></span></p></a></div></div></div>
        </div>
        <div data-encore-id="listRow" role="row" id="song-row">
          <div data-testid="mouse-only-link"></div>
          <div><div><div><div id="song-image" style="width: 48px; height: 48px;"><img data-testid="entity-image" alt=""></div>
            <div role="gridcell"><button data-encore-id="buttonTertiary" tabindex="-1"></button></div></div></div></div>
          <div><div><div role="gridcell"><a href="/track/54E6zLaoW4ofXKaXhLVu3G" tabindex="-1"><span><span data-encore-id="listRowTitle">Andless</span></span></a></div>
            <p data-encore-id="listRowSubtitle"><span id="song-subtitle"><span id="song-type"><span></span><span>Song</span></span> • <span id="song-artist"><a href="/artist/5Z71xE9prhpHrqL5thVMyK">tripleS</a></span></span></p></div></div>
        </div>
        <div data-encore-id="listRow" role="row" id="artist-row">
          <div data-testid="mouse-only-link"></div>
          <div><div><a href="/artist/4t4QytdT3mhrRgKue8Q0GK" tabindex="-1"><span data-encore-id="listRowTitle">ENDLESS</span></a></div>
            <p data-encore-id="listRowSubtitle"><span><span id="artist-type"><span></span><span>Artist</span></span></span></p></div>
        </div>
      </ul>
    </div></div>
  </div></div></div>
</form></div>`
