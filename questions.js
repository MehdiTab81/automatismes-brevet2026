/* ==========================================================================
   Banque de questions d'automatismes — 3ème / Brevet des collèges
   Format : Partie 1 du Brevet — 9 QCM/réponses courtes, 20 min, sans calculatrice.
   Chaque générateur renvoie un objet :
     {
       theme, title, body (HTML/LaTeX),
       type: 'qcm' | 'input',
       // QCM : choices[4] (HTML), correctIdx
       // input : expected (string OU array de strings acceptés OU RegExp), suffix (optionnel)
       solution (HTML),
       help: { cours, savoirFaire, erreurs }
     }
   ========================================================================== */

function randInt(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function gcd(a, b) { return b ? gcd(b, a % b) : a; }
function makeQCM(choicesWithCorrect) {
  const shuffled = shuffle(choicesWithCorrect);
  const correctIdx = shuffled.findIndex(c => c.correct);
  return { choices: shuffled.map(c => c.html), correctIdx };
}

/* Normalise une réponse utilisateur : virgule → point, espaces, lowercase */
function normalizeAnswer(s) {
  return String(s).trim().toLowerCase().replace(/\s+/g, '').replace(/,/g, '.').replace(/°/g, '');
}

/* ==========================================================================
   SVG helpers — figures géométriques (coordonnées calculées précisément)
   ========================================================================== */

/* Une petite encoche perpendiculaire au milieu d'un segment (marque de parallélisme) */
function perpTick(x1, y1, x2, y2, n = 1, color = '#2b5fd6') {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const ux = dx / len, uy = dy / len;   // unit tangent
  const nx = -uy, ny = ux;              // unit normal
  const tickLen = 6, gap = 3;
  let out = '';
  for (let i = 0; i < n; i++) {
    const t = (i - (n - 1) / 2) * gap;
    const cx = mx + ux * t, cy = my + uy * t;
    out += `<line x1="${(cx - nx * tickLen).toFixed(2)}" y1="${(cy - ny * tickLen).toFixed(2)}" x2="${(cx + nx * tickLen).toFixed(2)}" y2="${(cy + ny * tickLen).toFixed(2)}" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/>`;
  }
  return out;
}

/* Triangle rectangle en B (angle droit en bas-gauche).
   AB vertical, BC horizontal, AC hypoténuse.
   sides = { AB, BC, AC } — chaque valeur est un texte à afficher le long du côté. */
function svgTriangleRect({ labels = { A: 'A', B: 'B', C: 'C' }, sides = {}, angleAt = null } = {}) {
  const W = 300, H = 220;
  const pad = { l: 50, r: 40, t: 40, b: 40 };
  const Bx = pad.l, By = H - pad.b;
  const Ax = Bx,   Ay = pad.t;
  const Cx = W - pad.r, Cy = By;
  const sq = 12; // taille carré d'angle droit
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;height:auto;display:block;margin:10px auto;background:#fcfcfc;border:1px solid #ddd;border-radius:8px;">
    <polygon points="${Ax},${Ay} ${Bx},${By} ${Cx},${Cy}" fill="#eef0ff" stroke="#333" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M ${Bx} ${By - sq} h ${sq} v ${sq}" fill="none" stroke="#333" stroke-width="1.2"/>
    <circle cx="${Ax}" cy="${Ay}" r="3" fill="#333"/>
    <circle cx="${Bx}" cy="${By}" r="3" fill="#333"/>
    <circle cx="${Cx}" cy="${Cy}" r="3" fill="#333"/>
    <text x="${Ax - 12}" y="${Ay + 4}" font-size="15" font-weight="700" text-anchor="end">${labels.A}</text>
    <text x="${Bx - 12}" y="${By + 6}" font-size="15" font-weight="700" text-anchor="end">${labels.B}</text>
    <text x="${Cx + 12}" y="${Cy + 6}" font-size="15" font-weight="700">${labels.C}</text>
    ${sides.AB ? `<text x="${Ax - 10}" y="${(Ay + By) / 2 + 4}" font-size="13" fill="#2b5fd6" text-anchor="end">${sides.AB}</text>` : ''}
    ${sides.BC ? `<text x="${(Bx + Cx) / 2}" y="${By + 22}" font-size="13" fill="#2b5fd6" text-anchor="middle">${sides.BC}</text>` : ''}
    ${sides.AC ? `<text x="${(Ax + Cx) / 2 + 15}" y="${(Ay + Cy) / 2 - 5}" font-size="13" fill="#2b5fd6">${sides.AC}</text>` : ''}
    ${angleAt === 'A' ? `<path d="M ${Ax} ${Ay + 18} A 18 18 0 0 0 ${Ax + 18} ${Ay}" stroke="#c4342a" fill="none"/>` : ''}
    ${angleAt === 'C' ? `<path d="M ${Cx - 18} ${Cy} A 18 18 0 0 0 ${Cx} ${Cy - 18}" stroke="#c4342a" fill="none"/>` : ''}
  </svg>`;
}

/* Configuration de Thalès : A au sommet, D sur [AB] et E sur [AC].
   (DE) et (BC) sont parallèles PAR CONSTRUCTION (même ratio AD/AB = AE/AC).
   Labels des longueurs facultatifs. */
function svgThales({ AB, AC, AD, labels = { A: 'A', B: 'B', C: 'C', D: 'D', E: 'E' } } = {}) {
  const W = 320, H = 230;
  // Sommet A en haut, B en bas-gauche, C en bas-droite — coords fixes pour une figure claire
  const Ax = W / 2, Ay = 28;
  const Bx = 40,     By = H - 30;
  const Cx = W - 30, Cy = H - 30;
  // Calcul des coordonnées de D et E : D sur [AB] à la fraction AD/AB, E sur [AC] à la même fraction
  const r = AD / AB;
  const Dx = Ax + (Bx - Ax) * r;
  const Dy = Ay + (By - Ay) * r;
  const Ex = Ax + (Cx - Ax) * r;
  const Ey = Ay + (Cy - Ay) * r;
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;height:auto;display:block;margin:10px auto;background:#fcfcfc;border:1px solid #ddd;border-radius:8px;">
    <!-- Côtés du grand triangle -->
    <line x1="${Ax}" y1="${Ay}" x2="${Bx}" y2="${By}" stroke="#333" stroke-width="1.5"/>
    <line x1="${Ax}" y1="${Ay}" x2="${Cx}" y2="${Cy}" stroke="#333" stroke-width="1.5"/>
    <!-- (BC) et (DE) : parallèles avec marques -->
    <line x1="${Bx}" y1="${By}" x2="${Cx}" y2="${Cy}" stroke="#2b5fd6" stroke-width="2"/>
    <line x1="${Dx.toFixed(2)}" y1="${Dy.toFixed(2)}" x2="${Ex.toFixed(2)}" y2="${Ey.toFixed(2)}" stroke="#2b5fd6" stroke-width="2"/>
    ${perpTick(Dx, Dy, Ex, Ey, 1)}
    ${perpTick(Bx, By, Cx, Cy, 1)}
    <!-- Points -->
    <circle cx="${Ax}" cy="${Ay}" r="3" fill="#333"/>
    <circle cx="${Bx}" cy="${By}" r="3" fill="#333"/>
    <circle cx="${Cx}" cy="${Cy}" r="3" fill="#333"/>
    <circle cx="${Dx.toFixed(2)}" cy="${Dy.toFixed(2)}" r="3" fill="#333"/>
    <circle cx="${Ex.toFixed(2)}" cy="${Ey.toFixed(2)}" r="3" fill="#333"/>
    <!-- Labels de points -->
    <text x="${Ax}" y="${Ay - 8}" font-size="15" font-weight="700" text-anchor="middle">${labels.A}</text>
    <text x="${Bx - 10}" y="${By + 16}" font-size="15" font-weight="700" text-anchor="end">${labels.B}</text>
    <text x="${Cx + 10}" y="${Cy + 16}" font-size="15" font-weight="700">${labels.C}</text>
    <text x="${(Dx - 12).toFixed(2)}" y="${(Dy + 5).toFixed(2)}" font-size="13" font-weight="700" text-anchor="end">${labels.D}</text>
    <text x="${(Ex + 12).toFixed(2)}" y="${(Ey + 5).toFixed(2)}" font-size="13" font-weight="700">${labels.E}</text>
    <!-- Longueurs -->
    ${AB ? `<text x="${((Ax + Dx) / 2 - 10).toFixed(2)}" y="${((Ay + Dy) / 2 + 4).toFixed(2)}" font-size="12" fill="#555" text-anchor="end">${AD} cm</text>` : ''}
    ${AB && AD !== AB ? `<text x="${((Dx + Bx) / 2 - 10).toFixed(2)}" y="${((Dy + By) / 2 + 4).toFixed(2)}" font-size="12" fill="#555" text-anchor="end">${AB - AD} cm</text>` : ''}
    ${AC ? `<text x="${((Ax + Cx) / 2 + 12).toFixed(2)}" y="${((Ay + Cy) / 2 - 2).toFixed(2)}" font-size="12" fill="#555">${AC} cm</text>` : ''}
  </svg>`;
}

/* ==========================================================================
   THÈME 1 — CALCUL NUMÉRIQUE (fractions, puissances, écriture scientifique)
   ========================================================================== */

// Tiers, moitié, quart d'un entier (Q1 Brevet 0 A)
function t1_fraction_entier() {
  const cases = [
    { n: 18, part: 'tiers', d: 3, r: 6 }, { n: 24, part: 'tiers', d: 3, r: 8 },
    { n: 20, part: 'quart', d: 4, r: 5 }, { n: 36, part: 'quart', d: 4, r: 9 },
    { n: 50, part: 'moitié', d: 2, r: 25 }, { n: 30, part: 'moitié', d: 2, r: 15 },
    { n: 25, part: 'cinquième', d: 5, r: 5 }, { n: 40, part: 'cinquième', d: 5, r: 8 }
  ];
  const k = pick(cases);
  return {
    theme: 'calcul', title: 'Fraction d\'un entier',
    body: `Quel est le ${k.part} de ${k.n} ?`,
    type: 'input', expected: String(k.r),
    solution: `Le ${k.part} de ${k.n} c'est ${k.n}÷${k.d} = ${k.r}.`,
    help: {
      cours: "Le <b>tiers</b> d'un nombre, c'est sa division par 3. La <b>moitié</b> c'est ÷2, le <b>quart</b> c'est ÷4, le <b>cinquième</b> c'est ÷5.",
      savoirFaire: "Retenir les équivalences : tiers = ÷3, quart = ÷4, moitié = ÷2.",
      erreurs: ["Multiplier au lieu de diviser.", "Confondre tiers (÷3) et quart (÷4).", "Se tromper de calcul mental."]
    }
  };
}

// Addition de fractions simples
function t1_somme_fractions() {
  const cases = [
    { a:'1/2', b:'1/4', r:'3/4' }, { a:'1/3', b:'1/6', r:'1/2' },
    { a:'1/2', b:'1/3', r:'5/6' }, { a:'2/5', b:'1/5', r:'3/5' },
    { a:'1/6', b:'1/3', r:'1/2' }
  ];
  const k = pick(cases);
  const toLatex = f => { const [n,d]=f.split('/'); return `\\dfrac{${n}}{${d}}`; };
  // Pool de distracteurs plausibles (résultats typiquement erronés)
  const pool = ['3/4','5/6','1/2','2/3','1/4','3/5','5/8','2/5','1/3','7/12'];
  const distract = Array.from(new Set(pool.filter(x => x !== k.r))).slice(0, 3);
  const { choices, correctIdx } = makeQCM([
    { html: `\\(${toLatex(k.r)}\\)`, correct: true },
    ...distract.map(d => ({ html: `\\(${toLatex(d)}\\)`, correct: false }))
  ]);
  return {
    theme: 'calcul', title: 'Somme de fractions',
    body: `\\(${toLatex(k.a)} + ${toLatex(k.b)}\\) est égal à :`,
    type: 'qcm', choices, correctIdx,
    solution: `On met au même dénominateur : \\(${toLatex(k.a)} + ${toLatex(k.b)} = ${toLatex(k.r)}\\).`,
    help: {
      cours: "Pour additionner deux fractions, on les met au <b>même dénominateur</b>, puis on additionne les numérateurs.",
      savoirFaire: "Chercher le plus petit dénominateur commun (souvent le plus grand si divisible par l'autre).",
      erreurs: ["Additionner numérateurs ET dénominateurs.", "Oublier de simplifier.", "Se tromper de dénominateur commun."]
    }
  };
}

// Puissance simple
function t1_puissance() {
  const cases = [
    { expr:'2^3', val:'8' }, { expr:'2^4', val:'16' }, { expr:'3^2', val:'9' },
    { expr:'3^3', val:'27' }, { expr:'5^2', val:'25' }, { expr:'10^3', val:'1000' },
    { expr:'4^2', val:'16' }, { expr:'10^4', val:'10000' }
  ];
  const k = pick(cases);
  return {
    theme: 'calcul', title: 'Puissance',
    body: `\\(${k.expr}\\) est égal à :`,
    type: 'input', expected: k.val,
    solution: `\\(${k.expr} = ${k.val}\\).`,
    help: {
      cours: "\\(a^n\\) = \\(a \\times a \\times ... \\times a\\) (\\(n\\) fois). Par exemple \\(2^3 = 2\\times 2\\times 2 = 8\\).",
      savoirFaire: "Écrire le produit pour ne pas confondre avec une multiplication.",
      erreurs: ["Confondre \\(a^n\\) et \\(a\\times n\\).", "Se tromper au calcul : \\(2^3 = 8\\), pas 6.", "Confondre \\(a^n\\) et \\(n^a\\)."]
    }
  };
}

// Écriture scientifique (test de la forme)
function t1_ecriture_sci() {
  const cases = [
    { n:'32000', sci:'3{,}2 \\times 10^4' }, { n:'0{,}0045', sci:'4{,}5 \\times 10^{-3}' },
    { n:'560', sci:'5{,}6 \\times 10^2' }, { n:'0{,}081', sci:'8{,}1 \\times 10^{-2}' },
    { n:'7500', sci:'7{,}5 \\times 10^3' }
  ];
  const k = pick(cases);
  const distract = shuffle(cases.filter(c => c.sci !== k.sci)).slice(0,3).map(c => c.sci);
  const { choices, correctIdx } = makeQCM([
    { html: `\\(${k.sci}\\)`, correct: true },
    ...distract.map(s => ({ html: `\\(${s}\\)`, correct: false }))
  ]);
  return {
    theme: 'calcul', title: 'Écriture scientifique',
    body: `L'écriture scientifique de \\(${k.n}\\) est :`,
    type: 'qcm', choices, correctIdx,
    solution: `\\(${k.n} = ${k.sci}\\) (on décale la virgule pour obtenir un nombre entre 1 et 10, puis on ajuste la puissance de 10).`,
    help: {
      cours: "Écriture scientifique : \\(a \\times 10^n\\) avec \\(1 \\leq a < 10\\) et \\(n\\) entier relatif.",
      savoirFaire: "Compter le nombre de chiffres à décaler la virgule : vers la gauche → \\(n\\) positif, vers la droite → \\(n\\) négatif.",
      erreurs: ["\\(a\\) doit être < 10 (ex. \\(32 \\times 10^3\\) n'est pas scientifique).", "Oublier le signe de \\(n\\).", "Se tromper du nombre de décalages."]
    }
  };
}

// PGCD simple (pour fractions irréductibles)
function t1_pgcd() {
  const cases = [
    { a:12, b:18, r:6 }, { a:15, b:25, r:5 }, { a:24, b:36, r:12 },
    { a:14, b:21, r:7 }, { a:20, b:30, r:10 }, { a:9, b:12, r:3 }
  ];
  const k = pick(cases);
  return {
    theme: 'arithmetique', title: 'PGCD',
    body: `Le PGCD de ${k.a} et ${k.b} est :`,
    type: 'input', expected: String(k.r),
    solution: `Les diviseurs communs de ${k.a} et ${k.b} ont pour plus grand : ${k.r}.`,
    help: {
      cours: "Le <b>PGCD</b> (plus grand commun diviseur) est le plus grand nombre qui divise à la fois deux entiers.",
      savoirFaire: "Méthode : décomposer les deux nombres en facteurs premiers et multiplier les facteurs communs. Ou algorithme d'Euclide.",
      erreurs: ["Confondre PGCD et PPCM.", "Prendre un diviseur commun mais pas le plus grand.", "Oublier 1 est toujours diviseur commun."]
    }
  };
}

// Fraction irréductible
function t1_frac_irred() {
  const cases = [
    { num:12, den:18, r:'2/3' }, { num:15, den:25, r:'3/5' },
    { num:9, den:12, r:'3/4' }, { num:10, den:25, r:'2/5' },
    { num:8, den:12, r:'2/3' }, { num:14, den:16, r:'7/8' }
  ];
  const k = pick(cases);
  const toLatex = f => { const [n,d]=f.split('/'); return `\\dfrac{${n}}{${d}}`; };
  // Distracteurs uniques, différents de k.r
  const pool = ['2/3','3/5','3/4','2/5','7/8','1/2','5/6','3/8','4/5'];
  const distract = Array.from(new Set(pool.filter(x => x !== k.r))).slice(0, 3);
  const { choices, correctIdx } = makeQCM([
    { html: `\\(${toLatex(k.r)}\\)`, correct: true },
    ...distract.map(v => ({ html: `\\(${toLatex(v)}\\)`, correct: false }))
  ]);
  return {
    theme: 'arithmetique', title: 'Fraction irréductible',
    body: `L'écriture irréductible de \\(\\dfrac{${k.num}}{${k.den}}\\) est :`,
    type: 'qcm', choices, correctIdx,
    solution: `On divise numérateur et dénominateur par leur PGCD : \\(\\dfrac{${k.num}}{${k.den}} = ${toLatex(k.r)}\\).`,
    help: {
      cours: "Une fraction est <b>irréductible</b> si son numérateur et son dénominateur n'ont pas de diviseur commun autre que 1.",
      savoirFaire: "Diviser haut et bas par le même nombre (idéalement le PGCD pour aller d'un coup).",
      erreurs: ["Simplifier seulement le numérateur.", "Oublier que 1 est toujours diviseur commun.", "Se tromper de PGCD."]
    }
  };
}

// Priorités opératoires (calcul mental / posé simple)
function t1_priorites() {
  const cases = [
    { expr: '5 + 3 \\times 4',         r: 17 },
    { expr: '(5 + 3) \\times 4',       r: 32 },
    { expr: '12 - 2 \\times 3',        r: 6  },
    { expr: '20 - 6 \\div 2',          r: 17 },
    { expr: '4 + 6 \\div 3',           r: 6  },
    { expr: '8 - 2 \\times (3 + 1)',   r: 0  },
    { expr: '2 \\times 3 + 4 \\times 5', r: 26 }
  ];
  const k = pick(cases);
  const distract = shuffle([k.r+1, k.r-2, k.r*2, k.r+5, k.r-5]).filter(v => v !== k.r).slice(0,3);
  const { choices, correctIdx } = makeQCM([
    { html: `\\(${k.r}\\)`, correct: true },
    ...distract.map(v => ({ html: `\\(${v}\\)`, correct: false }))
  ]);
  return {
    theme: 'calcul', title: 'Priorités opératoires',
    body: `Calcule : \\(${k.expr}\\).`,
    type: 'qcm', choices, correctIdx,
    solution: `On respecte les priorités : parenthèses, puis × et ÷, puis + et −. Résultat : \\(${k.expr} = ${k.r}\\).`,
    help: {
      cours: "<b>Priorités opératoires</b> (PEMDAS) :<br>1. <b>Parenthèses</b> en premier<br>2. <b>× et ÷</b> (de gauche à droite)<br>3. <b>+ et −</b> (de gauche à droite)",
      savoirFaire: "Repérer et effectuer les opérations prioritaires avant les autres.",
      erreurs: ["Faire les opérations de gauche à droite sans respecter les priorités.", "Confondre l'ordre × et +.", "Oublier les parenthèses."]
    }
  };
}

// Produit de fractions (renommé depuis t1_frac_composee qui faisait une division)
function t1_produit_fractions() {
  const cases = [
    { a:'1/2', b:'2/3', r:'1/3' },
    { a:'3/4', b:'2/5', r:'3/10' },
    { a:'2/3', b:'3/8', r:'1/4' },
    { a:'5/6', b:'2/5', r:'1/3' },
    { a:'3/5', b:'5/9', r:'1/3' }
  ];
  const k = pick(cases);
  const toLatex = f => { const [n,d] = f.split('/'); return `\\dfrac{${n}}{${d}}`; };
  const pool = ['1/2','1/3','1/4','3/10','3/4','2/3','5/6','2/5','1/6','1/5'];
  const distract = Array.from(new Set(pool.filter(x => x !== k.r))).slice(0,3);
  const { choices, correctIdx } = makeQCM([
    { html: `\\(${toLatex(k.r)}\\)`, correct: true },
    ...distract.map(d => ({ html: `\\(${toLatex(d)}\\)`, correct: false }))
  ]);
  return {
    theme: 'calcul', title: 'Produit de fractions',
    body: `\\(${toLatex(k.a)} \\times ${toLatex(k.b)}\\) est égal à :`,
    type: 'qcm', choices, correctIdx,
    solution: `\\(${toLatex(k.a)} \\times ${toLatex(k.b)} = ${toLatex(k.r)}\\) (produit des numérateurs sur produit des dénominateurs, puis simplification).`,
    help: {
      cours: "Pour multiplier deux fractions : \\(\\dfrac{a}{b} \\times \\dfrac{c}{d} = \\dfrac{a \\times c}{b \\times d}\\), puis on simplifie.",
      savoirFaire: "Multiplier numérateurs entre eux et dénominateurs entre eux, puis simplifier (chercher des facteurs communs).",
      erreurs: ["Additionner au lieu de multiplier.", "Mettre au même dénominateur (inutile pour la multiplication).", "Ne pas simplifier."]
    }
  };
}

// Puissances de 10 (+ notation décimale)
function t1_puissance_10() {
  const cases = [
    { expr:'10^3', val:'1000' }, { expr:'10^4', val:'10000' },
    { expr:'10^{-2}', val:'0,01' }, { expr:'10^{-3}', val:'0,001' },
    { expr:'10^{-1}', val:'0,1' }, { expr:'10^0', val:'1' }
  ];
  const k = pick(cases);
  return {
    theme: 'calcul', title: 'Puissance de 10',
    body: `\\(${k.expr}\\) est égal à :`,
    type: 'input', expected: [k.val, k.val.replace(',', '.')],
    solution: `\\(${k.expr} = ${k.val}\\). Pour un exposant positif \\(n\\), \\(10^n\\) = 1 suivi de \\(n\\) zéros. Pour négatif, ce sont les décimales.`,
    help: {
      cours: "\\(10^n = 1\\underbrace{00\\ldots 0}_{n\\text{ zéros}}\\) pour \\(n \\geq 0\\). \\(10^{-n} = 0{,}\\underbrace{0\\ldots 01}_{n\\text{ décimales}}\\). Cas particulier : \\(10^0 = 1\\).",
      savoirFaire: "Compter le nombre de zéros (exposant positif) ou de décimales (négatif).",
      erreurs: ["Confondre \\(10^{-2}\\) avec \\(-100\\).", "Oublier que \\(10^0 = 1\\).", "Se tromper sur le nombre de zéros."]
    }
  };
}

// Opérations avec écriture scientifique (produit)
function t1_op_ecriture_sci() {
  const cases = [
    { a:'2 \\times 10^3', b:'3 \\times 10^4', r:'6 \\times 10^7', raw:'6×10⁷' },
    { a:'5 \\times 10^2', b:'2 \\times 10^{-3}', r:'1 \\times 10^0', raw:'1' },
    { a:'4 \\times 10^5', b:'2 \\times 10^{-2}', r:'8 \\times 10^3', raw:'8×10³' },
    { a:'3 \\times 10^{-1}', b:'4 \\times 10^6', r:'1{,}2 \\times 10^6', raw:'1,2×10⁶' }
  ];
  const k = pick(cases);
  const distract = cases.filter(c => c.r !== k.r).map(c => c.r);
  distract.push(k.r.replace(/10\^\{?(\-?\d+)\}?/, (m, e) => '10^' + (parseInt(e)+1)));
  const { choices, correctIdx } = makeQCM([
    { html: `\\(${k.r}\\)`, correct: true },
    ...shuffle(distract).slice(0, 3).map(d => ({ html: `\\(${d}\\)`, correct: false }))
  ]);
  return {
    theme: 'calcul', title: 'Écriture scientifique — produit',
    body: `\\(\\left(${k.a}\\right) \\times \\left(${k.b}\\right)\\) est égal à :`,
    type: 'qcm', choices, correctIdx,
    solution: `On multiplie les parties numériques et on additionne les exposants : \\(\\left(${k.a}\\right) \\times \\left(${k.b}\\right) = ${k.r}\\).`,
    help: {
      cours: "Produit en écriture scientifique : \\((a \\times 10^n) \\times (b \\times 10^p) = (a \\times b) \\times 10^{n+p}\\). Attention : le résultat doit rester sous forme \\(a \\times 10^k\\) avec \\(1 \\leq a < 10\\).",
      savoirFaire: "1) Multiplier les parties numériques \\(a \\times b\\). 2) Additionner les exposants \\(n + p\\). 3) Remettre au format scientifique si besoin.",
      erreurs: ["Multiplier les exposants au lieu de les additionner.", "Oublier de remettre au format scientifique.", "Se tromper de signe sur l'exposant."]
    }
  };
}

// Critères de divisibilité
function t1_divisibilite() {
  const cases = [
    { n: 126, div: [2, 3, 6], notDiv: [5, 9, 10] },
    { n: 135, div: [3, 5, 9], notDiv: [2, 4, 10] },
    { n: 540, div: [2, 3, 5, 9, 10], notDiv: [] },
    { n: 231, div: [3], notDiv: [2, 5, 9, 10] },
    { n: 144, div: [2, 3, 9], notDiv: [5, 10] }
  ];
  const k = pick(cases);
  const by = pick([2, 3, 5, 9, 10]);
  const divisible = k.div.includes(by);
  const { choices, correctIdx } = makeQCM([
    { html: divisible ? 'Oui' : 'Non', correct: true },
    { html: divisible ? 'Non' : 'Oui', correct: false },
    { html: 'On ne peut pas savoir', correct: false },
    { html: 'Seulement s\'il est pair', correct: false }
  ]);
  return {
    theme: 'arithmetique', title: 'Critère de divisibilité',
    body: `Le nombre ${k.n} est-il divisible par ${by} ?`,
    type: 'qcm', choices, correctIdx,
    solution: `${k.n} ${divisible ? 'est' : 'n\'est pas'} divisible par ${by}. Critère : ${by === 2 ? 'chiffre des unités pair' : by === 5 ? 'chiffre des unités 0 ou 5' : by === 10 ? 'chiffre des unités 0' : by === 3 ? 'somme des chiffres divisible par 3' : 'somme des chiffres divisible par 9'}.`,
    help: {
      cours: "<b>Critères de divisibilité</b> : par <b>2</b> si chiffre unités pair ; par <b>5</b> si unités = 0 ou 5 ; par <b>10</b> si unités = 0 ; par <b>3</b> si somme chiffres divisible par 3 ; par <b>9</b> si somme chiffres divisible par 9.",
      savoirFaire: "Appliquer le critère correspondant au diviseur sans faire la division.",
      erreurs: ["Confondre les critères de 3 et 9.", "Oublier de calculer la somme des chiffres.", "Faire la division (plus long)."]
    }
  };
}

// PPCM de deux entiers
function t1_ppcm() {
  const cases = [
    { a:4, b:6, r:12 }, { a:6, b:9, r:18 }, { a:8, b:12, r:24 },
    { a:5, b:10, r:10 }, { a:6, b:8, r:24 }, { a:9, b:12, r:36 },
    { a:10, b:15, r:30 }, { a:3, b:7, r:21 }
  ];
  const k = pick(cases);
  return {
    theme: 'arithmetique', title: 'PPCM',
    body: `Le PPCM de ${k.a} et ${k.b} est :`,
    type: 'input', expected: String(k.r),
    solution: `Le PPCM est le plus petit multiple commun strictement positif. Ici : PPCM(${k.a}, ${k.b}) = ${k.r}.`,
    help: {
      cours: "Le <b>PPCM</b> (plus petit commun multiple) de deux entiers est le plus petit entier > 0 qui est multiple des deux. Astuce : PPCM(a,b) × PGCD(a,b) = a × b.",
      savoirFaire: "Lister les multiples du plus grand jusqu'à trouver un multiple du plus petit. Ou utiliser PPCM = (a × b) / PGCD(a, b).",
      erreurs: ["Confondre PPCM et PGCD.", "Donner un multiple commun pas le plus petit.", "Oublier que PPCM(a,b) ≥ max(a,b)."]
    }
  };
}

// Nombres premiers
function t1_nombre_premier() {
  const cases = [
    { n: 17, premier: true }, { n: 23, premier: true }, { n: 29, premier: true },
    { n: 21, premier: false }, { n: 27, premier: false }, { n: 33, premier: false },
    { n: 51, premier: false }, { n: 57, premier: false }, { n: 19, premier: true }
  ];
  const k = pick(cases);
  const { choices, correctIdx } = makeQCM([
    { html: k.premier ? 'Oui' : 'Non', correct: true },
    { html: k.premier ? 'Non' : 'Oui', correct: false },
    { html: 'Seulement si pair', correct: false },
    { html: 'On ne peut pas savoir', correct: false }
  ]);
  const divisors = k.premier ? [1, k.n] : (function(){
    for (let d = 2; d < k.n; d++) if (k.n % d === 0) return [1, d, k.n / d, k.n];
    return [];
  })();
  return {
    theme: 'arithmetique', title: 'Nombre premier',
    body: `Le nombre ${k.n} est-il premier ?`,
    type: 'qcm', choices, correctIdx,
    solution: `${k.n} ${k.premier ? 'est premier' : 'n\'est pas premier : ' + k.n + ' = ' + divisors.filter(d => d !== 1 && d !== k.n).slice(0, 1).map(d => `${d} × ${k.n/d}`).join('')}.`,
    help: {
      cours: "Un <b>nombre premier</b> est un entier \\(\\geq 2\\) qui a exactement <b>deux diviseurs</b> : 1 et lui-même. Premiers < 50 : 2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47.",
      savoirFaire: "Tester la divisibilité par 2, 3, 5, 7, 11… jusqu'à \\(\\sqrt{n}\\). Si aucun ne divise, c'est premier.",
      erreurs: ["Penser que 1 est premier (non).", "Oublier que 2 est premier.", "Confondre nombre premier et nombre impair."]
    }
  };
}

/* ------------------------------------------------------------------
   Racine carrée — attendu Brevet 2025 p.2 :
   "valeur exacte du côté d'un carré d'aire donnée" + encadrement
   ------------------------------------------------------------------ */
function t1_racine_carre_parfait() {
  const cases = [
    { a: 1, r: 1 }, { a: 4, r: 2 }, { a: 9, r: 3 }, { a: 16, r: 4 },
    { a: 25, r: 5 }, { a: 36, r: 6 }, { a: 49, r: 7 }, { a: 64, r: 8 },
    { a: 81, r: 9 }, { a: 100, r: 10 }, { a: 121, r: 11 }, { a: 144, r: 12 }
  ];
  const k = pick(cases);
  return {
    theme: 'calcul', title: 'Racine carrée — côté d\'un carré',
    body: `Un carré a une aire de ${k.a} cm². Quelle est la longueur de son côté (en cm) ?`,
    type: 'input', expected: String(k.r), suffix: 'cm',
    solution: `On cherche le nombre positif qui, multiplié par lui-même, donne ${k.a}. Or \\(${k.r} \\times ${k.r} = ${k.a}\\), donc \\(\\sqrt{${k.a}} = ${k.r}\\). Le côté mesure <b>${k.r} cm</b>.`,
    help: {
      cours: "\\(\\sqrt{a}\\) (pour \\(a \\geq 0\\)) est le <b>nombre positif</b> qui, élevé au carré, donne \\(a\\). Par exemple \\(\\sqrt{81} = 9\\) car \\(9^2 = 81\\).",
      savoirFaire: "Connaître par cœur les 12 premiers carrés parfaits : \\(1, 4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144\\).",
      erreurs: ["Répondre en cm² au lieu de cm.", "Diviser l'aire par 2 au lieu de prendre la racine.", "Confondre \\(a^2\\) et \\(\\sqrt{a}\\)."]
    }
  };
}

function t1_racine_encadrement() {
  // Cases: n non-carré parfait entre 2 et 144
  const cases = [
    { n: 2,  lo: 1, hi: 2 },  { n: 5, lo: 2, hi: 3 },  { n: 8, lo: 2, hi: 3 },
    { n: 10, lo: 3, hi: 4 },  { n: 12, lo: 3, hi: 4 }, { n: 15, lo: 3, hi: 4 },
    { n: 20, lo: 4, hi: 5 },  { n: 23, lo: 4, hi: 5 }, { n: 30, lo: 5, hi: 6 },
    { n: 40, lo: 6, hi: 7 },  { n: 50, lo: 7, hi: 8 }, { n: 60, lo: 7, hi: 8 },
    { n: 75, lo: 8, hi: 9 },  { n: 90, lo: 9, hi: 10 },{ n: 110, lo: 10, hi: 11 },
    { n: 130, lo: 11, hi: 12 }
  ];
  const k = pick(cases);
  const correct = `entre ${k.lo} et ${k.hi}`;
  const distract = [
    `entre ${k.lo - 1} et ${k.lo}`,
    `entre ${k.hi} et ${k.hi + 1}`,
    `entre ${Math.floor(k.n/2)} et ${Math.floor(k.n/2)+1}`
  ].filter(d => d !== correct);
  const { choices, correctIdx } = makeQCM([
    { html: correct, correct: true },
    ...shuffle(distract).slice(0, 3).map(d => ({ html: d, correct: false }))
  ]);
  return {
    theme: 'calcul', title: 'Racine carrée — encadrement',
    body: `L'aire d'un carré est ${k.n} cm². Entre quels deux entiers consécutifs est compris son côté (en cm) ?`,
    type: 'qcm', choices, correctIdx,
    solution: `\\(${k.lo}^2 = ${k.lo*k.lo}\\) et \\(${k.hi}^2 = ${k.hi*k.hi}\\). Comme \\(${k.lo*k.lo} < ${k.n} < ${k.hi*k.hi}\\), on a \\(${k.lo} < \\sqrt{${k.n}} < ${k.hi}\\). Le côté est compris <b>entre ${k.lo} cm et ${k.hi} cm</b>.`,
    help: {
      cours: "Pour encadrer \\(\\sqrt{n}\\), on cherche les deux carrés parfaits qui entourent \\(n\\).",
      savoirFaire: "Exemple : pour \\(\\sqrt{20}\\), je cherche : \\(16 < 20 < 25\\), donc \\(4 < \\sqrt{20} < 5\\).",
      erreurs: ["Diviser \\(n\\) par 2.", "Oublier que \\(\\sqrt{n}\\) est entre \\(\\sqrt{\\text{carré inf.}}\\) et \\(\\sqrt{\\text{carré sup.}}\\).", "Inverser l'ordre des bornes."]
    }
  };
}

function t1_racine_arrondi() {
  // On donne une valeur approchée précise et l'élève l'arrondit à la précision demandée
  const cases = [
    { n: 17, approx: '4{,}12310...', dixieme: '4,1', centieme: '4,12', unite: '4' },
    { n: 7,  approx: '2{,}64575...', dixieme: '2,6', centieme: '2,65', unite: '3' },
    { n: 11, approx: '3{,}31662...', dixieme: '3,3', centieme: '3,32', unite: '3' },
    { n: 13, approx: '3{,}60555...', dixieme: '3,6', centieme: '3,61', unite: '4' },
    { n: 29, approx: '5{,}38516...', dixieme: '5,4', centieme: '5,39', unite: '5' },
    { n: 43, approx: '6{,}55743...', dixieme: '6,6', centieme: '6,56', unite: '7' },
    { n: 55, approx: '7{,}41619...', dixieme: '7,4', centieme: '7,42', unite: '7' }
  ];
  const k = pick(cases);
  const precisions = [
    { label: "au dixième (1 chiffre après la virgule)", val: k.dixieme, distract: [k.centieme, k.unite, k.dixieme.replace(',', ',0')] },
    { label: "au centième (2 chiffres après la virgule)", val: k.centieme, distract: [k.dixieme, k.unite, k.centieme.slice(0, -1)] },
    { label: "à l'unité", val: k.unite, distract: [k.dixieme, k.centieme, String(parseInt(k.unite) + 1)] }
  ];
  const p = pick(precisions);
  const { choices, correctIdx } = makeQCM([
    { html: p.val, correct: true },
    ...shuffle(p.distract).slice(0, 3).map(d => ({ html: d, correct: false }))
  ]);
  return {
    theme: 'calcul', title: 'Racine carrée — arrondi',
    body: `On donne \\(\\sqrt{${k.n}} \\approx ${k.approx}\\).<br>Arrondi ${p.label}, \\(\\sqrt{${k.n}}\\) vaut :`,
    type: 'qcm', choices, correctIdx,
    solution: `Pour arrondir ${p.label}, on regarde le chiffre suivant : s'il est \\(\\geq 5\\) on arrondit au-dessus, sinon au-dessous. On obtient <b>${p.val}</b>.`,
    help: {
      cours: "Pour <b>arrondir</b> un nombre décimal, on regarde le chiffre <b>juste après</b> la précision voulue : s'il est \\(\\geq 5\\) on augmente d'un cran, sinon on garde.",
      savoirFaire: "Exemple : \\(\\sqrt{17} \\approx 4{,}12310...\\). Au dixième → je regarde le 2 : \\(2 < 5\\), donc j'arrondis à 4,1.",
      erreurs: ["Tronquer au lieu d'arrondir.", "Se tromper de chiffre regardé.", "Oublier la virgule."]
    }
  };
}

/* ==========================================================================
   THÈME 2 — PROPORTIONNALITÉ, POURCENTAGES, VITESSES
   ========================================================================== */

function t2_pct_effectif() {
  const cases = [
    { n:300, p:25, r:75 }, { n:800, p:25, r:200 }, { n:400, p:50, r:200 },
    { n:60, p:10, r:6 }, { n:500, p:20, r:100 }, { n:1200, p:75, r:900 }
  ];
  const k = pick(cases);
  return {
    theme: 'pourcent', title: 'Pourcentage d\'un effectif',
    body: `Dans un collège de ${k.n} élèves, ${k.p}% portent des lunettes. Combien d'élèves portent des lunettes ?`,
    type: 'input', expected: String(k.r),
    solution: `\\(${k.p}\\%\\) de \\(${k.n}\\) c'est \\(\\dfrac{${k.p}}{100} \\times ${k.n} = ${k.r}\\).`,
    help: {
      cours: "\\(p\\,\\%\\) de \\(N\\) = \\(\\dfrac{p}{100} \\times N\\).",
      savoirFaire: "Astuces : 10% = ÷10 ; 25% = ÷4 ; 50% = ÷2 ; 75% = les 3/4.",
      erreurs: ["Oublier de diviser par 100.", "Confondre avec le reste.", "Se tromper de calcul mental."]
    }
  };
}

function t2_pct_complement() {
  const cases = [
    { n:300, p:25, r:225 }, { n:400, p:20, r:320 }, { n:800, p:10, r:720 },
    { n:200, p:75, r:50 }, { n:500, p:40, r:300 }
  ];
  const k = pick(cases);
  return {
    theme: 'pourcent', title: 'Complément à un pourcentage',
    body: `Dans un collège de ${k.n} élèves, ${k.p}% participent à un projet. Combien d'élèves n'y participent PAS ?`,
    type: 'input', expected: String(k.r),
    solution: `${k.p}% participent, donc \\(100-${k.p} = ${100-k.p}\\%\\) ne participent pas. \\(\\dfrac{${100-k.p}}{100} \\times ${k.n} = ${k.r}\\).`,
    help: {
      cours: "Si \\(p\\%\\) font quelque chose, alors \\((100-p)\\%\\) ne le font pas.",
      savoirFaire: "Calculer d'abord \\(100-p\\), puis appliquer ce pourcentage à l'effectif total.",
      erreurs: ["Calculer ceux qui participent au lieu de ceux qui ne participent pas.", "Soustraire \\(p\\) directement de \\(N\\) (attention, c'est un %).", "Se tromper sur le complément à 100."]
    }
  };
}

function t2_vitesse_temps() {
  const cases = [
    { v:90, d:45, t:'30 min', choices:['15 min','30 min','45 min','1 h'] },
    { v:60, d:30, t:'30 min', choices:['15 min','30 min','45 min','1 h'] },
    { v:120, d:60, t:'30 min', choices:['20 min','30 min','45 min','1 h'] },
    { v:80, d:40, t:'30 min', choices:['15 min','30 min','40 min','1 h'] }
  ];
  const k = pick(cases);
  const { choices, correctIdx } = makeQCM(
    k.choices.map(c => ({ html: c, correct: c === k.t }))
  );
  return {
    theme: 'pourcent', title: 'Calcul de vitesse',
    body: `Une voiture roule à ${k.v} km/h. Combien de temps met-elle pour parcourir ${k.d} km ?`,
    type: 'qcm', choices, correctIdx,
    solution: `Temps = distance / vitesse = ${k.d} / ${k.v} = ${k.d/k.v} h = ${k.t}.`,
    help: {
      cours: "Formules : \\(v = \\dfrac{d}{t}\\), \\(d = v \\times t\\), \\(t = \\dfrac{d}{v}\\).",
      savoirFaire: "Convertir les heures en minutes : 0,5 h = 30 min, 0,25 h = 15 min, 1/3 h = 20 min.",
      erreurs: ["Confondre vitesse et temps.", "Oublier la conversion h → min.", "Multiplier au lieu de diviser."]
    }
  };
}

function t2_quatrieme_prop() {
  const cases = [
    { n1:5, c1:3, n2:15, r:9 }, { n1:4, c1:7, n2:12, r:21 },
    { n1:3, c1:2, n2:15, r:10 }, { n1:2, c1:5, n2:8, r:20 },
    { n1:4, c1:6, n2:10, r:15 }
  ];
  const k = pick(cases);
  return {
    theme: 'pourcent', title: 'Quatrième proportionnelle',
    body: `${k.n1} kg de pommes coûtent ${k.c1} €. Combien coûtent ${k.n2} kg ?`,
    type: 'input', expected: String(k.r),
    solution: `Prix au kg : \\(${k.c1}/${k.n1} = ${k.c1/k.n1}\\) €. Pour ${k.n2} kg : \\(${k.c1/k.n1} \\times ${k.n2} = ${k.r}\\) €.`,
    help: {
      cours: "En situation de proportionnalité, si \\(n_1\\) objets valent \\(c_1\\), alors \\(n_2\\) objets valent \\(\\dfrac{n_2 \\times c_1}{n_1}\\).",
      savoirFaire: "Calculer d'abord le prix unitaire (à l'unité), puis multiplier.",
      erreurs: ["Additionner ou soustraire au lieu de multiplier.", "Mélanger les données.", "Se tromper sur l'unité."]
    }
  };
}

function t2_conversion() {
  const cases = [
    { q:'240 minutes en heures', r:'4', suffix:'h' },
    { q:'180 secondes en minutes', r:'3', suffix:'min' },
    { q:'150 cm en mètres', r:'1,5', suffix:'m' },
    { q:'2,5 kg en grammes', r:'2500', suffix:'g' },
    { q:'500 mL en L', r:'0,5', suffix:'L' },
    { q:'3 heures en minutes', r:'180', suffix:'min' }
  ];
  const k = pick(cases);
  return {
    theme: 'pourcent', title: 'Conversion d\'unité',
    body: `Convertir : ${k.q}.`,
    type: 'input', expected: k.r, inputSuffix: k.suffix,
    solution: `${k.q} = ${k.r} ${k.suffix}.`,
    help: {
      cours: "Équivalences à retenir : 1 h = 60 min, 1 min = 60 s ; 1 m = 100 cm, 1 km = 1000 m ; 1 kg = 1000 g ; 1 L = 1000 mL.",
      savoirFaire: "Multiplier pour aller vers une unité plus petite, diviser pour aller vers une plus grande.",
      erreurs: ["Confondre ×1000 et ÷1000.", "Oublier une zéro.", "Confondre les unités."]
    }
  };
}

/* ------------------------------------------------------------------
   Coefficient multiplicateur — attendu Brevet 2025 p.5 :
   "Il utilise le lien entre pourcentage d'évolution et coefficient
   multiplicateur. Augmentation de 5 % → ×1,05 ; diminution de 20 % → ×0,8."
   ------------------------------------------------------------------ */
function t2_coef_multiplicateur() {
  const cases = [
    // Augmentations
    { pct: 5, sens: 'augmentation', coef: '1,05' },
    { pct: 10, sens: 'augmentation', coef: '1,10' },
    { pct: 15, sens: 'augmentation', coef: '1,15' },
    { pct: 20, sens: 'augmentation', coef: '1,20' },
    { pct: 25, sens: 'augmentation', coef: '1,25' },
    { pct: 50, sens: 'augmentation', coef: '1,50' },
    { pct: 3, sens: 'augmentation', coef: '1,03' },
    { pct: 8, sens: 'augmentation', coef: '1,08' },
    // Diminutions
    { pct: 5, sens: 'diminution', coef: '0,95' },
    { pct: 10, sens: 'diminution', coef: '0,90' },
    { pct: 20, sens: 'diminution', coef: '0,80' },
    { pct: 25, sens: 'diminution', coef: '0,75' },
    { pct: 30, sens: 'diminution', coef: '0,70' },
    { pct: 50, sens: 'diminution', coef: '0,50' },
    { pct: 40, sens: 'diminution', coef: '0,60' }
  ];
  const k = pick(cases);
  // Distracteurs plausibles
  const oppositeCoef = k.sens === 'augmentation'
    ? String((1 - k.pct / 100).toFixed(2)).replace('.', ',')
    : String((1 + k.pct / 100).toFixed(2)).replace('.', ',');
  const naif = (k.pct / 100).toString().replace('.', ','); // ex : 0,05 au lieu de 1,05
  const inverse = k.sens === 'augmentation'
    ? (1 + k.pct).toString().replace('.', ',')  // ex : 6 au lieu de 1,05
    : (1 - k.pct / 10).toString().replace('.', ',');
  const distract = [oppositeCoef, naif, inverse].filter(d => d !== k.coef);
  const { choices, correctIdx } = makeQCM([
    { html: k.coef, correct: true },
    ...shuffle(distract).slice(0, 3).map(d => ({ html: d, correct: false }))
  ]);
  return {
    theme: 'pourcent', title: 'Coefficient multiplicateur',
    body: `Quel est le coefficient multiplicateur associé à une <b>${k.sens} de ${k.pct}&nbsp;%</b> ?`,
    type: 'qcm', choices, correctIdx,
    solution: k.sens === 'augmentation'
      ? `Augmenter de ${k.pct}&nbsp;% revient à multiplier par \\(1 + \\dfrac{${k.pct}}{100} = ${k.coef}\\).`
      : `Diminuer de ${k.pct}&nbsp;% revient à multiplier par \\(1 - \\dfrac{${k.pct}}{100} = ${k.coef}\\).`,
    help: {
      cours: "Augmenter de \\(t\\%\\) → multiplier par \\(1 + \\dfrac{t}{100}\\). Diminuer de \\(t\\%\\) → multiplier par \\(1 - \\dfrac{t}{100}\\).",
      savoirFaire: "Retenir : +5% → ×1,05 ; −20% → ×0,80 ; +50% → ×1,50.",
      erreurs: ["Confondre \\(0{,}05\\) (juste le pourcentage) et \\(1{,}05\\) (coefficient).", "Utiliser le même coefficient pour augmentation ET diminution.", "Se tromper de signe (+/−)."]
    }
  };
}

function t2_coef_mult_application() {
  // Application directe : "Un prix de 80 € augmente de 25%. Nouveau prix ?"
  const cases = [
    { p0: 80,  pct: 25, sens: '+', pf: 100 }, // 80 × 1,25 = 100
    { p0: 200, pct: 10, sens: '+', pf: 220 },
    { p0: 50,  pct: 20, sens: '+', pf: 60 },
    { p0: 40,  pct: 50, sens: '+', pf: 60 },
    { p0: 100, pct: 15, sens: '+', pf: 115 },
    { p0: 60,  pct: 50, sens: '-', pf: 30 },
    { p0: 80,  pct: 25, sens: '-', pf: 60 },
    { p0: 200, pct: 20, sens: '-', pf: 160 },
    { p0: 150, pct: 10, sens: '-', pf: 135 },
    { p0: 400, pct: 30, sens: '-', pf: 280 }
  ];
  const k = pick(cases);
  const coef = k.sens === '+'
    ? (1 + k.pct / 100).toString().replace('.', ',')
    : (1 - k.pct / 100).toString().replace('.', ',');
  const mot = k.sens === '+' ? 'augmente' : 'diminue';
  return {
    theme: 'pourcent', title: 'Évolution en pourcentage',
    body: `Un article coûte ${k.p0}&nbsp;€. Son prix ${mot} de ${k.pct}&nbsp;%. Quel est le nouveau prix (en €) ?`,
    type: 'input', expected: String(k.pf), suffix: '€',
    solution: `${mot === 'augmente' ? 'Augmenter' : 'Diminuer'} de ${k.pct}&nbsp;%, c'est multiplier par ${coef}. Nouveau prix : \\(${k.p0} \\times ${coef} = ${k.pf}\\)&nbsp;€.`,
    help: {
      cours: "Pour appliquer une évolution en pourcentage, on multiplie par le <b>coefficient multiplicateur</b> : \\(1 + \\dfrac{t}{100}\\) pour une hausse, \\(1 - \\dfrac{t}{100}\\) pour une baisse.",
      savoirFaire: "Écrire : nouveau prix = ancien prix × coefficient.",
      erreurs: ["Ajouter \\(t\\%\\) du prix au lieu de multiplier (piège avec % > 10%).", "Confondre +25% et ×0,25.", "Appliquer deux fois un +10% pour faire +20% (faux, car ×1,1 × 1,1 = ×1,21)."]
    }
  };
}

/* ==========================================================================
   THÈME 3 — CALCUL LITTÉRAL
   ========================================================================== */

function t3_equation() {
  // ax + b = c style Brevet : "Pour résoudre 4x-3=20, on effectue x = ..."
  const a = pick([2,3,4,5]);
  const x = pick([3,4,5,6,7]);
  const b = pick([-5,-3,-2,2,3,5]);
  const c = a*x + b;
  const fmtS = n => (n>=0?'+':'-') + ' ' + Math.abs(n);
  return {
    theme: 'algebre', title: 'Résoudre une équation',
    body: `Résoudre l'équation : \\(${a}x ${fmtS(b)} = ${c}\\). On a \\(x = ?\\)`,
    type: 'input', expected: String(x),
    solution: `\\(${a}x ${fmtS(b)} = ${c}\\) donne \\(${a}x = ${c-b}\\), puis \\(x = ${(c-b)}/${a} = ${x}\\).`,
    help: {
      cours: "Résoudre \\(ax+b = c\\) : soustraire \\(b\\) des deux côtés, puis diviser par \\(a\\).",
      savoirFaire: "Procéder par étapes (on isole progressivement \\(x\\)).",
      erreurs: ["Changer de signe trop tôt.", "Diviser un seul côté par \\(a\\).", "Oublier le signe de \\(b\\)."]
    }
  };
}

function t3_developpe() {
  const a = pick([2,3,4,5]);
  const b = pick([-4,-3,-2,2,3,4,5]);
  const c = pick([-4,-3,-2,2,3,4,5]);
  // a(x+b) = ax + ab
  const fmtS = n => (n>=0?'+':'-') + ' ' + Math.abs(n);
  return {
    theme: 'algebre', title: 'Développer',
    body: `Développer : \\(${a}(x ${fmtS(b)})\\).`,
    type: 'input', expected: [`${a}x${fmtS(a*b)}`.replace(/\s/g,''), `${a}x${fmtS(a*b).replace(' ','')}`.replace(/\s/g,'')],
    solution: `\\(${a}(x ${fmtS(b)}) = ${a}x ${fmtS(a*b)}\\).`,
    help: {
      cours: "Distributivité : \\(k(a+b) = ka + kb\\).",
      savoirFaire: "Multiplier le nombre devant par CHAQUE terme entre parenthèses.",
      erreurs: ["Oublier un terme.", "Se tromper de signe.", "Multiplier seulement le premier terme."]
    }
  };
}

function t3_factoriser() {
  const k = pick([2,3,4,5,6]);
  const a = pick([2,3,4,5]);
  const b = pick([2,3,4,5]);
  const { choices, correctIdx } = makeQCM([
    { html: `\\(${k}(${a}x + ${b})\\)`, correct: true },
    { html: `\\(${k*a}(x + ${b})\\)`, correct: false },
    { html: `\\(${k}x(${a} + ${b})\\)`, correct: false },
    { html: `\\(x(${k*a} + ${k*b})\\)`, correct: false }
  ]);
  return {
    theme: 'algebre', title: 'Factoriser',
    body: `Factoriser : \\(${k*a}x + ${k*b}\\).`,
    type: 'qcm', choices, correctIdx,
    solution: `Le facteur commun est \\(${k}\\) : \\(${k*a}x + ${k*b} = ${k}(${a}x + ${b})\\).`,
    help: {
      cours: "Factoriser, c'est l'inverse de développer : \\(ka + kb = k(a+b)\\).",
      savoirFaire: "Chercher le plus grand facteur commun entre les termes.",
      erreurs: ["Oublier des termes dans la parenthèse.", "Facteur commun trop petit.", "Se tromper de signe."]
    }
  };
}

function t3_image() {
  const a = pick([2,3,-2,-3]);
  const b = pick([-5,-3,-2,1,2,3,5]);
  const x = pick([-2,-1,0,1,2,3]);
  const y = a*x + b;
  const fmtS = n => (n>=0?'+':'-') + ' ' + Math.abs(n);
  return {
    theme: 'algebre', title: 'Image par une fonction',
    body: `Soit \\(f(x) = ${a}x ${fmtS(b)}\\). Quelle est l'image de \\(${x}\\) par \\(f\\) ?`,
    type: 'input', expected: String(y),
    solution: `\\(f(${x}) = ${a} \\times (${x}) ${fmtS(b)} = ${a*x} ${fmtS(b)} = ${y}\\).`,
    help: {
      cours: "L'image de \\(x\\) par \\(f\\) c'est le nombre \\(f(x)\\).",
      savoirFaire: "Remplacer \\(x\\) par la valeur donnée, entre parenthèses si négative.",
      erreurs: ["Oublier les parenthèses pour \\(x\\) négatif.", "Chercher un antécédent au lieu de l'image.", "Se tromper de signe."]
    }
  };
}

function t3_equivalence_equation() {
  // Q7 Brevet 0 B : pour résoudre 4x-3=20, on effectue...
  const a = pick([3,4,5,6]);
  const b = pick([2,3,4,5]);
  const c = pick([15,18,20,25,30]);
  const correctExpr = `\\dfrac{${c}+${b}}{${a}}`;
  const { choices, correctIdx } = makeQCM([
    { html: `\\(x = ${correctExpr}\\)`, correct: true },
    { html: `\\(x = \\dfrac{${c}}{${a}} + ${b}\\)`, correct: false },
    { html: `\\(x = \\dfrac{${c}-${b}}{${a}}\\)`, correct: false },
    { html: `\\(x = ${c} \\times ${a} + ${b}\\)`, correct: false }
  ]);
  return {
    theme: 'algebre', title: 'Équation — expression de x',
    body: `Pour résoudre l'équation \\(${a}x - ${b} = ${c}\\), on trouve :`,
    type: 'qcm', choices, correctIdx,
    solution: `\\(${a}x - ${b} = ${c} \\iff ${a}x = ${c}+${b} \\iff x = \\dfrac{${c}+${b}}{${a}}\\).`,
    help: {
      cours: "Isoler la variable : passer \\(b\\) de l'autre côté (change de signe), puis diviser tout par \\(a\\).",
      savoirFaire: "Écrire soigneusement l'étape intermédiaire avant de diviser.",
      erreurs: ["Diviser uniquement un terme.", "Ne pas changer le signe de \\(b\\).", "Oublier la fraction."]
    }
  };
}

/* ==========================================================================
   HELPERS — Graphiques avec graduations
   ========================================================================== */

/* Graphique à coin origine (axes en bas-gauche).
   Trace une ligne brisée passant par les points donnés, avec graduations sur x et y. */
function svgGraph({ xMax, yMax, xStep = 1, yStep = 1, points = [], xLabel = '', yLabel = '', highlight = [] } = {}) {
  const W = 360, H = 230;
  const padL = 44, padR = 18, padT = 18, padB = 38;
  const gw = W - padL - padR, gh = H - padT - padB;
  const toX = x => padL + (x / xMax) * gw;
  const toY = y => H - padB - (y / yMax) * gh;
  let grid = '';
  for (let x = 0; x <= xMax; x += xStep) {
    const gx = toX(x);
    grid += `<line x1="${gx.toFixed(1)}" y1="${padT}" x2="${gx.toFixed(1)}" y2="${H - padB}" stroke="#eaeaea"/>`;
    grid += `<line x1="${gx.toFixed(1)}" y1="${H - padB}" x2="${gx.toFixed(1)}" y2="${H - padB + 4}" stroke="#333"/>`;
    grid += `<text x="${gx.toFixed(1)}" y="${H - padB + 14}" font-size="10" text-anchor="middle" fill="#555">${x}</text>`;
  }
  for (let y = 0; y <= yMax; y += yStep) {
    const gy = toY(y);
    grid += `<line x1="${padL}" y1="${gy.toFixed(1)}" x2="${W - padR}" y2="${gy.toFixed(1)}" stroke="#eaeaea"/>`;
    grid += `<line x1="${padL - 4}" y1="${gy.toFixed(1)}" x2="${padL}" y2="${gy.toFixed(1)}" stroke="#333"/>`;
    grid += `<text x="${padL - 6}" y="${(gy + 3).toFixed(1)}" font-size="10" text-anchor="end" fill="#555">${y}</text>`;
  }
  const axes = `
    <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${H - padB}" stroke="#333" stroke-width="1.5"/>
    <line x1="${padL}" y1="${H - padB}" x2="${W - padR}" y2="${H - padB}" stroke="#333" stroke-width="1.5"/>`;
  let path = '';
  if (points.length > 1) {
    path = '<path d="' + points.map((p, i) => (i ? 'L' : 'M') + toX(p[0]).toFixed(1) + ' ' + toY(p[1]).toFixed(1)).join(' ') + '" stroke="#2b5fd6" stroke-width="2" fill="none"/>';
  }
  const hi = highlight.map(p => `<circle cx="${toX(p[0]).toFixed(1)}" cy="${toY(p[1]).toFixed(1)}" r="4" fill="#c4342a"/>`).join('');
  const axLabels = `
    <text x="${W - padR - 4}" y="${H - padB - 6}" font-size="11" text-anchor="end" fill="#333" font-style="italic">${xLabel}</text>
    <text x="${padL + 4}" y="${padT + 10}" font-size="11" fill="#333" font-style="italic">${yLabel}</text>`;
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;height:auto;display:block;margin:10px auto;background:#fcfcfc;border:1px solid #ddd;border-radius:8px;">${grid}${axes}${path}${hi}${axLabels}</svg>`;
}

/* Repère orthonormé centré en (0,0) avec une droite y = a x + b tracée.
   La droite est clipée au cadre visible. */
function svgRepereDroite({ a, b, xMax = 5, yMax = 6 } = {}) {
  const W = 310, H = 310;
  const padL = 30, padR = 20, padT = 20, padB = 30;
  const gw = W - padL - padR, gh = H - padT - padB;
  const ox = padL + gw / 2;
  const oy = padT + gh / 2;
  const ux = gw / (2 * xMax);
  const uy = gh / (2 * yMax);
  const toX = x => ox + x * ux;
  const toY = y => oy - y * uy;
  let grid = '';
  for (let x = -xMax; x <= xMax; x++) {
    const gx = toX(x);
    grid += `<line x1="${gx.toFixed(1)}" y1="${padT}" x2="${gx.toFixed(1)}" y2="${H - padB}" stroke="#eef0f6"/>`;
    if (x !== 0) grid += `<text x="${gx.toFixed(1)}" y="${(oy + 14).toFixed(1)}" font-size="10" text-anchor="middle" fill="#555">${x}</text>`;
  }
  for (let y = -yMax; y <= yMax; y++) {
    const gy = toY(y);
    grid += `<line x1="${padL}" y1="${gy.toFixed(1)}" x2="${W - padR}" y2="${gy.toFixed(1)}" stroke="#eef0f6"/>`;
    if (y !== 0) grid += `<text x="${(ox - 6).toFixed(1)}" y="${(gy + 3).toFixed(1)}" font-size="10" text-anchor="end" fill="#555">${y}</text>`;
  }
  const axes = `
    <line x1="${padL}" y1="${oy.toFixed(1)}" x2="${W - padR}" y2="${oy.toFixed(1)}" stroke="#333" stroke-width="1.2"/>
    <line x1="${ox.toFixed(1)}" y1="${padT}" x2="${ox.toFixed(1)}" y2="${H - padB}" stroke="#333" stroke-width="1.2"/>
    <text x="${W - padR - 4}" y="${(oy - 6).toFixed(1)}" font-size="11" fill="#333" font-style="italic">x</text>
    <text x="${(ox + 6).toFixed(1)}" y="${padT + 10}" font-size="11" fill="#333" font-style="italic">y</text>
    <text x="${(ox - 8).toFixed(1)}" y="${(oy + 13).toFixed(1)}" font-size="10" fill="#555">0</text>`;
  // Clip line to box
  const yL = a * (-xMax) + b, yR = a * xMax + b;
  let x1 = -xMax, y1 = yL, x2 = xMax, y2 = yR;
  if (y1 < -yMax) { x1 = (-yMax - b) / a; y1 = -yMax; }
  else if (y1 > yMax) { x1 = (yMax - b) / a; y1 = yMax; }
  if (y2 < -yMax) { x2 = (-yMax - b) / a; y2 = -yMax; }
  else if (y2 > yMax) { x2 = (yMax - b) / a; y2 = yMax; }
  const line = `<line x1="${toX(x1).toFixed(1)}" y1="${toY(y1).toFixed(1)}" x2="${toX(x2).toFixed(1)}" y2="${toY(y2).toFixed(1)}" stroke="#2b5fd6" stroke-width="2"/>`;
  // Highlight ordonnée à l'origine
  const pt = (b >= -yMax && b <= yMax) ? `<circle cx="${toX(0).toFixed(1)}" cy="${toY(b).toFixed(1)}" r="3.5" fill="#c4342a"/>` : '';
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;height:auto;display:block;margin:10px auto;background:#fcfcfc;border:1px solid #ddd;border-radius:8px;">${grid}${axes}${line}${pt}</svg>`;
}

// Équation produit nul
function t3_equation_produit() {
  const a = pick([2, 3, 4]);
  const b = pick([-4, -3, -2, 2, 3, 4, 5]);
  const fmtS = n => (n >= 0 ? '+' : '-') + ' ' + Math.abs(n);
  // (ax + b)(x + c) = 0 → solutions x = -b/a ou x = -c
  const c = pick([-3, -2, 2, 3]);
  const sol1 = -b / a;
  const sol2 = -c;
  const sol1Str = Number.isInteger(sol1) ? `${sol1}` : `${-b}/${a}`;
  // Pour simplicité, forcer sol1 entier
  if (!Number.isInteger(sol1)) return t3_equation_produit();
  const sols = [sol1, sol2].sort((x, y) => x - y);
  const solStr = `x = ${sols[0]}\u00A0ou\u00A0x = ${sols[1]}`;
  const distract = [
    `x = ${-sols[0]}\u00A0ou\u00A0x = ${-sols[1]}`,
    `x = ${sols[0]}`,
    `x = ${sols[0] + sols[1]}`
  ];
  const { choices, correctIdx } = makeQCM([
    { html: solStr, correct: true },
    ...distract.map(d => ({ html: d, correct: false }))
  ]);
  return {
    theme: 'algebre', title: 'Équation produit nul',
    body: `Résoudre : \\((${a}x ${fmtS(b)})(x ${fmtS(c)}) = 0\\).`,
    type: 'qcm', choices, correctIdx,
    solution: `Un produit est nul si l'un des facteurs est nul. \\(${a}x ${fmtS(b)} = 0 \\iff x = ${sol1}\\). \\(x ${fmtS(c)} = 0 \\iff x = ${-c}\\). Solutions : ${solStr}.`,
    help: {
      cours: "<b>Équation-produit nul</b> : \\(A \\times B = 0 \\iff A = 0 \\text{ ou } B = 0\\). On résout les deux équations simples séparément.",
      savoirFaire: "Écrire chaque facteur = 0, résoudre, et rassembler les solutions.",
      erreurs: ["Distribuer et développer (on perd les solutions).", "Oublier une des deux solutions.", "Se tromper de signe en isolant."]
    }
  };
}

/* ------------------------------------------------------------------
   Équation x² = a — attendu Brevet 2025 p.3 : "x² = 20"
   ------------------------------------------------------------------ */
function t3_equation_x_carre() {
  const cases = [
    { a: 9, sol: '-3 \\text{ et } 3' },
    { a: 16, sol: '-4 \\text{ et } 4' },
    { a: 25, sol: '-5 \\text{ et } 5' },
    { a: 36, sol: '-6 \\text{ et } 6' },
    { a: 49, sol: '-7 \\text{ et } 7' },
    { a: 64, sol: '-8 \\text{ et } 8' },
    { a: 100, sol: '-10 \\text{ et } 10' },
    { a: 0, sol: '0' },
    { a: -4, sol: 'aucune solution' }
  ];
  const k = pick(cases);
  const distract = cases.filter(c => c.sol !== k.sol).slice(0, 3).map(c => c.sol);
  // Ajout d'un piège : un seul signe (ex. oublier la solution négative)
  if (k.a > 0 && Math.sqrt(k.a) % 1 === 0) {
    distract[0] = `${Math.sqrt(k.a)} \\text{ uniquement}`;
  }
  const { choices, correctIdx } = makeQCM([
    { html: `\\(${k.sol}\\)`, correct: true },
    ...distract.slice(0, 3).map(d => ({ html: `\\(${d}\\)`, correct: false }))
  ]);
  let sol;
  if (k.a < 0) {
    sol = `L'équation \\(x^2 = ${k.a}\\) n'a <b>aucune solution</b> : un carré est toujours positif ou nul.`;
  } else if (k.a === 0) {
    sol = `\\(x^2 = 0 \\iff x = 0\\). Solution unique : <b>0</b>.`;
  } else {
    const r = Math.sqrt(k.a);
    sol = `\\(x^2 = ${k.a} \\iff x = ${r} \\text{ ou } x = -${r}\\). Solutions : <b>\\(-${r}\\) et \\(${r}\\)</b>.`;
  }
  return {
    theme: 'algebre', title: 'Équation x² = a',
    body: `Résoudre dans \\(\\mathbb{R}\\) : \\(x^2 = ${k.a}\\).`,
    type: 'qcm', choices, correctIdx,
    solution: sol,
    help: {
      cours: "Équation \\(x^2 = a\\) : <br>• si \\(a > 0\\) : <b>2 solutions</b>, \\(x = \\sqrt{a}\\) et \\(x = -\\sqrt{a}\\).<br>• si \\(a = 0\\) : <b>1 solution</b>, \\(x = 0\\).<br>• si \\(a < 0\\) : <b>aucune solution</b>.",
      savoirFaire: "Reconnaître le cas (\\(a\\) positif, nul ou négatif), extraire la racine carrée, ne pas oublier la solution négative.",
      erreurs: ["Oublier la solution négative.", "Dire que \\(x^2 = -4\\) a pour solution \\(-2\\) (faux : un carré ne peut pas être négatif).", "Diviser \\(a\\) par 2 au lieu de prendre la racine."]
    }
  };
}

/* ------------------------------------------------------------------
   Opposé d'une expression — attendu Brevet 2025 p.3 :
   "−(3x − 7) = −3x + 7"
   ------------------------------------------------------------------ */
function t3_oppose_expression() {
  const cases = [
    { expr: '3x - 7', opp: '-3x + 7' },
    { expr: '5x + 2', opp: '-5x - 2' },
    { expr: '-4x + 9', opp: '4x - 9' },
    { expr: '-2x - 5', opp: '2x + 5' },
    { expr: '7x - 1', opp: '-7x + 1' },
    { expr: '-x + 8', opp: 'x - 8' },
    { expr: '6 - 2x', opp: '-6 + 2x' },
    { expr: '3 - 4x', opp: '-3 + 4x' }
  ];
  const k = pick(cases);
  const distract = cases.filter(c => c.opp !== k.opp).slice(0, 3).map(c => c.opp);
  const { choices, correctIdx } = makeQCM([
    { html: `\\(${k.opp}\\)`, correct: true },
    ...distract.map(d => ({ html: `\\(${d}\\)`, correct: false }))
  ]);
  return {
    theme: 'algebre', title: 'Opposé d\'une expression',
    body: `Supprime la parenthèse : \\(-(${k.expr}) = \\) ?`,
    type: 'qcm', choices, correctIdx,
    solution: `\\(-(${k.expr}) = ${k.opp}\\) : tous les signes à l'intérieur de la parenthèse sont <b>changés</b>.`,
    help: {
      cours: "<b>Opposé d'une expression</b> : pour enlever un signe « − » devant une parenthèse, on change <b>tous les signes</b> à l'intérieur. Exemple : \\(-(3x - 7) = -3x + 7\\).",
      savoirFaire: "Distribuer le \\(-1\\) à chaque terme : \\(-(a+b) = -a-b\\) ; \\(-(a-b) = -a+b\\).",
      erreurs: ["Changer seulement le signe du premier terme.", "Oublier de changer le signe du nombre seul.", "Laisser la parenthèse sans changer les signes."]
    }
  };
}

// Identité remarquable (a+b)(a-b) = a² - b²
function t3_identite_remarquable() {
  const cases = [
    { expr: '(x+3)(x-3)', dev: 'x^2 - 9' },
    { expr: '(x+5)(x-5)', dev: 'x^2 - 25' },
    { expr: '(2x+1)(2x-1)', dev: '4x^2 - 1' },
    { expr: '(x-4)(x+4)', dev: 'x^2 - 16' },
    { expr: '(3x-2)(3x+2)', dev: '9x^2 - 4' }
  ];
  const k = pick(cases);
  const distract = cases.filter(c => c.dev !== k.dev).slice(0, 3).map(c => c.dev);
  // Ajout d'un piège : oublier de carré
  const { choices, correctIdx } = makeQCM([
    { html: `\\(${k.dev}\\)`, correct: true },
    ...distract.map(d => ({ html: `\\(${d}\\)`, correct: false }))
  ]);
  return {
    theme: 'algebre', title: 'Identité remarquable (a+b)(a−b)',
    body: `Développer : \\(${k.expr}\\).`,
    type: 'qcm', choices, correctIdx,
    solution: `Identité remarquable : \\((a+b)(a-b) = a^2 - b^2\\). Donc \\(${k.expr} = ${k.dev}\\).`,
    help: {
      cours: "Identité remarquable : <b>\\((a+b)(a-b) = a^2 - b^2\\)</b>. Appelée « différence de deux carrés ».",
      savoirFaire: "Reconnaître la forme \\((A+B)(A-B)\\), puis appliquer directement : carré du 1er − carré du 2e.",
      erreurs: ["Développer à la main (risque d'erreur).", "Oublier le carré.", "Confondre avec \\((a+b)^2 = a^2+2ab+b^2\\)."]
    }
  };
}

/* ==========================================================================
   THÈME 4 — FONCTIONS & LECTURE GRAPHIQUE
   ========================================================================== */

function t4_image_lineaire() {
  const a = pick([2,3,4,5,-2,-3]);
  const x = pick([2,3,4,5,-2,-3]);
  const y = a*x;
  return {
    theme: 'fonctions', title: 'Image — fonction linéaire',
    body: `Soit \\(f\\) la fonction linéaire de coefficient \\(${a}\\). Calculer \\(f(${x})\\).`,
    type: 'input', expected: String(y),
    solution: `\\(f(x) = ${a}x\\), donc \\(f(${x}) = ${a} \\times ${x} = ${y}\\).`,
    help: {
      cours: "Une <b>fonction linéaire</b> est de la forme \\(f(x) = ax\\). \\(a\\) est le <b>coefficient</b>.",
      savoirFaire: "Multiplier simplement \\(a\\) par la valeur donnée.",
      erreurs: ["Ajouter au lieu de multiplier.", "Se tromper de signe.", "Confondre avec affine."]
    }
  };
}

function t4_coefficient_lin() {
  const a = pick([2,3,5,-2,-3]);
  const x = pick([2,3,4]);
  const y = a*x;
  return {
    theme: 'fonctions', title: 'Coefficient d\'une fonction linéaire',
    body: `\\(f\\) est une fonction linéaire telle que \\(f(${x}) = ${y}\\). Quel est son coefficient ?`,
    type: 'input', expected: String(a),
    solution: `Pour une fonction linéaire \\(f(x) = ax\\), on a \\(a = f(${x})/${x} = ${y}/${x} = ${a}\\).`,
    help: {
      cours: "Si \\(f(x) = ax\\), alors \\(a = \\dfrac{f(x)}{x}\\) (pour \\(x \\neq 0\\)).",
      savoirFaire: "Diviser l'image par l'antécédent.",
      erreurs: ["Multiplier au lieu de diviser.", "Se tromper de signe.", "Confondre image et antécédent."]
    }
  };
}

function t4_fonction_affine() {
  const a = pick([2,3,-2,-3]);
  const b = pick([-3,-2,-1,1,2,3]);
  const x = pick([-2,-1,1,2,3]);
  const y = a*x + b;
  const fmtS = n => (n>=0?'+':'-') + ' ' + Math.abs(n);
  return {
    theme: 'fonctions', title: 'Image — fonction affine',
    body: `Soit \\(g(x) = ${a}x ${fmtS(b)}\\). Calculer \\(g(${x})\\).`,
    type: 'input', expected: String(y),
    solution: `\\(g(${x}) = ${a} \\times (${x}) ${fmtS(b)} = ${a*x} ${fmtS(b)} = ${y}\\).`,
    help: {
      cours: "Une <b>fonction affine</b> est de la forme \\(f(x) = ax+b\\).",
      savoirFaire: "Remplacer, multiplier, ajouter. Attention aux signes.",
      erreurs: ["Confondre avec linéaire (oublier \\(b\\)).", "Ne pas mettre les parenthèses pour \\(x\\) négatif."]
    }
  };
}

function t4_lecture_graphique() {
  const x0 = pick([6, 8]);
  const y0 = pick([10, 15]);
  const xF = pick([14, 16]);
  const yF = y0 + pick([10, 15]);
  const delta = yF - y0;
  // Courbe en escalier : montée, palier, descente vers valeur plus élevée
  const points = [[0, 5], [x0, y0], [xF, yF], [18, yF - 5]];
  const fig = svgGraph({
    xMax: 18, yMax: 35, xStep: 2, yStep: 5,
    points, xLabel: 'heures', yLabel: '°C',
    highlight: [[x0, y0], [xF, yF]]
  });
  return {
    theme: 'fonctions', title: 'Lecture graphique',
    body: `Le graphique ci-dessous donne la température (en °C) en fonction de l'heure. Entre ${x0} h et ${xF} h, de combien de degrés la température a-t-elle augmenté ?${fig}`,
    type: 'input', expected: String(delta), inputSuffix: '°C',
    solution: `À ${x0} h : ${y0} °C. À ${xF} h : ${yF} °C. Augmentation : ${yF} − ${y0} = ${delta} °C.`,
    help: {
      cours: "Pour lire une augmentation sur un graphique : lire les deux valeurs sur l'axe des ordonnées, puis faire la <b>différence</b> (valeur finale − valeur initiale).",
      savoirFaire: "Tracer mentalement les horizontales depuis les points vers l'axe des ordonnées. Utiliser les graduations pour lire précisément.",
      erreurs: ["Lire sur le mauvais axe.", "Lire une valeur seule au lieu de faire la différence.", "Additionner au lieu de soustraire."]
    }
  };
}

// Intersection de deux droites (avec coordonnées entières)
function t4_intersection_droites() {
  const cases = [
    { f: 'y = 2x + 1',  g: 'y = -x + 4', x: 1, y: 3 },
    { f: 'y = x + 2',   g: 'y = 3x - 2', x: 2, y: 4 },
    { f: 'y = -x + 5',  g: 'y = 2x - 1', x: 2, y: 3 },
    { f: 'y = 3x - 1',  g: 'y = x + 3',  x: 2, y: 5 },
    { f: 'y = -2x + 6', g: 'y = x',      x: 2, y: 2 }
  ];
  const k = pick(cases);
  const candidates = [
    [k.y, k.x], [k.x + 1, k.y], [k.x, k.y - 1],
    [k.x - 1, k.y + 1], [k.x, k.y + 1], [k.x + 1, k.y - 1]
  ];
  const seen = new Set([`${k.x},${k.y}`]);
  const distract = [];
  for (const p of candidates) {
    const key = p.join(',');
    if (!seen.has(key)) { seen.add(key); distract.push(p); }
    if (distract.length === 3) break;
  }
  const { choices, correctIdx } = makeQCM([
    { html: `\\((${k.x}\\,;\\,${k.y})\\)`, correct: true },
    ...distract.map(([x, y]) => ({ html: `\\((${x}\\,;\\,${y})\\)`, correct: false }))
  ]);
  return {
    theme: 'fonctions', title: 'Intersection de deux droites',
    body: `Dans un repère, les droites \\(${k.f}\\) et \\(${k.g}\\) se coupent en un point. Quelles sont ses coordonnées ?`,
    type: 'qcm', choices, correctIdx,
    solution: `On résout le système : on égalise les deux expressions. On trouve \\(x = ${k.x}\\), puis \\(y = ${k.y}\\). Le point d'intersection est \\((${k.x}\\,;\\,${k.y})\\).`,
    help: {
      cours: "Le <b>point d'intersection</b> de deux droites est la solution du système formé par leurs deux équations.",
      savoirFaire: "Égaliser les deux expressions de \\(y\\), résoudre pour \\(x\\), puis calculer \\(y\\) en remplaçant dans l'une des équations.",
      erreurs: ["Oublier de calculer \\(y\\) après avoir trouvé \\(x\\).", "Inverser abscisse et ordonnée dans le couple.", "Additionner les deux équations au lieu d'égaliser."]
    }
  };
}

// Lire a et b graphiquement sur une droite
function t4_ab_graphique() {
  const a = pick([-2, -1, 1, 2]);
  let b = pick([-2, -1, 1, 2, 3]);
  while (b === a) b = pick([-2, -1, 1, 2, 3]);
  const fig = svgRepereDroite({ a, b, xMax: 5, yMax: 6 });
  // Paires (a,b) distracteurs, garanties différentes du correct
  const correctPair = [a, b];
  const candidatePairs = [
    [b, a],          // swap a et b
    [-a, b],         // signe opposé pour a
    [a, -b],         // signe opposé pour b
    [-a, -b],        // les deux signes opposés
    [a + 1, b],      // a décalé
    [a, b + 1]       // b décalé
  ];
  const seen = new Set([correctPair.join(',')]);
  const distract = [];
  for (const p of candidatePairs) {
    const key = p.join(',');
    if (!seen.has(key)) { seen.add(key); distract.push(p); }
    if (distract.length === 3) break;
  }
  const { choices, correctIdx } = makeQCM([
    { html: `\\(a = ${a}\\) et \\(b = ${b}\\)`, correct: true },
    ...distract.map(([da, db]) => ({ html: `\\(a = ${da}\\) et \\(b = ${db}\\)`, correct: false }))
  ]);
  return {
    theme: 'fonctions', title: 'Déterminer a et b graphiquement',
    body: `La droite ci-dessous représente une fonction affine \\(f(x) = a\\,x + b\\). Quelles sont les valeurs de \\(a\\) et \\(b\\) ?${fig}`,
    type: 'qcm', choices, correctIdx,
    solution: `\\(b = ${b}\\) (ordonnée à l'origine, où la droite coupe l'axe des \\(y\\)). \\(a = ${a}\\) (coefficient directeur : quand \\(x\\) augmente de 1, \\(y\\) ${a >= 0 ? 'augmente' : 'diminue'} de ${Math.abs(a)}).`,
    help: {
      cours: "Pour \\(y = ax + b\\) : <b>\\(b\\)</b> = ordonnée à l'origine (où la droite coupe l'axe des \\(y\\)). <b>\\(a\\)</b> = coefficient directeur (la « pente »).",
      savoirFaire: "1) Lire \\(b\\) : point d'intersection avec l'axe des \\(y\\). 2) Lire \\(a\\) : prendre deux points entiers de la droite et compter de combien on monte quand on avance de 1.",
      erreurs: ["Intervertir \\(a\\) et \\(b\\).", "Se tromper de signe (droite descendante → \\(a < 0\\)).", "Lire sur le mauvais axe."]
    }
  };
}

// Modéliser une situation par une fonction affine
function t4_modelisation() {
  const cases = [
    { situation: "Un plombier facture 30 € de déplacement puis 40 € par heure de travail. \\(x\\) = nombre d'heures, \\(f(x)\\) = prix (€).",
      correct: '40x + 30', distracts: ['30x + 40', '70x', '40x - 30'] },
    { situation: "Un taxi demande 5 € à la prise en charge puis 2 € par km. \\(x\\) = nombre de km, \\(f(x)\\) = prix (€).",
      correct: '2x + 5',  distracts: ['5x + 2', '7x', '2x - 5'] },
    { situation: "Un abonnement coûte 15 € par mois, plus 0,20 € par SMS envoyé. \\(x\\) = nombre de SMS, \\(f(x)\\) = coût (€).",
      correct: '0{,}2\\,x + 15', distracts: ['15x + 0{,}2', '15{,}2\\,x', '0{,}2\\,x - 15'] },
    { situation: "Une salle de sport propose un abonnement annuel de 80 € et facture 3 € par séance. \\(x\\) = nombre de séances, \\(f(x)\\) = coût annuel (€).",
      correct: '3x + 80', distracts: ['80x + 3', '83x', '3x - 80'] }
  ];
  const k = pick(cases);
  const { choices, correctIdx } = makeQCM([
    { html: `\\(f(x) = ${k.correct}\\)`, correct: true },
    ...k.distracts.map(d => ({ html: `\\(f(x) = ${d}\\)`, correct: false }))
  ]);
  return {
    theme: 'fonctions', title: 'Modéliser par une fonction affine',
    body: `${k.situation} <br>Quelle est l'expression de \\(f(x)\\) ?`,
    type: 'qcm', choices, correctIdx,
    solution: `Partie <b>fixe</b> = ordonnée à l'origine \\(b\\). Partie <b>variable</b> (par unité) = coefficient directeur \\(a\\). D'où \\(f(x) = ${k.correct}\\).`,
    help: {
      cours: "Dans une situation « <b>coût fixe + coût variable × quantité</b> », la fonction est <b>affine</b> : \\(f(x) = ax + b\\), avec \\(a\\) = coût par unité et \\(b\\) = coût fixe.",
      savoirFaire: "Repérer dans l'énoncé ce qui ne dépend pas de \\(x\\) → \\(b\\). Ce qui se paie « par unité » → c'est \\(a\\), à multiplier par \\(x\\).",
      erreurs: ["Intervertir \\(a\\) et \\(b\\).", "Additionner les deux nombres au lieu d'écrire une somme.", "Oublier le terme constant \\(b\\)."]
    }
  };
}

/* ==========================================================================
   THÈME 5 — GÉOMÉTRIE : Pythagore, Thalès, périmètres/aires
   ========================================================================== */

function t5_pythagore_hypotenuse() {
  // Triplets pythagoriciens
  const cases = [
    { a:3, b:4, c:5 }, { a:6, b:8, c:10 },
    { a:5, b:12, c:13 }, { a:8, b:15, c:17 },
    { a:9, b:12, c:15 }
  ];
  const k = pick(cases);
  const fig = svgTriangleRect({
    labels: { A: 'A', B: 'B', C: 'C' },
    sides: { AB: `${k.a} cm`, BC: `${k.b} cm`, AC: '? cm' }
  });
  return {
    theme: 'geometrie', title: 'Pythagore — hypoténuse',
    body: `Le triangle ABC ci-dessous est rectangle en B, avec AB = ${k.a} cm et BC = ${k.b} cm. Calculer AC.${fig}`,
    type: 'input', expected: String(k.c), inputSuffix: 'cm',
    solution: `Théorème de Pythagore : AC² = AB² + BC² = ${k.a}² + ${k.b}² = ${k.a*k.a} + ${k.b*k.b} = ${k.a*k.a + k.b*k.b}. Donc AC = √${k.a*k.a + k.b*k.b} = ${k.c} cm.`,
    help: {
      cours: "<b>Théorème de Pythagore</b> : dans un triangle rectangle, le carré de l'hypoténuse (le plus grand côté, face à l'angle droit) = somme des carrés des deux autres côtés.",
      savoirFaire: "Repérer l'hypoténuse (face à l'angle droit), écrire \\(\\text{hyp}^2 = a^2 + b^2\\), puis extraire la racine carrée.",
      erreurs: ["Ajouter les côtés au lieu de leurs carrés.", "Se tromper de côté pour l'hypoténuse.", "Oublier la racine carrée."]
    }
  };
}

function t5_pythagore_cote() {
  const cases = [
    { hyp:5, a:3, b:4 }, { hyp:10, a:6, b:8 },
    { hyp:13, a:5, b:12 }, { hyp:17, a:8, b:15 }
  ];
  const k = pick(cases);
  return {
    theme: 'geometrie', title: 'Pythagore — côté manquant',
    body: `Dans un triangle rectangle, l'hypoténuse mesure ${k.hyp} cm et un des côtés de l'angle droit mesure ${k.a} cm. Quelle est la longueur de l'autre côté ?`,
    type: 'input', expected: String(k.b), inputSuffix: 'cm',
    solution: `\\(${k.hyp}^2 = ${k.a}^2 + x^2\\) donne \\(x^2 = ${k.hyp*k.hyp} - ${k.a*k.a} = ${k.b*k.b}\\), donc \\(x = ${k.b}\\) cm.`,
    help: {
      cours: "Pour trouver un côté de l'angle droit : \\(c^2 = \\text{hyp}^2 - a^2\\).",
      savoirFaire: "Soustraire (et non additionner), puis racine carrée.",
      erreurs: ["Ajouter au lieu de soustraire.", "Prendre l'hypoténuse pour un côté.", "Oublier la racine carrée."]
    }
  };
}

function t5_thales() {
  const cases = [
    { ab:4, ac:7, ad:2, r:'3,5' },
    { ab:3, ac:6, ad:2, r:'4' },
    { ab:4, ac:8, ad:3, r:'6' },
    { ab:5, ac:10, ad:3, r:'6' },
    { ab:6, ac:9, ad:2, r:'3' }
  ];
  const k = pick(cases);
  const fig = svgThales({ AB: k.ab, AC: k.ac, AD: k.ad });
  return {
    theme: 'geometrie', title: 'Théorème de Thalès',
    body: `Les droites (DE) et (BC) sont parallèles. On a AB = ${k.ab} cm, AC = ${k.ac} cm et AD = ${k.ad} cm. Calculer AE.${fig}`,
    type: 'input', expected: k.r, inputSuffix: 'cm',
    solution: `D'après Thalès : \\(\\dfrac{AD}{AB} = \\dfrac{AE}{AC}\\). Donc \\(AE = \\dfrac{AD \\times AC}{AB} = \\dfrac{${k.ad} \\times ${k.ac}}{${k.ab}} = ${k.r}\\) cm.`,
    help: {
      cours: "<b>Théorème de Thalès</b> : si deux droites sécantes sont coupées par deux parallèles, alors \\(\\dfrac{AD}{AB} = \\dfrac{AE}{AC} = \\dfrac{DE}{BC}\\).",
      savoirFaire: "Écrire la proportion, puis produit en croix pour isoler l'inconnue.",
      erreurs: ["Mal ordonner les points (numérateur = petit côté).", "Inverser les rapports.", "Oublier que les droites doivent être parallèles."]
    }
  };
}

function t5_perimetre_losange() {
  const c = pick([3, 4, 5, 6, 7, 8]);
  return {
    theme: 'geometrie', title: 'Périmètre d\'un losange',
    body: `Quel est le périmètre (en cm) d'un losange dont le côté mesure ${c} cm ?`,
    type: 'input', expected: String(4*c), inputSuffix: 'cm',
    solution: `Un losange a 4 côtés égaux : périmètre = \\(4 \\times ${c} = ${4*c}\\) cm.`,
    help: {
      cours: "Un <b>losange</b> est un quadrilatère dont les 4 côtés sont égaux. Son périmètre est \\(4 \\times c\\).",
      savoirFaire: "Multiplier la longueur du côté par 4.",
      erreurs: ["Confondre avec un carré (qui marche aussi).", "Multiplier par 2 au lieu de 4.", "Additionner uniquement 2 côtés."]
    }
  };
}

// Triangles semblables : rapport de similitude
function t5_triangles_semblables() {
  // Deux triangles ABC et A'B'C' semblables, avec AB, BC donnés et A'B' donné → trouver B'C'
  const cases = [
    { AB:3, BC:4, ApBp:6, BpCp:8 },   // rapport 2
    { AB:2, BC:5, ApBp:6, BpCp:15 },  // rapport 3
    { AB:4, BC:3, ApBp:8, BpCp:6 },   // rapport 2
    { AB:5, BC:7, ApBp:10, BpCp:14 }  // rapport 2
  ];
  const k = pick(cases);
  return {
    theme: 'geometrie', title: 'Triangles semblables',
    body: `Les triangles ABC et A'B'C' sont semblables. On a AB = ${k.AB} cm, BC = ${k.BC} cm et A'B' = ${k.ApBp} cm. Calculer B'C'.`,
    type: 'input', expected: String(k.BpCp), inputSuffix: 'cm',
    solution: `Les côtés sont proportionnels : \\(\\dfrac{A'B'}{AB} = \\dfrac{B'C'}{BC}\\). Donc B'C' = \\(\\dfrac{${k.ApBp} \\times ${k.BC}}{${k.AB}} = ${k.BpCp}\\) cm.`,
    help: {
      cours: "Deux triangles sont <b>semblables</b> si leurs angles sont deux à deux égaux. Alors les côtés sont <b>proportionnels</b> : \\(\\dfrac{A'B'}{AB} = \\dfrac{B'C'}{BC} = \\dfrac{A'C'}{AC}\\).",
      savoirFaire: "Écrire la proportion avec les côtés connus, produit en croix, isoler l'inconnue.",
      erreurs: ["Inverser numérateur et dénominateur.", "Se tromper de correspondance des côtés.", "Confondre avec Thalès (configuration différente)."]
    }
  };
}

function t5_angle_droit() {
  const cases = [
    { q:'Quelle est la mesure, en degrés, d\'un angle droit ?', r:'90', suffix:'°' },
    { q:'Quelle est la mesure, en degrés, d\'un angle plat ?', r:'180', suffix:'°' },
    { q:'Quelle est la mesure, en degrés, d\'un angle plein ?', r:'360', suffix:'°' }
  ];
  const k = pick(cases);
  return {
    theme: 'geometrie', title: 'Mesure d\'angles usuels',
    body: k.q,
    type: 'input', expected: k.r, inputSuffix: k.suffix,
    solution: `${k.q.replace('Quelle est la mesure, en degrés, d\'un ', 'Un ').replace(' ?',' mesure ')}${k.r}°.`,
    help: {
      cours: "Angles usuels : angle droit = 90°, angle plat = 180°, angle plein = 360°.",
      savoirFaire: "Visualiser : demi-tour = plat, tour complet = plein, quart de tour = droit.",
      erreurs: ["Confondre angle droit et angle plat.", "Donner un angle en radians."]
    }
  };
}

// Réciproque du théorème de Pythagore : 3 côtés donnés, le triangle est-il rectangle ?
function t5_pythagore_reciproque() {
  const cases = [
    { a:3, b:4, c:5,    rect:true },
    { a:5, b:12, c:13,  rect:true },
    { a:6, b:8, c:10,   rect:true },
    { a:4, b:5, c:6,    rect:false },
    { a:5, b:6, c:7,    rect:false },
    { a:8, b:9, c:12,   rect:false }
  ];
  const k = pick(cases);
  const hyp = Math.max(k.a, k.b, k.c);
  const others = [k.a, k.b, k.c].filter(x => x !== hyp);
  const lhs = others[0] * others[0] + others[1] * others[1];
  const rhs = hyp * hyp;
  const { choices, correctIdx } = makeQCM([
    { html: k.rect ? 'Oui, il est rectangle' : 'Non, il n\'est pas rectangle', correct: true },
    { html: k.rect ? 'Non, il n\'est pas rectangle' : 'Oui, il est rectangle', correct: false },
    { html: 'On ne peut pas savoir', correct: false },
    { html: 'Il est isocèle mais pas rectangle', correct: false }
  ]);
  return {
    theme: 'geometrie', title: 'Réciproque de Pythagore',
    body: `Un triangle a pour côtés ${k.a} cm, ${k.b} cm et ${k.c} cm. Ce triangle est-il rectangle ?`,
    type: 'qcm', choices, correctIdx,
    solution: `On teste avec le plus grand côté (${hyp}) comme hypothèse d'hypoténuse : \\(${hyp}^2 = ${rhs}\\) et \\(${others[0]}^2 + ${others[1]}^2 = ${lhs}\\). ${lhs === rhs ? 'Égalité vérifiée → le triangle <b>est</b> rectangle (d\'hypoténuse le plus grand côté).' : `${lhs} ≠ ${rhs} → le triangle <b>n'est pas</b> rectangle.`}`,
    help: {
      cours: "<b>Réciproque de Pythagore</b> : si dans un triangle le carré du plus grand côté est égal à la somme des carrés des deux autres, alors ce triangle est rectangle (le plus grand côté est l'hypoténuse).",
      savoirFaire: "1) Identifier le plus grand côté. 2) Calculer son carré. 3) Calculer la somme des carrés des deux autres. 4) Comparer.",
      erreurs: ["Tester avec le mauvais côté (pas le plus grand).", "Additionner les côtés au lieu des carrés.", "Conclure trop vite sans faire le test."]
    }
  };
}

/* Thalès — configuration "papillon" : 2 triangles opposés par leur sommet commun */
function svgThalesPapillon({ AB, AC, AM, AN } = {}) {
  const W = 340, H = 240;
  // Sommet S (point commun) au centre
  const Sx = W/2, Sy = H/2;
  // Triangle 1 (en haut à gauche) : S, B (en haut-gauche), C (en haut-droite)
  const Bx = 60, By = 40;
  const Cx = W - 60, Cy = 40;
  // Triangle 2 (en bas, inversé) : S, M (en bas-gauche, prolongement de SC), N (en bas-droite, prolongement de SB)
  const rB = AM / AB; // ratio pour M sur (SC prolongée)
  const rC = AN / AC;
  const Mx = Sx + (Sx - Cx) * rB;
  const My = Sy + (Sy - Cy) * rB;
  const Nx = Sx + (Sx - Bx) * rC;
  const Ny = Sy + (Sy - By) * rC;
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;height:auto;display:block;margin:10px auto;background:#fcfcfc;border:1px solid #ddd;border-radius:8px;">
    <line x1="${Bx}" y1="${By}" x2="${Nx.toFixed(1)}" y2="${Ny.toFixed(1)}" stroke="#333" stroke-width="1.5"/>
    <line x1="${Cx}" y1="${Cy}" x2="${Mx.toFixed(1)}" y2="${My.toFixed(1)}" stroke="#333" stroke-width="1.5"/>
    <line x1="${Bx}" y1="${By}" x2="${Cx}" y2="${Cy}" stroke="#2b5fd6" stroke-width="2"/>
    <line x1="${Mx.toFixed(1)}" y1="${My.toFixed(1)}" x2="${Nx.toFixed(1)}" y2="${Ny.toFixed(1)}" stroke="#2b5fd6" stroke-width="2"/>
    ${perpTick(Bx,By,Cx,Cy,1)}
    ${perpTick(Mx,My,Nx,Ny,1)}
    <circle cx="${Sx}" cy="${Sy}" r="3" fill="#333"/>
    <circle cx="${Bx}" cy="${By}" r="3" fill="#333"/>
    <circle cx="${Cx}" cy="${Cy}" r="3" fill="#333"/>
    <circle cx="${Mx.toFixed(1)}" cy="${My.toFixed(1)}" r="3" fill="#333"/>
    <circle cx="${Nx.toFixed(1)}" cy="${Ny.toFixed(1)}" r="3" fill="#333"/>
    <text x="${Sx+8}" y="${Sy-6}" font-size="14" font-weight="700">S</text>
    <text x="${Bx-10}" y="${By-4}" font-size="14" font-weight="700" text-anchor="end">B</text>
    <text x="${Cx+10}" y="${Cy-4}" font-size="14" font-weight="700">C</text>
    <text x="${(Mx+10).toFixed(1)}" y="${(My+14).toFixed(1)}" font-size="14" font-weight="700">M</text>
    <text x="${(Nx-10).toFixed(1)}" y="${(Ny+14).toFixed(1)}" font-size="14" font-weight="700" text-anchor="end">N</text>
  </svg>`;
}

function t5_thales_papillon() {
  const cases = [
    { AB:4, AC:6, AM:2, AN:3, SM_val:'3' }, // SN = (AN / AC) * something... simpler: use direct ratio
    { AB:3, AC:5, AM:2, AN:'?', ans:'10/3' }
  ];
  // Version simple : SB = 3, SC = 6, SM = 2, chercher SN
  // SB/SM = SC/SN → SN = SM × SC / SB
  const SB = pick([3, 4, 6]);
  const SC = pick([6, 8, 9]);
  const SM = pick([2, 3]);
  const SN = SM * SC / SB;
  if (!Number.isInteger(SN * 10)) return t5_thales_papillon();
  const fig = svgThalesPapillon({ AB: SB, AC: SC, AM: SM, AN: SN });
  return {
    theme: 'geometrie', title: 'Thalès — configuration papillon',
    body: `Sur la figure (configuration « papillon »), les droites (BC) et (MN) sont parallèles. On a SB = ${SB} cm, SC = ${SC} cm et SM = ${SM} cm. Calculer SN.${fig}`,
    type: 'input', expected: String(SN).replace('.', ','), inputSuffix: 'cm',
    solution: `Configuration papillon : \\(\\dfrac{SM}{SB} = \\dfrac{SN}{SC}\\). Donc \\(SN = \\dfrac{SM \\times SC}{SB} = \\dfrac{${SM} \\times ${SC}}{${SB}} = ${SN}\\) cm.`,
    help: {
      cours: "Configuration <b>« papillon »</b> : deux triangles opposés par un sommet commun avec deux parallèles. Les rapports <b>SM/SB = SN/SC = MN/BC</b>.",
      savoirFaire: "Repérer le sommet commun (S), puis écrire la proportion en mettant les longueurs du même « côté » du papillon en numérateur.",
      erreurs: ["Inverser les rapports.", "Confondre avec la config classique (triangle imbriqué).", "Oublier que les droites doivent être parallèles."]
    }
  };
}

function t5_thales_reciproque() {
  // Configuration classique : A, B sur une droite, C sur l'autre, M sur [AB], N sur [AC]. Tester (MN) // (BC) ?
  const cases = [
    { AM:2, AB:6, AN:3, AC:9,  para:true },   // 2/6 = 1/3 et 3/9 = 1/3 → //
    { AM:2, AB:5, AN:4, AC:10, para:true },   // 2/5 = 4/10 → //
    { AM:3, AB:6, AN:2, AC:5,  para:false },  // 1/2 ≠ 2/5
    { AM:2, AB:5, AN:3, AC:8,  para:false }
  ];
  const k = pick(cases);
  const { choices, correctIdx } = makeQCM([
    { html: k.para ? 'Les droites (MN) et (BC) sont parallèles' : 'Les droites (MN) et (BC) ne sont pas parallèles', correct: true },
    { html: k.para ? 'Les droites (MN) et (BC) ne sont pas parallèles' : 'Les droites (MN) et (BC) sont parallèles', correct: false },
    { html: 'On ne peut pas conclure', correct: false },
    { html: 'Les droites sont perpendiculaires', correct: false }
  ]);
  return {
    theme: 'geometrie', title: 'Réciproque de Thalès',
    body: `Les points A, M, B sont alignés dans cet ordre et A, N, C aussi. On a AM = ${k.AM}, AB = ${k.AB}, AN = ${k.AN} et AC = ${k.AC} (en cm). Que peut-on dire de (MN) et (BC) ?`,
    type: 'qcm', choices, correctIdx,
    solution: `On calcule : \\(\\dfrac{AM}{AB} = \\dfrac{${k.AM}}{${k.AB}}\\) et \\(\\dfrac{AN}{AC} = \\dfrac{${k.AN}}{${k.AC}}\\). ${k.para ? 'Les deux rapports sont égaux → par la réciproque de Thalès, (MN) // (BC).' : 'Les deux rapports ne sont pas égaux → (MN) et (BC) ne sont pas parallèles.'}`,
    help: {
      cours: "<b>Réciproque de Thalès</b> : si A, M, B sont alignés dans cet ordre, A, N, C aussi, et si \\(\\dfrac{AM}{AB} = \\dfrac{AN}{AC}\\), alors (MN) est parallèle à (BC).",
      savoirFaire: "Calculer les deux rapports et les comparer (en simplifiant les fractions).",
      erreurs: ["Intervertir numérateurs et dénominateurs.", "Confondre avec le théorème direct (parallèles déjà donnés).", "Oublier la condition d'alignement."]
    }
  };
}

/* ==========================================================================
   THÈME — ANGLES (somme, supplémentaires, opposés, alternes-internes, correspondants)
   ========================================================================== */

function svgDeuxSecantes({ angleDeg = 40 } = {}) {
  const W = 300, H = 200, cx = W/2, cy = H/2, L = 110;
  const rad = angleDeg * Math.PI / 180;
  // droite 1 horizontale
  const d1 = { x1: cx - L, y1: cy, x2: cx + L, y2: cy };
  // droite 2 inclinée
  const d2 = { x1: cx - L*Math.cos(rad), y1: cy + L*Math.sin(rad), x2: cx + L*Math.cos(rad), y2: cy - L*Math.sin(rad) };
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;height:auto;display:block;margin:10px auto;background:#fcfcfc;border:1px solid #ddd;border-radius:8px;">
    <line x1="${d1.x1}" y1="${d1.y1}" x2="${d1.x2}" y2="${d1.y2}" stroke="#333" stroke-width="1.5"/>
    <line x1="${d2.x1.toFixed(1)}" y1="${d2.y1.toFixed(1)}" x2="${d2.x2.toFixed(1)}" y2="${d2.y2.toFixed(1)}" stroke="#333" stroke-width="1.5"/>
    <circle cx="${cx}" cy="${cy}" r="3" fill="#333"/>
    <text x="${cx+10}" y="${cy+15}" font-size="13" font-weight="700">O</text>
    <text x="${cx+35}" y="${cy-8}" font-size="13" fill="#c4342a">${angleDeg}°</text>
    <text x="${cx-35}" y="${cy+22}" font-size="13" fill="#2b5fd6">?</text>
  </svg>`;
}

function svgParallelesSecante({ angleDeg = 55, typeRelation = 'alternes' } = {}) {
  const W = 340, H = 240;
  // Deux parallèles horizontales
  const y1 = 60, y2 = 180;
  // Sécante passant par (midX, y1) et un point sur y2, formant angle `angleDeg` avec d₁ au point A
  const rad = angleDeg * Math.PI / 180;
  const Ax = W / 2;
  const Ay = y1;
  // Vecteur directeur de la sécante (du côté bas-droite)
  const dx = Math.cos(rad), dy = Math.sin(rad);
  // B = intersection avec d₂ (en descendant)
  const tB = (y2 - Ay) / dy;
  const Bx = Ax + dx * tB;
  const By = y2;
  // Prolongement de la sécante aux 2 bouts
  const tStart = -70 / Math.hypot(dx, dy);
  const tEnd = (tB + 70 / Math.hypot(dx, dy));
  const Sx1 = Ax + dx * tStart, Sy1 = Ay + dy * tStart;
  const Sx2 = Ax + dx * tEnd,   Sy2 = Ay + dy * tEnd;
  const otherAng = 180 - angleDeg;

  // Arcs des angles :
  // À A : 4 angles. α₁ = haut-gauche (entre ← d₁ et ↑ sécante) = angleDeg
  //                α₂ = haut-droite (entre → d₁ et ↑ sécante) = 180 - angleDeg
  //                α₃ = bas-droite (entre → d₁ et ↓ sécante) = angleDeg (opposé de α₁)
  //                α₄ = bas-gauche (entre ← d₁ et ↓ sécante) = 180 - angleDeg
  // À B : de même.
  // On marque 110° (ou angleDeg, ici appelé "marqué") à la position α₁ (haut-gauche de A).
  // Correspondant : β₁ (haut-gauche de B) → même mesure.
  // Alterne-interne : β₂ (haut-droite de B, interne, opposé par rapport à sécante et entre parallèles).

  // Fonction pour tracer un arc à (cx, cy) entre deux directions angleStart→angleEnd en radians, rayon r
  function arc(cx, cy, aStart, aEnd, r, color) {
    // SVG: paths y-down. Les angles en maths standards: 0=droite, π/2=haut. En SVG on inverse y.
    const p1x = cx + r * Math.cos(aStart), p1y = cy - r * Math.sin(aStart);
    const p2x = cx + r * Math.cos(aEnd),   p2y = cy - r * Math.sin(aEnd);
    // Normaliser l'angle parcouru
    let delta = aEnd - aStart;
    while (delta <= -Math.PI) delta += 2*Math.PI;
    while (delta > Math.PI) delta -= 2*Math.PI;
    const largeArc = Math.abs(delta) > Math.PI ? 1 : 0;
    const sweep = delta < 0 ? 1 : 0; // SVG sweep: 0 = anti-horaire (math), 1 = horaire
    return `<path d="M ${p1x.toFixed(1)} ${p1y.toFixed(1)} A ${r} ${r} 0 ${largeArc} ${sweep} ${p2x.toFixed(1)} ${p2y.toFixed(1)}" stroke="${color}" stroke-width="2" fill="none"/>`;
  }

  // Direction d₁ vers la droite = 0 rad (math), vers la gauche = π
  // Direction sécante vers le haut = angleDeg en maths par rapport à l'axe OX
  // Mais attention : la sécante va de A vers le haut (SVG y diminue = math y augmente)
  // En notation maths : secante direction "haut" depuis A = angle (π - angleDeg) si la sécante monte vers la gauche.
  // Puisque dx = cos(angleDeg), dy = sin(angleDeg) en SVG (y augmente vers bas) :
  //   direction "vers le bas" = angle -angleDeg en math (sous l'axe horizontal, à droite)
  //   direction "vers le haut" = π - angleDeg en math (au-dessus axe, à gauche)

  // α₁ (haut-gauche de A) : entre d₁ vers la gauche (π) et sécante vers le haut (π - angleDeg)
  const alpha1Start = Math.PI, alpha1End = Math.PI - (angleDeg * Math.PI / 180);
  // β (correspondant) : entre d₂ vers la gauche et sécante vers le haut (au point B)
  const beta1Start = Math.PI, beta1End = Math.PI - (angleDeg * Math.PI / 180);
  // β (alterne-interne) : en B, entre d₂ vers la droite (0) et sécante vers le haut (π - angleDeg) côté droit
  //   = entre 0 et +angleDeg ? Non, on veut l'angle entre → et la sécante au-dessus à DROITE de la sécante
  //   en B, "haut-droite" = entre sécante vers le haut (π - angleDeg) et d₂ vers la droite (0)
  const beta2Start = 0, beta2End = Math.PI - (angleDeg * Math.PI / 180);

  const rArc = 22;

  let arcsA = '';
  arcsA += arc(Ax, Ay, alpha1Start, alpha1End, rArc, '#c4342a');

  let arcsB = '';
  let labelX_pos, labelMeasure;
  if (typeRelation === 'correspondants') {
    // Arc sur β₁ à B (haut-gauche)
    arcsB += arc(Bx, By, beta1Start, beta1End, rArc, '#2b5fd6');
    // Position de l'étiquette x dans l'arc β₁ (haut-gauche de B)
    labelX_pos = { x: Bx - rArc - 8, y: By - 4 };
  } else {
    // Alternes-internes : arc sur β₂ (haut-droite de B)
    arcsB += arc(Bx, By, beta2Start, beta2End, rArc, '#2b5fd6');
    labelX_pos = { x: Bx + 8, y: By - 6 };
  }
  const labelMeasure_pos = { x: Ax - rArc - 10, y: Ay - 6 };

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;height:auto;display:block;margin:10px auto;background:#fcfcfc;border:1px solid #ddd;border-radius:8px;">
    <line x1="20" y1="${y1}" x2="${W-20}" y2="${y1}" stroke="#333" stroke-width="1.5"/>
    <line x1="20" y1="${y2}" x2="${W-20}" y2="${y2}" stroke="#333" stroke-width="1.5"/>
    ${perpTick(20, y1, W-20, y1, 2, '#2b5fd6')}
    ${perpTick(20, y2, W-20, y2, 2, '#2b5fd6')}
    <line x1="${Sx1.toFixed(1)}" y1="${Sy1.toFixed(1)}" x2="${Sx2.toFixed(1)}" y2="${Sy2.toFixed(1)}" stroke="#555" stroke-width="1.5"/>
    ${arcsA}
    ${arcsB}
    <circle cx="${Ax.toFixed(1)}" cy="${Ay}" r="3" fill="#333"/>
    <circle cx="${Bx.toFixed(1)}" cy="${By}" r="3" fill="#333"/>
    <text x="${(Ax+8).toFixed(1)}" y="${Ay-8}" font-size="14" font-weight="700">A</text>
    <text x="${(Bx-16).toFixed(1)}" y="${By+16}" font-size="14" font-weight="700">B</text>
    <text x="${W-44}" y="${y1-8}" font-size="13" font-weight="700" fill="#2b5fd6">(d₁)</text>
    <text x="${W-44}" y="${y2+18}" font-size="13" font-weight="700" fill="#2b5fd6">(d₂)</text>
    <text x="${labelMeasure_pos.x}" y="${labelMeasure_pos.y}" font-size="14" fill="#c4342a" font-weight="700" text-anchor="end">${angleDeg}°</text>
    <text x="${labelX_pos.x.toFixed(1)}" y="${labelX_pos.y.toFixed(1)}" font-size="14" fill="#2b5fd6" font-weight="700" text-anchor="${typeRelation === 'correspondants' ? 'end' : 'start'}">x</text>
  </svg>`;
}

function tA_somme_triangle() {
  const a = randInt(30, 80);
  const b = randInt(30, 180 - a - 20);
  const c = 180 - a - b;
  return {
    theme: 'angles', title: 'Somme des angles d\'un triangle',
    body: `Dans un triangle, deux angles mesurent ${a}° et ${b}°. Quelle est la mesure du troisième angle ?`,
    type: 'input', expected: String(c), inputSuffix: '°',
    solution: `La somme des angles d'un triangle vaut 180°. Donc le 3e angle = \\(180 - ${a} - ${b} = ${c}°\\).`,
    help: {
      cours: "La somme des angles d'un triangle est toujours égale à <b>180°</b>.",
      savoirFaire: "Additionner les deux angles connus, puis soustraire le résultat de 180°.",
      erreurs: ["Utiliser 360° (somme d'un quadrilatère).", "Additionner au lieu de soustraire.", "Oublier de soustraire les deux angles."]
    }
  };
}

