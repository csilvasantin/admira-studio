// Anonymous live presence on HTML documents only; authentication runs unchanged.
export function withPresence(response) {
  if (!String(response.headers.get('content-type') || '').includes('text/html')) return response;
  return new HTMLRewriter().on('head', { element(el) {
    el.append('<script defer src="https://www.admiranext.com/assets/live-presence.js?v=1"></script>', {html:true});
  }}).transform(response);
}
