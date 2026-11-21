/* Shared by the extension, Stock and the authenticated media resolver. */
(function () {
  function publicURL(value, base) {
    if (typeof value !== 'string' || !value.trim() || value.length > 4096) return '';
    try {
      const url = new URL(value, base);
      const host = url.hostname.toLowerCase();
      if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.port ||
          !/^(?:[a-z0-9-]+\.)+[a-z][a-z0-9-]*$/.test(host) ||
          /\.(?:local|localhost|internal|lan|home|arpa|onion|test|invalid)$/.test(host)) return '';
      url.hash = '';
      return url.href;
    } catch { return ''; }
  }
  function usesDownloader(value) {
    const url = publicURL(value);
    return !!url && /(^|\.)(?:youtube\.com|youtu\.be|vimeo\.com|twitter\.com|x\.com|tiktok\.com|instagram\.com|linkedin\.com|lnkd\.in|suno\.com|t\.me)$/.test(new URL(url).hostname);
  }
  globalThis.AdmiraMediaLink = Object.freeze({publicURL, usesDownloader});
})();
