// Anonymous live presence on HTML documents only; authentication runs unchanged.
export function withPresence(response) {
  if (!String(response.headers.get('content-type') || '').includes('text/html')) return response;
  const headers = new Headers(response.headers);
  const csp = headers.get('content-security-policy');
  if (csp) {
    // Exact script and collector paths; no wildcard or inline-script permission.
    headers.set('content-security-policy', csp
      .replace(/script-src ([^;]+)/, '$& https://www.admiranext.com/assets/live-presence.js')
      .replace(/connect-src ([^;]+)/, '$& https://www.admiranext.com/api/presence'));
    response = new Response(response.body, {status:response.status, statusText:response.statusText, headers});
  }
  return new HTMLRewriter().on('head', { element(el) {
    el.append('<script defer src="https://www.admiranext.com/assets/live-presence.js?v=2"></script>', {html:true});
  }}).transform(response);
}
