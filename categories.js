// Catégories des signets et suggestion automatique (partagé par la page et l'extension).
(function (racine) {
  const CATEGORIES = [
    { code: "A", nom: "Animation et sakuga", groupe: "art",
      mots: ["sakuga", "genga", "key animation", "原画", "作画", "penciltest", "pencil test", "animator", "animation by", "2danimation", "in-between", "inbetween", "line test", "douga", "動画", "ka:", "timing", "smear", "effects animation", "animated by"] },
    { code: "P", nom: "Prise de vue et look rétro", groupe: "art",
      mots: ["compositing", "撮影", "透過光", "backlight", "transmitted light", "film emulation", "halation", "crt", "vhs", "technicolor", "lens flare", "vfx", "matte painting", "film grain", "shader", "bloom", "cinematograph", "blend mode"] },
    { code: "D", nom: "Dessin, anatomie, couleur", groupe: "art",
      mots: ["anatomy", "anatomie", "perspective", "how to draw", "drawing tip", "art tip", "pose", "gesture", "figure drawing", "shading", "values", "color theory", "colour", "couleur", "sketch", "croquis", "muscle", "proportion", "landscape sketch", "line weight"] },
    { code: "O", nom: "Outils et logiciels", groupe: "art",
      mots: ["clip studio", "clipstudio", "csp", "クリスタ", "blender", "after effects", "photoshop", "brush", "pinceau", "plugin", "script", "toon boom", "opentoonz", "tvpaint", "callipeg", "procreate", "wacom", "tablet", "davinci", "resolve", "fusion", "timesheet"] },
    { code: "C", nom: "Anime, coulisses et culture", groupe: "art",
      mots: ["anime", "アニメ", "manga", "漫画", "studio", "toei", "ghibli", "miyazaki", "one piece", "dragon ball", "sailor moon", "episode", "seiyuu", "storyboard", "絵コンテ", "behind the scenes", "making of"] },
    { code: "I", nom: "Illustrations et références", groupe: "art",
      mots: ["illustration", "イラスト", "artwork", "fanart", "fan art", "painting", "peinture", "concept art", "reference", "référence", "timelapse", "background", "背景", "watercolor", "gouache"] },
    { code: "F", nom: "Cinéma, séries et people", groupe: "reste",
      mots: ["film", "movie", "cinéma", "cinema", "trailer", "bande-annonce", "série", "series", "actor", "actress", "acteur", "actrice", "director", "réalisateur", "scene", "hollywood", "netflix", "oscar"] },
    { code: "J", nom: "Jeux vidéo et rétro", groupe: "reste",
      mots: ["game", "jeu", "gaming", "nintendo", "playstation", "ps1", "ps2", "ps5", "xbox", "sega", "switch", "emulator", "émulateur", "retro", "rétro", "pixel art", "steam", "final fantasy", "ff7"] },
    { code: "T", nom: "IA et tech", groupe: "reste",
      mots: [" ai ", "a.i.", "ia ", "chatgpt", "gpt", "openai", "midjourney", "seedance", "stable diffusion", "generative", "génératif", "gaussian splat", "nvidia", "apple vision", "robot", "llm", "grok"] },
    { code: "K", nom: "Chats et animaux", groupe: "reste",
      mots: ["cat ", "cats", "chat ", "chats", "kitten", "chaton", "猫", "dog", "chien", "puppy", "animal", "bird", "oiseau", "fox", "renard", "wildlife"] },
    { code: "S", nom: "Politique et société", groupe: "reste",
      mots: ["trump", "macron", "lfi", "rn ", "élection", "election", "politique", "politic", "gouvernement", "government", "immigration", "migrant", "gaza", "israël", "israel", "ukraine", "zemmour", "mélenchon", "bardella", "maga", "democrat", "republican", "ice raid"] },
    { code: "V", nom: "Humour, viral et divers", groupe: "reste", mots: [] }
  ];

  function normaliser(s) { return " " + (s || "").toLowerCase().replace(/\s+/g, " ") + " "; }

  // auteurs : {compte: {code: nombre}} construit à partir des signets déjà classés.
  function suggerer(post, auteurs) {
    const scores = {};
    const compte = (post.compte || "").toLowerCase();
    const hist = auteurs && auteurs[compte];
    if (hist) {
      for (const [code, n] of Object.entries(hist)) scores[code] = (scores[code] || 0) + 3 * n;
    }
    const texte = normaliser([post.texte, post.cite, post.nom].join(" "));
    for (const c of CATEGORIES) {
      for (const m of c.mots) if (texte.includes(m)) scores[c.code] = (scores[c.code] || 0) + 1;
    }
    let meilleur = "V", max = 0;
    for (const [code, s] of Object.entries(scores)) if (s > max) { max = s; meilleur = code; }
    return meilleur;
  }

  function auteursDepuis(items) {
    const m = {};
    for (const it of items) {
      const c = ((it.auteur && it.auteur.compte) || "").toLowerCase();
      if (!c) continue;
      m[c] = m[c] || {};
      m[c][it.categorie] = (m[c][it.categorie] || 0) + 1;
    }
    return m;
  }

  racine.SignetsCategories = { CATEGORIES, suggerer, auteursDepuis };
})(typeof self !== "undefined" ? self : window);