function tA_supplementaires() {
  const a = pick([30, 45, 60, 70, 110, 120, 135, 150]);
  const c = 180 - a;
  return {
    theme: 'angles', title: 'Angles supplémentaires',
    body: `Deux angles sont supplémentaires. L'un mesure ${a}°. Quelle est la mesure de l'autre ?`,
    type: 'input', expected: String(c), inputSuffix: '°',
    solution: `Deux angles supplémentaires ont une somme de 180° : \\(180 - ${a} = ${c}°\\).`,
    help: {
      cours: "Deux angles sont <b>supplémentaires</b> si leur somme vaut 180°. Deux angles sont <b>complémentaires</b> si leur somme vaut 90°.",
      savoirFaire: "Pour supplémentaires : soustraire de 180°. Pour complémentaires : soustraire de 90°.",
      erreurs: ["Confondre complémentaires (90°) et supplémentaires (180°).", "Utiliser 360°."]
    }
  };
}

function tA_opposes_sommet() {
  const a = pick([35, 45, 55, 65, 75, 110, 130]);
  const fig = svgDeuxSecantes({ angleDeg: a });
  return {
    theme: 'angles', title: 'Angles opposés par le sommet',
    body: `Deux droites se coupent en O. Un des angles formés mesure ${a}°. L'angle marqué « ? » lui est opposé par le sommet. Que vaut-il ?${fig}`,
    type: 'input', expected: String(a), inputSuffix: '°',
    solution: `Deux angles <b>opposés par le sommet</b> ont <b>la même mesure</b>. Donc ? = ${a}°.`,
    help: {
      cours: "Quand deux droites se coupent, elles forment 4 angles. Deux angles <b>opposés par le sommet</b> sont deux angles qui se font face et ils ont <b>la même mesure</b>.",
      savoirFaire: "Repérer la paire d'angles qui se font face de part et d'autre du point d'intersection.",
      erreurs: ["Confondre avec angles adjacents (somme 180°).", "Faire 180−angle.", "Confondre avec angles supplémentaires."]
    }
  };
}

