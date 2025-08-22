// electron/electron.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');

/* ============================ Utils log ============================ */
const LOG_PATH = path.join(app.getPath('documents'), 'gestion-factures-log.txt');
function safeLog(...args) {
  const line = `[${new Date().toISOString()}] ${args.join(' ')}\n`;
  try { fs.appendFileSync(LOG_PATH, line); } catch {}
  console.log(...args);
}

/* ============================ Flags/paths ============================ */
const IS_DEV = !app.isPackaged;
const API_PORT = Number(process.env.API_PORT || process.env.PORT || 4000);

/* ============================ Dossiers Documents/gestion ============================ */
const ROOT_GESTION = path.join(app.getPath('documents'), 'gestion');
const DIRS_TO_CREATE = [
  ROOT_GESTION,
  path.join(ROOT_GESTION, 'devis'),
  path.join(ROOT_GESTION, 'facture'),
  path.join(ROOT_GESTION, 'facture', 'facture_cacher'),
];
function ensureGestionFolders() {
  for (const d of DIRS_TO_CREATE) {
    try { fs.mkdirSync(d, { recursive: true }); } catch {}
  }
}
function sanitizeName(n) { return String(n || '').replace(/[^a-zA-Z0-9._-]/g, '_'); }
function makeTargetPath(type, fileName) {
  let sub = 'facture';
  if (type === 'facture-cachee' || type === 'facture_cacher') sub = path.join('facture', 'facture_cacher');
  if (type === 'devis') sub = 'devis';
  const dir = path.join(ROOT_GESTION, sub);
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, sanitizeName(fileName || 'document.pdf'));
}

/* ============================ Frontend (prod) ============================ */
function getProdIndexHtml() {
  const inAsar = path.join(process.resourcesPath, 'app.asar', 'frontend', 'dist', 'index.html');
  if (fs.existsSync(inAsar)) return inAsar;
  const inApp = path.join(process.resourcesPath, 'app', 'frontend', 'dist', 'index.html');
  if (fs.existsSync(inApp)) return inApp;
  const local = path.join(__dirname, '..', 'frontend', 'dist', 'index.html');
  if (fs.existsSync(local)) return local;
  return null;
}

/* ============================ Backend spawn robuste ============================ */
function backendEntryPath() {
  const base = process.resourcesPath;
  const cands = [
    path.join(base, 'backend', 'index.js'),
    path.join(base, 'backend', 'server.js'),
    path.join(base, 'app.asar', 'backend', 'index.js'),
    path.join(base, 'app.asar', 'backend', 'server.js'),
    path.join(base, 'app', 'backend', 'index.js'),
    path.join(base, 'app', 'backend', 'server.js'),
    path.join(__dirname, '..', 'backend', 'index.js'),
    path.join(__dirname, '..', 'backend', 'server.js'),
  ];
  for (const p of cands) { if (fs.existsSync(p)) return p; }
  return null;
}

let backendProc = null;
function waitForBackendReady(port, timeoutMs = 15000, intervalMs = 300) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get({ hostname: '127.0.0.1', port, path: '/health', timeout: 1500 }, (res) => {
        res.resume(); resolve();
      });
      req.on('error', () => {
        if (Date.now() - start > timeoutMs) return reject(new Error('backend timeout'));
        setTimeout(tick, intervalMs);
      });
      req.end();
    };
    tick();
  });
}
function startBackend() {
  safeLog('[Electron] → startBackend');
  const entry = backendEntryPath();
  safeLog('[Electron] backendEntryPath =', entry);
  if (!entry) { safeLog('[Electron][WARN] Pas d’entrée backend'); return; }

  const env = {
    ...process.env,
    PORT: String(API_PORT),
    API_PORT: String(API_PORT),
    ELECTRON_RUN_AS_NODE: '1',
  };
  delete env.NODE_OPTIONS;

  const cwd = path.dirname(entry);
  const backendLogPath = path.join(app.getPath('documents'), 'gestion-factures-backend.log');
  const backendLog = fs.createWriteStream(backendLogPath, { flags: 'a' });

  backendProc = spawn(process.execPath, [entry], {
    cwd,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false,
    windowsHide: true
  });

  backendProc.stdout.on('data', d => backendLog.write(d));
  backendProc.stderr.on('data', d => backendLog.write(d));
  backendProc.on('exit', (code, signal) => {
    backendLog.write(Buffer.from(`\n[backend exit] code=${code} signal=${signal}\n`));
    safeLog('[Electron] backend exit code=', code, 'signal=', signal);
  });
}

