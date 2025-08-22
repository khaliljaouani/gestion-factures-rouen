// electron/preload.js
const { contextBridge, ipcRenderer } = require('electron');

// petit helper centralisé
const invoke = (channel, payload) => ipcRenderer.invoke(channel, payload);

const api = {
  /* ---------- Utilitaires ---------- */
  openPath: (absPath) => invoke('open-path', absPath),

  /* ---------- Sauvegarde PDF (tes canaux v2) ---------- */
  // Sauver un HTML arbitraire en PDF (args: { type, fileName, html, logoPath? })
  saveHtmlPdf:    (args) => invoke('pdf:save-html', args),
  // Sauver une facture à partir d'un objet data (args: { data, fileName, logoPath? })
  saveInvoicePdf: (args) => invoke('pdf:save-invoice', args),

  /* ---------- Alias rétro-compatibilité (v1 du front) ---------- */
  // Ancien nommage historique
  saveHTMLAsPDF:  (args) => invoke('pdf:save-html', args),
  saveHtmlAsPdf:  (args) => invoke('pdf:save-html', args),
  // Impression directe du WebContents courant
  // args: { type: 'facture'|'facture-cachee'|'devis', fileName: 'xxx.pdf' }
  savePdf:        (args) => invoke('save-pdf', args),

  /* ---------- NOUVEAU : Prévisualisation PDF en fenêtre ---------- */
  // 1) Ouvrir un PDF déjà sur disque (chemin absolu)
  openPdfFromFile: (absPath) => invoke('pdf:openFromFile', absPath),

  // 2) Ouvrir un PDF depuis un blob/ArrayBuffer (ex: retour axios blob)
  //    usage côté React :
  //    const ab = await blob.arrayBuffer();
  //    window.electronAPI.openPdfFromBuffer(ab, "facture_012.pdf");
  openPdfFromBuffer: (arrayBuffer, suggestedName) =>
    invoke('pdf:openFromBuffer', { buffer: arrayBuffer, suggestedName }),

  // 3) Ouvrir un PDF “classé” via ta logique Documents/gestion/<type>/<fileName>
  //    args: { type: 'facture'|'facture-cachee'|'facture_cacher'|'devis', fileName: 'facture_012.pdf' }
  openSavedPdf: ({ type, fileName }) =>
    invoke('pdf:openSaved', { type, fileName }),
};

// Exposer sous plusieurs noms pour couvrir l’existant
contextBridge.exposeInMainWorld('api', api);
contextBridge.exposeInMainWorld('electronAPI', api);
contextBridge.exposeInMainWorld('electron', api);