function tA_alternes_correspondants() {
  const a = pick([40, 55, 65, 70, 110, 125]);
  const type = pick(['alternes-internes', 'correspondants']);
  // Les deux relations donnent le même angle (= a°) si les droites sont parallèles
  const fig = svgParallelesSecante({ angleDeg: a, typeRelation: type });
  return {
    theme: 'angles', title: `Angles ${type}`,
    body: `Les droites (d₁) et (d₂) sont parallèles, coupées par une sécante aux points A et B. L'angle marqué en rouge en A mesure ${a}°. L'angle marqué « x » en bleu en B est ${type === 'alternes-internes' ? 'son alterne-interne' : 'son correspondant'}. Que vaut x ?${fig}`,
    type: 'input', expected: String(a), inputSuffix: '°',
    solution: `Quand deux droites sont <b>parallèles</b>, les angles ${type} sont <b>égaux</b>. Donc x = ${a}°.`,
    help: {
      cours: "Avec <b>deux droites parallèles</b> coupées par une sécante : les angles <b>alternes-internes</b> sont égaux ; les angles <b>correspondants</b> sont égaux.",
      savoirFaire: "Alternes-internes : de part et d'autre de la sécante, entre les deux parallèles. Correspondants : du même côté de la sécante, l'un avant l'une des parallèles, l'autre après.",
      erreurs: ["Prendre 180−angle (erreur de position).", "Confondre avec alternes-externes.", "Oublier que le parallélisme est nécessaire."]
    }
  };
}

