// Version en ligne : lit les signets et médias dans le dossier « X Bookmarks » de ton Google Drive (lecture seule).
(function () {
  const API = "https://www.googleapis.com/drive/v3/files";
  let jeton = null;
  const dossiers = new Map(); // chemin -> id
  const fichiersDe = new Map(); // id dossier -> Promise<Map(nom -> id)>
  const urls = new Map();

  function bandeau(texte, bouton, action) {
    const b = document.getElementById("banner");
    b.hidden = false; b.textContent = texte;
    if (bouton) {
      const btn = document.createElement("button");
      btn.type = "button"; btn.className = "loadmore"; btn.textContent = bouton;
      btn.addEventListener("click", action);
      b.append(btn);
    }
  }

  function connexion() {
    return new Promise((ok, ko) => {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: window.SIGNETS_CONFIG.clientId,
        scope: "https://www.googleapis.com/auth/drive.readonly",
        callback: r => r.error ? ko(new Error(r.error)) : (jeton = r.access_token, ok())
      });
      bandeau("Connecte-toi avec le compte Google qui contient ton dossier X Bookmarks.", "Se connecter avec Google", () => client.requestAccessToken());
    });
  }

  async function api(url) {
    const r = await fetch(url, { headers: { Authorization: "Bearer " + jeton } });
    if (!r.ok) throw new Error("Google Drive a répondu " + r.status);
    return r;
  }

  async function lister(q) {
    const res = [];
    let page = "";
    do {
      const u = `${API}?q=${encodeURIComponent(q + " and trashed=false")}&fields=nextPageToken,files(id,name,mimeType)&pageSize=1000${page ? "&pageToken=" + page : ""}`;
      const d = await (await api(u)).json();
      res.push(...d.files); page = d.nextPageToken;
    } while (page);
    return res;
  }

  function contenu(idDossier) {
    if (!fichiersDe.has(idDossier)) {
      fichiersDe.set(idDossier, lister(`'${idDossier}' in parents`).then(l => new Map(l.map(f => [f.name, f.id]))));
    }
    return fichiersDe.get(idDossier);
  }

  async function idChemin(chemin) {
    const parts = chemin.split("/").filter(Boolean);
    let id = dossiers.get("");
    for (const p of parts) {
      const m = await contenu(id);
      id = m.get(p);
      if (!id) throw new Error("introuvable : " + chemin);
    }
    return id;
  }

  window.STOCKAGE = {
    mode: "drive",
    ecriture: false,
    async charger() {
      await connexion();
      bandeau("Recherche du dossier X Bookmarks dans ton Drive…");
      const r = await lister("(name='X Bookmarks' or name='Signets X') and mimeType='application/vnd.google-apps.folder'");
      if (!r.length) throw new Error("dossier « X Bookmarks » introuvable dans ce Google Drive");
      dossiers.set("", r[0].id);
      const idIndex = await idChemin("donnees/index.json");
      bandeau("Chargement des signets…");
      const items = await (await api(`${API}/${idIndex}?alt=media`)).json();
      document.getElementById("banner").hidden = true;
      return items;
    },
    url(chemin) {
      if (!chemin) return Promise.resolve("");
      if (!urls.has(chemin)) {
        urls.set(chemin, (async () => {
          const id = await idChemin(chemin);
          return URL.createObjectURL(await (await api(`${API}/${id}?alt=media`)).blob());
        })());
      }
      return urls.get(chemin);
    },
    async enregistrer() { throw new Error("Lecture seule en ligne : modifie depuis l'extension."); }
  };
})();