/* ============================ Window ============================ */
let mainWin = null;
async function createWindow() {
  safeLog('[Electron] → createWindow');
  ensureGestionFolders();

  if (!IS_DEV) {
    startBackend();
    try {
      await waitForBackendReady(API_PORT, 15000, 250);
      safeLog('[Electron] Backend prêt sur http://localhost:' + API_PORT);
    } catch {
      safeLog('[Electron][WARN] Backend non joignable après délai');
    }
  }

  mainWin = new BrowserWindow({
    width: 1280,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  });

  if (IS_DEV) {
    // Assure-toi de lancer ton Vite: http://localhost:5173
    mainWin.loadURL('http://localhost:5173');
  } else {
    const indexPath = getProdIndexHtml();
    safeLog('[Electron] PROD index ->', indexPath, 'exists?', !!indexPath && fs.existsSync(indexPath));
    if (indexPath) mainWin.loadFile(indexPath);
    else mainWin.loadURL('data:text/html,<h1>Frontend introuvable</h1>');
  }
}

/* ============================ App lifecycle ============================ */
app.whenReady().then(() => {
  safeLog('[Electron] → app.whenReady');
  const gotLock = app.requestSingleInstanceLock();
  if (!gotLock) return app.quit();

  app.on('second-instance', () => {
    if (mainWin) { if (mainWin.isMinimized()) mainWin.restore(); mainWin.focus(); }
  });

  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', () => {
  if (backendProc && !backendProc.killed) { try { backendProc.kill(); } catch {} }
});