/* ==========================================================================
   THÈME 6 — TRIGONOMÉTRIE (cos, sin, tan dans triangle rectangle)
   ========================================================================== */

function t6_angles_complementaires() {
  // Q5 Brevet 0 A : triangle rectangle, calculer l'autre angle aigu
  const a = pick([25, 30, 35, 40, 45, 50, 55, 60, 65]);
  return {
    theme: 'geometrie', title: 'Angles complémentaires',
    body: `Dans un triangle ABC rectangle en B, on a \\(\\widehat{A} = ${a}°\\). Que vaut \\(\\widehat{C}\\) en degrés ?`,
    type: 'input', expected: String(90-a), inputSuffix: '°',
    solution: `Dans un triangle, la somme des angles = 180°. Avec l'angle droit en B : \\(\\widehat{A} + \\widehat{C} = 90°\\), donc \\(\\widehat{C} = 90 - ${a} = ${90-a}°\\).`,
    help: {
      cours: "Dans un triangle : somme des 3 angles = 180°. Si l'un vaut 90° (droit), les deux autres sont <b>complémentaires</b> (somme 90°).",
      savoirFaire: "Faire \\(90 - \\widehat{A}\\) pour trouver \\(\\widehat{C}\\) dans un triangle rectangle en B.",
      erreurs: ["Faire \\(180 - \\widehat{A}\\).", "Oublier l'angle droit.", "Confondre avec la somme 180°."]
    }
  };
}

function t6_cos_formule() {
  // Q6 Brevet 0 A : quel calcul pour cos(ABC) ?
  // Dans ABC rectangle en A, cos(ABC) = côté adjacent à B / hypoténuse = AB/BC
  const { choices, correctIdx } = makeQCM([
    { html: 'AB / BC', correct: true },
    { html: 'AC / BC', correct: false },
    { html: 'AB / AC', correct: false },
    { html: 'BC / AB', correct: false }
  ]);
  return {
    theme: 'geometrie', title: 'Formule du cosinus',
    body: `Dans un triangle ABC rectangle en A, quel calcul permet de déterminer le cosinus de l'angle \\(\\widehat{ABC}\\) ?`,
    type: 'qcm', choices, correctIdx,
    solution: `\\(\\cos(\\widehat{B}) = \\dfrac{\\text{côté adjacent à B}}{\\text{hypoténuse}} = \\dfrac{AB}{BC}\\). L'hypoténuse est toujours le côté opposé à l'angle droit.`,
    help: {
      cours: "Dans un triangle rectangle : <b>cos = adjacent / hypoténuse</b>, <b>sin = opposé / hypoténuse</b>, <b>tan = opposé / adjacent</b> (mnémonique : SOH-CAH-TOA).",
      savoirFaire: "Identifier l'hypoténuse (face à l'angle droit), puis repérer côté adjacent (touche l'angle) et côté opposé.",
      erreurs: ["Confondre cos et sin.", "Se tromper d'hypoténuse.", "Confondre côté adjacent et opposé."]
    }
  };
}

function t6_choisir_formule() {
  const cases = [
    { connu:'adjacent et hypoténuse', formule:'cos', correct: 'cos' },
    { connu:'opposé et hypoténuse', formule:'sin', correct: 'sin' },
    { connu:'opposé et adjacent', formule:'tan', correct: 'tan' }
  ];
  const k = pick(cases);
  const { choices, correctIdx } = makeQCM([
    { html: k.correct, correct: true },
    ...['cos','sin','tan'].filter(f => f !== k.correct).map(f => ({ html: f, correct: false })),
    { html: 'Pythagore', correct: false }
  ].slice(0, 4));
  return {
    theme: 'geometrie', title: 'Choisir la bonne formule',
    body: `Dans un triangle rectangle, on connaît les côtés ${k.connu}. Pour calculer un angle aigu, on utilise :`,
    type: 'qcm', choices, correctIdx,
    solution: `cos = adj/hyp, sin = opp/hyp, tan = opp/adj. Ici on connaît ${k.connu}, donc on utilise <b>${k.correct}</b>.`,
    help: {
      cours: "SOH-CAH-TOA : <b>S</b>in = <b>O</b>pposé/<b>H</b>ypoténuse, <b>C</b>os = <b>A</b>djacent/<b>H</b>ypoténuse, <b>T</b>an = <b>O</b>pposé/<b>A</b>djacent.",
      savoirFaire: "Identifier les deux côtés connus, puis trouver la formule qui les utilise.",
      erreurs: ["Confondre les 3 formules.", "Se tromper de catégorie de côté."]
    }
  };
}

function t6_identifier_cote() {
  const cas = pick([
    { question: "l'hypoténuse", correct: 'BC', distracts: ['AB', 'AC', 'aucun'] },
    { question: "le côté adjacent à l'angle B", correct: 'AB', distracts: ['AC', 'BC', 'aucun'] },
    { question: "le côté opposé à l'angle B", correct: 'AC', distracts: ['AB', 'BC', 'aucun'] }
  ]);
  const { choices, correctIdx } = makeQCM([
    { html: cas.correct, correct: true },
    ...cas.distracts.map(d => ({ html: d, correct: false }))
  ]);
  return {
    theme: 'geometrie', title: 'Identifier un côté',
    body: `Soit ABC un triangle rectangle en A. Quel côté est ${cas.question} ?`,
    type: 'qcm', choices, correctIdx,
    solution: `Dans un triangle rectangle : hypoténuse = côté face à l'angle droit. Pour l'angle en B : adjacent = côté touchant B qui n'est pas l'hypoténuse ; opposé = côté qui ne touche pas B.`,
    help: {
      cours: "<b>Hypoténuse</b> : côté face à l'angle droit. <b>Adjacent</b> à un angle : le côté qui touche cet angle (et n'est pas l'hypoténuse). <b>Opposé</b> à un angle : le côté qui ne touche pas cet angle.",
      savoirFaire: "Repérer d'abord l'angle droit, puis l'hypoténuse (en face).",
      erreurs: ["Confondre adjacent et opposé.", "Prendre l'hypoténuse pour un côté de l'angle droit."]
    }
  };
}

// Écrire le rapport trigo : dans ABC rectangle en A, sin(B) = ?
function t6_ecrire_rapport() {
  // Pour angle en B dans ABC rectangle en A :
  //   cos(B) = adj/hyp = AB/BC
  //   sin(B) = opp/hyp = AC/BC
  //   tan(B) = opp/adj = AC/AB
  const fonction = pick(['cos', 'sin', 'tan']);
  const formules = {
    cos: { ans: 'AB / BC', desc: 'cos = adjacent / hypoténuse' },
    sin: { ans: 'AC / BC', desc: 'sin = opposé / hypoténuse' },
    tan: { ans: 'AC / AB', desc: 'tan = opposé / adjacent' }
  };
  const f = formules[fonction];
  const allAns = ['AB / BC', 'AC / BC', 'AC / AB', 'BC / AB'];
  const { choices, correctIdx } = makeQCM([
    { html: f.ans, correct: true },
    ...allAns.filter(x => x !== f.ans).map(x => ({ html: x, correct: false }))
  ]);
  return {
    theme: 'geometrie', title: `Écrire un rapport trigonométrique`,
    body: `Dans un triangle ABC rectangle en A, \\(\\${fonction}(\\widehat{B})\\) est égal à :`,
    type: 'qcm', choices, correctIdx,
    solution: `${f.desc}. Pour l'angle en B : côté adjacent = AB, côté opposé = AC, hypoténuse = BC. Donc \\(\\${fonction}(\\widehat{B}) = ${f.ans.replace(/ /g, '')}\\).`,
    help: {
      cours: "<b>SOH-CAH-TOA</b> : <b>S</b>in = <b>O</b>pposé/<b>H</b>ypoténuse ; <b>C</b>os = <b>A</b>djacent/<b>H</b>ypoténuse ; <b>T</b>an = <b>O</b>pposé/<b>A</b>djacent.",
      savoirFaire: "1) Repérer hypoténuse (face à l'angle droit). 2) Pour l'angle cherché : identifier adjacent (touche l'angle) et opposé (ne touche pas). 3) Écrire le rapport.",
      erreurs: ["Inverser numérateur et dénominateur.", "Confondre adjacent et opposé.", "Utiliser la mauvaise fonction (cos au lieu de sin, etc.)."]
    }
  };
}

// Quelle formule utiliser pour trouver un côté/angle selon les données
function t6_choix_formule_cote() {
  const cases = [
    { connu:'l\'hypoténuse', cherche:'le côté adjacent', f:'cos' },
    { connu:'l\'hypoténuse', cherche:'le côté opposé',   f:'sin' },
    { connu:'le côté adjacent', cherche:'le côté opposé', f:'tan' },
    { connu:'le côté opposé', cherche:'l\'hypoténuse', f:'sin' },
    { connu:'le côté adjacent', cherche:'l\'hypoténuse', f:'cos' }
  ];
  const k = pick(cases);
  const { choices, correctIdx } = makeQCM([
    { html: k.f, correct: true },
    ...['cos','sin','tan'].filter(x => x !== k.f).map(x => ({ html: x, correct: false })),
    { html: 'Pythagore', correct: false }
  ].slice(0, 4));
  return {
    theme: 'geometrie', title: 'Quelle formule utiliser ?',
    body: `Dans un triangle rectangle, on connaît un angle aigu et ${k.connu}. Pour calculer ${k.cherche}, on utilise :`,
    type: 'qcm', choices, correctIdx,
    solution: `On utilise la formule qui relie l'angle, le côté connu et le côté cherché. Ici : <b>${k.f}</b>.`,
    help: {
      cours: "SOH-CAH-TOA — selon les 2 côtés en jeu : opp+hyp → sin ; adj+hyp → cos ; opp+adj → tan.",
      savoirFaire: "1) Identifier le type des 2 côtés (adj/opp/hyp). 2) Choisir sin/cos/tan selon la paire.",
      erreurs: ["Confondre les trois formules.", "Utiliser Pythagore (qui ne relie pas un angle)."]
    }
  };
}

/* ==========================================================================
   THÈME 7 — TRANSFORMATIONS GÉOMÉTRIQUES
   ==========================================================================
   Approche : une forme « F » asymétrique (pour distinguer retournement, rotation)
   est transformée, et l'élève identifie la transformation grâce à la figure.
   ========================================================================== */

// Forme "F" stylisée (10 sommets, 30 x 40)
const F_BASE = [[0,0],[30,0],[30,6],[6,6],[6,18],[20,18],[20,24],[6,24],[6,40],[0,40]];
const tTranslate = (pts, tx, ty) => pts.map(([x,y]) => [x+tx, y+ty]);
const tScale = (pts, sx, sy, cx=0, cy=0) => pts.map(([x,y]) => [(x-cx)*sx + cx, (y-cy)*sy + cy]);
const tReflectV = (pts, axisX) => pts.map(([x,y]) => [2*axisX - x, y]);
const tRotate = (pts, deg, cx=0, cy=0) => {
  const r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
  return pts.map(([x,y]) => {
    const dx = x - cx, dy = y - cy;
    return [cx + dx*c - dy*s, cy + dx*s + dy*c];
  });
};
const tStr = pts => pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');

// Identifier une transformation : figure visuelle + QCM
function t7_identifier_transfo() {
  const W = 360, H = 200;
  const type = pick(['symetrie', 'symCentrale', 'translation', 'rotation', 'homothetie']);
  let content = '', correctLabel, solutionDesc;
  if (type === 'symCentrale') {
    // Symétrie centrale = rotation de 180° autour d'un point O
    const cx = 180, cy = 100;
    const orig = tTranslate(F_BASE, 55, 35);
    const img = tRotate(orig, 180, cx, cy);
    content = `
      <polygon points="${tStr(orig)}" fill="#cfe1ff" stroke="#2b5fd6" stroke-width="1.5" stroke-linejoin="round"/>
      <polygon points="${tStr(img)}" fill="#ffe1c9" stroke="#c4342a" stroke-width="1.5" stroke-linejoin="round"/>
      <circle cx="${cx}" cy="${cy}" r="4" fill="#c4342a"/>
      <text x="${cx-14}" y="${cy+5}" font-size="13" font-weight="700" fill="#c4342a">O</text>
      <line x1="${orig[0][0]}" y1="${orig[0][1]}" x2="${img[0][0].toFixed(1)}" y2="${img[0][1].toFixed(1)}" stroke="#c4342a" stroke-dasharray="3 2" opacity="0.55"/>`;
    correctLabel = 'une symétrie centrale';
    solutionDesc = `La figure orange est obtenue par un <b>demi-tour</b> de la bleue autour du point O (chaque point et son image sont alignés avec O, à même distance). C'est une <b>symétrie centrale</b>.`;
  } else if (type === 'symetrie') {
    const axisX = 180;
    const orig = tTranslate(F_BASE, 95, 80);
    const img = tReflectV(orig, axisX);
    content = `
      <line x1="${axisX}" y1="15" x2="${axisX}" y2="${H-15}" stroke="#c4342a" stroke-width="1.5" stroke-dasharray="6 4"/>
      <text x="${axisX+6}" y="${H-8}" font-size="13" fill="#c4342a" font-style="italic">(d)</text>
      <polygon points="${tStr(orig)}" fill="#cfe1ff" stroke="#2b5fd6" stroke-width="1.5" stroke-linejoin="round"/>
      <polygon points="${tStr(img)}" fill="#ffe1c9" stroke="#c4342a" stroke-width="1.5" stroke-linejoin="round"/>`;
    correctLabel = 'une symétrie axiale';
    solutionDesc = `L'axe (d) (pointillé) sépare les deux figures en miroir — c'est une <b>symétrie axiale</b>.`;
  } else if (type === 'translation') {
    const orig = tTranslate(F_BASE, 45, 85);
    const img = tTranslate(orig, 170, 15);
    const [x1,y1] = orig[0], [x2,y2] = img[0];
    content = `
      <defs><marker id="arrow-trans" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="#c4342a"/></marker></defs>
      <polygon points="${tStr(orig)}" fill="#cfe1ff" stroke="#2b5fd6" stroke-width="1.5" stroke-linejoin="round"/>
      <polygon points="${tStr(img)}" fill="#ffe1c9" stroke="#c4342a" stroke-width="1.5" stroke-linejoin="round"/>
      <line x1="${(x1+15).toFixed(1)}" y1="${(y1+20).toFixed(1)}" x2="${(x2+15-5).toFixed(1)}" y2="${(y2+20-1).toFixed(1)}" stroke="#c4342a" stroke-width="1.5" marker-end="url(#arrow-trans)"/>
      <text x="${((x1+x2)/2+14).toFixed(1)}" y="${((y1+y2)/2+14).toFixed(1)}" font-size="13" fill="#c4342a" font-style="italic">v</text>`;
    correctLabel = 'une translation';
    solutionDesc = `Les deux figures sont identiques (même taille, même orientation), simplement décalées — la flèche représente le vecteur — c'est une <b>translation</b>.`;
  } else if (type === 'rotation') {
    const cx = 180, cy = 115;
    const deg = 90;
    const orig = tTranslate(F_BASE, 70, 50);
    const img = tRotate(orig, deg, cx, cy);
    content = `
      <polygon points="${tStr(orig)}" fill="#cfe1ff" stroke="#2b5fd6" stroke-width="1.5" stroke-linejoin="round"/>
      <polygon points="${tStr(img)}" fill="#ffe1c9" stroke="#c4342a" stroke-width="1.5" stroke-linejoin="round"/>
      <circle cx="${cx}" cy="${cy}" r="4" fill="#c4342a"/>
      <text x="${cx-14}" y="${cy+16}" font-size="13" font-weight="700" fill="#c4342a">O</text>
      <path d="M ${cx+35} ${cy-35} A 50 50 0 0 1 ${cx+50} ${cy}" stroke="#c4342a" stroke-dasharray="4 3" fill="none"/>`;
    correctLabel = 'une rotation';
    solutionDesc = `La figure a été tournée autour du centre O (les deux figures sont de même taille, mais orientées différemment) — c'est une <b>rotation</b>.`;
  } else { // homothetie
    const cx = 30, cy = 180;
    const k = 2;
    const orig = tTranslate(F_BASE, 55, 115);
    const img = tScale(orig, k, k, cx, cy);
    content = `
      <polygon points="${tStr(orig)}" fill="#cfe1ff" stroke="#2b5fd6" stroke-width="1.5" stroke-linejoin="round"/>
      <polygon points="${tStr(img)}" fill="#ffe1c9" stroke="#c4342a" stroke-width="1.5" stroke-linejoin="round"/>
      <circle cx="${cx}" cy="${cy}" r="4" fill="#c4342a"/>
      <text x="${cx-12}" y="${cy-4}" font-size="13" font-weight="700" fill="#c4342a">O</text>
      <line x1="${cx}" y1="${cy}" x2="${img[0][0].toFixed(1)}" y2="${img[0][1].toFixed(1)}" stroke="#c4342a" stroke-dasharray="3 2" opacity="0.5"/>
      <line x1="${cx}" y1="${cy}" x2="${img[1][0].toFixed(1)}" y2="${img[1][1].toFixed(1)}" stroke="#c4342a" stroke-dasharray="3 2" opacity="0.5"/>`;
    correctLabel = 'une homothétie';
    solutionDesc = `La figure orange est un <b>agrandissement</b> de la bleue depuis le centre O — c'est une <b>homothétie</b> (les rayons pointillés passent par O).`;
  }
  const fig = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;height:auto;display:block;margin:10px auto;background:#fcfcfc;border:1px solid #ddd;border-radius:8px;">${content}</svg>`;
  const allLabels = ['une symétrie axiale', 'une symétrie centrale', 'une translation', 'une rotation', 'une homothétie'];
  const { choices, correctIdx } = makeQCM([
    { html: correctLabel, correct: true },
    ...shuffle(allLabels.filter(l => l !== correctLabel)).slice(0, 3).map(l => ({ html: l, correct: false }))
  ]);
  return {
    theme: 'transformations', title: 'Identifier la transformation',
    body: `Sur la figure ci-dessous, la forme orange est l'image de la forme bleue. Quelle transformation a été appliquée ?${fig}`,
    type: 'qcm', choices, correctIdx,
    solution: solutionDesc,
    help: {
      cours: "5 transformations au programme :<br>• <b>Translation</b> : décalage selon un <b>vecteur</b>.<br>• <b>Symétrie axiale</b> : effet miroir par rapport à un <b>axe</b>.<br>• <b>Symétrie centrale</b> : demi-tour autour d'un <b>point</b> (la figure est retournée tête-bêche).<br>• <b>Rotation</b> : on tourne autour d'un <b>centre</b> (angle quelconque).<br>• <b>Homothétie</b> : agrandir ou réduire à partir d'un <b>centre</b>.",
      savoirFaire: "Repérer les indices : <b>flèche</b> → translation, <b>axe pointillé</b> → symétrie axiale, <b>point O avec figure tête-bêche</b> → symétrie centrale, <b>centre seul, angle ≠ 180°</b> → rotation, <b>centre + taille différente</b> → homothétie.",
      erreurs: ["Confondre symétrie axiale (miroir) et symétrie centrale (demi-tour).", "Confondre symétrie centrale et rotation quelconque.", "Confondre homothétie (taille change) et rotation (même taille)."]
    }
  };
}

// Propriétés conservées par les transformations
function t7_conservation() {
  const cases = [
    {
      q: 'Parmi ces transformations, laquelle ne conserve <b>pas</b> les longueurs ?',
      correct: "l'homothétie de rapport différent de 1",
      distract: ['la translation', 'la rotation', 'la symétrie axiale']
    },
    {
      q: 'Quelle transformation <b>inverse</b> le sens de la figure (effet miroir) ?',
      correct: 'la symétrie axiale',
      distract: ['la translation', 'la rotation', 'la symétrie centrale']
    },
    {
      q: 'Toutes les transformations du programme conservent…',
      correct: "les angles et l'alignement",
      distract: ['les longueurs uniquement', 'les aires uniquement', 'rien en particulier']
    }
  ];
  const k = pick(cases);
  const { choices, correctIdx } = makeQCM([
    { html: k.correct, correct: true },
    ...k.distract.map(d => ({ html: d, correct: false }))
  ]);
  return {
    theme: 'transformations', title: 'Propriétés conservées',
    body: k.q,
    type: 'qcm', choices, correctIdx,
    solution: `Translation, rotation, symétries : conservent les longueurs, angles, aires, alignement. Homothétie de rapport \\(k\\) : conserve les angles et l'alignement, mais multiplie les longueurs par \\(|k|\\) et les aires par \\(k^2\\). Symétrie axiale : seule à <b>inverser</b> le sens.`,
    help: {
      cours: "<b>Isométries</b> (translation, rotation, symétries) : conservent tout (longueurs, angles, aires). <b>Homothétie</b> (k ≠ ±1) : conserve angles et alignement, change longueurs (×|k|) et aires (×k²). La <b>symétrie axiale</b> est la seule à inverser le sens (orientation).",
      savoirFaire: "Retenir : translation/rotation/symétrie = mêmes longueurs. Homothétie = longueurs multipliées par |k|, aires par k².",
      erreurs: ["Penser que l'homothétie conserve les longueurs.", "Oublier que la symétrie axiale change le sens."]
    }
  };
}

