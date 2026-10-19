// Page des signets : fonctionne ouverte directement depuis le dossier (lecture seule)
// ou depuis l'extension (window.STOCKAGE fourni par stockage-page.js : modifications enregistrées).
(function () {
  const { CATEGORIES } = window.SignetsCategories;
  const NOM = Object.fromEntries(CATEGORIES.map(c => [c.code, c.nom]));
  const PAGE = 40;

  const stockage = window.STOCKAGE || {
    mode: "fichier",
    ecriture: false,
    async charger() { return window.SIGNETS || []; },
    url(chemin) { return Promise.resolve(chemin || ""); },
    async enregistrer() { throw new Error("lecture seule"); }
  };

  const etat = { items: [], vue: "tout", media: "", q: "", tri: "rang", montres: PAGE };
  const $ = id => document.getElementById(id);

  function el(tag, cls, texte) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (texte != null) e.textContent = texte;
    return e;
  }

  function date(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d)) return "";
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  function typeMedia(it) {
    const ms = it.medias || [];
    if (ms.some(m => m.type === "video" || m.type === "gif")) return "v";
    if (ms.some(m => m.type === "image")) return "i";
    if (it.media_releve === "video") return "v";
    if (it.media_releve === "image") return "i";
    return "";
  }

  function filtres() {
    const q = etat.q.trim().toLowerCase();
    let liste = etat.items.filter(it => {
      if (etat.vue === "favoris") { if (!it.favori) return false; }
      else if (etat.vue === "indispo") { if (it.etat === "ok") return false; }
      else if (etat.vue !== "tout" && it.categorie !== etat.vue) return false;
      const t = typeMedia(it);
      if (etat.media === "v" && t !== "v") return false;
      if (etat.media === "i" && t !== "i") return false;
      if (etat.media === "t" && t) return false;
      if (q) {
        const a = it.auteur || {}, c = it.cite || {};
        const foin = [it.texte, a.nom, "@" + (a.compte || ""), c.texte, c.auteur && c.auteur.nom].join(" ").toLowerCase();
        if (!foin.includes(q)) return false;
      }
      return true;
    });
    if (etat.tri === "recent") liste = liste.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
    if (etat.tri === "ancien") liste = liste.slice().sort((a, b) => new Date(a.date) - new Date(b.date));
    return liste;
  }

  function rail() {
    const n = { tout: etat.items.length, favoris: 0, indispo: 0 };
    for (const it of etat.items) {
      n[it.categorie] = (n[it.categorie] || 0) + 1;
      if (it.favori) n.favoris++;
      if (it.etat !== "ok") n.indispo++;
    }
    const groupes = [
      { label: "Vue", cles: [{ code: "tout", nom: "Tous les signets" }, { code: "favoris", nom: "Favoris" }, { code: "indispo", nom: "Disparus de X" }] },
      { label: "Art et animation", cles: CATEGORIES.filter(c => c.groupe === "art") },
      { label: "Le reste", cles: CATEGORIES.filter(c => c.groupe !== "art") }
    ];
    const r = $("rail");
    r.textContent = "";
    for (const g of groupes) {
      const w = el("div", "rail-group");
      w.append(el("p", "group-label", g.label));
      const ul = el("ul", "cat-list");
      for (const c of g.cles) {
        const li = el("li");
        const b = el("button", "cat");
        b.type = "button"; b.dataset.key = c.code;
        if (c.groupe) b.dataset.groupe = c.groupe;
        b.setAttribute("aria-pressed", String(etat.vue === c.code));
        b.append(el("span", "tick"), el("span", "name", c.nom), el("span", "count", String(n[c.code] || 0)));
        b.addEventListener("click", () => { etat.vue = c.code; etat.montres = PAGE; memoriser(); rail(); grille(); });
        li.append(b); ul.append(li);
      }
      w.append(ul);
      r.append(w);
    }
  }

  function brancherMedia(noeud, chemin, attr) {
    stockage.url(chemin).then(u => { if (u) noeud[attr] = u; }).catch(() => {});
  }

  function blocMedias(medias, galerie) {
    const ms = (medias || []).filter(m => m.fichier || m.apercu || m.source);
    if (!ms.length) return null;
    const box = el("div", "medias n" + Math.min(ms.length, 4));
    ms.slice(0, 4).forEach((m, i) => {
      if (m.type === "image") {
        const img = el("img");
        img.alt = m.alt || ""; img.loading = "lazy"; img.decoding = "async";
        if (m.fichier) brancherMedia(img, m.fichier, "src"); else img.src = m.source;
        img.addEventListener("error", () => { if (m.source && img.src !== m.source) img.src = m.source; });
        img.addEventListener("click", () => ouvrirLightbox(galerie, galerie.indexOf(m)));
        box.append(img);
      } else if (m.fichier) {
        const v = el("video");
        v.preload = "none"; v.playsInline = true;
        if (m.type === "gif") { v.loop = true; v.muted = true; v.controls = true; } else { v.controls = true; }
        if (m.apercu) brancherMedia(v, m.apercu, "poster");
        brancherMedia(v, m.fichier, "src");
        box.append(v);
      } else if (m.apercu) {
        const img = el("img"); img.loading = "lazy";
        brancherMedia(img, m.apercu, "src");
        box.append(img);
      } else {
        box.append(el("div", "media-missing", "Média non archivé"));
      }
    });
    return box;
  }

  function fiche(it) {
    const carte = el("article", "card");
    const a = it.auteur || {};
    const corps = el("div", "body");
    const who = el("div", "who");
    const av = el("img", "avatar"); av.alt = ""; av.loading = "lazy";
    if (a.avatar) brancherMedia(av, a.avatar, "src"); else av.hidden = true;
    const noms = el("div", "names");
    noms.append(el("span", "name", a.nom || "@" + (a.compte || "")), el("span", "h", "@" + (a.compte || "")));
    who.append(av, noms);
    const meta = el("div", "meta");
    meta.append(el("span", null, date(it.date)));
    const t = typeMedia(it);
    if (t) meta.append(el("span", null, t === "v" ? "vidéo" : "image"));
    if (it.etat !== "ok") meta.append(el("span", "gone", "disparu de X, archive locale"));
    corps.append(who, meta);
    if (it.texte) {
      const p = el("p", "text", it.texte);
      corps.append(p);
      if (it.texte.length > 420 || it.texte.split("\n").length > 8) {
        const plus = el("button", "more", "Lire la suite");
        plus.type = "button";
        plus.addEventListener("click", () => { const o = carte.classList.toggle("open"); plus.textContent = o ? "Réduire" : "Lire la suite"; });
        corps.append(plus);
      }
    } else if (!(it.medias || []).length) {
      corps.append(el("p", "empty-text", "Post sans texte"));
    }
    if (it.cite && (it.cite.texte || (it.cite.medias || []).length)) {
      const q = el("div", "quote");
      const qa = it.cite.auteur || {};
      if (qa.compte || qa.nom) {
        const head = el("div", "qhead");
        if (qa.avatar) { const qi = el("img"); qi.alt = ""; brancherMedia(qi, qa.avatar, "src"); head.append(qi); }
        head.append(el("strong", null, qa.nom || ""), el("span", "h", qa.compte ? "@" + qa.compte : ""));
        q.append(head);
      }
      if (it.cite.texte) q.append(el("p", "qtext", it.cite.texte));
      const qm = blocMedias(it.cite.medias, (it.cite.medias || []).filter(m => m.type === "image"));
      if (qm) q.append(qm);
      corps.append(q);
    }
    const mb = blocMedias(it.medias, (it.medias || []).filter(m => m.type === "image"));
    if (mb) carte.append(mb);
    carte.append(corps);

    const pied = el("div", "foot");
    const sel = el("select");
    sel.id = "cat-" + it.id; sel.setAttribute("aria-label", "Catégorie");
    for (const c of CATEGORIES) { const o = el("option", null, c.nom); o.value = c.code; sel.append(o); }
    sel.value = it.categorie;
    sel.disabled = !stockage.ecriture;
    sel.addEventListener("change", () => modifier(it, { categorie: sel.value }));
    const star = el("button", "star", "★");
    star.type = "button";
    star.setAttribute("aria-pressed", String(!!it.favori));
    star.setAttribute("aria-label", it.favori ? "Retirer des favoris" : "Ajouter aux favoris");
    star.disabled = !stockage.ecriture;
    star.addEventListener("click", () => modifier(it, { favori: !it.favori }));
    const lien = el("a", "open-x", "Ouvrir sur X ↗");
    lien.href = it.url; lien.target = "_blank"; lien.rel = "noopener";
    pied.append(sel, star, lien);
    carte.append(pied);
    return carte;
  }

  function grille() {
    const liste = filtres();
    const g = $("grid");
    g.textContent = "";
    if (!liste.length) g.append(el("p", "empty", etat.vue === "favoris" && !etat.q ? "Aucun favori pour l'instant. Touche l'étoile d'une fiche pour l'ajouter ici." : "Aucun signet ne correspond à ces filtres."));
    const frag = document.createDocumentFragment();
    for (const it of liste.slice(0, etat.montres)) frag.append(fiche(it));
    g.append(frag);
    const reste = liste.length - etat.montres;
    $("loadmore").hidden = reste <= 0;
    $("loadmore").textContent = "Afficher plus (" + Math.max(reste, 0) + " restants)";
    const label = etat.vue === "tout" ? "Tous les signets" : etat.vue === "favoris" ? "Favoris" : etat.vue === "indispo" ? "Disparus de X" : NOM[etat.vue];
    $("summary").textContent = liste.length + " / " + etat.items.length + " · " + label;
  }

  async function modifier(it, patch) {
    const avant = Object.assign({}, it);
    Object.assign(it, patch);
    rail(); grille();
    try {
      await stockage.enregistrer(it);
      statut("Modification enregistrée.");
    } catch (e) {
      Object.assign(it, avant);
      rail(); grille();
      statut("La modification n'a pas pu être enregistrée : " + (e && e.message ? e.message : e), true);
    }
  }

  function statut(msg, alerte) { const s = $("status"); s.textContent = msg || ""; s.classList.toggle("warn", !!alerte); }

  let lb = null;
  function ouvrirLightbox(images, index) {
    if (!images.length) return;
    let i = Math.max(0, index);
    lb = el("div", "lightbox");
    const img = el("img");
    const fermer = el("button", null, "×"); fermer.type = "button"; fermer.setAttribute("aria-label", "Fermer");
    const prec = el("button", "nav prev", "‹"); prec.type = "button"; prec.setAttribute("aria-label", "Image précédente");
    const suiv = el("button", "nav next", "›"); suiv.type = "button"; suiv.setAttribute("aria-label", "Image suivante");
    const montrer = () => { const m = images[i]; if (m.fichier) brancherMedia(img, m.fichier, "src"); else img.src = m.source; prec.hidden = suiv.hidden = images.length < 2; };
    prec.addEventListener("click", e => { e.stopPropagation(); i = (i - 1 + images.length) % images.length; montrer(); });
    suiv.addEventListener("click", e => { e.stopPropagation(); i = (i + 1) % images.length; montrer(); });
    fermer.addEventListener("click", fermerLightbox);
    lb.addEventListener("click", e => { if (e.target === lb) fermerLightbox(); });
    lb.append(img, fermer, prec, suiv);
    document.body.append(lb);
    montrer();
  }
  function fermerLightbox() { if (lb) { lb.remove(); lb = null; } }
  document.addEventListener("keydown", e => {
    if (!lb) return;
    if (e.key === "Escape") fermerLightbox();
    if (e.key === "ArrowLeft") lb.querySelector(".prev").click();
    if (e.key === "ArrowRight") lb.querySelector(".next").click();
  });

  function memoriser() {
    try { localStorage.setItem("signets-vue", JSON.stringify({ vue: etat.vue, media: etat.media, tri: etat.tri })); } catch (e) {}
  }
  function restaurer() {
    try {
      const v = JSON.parse(localStorage.getItem("signets-vue") || "null");
      if (v) { etat.vue = v.vue || "tout"; etat.media = v.media || ""; etat.tri = v.tri || "rang"; }
    } catch (e) {}
  }
  function synchroControles() {
    for (const b of $("media").querySelectorAll("button")) b.setAttribute("aria-pressed", String(b.dataset.m === etat.media));
    $("sort").value = etat.tri;
  }

  $("media").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    etat.media = b.dataset.m; etat.montres = PAGE; synchroControles(); memoriser(); grille();
  });
  $("sort").addEventListener("change", () => { etat.tri = $("sort").value; etat.montres = PAGE; memoriser(); grille(); });
  let minuterie;
  $("q").addEventListener("input", () => {
    clearTimeout(minuterie);
    minuterie = setTimeout(() => { etat.q = $("q").value; etat.montres = PAGE; grille(); }, 150);
  });
  $("loadmore").addEventListener("click", () => { etat.montres += PAGE * 2; grille(); });
  new IntersectionObserver(entrees => {
    if (entrees.some(e => e.isIntersecting) && !$("loadmore").hidden) { etat.montres += PAGE; grille(); }
  }, { rootMargin: "800px" }).observe($("loadmore"));

  async function demarrer() {
    restaurer(); synchroControles();
    if (stockage.mode === "fichier") {
      const b = $("banner");
      b.hidden = false;
      b.textContent = "Lecture seule. Pour changer une catégorie, marquer un favori ou voir les derniers ajouts de l'extension, ouvre la page depuis l'icône de l'extension Signets X.";
    }
    try {
      etat.items = await stockage.charger();
    } catch (e) {
      statut("Les signets n'ont pas pu être chargés : " + (e && e.message ? e.message : e), true);
      return;
    }
    etat.items.sort((a, b) => (b.rang || 0) - (a.rang || 0));
    rail(); grille();
    if (stockage.apresChargement) stockage.apresChargement(etat.items, () => { rail(); grille(); });
  }
  window.SignetsPage = { recharger: async () => { etat.items = await stockage.charger(); etat.items.sort((a, b) => (b.rang || 0) - (a.rang || 0)); rail(); grille(); } };
  demarrer();
})();
