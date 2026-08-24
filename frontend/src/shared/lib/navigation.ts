export function navigate(path: string) {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))

  if (!navigator.userAgent.includes('jsdom')) {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}