// Frise avec 4 figures : identifier la transformation entre deux d'entre elles
function t7_frise_transformation() {
  const W = 380, H = 170;
  // Positionnement des 4 figures (écartement constant)
  const baseY = 55;
  const spacing = 90;
  const x1 = 25, x2 = x1 + spacing, x3 = x2 + spacing, x4 = x3 + spacing;
  // F1 = F normal ; F2 = translation (même orientation, décalée)
  const F1 = tTranslate(F_BASE, x1, baseY);
  const F2 = tTranslate(F_BASE, x2, baseY);
  // F3 = symétrie axiale verticale de F1 (miroir) ; on place à x3 avec l'axe au milieu entre F1 et F3
  const axisBetween13 = (x1 + 30 + x3) / 2; // entre coin droit de F1 et coin gauche de F3
  const F3 = tReflectV(F1, axisBetween13);
  // F4 = symétrie centrale (= rotation 180°) de F1 ; centre entre F1 et F4
  const cx14 = (x1 + 15 + x4 + 15) / 2;
  const cy14 = baseY + 20;
  const F4 = tRotate(F1, 180, cx14, cy14);

  const colors = [
    { fill: '#cfe1ff', stroke: '#2b5fd6' },
    { fill: '#ffe1c9', stroke: '#c4342a' },
    { fill: '#d1f0c9', stroke: '#0d9488' },
    { fill: '#ffd1e8', stroke: '#c026d3' }
  ];
  const labels = ['F₁', 'F₂', 'F₃', 'F₄'];
  const allFigs = [F1, F2, F3, F4];

  let svgContent = '';
  allFigs.forEach((pts, i) => {
    svgContent += `<polygon points="${tStr(pts)}" fill="${colors[i].fill}" stroke="${colors[i].stroke}" stroke-width="1.5" stroke-linejoin="round"/>`;
    const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
    svgContent += `<text x="${cx.toFixed(1)}" y="${H - 14}" font-size="14" font-weight="700" text-anchor="middle" fill="${colors[i].stroke}">${labels[i]}</text>`;
  });

  // Paires valides (F1 → Fx) avec leur transformation
  const pairs = [
    { from: 0, to: 1, answer: 'une translation',
      reason: 'F₂ est exactement la même forme que F₁, décalée vers la droite (même orientation, même taille).' },
    { from: 0, to: 2, answer: 'une symétrie axiale',
      reason: 'F₃ est le miroir de F₁ (les deux figures se font face par rapport à un axe vertical).' },
    { from: 0, to: 3, answer: 'une symétrie centrale',
      reason: 'F₄ est F₁ retournée tête-bêche (demi-tour autour d\'un centre entre F₁ et F₄).' }
  ];
  const k = pick(pairs);

  const fig = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;height:auto;display:block;margin:10px auto;background:#fcfcfc;border:1px solid #ddd;border-radius:8px;">${svgContent}</svg>`;

  const allLabels = ['une translation', 'une symétrie axiale', 'une symétrie centrale', 'une rotation de 90°', 'une homothétie'];
  const { choices, correctIdx } = makeQCM([
    { html: k.answer, correct: true },
    ...shuffle(allLabels.filter(l => l !== k.answer)).slice(0, 3).map(l => ({ html: l, correct: false }))
  ]);

  return {
    theme: 'transformations', title: 'Frise — transformation entre figures',
    body: `Voici une frise de quatre figures. Quelle transformation fait passer de ${labels[k.from]} à ${labels[k.to]} ?${fig}`,
    type: 'qcm', choices, correctIdx,
    solution: `${labels[k.from]} → ${labels[k.to]} : <b>${k.answer}</b>. ${k.reason}`,
    help: {
      cours: "Pour reconnaître la transformation entre deux figures :<br>• <b>Translation</b> : même forme, même orientation, décalage.<br>• <b>Symétrie axiale</b> : figures en miroir.<br>• <b>Symétrie centrale</b> : figure retournée tête-bêche (demi-tour).<br>• <b>Rotation</b> : tournée d'un angle donné autour d'un centre.<br>• <b>Homothétie</b> : taille différente.",
      savoirFaire: "Comparer orientation et taille. Si même orientation et même taille : translation. Si « tête-bêche » : symétrie centrale. Si miroir : symétrie axiale. Si taille change : homothétie.",
      erreurs: ["Confondre symétrie axiale (miroir) et symétrie centrale (demi-tour).", "Penser que F₂ est une rotation alors qu'elle est juste décalée."]
    }
  };
}

// Frise : transformation donnée, choisir l'image
function t7_frise_image() {
  const W = 380, H = 170;
  const baseY = 55;
  const spacing = 90;
  const x1 = 25, x2 = x1 + spacing, x3 = x2 + spacing, x4 = x3 + spacing;
  const F1 = tTranslate(F_BASE, x1, baseY);
  const F2 = tTranslate(F_BASE, x2, baseY);
  const axisBetween13 = (x1 + 30 + x3) / 2;
  const F3 = tReflectV(F1, axisBetween13);
  const cx14 = (x1 + 15 + x4 + 15) / 2, cy14 = baseY + 20;
  const F4 = tRotate(F1, 180, cx14, cy14);

  const colors = [
    { fill: '#cfe1ff', stroke: '#2b5fd6' },
    { fill: '#ffe1c9', stroke: '#c4342a' },
    { fill: '#d1f0c9', stroke: '#0d9488' },
    { fill: '#ffd1e8', stroke: '#c026d3' }
  ];
  const labels = ['F₁', 'F₂', 'F₃', 'F₄'];
  const allFigs = [F1, F2, F3, F4];
  let svgContent = '';
  allFigs.forEach((pts, i) => {
    svgContent += `<polygon points="${tStr(pts)}" fill="${colors[i].fill}" stroke="${colors[i].stroke}" stroke-width="1.5" stroke-linejoin="round"/>`;
    const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
    svgContent += `<text x="${cx.toFixed(1)}" y="${H - 14}" font-size="14" font-weight="700" text-anchor="middle" fill="${colors[i].stroke}">${labels[i]}</text>`;
  });
  const fig = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;height:auto;display:block;margin:10px auto;background:#fcfcfc;border:1px solid #ddd;border-radius:8px;">${svgContent}</svg>`;

  const transformations = [
    { name: 'une translation',     correctIdx: 1 },
    { name: 'une symétrie axiale', correctIdx: 2 },
    { name: 'une symétrie centrale', correctIdx: 3 }
  ];
  const k = pick(transformations);
  const correctLabel = labels[k.correctIdx];
  const wrongLabels = labels.filter((_, i) => i !== k.correctIdx && i !== 0);
  const { choices, correctIdx } = makeQCM([
    { html: correctLabel, correct: true },
    ...wrongLabels.map(l => ({ html: l, correct: false })),
    { html: 'aucune', correct: false }
  ]);

  return {
    theme: 'transformations', title: 'Frise — image d\'une figure',
    body: `Sur la frise ci-dessous, quelle figure est l'image de F₁ par ${k.name} ?${fig}`,
    type: 'qcm', choices, correctIdx,
    solution: `L'image de F₁ par ${k.name} est <b>${correctLabel}</b>.`,
    help: {
      cours: "Pour trouver l'image d'une figure par une transformation : appliquer les règles de la transformation (translation = décalage parallèle ; symétrie axiale = miroir ; symétrie centrale = demi-tour).",
      savoirFaire: "Regarder l'orientation : translation conserve, symétrie axiale donne un miroir, symétrie centrale retourne tête-bêche.",
      erreurs: ["Confondre symétrie axiale et centrale.", "Confondre rotation et symétrie."]
    }
  };
}

// Nature d'une symétrie centrale vs rotation
function t7_sym_centrale_identite() {
  const { choices, correctIdx } = makeQCM([
    { html: "une rotation de 180° autour de O", correct: true },
    { html: "une rotation de 90° autour de O", correct: false },
    { html: "une symétrie axiale d'axe passant par O", correct: false },
    { html: "une translation de vecteur O", correct: false }
  ]);
  return {
    theme: 'transformations', title: 'Symétrie centrale et rotation',
    body: `Une symétrie centrale de centre O est identique à :`,
    type: 'qcm', choices, correctIdx,
    solution: `Une symétrie centrale de centre O est un <b>demi-tour</b> autour de O, c'est-à-dire une <b>rotation de 180° de centre O</b>.`,
    help: {
      cours: "La <b>symétrie centrale</b> de centre O est équivalente à la <b>rotation de 180°</b> (demi-tour) de centre O. Le sens n'a pas d'importance pour 180°.",
      savoirFaire: "Imaginer la figure pivotée d'un demi-tour autour du point.",
      erreurs: ["Confondre avec symétrie axiale.", "Oublier que 180° est un demi-tour complet."]
    }
  };
}

// Effet d'une homothétie sur l'aire (rapport k² sur l'aire)
function t7_homothetie_aire() {
  const cases = [
    { k: 2,   fact: 4,  ansText: '4',   ansAlt: ['4'] },
    { k: 3,   fact: 9,  ansText: '9',   ansAlt: ['9'] },
    { k: 4,   fact: 16, ansText: '16',  ansAlt: ['16'] },
    { k: 5,   fact: 25, ansText: '25',  ansAlt: ['25'] },
    { k: 0.5, fact: 0.25, ansText: '0,25', ansAlt: ['0,25','0.25','1/4'] }
  ];
  const k = pick(cases);
  return {
    theme: 'transformations', title: 'Homothétie — effet sur l\'aire',
    body: `Une figure est transformée par une homothétie de rapport ${String(k.k).replace('.', ',')}. Par combien son aire est-elle multipliée ?`,
    type: 'input', expected: k.ansAlt,
    solution: `Une homothétie de rapport \\(k\\) multiplie les longueurs par \\(|k|\\) et les aires par \\(k^2\\). Ici : \\(${k.k}^2 = ${k.fact}\\).`,
    help: {
      cours: "Pour une homothétie de rapport \\(k\\) : longueurs × \\(|k|\\), <b>aires × \\(k^2\\)</b>, volumes × \\(|k|^3\\).",
      savoirFaire: "Élever le rapport au carré pour les aires, au cube pour les volumes.",
      erreurs: ["Multiplier l'aire par \\(k\\) au lieu de \\(k^2\\).", "Oublier d'élever au carré.", "Confondre avec l'effet sur les longueurs."]
    }
  };
}

// Fraction de tour (conversion angle ↔ quart/demi/tour)
function t7_fraction_tour() {
  const cases = [
    { angle: 90, correct: 'un quart de tour' },
    { angle: 180, correct: 'un demi-tour' },
    { angle: 270, correct: 'trois quarts de tour' },
    { angle: 360, correct: 'un tour complet' }
  ];
  const k = pick(cases);
  const all = ['un quart de tour', 'un demi-tour', 'trois quarts de tour', 'un tour complet'];
  const { choices, correctIdx } = makeQCM([
    { html: k.correct, correct: true },
    ...all.filter(x => x !== k.correct).map(x => ({ html: x, correct: false }))
  ]);
  return {
    theme: 'transformations', title: 'Fraction de tour',
    body: `Un angle de ${k.angle}° correspond à :`,
    type: 'qcm', choices, correctIdx,
    solution: `360° = un tour complet. Donc ${k.angle}° = ${k.angle}/360 de tour = ${k.correct}.`,
    help: {
      cours: "90° = 1/4 tour ; 180° = 1/2 tour (demi-tour) ; 270° = 3/4 tour ; 360° = tour complet.",
      savoirFaire: "Diviser l'angle par 360° pour obtenir la fraction de tour.",
      erreurs: ["Confondre quart et demi.", "Inverser 90° et 180°."]
    }
  };
}

// Axes de symétrie de figures usuelles
function t7_axes_symetrie() {
  const cases = [
    { shape: 'un carré', n: 4 },
    { shape: 'un rectangle (non carré)', n: 2 },
    { shape: 'un losange (non carré)', n: 2 },
    { shape: 'un triangle équilatéral', n: 3 },
    { shape: 'un triangle isocèle (non équilatéral)', n: 1 },
    { shape: 'un parallélogramme quelconque', n: 0 }
  ];
  const k = pick(cases);
  const opts = [0, 1, 2, 3, 4];
  const distract = shuffle(opts.filter(x => x !== k.n)).slice(0, 3);
  const { choices, correctIdx } = makeQCM([
    { html: String(k.n), correct: true },
    ...distract.map(x => ({ html: String(x), correct: false }))
  ]);
  return {
    theme: 'transformations', title: 'Axes de symétrie',
    body: `Combien d'axes de symétrie possède ${k.shape} ?`,
    type: 'qcm', choices, correctIdx,
    solution: `${k.shape.charAt(0).toUpperCase() + k.shape.slice(1)} possède <b>${k.n}</b> axe(s) de symétrie.`,
    help: {
      cours: "Un <b>axe de symétrie</b> est une droite qui coupe la figure en deux parties superposables par pliage. Carré : 4 (2 médianes + 2 diagonales). Rectangle : 2 médianes. Losange : 2 diagonales. Triangle équilatéral : 3 médianes. Triangle isocèle : 1. Parallélogramme quelconque : 0.",
      savoirFaire: "Imaginer plier la figure le long d'une droite. Si les deux moitiés se superposent parfaitement, c'est un axe.",
      erreurs: ["Croire que toute diagonale est un axe de symétrie (faux pour rectangle).", "Oublier que le parallélogramme quelconque n'en a aucun."]
    }
  };
}

/* ==========================================================================
   THÈME 8 — STATISTIQUES & PROBABILITÉS
   ========================================================================== */

function t8_mediane() {
  const cases = [
    { s:[8,12,6,19,15], med:12 },
    { s:[5,7,9,11,13], med:9 },
    { s:[3,6,8,12,15], med:8 },
    { s:[10,20,30,40,50], med:30 }
  ];
  const k = pick(cases);
  return {
    theme: 'stats', title: 'Médiane',
    body: `Les notes obtenues par un élève sont : \\(${k.s.join(' \\;;\\; ')}\\). Que vaut la médiane ?`,
    type: 'input', expected: String(k.med),
    solution: `On ordonne la série : ${[...k.s].sort((a,b)=>a-b).join(' ; ')}. Le nombre central est ${k.med}.`,
    help: {
      cours: "La <b>médiane</b> est la valeur qui sépare la série ordonnée en deux moitiés. Pour un effectif impair, c'est la valeur centrale.",
      savoirFaire: "Ordonner la série, puis prendre la valeur du milieu (pour un nombre impair de valeurs).",
      erreurs: ["Confondre médiane et moyenne.", "Oublier d'ordonner.", "Prendre la mauvaise position."]
    }
  };
}

function t8_moyenne() {
  const cases = [
    { s:[8,10,11,11], r:10 }, { s:[12,14,16], r:14 },
    { s:[5,10,15], r:10 }, { s:[6,8,10,12,14], r:10 }
  ];
  const k = pick(cases);
  const distract = shuffle([k.r+0.5, k.r-0.5, k.r+1, k.r-1]).filter(v => v !== k.r).slice(0,3);
  const strMoy = m => String(m).replace('.', ',');
  const { choices, correctIdx } = makeQCM([
    { html: strMoy(k.r), correct: true },
    ...distract.map(v => ({ html: strMoy(v), correct: false }))
  ]);
  return {
    theme: 'stats', title: 'Moyenne',
    body: `Voici une série : \\(${k.s.join(' \\;;\\; ')}\\). Quelle est la moyenne ?`,
    type: 'qcm', choices, correctIdx,
    solution: `Moyenne = somme / effectif = \\((${k.s.join('+')}) / ${k.s.length} = ${k.r}\\).`,
    help: {
      cours: "<b>Moyenne</b> = somme des valeurs / nombre de valeurs.",
      savoirFaire: "Additionner toutes les valeurs, puis diviser par l'effectif.",
      erreurs: ["Confondre avec la médiane.", "Diviser par la plus grande valeur.", "Oublier une valeur."]
    }
  };
}

function t8_etendue() {
  const cases = [
    { s:[8,12,6,19,15], r:13 }, { s:[5,7,9,11,13], r:8 },
    { s:[10,3,15,20,8], r:17 }
  ];
  const k = pick(cases);
  return {
    theme: 'stats', title: 'Étendue',
    body: `Quelle est l'étendue de la série : \\(${k.s.join(' \\;;\\; ')}\\) ?`,
    type: 'input', expected: String(k.r),
    solution: `Étendue = max − min = ${Math.max(...k.s)} − ${Math.min(...k.s)} = ${k.r}.`,
    help: {
      cours: "L'<b>étendue</b> est la différence entre la plus grande et la plus petite valeur.",
      savoirFaire: "Repérer max et min, puis soustraire.",
      erreurs: ["Additionner au lieu de soustraire.", "Confondre avec la moyenne.", "Oublier des valeurs."]
    }
  };
}

// Moyenne d'une série avec effectifs
function t8_moy_effectifs() {
  const cases = [
    { valeurs: [1,2,3], eff: [2,3,5], r: '2,3' },
    { valeurs: [0,1,2,3], eff: [1,2,4,3], r: '1,9' },
    { valeurs: [5,6,7], eff: [3,4,3], r: '6' },
    { valeurs: [10,12,14], eff: [2,5,3], r: '12,1' }
  ];
  const k = pick(cases);
  const totalEff = k.eff.reduce((a,b) => a+b, 0);
  const totalVal = k.valeurs.reduce((a, v, i) => a + v*k.eff[i], 0);
  const m = totalVal / totalEff;
  const ans = (Math.round(m * 10) / 10).toString().replace('.', ',');
  const tableau = `<table style="margin:8px 0;border-collapse:collapse;">
    <tr><td style="padding:4px 10px;border:1px solid #888;font-weight:600;">Valeur</td>${k.valeurs.map(v => `<td style="padding:4px 10px;border:1px solid #888;text-align:center;">${v}</td>`).join('')}</tr>
    <tr><td style="padding:4px 10px;border:1px solid #888;font-weight:600;">Effectif</td>${k.eff.map(e => `<td style="padding:4px 10px;border:1px solid #888;text-align:center;">${e}</td>`).join('')}</tr>
  </table>`;
  return {
    theme: 'stats', title: 'Moyenne avec tableau d\'effectifs',
    body: `Voici les notes d'une classe :${tableau}Quelle est la moyenne ? (Arrondie au dixième si besoin.)`,
    type: 'input', expected: [ans, ans.replace(',', '.')],
    solution: `Moyenne = \\(\\dfrac{\\sum n_i x_i}{\\sum n_i} = \\dfrac{${totalVal}}{${totalEff}} \\approx ${ans}\\).`,
    help: {
      cours: "Moyenne pondérée : \\(\\bar{x} = \\dfrac{n_1 x_1 + n_2 x_2 + \\ldots}{n_1 + n_2 + \\ldots}\\).",
      savoirFaire: "Multiplier chaque valeur par son effectif, additionner, diviser par le total des effectifs.",
      erreurs: ["Oublier la pondération (faire la moyenne des valeurs sans tenir compte des effectifs).", "Additionner les effectifs à la place.", "Ne pas arrondir."]
    }
  };
}

