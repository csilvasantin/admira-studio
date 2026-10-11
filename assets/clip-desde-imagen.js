(function () {
  var root = document.getElementById('clip-desde-imagen');
  if (!root) return;
  var status = document.getElementById('clip-status');
  var out = document.getElementById('clip-out');
  function T(es,en) { return document.documentElement.lang.toLowerCase().startsWith('en') ? en : es; }
  function say(text) { if (status) status.textContent = text; }

  async function headers() {
    var h = { 'Content-Type': 'application/json' };
    var r = await fetch('/auth/api-token', { credentials: 'include', cache: 'no-store', headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error(T('hace falta la sesión de Admira Studio','An Admira Studio session is required'));
    var data = await r.json();
    if (!data.token) throw new Error(T('sesión sin token','The session has no API token'));
    h.Authorization = 'Bearer ' + data.token;
    return h;
  }

  function fileToDataUrl(file) {
    return new Promise(function (resolve, reject) {
      if (!file) return resolve('');
      var reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result || '')); };
      reader.onerror = function () { reject(new Error(T('no se pudo leer la imagen','Could not read the image'))); };
      reader.readAsDataURL(file);
    });
  }

  async function startOne(h, prompt, image, stockId) {
    var {finalArtworkPrompt} = await import('/assets/final-artwork.mjs?v=artwork-1');
    prompt = finalArtworkPrompt(prompt, {video:true});
    var body = { prompt: prompt, duration: 5, aspect_ratio: '16:9', resolution: '720p' };
    if (image) body.image = image;
    else body.stock_id = stockId;
    var r = await fetch('https://api.admira.store/xai/video', { method: 'POST', headers: h, body: JSON.stringify(body) });
    var data = await r.json().catch(function () { return {}; });
    if (!r.ok) throw new Error((data && data.error) || ('HTTP ' + r.status));
    return data.request_id;
  }

  async function waitStock(h, requestId) {
    for (var i = 0; i < 60; i++) {
      await new Promise(function (resolve) { setTimeout(resolve, 5000); });
      var r = await fetch('https://api.admira.store/xai/video/' + encodeURIComponent(requestId), { headers: h });
      var data = await r.json().catch(function () { return {}; });
      if (!r.ok) throw new Error((data && data.error) || (T('consulta ','Request ') + r.status));
      if (data.archived && data.url) return data;
      var st = data.status || data.state || '';
      say(T('Generando clip de 5 s · ','Generating a 5 s clip · ') + (st || T('en curso','in progress')) + ' · ' + ((i + 1) * 5) + 's');
      if (st === 'failed' || st === 'expired' || st === 'error') throw new Error(T('el proveedor no completó el clip','The provider did not complete the clip'));
    }
    throw new Error(T('el clip no llegó a la biblioteca en 5 min','The clip did not reach the library within 5 min'));
  }

  function show(url) {
    if (!out) return;
    out.hidden = false;
    out.innerHTML = '<video controls src="' + url.replace(/"/g, '') + '" style="width:100%;max-height:360px"></video><p><a href="' + url.replace(/"/g, '') + '">' + T('Pieza en la biblioteca','Item in the library') + '</a></p>';
  }

  var one = document.getElementById('clip-one');
  if (one) one.addEventListener('click', async function () {
    try {
      var prompt = (document.getElementById('clip-prompt').value || '').trim();
      var stockId = (document.getElementById('clip-stock').value || '').trim();
      var file = document.getElementById('clip-file').files[0];
      if (!prompt) return say(T('Escribe qué debe hacer la imagen.','Describe how the image should move.'));
      if (!file && !stockId) return say(T('Sube una imagen o indica un id del Stock.','Upload an image or enter a Stock ID.'));
      say(T('Pidiendo el clip de 5 s…','Requesting the 5 s clip…'));
      var h = await headers();
      var image = file ? await fileToDataUrl(file) : '';
      var id = await startOne(h, prompt, image, stockId);
      var saved = await waitStock(h, id);
      say(T('Guardado en la biblioteca.','Saved in the library.'));
      show(saved.url);
    } catch (e) {
      say(e.message || String(e));
    }
  });

  var batch = document.getElementById('clip-batch');
  if (batch) batch.addEventListener('click', async function () {
    try {
      var lines = (document.getElementById('clip-scenes').value || '').split('\n').map(function (l) { return l.trim(); }).filter(Boolean).slice(0, 6);
      var file = document.getElementById('clip-file').files[0];
      var shared = file ? await fileToDataUrl(file) : '';
      if (!lines.length) return say(T('Escribe de 1 a 6 escenas, una por línea.','Write 1 to 6 scenes, one per line.'));
      var {finalArtworkPrompt} = await import('/assets/final-artwork.mjs?v=artwork-1');
      var scenes = lines.map(function (line) {
        var parts = line.split('||');
        var text = parts[0].trim();
        var stock = (parts[1] || '').trim() || (document.getElementById('clip-stock').value || '').trim();
        var scene = { text: finalArtworkPrompt(text, {video:true}), duration: 5 };
        if (shared && !parts[1]) scene.image = shared;
        else scene.stock_id = stock;
        return scene;
      });
      say(T('Arrancando ','Starting ') + scenes.length + T(' clips de 5 s…',' 5 s clips…'));
      var h = await headers();
      var r = await fetch('https://api.admira.store/xai/video/scenes', { method: 'POST', headers: h, body: JSON.stringify({ scenes: scenes, aspect_ratio: '16:9' }) });
      var data = await r.json().catch(function () { return {}; });
      if (!r.ok) throw new Error((data && data.error) || ('HTTP ' + r.status));
      var saved = [];
      for (var i = 0; i < data.scenes.length; i++) {
        say(T('Escena ','Scene ') + (i + 1) + T(' de ',' of ') + data.scenes.length);
        saved.push(await waitStock(h, data.scenes[i].request_id));
      }
      say(saved.length + T(' clips en la biblioteca.',' clips in the library.'));
      if (saved[0]) show(saved[0].url);
    } catch (e) {
      say(e.message || String(e));
    }
  });
})();
