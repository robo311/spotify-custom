// Test double for Spotify's top bar search box, as it behaves on 1.3.4: focusing the input opens the suggestions
// dropdown; focus moving to another element closes (unmounts) it; focus merely leaving for the page doesn't.
export function mountSpotifySearch(): { input: HTMLInputElement; isOpen: () => boolean } {
  document.body.insertAdjacentHTML('afterbegin', '<div data-testid="global-nav-bar"><form role="search"><input data-testid="search-input"></form></div>')
  const form = document.querySelector('[data-testid="global-nav-bar"] form')
  const input = document.querySelector<HTMLInputElement>('[data-testid="search-input"]')
  if (!form || !input) throw new Error('search box fixture missing')
  const dropdown = () => document.querySelector('[data-testid="search-dropdown"]')
  input.addEventListener('focus', () => {
    if (!dropdown()) form.insertAdjacentHTML('beforeend', '<div data-testid="search-dropdown"></div>')
  })
  input.addEventListener('focusout', e => {
    if (e.relatedTarget) dropdown()?.remove()
  })
  return { input, isOpen: () => dropdown() !== null }
}