/* ============================ PDF helpers (utilitaires) ============================ */
function ensureMeta(html) {
  let out = String(html || '');
  if (!/<!doctype/i.test(out)) out = '<!doctype html>\n' + out;
  if (!/<head>/i.test(out)) out = out.replace(/<html[^>]*>/i, '$&\n<head></head>');
  out = out.replace(/<head>/i, '<head><meta charset="utf-8">');
  return out;
}
function embedLogo(html, logoPath) {
  let out = String(html || '');
  if (!logoPath && !/{{LOGO_SRC}}/.test(out)) return out;
  try {
    let dataUrl = '';
    if (logoPath && fs.existsSync(logoPath)) {
      const ext = path.extname(logoPath).toLowerCase();
      const mime = (ext === '.jpg' || ext === '.jpeg') ? 'image/jpeg' : 'image/png';
      const b64 = fs.readFileSync(logoPath, 'base64');
      dataUrl = `data:${mime};base64,${b64}`;
    }
    out = out.replace(/{{LOGO_SRC}}/g, dataUrl || '');
    return out;
  } catch { return html; }
}
async function htmlToPdfBuffer(html) {
  const win = new BrowserWindow({ show: false, webPreferences: { offscreen: true } });
  try {
    await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    await win.webContents.executeJavaScript(`
      new Promise(r => (document.readyState==='complete' ? r() : addEventListener('load', () => r(), {once:true})))
        .then(() => (document.fonts ? document.fonts.ready : Promise.resolve()));
    `);
    await new Promise(r => setTimeout(r, 150));
    return await win.webContents.printToPDF({
      pageSize: 'A4',
      printBackground: true,
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      landscape: false,
    });
  } finally {
    if (!win.isDestroyed()) win.close();
  }
}
function eur(n) {
  const v = Number(n || 0);
  return v.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

/* ============================ Template facture ============================ */
function renderInvoiceHTML(data) {
  const type = (data?.type || 'facture').toLowerCase();
  const isCachee = type.includes('cache');
  const title = isCachee ? `FACTURE CACHÉE N° ${data?.numero || ''}` :
                (type === 'devis' ? `DEVIS N° ${data?.numero || ''}` :
                 `FACTURE N° ${data?.numero || ''}`);

  const lignes = Array.isArray(data?.lignes) ? data.lignes : [];
  let totalHT = 0, totalTVA = 0;
  for (const l of lignes) {
    const ht = Number(l.qte || 0) * Number(l.pu_ht || 0);
    const tva = ht * (Number(l.tvaPct || 0) / 100);
    totalHT += ht; totalTVA += tva;
  }
  const remise = Number(data?.remise || 0);
  totalHT = Math.max(0, totalHT - remise);
  const totalTTC = totalHT + totalTVA;

  const css = `
  *{box-sizing:border-box} body{font-family:Segoe UI,Arial,Helvetica,sans-serif;color:#222;margin:28px}
  .row{display:flex;gap:24px;align-items:flex-start}
  .logo{height:60px;object-fit:contain}
  .societe h2{color:#d1182b;margin:0 0 6px 0;font-size:20px}
  .top{justify-content:space-between}
  .badge{color:#d1182b;font-weight:700;font-size:18px;text-transform:uppercase}
  .date{color:#666;margin-top:4px}
  .card{border-radius:10px;border:2px solid #e0ecff;background:#f5f9ff;padding:14px 16px}
  .card .lbl{color:#0b59d0;font-weight:600}
  table{width:100%;border-collapse:collapse;margin-top:16px}
  thead th{background:#0b59d0;color:#fff;padding:10px;border-right:2px solid #fff;font-weight:600}
  tbody td{padding:10px;border-bottom:1px solid #e9eef7}
  .right{text-align:right}
  .totals{display:flex;justify-content:flex-end;margin-top:10px}
  .totals .box{width:340px}
  .totalRow{display:flex;justify-content:space-between;padding:6px 0}
  .grand{background:#0b59d0;color:#fff;border-radius:8px;padding:10px 16px;margin-top:10px;font-weight:700}
  footer{position:fixed;left:28px;right:28px;bottom:18px;font-size:12px;color:#555;text-align:center}
  footer .bar{height:4px;background:#d1182b;border-radius:2px;margin-top:12px}
  `;

  const rows = lignes.length ? lignes.map(l => `
    <tr>
      <td>${l.libelle || '-'}</td>
      <td class="right">${Number(l.qte || 0)}</td>
      <td class="right">${eur(l.pu_ht || 0)}</td>
      <td class="right">${Number(l.tvaPct || 0)} %</td>
      <td class="right">${eur((Number(l.qte||0)*Number(l.pu_ht||0)))}</td>
    </tr>`).join('') :
    `<tr><td>-</td><td class="right">1</td><td class="right">0,00 €</td><td class="right">20 %</td><td class="right">0,00 €</td></tr>`;

  return `
  <!doctype html>
  <html><head><meta charset="utf-8"><style>${css}</style></head>
  <body>
    <div class="row top">
      <div class="row" style="gap:16px">
        <img src="{{LOGO_SRC}}" class="logo" alt="Logo">
        <div class="societe">
          <h2>${data?.societe?.nom || ''}</h2>
          <div>${data?.societe?.addr1 || ''}</div>
          <div>${data?.societe?.addr2 || ''}</div>
          ${data?.societe?.tva ? `<div>${data.societe.tva}</div>` : ''}
          ${data?.societe?.tel ? `<div>Tél : ${data.societe.tel}</div>` : ''}
          ${data?.societe?.email ? `<div>${data.societe.email}</div>` : ''}
        </div>
      </div>
      <div style="text-align:right">
        <div class="badge">${title}</div>
        <div class="date">Date : ${data?.date || ''}</div>
      </div>
    </div>

    <div class="card" style="margin:18px 0 6px 0">
      <div class="row" style="gap:60px">
        <div><div class="lbl">Nom du client :</div> ${data?.client?.nom || '-'}</div>
        <div><div class="lbl">Adresse :</div> ${data?.client?.adresse || '-'}</div>
        <div><div class="lbl">Ville/Code postal :</div> ${data?.client?.ville || '-'}</div>
        <div><div class="lbl">Téléphone :</div> ${data?.client?.tel || '-'}</div>
        <div><div class="lbl">Immatriculation :</div> ${data?.client?.immat || '-'}</div>
        <div><div class="lbl">Kilométrage :</div> ${data?.client?.km || '-'}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th> Désignation </th>
          <th class="right"> Quantité </th>
          <th class="right"> PU HT </th>
          <th class="right"> TVA </th>
          <th class="right"> Total HT </th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="totals">
      <div class="box">
        ${data?.paiement?.conditions ? `<div>Conditions de paiement : ${data.paiement.conditions}</div>` : ''}
        ${data?.paiement?.methodes ? `<div>Méthodes de paiement : ${data.paiement.methodes}</div>` : ''}
        ${Number(data?.remise || 0) ? `<div class="totalRow"><span>Remise</span><span>-${eur(data.remise)}</span></div>` : ''}
        <div class="totalRow"><span>Total H.T</span><span>${eur(totalHT)}</span></div>
        <div class="totalRow"><span>T.V.A</span><span>${eur(totalTVA)}</span></div>
        <div class="grand row" style="justify-content:space-between">
          <span>TOTAL T.T.C</span><span>${eur(totalTTC)}</span>
        </div>
      </div>
    </div>

    <footer>
      <div>Nous vous remercions pour votre confiance</div>
      ${data?.societe?.footer ? `<div>${data.societe.footer}</div>` : ''}
      <div class="bar"></div>
    </footer>
  </body></html>
  `;
}

/* ============================ Fenêtre d’aperçu PDF ============================ */
function createPdfWindow(absPdfPath) {
  const win = new BrowserWindow({
    width: 1100,
    height: 800,
    title: 'Aperçu PDF',
    show: false,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    }
  });
  win.loadURL('file://' + absPdfPath); // Chromium sait lire un PDF
  win.once('ready-to-show', () => win.show());
  return win;
}

