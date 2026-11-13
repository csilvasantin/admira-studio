const HOME_PATHS = new Set(['/', '/index.html', '/en', '/en/', '/en/index.html']);

export function studioHomeForGuest(request, response) {
  if (request.method !== 'GET' || response.status !== 302) return null;
  const url = new URL(request.url);
  if (!HOME_PATHS.has(url.pathname)) return null;
  const login = response.headers.get('location');
  if (!login || !login.startsWith('/auth/login?')) return null;

  const english = url.searchParams.get('lang') === 'en'
    || (url.searchParams.get('lang') !== 'es' && url.pathname.startsWith('/en'));
  const copy = english
    ? {lang:'en', signIn:'Sign in', title:'Create content with AI', intro:'Create videos, images, audio and campaigns for your screens.'}
    : {lang:'es', signIn:'Iniciar sesión', title:'Crea contenidos con IA', intro:'Crea vídeos, imágenes, audio y campañas para tus pantallas.'};
  const href = login.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');

  return new Response(`<!doctype html>
<html lang="${copy.lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#020602">
  <title>Admira Studio</title>
  <style>
    *{box-sizing:border-box}
    body{margin:0;background:#020602;color:#e8f2ec;font:16px/1.5 system-ui,sans-serif}
    header{min-height:70px;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px clamp(16px,4vw,42px);border-bottom:1px solid #1a4a22}
    a{color:inherit;text-decoration:none}
    a:focus-visible{outline:2px solid #7dff9a;outline-offset:4px}
    .brand{font-size:1.2rem;font-weight:800}
    .sign-in{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 14px;border:1px solid #699c49;background:#122116;color:#d0ffdc;font-weight:700;white-space:nowrap}
    .sign-in:hover{background:#1b3823}
    main{max-width:72rem;margin:auto;padding:clamp(70px,14vw,185px) clamp(16px,4vw,42px)}
    h1{max-width:14ch;margin:0;font-size:clamp(2.5rem,7vw,6rem);line-height:1.02;letter-spacing:-.05em}
    p{max-width:38ch;margin:24px 0 0;color:#b3c6b9;font-size:clamp(1rem,2vw,1.3rem)}
  </style>
</head>
<body>
  <header>
    <a class="brand" href="${english ? '/en/' : '/'}">Admira Studio</a>
    <a class="sign-in" href="${href}"><span aria-hidden="true">↪</span>${copy.signIn}</a>
  </header>
  <main><h1>${copy.title}</h1><p>${copy.intro}</p></main>
</body>
</html>`, {headers:{
    'content-type':'text/html; charset=utf-8',
    'cache-control':'private, no-store',
    'x-robots-tag':'noindex, nofollow',
    'referrer-policy':'no-referrer'
  }});
}