/* SVG : diagramme en bâtons */
function svgBarChart(labels, values, { title = '' } = {}) {
  const W = 340, H = 220, padL = 30, padR = 10, padT = 30, padB = 40;
  const gw = W - padL - padR, gh = H - padT - padB;
  const max = Math.max(...values, 1);
  const barW = gw / labels.length * 0.6;
  const gap = gw / labels.length;
  const colors = ['#3b82f6','#f59e0b','#10b981','#ec4899','#8b5cf6'];
  let bars = '';
  labels.forEach((l, i) => {
    const h = (values[i] / max) * gh;
    const x = padL + i * gap + gap/2 - barW/2;
    const y = H - padB - h;
    bars += `<rect x="${x}" y="${y}" width="${barW}" height="${h}" fill="${colors[i % colors.length]}" rx="2"/>`;
    bars += `<text x="${x + barW/2}" y="${y - 4}" font-size="11" text-anchor="middle" fill="#333" font-weight="700">${values[i]}</text>`;
    bars += `<text x="${x + barW/2}" y="${H - padB + 14}" font-size="10" text-anchor="middle" fill="#555">${l}</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;height:auto;display:block;margin:10px auto;background:#fcfcfc;border:1px solid #ddd;border-radius:8px;">
    ${title ? `<text x="${W/2}" y="18" font-size="12" text-anchor="middle" fill="#333" font-weight="700">${title}</text>` : ''}
    <line x1="${padL}" y1="${H-padB}" x2="${W-padR}" y2="${H-padB}" stroke="#333" stroke-width="1.2"/>
    <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${H-padB}" stroke="#333" stroke-width="1.2"/>
    ${bars}
  </svg>`;
}

/* SVG : diagramme circulaire (camembert) */
function svgPieChart(labels, values) {
  const W = 320, H = 220, cx = 100, cy = 110, r = 80;
  const total = values.reduce((s,v) => s+v, 0);
  const colors = ['#3b82f6','#f59e0b','#10b981','#ec4899','#8b5cf6','#14b8a6'];
  let slices = '';
  let angle = -Math.PI/2; // start au 12h
  labels.forEach((l, i) => {
    const a = (values[i] / total) * 2 * Math.PI;
    const x1 = cx + r*Math.cos(angle), y1 = cy + r*Math.sin(angle);
    angle += a;
    const x2 = cx + r*Math.cos(angle), y2 = cy + r*Math.sin(angle);
    const large = a > Math.PI ? 1 : 0;
    slices += `<path d="M ${cx} ${cy} L ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z" fill="${colors[i % colors.length]}" stroke="white" stroke-width="2"/>`;
  });
  // légende à droite
  let legend = '';
  labels.forEach((l, i) => {
    const y = 40 + i * 22;
    const pct = Math.round(values[i] / total * 100);
    legend += `<rect x="200" y="${y-10}" width="14" height="14" fill="${colors[i % colors.length]}" rx="2"/>
      <text x="220" y="${y+1}" font-size="12" fill="#333">${l} (${pct}%)</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;height:auto;display:block;margin:10px auto;background:#fcfcfc;border:1px solid #ddd;border-radius:8px;">
    ${slices}
    ${legend}
  </svg>`;
}

/* Lecture d'un diagramme en bâtons */
function t8_diagramme_batons() {
  const cases = [
    { titre:"Nombre d'élèves par LV1", categ:['Anglais','Espagnol','Allemand','Italien'], eff:[18,6,4,2], q:"Quelle langue est la plus choisie ?", r:'Anglais' },
    { titre:"Fréquentation du CDI", categ:['Lundi','Mardi','Jeudi','Vendredi'], eff:[25,18,30,12], q:"Quel jour y a-t-il eu le plus d'élèves ?", r:'Jeudi' },
    { titre:"Sport préféré", categ:['Foot','Basket','Tennis','Natation'], eff:[16,8,5,11], q:"Quel sport est le moins choisi ?", r:'Tennis' }
  ];
  const k = pick(cases);
  const fig = svgBarChart(k.categ, k.eff, { title: k.titre });
  const { choices, correctIdx } = makeQCM([
    { html: k.r, correct: true },
    ...k.categ.filter(c => c !== k.r).map(c => ({ html: c, correct: false }))
  ]);
  return {
    theme: 'stats', title: 'Lire un diagramme en bâtons',
    body: `${k.q}${fig}`,
    type: 'qcm', choices, correctIdx,
    solution: `On lit la hauteur de chaque bâton : le plus grand (ou le plus petit) donne la réponse. Ici : <b>${k.r}</b>.`,
    help: {
      cours: "Un <b>diagramme en bâtons</b> représente des effectifs par une hauteur proportionnelle.",
      savoirFaire: "Comparer visuellement les hauteurs des bâtons pour identifier max / min.",
      erreurs: ["Lire sur la mauvaise catégorie.", "Confondre avec un histogramme (classes) ou un camembert (%)."]
    }
  };
}

/* Lecture d'un diagramme circulaire (camembert) */
function t8_camembert() {
  const cases = [
    { categ:['Football','Natation','Tennis','Danse'], eff:[60,20,10,10], q:"Quel sport représente la moitié des inscrits ?", r:'Football' },
    { categ:['Anglais','Espagnol','Allemand','Italien'], eff:[50,25,15,10], q:"Quelle LV est la plus choisie ?", r:'Anglais' },
    { categ:['Jamais','Parfois','Souvent','Toujours'], eff:[10,45,30,15], q:"Quelle réponse est la plus fréquente ?", r:'Parfois' },
    { categ:['Foot','Basket','Rugby','Volley'], eff:[40,30,20,10], q:"Quel sport arrive en tête ?", r:'Foot' }
  ];
  const k = pick(cases);
  const fig = svgPieChart(k.categ, k.eff);
  const distractors = k.categ.filter(c => c !== k.r);
  const { choices, correctIdx } = makeQCM([
    { html: k.r, correct: true },
    ...distractors.slice(0, 3).map(c => ({ html: c, correct: false }))
  ]);
  return {
    theme: 'stats', title: 'Lire un diagramme circulaire',
    body: `${k.q}${fig}`,
    type: 'qcm', choices, correctIdx,
    solution: `Dans un camembert, la taille d'un secteur est proportionnelle à sa fréquence. Ici : <b>${k.r}</b>.`,
    help: {
      cours: "Un <b>diagramme circulaire</b> (camembert) représente des pourcentages : 360° = 100%. Un secteur de x° correspond à \\(\\dfrac{x}{360}\\) de l'ensemble.",
      savoirFaire: "Repérer le secteur le plus grand ou calculer l'angle (100% → 360°, donc t% → t × 3,6°).",
      erreurs: ["Confondre pourcentage et angle.", "Oublier que 50% = demi-disque = 180°."]
    }
  };
}

/* Calcul d'angle dans un camembert */
/* ------------------------------------------------------------------
   Histogramme — attendu Brevet 2025 p.4 :
   "Il lit, interprète et représente des données sous forme
   d'histogrammes pour des classes de même amplitude."
   ------------------------------------------------------------------ */
function svgHistogram(classes, effectifs, { title = '' } = {}) {
  const W = 360, H = 230, padL = 42, padR = 12, padT = 28, padB = 42;
  const gw = W - padL - padR, gh = H - padT - padB;
  const maxEff = Math.max(...effectifs, 1);
  const n = classes.length;
  const barW = gw / n;
  // Échelle Y : arrondir au multiple supérieur de 100 ou 200
  const yMax = Math.ceil(maxEff / 200) * 200 || 200;
  const yTicks = 5;
  let bars = '';
  effectifs.forEach((e, i) => {
    const h = (e / yMax) * gh;
    const x = padL + i * barW;
    const y = H - padB - h;
    bars += `<rect x="${x}" y="${y}" width="${barW - 1}" height="${h}" fill="#6366f1" stroke="#3730a3" stroke-width="1"/>`;
    bars += `<text x="${x + barW/2}" y="${y - 4}" font-size="10" text-anchor="middle" fill="#333" font-weight="700">${e}</text>`;
  });
  let labels = '';
  classes.forEach((c, i) => {
    const x = padL + i * barW;
    labels += `<text x="${x}" y="${H - padB + 13}" font-size="9" text-anchor="middle" fill="#555">${c[0]}</text>`;
    if (i === n - 1) {
      labels += `<text x="${x + barW}" y="${H - padB + 13}" font-size="9" text-anchor="middle" fill="#555">${c[1]}</text>`;
    }
  });
  let ticks = '';
  for (let t = 0; t <= yTicks; t++) {
    const v = Math.round(yMax * t / yTicks);
    const y = H - padB - (v / yMax) * gh;
    ticks += `<line x1="${padL - 3}" y1="${y}" x2="${padL}" y2="${y}" stroke="#555" stroke-width="1"/>`;
    ticks += `<text x="${padL - 6}" y="${y + 3}" font-size="9" text-anchor="end" fill="#555">${v}</text>`;
  }
  return `<div class="histogram-container"><svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="background:#fcfcfc;border:1px solid #ddd;border-radius:8px;">
    ${title ? `<text x="${W/2}" y="16" font-size="11" text-anchor="middle" fill="#333" font-weight="700">${title}</text>` : ''}
    ${ticks}
    <line x1="${padL}" y1="${H-padB}" x2="${W-padR}" y2="${H-padB}" stroke="#333" stroke-width="1.2"/>
    <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${H-padB}" stroke="#333" stroke-width="1.2"/>
    ${bars}
    ${labels}
    <text x="${padL - 30}" y="${padT - 8}" font-size="9" fill="#555">Effectif</text>
    <text x="${W - padR}" y="${H - padB + 30}" font-size="9" text-anchor="end" fill="#555">Âge</text>
  </svg></div>`;
}

function t8_histogramme() {
  const cases = [
    {
      context: "Une enquête porte sur l'âge auquel les personnes ont trouvé leur premier emploi qualifié. Les résultats sont présentés dans cet histogramme :",
      classes: [[18, 22], [22, 26], [26, 30], [30, 34], [34, 38]],
      effectifs: [100, 200, 400, 1100, 700],
      questions: [
        { q: "Combien de personnes ont trouvé leur emploi entre 26 et 30 ans ?", r: "400", type: 'input' },
        { q: "Quelle est la classe avec le plus grand effectif ?", r: "[30 ; 34[", type: 'qcm', opts: ["[30 ; 34[", "[34 ; 38[", "[26 ; 30[", "[22 ; 26["] },
        { q: "Quel est l'effectif total de l'enquête ?", r: "2500", type: 'input' },
        { q: "Quelle est l'étendue des âges de l'enquête ?", r: "20", type: 'input', suffix: 'ans', explain: "L'étendue vaut \\(38 - 18 = 20\\) ans." }
      ]
    },
    {
      context: "Voici la répartition des élèves d'un collège selon leur taille (en cm) :",
      classes: [[140, 150], [150, 160], [160, 170], [170, 180]],
      effectifs: [80, 220, 180, 60],
      questions: [
        { q: "Combien d'élèves mesurent entre 150 cm et 160 cm ?", r: "220", type: 'input' },
        { q: "Quel est l'effectif total ?", r: "540", type: 'input' },
        { q: "Quelle est l'amplitude de chaque classe ?", r: "10", type: 'input', suffix: 'cm', explain: "Chaque classe a une amplitude de 10 cm (elles sont toutes de même largeur)." }
      ]
    }
  ];
  const k = pick(cases);
  const q = pick(k.questions);
  const histoSvg = svgHistogram(k.classes, k.effectifs);
  const body = `${k.context}${histoSvg}${q.q}`;
  if (q.type === 'qcm') {
    const { choices, correctIdx } = makeQCM([
      { html: q.r, correct: true },
      ...q.opts.filter(o => o !== q.r).map(o => ({ html: o, correct: false }))
    ]);
    return {
      theme: 'stats', title: 'Histogramme',
      body, type: 'qcm', choices, correctIdx,
      solution: q.explain || `La classe avec le plus grand bâton est <b>${q.r}</b>.`,
      help: {
        cours: "Un <b>histogramme</b> représente des données regroupées en <b>classes de même amplitude</b>. La hauteur de chaque rectangle est proportionnelle à l'effectif.",
        savoirFaire: "Lire la hauteur du rectangle sur l'axe vertical pour retrouver l'effectif. Sommer les effectifs pour l'effectif total.",
        erreurs: ["Confondre histogramme et diagramme en bâtons (ici les classes sont collées).", "Se tromper de classe.", "Mal lire l'axe vertical."]
      }
    };
  }
  return {
    theme: 'stats', title: 'Histogramme',
    body, type: 'input', expected: String(q.r), suffix: q.suffix || '',
    solution: q.explain || `On lit directement la hauteur du rectangle correspondant : <b>${q.r}</b>${q.suffix ? ' ' + q.suffix : ''}.`,
    help: {
      cours: "Un <b>histogramme</b> représente des données regroupées en <b>classes de même amplitude</b>. La hauteur de chaque rectangle est proportionnelle à l'effectif.",
      savoirFaire: "Lire la hauteur du rectangle sur l'axe vertical pour retrouver l'effectif. Pour l'effectif total, additionner tous les effectifs.",
      erreurs: ["Confondre avec un diagramme en bâtons.", "Se tromper de classe.", "Oublier d'additionner pour l'effectif total."]
    }
  };
}

function t8_camembert_angle() {
  const cases = [
    { pct: 25, angle: 90 }, { pct: 50, angle: 180 },
    { pct: 20, angle: 72 }, { pct: 10, angle: 36 },
    { pct: 75, angle: 270 }, { pct: 40, angle: 144 }
  ];
  const k = pick(cases);
  return {
    theme: 'stats', title: 'Camembert — angle d\'un secteur',
    body: `Dans un diagramme circulaire, un secteur représente ${k.pct}% du total. Quelle est la mesure de son angle (en degrés) ?`,
    type: 'input', expected: String(k.angle), inputSuffix: '°',
    solution: `100% correspond à 360°. Donc ${k.pct}% → \\(${k.pct} × 3{,}6 = ${k.angle}°\\) (ou \\(\\dfrac{${k.pct}}{100} × 360\\)).`,
    help: {
      cours: "Dans un diagramme circulaire : 100% = 360°. Angle d'un secteur = pourcentage × 3,6.",
      savoirFaire: "Multiplier le pourcentage par 3,6 (ou calculer p/100 × 360).",
      erreurs: ["Utiliser 180° au lieu de 360°.", "Confondre angle et pourcentage.", "Oublier × 3,6."]
    }
  };
}

// Calcul d'une fréquence
function t8_frequence() {
  const cases = [
    { eff: 12, total: 40, r: '0,3',  pct: '30' },
    { eff: 5,  total: 25, r: '0,2',  pct: '20' },
    { eff: 18, total: 60, r: '0,3',  pct: '30' },
    { eff: 7,  total: 20, r: '0,35', pct: '35' },
    { eff: 30, total: 50, r: '0,6',  pct: '60' }
  ];
  const k = pick(cases);
  const askPct = Math.random() < 0.5;
  return {
    theme: 'stats', title: 'Fréquence ' + (askPct ? '(en %)' : '(décimale)'),
    body: `Dans un groupe de ${k.total} élèves, ${k.eff} font du sport. Quelle est la fréquence des sportifs ${askPct ? '(en %)' : '(en écriture décimale)'} ?`,
    type: 'input',
    expected: askPct ? [k.pct, k.pct + '%'] : [k.r, k.r.replace(',', '.')],
    inputSuffix: askPct ? '%' : '',
    solution: `Fréquence = \\(\\dfrac{\\text{effectif}}{\\text{effectif total}} = \\dfrac{${k.eff}}{${k.total}} = ${k.r}\\)${askPct ? ' = ' + k.pct + '%' : ''}.`,
    help: {
      cours: "<b>Fréquence</b> d'une valeur = effectif / effectif total. S'exprime en décimal (entre 0 et 1) ou en pourcentage (×100).",
      savoirFaire: "Diviser l'effectif de la valeur par l'effectif total. Pour obtenir un pourcentage, multiplier par 100.",
      erreurs: ["Inverser numérateur et dénominateur.", "Oublier de convertir en % si demandé.", "Confondre fréquence et effectif."]
    }
  };
}

/* ------------------------------------------------------------------
   Probabilité à 2 épreuves — attendu Brevet 2025 p.4-5 :
   "À partir de dénombrements, il calcule des probabilités pour des
   expériences aléatoires simples à 2 épreuves."
   Méthode attendue : TABLEAU À DOUBLE ENTRÉE (l'arbre n'est pas exigé en 3ème)
   ------------------------------------------------------------------ */
function t8_proba_deux_epreuves() {
  // Scénarios avec un tableau double entrée rendu en HTML
  const cases = [
    {
      desc: "On lance <b>deux dés à 6 faces</b> et on s'intéresse à la <b>somme</b> des deux résultats.",
      qLabel: "Quelle est la probabilité d'obtenir une somme égale à 7&nbsp;?",
      // Tableau 6x6 des sommes ; 6 issues sur 36 donnent 7
      total: 36, favorable: 6, frac: '\\dfrac{6}{36} = \\dfrac{1}{6}',
      tableHtml: (() => {
        let h = '<table class="proba-table"><thead><tr><th>+</th>';
        for (let j = 1; j <= 6; j++) h += `<th>${j}</th>`;
        h += '</tr></thead><tbody>';
        for (let i = 1; i <= 6; i++) {
          h += `<tr><th>${i}</th>`;
          for (let j = 1; j <= 6; j++) {
            const s = i + j;
            h += `<td${s === 7 ? ' class="hit"' : ''}>${s}</td>`;
          }
          h += '</tr>';
        }
        return h + '</tbody></table>';
      })(),
      explain: "En coloriant les 7 dans le tableau : il y en a <b>6</b> sur <b>36</b> cases."
    },
    {
      desc: "On lance <b>deux pièces équilibrées</b>.",
      qLabel: "Quelle est la probabilité d'obtenir <b>deux faces</b> (F-F)&nbsp;?",
      total: 4, favorable: 1, frac: '\\dfrac{1}{4}',
      tableHtml: `<table class="proba-table"><thead><tr><th></th><th>P</th><th>F</th></tr></thead>
        <tbody>
          <tr><th>P</th><td>P-P</td><td>P-F</td></tr>
          <tr><th>F</th><td>F-P</td><td class="hit">F-F</td></tr>
        </tbody></table>`,
      explain: "Les 4 issues équiprobables sont P-P, P-F, F-P, F-F. Une seule donne F-F."
    },
    {
      desc: "On tire <b>successivement et avec remise</b> deux boules dans une urne contenant <b>1 boule bleue et 2 boules violettes</b>.",
      qLabel: "Quelle est la probabilité de tirer <b>deux boules violettes</b>&nbsp;?",
      total: 9, favorable: 4, frac: '\\dfrac{4}{9}',
      tableHtml: `<table class="proba-table"><thead><tr><th>2<sup>e</sup>↓ / 1<sup>er</sup>→</th><th>B</th><th>V<sub>1</sub></th><th>V<sub>2</sub></th></tr></thead>
        <tbody>
          <tr><th>B</th><td>B-B</td><td>V<sub>1</sub>-B</td><td>V<sub>2</sub>-B</td></tr>
          <tr><th>V<sub>1</sub></th><td>B-V<sub>1</sub></td><td class="hit">V<sub>1</sub>-V<sub>1</sub></td><td class="hit">V<sub>2</sub>-V<sub>1</sub></td></tr>
          <tr><th>V<sub>2</sub></th><td>B-V<sub>2</sub></td><td class="hit">V<sub>1</sub>-V<sub>2</sub></td><td class="hit">V<sub>2</sub>-V<sub>2</sub></td></tr>
        </tbody></table>`,
      explain: "Les 9 issues équiprobables. Les 4 cases V-V (coloriées) sont les issues favorables."
    },
    {
      desc: "Un couple souhaite avoir <b>deux enfants</b>. On suppose que la probabilité d'avoir une fille ou un garçon est la même.",
      qLabel: "Quelle est la probabilité que le couple ait <b>deux garçons</b>&nbsp;?",
      total: 4, favorable: 1, frac: '\\dfrac{1}{4}',
      tableHtml: `<table class="proba-table"><thead><tr><th>2<sup>e</sup>↓ / 1<sup>er</sup>→</th><th>F</th><th>G</th></tr></thead>
        <tbody>
          <tr><th>F</th><td>F-F</td><td>G-F</td></tr>
          <tr><th>G</th><td>F-G</td><td class="hit">G-G</td></tr>
        </tbody></table>`,
      explain: "Les 4 issues équiprobables : F-F, F-G, G-F, G-G. Une seule donne G-G."
    }
  ];
  const k = pick(cases);
  const pool = ['\\dfrac{1}{6}','\\dfrac{1}{4}','\\dfrac{1}{3}','\\dfrac{1}{2}','\\dfrac{2}{3}','\\dfrac{4}{9}','\\dfrac{1}{9}','\\dfrac{6}{36}'];
  const distract = shuffle(pool.filter(x => x !== k.frac.split('=').pop().trim())).slice(0, 3);
  const correctHtml = k.frac.includes('=')
    ? k.frac.split('=').pop().trim()
    : k.frac;
  const { choices, correctIdx } = makeQCM([
    { html: `\\(${correctHtml}\\)`, correct: true },
    ...distract.map(h => ({ html: `\\(${h}\\)`, correct: false }))
  ]);
  return {
    theme: 'probas', title: 'Probabilité à 2 épreuves (tableau)',
    body: `${k.desc}<br>${k.tableHtml}<br>${k.qLabel}`,
    type: 'qcm', choices, correctIdx,
    solution: `${k.explain} Donc \\(P = ${k.frac}\\).`,
    help: {
      cours: "Pour une expérience à <b>2 épreuves</b>, on dresse un <b>tableau à double entrée</b> qui liste toutes les issues équiprobables. Probabilité = nombre de cases favorables / nombre total de cases.",
      savoirFaire: "1) Construire le tableau de toutes les issues. 2) Compter les cases favorables. 3) Simplifier la fraction.",
      erreurs: ["Oublier des issues (ex. confondre \\(V_1 V_2\\) et \\(V_2 V_1\\)).", "Ne pas simplifier la fraction.", "Prendre le numérateur comme la probabilité."]
    }
  };
}

function t8_proba_simple() {
  const cases = [
    { desc:'On tire une carte parmi 52 cartes. Quelle est la probabilité de tirer un roi (4 rois) ?', r:'1/13', html:'\\dfrac{1}{13}' },
    { desc:'On lance un dé à 6 faces. Quelle est la probabilité d\'obtenir un 3 ?', r:'1/6', html:'\\dfrac{1}{6}' },
    { desc:'On tire une boule parmi 20 boules dont 5 sont rouges. Quelle est la probabilité de tirer une rouge ?', r:'1/4', html:'\\dfrac{1}{4}' },
    { desc:'Dans une urne de 10 jetons numérotés de 1 à 10, quelle est la probabilité de tirer un nombre pair ?', r:'1/2', html:'\\dfrac{1}{2}' }
  ];
  const k = pick(cases);
  const pool = ['\\dfrac{1}{2}','\\dfrac{1}{3}','\\dfrac{1}{4}','\\dfrac{1}{6}','\\dfrac{1}{13}','\\dfrac{4}{52}'];
  const distract = shuffle(pool.filter(x => x !== k.html)).slice(0,3);
  const { choices, correctIdx } = makeQCM([
    { html: `\\(${k.html}\\)`, correct: true },
    ...distract.map(h => ({ html: `\\(${h}\\)`, correct: false }))
  ]);
  return {
    theme: 'probas', title: 'Probabilité simple',
    body: k.desc,
    type: 'qcm', choices, correctIdx,
    solution: `Probabilité = cas favorables / cas possibles. Résultat simplifié : \\(${k.html}\\).`,
    help: {
      cours: "En situation d'équiprobabilité : \\(P(A) = \\dfrac{\\text{nombre de cas favorables}}{\\text{nombre de cas possibles}}\\).",
      savoirFaire: "Compter les issues favorables, diviser par le total, puis simplifier.",
      erreurs: ["Ne pas simplifier.", "Inverser favorables et possibles.", "Oublier une issue."]
    }
  };
}

// Probabilité de l'événement contraire
function t8_proba_contraire() {
  const cases = [
    { pA:'0{,}3', r:'0,7' }, { pA:'0{,}4', r:'0,6' },
    { pA:'0{,}85', r:'0,15' }, { pA:'0{,}25', r:'0,75' },
    { pA:'\\dfrac{1}{4}', r:'3/4', altAns:['3/4','0,75'] },
    { pA:'\\dfrac{2}{5}', r:'3/5', altAns:['3/5','0,6'] }
  ];
  const k = pick(cases);
  return {
    theme: 'probas', title: 'Probabilité du contraire',
    body: `Un événement \\(A\\) a pour probabilité \\(${k.pA}\\). Quelle est la probabilité de \\(\\overline{A}\\) (événement contraire) ?`,
    type: 'input', expected: k.altAns || [k.r],
    solution: `\\(P(\\overline{A}) = 1 - P(A) = 1 - ${k.pA} = ${k.r}\\).`,
    help: {
      cours: "Pour tout événement \\(A\\) : \\(P(A) + P(\\overline{A}) = 1\\), donc \\(P(\\overline{A}) = 1 - P(A)\\).",
      savoirFaire: "Soustraire la probabilité de 1.",
      erreurs: ["Calculer \\(1 + P(A)\\).", "Confondre avec l'événement intersection.", "Oublier que les fractions peuvent rester fractions."]
    }
  };
}

// Probabilité avec tableau à double entrée
function t8_proba_tableau() {
  const cases = [
    { total: 100, fav: 30, r: '3/10', extraContext: "Dans un groupe de 100 élèves, 30 font partie du club de musique." },
    { total: 200, fav: 50, r: '1/4',  extraContext: "Sur 200 élèves, 50 ont choisi l'option latin." },
    { total: 120, fav: 40, r: '1/3',  extraContext: "Sur 120 licenciés d'un club, 40 font de la natation." },
    { total: 150, fav: 30, r: '1/5',  extraContext: "Dans un lycée de 150 élèves, 30 portent des lunettes." }
  ];
  const k = pick(cases);
  const toLatex = f => { const [n,d] = f.split('/'); return `\\dfrac{${n}}{${d}}`; };
  const pool = ['1/2','1/3','1/4','1/5','3/10','2/5','2/3','3/4'];
  const distract = Array.from(new Set(pool.filter(x => x !== k.r))).slice(0, 3);
  const { choices, correctIdx } = makeQCM([
    { html: `\\(${toLatex(k.r)}\\)`, correct: true },
    ...distract.map(d => ({ html: `\\(${toLatex(d)}\\)`, correct: false }))
  ]);
  return {
    theme: 'probas', title: 'Probabilité (fraction irréductible)',
    body: `${k.extraContext} On choisit une personne au hasard. Quelle est la probabilité que cette personne soit concernée ? (Réponse sous forme de fraction irréductible.)`,
    type: 'qcm', choices, correctIdx,
    solution: `\\(P = \\dfrac{${k.fav}}{${k.total}} = ${toLatex(k.r)}\\) (simplifié).`,
    help: {
      cours: "Probabilité = favorables / total, à simplifier.",
      savoirFaire: "Diviser favorables et total par leur PGCD pour simplifier la fraction.",
      erreurs: ["Ne pas simplifier.", "Inverser numérateur et dénominateur."]
    }
  };
}

// Probabilité en lançant un dé : événement précis
function t8_proba_de() {
  const cases = [
    { desc: "obtenir un nombre pair", r: '1/2' },
    { desc: "obtenir un multiple de 3", r: '1/3' },
    { desc: "obtenir un nombre supérieur ou égal à 5", r: '1/3' },
    { desc: "obtenir un 6", r: '1/6' },
    { desc: "obtenir un nombre premier", r: '1/2' }
  ];
  const k = pick(cases);
  const toLatex = f => { const [n,d] = f.split('/'); return `\\dfrac{${n}}{${d}}`; };
  const pool = ['1/2','1/3','1/6','2/3','5/6','1/4'];
  const distract = Array.from(new Set(pool.filter(x => x !== k.r))).slice(0, 3);
  const { choices, correctIdx } = makeQCM([
    { html: `\\(${toLatex(k.r)}\\)`, correct: true },
    ...distract.map(d => ({ html: `\\(${toLatex(d)}\\)`, correct: false }))
  ]);
  return {
    theme: 'probas', title: 'Probabilité au lancer de dé',
    body: `On lance un dé équilibré à 6 faces. Quelle est la probabilité d'${k.desc} ?`,
    type: 'qcm', choices, correctIdx,
    solution: `Favorables : on les compte parmi {1, 2, 3, 4, 5, 6}. Réponse : \\(${toLatex(k.r)}\\).`,
    help: {
      cours: "Dé à 6 faces équilibré : 6 issues possibles. Multiples de 3 : {3, 6}. Nombres pairs : {2, 4, 6}. Premiers : {2, 3, 5}.",
      savoirFaire: "Lister les issues favorables parmi 1-6, puis diviser par 6 et simplifier.",
      erreurs: ["Oublier 1 ou 6 dans un critère.", "Ne pas simplifier.", "Confondre « premier » et « impair »."]
    }
  };
}

/* ==========================================================================
   THÈME 9 — GRANDEURS & MESURES (volumes, aires)
   ========================================================================== */

function t9_volume_pave() {
  const L = pick([2,3,4,5,6]);
  const l = pick([2,3,4,5]);
  const h = pick([2,3,4,5]);
  return {
    theme: 'espace', title: 'Volume d\'un pavé droit',
    body: `Quel est le volume (en cm³) d'un pavé droit de dimensions ${L} cm × ${l} cm × ${h} cm ?`,
    type: 'input', expected: String(L*l*h), inputSuffix: 'cm³',
    solution: `V = L × l × h = ${L} × ${l} × ${h} = ${L*l*h} cm³.`,
    help: {
      cours: "Volume d'un <b>pavé droit</b> : \\(V = L \\times l \\times h\\).",
      savoirFaire: "Multiplier les trois dimensions, attention aux unités (toutes dans la même).",
      erreurs: ["Ajouter au lieu de multiplier.", "Confondre avec l'aire.", "Oublier le cube (unité)."]
    }
  };
}

function t9_volume_cube() {
  const c = pick([2,3,4,5,6,10]);
  return {
    theme: 'espace', title: 'Volume d\'un cube',
    body: `Un cube a une arête de ${c} cm. Quel est son volume en cm³ ?`,
    type: 'input', expected: String(c*c*c), inputSuffix: 'cm³',
    solution: `V = c³ = ${c}³ = ${c*c*c} cm³.`,
    help: {
      cours: "Volume d'un <b>cube</b> d'arête \\(c\\) : \\(V = c^3 = c \\times c \\times c\\).",
      savoirFaire: "Élever la longueur du côté au cube.",
      erreurs: ["Calculer \\(c^2\\) (aire d'une face).", "Multiplier par 6 (nombre de faces).", "Se tromper au calcul du cube."]
    }
  };
}

// Conversion de longueurs (1D)
function t9_conv_longueur() {
  const cases = [
    { q:'3,5 m en cm', r:'350',  suffix:'cm' },
    { q:'250 cm en m', r:'2,5',  suffix:'m' },
    { q:'1,2 km en m', r:'1200', suffix:'m' },
    { q:'450 mm en cm', r:'45',  suffix:'cm' },
    { q:'0,8 m en mm', r:'800', suffix:'mm' },
    { q:'3500 m en km', r:'3,5', suffix:'km' }
  ];
  const k = pick(cases);
  return {
    theme: 'mesures', title: 'Conversion de longueurs (1D)',
    body: `Convertir : ${k.q}.`,
    type: 'input', expected: [k.r, k.r.replace(',', '.')], inputSuffix: k.suffix,
    solution: `${k.q} = ${k.r} ${k.suffix}.`,
    help: {
      cours: "Tableau de conversion des longueurs : km · hm · dam · <b>m</b> · dm · cm · mm. Chaque colonne = × 10 vers la droite, ÷ 10 vers la gauche.",
      savoirFaire: "Compter le nombre de colonnes à sauter dans le tableau, puis ×10 ou ÷10 par colonne.",
      erreurs: ["Confondre le sens (× vs ÷).", "Se tromper de nombre de zéros.", "Oublier d'aligner la virgule."]
    }
  };
}

// Conversion d'aires (2D) — ×/÷ par 100 à chaque saut
function t9_conv_aire() {
  const cases = [
    { q:'3 m² en cm²', r:'30000', suffix:'cm²' },
    { q:'5000 cm² en m²', r:'0,5', suffix:'m²' },
    { q:'1 ha en m²', r:'10000', suffix:'m²' },
    { q:'2,5 m² en dm²', r:'250', suffix:'dm²' },
    { q:'80 000 mm² en cm²', r:'800', suffix:'cm²' }
  ];
  const k = pick(cases);
  return {
    theme: 'mesures', title: 'Conversion d\'aires (2D)',
    body: `Convertir : ${k.q}.`,
    type: 'input', expected: [k.r, k.r.replace(',', '.')], inputSuffix: k.suffix,
    solution: `${k.q} = ${k.r} ${k.suffix}. (Pour les aires, chaque saut de colonne vaut ×100.)`,
    help: {
      cours: "Pour les <b>aires</b> (m², cm², …), chaque saut de colonne vaut <b>× 100</b> (ou ÷ 100). Exemple : 1 m² = 100 dm² = 10 000 cm² = 1 000 000 mm².",
      savoirFaire: "Compter les sauts et appliquer × 100 (ou ÷ 100) par saut.",
      erreurs: ["Appliquer × 10 comme pour les longueurs.", "Se tromper de nombre de zéros.", "Confondre sens."]
    }
  };
}

// Conversion de volumes (3D) — ×/÷ par 1000 à chaque saut
function t9_conv_volume() {
  const cases = [
    { q:'2 m³ en dm³', r:'2000', suffix:'dm³' },
    { q:'3000 cm³ en dm³', r:'3', suffix:'dm³' },
    { q:'1 dm³ en cm³', r:'1000', suffix:'cm³' },
    { q:'0,5 m³ en L', r:'500', suffix:'L' },
    { q:'2 L en cm³', r:'2000', suffix:'cm³' },
    { q:'1 m³ en L', r:'1000', suffix:'L' }
  ];
  const k = pick(cases);
  return {
    theme: 'mesures', title: 'Conversion de volumes (3D)',
    body: `Convertir : ${k.q}.`,
    type: 'input', expected: [k.r, k.r.replace(',', '.')], inputSuffix: k.suffix,
    solution: `${k.q} = ${k.r} ${k.suffix}. (Pour les volumes, chaque saut de colonne vaut ×1000. Équivalences : 1 L = 1 dm³ = 1000 cm³.)`,
    help: {
      cours: "Pour les <b>volumes</b> (m³, dm³, cm³), chaque saut vaut <b>× 1000</b>. Équivalences clés : 1 L = 1 dm³ = 1000 cm³ = 1000 mL. 1 m³ = 1000 L.",
      savoirFaire: "Mémoriser les équivalences usuelles. Pour passer d'une unité à l'autre : ×1000 par saut.",
      erreurs: ["Appliquer ×10 (longueur) ou ×100 (aire) à la place.", "Confondre L et m³.", "Oublier que 1 L = 1 dm³."]
    }
  };
}

// Arrondir un nombre décimal
function t9_arrondi() {
  const cases = [
    { n:'3,457', prec:'dixième',    r:'3,5' },
    { n:'12,84', prec:'dixième',    r:'12,8' },
    { n:'5,943', prec:'centième',   r:'5,94' },
    { n:'7,126', prec:'centième',   r:'7,13' },
    { n:'127,8', prec:"l'unité",    r:'128' },
    { n:'45,37', prec:"l'unité",    r:'45' },
    { n:'0,567', prec:'centième',   r:'0,57' }
  ];
  const k = pick(cases);
  return {
    theme: 'mesures', title: 'Arrondir un nombre',
    body: `Arrondir \\(${k.n.replace(',', '{,}')}\\) au ${k.prec}.`,
    type: 'input', expected: [k.r, k.r.replace(',', '.')],
    solution: `Règle d'arrondi : si le chiffre suivant est < 5 on arrondit vers le bas, sinon vers le haut. Ici : <b>${k.r}</b>.`,
    help: {
      cours: "<b>Règle d'arrondi</b> : on regarde le chiffre immédiatement après la précision demandée. Si <b>&lt; 5</b> on arrondit vers le <b>bas</b>, si <b>≥ 5</b> on arrondit vers le <b>haut</b>.",
      savoirFaire: "Identifier la position demandée (dixième, centième, unité…), regarder le chiffre suivant, et appliquer la règle.",
      erreurs: ["Arrondir dans le mauvais sens quand le chiffre = 5.", "Tronquer au lieu d'arrondir.", "Confondre dixième et centième."]
    }
  };
}

function t9_aire_carre() {
  const c = pick([3,4,5,6,7,8,9,10]);
  return {
    theme: 'mesures', title: 'Aire d\'un carré',
    body: `Quelle est l'aire (en cm²) d'un carré de côté ${c} cm ?`,
    type: 'input', expected: String(c*c), inputSuffix: 'cm²',
    solution: `Aire = côté² = ${c}² = ${c*c} cm².`,
    help: {
      cours: "Aire d'un <b>carré</b> de côté \\(c\\) : \\(A = c^2\\).",
      savoirFaire: "Élever la longueur du côté au carré.",
      erreurs: ["Multiplier par 4 (périmètre).", "Additionner le côté à lui-même.", "Oublier le carré (unité cm²)."]
    }
  };
}

function t9_aire_rectangle() {
  const L = pick([5,6,7,8,10,12]);
  const l = pick([3,4,5,6]);
  return {
    theme: 'mesures', title: 'Aire d\'un rectangle',
    body: `Quelle est l'aire (en cm²) d'un rectangle de longueur ${L} cm et de largeur ${l} cm ?`,
    type: 'input', expected: String(L*l), inputSuffix: 'cm²',
    solution: `Aire = L × l = ${L} × ${l} = ${L*l} cm².`,
    help: {
      cours: "Aire d'un <b>rectangle</b> : \\(A = L \\times l\\).",
      savoirFaire: "Multiplier longueur et largeur.",
      erreurs: ["Confondre aire et périmètre.", "Oublier le carré (unité)."]
    }
  };
}

function t9_aire_disque() {
  const cases = [
    { r:1, a:'\\pi' }, { r:2, a:'4\\pi' },
    { r:3, a:'9\\pi' }, { r:5, a:'25\\pi' }
  ];
  const k = pick(cases);
  const distract = shuffle(cases.filter(c => c.a !== k.a)).slice(0,3);
  const { choices, correctIdx } = makeQCM([
    { html: `\\(${k.a}\\) cm²`, correct: true },
    ...distract.map(d => ({ html: `\\(${d.a}\\) cm²`, correct: false }))
  ]);
  return {
    theme: 'mesures', title: 'Aire d\'un disque',
    body: `Quelle est l'aire (en cm²) d'un disque de rayon ${k.r} cm ?`,
    type: 'qcm', choices, correctIdx,
    solution: `Aire = \\(\\pi r^2 = \\pi \\times ${k.r}^2 = ${k.a}\\) cm².`,
    help: {
      cours: "Aire d'un <b>disque</b> de rayon \\(r\\) : \\(A = \\pi r^2\\).",
      savoirFaire: "Élever le rayon au carré, puis multiplier par π.",
      erreurs: ["Confondre avec le périmètre (\\(2\\pi r\\)).", "Utiliser le diamètre à la place du rayon."]
    }
  };
}

/* ==========================================================================
   THÈME 11 — GÉOMÉTRIE DANS L'ESPACE (solides, volumes)
   ========================================================================== */

// Volume d'un cylindre : V = π r² h
function t11_volume_cylindre() {
  const cases = [
    { r:2, h:5, v:'20\\pi' }, { r:3, h:4, v:'36\\pi' },
    { r:1, h:10, v:'10\\pi' }, { r:5, h:2, v:'50\\pi' },
    { r:2, h:10, v:'40\\pi' }
  ];
  const k = pick(cases);
  const pool = ['20\\pi','36\\pi','10\\pi','50\\pi','40\\pi','15\\pi','24\\pi','60\\pi'];
  const distract = Array.from(new Set(pool.filter(x => x !== k.v))).slice(0,3);
  const { choices, correctIdx } = makeQCM([
    { html: `\\(${k.v}\\) cm³`, correct: true },
    ...distract.map(d => ({ html: `\\(${d}\\) cm³`, correct: false }))
  ]);
  return {
    theme: 'espace', title: 'Volume d\'un cylindre',
    body: `Un cylindre a pour rayon ${k.r} cm et hauteur ${k.h} cm. Quel est son volume ?`,
    type: 'qcm', choices, correctIdx,
    solution: `\\(V = \\pi r^2 h = \\pi \\times ${k.r}^2 \\times ${k.h} = ${k.v}\\) cm³.`,
    help: {
      cours: "Volume d'un <b>cylindre</b> de rayon \\(r\\) et hauteur \\(h\\) : \\(V = \\pi r^2 h\\) (aire du disque de base × hauteur).",
      savoirFaire: "Calculer d'abord \\(r^2\\), puis multiplier par \\(\\pi\\) et par \\(h\\).",
      erreurs: ["Oublier d'élever le rayon au carré.", "Utiliser le diamètre à la place du rayon.", "Confondre avec le volume du cône (facteur 1/3)."]
    }
  };
}

// Volume d'un cône : V = (1/3) π r² h
function t11_volume_cone() {
  const cases = [
    { r:3, h:4, v:'12\\pi' }, { r:2, h:6, v:'8\\pi' },
    { r:3, h:5, v:'15\\pi' }, { r:1, h:9, v:'3\\pi' },
    { r:4, h:3, v:'16\\pi' }
  ];
  const k = pick(cases);
  const pool = ['12\\pi','8\\pi','15\\pi','3\\pi','16\\pi','4\\pi','36\\pi','24\\pi'];
  const distract = Array.from(new Set(pool.filter(x => x !== k.v))).slice(0,3);
  const { choices, correctIdx } = makeQCM([
    { html: `\\(${k.v}\\) cm³`, correct: true },
    ...distract.map(d => ({ html: `\\(${d}\\) cm³`, correct: false }))
  ]);
  return {
    theme: 'espace', title: 'Volume d\'un cône',
    body: `Un cône a pour rayon ${k.r} cm et hauteur ${k.h} cm. Quel est son volume ?`,
    type: 'qcm', choices, correctIdx,
    solution: `\\(V = \\dfrac{1}{3} \\pi r^2 h = \\dfrac{1}{3} \\times \\pi \\times ${k.r}^2 \\times ${k.h} = ${k.v}\\) cm³.`,
    help: {
      cours: "Volume d'un <b>cône de révolution</b> : \\(V = \\dfrac{1}{3}\\pi r^2 h\\). C'est un tiers du volume du cylindre de mêmes dimensions.",
      savoirFaire: "Calculer d'abord le volume du cylindre (\\(\\pi r^2 h\\)), puis diviser par 3.",
      erreurs: ["Oublier le facteur \\(1/3\\) (on confond avec le cylindre).", "Confondre avec la pyramide (formule similaire mais base polygonale).", "Utiliser le diamètre."]
    }
  };
}

// Volume d'une boule : V = (4/3) π r³
function t11_volume_sphere() {
  const cases = [
    { r:3, v:'36\\pi' }, { r:6, v:'288\\pi' },
    { r:1, v:'\\dfrac{4}{3}\\pi' }, { r:2, v:'\\dfrac{32}{3}\\pi' },
    { r:5, v:'\\dfrac{500}{3}\\pi' }
  ];
  const k = pick(cases);
  const pool = ['36\\pi','288\\pi','\\dfrac{4}{3}\\pi','\\dfrac{32}{3}\\pi','\\dfrac{500}{3}\\pi','4\\pi','12\\pi','24\\pi','100\\pi'];
  const distract = Array.from(new Set(pool.filter(x => x !== k.v))).slice(0,3);
  const { choices, correctIdx } = makeQCM([
    { html: `\\(${k.v}\\) cm³`, correct: true },
    ...distract.map(d => ({ html: `\\(${d}\\) cm³`, correct: false }))
  ]);
  return {
    theme: 'espace', title: 'Volume d\'une boule',
    body: `Une boule a pour rayon ${k.r} cm. Quel est son volume ?`,
    type: 'qcm', choices, correctIdx,
    solution: `\\(V = \\dfrac{4}{3} \\pi r^3 = \\dfrac{4}{3} \\pi \\times ${k.r}^3 = ${k.v}\\) cm³.`,
    help: {
      cours: "Volume d'une <b>boule</b> de rayon \\(r\\) : \\(V = \\dfrac{4}{3}\\pi r^3\\).",
      savoirFaire: "Cuber le rayon (\\(r^3\\)), multiplier par \\(\\pi\\), puis par \\(4/3\\).",
      erreurs: ["Utiliser \\(r^2\\) au lieu de \\(r^3\\).", "Oublier le facteur \\(4/3\\).", "Confondre avec l'aire de la sphère (\\(4\\pi r^2\\))."]
    }
  };
}

// Volume d'une pyramide : V = (1/3) × aire de base × hauteur
function t11_volume_pyramide() {
  const L = pick([3,4,5,6]);
  const h = pick([3,6,9]);
  const v = (L*L*h) / 3;
  if (!Number.isInteger(v)) return t11_volume_pyramide();
  return {
    theme: 'espace', title: 'Volume d\'une pyramide',
    body: `Une pyramide a pour base un carré de côté ${L} cm et pour hauteur ${h} cm. Quel est son volume (en cm³) ?`,
    type: 'input', expected: String(v), inputSuffix: 'cm³',
    solution: `Aire de la base = \\(${L}^2 = ${L*L}\\) cm². Volume = \\(\\dfrac{1}{3} \\times ${L*L} \\times ${h} = ${v}\\) cm³.`,
    help: {
      cours: "Volume d'une <b>pyramide</b> : \\(V = \\dfrac{1}{3} \\times \\text{aire de la base} \\times h\\) (h = hauteur de la pyramide).",
      savoirFaire: "1) Calculer l'aire de la base. 2) Multiplier par la hauteur. 3) Diviser par 3.",
      erreurs: ["Oublier le facteur \\(1/3\\).", "Confondre hauteur et arête latérale.", "Utiliser le périmètre de la base."]
    }
  };
}

// Effet d'un agrandissement sur les volumes (k³)
function t11_agrandissement_volume() {
  const cases = [
    { k:2, fact:8 }, { k:3, fact:27 }, { k:4, fact:64 },
    { k:0.5, fact:'0,125', altAns:['0,125','1/8'] },
    { k:5, fact:125 }
  ];
  const k = pick(cases);
  return {
    theme: 'espace', title: 'Agrandissement — effet sur le volume',
    body: `On agrandit un solide d'un rapport ${String(k.k).replace('.', ',')}. Par combien son volume est-il multiplié ?`,
    type: 'input', expected: k.altAns || [String(k.fact)],
    solution: `Les longueurs sont multipliées par \\(k\\), les aires par \\(k^2\\), les volumes par \\(k^3\\). Ici : \\(${k.k}^3 = ${k.fact}\\).`,
    help: {
      cours: "Dans un agrandissement ou réduction de rapport \\(k\\) : longueurs × \\(k\\), aires × \\(k^2\\), <b>volumes × \\(k^3\\)</b>.",
      savoirFaire: "Élever le rapport au cube pour les volumes.",
      erreurs: ["Multiplier par \\(k\\) (longueur) au lieu de \\(k^3\\).", "Utiliser \\(k^2\\) (aire).", "Oublier de cuber."]
    }
  };
}

// Aire d'une sphère : A = 4πR²
function t11_aire_sphere() {
  const cases = [
    { r:1, a:'4\\pi' }, { r:2, a:'16\\pi' },
    { r:3, a:'36\\pi' }, { r:5, a:'100\\pi' },
    { r:10, a:'400\\pi' }
  ];
  const k = pick(cases);
  const pool = ['4\\pi','16\\pi','36\\pi','100\\pi','400\\pi','12\\pi','24\\pi','48\\pi'];
  const distract = Array.from(new Set(pool.filter(x => x !== k.a))).slice(0,3);
  const { choices, correctIdx } = makeQCM([
    { html: `\\(${k.a}\\) cm²`, correct: true },
    ...distract.map(d => ({ html: `\\(${d}\\) cm²`, correct: false }))
  ]);
  return {
    theme: 'espace', title: 'Aire d\'une sphère',
    body: `Une sphère a pour rayon ${k.r} cm. Quelle est son aire ?`,
    type: 'qcm', choices, correctIdx,
    solution: `\\(A = 4\\pi R^2 = 4\\pi \\times ${k.r}^2 = ${k.a}\\) cm².`,
    help: {
      cours: "Aire d'une <b>sphère</b> de rayon \\(R\\) : \\(A = 4\\pi R^2\\). À ne pas confondre avec le volume de la boule \\(V = \\frac{4}{3}\\pi R^3\\).",
      savoirFaire: "Élever le rayon au carré, multiplier par \\(\\pi\\), puis par 4.",
      erreurs: ["Utiliser \\(R^3\\) au lieu de \\(R^2\\).", "Oublier le facteur 4.", "Confondre aire et volume."]
    }
  };
}

/* ------------------------------------------------------------------
   Repérage sur une sphère — attendu Brevet 2025 p.8 :
   "Il se repère sur une sphère (latitude, longitude)."
   ------------------------------------------------------------------ */
function t11_lat_long() {
  const cases = [
    {
      q: "Sur le globe terrestre, l'<b>équateur</b> est :",
      a: "le grand cercle de latitude 0°",
      opts: ["le grand cercle de latitude 0°", "le méridien de Greenwich", "le pôle Nord", "le tropique du Cancer"]
    },
    {
      q: "Le <b>méridien de Greenwich</b> correspond à :",
      a: "la longitude 0°",
      opts: ["la longitude 0°", "la latitude 0°", "le pôle Sud", "l'équateur"]
    },
    {
      q: "Un point sur Terre se repère par :",
      a: "sa latitude et sa longitude",
      opts: ["sa latitude et sa longitude", "son abscisse et son ordonnée", "son rayon et son angle", "sa hauteur et sa largeur"]
    },
    {
      q: "Paris a pour coordonnées géographiques environ 48° N et 2° E. Que signifie « 48° N » ?",
      a: "la latitude (au nord de l'équateur)",
      opts: ["la latitude (au nord de l'équateur)", "la longitude (à l'est de Greenwich)", "l'altitude", "la distance au pôle Nord"]
    },
    {
      q: "Les points <b>diamétralement opposés</b> sur une sphère de centre O sont :",
      a: "deux points alignés avec O et situés sur la sphère",
      opts: ["deux points alignés avec O et situés sur la sphère", "deux points sur le même méridien", "deux points à la même latitude", "deux points au pôle Nord et au pôle Sud uniquement"]
    }
  ];
  const k = pick(cases);
  const { choices, correctIdx } = makeQCM([
    { html: k.a, correct: true },
    ...k.opts.filter(o => o !== k.a).map(o => ({ html: o, correct: false }))
  ]);
  return {
    theme: 'espace', title: 'Repérage sur la sphère',
    body: k.q,
    type: 'qcm', choices, correctIdx,
    solution: `La réponse attendue est : <b>${k.a}</b>.`,
    help: {
      cours: "Sur une <b>sphère</b> (ex. la Terre), un point se repère par deux coordonnées :<br>• la <b>latitude</b> (entre −90° et 90°, comptée depuis l'équateur),<br>• la <b>longitude</b> (entre −180° et 180°, comptée depuis le méridien de Greenwich).<br>L'équateur = latitude 0°. Greenwich = longitude 0°.",
      savoirFaire: "Identifier d'abord la latitude (N/S), puis la longitude (E/O).",
      erreurs: ["Confondre latitude (horizontale) et longitude (verticale).", "Oublier le sens N/S ou E/O.", "Croire que Greenwich est un lieu unique en dehors des méridiens."]
    }
  };
}

/* ------------------------------------------------------------------
   Grandeurs composées — attendu Brevet 2025 p.7 :
   "Il calcule avec des grandeurs mesurables, notamment composées
   (débit en m³/s, vitesse en km/h...)."
   ------------------------------------------------------------------ */
function t11_grandeur_composee() {
  const cases = [
    {
      q: "Un robinet a un débit de 5 L/min. Combien de litres coulent en 20 minutes ?",
      r: "100", suffix: "L",
      sol: "\\(5 \\text{ L/min} \\times 20 \\text{ min} = 100 \\text{ L}\\)."
    },
    {
      q: "La Seine a un débit moyen de 300 m³/s sous un pont. Combien de m³ passent en 10 secondes ?",
      r: "3000", suffix: "m³",
      sol: "\\(300 \\text{ m}^3\\text{/s} \\times 10 \\text{ s} = 3000 \\text{ m}^3\\)."
    },
    {
      q: "Un conducteur roule à 90 km/h. Quelle distance (en km) parcourt-il en 2 h ?",
      r: "180", suffix: "km",
      sol: "\\(90 \\text{ km/h} \\times 2 \\text{ h} = 180 \\text{ km}\\)."
    },
    {
      q: "Un mobile se déplace à 5 m/s. Combien de mètres parcourt-il en 12 s ?",
      r: "60", suffix: "m",
      sol: "\\(5 \\text{ m/s} \\times 12 \\text{ s} = 60 \\text{ m}\\)."
    },
    {
      q: "Un athlète court 100 m en 10 s. Quelle est sa vitesse en m/s ?",
      r: "10", suffix: "m/s",
      sol: "Vitesse = distance ÷ temps = \\(100 \\div 10 = 10\\) m/s."
    },
    {
      q: "Une citerne de 1500 L se vide en 5 min. Quel est le débit en L/min ?",
      r: "300", suffix: "L/min",
      sol: "Débit = volume ÷ temps = \\(1500 \\div 5 = 300\\) L/min."
    }
  ];
  const k = pick(cases);
  return {
    theme: 'mesures', title: 'Grandeurs composées (débit, vitesse)',
    body: k.q,
    type: 'input', expected: k.r, suffix: k.suffix,
    solution: k.sol,
    help: {
      cours: "<b>Grandeurs composées</b> : elles associent deux unités (ex. km/h, m/s, m³/s, L/min).<br>• <b>Distance</b> = vitesse × temps<br>• <b>Volume</b> = débit × temps<br>• Pour isoler l'une des grandeurs, on divise.",
      savoirFaire: "Bien écrire les unités et s'assurer qu'elles se simplifient (ex. km/h × h = km).",
      erreurs: ["Mélanger les unités (min/s/h sans conversion).", "Multiplier au lieu de diviser.", "Oublier l'unité finale."]
    }
  };
}

// Identifier la nature d'une section
function t11_section() {
  const cases = [
    { solide:"un cylindre", section:"parallèle à la base", nature:"un disque" },
    { solide:"un cube", section:"parallèle à une face", nature:"un carré" },
    { solide:"une sphère", section:"par un plan quelconque", nature:"un cercle (ou un disque)" },
    { solide:"un pavé droit", section:"parallèle à une face", nature:"un rectangle" },
    { solide:"un cône", section:"parallèle à la base", nature:"un disque" }
  ];
  const k = pick(cases);
  const pool = ["un disque","un carré","un rectangle","un cercle (ou un disque)","un triangle","un hexagone"];
  const distract = Array.from(new Set(pool.filter(x => x !== k.nature))).slice(0,3);
  const { choices, correctIdx } = makeQCM([
    { html: k.nature, correct: true },
    ...distract.map(d => ({ html: d, correct: false }))
  ]);
  return {
    theme: 'espace', title: 'Section d\'un solide',
    body: `La section de ${k.solide} par un plan ${k.section} est :`,
    type: 'qcm', choices, correctIdx,
    solution: `Pour ${k.solide}, un plan ${k.section} donne <b>${k.nature}</b>.`,
    help: {
      cours: "Sections usuelles : cylindre (plan parallèle base) → disque ; cube/pavé (parallèle à une face) → carré/rectangle ; sphère (plan quelconque passant par l'intérieur) → disque ; cône (parallèle base) → disque.",
      savoirFaire: "Imaginer le plan qui coupe le solide, voir la forme laissée sur ce plan.",
      erreurs: ["Confondre disque et cercle.", "Penser que la section d'un cylindre est toujours un disque."]
    }
  };
}

/* ------------------------------------------------------------------
   Volume d'un assemblage — attendu Brevet 2025 p.7 :
   "Il calcule les volumes d'assemblages de solides étudiés au cours
   du cycle." Exemple : cylindre surmonté d'une demi-boule.
   ------------------------------------------------------------------ */
function t11_volume_assemblage() {
  // On choisit des valeurs qui donnent un résultat en kπ entier
  const cases = [
    // Cylindre + demi-boule de même rayon
    // V_cyl = π r² h    V_demiboule = (2/3) π r³
    { type: 'cyl_demiboule', r: 3, h: 5, detail: 'cylindre de rayon 3 cm et de hauteur 5 cm, surmonté d\'une demi-boule de même rayon' },
    { type: 'cyl_demiboule', r: 2, h: 6, detail: 'cylindre de rayon 2 cm et de hauteur 6 cm, surmonté d\'une demi-boule de même rayon' },
    { type: 'cyl_demiboule', r: 3, h: 10, detail: 'cylindre de rayon 3 cm et de hauteur 10 cm, surmonté d\'une demi-boule de même rayon' },
    // Cylindre - 3 boules (volume restant)
    { type: 'cyl_moins_boules', r: 5, h: 30, n: 3, detail: '3 boules identiques de rayon 5 cm placées dans une boîte cylindrique de rayon 5 cm et de hauteur 30 cm. Quel est le volume restant dans la boîte ?' },
    // Cube + pyramide
    { type: 'cube_pyramide', a: 6, h: 4, detail: 'cube d\'arête 6 cm surmonté d\'une pyramide de même base carrée et de hauteur 4 cm' }
  ];
  const k = pick(cases);
  let vExpr, vValue, svgPic;
  if (k.type === 'cyl_demiboule') {
    // V_cyl = π r² h ; V_demiboule = (2/3) π r³
    const cylCoef = k.r * k.r * k.h;
    const halfBallCoef = (2 / 3) * k.r * k.r * k.r;
    const total = cylCoef + halfBallCoef;
    // On force un cas qui donne un résultat propre : 2r³/3 entier ⇒ r multiple de 3 ou r tel que 2r³ mult de 3
    vExpr = `V = V_{\\text{cyl}} + V_{\\frac{1}{2}\\text{boule}} = \\pi \\times ${k.r}^2 \\times ${k.h} + \\dfrac{1}{2} \\times \\dfrac{4}{3}\\pi \\times ${k.r}^3 = ${cylCoef}\\pi + \\dfrac{${2 * k.r * k.r * k.r}}{3}\\pi`;
    if (Number.isInteger(halfBallCoef)) {
      vValue = `${total}\\pi`;
      vExpr += ` = ${total}\\pi`;
    } else {
      // résultat en fraction
      const num3 = cylCoef * 3 + 2 * k.r * k.r * k.r;
      vValue = `\\dfrac{${num3}}{3}\\pi`;
      vExpr += ` = \\dfrac{${num3}}{3}\\pi`;
    }
    svgPic = `<svg viewBox="0 0 160 200" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:10px auto;max-width:160px;">
      <ellipse cx="80" cy="50" rx="40" ry="12" fill="#ddd6fe" stroke="#5b21b6" stroke-width="1.5"/>
      <path d="M 40 50 A 40 40 0 0 1 120 50" fill="#c4b5fd" stroke="#5b21b6" stroke-width="1.5"/>
      <line x1="40" y1="50" x2="40" y2="150" stroke="#5b21b6" stroke-width="1.5"/>
      <line x1="120" y1="50" x2="120" y2="150" stroke="#5b21b6" stroke-width="1.5"/>
      <ellipse cx="80" cy="150" rx="40" ry="12" fill="#ddd6fe" stroke="#5b21b6" stroke-width="1.5"/>
      <path d="M 40 150 A 40 12 0 0 0 120 150" fill="none" stroke="#5b21b6" stroke-width="1.5" stroke-dasharray="3 2"/>
      <text x="135" y="100" font-size="11" fill="#5b21b6">${k.h} cm</text>
      <text x="135" y="30" font-size="11" fill="#5b21b6">r = ${k.r}</text>
    </svg>`;
  } else if (k.type === 'cyl_moins_boules') {
    const vCyl = k.r * k.r * k.h; // π × r² × h
    const vBoule = (4 / 3) * k.r * k.r * k.r;
    const total3 = 3 * vCyl - 3 * 4 * k.r * k.r * k.r;
    vExpr = `V_{\\text{boîte}} = \\pi \\times ${k.r}^2 \\times ${k.h} = ${vCyl}\\pi \\text{ cm}^3. V_{3\\text{ boules}} = 3 \\times \\dfrac{4}{3}\\pi \\times ${k.r}^3 = ${4 * k.r * k.r * k.r}\\pi \\text{ cm}^3. V_{\\text{restant}} = ${vCyl}\\pi - ${4 * k.r * k.r * k.r}\\pi`;
    vValue = `${vCyl - 4 * k.r * k.r * k.r}\\pi`;
    vExpr += ` = ${vCyl - 4 * k.r * k.r * k.r}\\pi`;
    svgPic = `<svg viewBox="0 0 140 240" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:10px auto;max-width:140px;">
      <ellipse cx="70" cy="20" rx="40" ry="10" fill="#e0e7ff" stroke="#4338ca" stroke-width="1.5"/>
      <line x1="30" y1="20" x2="30" y2="220" stroke="#4338ca" stroke-width="1.5"/>
      <line x1="110" y1="20" x2="110" y2="220" stroke="#4338ca" stroke-width="1.5"/>
      <ellipse cx="70" cy="220" rx="40" ry="10" fill="#e0e7ff" stroke="#4338ca" stroke-width="1.5"/>
      <circle cx="70" cy="60" r="35" fill="#fbbf24" fill-opacity="0.4" stroke="#b45309" stroke-width="1.5"/>
      <circle cx="70" cy="120" r="35" fill="#fbbf24" fill-opacity="0.4" stroke="#b45309" stroke-width="1.5"/>
      <circle cx="70" cy="180" r="35" fill="#fbbf24" fill-opacity="0.4" stroke="#b45309" stroke-width="1.5"/>
    </svg>`;
  } else if (k.type === 'cube_pyramide') {
    const vCube = k.a * k.a * k.a;
    const vPyr = (1 / 3) * k.a * k.a * k.h;
    const total = vCube + vPyr;
    vExpr = `V_{\\text{cube}} = ${k.a}^3 = ${vCube} \\text{ cm}^3. V_{\\text{pyr}} = \\dfrac{1}{3} \\times ${k.a}^2 \\times ${k.h} = ${vPyr} \\text{ cm}^3. V_{\\text{total}} = ${vCube} + ${vPyr} = ${total}`;
    vValue = `${total}`;
    svgPic = `<svg viewBox="0 0 200 220" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:10px auto;max-width:200px;">
      <polygon points="40,80 100,60 100,210 40,210 40,80" fill="#fce7f3" stroke="#be185d" stroke-width="1.5"/>
      <polygon points="160,80 100,60 100,210 160,210 160,80" fill="#fbcfe8" stroke="#be185d" stroke-width="1.5"/>
      <polygon points="40,80 100,60 160,80 100,100 40,80" fill="#f9a8d4" stroke="#be185d" stroke-width="1.5"/>
      <polygon points="40,80 100,20 160,80" fill="#fef3c7" stroke="#b45309" stroke-width="1.5"/>
      <polygon points="100,20 160,80 100,100" fill="#fde68a" stroke="#b45309" stroke-width="1.5"/>
      <line x1="40" y1="80" x2="100" y2="100" stroke="#be185d" stroke-width="1" stroke-dasharray="3 2"/>
    </svg>`;
  }
  const body = k.type === 'cyl_moins_boules'
    ? `${k.detail}${svgPic}Donne la valeur exacte (en fonction de \\(\\pi\\) si besoin).`
    : `Quel est le volume exact de l'assemblage suivant : un ${k.detail} ?${svgPic}`;
  const unit = k.type === 'cube_pyramide' ? 'cm³' : 'cm³';
  const pool = ['20\\pi', '36\\pi', '75\\pi', '100\\pi', '63', '270', '500', '50\\pi', '40\\pi'];
  const distract = shuffle(pool.filter(x => x !== vValue)).slice(0, 3);
  const { choices, correctIdx } = makeQCM([
    { html: `\\(${vValue}\\) ${unit}`, correct: true },
    ...distract.map(d => ({ html: `\\(${d}\\) ${unit}`, correct: false }))
  ]);
  return {
    theme: 'espace', title: 'Volume d\'un assemblage',
    body, type: 'qcm', choices, correctIdx,
    solution: `${vExpr} ${unit}.`,
    help: {
      cours: "Pour un <b>assemblage de solides</b>, on calcule <b>séparément</b> le volume de chaque partie, puis on <b>additionne</b> (ou on soustrait si on enlève de la matière).",
      savoirFaire: "1) Identifier les solides qui composent l'assemblage. 2) Appliquer chaque formule de volume. 3) Additionner (ou soustraire) les résultats, en gardant la même unité.",
      erreurs: ["Oublier le facteur 1/2 pour une demi-boule.", "Additionner des volumes dans des unités différentes.", "Oublier de soustraire quand il y a un trou ou un vide."]
    }
  };
}

/* ==========================================================================
   THÈME 10 — ALGORITHMIQUE (Scratch-like)
   ========================================================================== */

/* Rendu de blocs Scratch en SVG.
   Types : event (jaune), define (rose, Mes blocs), control (orange), motion (bleu),
           variable (orange foncé), pen (vert), looks (violet), operator (vert clair). */
const SCRATCH_COLORS = {
  event:    '#FFBF00',
  control:  '#FFAB19',
  motion:   '#4C97FF',
  variable: '#FF8C1A',
  pen:      '#0FBD8C',
  operator: '#59C059',
  looks:    '#9966FF',
  define:   '#FF6680'
};

/*
 * Rendu correct avec blocs emboîtés (C-blocks).
 * Un bloc de type "control" avec `inner: [...]` est dessiné comme un bracket :
 *   - barre du haut (topH)
 *   - stem vertical à gauche (pendant toute la hauteur des blocs internes)
 *   - barre du bas (botH)
 * Les blocs enfants sont dessinés PAR-DESSUS, décalés à droite par la largeur du stem.
 */
/* Constantes géométriques pour les encoches/tenons Scratch */
const SCRATCH_GEOM = {
  nX: 14,    // offset horizontal de l'encoche
  nW: 18,    // largeur de l'encoche/tenon
  nD: 4,     // profondeur de l'encoche/tenon
  stemW: 14, // largeur du stem gauche d'un C-block
  stackH: 32,
  cTopH: 32,
  cBotH: 14,
  r: 3       // rayon d'arrondi
};

/* Path d'un bloc stack standard : encoche en haut, tenon en bas */
function scratchPathStack(x, y, w, h, { notch = true, tab = true } = {}) {
  const { nX, nW, nD, r } = SCRATCH_GEOM;
  let d = `M ${x + r} ${y}`;
  if (notch) d += ` L ${x + nX} ${y} L ${x + nX + 3} ${y + nD} L ${x + nX + nW - 3} ${y + nD} L ${x + nX + nW} ${y}`;
  d += ` L ${x + w - r} ${y} Q ${x + w} ${y} ${x + w} ${y + r}`;
  d += ` L ${x + w} ${y + h - r} Q ${x + w} ${y + h} ${x + w - r} ${y + h}`;
  if (tab) d += ` L ${x + nX + nW} ${y + h} L ${x + nX + nW - 3} ${y + h + nD} L ${x + nX + 3} ${y + h + nD} L ${x + nX} ${y + h}`;
  d += ` L ${x + r} ${y + h} Q ${x} ${y + h} ${x} ${y + h - r}`;
  d += ` L ${x} ${y + r} Q ${x} ${y} ${x + r} ${y} Z`;
  return d;
}

/* Path d'un bloc chapeau (événements) : dessus courbé, tenon en bas */
function scratchPathHat(x, y, w, h) {
  const { nX, nW, nD } = SCRATCH_GEOM;
  let d = `M ${x} ${y + 12} Q ${x} ${y} ${x + 12} ${y} L ${x + w - 12} ${y} Q ${x + w} ${y} ${x + w} ${y + 12}`;
  d += ` L ${x + w} ${y + h}`;
  d += ` L ${x + nX + nW} ${y + h} L ${x + nX + nW - 3} ${y + h + nD} L ${x + nX + 3} ${y + h + nD} L ${x + nX} ${y + h}`;
  d += ` L ${x} ${y + h} Z`;
  return d;
}

/* Path d'un bloc "définir" (Mes blocs, rose) : bosse arrondie en haut, tenon en bas */
function scratchPathDefine(x, y, w, h) {
  const { nX, nW, nD } = SCRATCH_GEOM;
  let d = `M ${x} ${y + 10} Q ${x} ${y - 2} ${x + 18} ${y} Q ${x + w / 2} ${y - 6} ${x + w - 18} ${y} Q ${x + w} ${y - 2} ${x + w} ${y + 10}`;
  d += ` L ${x + w} ${y + h}`;
  d += ` L ${x + nX + nW} ${y + h} L ${x + nX + nW - 3} ${y + h + nD} L ${x + nX + 3} ${y + h + nD} L ${x + nX} ${y + h}`;
  d += ` L ${x} ${y + h} Z`;
  return d;
}

/* Path d'un C-block (répéter, si) : encoche en haut, tenon en bas,
   + tenon interne haut (pour le 1er bloc enfant) + encoche interne basse (pour le dernier bloc enfant) */
function scratchPathCBlock(x, y, w, topH, innerH, botH) {
  const { nX, nW, nD, stemW } = SCRATCH_GEOM;
  const y2 = y + topH;
  const y3 = y + topH + innerH;
  const y4 = y3 + botH;
  const ixN = x + stemW + nX; // position de l'encoche/tenon interne
  let d = `M ${x} ${y}`;
  // Bord supérieur avec encoche
  d += ` L ${x + nX} ${y} L ${x + nX + 3} ${y + nD} L ${x + nX + nW - 3} ${y + nD} L ${x + nX + nW} ${y}`;
  d += ` L ${x + w} ${y}`;
  d += ` L ${x + w} ${y2}`;
  // Bord intérieur haut (droite → gauche) avec tenon vers le bas
  d += ` L ${ixN + nW} ${y2} L ${ixN + nW - 3} ${y2 + nD} L ${ixN + 3} ${y2 + nD} L ${ixN} ${y2}`;
  d += ` L ${x + stemW} ${y2}`;
  // Stem vertical
  d += ` L ${x + stemW} ${y3}`;
  // Bord intérieur bas (gauche → droite) avec encoche vers le bas
  d += ` L ${ixN} ${y3} L ${ixN + 3} ${y3 + nD} L ${ixN + nW - 3} ${y3 + nD} L ${ixN + nW} ${y3}`;
  d += ` L ${x + w} ${y3}`;
  d += ` L ${x + w} ${y4}`;
  // Bord inférieur avec tenon
  d += ` L ${x + nX + nW} ${y4} L ${x + nX + nW - 3} ${y4 + nD} L ${x + nX + 3} ${y4 + nD} L ${x + nX} ${y4}`;
  d += ` L ${x} ${y4} Z`;
  return d;
}

/* Rendu du contenu d'un bloc avec pastilles (pills).
   Syntaxe dans le texte :
     {v:nom}   → pastille "variable" (même famille que le bloc parent, plus foncée)
     {n:12}    → pastille "nombre" (fond blanc, texte foncé)
     {op:expr} → pastille "opérateur" (fond vert)
     {t:texte} → pastille "texte" (fond blanc, texte foncé ; idem n)
   Tout le reste est rendu en texte blanc simple. */
const CHAR_W = 7;  // estimation largeur caractère à font-size ~12
function scratchRenderContent(x0, y, h, text) {
  const tokens = [];
  const re = /\{(v|n|op|t):([^{}]+)\}/g;
  let lastIdx = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIdx) tokens.push({ kind: 'label', value: text.slice(lastIdx, m.index) });
    tokens.push({ kind: m[1], value: m[2] });
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < text.length) tokens.push({ kind: 'label', value: text.slice(lastIdx) });

  let cx = x0 + 10;
  const cy = y + h / 2;
  const pillH = h - 12;
  let svg = '';
  tokens.forEach((t, i) => {
    const value = String(t.value);
    const textW = value.replace(/\s/g, ' ').length * CHAR_W;
    if (t.kind === 'label') {
      const trimmed = value.trim();
      if (!trimmed) { cx += CHAR_W; return; }
      // espace avant/après
      if (i > 0) cx += 3;
      svg += `<text x="${cx}" y="${cy + 4.5}" fill="white" font-size="13" font-weight="600" font-family="ui-sans-serif,system-ui">${trimmed}</text>`;
      cx += trimmed.length * CHAR_W + 3;
    } else {
      const pad = 10;
      const w = Math.max(22, textW + pad * 2);
      let pillFill, textFill;
      if (t.kind === 'v') { pillFill = 'rgba(0,0,0,0.18)'; textFill = 'white'; }
      else if (t.kind === 'n' || t.kind === 't') { pillFill = 'white'; textFill = '#1a1a1a'; }
      else { pillFill = SCRATCH_COLORS.operator; textFill = 'white'; }
      svg += `<rect x="${cx}" y="${cy - pillH/2}" width="${w}" height="${pillH}" rx="${pillH/2}" fill="${pillFill}" stroke="rgba(0,0,0,0.15)" stroke-width="0.6"/>`;
      svg += `<text x="${cx + w/2}" y="${cy + 4}" fill="${textFill}" font-size="12" font-weight="600" text-anchor="middle" font-family="ui-sans-serif,system-ui">${value}</text>`;
      cx += w + 4;
    }
  });
  return svg;
}

function scratchProgram(blocks) {
  const W = 340;
  const xPad = 14;
  const { stemW, stackH, cTopH, cBotH, nD } = SCRATCH_GEOM;

  const items = [];
  let y = 10;

  function layout(list, x) {
    list.forEach(b => {
      if (b.inner && b.inner.length > 0) {
        const idx = items.length;
        items.push({
          kind: 'cBlock', x, y,
          w: W - xPad - x,
          topH: cTopH, innerH: 0, botH: cBotH,
          text: b.text, color: SCRATCH_COLORS[b.type] || '#777'
        });
        y += cTopH;
        layout(b.inner, x + stemW);
        items[idx].innerH = y - items[idx].y - cTopH;
        y += cBotH;
      } else {
        const kind = b.type === 'event' ? 'hat'
                   : b.type === 'define' ? 'define'
                   : 'stack';
        items.push({
          kind, x, y, w: W - xPad - x, h: stackH,
          text: b.text, color: SCRATCH_COLORS[b.type] || '#777'
        });
        y += stackH;
      }
    });
  }

  layout(blocks, xPad);
  const H = y + nD + 8;

  let svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;height:auto;display:block;margin:10px auto;background:#fafafa;border:1px solid #e0e0e0;border-radius:8px;">`;
  svg += `<defs><filter id="scratchShadow" x="-5%" y="-5%" width="110%" height="115%"><feDropShadow dx="0" dy="1" stdDeviation="0.8" flood-opacity="0.2"/></filter></defs>`;
  const strokeStyle = 'stroke="rgba(0,0,0,0.18)" stroke-width="1"';

  // 1er passage : C-blocks (arrière)
  items.forEach(it => {
    if (it.kind !== 'cBlock') return;
    const d = scratchPathCBlock(it.x, it.y, it.w, it.topH, it.innerH, it.botH);
    svg += `<path d="${d}" fill="${it.color}" ${strokeStyle} filter="url(#scratchShadow)"/>`;
    svg += scratchRenderContent(it.x, it.y, it.topH, it.text);
  });

  // 2e passage : hat / define / stack
  items.forEach(it => {
    if (it.kind === 'cBlock') return;
    const { x, y, w, h, text, kind, color } = it;
    let d;
    if (kind === 'hat') d = scratchPathHat(x, y, w, h);
    else if (kind === 'define') d = scratchPathDefine(x, y, w, h);
    else d = scratchPathStack(x, y, w, h);
    svg += `<path d="${d}" fill="${color}" ${strokeStyle} filter="url(#scratchShadow)"/>`;
    svg += scratchRenderContent(x, y, h, text);
  });

  svg += '</svg>';
  return svg;
}

function t10_scratch_carre() {
  const prog = scratchProgram([
    { type:'define',   text:'définir carré' },
    { type:'pen',      text:'stylo en position d\'écriture' },
    { type:'control',  text:'répéter {n:?} fois', inner: [
      { type:'motion', text:'avancer de {n:50} pas' },
      { type:'motion', text:'tourner de {n:?} degrés' }
    ]}
  ]);
  const { choices, correctIdx } = makeQCM([
    { html: '4 et 90', correct: true },
    { html: '3 et 120', correct: false },
    { html: '4 et 45', correct: false },
    { html: '6 et 60', correct: false }
  ]);
  return {
    theme: 'algo', title: 'Dessiner un carré',
    body: `Voici un programme pour dessiner un carré. Par quelles valeurs doit-on remplacer les deux « ? » ?${prog}`,
    type: 'qcm', choices, correctIdx,
    solution: `Un carré a 4 côtés et 4 angles droits. On répète 4 fois : avancer + tourner de 90°.`,
    help: {
      cours: "Pour dessiner un polygone régulier à \\(n\\) côtés : répéter \\(n\\) fois (avancer + tourner de \\(360/n\\) degrés).",
      savoirFaire: "Compter les côtés, diviser 360 par ce nombre pour l'angle.",
      erreurs: ["Confondre l'angle intérieur (90° pour carré) et l'angle de rotation.", "Se tromper sur le nombre de côtés."]
    }
  };
}

function t10_polygone_regulier() {
  const cases = [
    { n:3, nom:'triangle équilatéral', angle:120 },
    { n:5, nom:'pentagone régulier', angle:72 },
    { n:6, nom:'hexagone régulier', angle:60 },
    { n:8, nom:'octogone régulier', angle:45 }
  ];
  const k = pick(cases);
  const prog = scratchProgram([
    { type:'define',  text:`définir ${k.nom.split(' ')[0]}` },
    { type:'control', text:`répéter {n:${k.n}} fois`, inner: [
      { type:'motion', text:'avancer de {n:50} pas' },
      { type:'motion', text:'tourner de {n:?} degrés' }
    ]}
  ]);
  return {
    theme: 'algo', title: 'Polygone régulier — rotation',
    body: `Le programme ci-dessous dessine un ${k.nom}. Par quelle valeur doit-on remplacer le « ? » ?${prog}`,
    type: 'input', expected: String(k.angle), inputSuffix: '°',
    solution: `Pour un polygone à \\(n\\) côtés : angle = \\(360/n = 360/${k.n} = ${k.angle}°\\).`,
    help: {
      cours: "Angle de rotation pour un polygone régulier à \\(n\\) côtés = \\(360°/n\\).",
      savoirFaire: "Diviser 360 par le nombre de côtés.",
      erreurs: ["Utiliser l'angle intérieur à la place.", "Se tromper de division."]
    }
  };
}

function t10_scratch_calcul() {
  const cases = [
    { dep:1, ops: [['×',8],['+',10],['/',2]], r:9 },
    { dep:2, ops: [['×',8],['+',10],['/',2]], r:13 },
    { dep:3, ops: [['×',5],['-',3],['×',2]], r:24 },
    { dep:4, ops: [['×',2],['+',6],['/',2]], r:7 }
  ];
  const k = pick(cases);
  const blocks = [
    { type:'event', text:'quand drapeau cliqué' },
    { type:'variable', text:`mettre {v:variable} à {n:${k.dep}}` },
    { type:'variable', text:`mettre {v:résultat} à {op:${k.ops[0][1]} ${k.ops[0][0]} variable}` },
    { type:'variable', text:`mettre {v:résultat} à {op:résultat ${k.ops[1][0]} ${k.ops[1][1]}}` },
    { type:'variable', text:`mettre {v:résultat} à {op:résultat ${k.ops[2][0]} ${k.ops[2][1]}}` }
  ];
  return {
    theme: 'algo', title: 'Lire un algorithme',
    body: `On exécute le programme ci-dessous. Quel est le résultat final ?${scratchProgram(blocks)}`,
    type: 'input', expected: String(k.r),
    solution: `On applique les opérations dans l'ordre : variable = ${k.dep}, puis les 3 lignes donnent ${k.r}.`,
    help: {
      cours: "Pour lire un algorithme : suivre les instructions dans l'ordre, de haut en bas.",
      savoirFaire: "Noter la valeur après chaque ligne pour ne rien oublier.",
      erreurs: ["Faire les opérations dans le désordre.", "Oublier une étape.", "Mélanger variable et résultat."]
    }
  };
}

function t10_boucle_pour() {
  const cases = [
    { start:0, step:2, rep:5, r:10 },
    { start:1, step:3, rep:4, r:13 },
    { start:10, step:-2, rep:3, r:4 },
    { start:5, step:5, rep:3, r:20 }
  ];
  const k = pick(cases);
  const prog = scratchProgram([
    { type:'event',    text:'quand drapeau cliqué' },
    { type:'variable', text:`mettre {v:x} à {n:${k.start}}` },
    { type:'control', text:`répéter {n:${k.rep}} fois`, inner: [
      { type:'variable', text:`mettre {v:x} à {op:x ${k.step >= 0 ? '+ ' + k.step : '− ' + Math.abs(k.step)}}` }
    ]}
  ]);
  return {
    theme: 'algo', title: 'Boucle « répéter »',
    body: `Après exécution du programme ci-dessous, quelle est la valeur finale de x ?${prog}`,
    type: 'input', expected: String(k.r),
    solution: `À chaque répétition, on ajoute ${k.step}. Après ${k.rep} répétitions : \\(${k.start} + ${k.rep} \\times ${k.step} = ${k.r}\\).`,
    help: {
      cours: "Une boucle « répéter N fois » fait la même instruction N fois de suite.",
      savoirFaire: "Calculer l'effet cumulé : \\(x_{\\text{final}} = x_{\\text{initial}} + N \\times (\\text{pas})\\).",
      erreurs: ["Oublier les répétitions (ne faire qu'une fois).", "Se tromper de pas.", "Compter un de trop ou un de moins."]
    }
  };
}

/* ------------------------------------------------------------------
   Algo — instruction conditionnelle (niveau 2 attendu)
   ------------------------------------------------------------------ */
function t10_condition_si() {
  const cases = [
    { x: 8,  seuil: 5, branche: 'supérieur', msg: 'Grand', else_msg: 'Petit', r: 'Grand' },
    { x: 3,  seuil: 5, branche: 'supérieur', msg: 'Grand', else_msg: 'Petit', r: 'Petit' },
    { x: 12, seuil: 10, branche: 'supérieur', msg: 'Gagné', else_msg: 'Perdu', r: 'Gagné' },
    { x: 7,  seuil: 10, branche: 'supérieur', msg: 'Gagné', else_msg: 'Perdu', r: 'Perdu' },
    { x: 2,  seuil: 0, branche: 'supérieur', msg: 'Positif', else_msg: 'Négatif ou nul', r: 'Positif' },
    { x: -3, seuil: 0, branche: 'supérieur', msg: 'Positif', else_msg: 'Négatif ou nul', r: 'Négatif ou nul' }
  ];
  const k = pick(cases);
  const prog = scratchProgram([
    { type: 'event',    text: 'quand drapeau cliqué' },
    { type: 'variable', text: `mettre {v:n} à {n:${k.x}}` },
    { type: 'control',  text: `si {op:n > ${k.seuil}} alors`, inner: [
      { type: 'looks', text: `dire {t:${k.msg}}` }
    ]},
    { type: 'control', text: 'sinon', inner: [
      { type: 'looks', text: `dire {t:${k.else_msg}}` }
    ]}
  ]);
  const distract = [k.msg, k.else_msg, 'rien', '0'].filter(d => d !== k.r);
  const { choices, correctIdx } = makeQCM([
    { html: k.r, correct: true },
    ...shuffle(distract).slice(0, 3).map(d => ({ html: d, correct: false }))
  ]);
  return {
    theme: 'algo', title: 'Instruction conditionnelle',
    body: `Que dit le lutin après exécution ?${prog}`,
    type: 'qcm', choices, correctIdx,
    solution: `Ici \\(n = ${k.x}\\) ${k.x > k.seuil ? '>' : '\\leq'} ${k.seuil}, donc on entre dans la branche « ${k.x > k.seuil ? 'alors' : 'sinon'} » et le lutin dit <b>« ${k.r} »</b>.`,
    help: {
      cours: "Une <b>instruction conditionnelle</b> « si … alors … sinon » teste une condition et exécute l'une ou l'autre branche selon le résultat (vrai ou faux).",
      savoirFaire: "1) Lire la valeur de la variable. 2) Vérifier si la condition est vraie. 3) Suivre la branche correspondante.",
      erreurs: ["Exécuter les deux branches.", "Confondre \\(>\\) et \\(\\geq\\).", "Oublier le cas d'égalité."]
    }
  };
}

/* ------------------------------------------------------------------
   Algo — variable qui compte (niveau 2 attendu)
   ------------------------------------------------------------------ */
function t10_variable_compteur() {
  const cases = [
    { total: 5, action: 'ajouter 2', rep: 5, start: 0, r: 10 },
    { total: 4, action: 'ajouter 3', rep: 4, start: 0, r: 12 },
    { total: 6, action: 'ajouter 1', rep: 6, start: 10, r: 16 },
    { total: 3, action: 'ajouter 5', rep: 3, start: 0, r: 15 },
    { total: 4, action: 'ajouter 2', rep: 4, start: 1, r: 9 }
  ];
  const k = pick(cases);
  const step = parseInt(k.action.match(/\d+/)[0], 10);
  const prog = scratchProgram([
    { type: 'event',    text: 'quand drapeau cliqué' },
    { type: 'variable', text: `mettre {v:compteur} à {n:${k.start}}` },
    { type: 'control', text: `répéter {n:${k.rep}} fois`, inner: [
      { type: 'variable', text: `ajouter {n:${step}} à {v:compteur}` }
    ]}
  ]);
  return {
    theme: 'algo', title: 'Variable qui compte',
    body: `Après exécution, quelle est la valeur finale de la variable <b>compteur</b> ?${prog}`,
    type: 'input', expected: String(k.r),
    solution: `On part de \\(${k.start}\\) et on ajoute ${step} à chaque passage (${k.rep} fois) : \\(${k.start} + ${k.rep} \\times ${step} = ${k.r}\\).`,
    help: {
      cours: "Une <b>variable</b> associe un nom à une valeur que le programme peut modifier. Le bloc « ajouter … à » incrémente la valeur actuelle.",
      savoirFaire: "Dérouler la boucle : valeur initiale + (nombre de répétitions) × (pas).",
      erreurs: ["Multiplier directement sans additionner la valeur initiale.", "Compter un passage de trop.", "Confondre « mettre à » (remplace) et « ajouter à » (incrémente)."]
    }
  };
}

/* ------------------------------------------------------------------
   Algo — gestion d'événement (niveau 2 attendu)
   ------------------------------------------------------------------ */
function t10_evenement_drapeau() {
  const cases = [
    {
      q: "Quand ce script est-il exécuté ?",
      evt: 'quand drapeau cliqué',
      a: "quand l'utilisateur clique sur le drapeau vert",
      opts: ["quand l'utilisateur clique sur le drapeau vert", "au démarrage de l'ordinateur", "quand on appuie sur la touche espace", "quand deux lutins se touchent"]
    },
    {
      q: "Quand ce script est-il exécuté ?",
      evt: 'quand touche espace pressée',
      a: "quand l'utilisateur appuie sur la touche espace",
      opts: ["quand l'utilisateur appuie sur la touche espace", "quand on clique sur le drapeau vert", "en permanence", "quand le lutin change de costume"]
    },
    {
      q: "Quel bloc déclenche un script <b>au clic sur le drapeau vert</b> ?",
      evt: null,
      a: "quand drapeau cliqué",
      opts: ["quand drapeau cliqué", "quand touche pressée", "avancer de 10", "répéter 10 fois"]
    }
  ];
  const k = pick(cases);
  const prog = k.evt ? scratchProgram([
    { type: 'event', text: k.evt },
    { type: 'motion', text: 'avancer de {n:10}' }
  ]) : '';
  const { choices, correctIdx } = makeQCM([
    { html: k.a, correct: true },
    ...k.opts.filter(o => o !== k.a).map(o => ({ html: o, correct: false }))
  ]);
  return {
    theme: 'algo', title: 'Événement Scratch',
    body: `${k.q}${prog}`,
    type: 'qcm', choices, correctIdx,
    solution: `Le bloc <b>${k.evt || 'quand drapeau cliqué'}</b> déclenche un script quand l'événement se produit : <b>${k.a}</b>.`,
    help: {
      cours: "Un <b>événement</b> (drapeau cliqué, touche pressée, lutin touché...) permet de déclencher un script. C'est le « chapeau » qui se place tout en haut.",
      savoirFaire: "Repérer le bloc « quand … » qui coiffe la pile d'instructions.",
      erreurs: ["Penser qu'un script démarre tout seul.", "Confondre les différents blocs d'événement.", "Oublier qu'il peut y avoir plusieurs scripts en parallèle."]
    }
  };
}

/* ------------------------------------------------------------------
   Algo — bloc personnalisé (niveau 3 attendu)
   ------------------------------------------------------------------ */
function t10_bloc_perso() {
  const cases = [
    {
      q: "Que dessine ce programme avec <b>Mon bloc</b> défini ci-dessous ?",
      a: "3 carrés côte à côte",
      opts: ["3 carrés côte à côte", "un triangle équilatéral", "un cercle", "3 triangles"],
      // Main program : repeat 3 × (Mon bloc, move 60)
      // Mon bloc : carré de côté 50
      main: [
        { type: 'event', text: 'quand drapeau cliqué' },
        { type: 'control', text: 'répéter {n:3} fois', inner: [
          { type: 'define', text: 'Mon bloc' },
          { type: 'motion', text: 'avancer de {n:60}' }
        ]}
      ],
      def: [
        { type: 'define', text: 'définir Mon bloc' },
        { type: 'control', text: 'répéter {n:4} fois', inner: [
          { type: 'motion', text: 'avancer de {n:50}' },
          { type: 'motion', text: 'tourner {n:90} degrés' }
        ]}
      ]
    },
    {
      q: "Combien de fois le lutin avance-t-il au total ?",
      a: "15",
      opts: ["15", "3", "5", "8"],
      // Main : repeat 3 × (Mon bloc) ; Mon bloc : repeat 5 × avancer
      main: [
        { type: 'event', text: 'quand drapeau cliqué' },
        { type: 'control', text: 'répéter {n:3} fois', inner: [
          { type: 'define', text: 'Mon bloc' }
        ]}
      ],
      def: [
        { type: 'define', text: 'définir Mon bloc' },
        { type: 'control', text: 'répéter {n:5} fois', inner: [
          { type: 'motion', text: 'avancer de {n:10}' }
        ]}
      ]
    }
  ];
  const k = pick(cases);
  const mainProg = scratchProgram(k.main);
  const defProg = scratchProgram(k.def);
  const { choices, correctIdx } = makeQCM([
    { html: k.a, correct: true },
    ...k.opts.filter(o => o !== k.a).map(o => ({ html: o, correct: false }))
  ]);
  return {
    theme: 'algo', title: 'Bloc personnalisé',
    body: `${k.q}<div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center;"><div><div style="font-size:0.85rem;font-weight:600;text-align:center;margin-bottom:4px;">Programme principal</div>${mainProg}</div><div><div style="font-size:0.85rem;font-weight:600;text-align:center;margin-bottom:4px;">Définition du bloc</div>${defProg}</div></div>`,
    type: 'qcm', choices, correctIdx,
    solution: `Chaque appel de <b>Mon bloc</b> exécute sa définition. La réponse est <b>${k.a}</b>.`,
    help: {
      cours: "Un <b>bloc personnalisé</b> (« Mes blocs ») permet de <b>regrouper</b> une suite d'instructions sous un seul nom, pour s'en servir plusieurs fois. C'est la <b>décomposition en sous-problèmes</b>.",
      savoirFaire: "1) Lire la définition du bloc pour savoir ce qu'il fait. 2) Le remplacer mentalement dans le programme principal à chaque appel.",
      erreurs: ["Oublier que le bloc est appelé plusieurs fois.", "Mal compter les répétitions imbriquées.", "Ignorer la définition."]
    }
  };
}

/* ------------------------------------------------------------------
   Arithmétique — décomposition en produit de facteurs premiers
   ------------------------------------------------------------------ */
function t1_decomposition_premiers() {
  const cases = [
    { n: 12,  dec: '2^2 \\times 3' },
    { n: 18,  dec: '2 \\times 3^2' },
    { n: 24,  dec: '2^3 \\times 3' },
    { n: 36,  dec: '2^2 \\times 3^2' },
    { n: 45,  dec: '3^2 \\times 5' },
    { n: 50,  dec: '2 \\times 5^2' },
    { n: 60,  dec: '2^2 \\times 3 \\times 5' },
    { n: 72,  dec: '2^3 \\times 3^2' },
    { n: 84,  dec: '2^2 \\times 3 \\times 7' },
    { n: 100, dec: '2^2 \\times 5^2' }
  ];
  const k = pick(cases);
  const distract = cases.filter(c => c.dec !== k.dec).slice(0, 3).map(c => c.dec);
  const { choices, correctIdx } = makeQCM([
    { html: `\\(${k.dec}\\)`, correct: true },
    ...distract.map(d => ({ html: `\\(${d}\\)`, correct: false }))
  ]);
  return {
    theme: 'arithmetique', title: 'Décomposition en facteurs premiers',
    body: `Décompose \\(${k.n}\\) en produit de facteurs premiers.`,
    type: 'qcm', choices, correctIdx,
    solution: `On divise successivement par les premiers (2, 3, 5, 7...) : \\(${k.n} = ${k.dec}\\).`,
    help: {
      cours: "<b>Décomposer en facteurs premiers</b> : écrire un entier comme un produit de nombres premiers, avec éventuellement des puissances. Exemple : \\(60 = 2^2 \\times 3 \\times 5\\).",
      savoirFaire: "Diviser par 2 tant que c'est possible, puis par 3, puis 5, puis 7... jusqu'à obtenir 1.",
      erreurs: ["Oublier une puissance (ex : écrire \\(2\\times 3\\) au lieu de \\(2^2\\times 3\\)).", "Utiliser un nombre non premier (6 = 2×3 n'est pas un facteur premier).", "Mélanger l'ordre."]
    }
  };
}

/* ------------------------------------------------------------------
   Arithmétique — problème PGCD (partage en lots identiques)
   ------------------------------------------------------------------ */
function t1_probleme_pgcd() {
  const cases = [
    {
      q: "Une fleuriste dispose de 48 roses rouges et 60 roses blanches. Elle veut composer le plus grand nombre possible de bouquets <b>identiques</b>, en utilisant toutes les fleurs. Combien de bouquets peut-elle faire ?",
      a: 48, b: 60, pgcd: 12,
      sol: "Il faut que le nombre de bouquets divise à la fois 48 et 60. On cherche donc le <b>PGCD</b> de 48 et 60.<br>\\(\\text{PGCD}(48, 60) = 12\\). Elle peut faire <b>12 bouquets</b>."
    },
    {
      q: "Un bibliothécaire a 84 romans et 126 BD. Il veut former le plus grand nombre possible de lots <b>identiques</b> utilisant <b>tous</b> les livres. Combien de lots au maximum ?",
      a: 84, b: 126, pgcd: 42,
      sol: "On cherche \\(\\text{PGCD}(84, 126) = 42\\). Il peut faire <b>42 lots</b>."
    },
    {
      q: "Deux cordes mesurent 72 cm et 108 cm. On veut les couper en morceaux de même longueur, la plus grande possible, sans perte. Quelle sera la longueur d'un morceau (en cm) ?",
      a: 72, b: 108, pgcd: 36,
      sol: "\\(\\text{PGCD}(72, 108) = 36\\). Chaque morceau mesurera <b>36 cm</b>."
    },
    {
      q: "Un professeur a 45 stylos et 75 crayons. Il veut constituer le plus grand nombre possible de trousses <b>identiques</b> en utilisant tout. Combien de trousses peut-il faire ?",
      a: 45, b: 75, pgcd: 15,
      sol: "\\(\\text{PGCD}(45, 75) = 15\\). Il peut faire <b>15 trousses</b>."
    }
  ];
  const k = pick(cases);
  return {
    theme: 'arithmetique', title: 'Problème avec PGCD',
    body: k.q,
    type: 'input', expected: String(k.pgcd),
    solution: k.sol,
    help: {
      cours: "Pour <b>partager en lots identiques</b> utilisant la totalité de deux quantités, on cherche le plus grand nombre qui divise les deux : c'est le <b>PGCD</b>.",
      savoirFaire: "Repérer le mot « identiques » + « le plus grand possible » + « en utilisant tout » → c'est un problème de PGCD.",
      erreurs: ["Confondre PGCD et PPCM.", "Additionner les deux quantités.", "Diviser naïvement l'une par l'autre."]
    }
  };
}

/* ------------------------------------------------------------------
   Pourcentages — évolutions successives
   ------------------------------------------------------------------ */
function t2_evolutions_successives() {
  const cases = [
    { p0: 100, e1: 20, s1: '+', e2: 10, s2: '-', coef: '1,08', pf: 108 },  // 1,2 × 0,9 = 1,08
    { p0: 200, e1: 50, s1: '+', e2: 20, s2: '-', coef: '1,20', pf: 240 },  // 1,5 × 0,8 = 1,20
    { p0: 80,  e1: 25, s1: '+', e2: 20, s2: '-', coef: '1,00', pf: 80 },   // 1,25 × 0,8 = 1,00
    { p0: 150, e1: 10, s1: '+', e2: 10, s2: '+', coef: '1,21', pf: 181.5 } // 1,1² = 1,21
  ];
  const k = pick(cases);
  const c1 = k.s1 === '+' ? (1 + k.e1/100) : (1 - k.e1/100);
  const c2 = k.s2 === '+' ? (1 + k.e2/100) : (1 - k.e2/100);
  const c1str = c1.toString().replace('.', ',');
  const c2str = c2.toString().replace('.', ',');
  return {
    theme: 'pourcent', title: 'Évolutions successives',
    body: `Un prix de ${k.p0}&nbsp;€ subit une première évolution de <b>${k.s1}${k.e1}&nbsp;%</b>, puis une seconde de <b>${k.s2}${k.e2}&nbsp;%</b>. Quel est le coefficient multiplicateur global (sous forme décimale) ?`,
    type: 'input', expected: [k.coef, k.coef.replace(',', '.')],
    solution: `Coefficient global = \\(${c1str} \\times ${c2str} = ${k.coef}\\). Le prix devient \\(${k.p0} \\times ${k.coef} = ${k.pf}\\)&nbsp;€.`,
    help: {
      cours: "Pour <b>deux évolutions successives</b>, on <b>multiplie</b> les coefficients (on ne les additionne pas !).",
      savoirFaire: "Écrire chaque coefficient séparément, puis faire le produit.",
      erreurs: ["Additionner les pourcentages (+20% puis −10% ≠ +10%).", "Confondre avec la moyenne.", "Oublier que chaque évolution s'applique au prix précédent, pas au prix de départ."]
    }
  };
}

/* ------------------------------------------------------------------
   Pourcentages — échelle de carte
   ------------------------------------------------------------------ */
function t2_echelle_carte() {
  const cases = [
    { distCarteCm: 4, echelle: 100000, distReelleKm: 4 },   // 4 cm × 100000 = 400000 cm = 4 km
    { distCarteCm: 7, echelle: 100000, distReelleKm: 7 },
    { distCarteCm: 5, echelle: 200000, distReelleKm: 10 },
    { distCarteCm: 3, echelle: 500000, distReelleKm: 15 },
    { distCarteCm: 8, echelle: 25000,  distReelleKm: 2 },
    { distCarteCm: 6, echelle: 50000,  distReelleKm: 3 }
  ];
  const k = pick(cases);
  return {
    theme: 'pourcent', title: 'Échelle d\'une carte',
    body: `Sur une carte à l'échelle 1/${k.echelle.toLocaleString('fr-FR')}, deux villes sont distantes de ${k.distCarteCm}&nbsp;cm. Quelle est la distance réelle entre elles (en km) ?`,
    type: 'input', expected: String(k.distReelleKm), suffix: 'km',
    solution: `À l'échelle 1/${k.echelle.toLocaleString('fr-FR')}, 1 cm sur la carte représente ${k.echelle.toLocaleString('fr-FR')} cm en réalité.<br>Distance réelle : \\(${k.distCarteCm} \\times ${k.echelle.toLocaleString('fr-FR')} = ${(k.distCarteCm*k.echelle).toLocaleString('fr-FR')}\\) cm = <b>${k.distReelleKm} km</b> (car \\(100\\,000\\) cm = 1 km).`,
    help: {
      cours: "Une <b>échelle 1/n</b> signifie que 1 cm sur la carte représente \\(n\\) cm en réalité. L'échelle est une situation de <b>proportionnalité</b>.",
      savoirFaire: "Multiplier la distance sur la carte par \\(n\\), puis convertir en km (1 km = 100 000 cm).",
      erreurs: ["Oublier de convertir cm en km.", "Diviser au lieu de multiplier.", "Confondre 1/n avec n."]
    }
  };
}

/* ------------------------------------------------------------------
   Fonctions — antécédent algébrique via équation
   ------------------------------------------------------------------ */
function t4_antecedent_algebrique() {
  const cases = [
    { f: '-3x - 4', cible: 10, x: -14/3, sol: 'x = -\\dfrac{14}{3}' }, // Trop complexe ; simplifions
  ].slice(0, 0); // vide, on préfère des valeurs entières
  const easy = [
    { f: '2x + 5',  cible: 11, x: 3 },
    { f: '3x - 1',  cible: 8,  x: 3 },
    { f: '-x + 7',  cible: 2,  x: 5 },
    { f: '4x + 2',  cible: 10, x: 2 },
    { f: '5x - 3',  cible: 12, x: 3 },
    { f: '-2x + 8', cible: 2,  x: 3 },
    { f: '6x + 1',  cible: 13, x: 2 },
    { f: '3x + 4',  cible: 19, x: 5 }
  ];
  const k = pick(easy);
  const distract = [k.x + 1, k.x - 1, k.cible].filter(v => v !== k.x);
  const { choices, correctIdx } = makeQCM([
    { html: `\\(x = ${k.x}\\)`, correct: true },
    ...shuffle(distract).slice(0, 3).map(v => ({ html: `\\(x = ${v}\\)`, correct: false }))
  ]);
  return {
    theme: 'fonctions', title: 'Antécédent algébrique',
    body: `Soit \\(f\\) la fonction définie par \\(f(x) = ${k.f}\\). Quel est l'antécédent de \\(${k.cible}\\) par \\(f\\) ?`,
    type: 'qcm', choices, correctIdx,
    solution: `On résout l'équation \\(f(x) = ${k.cible}\\), c'est-à-dire \\(${k.f} = ${k.cible}\\), ce qui donne \\(x = ${k.x}\\).`,
    help: {
      cours: "Un <b>antécédent</b> d'un nombre \\(y\\) par une fonction \\(f\\) est un nombre \\(x\\) tel que \\(f(x) = y\\). Pour le trouver par le calcul, on résout l'équation \\(f(x) = y\\).",
      savoirFaire: "Poser l'équation \\(f(x) = y\\), puis la résoudre comme une équation du premier degré.",
      erreurs: ["Confondre image et antécédent (image : on part de \\(x\\), on cherche \\(f(x)\\) ; antécédent : on part de \\(f(x)\\), on cherche \\(x\\)).", "Substituer \\(y\\) à la place de \\(x\\).", "Se tromper de signe."]
    }
  };
}

/* ------------------------------------------------------------------
   Fonctions — notation fonctionnelle
   ------------------------------------------------------------------ */
function t4_notation_fonction() {
  const cases = [
    {
      q: "L'écriture \\(f : x \\mapsto 3x + 2\\) signifie :",
      a: "\\(f\\) est la fonction qui, à \\(x\\), associe \\(3x + 2\\)",
      opts: [
        "\\(f\\) est la fonction qui, à \\(x\\), associe \\(3x + 2\\)",
        "\\(f(x)\\) vaut \\(x\\) multiplié par 3 puis 2",
        "\\(x\\) est la variable et \\(3x + 2\\) est la fonction",
        "\\(f\\) vaut \\(3x + 2\\)"
      ]
    },
    {
      q: "Si \\(g(5) = 15\\), que peut-on dire ?",
      a: "15 est l'image de 5 par \\(g\\), et 5 est un antécédent de 15",
      opts: [
        "15 est l'image de 5 par \\(g\\), et 5 est un antécédent de 15",
        "5 est l'image de 15 par \\(g\\), et 15 est un antécédent de 5",
        "\\(g\\) vaut 15",
        "\\(g(15) = 5\\)"
      ]
    },
    {
      q: "Soit \\(f(x) = 3x^2 - 7\\). Quelle est l'image de 2 par \\(f\\) ?",
      a: "5",
      opts: ["5", "-1", "-13", "12"]
    },
    {
      q: "Les écritures \\(f : x \\mapsto 3x^2 - 7\\) et \\(f(x) = 3x^2 - 7\\) :",
      a: "désignent la même fonction",
      opts: [
        "désignent la même fonction",
        "désignent deux fonctions différentes",
        "ne sont pas correctes",
        "sont équivalentes seulement si \\(x > 0\\)"
      ]
    }
  ];
  const k = pick(cases);
  const { choices, correctIdx } = makeQCM([
    { html: k.a, correct: true },
    ...k.opts.filter(o => o !== k.a).map(o => ({ html: o, correct: false }))
  ]);
  return {
    theme: 'fonctions', title: 'Notation fonctionnelle',
    body: k.q,
    type: 'qcm', choices, correctIdx,
    solution: `La bonne réponse est : <b>${k.a}</b>.`,
    help: {
      cours: "Deux écritures équivalentes :<br>• \\(f : x \\mapsto 3x - 7\\) (« \\(f\\) est la fonction qui à \\(x\\) associe \\(3x-7\\) »)<br>• \\(f(x) = 3x - 7\\) (« l'image de \\(x\\) par \\(f\\) vaut \\(3x-7\\) »).<br>Si \\(f(a) = b\\) : \\(b\\) est l'<b>image</b> de \\(a\\) ; \\(a\\) est un <b>antécédent</b> de \\(b\\).",
      savoirFaire: "Lire la notation : la flèche \\(\\mapsto\\) sépare la variable et l'expression.",
      erreurs: ["Confondre image et antécédent.", "Penser que \\(f\\) est un nombre.", "Mal lire la flèche \\(\\mapsto\\)."]
    }
  };
}

/* ------------------------------------------------------------------
   Fonctions — signe de a et b d'après allure
   ------------------------------------------------------------------ */
function t4_signe_a_b_allure() {
  const cases = [
    { aSigne: '+', bSigne: '+', a: 2,  b: 1,  axMax: 3, axMin: -1 },
    { aSigne: '+', bSigne: '-', a: 2,  b: -3, axMax: 3, axMin: -1 },
    { aSigne: '-', bSigne: '+', a: -1, b: 2,  axMax: 3, axMin: -1 },
    { aSigne: '-', bSigne: '-', a: -2, b: -1, axMax: 3, axMin: -1 }
  ];
  const k = pick(cases);
  // SVG d'une droite affine f(x) = ax + b
  const W = 240, H = 200, origX = 120, origY = 100, scale = 18;
  const x1 = -4, y1 = k.a * x1 + k.b;
  const x2 = 4,  y2 = k.a * x2 + k.b;
  const pX = x => origX + x * scale;
  const pY = y => origY - y * scale;
  const svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="max-width:240px;display:block;margin:10px auto;background:#fcfcfc;border:1px solid #ddd;border-radius:8px;">
    <line x1="10" y1="${origY}" x2="${W-10}" y2="${origY}" stroke="#888" stroke-width="1"/>
    <line x1="${origX}" y1="10" x2="${origX}" y2="${H-10}" stroke="#888" stroke-width="1"/>
    <text x="${W-8}" y="${origY-4}" font-size="10" fill="#555">x</text>
    <text x="${origX+4}" y="12" font-size="10" fill="#555">y</text>
    <line x1="${pX(x1)}" y1="${pY(y1)}" x2="${pX(x2)}" y2="${pY(y2)}" stroke="#ec4899" stroke-width="2"/>
    <circle cx="${origX}" cy="${pY(k.b)}" r="3" fill="#ec4899"/>
    <text x="${origX+6}" y="${pY(k.b)-4}" font-size="10" fill="#ec4899" font-weight="700">(0 ; ${k.b})</text>
  </svg>`;
  const options = [
    { label: '\\(a > 0\\) et \\(b > 0\\)', key: '++' },
    { label: '\\(a > 0\\) et \\(b < 0\\)', key: '+-' },
    { label: '\\(a < 0\\) et \\(b > 0\\)', key: '-+' },
    { label: '\\(a < 0\\) et \\(b < 0\\)', key: '--' }
  ];
  const goodKey = k.aSigne + k.bSigne;
  const { choices, correctIdx } = makeQCM(
    options.map(o => ({ html: o.label, correct: o.key === goodKey }))
  );
  return {
    theme: 'fonctions', title: 'Signe de a et b (allure)',
    body: `Voici la représentation graphique d'une fonction affine \\(f(x) = ax + b\\). Que peut-on dire des signes de \\(a\\) et de \\(b\\) ?${svg}`,
    type: 'qcm', choices, correctIdx,
    solution: `La droite ${k.aSigne === '+' ? '<b>monte</b>' : '<b>descend</b>'} → \\(a ${k.aSigne === '+' ? '> 0' : '< 0'}\\).<br>Elle coupe l'axe des ordonnées ${k.bSigne === '+' ? '<b>au-dessus</b>' : '<b>en-dessous</b>'} de l'origine → \\(b ${k.bSigne === '+' ? '> 0' : '< 0'}\\).`,
    help: {
      cours: "Pour une fonction affine \\(f(x) = ax + b\\) :<br>• <b>\\(a\\) (coefficient directeur)</b> : \\(a > 0\\) → droite qui monte ; \\(a < 0\\) → descend.<br>• <b>\\(b\\) (ordonnée à l'origine)</b> : signe de l'ordonnée du point d'intersection avec l'axe vertical.",
      savoirFaire: "Observer le sens de variation + lire l'ordonnée en \\(x=0\\).",
      erreurs: ["Confondre \\(a\\) et \\(b\\).", "Inverser les signes.", "Oublier que \\(b\\) est la valeur en 0, pas au point de croisement avec l'axe des abscisses."]
    }
  };
}

/* ------------------------------------------------------------------
   Angles — triangle isocèle (angle à la base, au sommet)
   ------------------------------------------------------------------ */
function tA_triangle_isocele() {
  const cases = [
    { cas: 'base', donne: 40, reponse: 100, desc: "Dans un triangle isocèle, les deux angles à la base mesurent chacun 40°. Combien mesure l'angle au sommet ?" },
    { cas: 'base', donne: 50, reponse: 80 },
    { cas: 'base', donne: 30, reponse: 120 },
    { cas: 'base', donne: 65, reponse: 50 },
    { cas: 'sommet', donne: 80, reponse: 50, desc: "Dans un triangle isocèle, l'angle au sommet mesure 80°. Combien mesure chacun des deux angles à la base ?" },
    { cas: 'sommet', donne: 40, reponse: 70 },
    { cas: 'sommet', donne: 100, reponse: 40 },
    { cas: 'sommet', donne: 60, reponse: 60 }
  ];
  const k = pick(cases);
  const body = k.cas === 'base'
    ? `Dans un triangle isocèle, les deux angles à la base mesurent chacun ${k.donne}°. Combien mesure l'angle au sommet (en °) ?`
    : `Dans un triangle isocèle, l'angle au sommet mesure ${k.donne}°. Combien mesure chacun des deux angles à la base (en °) ?`;
  const sol = k.cas === 'base'
    ? `Somme des angles d'un triangle = 180°. Angle au sommet = \\(180 - 2 \\times ${k.donne} = ${k.reponse}\\)°.`
    : `Les deux angles à la base sont égaux. Leur somme = \\(180 - ${k.donne} = ${180 - k.donne}\\)°. Chacun mesure \\(${180 - k.donne} \\div 2 = ${k.reponse}\\)°.`;
  return {
    theme: 'angles', title: 'Triangle isocèle',
    body, type: 'input', expected: String(k.reponse), suffix: '°',
    solution: sol,
    help: {
      cours: "Dans un <b>triangle isocèle</b>, les deux angles à la base sont égaux. La somme des trois angles vaut 180°.",
      savoirFaire: "Si l'angle au sommet est \\(S\\), chaque angle à la base vaut \\((180 - S) / 2\\). Si un angle à la base est \\(B\\), le sommet vaut \\(180 - 2B\\).",
      erreurs: ["Oublier de diviser par 2 pour retrouver un seul angle à la base.", "Confondre angle au sommet et angle à la base.", "Se tromper dans la somme à 180°."]
    }
  };
}

/* ------------------------------------------------------------------
   Angles — somme des angles d'un quadrilatère
   ------------------------------------------------------------------ */
function tA_somme_quadrilatere() {
  const cases = [
    { angles: [90, 90, 110], r: 70 },
    { angles: [80, 100, 75], r: 105 },
    { angles: [60, 120, 80], r: 100 },
    { angles: [90, 90, 90], r: 90 },  // quatre angles droits → rectangle
    { angles: [70, 110, 70], r: 110 },
    { angles: [85, 95, 105], r: 75 }
  ];
  const k = pick(cases);
  return {
    theme: 'angles', title: 'Somme des angles d\'un quadrilatère',
    body: `Un quadrilatère a trois de ses angles qui mesurent ${k.angles[0]}°, ${k.angles[1]}° et ${k.angles[2]}°. Combien mesure le quatrième (en °) ?`,
    type: 'input', expected: String(k.r), suffix: '°',
    solution: `La somme des angles d'un quadrilatère vaut \\(360°\\). Le 4<sup>e</sup> angle vaut \\(360 - ${k.angles[0]} - ${k.angles[1]} - ${k.angles[2]} = ${k.r}\\)°.`,
    help: {
      cours: "Dans tout <b>quadrilatère</b>, la somme des quatre angles vaut <b>360°</b> (un quadrilatère = 2 triangles, donc 2×180° = 360°).",
      savoirFaire: "Soustraire la somme des trois angles connus à 360°.",
      erreurs: ["Utiliser 180° (somme pour un triangle).", "Oublier un angle dans le calcul.", "Se tromper de calcul."]
    }
  };
}

/* ==========================================================================
   EXPORT : mappage thème → générateurs
   ========================================================================== */
const QUESTION_BANK = {
  calcul:       [ t1_priorites, t1_fraction_entier, t1_somme_fractions, t1_produit_fractions, t1_puissance, t1_puissance_10, t1_ecriture_sci, t1_op_ecriture_sci, t1_racine_carre_parfait, t1_racine_encadrement, t1_racine_arrondi ],
  arithmetique: [ t1_pgcd, t1_ppcm, t1_frac_irred, t1_divisibilite, t1_nombre_premier, t1_decomposition_premiers, t1_probleme_pgcd ],
  pourcent:   [ t2_pct_effectif, t2_pct_complement, t2_vitesse_temps, t2_quatrieme_prop, t2_conversion, t2_coef_multiplicateur, t2_coef_mult_application, t2_evolutions_successives, t2_echelle_carte ],
  algebre:    [ t3_equation, t3_developpe, t3_factoriser, t3_image, t3_equivalence_equation, t3_identite_remarquable, t3_equation_produit, t3_equation_x_carre, t3_oppose_expression ],
  fonctions:  [ t4_image_lineaire, t4_coefficient_lin, t4_fonction_affine, t4_lecture_graphique, t4_intersection_droites, t4_ab_graphique, t4_modelisation, t4_antecedent_algebrique, t4_notation_fonction, t4_signe_a_b_allure ],
  geometrie:  [
    t5_pythagore_hypotenuse, t5_pythagore_cote, t5_pythagore_reciproque,
    t5_thales, t5_thales_papillon, t5_thales_reciproque,
    t5_triangles_semblables,
    t5_perimetre_losange, t5_angle_droit,
    t6_angles_complementaires, t6_cos_formule, t6_choisir_formule, t6_identifier_cote, t6_ecrire_rapport, t6_choix_formule_cote
  ],
  angles:     [ tA_somme_triangle, tA_supplementaires, tA_opposes_sommet, tA_alternes_correspondants, tA_triangle_isocele, tA_somme_quadrilatere ],
  espace:     [ t9_volume_pave, t9_volume_cube, t11_volume_cylindre, t11_volume_cone, t11_volume_sphere, t11_volume_pyramide, t11_aire_sphere, t11_agrandissement_volume, t11_section, t11_volume_assemblage, t11_lat_long ],
  transformations: [ t7_identifier_transfo, t7_frise_transformation, t7_frise_image, t7_fraction_tour, t7_axes_symetrie, t7_conservation, t7_homothetie_aire, t7_sym_centrale_identite ],
  stats:      [ t8_mediane, t8_moyenne, t8_etendue, t8_moy_effectifs, t8_frequence, t8_diagramme_batons, t8_camembert, t8_camembert_angle, t8_histogramme ],
  probas:     [ t8_proba_simple, t8_proba_contraire, t8_proba_tableau, t8_proba_de, t8_proba_deux_epreuves ],
  mesures:    [ t9_aire_rectangle, t9_aire_disque, t9_aire_carre, t9_conv_longueur, t9_conv_aire, t9_conv_volume, t9_arrondi, t11_grandeur_composee ],
  algo:       [ t10_scratch_carre, t10_polygone_regulier, t10_scratch_calcul, t10_boucle_pour, t10_condition_si, t10_variable_compteur, t10_evenement_drapeau, t10_bloc_perso ]
};

const THEME_META = {
  calcul:          { label: 'Calcul numérique', short: 'Calcul', icon: '½', color: '#6366f1' },
  arithmetique:    { label: 'Arithmétique (PGCD, PPCM, premiers)', short: 'Arithmétique', icon: '÷', color: '#a855f7' },
  pourcent:        { label: 'Proportionnalité & pourcentages', short: 'Proportions', icon: '%', color: '#f97316' },
  algebre:         { label: 'Calcul littéral & équations', short: 'Algèbre', icon: 'x', color: '#0ea5e9' },
  fonctions:       { label: 'Fonctions', short: 'Fonctions', icon: 'ƒ', color: '#ec4899' },
  geometrie:       { label: 'Géométrie plane (Pythagore, Thalès, trigo)', short: 'Géométrie', icon: '△', color: '#14b8a6' },
  angles:          { label: 'Angles (somme, parallèles, sécantes)', short: 'Angles', icon: '∡', color: '#0d9488' },
  espace:          { label: 'Géométrie dans l\'espace (volumes, solides)', short: 'Espace', icon: '▣', color: '#8b5cf6' },
  transformations: { label: 'Transformations', short: 'Transfos', icon: '↻', color: '#ef4444' },
  stats:           { label: 'Statistiques', short: 'Stats', icon: 'x̄', color: '#eab308' },
  probas:          { label: 'Probabilités', short: 'Probas', icon: 'P', color: '#a855f7' },
  mesures:         { label: 'Grandeurs & mesures', short: 'Mesures', icon: 'V', color: '#22c55e' },
  algo:            { label: 'Algorithmique (Scratch)', short: 'Algo', icon: '▶', color: '#f59e0b' }
};

/* Construit une série de 9 questions (format Brevet) SANS DOUBLONS de générateurs.
   Règle : chaque savoir-faire (générateur) n'apparaît au plus qu'une fois par série,
   quel que soit le choix initial (même si un seul thème est sélectionné).
   Si le pool total de générateurs uniques < 9, la série est tronquée au max disponible. */
function buildSeries(selectedThemes) {
  const themes = selectedThemes.length ? selectedThemes : Object.keys(QUESTION_BANK);
  const total = 9;

  // Pool de générateurs par thème, mélangé
  const byTheme = {};
  themes.forEach(t => {
    byTheme[t] = shuffle((QUESTION_BANK[t] || []).slice());
  });

  const used = new Set();
  const selected = [];

  // Round-robin entre thèmes pour équilibrer
  let keepGoing = true;
  while (selected.length < total && keepGoing) {
    keepGoing = false;
    for (const t of themes) {
      if (selected.length >= total) break;
      while (byTheme[t].length > 0) {
        const gen = byTheme[t].shift();
        if (!used.has(gen)) {
          used.add(gen);
          selected.push(gen);
          keepGoing = true;
          break;
        }
      }
    }
  }

  return shuffle(selected.map(g => g()));
}