/* ============================ IPC: PDF / Fichiers ============================ */
// ouvrir un fichier enregistré (pratique pour debug)
ipcMain.handle('open-path', async (_e, absPath) => {
  try { const { shell } = require('electron'); await shell.openPath(absPath); return { ok: true }; }
  catch (e) { return { ok: false, error: e?.message || String(e) }; }
});

// Enregistrer HTML → PDF dans Documents/gestion/...
ipcMain.handle('pdf:save-html', async (_e, { type, fileName, html, logoPath }) => {
  try {
    const final = embedLogo(ensureMeta(html), logoPath);
    const buf = await htmlToPdfBuffer(final);
    const out = makeTargetPath(type, fileName);
    fs.writeFileSync(out, buf);
    return { success: true, path: out };
  } catch (err) {
    return { success: false, error: err?.message || String(err) };
  }
});

// Enregistrer une facture via les données structurées
ipcMain.handle('pdf:save-invoice', async (_e, { data, fileName, logoPath }) => {
  try {
    const type = (data?.type || 'facture').toLowerCase();
    const html = renderInvoiceHTML(data);
    const final = embedLogo(ensureMeta(html), logoPath);
    const buf = await htmlToPdfBuffer(final);
    const out = makeTargetPath(type, fileName || `${type}_001.pdf`);
    fs.writeFileSync(out, buf);
    return { success: true, path: out };
  } catch (err) {
    return { success: false, error: err?.message || String(err) };
  }
});

// Compat anciens noms
ipcMain.handle('save-html-as-pdf', async (_e, payload) => ipcMain.emit('pdf:save-html', _e, payload) || (await ipcMain._events['pdf:save-html'][0](_e, payload)));
ipcMain.handle('save-pdf', async (event, { type, fileName }) => {
  try {
    const pdfBuf = await event.sender.printToPDF({
      pageSize: 'A4',
      printBackground: true,
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      landscape: false,
    });
    const out = makeTargetPath(type, fileName);
    fs.writeFileSync(out, pdfBuf);
    return { success: true, path: out };
  } catch (err) {
    return { success: false, error: err?.message || String(err) };
  }
});

// === NOUVEAU : ouvrir un PDF dans une fenêtre ===
ipcMain.handle('pdf:openFromFile', async (_evt, absPath) => {
  if (!absPath) throw new Error('pdf:openFromFile -> chemin vide');
  const full = path.resolve(absPath);
  createPdfWindow(full);
  return { ok: true, path: full };
});

ipcMain.handle('pdf:openFromBuffer', async (_evt, { buffer, suggestedName }) => {
  if (!buffer) throw new Error('pdf:openFromBuffer -> buffer manquant');
  const tmpDir = app.getPath('temp');
  const name = (suggestedName && suggestedName.endsWith('.pdf')) ? suggestedName : `preview_${Date.now()}.pdf`;
  const out = path.join(tmpDir, name);
  const nodeBuf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  fs.writeFileSync(out, nodeBuf);
  createPdfWindow(out);
  return { ok: true, path: out };
});

// (option) reconstruire le chemin selon ta logique Documents/gestion/...
ipcMain.handle('pdf:openSaved', async (_evt, { type, fileName }) => {
  const full = makeTargetPath(type, fileName);
  if (!fs.existsSync(full)) return { ok: false, error: 'Fichier introuvable' };
  createPdfWindow(full);
  return { ok: true, path: full };
});
