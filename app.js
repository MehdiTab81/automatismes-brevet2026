/* ==========================================================================
   Logique de l'application — Automatismes 3ème / Brevet
   Support QCM + réponses courtes (input)
   ========================================================================== */

const state = {
  mode: 'eval',      // 'eval' ou 'train'
  duree: 1200,       // en secondes (0 = libre)
  series: [],        // [{question object}]
  answers: [],       // [{selectedIdx, helped}]
  current: 0,
  timer: null,
  remaining: 0,
  startedAt: null
};

/* ---------- Utilitaires UI ---------- */
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

function showScreen(id) {
  $$('.screen').forEach(s => s.classList.remove('active'));
  $('#' + id).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderMath(node) {
  if (window.MathJax && MathJax.typesetPromise) {
    MathJax.typesetPromise([node]).catch(() => {});
  }
}

/* ---------- Onglets accueil ---------- */
function initTabs() {
  $$('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.tab-btn').forEach(b => b.classList.remove('active'));
      $$('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const panel = document.getElementById(btn.dataset.target);
      panel.classList.add('active');
      if (btn.dataset.target === 'tab-revision') renderRevision();
      if (btn.dataset.target === 'tab-parcours') renderParcours();
      if (btn.dataset.target === 'tab-duel') renderDuelProfiles();
    });
  });
}

/* ---------- Peuplement dynamique des thèmes (home) ---------- */
function initThemes() {
  const list = $('#themes-list');
  if (!list) return; // onglet "S'évaluer" simplifié : pas de liste de thèmes
  list.innerHTML = Object.entries(THEME_META).map(([id, meta]) => `
    <label class="theme-pill selected" data-theme="${id}" style="color: ${meta.color};">
      <input type="checkbox" name="theme" value="${id}" checked />
      <span class="pill-icon" style="background: ${meta.color};">${meta.icon}</span>
      <span class="pill-label">${meta.short}</span>
    </label>
  `).join('');
  // Le <label> toggle l'input automatiquement ; on ne fait que synchroniser la classe visuelle
  $$('.theme-pill').forEach(pill => {
    const input = pill.querySelector('input');
    input.addEventListener('change', () => pill.classList.toggle('selected', input.checked));
  });
  $('#btn-all-themes').addEventListener('click', () => {
    $$('.theme-pill').forEach(p => {
      p.querySelector('input').checked = true;
      p.classList.add('selected');
    });
  });
  $('#btn-no-themes').addEventListener('click', () => {
    $$('.theme-pill').forEach(p => {
      p.querySelector('input').checked = false;
      p.classList.remove('selected');
    });
  });
}

/* ==========================================================================
   Accessibilité — profil PAP/PPS/dys/TDAH (localStorage)
   ========================================================================== */
const A11Y_KEY = 'auto3br.a11y';
const A11Y_DEFAULTS = {
  fontLexend: false,
  size: 'normal',      // 'normal' | 'large' | 'xlarge'
  spacing: false,
  bgCream: false,
  hideTimer: false,
  reduceMotion: false,
  speak: false
};

function loadA11y() {
  try { return Object.assign({}, A11Y_DEFAULTS, JSON.parse(localStorage.getItem(A11Y_KEY) || '{}')); }
  catch (e) { return { ...A11Y_DEFAULTS }; }
}
function saveA11y(prefs) { localStorage.setItem(A11Y_KEY, JSON.stringify(prefs)); }

function applyA11y(prefs) {
  const b = document.body;
  b.classList.toggle('a11y-font-lexend', prefs.fontLexend);
  b.classList.toggle('a11y-size-large', prefs.size === 'large');
  b.classList.toggle('a11y-size-xlarge', prefs.size === 'xlarge');
  b.classList.toggle('a11y-spacing', prefs.spacing);
  b.classList.toggle('a11y-bg-cream', prefs.bgCream);
  b.classList.toggle('a11y-hide-timer', prefs.hideTimer);
  b.classList.toggle('a11y-reduce-motion', prefs.reduceMotion);
  b.classList.toggle('a11y-speak', prefs.speak);
}

function initA11y() {
  const prefs = loadA11y();
  applyA11y(prefs);

  const modal = $('#a11y-modal');
  const btnOpen = $('#btn-a11y');
  const btnClose = $('#btn-a11y-close');
  const btnApply = $('#btn-a11y-apply');
  const btnReset = $('#btn-a11y-reset');
  if (!modal || !btnOpen) return;

  function syncFormFromPrefs() {
    const p = loadA11y();
    $('#a11y-font-lexend').checked = p.fontLexend;
    $('#a11y-size').value = p.size;
    $('#a11y-spacing').checked = p.spacing;
    $('#a11y-bg-cream').checked = p.bgCream;
    $('#a11y-hide-timer').checked = p.hideTimer;
    $('#a11y-reduce-motion').checked = p.reduceMotion;
    $('#a11y-speak').checked = p.speak;
  }

  function collectPrefs() {
    return {
      fontLexend: $('#a11y-font-lexend').checked,
      size: $('#a11y-size').value,
      spacing: $('#a11y-spacing').checked,
      bgCream: $('#a11y-bg-cream').checked,
      hideTimer: $('#a11y-hide-timer').checked,
      reduceMotion: $('#a11y-reduce-motion').checked,
      speak: $('#a11y-speak').checked
    };
  }

  btnOpen.addEventListener('click', () => { syncFormFromPrefs(); modal.hidden = false; });
  btnClose.addEventListener('click', () => { modal.hidden = true; });
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.hidden = true; });

  btnApply.addEventListener('click', () => {
    const p = collectPrefs();
    saveA11y(p);
    applyA11y(p);
    modal.hidden = true;
    // Re-rendu de la question en cours si présent (pour faire apparaître/disparaître le bouton 🔊)
    if (state && state.series && state.series.length && document.querySelector('#screen-test.active')) {
      renderQuestion();
    }
  });

  btnReset.addEventListener('click', () => {
    saveA11y({ ...A11Y_DEFAULTS });
    applyA11y(A11Y_DEFAULTS);
    syncFormFromPrefs();
  });
}

/* Synthèse vocale : lit le texte de l'énoncé en français.
   On enlève les balises HTML et simplifie les expressions LaTeX les plus courantes. */
function a11ySpeak(text) {
  if (!('speechSynthesis' in window)) {
    alert("La lecture vocale n'est pas disponible sur cet appareil.");
    return;
  }
  // Nettoyage HTML
  const tmp = document.createElement('div');
  tmp.innerHTML = text;
  let spoken = tmp.textContent || tmp.innerText || '';
  // Simplifications LaTeX courantes
  spoken = spoken
    .replace(/\\dfrac\{([^}]+)\}\{([^}]+)\}/g, '$1 sur $2')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1 sur $2')
    .replace(/\\sqrt\{([^}]+)\}/g, 'racine carrée de $1')
    .replace(/\\times/g, ' fois ')
    .replace(/\\pi/g, ' pi ')
    .replace(/\\approx/g, ' environ ')
    .replace(/\^2/g, ' au carré')
    .replace(/\^3/g, ' au cube')
    .replace(/\^\{?(-?\d+)\}?/g, ' puissance $1')
    .replace(/\\/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const utter = new SpeechSynthesisUtterance(spoken);
  utter.lang = 'fr-FR';
  utter.rate = 0.9;
  window.speechSynthesis.cancel();

  const btn = document.querySelector('.btn-speak');
  if (btn) btn.classList.add('speaking');
  utter.onend = () => { if (btn) btn.classList.remove('speaking'); };
  window.speechSynthesis.speak(utter);
}

/* ---------- Mode sombre ---------- */
function initDarkMode() {
  const stored = localStorage.getItem('theme-mode');
  const prefers = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const mode = stored || (prefers ? 'dark' : 'light');
  document.body.dataset.theme = mode;
  updateThemeBtn();
  $('#btn-theme').addEventListener('click', () => {
    const cur = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
    document.body.dataset.theme = cur;
    localStorage.setItem('theme-mode', cur);
    updateThemeBtn();
  });
}
function updateThemeBtn() {
  $('#btn-theme').textContent = document.body.dataset.theme === 'dark' ? '☀️' : '🌙';
}

/* Correspondance générateur → clé d'exercice de rédaction */
const REDACTION_FOR_GEN = {
  t5_pythagore_hypotenuse: 'pythagore_direct',
  t5_pythagore_cote: 'pythagore_direct',
  t5_pythagore_reciproque: 'pythagore_reciproque_vrai', // default to vrai
  t5_thales: 'thales_direct',
  t5_thales_papillon: 'thales_direct',
  t5_thales_reciproque: 'thales_reciproque_vrai',
  t5_triangles_semblables: 'triangles_semblables',
  t6_cos_formule: 'trigo_cote',
  t6_choix_formule_cote: 'trigo_cote',
  t6_ecrire_rapport: 'trigo_cote'
};

/* Fiches consultées — stockées localement */
const REV_VIEWED_KEY = 'auto3br.rev.viewed';
function getViewedSet() {
  try { return new Set(JSON.parse(localStorage.getItem(REV_VIEWED_KEY) || '[]')); } catch(e) { return new Set(); }
}
function markAsViewed(genName) {
  const s = getViewedSet();
  s.add(genName);
  localStorage.setItem(REV_VIEWED_KEY, JSON.stringify([...s]));
  // Mettre à jour l'UI en direct
  const card = document.querySelector(`.flashcard[data-gen="${genName}"]`);
  if (card) card.classList.add('viewed');
  updateThemeCounts();
}
function updateThemeCounts() {
  const viewed = getViewedSet();
  document.querySelectorAll('.revision-theme').forEach(t => {
    const theme = t.dataset.theme;
    const gens = QUESTION_BANK[theme] || [];
    const seen = gens.filter(g => viewed.has(g.name)).length;
    const total = gens.length;
    const countEl = t.querySelector('.revision-theme-count');
    if (!countEl) return;
    countEl.textContent = `${seen}/${total}`;
    countEl.classList.remove('partial', 'complete');
    if (seen === total && total > 0) countEl.classList.add('complete');
    else if (seen > 0) countEl.classList.add('partial');
  });
}

/* ---------- Fiche de révision (accordéon + flashcards 3D) ---------- */
function renderRevision() {
  const container = $('#revision-content');
  if (container.dataset.built === '1') { updateThemeCounts(); return; }

  const intro = `<div class="revision-intro">💡 <strong>Comment utiliser ces fiches ?</strong> Clique sur un thème pour ouvrir ses cartes. Chaque carte se retourne au clic. Un ✓ apparaît sur les cartes déjà consultées. Les compteurs en haut à droite indiquent ta progression.</div>
  <div class="revision-search">
    <input type="text" id="revision-search-input" placeholder="🔎 Rechercher une compétence (ex. Thalès, volume, pourcentage...)" autocomplete="off" />
    <button type="button" class="ghost small search-clear" id="revision-search-clear">Effacer</button>
  </div>
  <div id="revision-empty" class="revision-empty" style="display:none;">Aucune compétence ne correspond à cette recherche.</div>`;

  const html = intro + Object.entries(QUESTION_BANK).map(([themeId, gens]) => {
    const meta = THEME_META[themeId];
    const cards = gens.map((gen, i) => {
      let q;
      try { q = gen(); } catch(e) { return ''; }
      const cardId = `fc-${themeId}-${i}`;
      return `
        <div class="flashcard" id="${cardId}" data-theme="${themeId}" data-gen="${gen.name}">
          <div class="flashcard-inner">
            <div class="flashcard-face flashcard-front">
              <div>
                <div class="flashcard-icon" style="background:${meta.color};">${meta.icon}</div>
                <div class="fc-theme">${meta.short}</div>
                <div class="fc-title">${q.title}</div>
              </div>
              <div class="fc-hint">Clique pour voir la fiche →</div>
            </div>
            <div class="flashcard-face flashcard-back">
              <h5>Cours</h5>
              <div>${q.help.cours}</div>
              <h5>Savoir-faire</h5>
              <div>${q.help.savoirFaire}</div>
              <h5>Erreurs à éviter</h5>
              <ul>${q.help.erreurs.map(e => `<li>${e}</li>`).join('')}</ul>
              <button class="fc-practice-btn" data-gen="${gen.name}">⚡ S'entraîner sur cette compétence</button>
              ${REDACTION_FOR_GEN[gen.name] ? `<button class="fc-practice-btn" style="background:#ec4899;margin-top:4px;" data-redaction="${REDACTION_FOR_GEN[gen.name]}">✍️ S'entraîner à rédiger</button>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
    return `
      <div class="revision-theme" data-theme="${themeId}">
        <div class="revision-theme-header">
          <span class="rev-icon" style="background: ${meta.color};">${meta.icon}</span>
          <span class="revision-theme-title">${meta.label}</span>
          <span class="revision-theme-count">${gens.length} fiche${gens.length>1?'s':''}</span>
          <span class="revision-theme-chevron">⌄</span>
        </div>
        <div class="revision-theme-body">
          <div class="flashcards-grid">${cards}</div>
        </div>
      </div>`;
  }).join('');
  container.innerHTML = html;

  // Accordéon : clic sur header
  container.querySelectorAll('.revision-theme-header').forEach(h => {
    h.addEventListener('click', () => {
      const theme = h.closest('.revision-theme');
      const wasOpen = theme.classList.contains('open');
      // Fermer les autres (1 seul ouvert à la fois)
      container.querySelectorAll('.revision-theme.open').forEach(t => t.classList.remove('open'));
      if (!wasOpen) {
        theme.classList.add('open');
        // Trigger MathJax render on the now-visible cards
        setTimeout(() => renderMath(theme.querySelector('.revision-theme-body')), 50);
      }
    });
  });

  // Clic sur flashcard → flip (sauf si clic sur bouton)
  // Appliquer la classe "viewed" aux cartes déjà consultées
  const viewed = getViewedSet();
  container.querySelectorAll('.flashcard').forEach(card => {
    if (viewed.has(card.dataset.gen)) card.classList.add('viewed');
    card.addEventListener('click', e => {
      if (e.target.closest('.fc-practice-btn')) return;
      card.classList.toggle('flipped');
      // Marquer comme consultée dès le 1er flip
      if (card.classList.contains('flipped')) markAsViewed(card.dataset.gen);
    });
  });
  updateThemeCounts();

  // Barre de recherche
  const searchInp = $('#revision-search-input');
  const searchClear = $('#revision-search-clear');
  const emptyEl = $('#revision-empty');
  const applySearch = () => {
    const q = searchInp.value.trim().toLowerCase();
    let visibleCount = 0;
    container.querySelectorAll('.revision-theme').forEach(theme => {
      let cardMatches = 0;
      theme.querySelectorAll('.flashcard').forEach(card => {
        const title = card.querySelector('.fc-title')?.textContent?.toLowerCase() || '';
        const match = !q || title.includes(q);
        card.style.display = match ? '' : 'none';
        if (match) cardMatches++;
      });
      theme.style.display = (cardMatches === 0 && q) ? 'none' : '';
      if (cardMatches > 0 || !q) visibleCount++;
      // Si recherche active : ouvrir automatiquement les thèmes avec résultats, fermer les autres
      if (q) theme.classList.toggle('open', cardMatches > 0);
    });
    emptyEl.style.display = (q && visibleCount === 0) ? 'block' : 'none';
  };
  searchInp.addEventListener('input', applySearch);
  searchClear.addEventListener('click', () => { searchInp.value = ''; applySearch(); searchInp.focus(); });

  // Bouton "S'entraîner" (question) / "Rédiger" (exercice glisser-déposer)
  container.querySelectorAll('.fc-practice-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      if (btn.dataset.redaction) {
        openRedaction(btn.dataset.redaction);
        return;
      }
      const genName = btn.dataset.gen;
      const gen = Object.values(QUESTION_BANK).flat().find(g => g.name === genName);
      if (!gen) return;
      startQuickPractice(gen);
    });
  });

  container.dataset.built = '1';
}

/* Mini-entraînement sur une seule compétence (lancé depuis une flashcard) */
function startQuickPractice(gen) {
  const q = gen();
  state.series = [q];
  state.answers = [{ selectedIdx: null, inputAnswer: '', helped: false }];
  state.current = 0;
  state.mode = 'train';   // active le bouton d'aide
  state.duree = 0;
  state.remaining = 0;
  state.parcours = null;
  state._quickPractice = true; // flag pour savoir qu'on revient à la révision après
  startTimer();
  showScreen('screen-test');
  renderQuestion();
}

/* ==========================================================================
   Système élève : identité + historique (localStorage)
   ========================================================================== */
const STORE_KEYS = { STUDENT: 'auto3br.student', SESSIONS: 'auto3br.sessions', REPORTS: 'auto3br.reports' };

function getStudent() {
  try { return JSON.parse(localStorage.getItem(STORE_KEYS.STUDENT) || 'null'); } catch(e) { return null; }
}
function setStudent(obj) { localStorage.setItem(STORE_KEYS.STUDENT, JSON.stringify(obj)); }
function clearStudent() {
  localStorage.removeItem(STORE_KEYS.STUDENT);
  localStorage.removeItem(STORE_KEYS.SESSIONS);
}
function getSessions() {
  try { return JSON.parse(localStorage.getItem(STORE_KEYS.SESSIONS) || '[]'); } catch(e) { return []; }
}
function saveSession(s) {
  const arr = getSessions();
  arr.unshift(s);
  localStorage.setItem(STORE_KEYS.SESSIONS, JSON.stringify(arr.slice(0, 100)));
  refreshStudentBadge();
}
function getReports() {
  try { return JSON.parse(localStorage.getItem(STORE_KEYS.REPORTS) || '[]'); } catch(e) { return []; }
}
function saveReport(r) {
  const arr = getReports();
  arr.unshift(r);
  localStorage.setItem(STORE_KEYS.REPORTS, JSON.stringify(arr.slice(0, 200)));
}

/* Signaler un problème sur une question */
function reportProblem(qIndex) {
  const q = state.series[qIndex];
  const a = state.answers[qIndex];
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal">
      <h3>Signaler un problème</h3>
      <p class="note">Décris brièvement ce qui ne va pas (énoncé ambigu, calcul faux, choix bizarre, figure…). Ton enseignant recevra la question exacte + ton message.</p>
      <label>Message<br>
        <textarea id="report-msg" style="min-height:100px;" placeholder="Ex. Je pense que la bonne réponse devrait être C. Le calcul donne…"></textarea>
      </label>
      <div class="modal-actions">
        <button class="ghost" id="btn-cancel-report">Annuler</button>
        <button class="primary" id="btn-send-report">Signaler</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  setTimeout(() => $('#report-msg').focus(), 50);
  $('#btn-cancel-report').addEventListener('click', () => modal.remove());
  $('#btn-send-report').addEventListener('click', () => {
    const msg = $('#report-msg').value.trim();
    if (!msg) { alert('Écris ton message.'); return; }
    const st = getStudent();
    saveReport({
      date: new Date().toISOString(),
      student: st ? `${st.prenom} · ${st.classe}` : '(anonyme)',
      theme: q.theme,
      title: q.title,
      body: q.body,
      choices: q.choices,
      correctIdx: q.correctIdx,
      selectedIdx: a.selectedIdx,
      message: msg
    });
    // marquer visuellement
    const btn = document.querySelector(`[data-report-idx="${qIndex}"]`);
    if (btn) { btn.textContent = '✓ Signalé'; btn.classList.add('done'); btn.disabled = true; }
    modal.remove();
  });
}

/* Header badge élève */
function refreshStudentBadge() {
  const st = getStudent();
  const wrap = $('#student-badge');
  if (!wrap) return;
  if (st) {
    wrap.innerHTML = `<span class="student-chip">${st.prenom} · ${st.classe}</span>
                      <button class="icon-btn" id="btn-history" title="Historique" aria-label="Historique">📊</button>`;
    $('#btn-history').addEventListener('click', () => showHistory());
  } else {
    wrap.innerHTML = `<button class="icon-btn" id="btn-login" title="Se connecter">👤</button>`;
    $('#btn-login').addEventListener('click', () => showLogin());
  }
}

/* Fenêtre login simple */
function showLogin(existing = null) {
  const st = existing || getStudent() || { prenom: '', classe: '' };
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal">
      <h3>${existing ? 'Modifier mon profil' : 'Se connecter'}</h3>
      <p class="note" style="margin-top:0;">Ton prénom et ta classe restent <strong>sur ton appareil</strong> (aucun envoi). Utile pour retrouver tes progrès.</p>
      <label>Prénom<br><input id="fld-prenom" value="${st.prenom}" autocomplete="given-name" /></label>
      <label style="margin-top:10px;display:block;">Classe (ex. 1G3)<br><input id="fld-classe" value="${st.classe}" /></label>
      <div class="modal-actions">
        <button class="ghost" id="btn-cancel-login">Annuler</button>
        ${existing ? '<button class="ghost" id="btn-logout-modal" style="color:var(--ko);border-color:var(--ko);">Me déconnecter</button>' : ''}
        <button class="primary" id="btn-save-login">Enregistrer</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  $('#btn-cancel-login').addEventListener('click', () => modal.remove());
  $('#btn-save-login').addEventListener('click', () => {
    const prenom = $('#fld-prenom').value.trim();
    const classe = $('#fld-classe').value.trim();
    if (!prenom || !classe) { alert('Remplis les deux champs.'); return; }
    setStudent({ prenom, classe });
    refreshStudentBadge();
    modal.remove();
  });
  if (existing) {
    $('#btn-logout-modal').addEventListener('click', () => {
      if (confirm('Supprimer ton profil ET tout l\'historique de cet appareil ?')) {
        clearStudent();
        refreshStudentBadge();
        modal.remove();
      }
    });
  }
  setTimeout(() => $('#fld-prenom').focus(), 50);
}

/* Historique */
function showHistory() {
  const st = getStudent();
  const sessions = getSessions();
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';

  const byThemeTotals = {};
  sessions.forEach(s => {
    if (!s.byTheme) return;
    Object.entries(s.byTheme).forEach(([t, v]) => {
      if (!byThemeTotals[t]) byThemeTotals[t] = { ok: 0, total: 0 };
      byThemeTotals[t].ok += v.ok;
      byThemeTotals[t].total += v.total;
    });
  });
  const themeBars = Object.entries(byThemeTotals).map(([t, v]) => {
    const meta = THEME_META[t] || {};
    const pct = v.total ? Math.round(100 * v.ok / v.total) : 0;
    return `
      <div class="theme-row">
        <span class="chip-icon" style="background:${meta.color};width:24px;height:24px;border-radius:6px;display:inline-grid;place-items:center;color:white;font-weight:700;font-size:0.75rem;">${meta.icon}</span>
        <span style="flex:1;font-weight:500;">${meta.short || t}</span>
        <span style="color:var(--muted);font-size:0.85rem;">${v.ok}/${v.total}</span>
        <div class="bar"><div class="bar-fill" style="width:${pct}%;background:${meta.color};"></div></div>
        <span style="min-width:38px;text-align:right;font-weight:600;">${pct}%</span>
      </div>`;
  }).join('');

  const sessionList = sessions.slice(0, 20).map(s => {
    const d = new Date(s.date);
    const dateStr = d.toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric' }) +
                    ' ' + d.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' });
    return `<div class="session-row">
      <span style="font-weight:500;">${dateStr}</span>
      <span class="tag ${s.pct>=70?'ok':(s.pct>=40?'':'ko')}">${s.score}/${s.total} · ${s.pct}%</span>
    </div>`;
  }).join('') || '<p class="note">Pas encore de séance terminée.</p>';

  modal.innerHTML = `
    <div class="modal modal-large">
      <h3 style="margin-bottom:6px;">Mon historique</h3>
      <p class="note" style="margin:0 0 14px;">${st ? st.prenom + ' · ' + st.classe : ''} — ${sessions.length} séance(s)</p>

      <h4 style="margin:14px 0 8px;">Progression par compétence</h4>
      <div class="theme-bars">${themeBars || '<p class="note">Pas encore de données.</p>'}</div>

      <h4 style="margin:20px 0 8px;">Séances récentes</h4>
      <div class="sessions-list">${sessionList}</div>

      <div class="modal-actions" style="margin-top:20px;">
        <button class="ghost" id="btn-edit-profile">Modifier mon profil</button>
        <button class="ghost" id="btn-export">Exporter pour le prof</button>
        <button class="primary" id="btn-close-history">Fermer</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  $('#btn-close-history').addEventListener('click', () => modal.remove());
  $('#btn-edit-profile').addEventListener('click', () => { modal.remove(); showLogin(getStudent()); });
  $('#btn-export').addEventListener('click', () => exportForTeacher());
}

/* Export texte copiable pour le prof */
function exportForTeacher() {
  const st = getStudent() || { prenom: '(inconnu)', classe: '' };
  const sessions = getSessions();
  const byThemeTotals = {};
  sessions.forEach(s => {
    if (!s.byTheme) return;
    Object.entries(s.byTheme).forEach(([t, v]) => {
      if (!byThemeTotals[t]) byThemeTotals[t] = { ok: 0, total: 0 };
      byThemeTotals[t].ok += v.ok;
      byThemeTotals[t].total += v.total;
    });
  });
  const lines = [];
  lines.push(`=== RAPPORT AUTOMATISMES ===`);
  lines.push(`Élève : ${st.prenom} · ${st.classe}`);
  lines.push(`Date d'export : ${new Date().toLocaleString('fr-FR')}`);
  lines.push(`Séances terminées : ${sessions.length}`);
  lines.push('');
  lines.push(`--- Progression par compétence ---`);
  Object.entries(byThemeTotals).forEach(([t, v]) => {
    const meta = THEME_META[t] || { short: t };
    const pct = v.total ? Math.round(100*v.ok/v.total) : 0;
    lines.push(`  ${meta.short.padEnd(18)} ${String(v.ok).padStart(3)}/${String(v.total).padStart(3)}  ${String(pct).padStart(3)} %`);
  });
  lines.push('');
  lines.push(`--- 10 dernières séances ---`);
  sessions.slice(0, 10).forEach(s => {
    const d = new Date(s.date);
    lines.push(`  ${d.toLocaleDateString('fr-FR')} ${d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})} — ${s.score}/${s.total} (${s.pct} %) mode=${s.mode}${s.withHelp ? ` aides=${s.withHelp}`:''}`);
  });

  // Signalements
  const reports = getReports();
  if (reports.length) {
    lines.push('');
    lines.push(`--- Problèmes signalés (${reports.length}) ---`);
    reports.forEach((r, idx) => {
      const d = new Date(r.date);
      const letters = 'ABCD';
      const stripTags = s => (s || '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\\d?frac\{([^{}]+)\}\{([^{}]+)\}/g, '$1/$2')
        .replace(/\\sqrt\{([^{}]+)\}/g, '√($1)')
        .replace(/\\cdot|\\times/g, '×')
        .replace(/\\dots|\\ldots/g, '…')
        .replace(/\\left|\\right/g, '')
        .replace(/\\[a-zA-Z]+/g, ' ')
        .replace(/\\\(|\\\)|\\,|\\;/g,' ')
        .replace(/[{}]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      lines.push('');
      lines.push(`[${idx+1}] ${d.toLocaleString('fr-FR')} — thème: ${(THEME_META[r.theme]||{}).short || r.theme} — ${r.title}`);
      lines.push(`Question : ${stripTags(r.body).slice(0, 500)}`);
      r.choices.forEach((c, i) => {
        const mark = (i === r.correctIdx ? '(juste)' : '') + (i === r.selectedIdx ? ' [choix élève]' : '');
        lines.push(`  ${letters[i]}. ${stripTags(c)} ${mark}`);
      });
      lines.push(`Message élève : ${r.message}`);
    });
  }

  const txt = lines.join('\n');

  // Modale copier/télécharger
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  // Pourcentage global (moyenne des scores par séance)
  const pctGlobal = sessions.length
    ? Math.round(sessions.reduce((s,x) => s+x.pct, 0) / sessions.length)
    : 0;

  modal.innerHTML = `
    <div class="modal">
      <h3>Exporter pour le prof</h3>
      <p class="note">Trois façons d'envoyer ton rapport à ton enseignant.</p>
      <textarea id="export-text" readonly>${txt.replace(/</g,'&lt;')}</textarea>
      <div class="modal-actions">
        <button class="ghost" id="btn-close-export">Fermer</button>
        <button class="ghost" id="btn-download">Télécharger (.txt)</button>
        <button class="ghost" id="btn-copy">Copier le texte</button>
        <button class="primary" id="btn-send-direct">📤 Envoyer au prof</button>
      </div>
      <p class="note" style="margin-top:10px;">
        <strong>Envoi direct</strong> : ton rapport arrive chez ton enseignant sans passer par ProNote ou mail.
        Seuls ton prénom et ta classe sont transmis, avec tes scores.
      </p>
    </div>`;
  document.body.appendChild(modal);
  $('#btn-close-export').addEventListener('click', () => modal.remove());
  $('#btn-copy').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(txt);
      $('#btn-copy').textContent = '✓ Copié !';
    } catch(e) {
      $('#export-text').select();
      document.execCommand('copy');
      $('#btn-copy').textContent = '✓ Copié !';
    }
  });
  $('#btn-download').addEventListener('click', () => {
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `rapport-${st.prenom}-${st.classe}-${new Date().toISOString().slice(0,10)}.txt`;
    a.click();
  });
  $('#btn-send-direct').addEventListener('click', async () => {
    const btn = $('#btn-send-direct');
    btn.disabled = true;
    btn.textContent = 'Envoi…';
    try {
      // FormSubmit.co : envoi direct par mail, sans backend.
      // Endpoint ajax → réponse JSON (pas de redirection).
      const TEACHER_ENDPOINT = 'https://formsubmit.co/ajax/mahditabka6@gmail.com';
      const payload = {
        _subject: `[Automatismes 3ème Brevet] Rapport de ${st.prenom} (${st.classe}) — ${pctGlobal}%`,
        _template: 'table',
        _captcha: 'false',
        Élève: `${st.prenom} · ${st.classe}`,
        'Nombre de séances': String(sessions.length),
        'Pourcentage global': `${pctGlobal}%`,
        Rapport: txt
      };
      const res = await fetch(TEACHER_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success !== 'false') {
        btn.textContent = '✓ Envoyé au prof !';
        btn.style.background = 'var(--ok)';
        btn.style.borderColor = 'var(--ok)';
      } else {
        throw new Error(data.message || ('HTTP ' + res.status));
      }
    } catch(e) {
      btn.disabled = false;
      btn.textContent = 'Échec — réessayer';
      alert("Envoi impossible (pas de connexion Internet ?). Tu peux copier ou télécharger le rapport à la place.");
    }
  });
}

/* ---------- Démarrer l'évaluation ---------- */
$('#btn-start').addEventListener('click', () => {
  // Mode évaluation officiel : timer obligatoire, tous thèmes mélangés, pas d'aide
  const duree = parseInt(document.querySelector('input[name=duree]:checked').value, 10) || 1200;
  state.mode = 'eval';
  state.duree = duree;
  state.series = buildSeries([]); // [] = tous les thèmes mélangés
  state.answers = state.series.map(() => ({ selectedIdx: null, inputAnswer: '', helped: false }));
  state.current = 0;
  state.startedAt = Date.now();
  state.remaining = duree;
  startTimer();
  showScreen('screen-test');
  renderQuestion();
});

/* ---------- Démarrer un entraînement libre ---------- */
const btnStartTrain = $('#btn-start-train');
if (btnStartTrain) {
  btnStartTrain.addEventListener('click', () => {
    // Récupère thèmes cochés
    const themes = $$('#themes-list input[name="theme"]:checked').map(i => i.value);
    if (!themes.length) {
      alert('Coche au moins un thème pour t\'entraîner.');
      return;
    }
    const nbq = parseInt(document.querySelector('input[name="train-nbq"]:checked')?.value, 10) || 7;
    const duree = parseInt(document.querySelector('input[name="train-duree"]:checked')?.value, 10) || 0;

    // Construit une série avec le nombre demandé. buildSeries force 9 par défaut — on tronque/complète.
    const series = buildSeries(themes);
    // buildSeries renvoie 9 max ; si on veut 12, on complète en tirant à nouveau sans contrainte "unique"
    let finalSeries = series.slice(0, Math.min(nbq, series.length));
    if (nbq > finalSeries.length) {
      // Compléter en piochant parmi les générateurs des thèmes choisis (doublons autorisés)
      const allGens = themes.flatMap(t => QUESTION_BANK[t] || []);
      while (finalSeries.length < nbq && allGens.length > 0) {
        const g = allGens[Math.floor(Math.random() * allGens.length)];
        finalSeries.push(g());
      }
    }

    state.mode = 'train';  // aide + cours disponibles
    state.duree = duree;
    state.series = finalSeries;
    state.answers = state.series.map(() => ({ selectedIdx: null, inputAnswer: '', helped: false }));
    state.current = 0;
    state.startedAt = Date.now();
    state.remaining = duree;
    state.parcours = null;
    startTimer();
    showScreen('screen-test');
    renderQuestion();
  });
}

/* ---------- Timer ---------- */
function startTimer() {
  clearInterval(state.timer);
  if (state.duree === 0) {
    $('#timer').textContent = '∞';
    return;
  }
  updateTimerDisplay();
  state.timer = setInterval(() => {
    state.remaining--;
    updateTimerDisplay();
    if (state.remaining <= 0) {
      clearInterval(state.timer);
      finishTest();
    }
  }, 1000);
}

function updTimerLow() {
  if (state.remaining <= 60) $('#timer').classList.add('low');
  else $('#timer').classList.remove('low');
}

function updateTimerDisplay() {
  const m = Math.floor(state.remaining / 60);
  const s = state.remaining % 60;
  $('#timer').textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  updTimerLow();
}

/* ---------- Rendu d'une question ---------- */
function renderQuestion() {
  const q = state.series[state.current];
  const ans = state.answers[state.current];

  $('#progress').textContent = `Question ${state.current + 1} / ${state.series.length}`;

  const meta = THEME_META[q.theme] || {};
  const c = $('#question-container');
  const isInput = q.type === 'input';

  const answerBlock = isInput ? `
    <div class="input-answer">
      <label style="font-weight:600;color:var(--muted);font-size:0.9rem;">Ta réponse :</label>
      <div class="input-row">
        <input type="text" id="qinput" value="${ans.inputAnswer ?? ''}" placeholder="tape ta réponse ici" autocomplete="off" inputmode="${q.inputSuffix && /^\d/.test(ans.inputAnswer||'') ? 'decimal' : 'text'}" />
        ${q.inputSuffix ? `<span class="input-suffix">${q.inputSuffix}</span>` : ''}
      </div>
      <p class="note" style="font-size:0.82rem;margin-top:8px;">Tu peux écrire les virgules avec « , » ou « . ». Pas besoin de préciser l'unité.</p>
    </div>
  ` : `
    <div class="choices">
      ${q.choices.map((ch, i) => `
        <label class="choice ${ans.selectedIdx === i ? 'selected' : ''}" data-idx="${i}">
          <input type="radio" name="qchoice" ${ans.selectedIdx === i ? 'checked' : ''} />
          <span class="letter">${String.fromCharCode(65 + i)}</span>
          <span class="content">${ch}</span>
        </label>
      `).join('')}
    </div>
  `;

  const a11yPrefs = loadA11y();
  const speakBtn = a11yPrefs.speak
    ? `<button class="btn-speak" id="btn-speak" type="button" aria-label="Lire la question à voix haute">🔊 Lire la question</button>`
    : '';

  c.innerHTML = `
    <div class="q-chip" style="color: ${meta.color || 'var(--muted)'};">
      <span class="chip-icon" style="background: ${meta.color || 'var(--muted)'};">${meta.icon || '?'}</span>
      ${themeLabel(q.theme)}
      <span class="chip-sep"></span>
      <span style="color: var(--muted);">${q.title}</span>
    </div>
    ${speakBtn}
    <div class="q-body">${q.body}</div>
    ${answerBlock}
    ${state.mode === 'train' ? `
      <button class="help-btn" id="btn-help">Aide — rappel de cours</button>
      <div id="help-panel" style="display:none;"></div>
    ` : ''}
  `;

  if (a11yPrefs.speak) {
    $('#btn-speak')?.addEventListener('click', () => {
      const textToRead = q.body + (isInput ? '' : ' ' + q.choices.map((c, i) => `Réponse ${String.fromCharCode(65+i)} : ${c}`).join('. '));
      a11ySpeak(textToRead);
    });
  }

  if (isInput) {
    const inp = $('#qinput');
    inp.addEventListener('input', () => {
      state.answers[state.current].inputAnswer = inp.value;
      renderDots();
    });
    // focus auto
    setTimeout(() => inp.focus(), 30);
  } else {
    // Listeners de choix QCM
    $$('#question-container .choice').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.idx, 10);
        state.answers[state.current].selectedIdx = idx;
        renderQuestion();
        renderDots();
      });
    });
  }

  if (state.mode === 'train') {
    $('#btn-help').addEventListener('click', () => {
      state.answers[state.current].helped = true;
      const panel = $('#help-panel');
      panel.innerHTML = renderHelp(q.help);
      panel.className = 'help-panel';
      panel.style.display = 'block';
      renderMath(panel);
      renderDots();
    });
  }

  $('#btn-prev').disabled = state.current === 0;
  $('#btn-next').disabled = state.current === state.series.length - 1;

  renderDots();
  renderMath(c);
}

function themeLabel(t) {
  return (THEME_META[t] && THEME_META[t].short) || t;
}

function renderHelp(help) {
  return `
    <h4>Cours</h4><div>${help.cours}</div>
    <h4>Savoir-faire</h4><div>${help.savoirFaire}</div>
    <h4>Erreurs à éviter</h4>
    <ul>${help.erreurs.map(e => `<li>${e}</li>`).join('')}</ul>
  `;
}

/* ---------- Points de navigation ---------- */
function renderDots() {
  const dots = state.series.map((_, i) => {
    const a = state.answers[i];
    let cls = 'qdot';
    const q = state.series[i];
    const isAns = q.type === 'input' ? (a.inputAnswer && a.inputAnswer.trim()) : (a.selectedIdx !== null);
    if (isAns) cls += ' answered';
    if (a.helped) cls += ' helped';
    if (i === state.current) cls += ' current';
    return `<span class="${cls}" data-idx="${i}">${i+1}</span>`;
  }).join('');
  $('#qdots').innerHTML = dots;
  $$('#qdots .qdot').forEach(el => {
    el.addEventListener('click', () => {
      state.current = parseInt(el.dataset.idx, 10);
      renderQuestion();
    });
  });
}

/* ---------- Navigation ---------- */
$('#btn-prev').addEventListener('click', () => {
  if (state.current > 0) { state.current--; renderQuestion(); }
});
$('#btn-next').addEventListener('click', () => {
  if (state.current < state.series.length - 1) { state.current++; renderQuestion(); }
});
$('#btn-finish').addEventListener('click', () => {
  const unanswered = state.answers.filter((a, i) => {
    const q = state.series[i];
    return q.type === 'input' ? !(a.inputAnswer && a.inputAnswer.trim()) : a.selectedIdx === null;
  }).length;
  if (unanswered > 0) {
    if (!confirm(`Il reste ${unanswered} question(s) sans réponse. Valider quand même ?`)) return;
  }
  finishTest();
});

/* ---------- Vérification d'une réponse (QCM ou input) ---------- */
function isAnswerCorrect(q, a) {
  if (q.type === 'input') {
    if (!a.inputAnswer) return false;
    const got = normalizeAnswer(a.inputAnswer);
    const expected = q.expected;
    if (Array.isArray(expected)) {
      return expected.some(e => normalizeAnswer(e) === got);
    }
    if (expected instanceof RegExp) {
      return expected.test(got);
    }
    return normalizeAnswer(String(expected)) === got;
  }
  return a.selectedIdx === q.correctIdx;
}

/* ---------- Fin du test → résultats ---------- */
function finishTest() {
  clearInterval(state.timer);
  const score = state.answers.reduce((s, a, i) =>
    s + (isAnswerCorrect(state.series[i], a) ? 1 : 0), 0);
  const withHelp = state.answers.filter(a => a.helped).length;

  const pct = Math.round(score / state.series.length * 100);
  // Note sur 6 (barème Brevet partie 1 automatismes), arrondi au demi-point
  const note6 = Math.round((score / state.series.length) * 6 * 2) / 2;
  const student = getStudent();
  // En mode éval officielle : on affiche la note /6 en grand
  const showNote6 = state.mode === 'eval' && !state.parcours;
  $('#score-box').innerHTML = `
    <div class="big">${score} / ${state.series.length}</div>
    <div class="sub">${pct} % de réussite
    ${withHelp > 0 ? `· ${withHelp} question(s) avec aide` : ''}
    ${student ? `<br><span style="opacity:0.9;font-size:0.9rem;">${student.prenom} · ${student.classe}</span>` : ''}
    </div>
    ${showNote6 ? `<div style="margin-top:14px;padding:14px 18px;background:rgba(255,255,255,0.18);border-radius:12px;">
      <div style="font-size:0.82rem;letter-spacing:0.06em;text-transform:uppercase;opacity:0.9;">Note (barème Brevet)</div>
      <div style="font-size:2.4rem;font-weight:800;margin-top:4px;">${String(note6).replace('.', ',')} / 6</div>
    </div>` : ''}
  `;

  $('#results-list').innerHTML = state.series.map((q, i) => {
    const a = state.answers[i];
    const ok = isAnswerCorrect(q, a);
    const meta = THEME_META[q.theme] || {};
    let userAns, goodAns;
    if (q.type === 'input') {
      userAns = a.inputAnswer ? `<code>${a.inputAnswer}</code>` : '<em>non répondue</em>';
      const expectedShown = Array.isArray(q.expected) ? q.expected[0] : String(q.expected);
      goodAns = `<code>${expectedShown}${q.inputSuffix ? ' ' + q.inputSuffix : ''}</code>`;
    } else {
      userAns = a.selectedIdx !== null
        ? `<strong>${String.fromCharCode(65 + a.selectedIdx)}.</strong> ${q.choices[a.selectedIdx]}`
        : '<em>non répondue</em>';
      goodAns = `<strong>${String.fromCharCode(65 + q.correctIdx)}.</strong> ${q.choices[q.correctIdx]}`;
    }
    return `
      <div class="result-item ${ok ? 'ok' : 'ko'}">
        <div class="q-head">
          <strong>Q${i+1}.</strong>
          <span class="chip-icon" style="background:${meta.color || '#888'};width:22px;height:22px;border-radius:6px;display:inline-grid;place-items:center;color:white;font-weight:700;font-size:0.75rem;">${meta.icon || '?'}</span>
          <span style="color:var(--muted);font-size:0.9rem;">${meta.short}</span>
          <span>· ${q.title}</span>
          <span class="tag ${ok ? 'ok' : 'ko'}">${ok ? '✓ juste' : '✗ faux'}</span>
          ${a.helped ? '<span class="tag helped">aide utilisée</span>' : ''}
        </div>
        <div class="q-body">${q.body}</div>
        <div><em>Ta réponse :</em> ${userAns}</div>
        ${ok ? '' : `<div style="margin-top:4px;"><em>Bonne réponse :</em> ${goodAns}</div>`}
        <details>
          <summary>Voir la correction détaillée</summary>
          <div style="margin:10px 0;">${q.solution}</div>
          ${renderHelp(q.help)}
        </details>
        <button class="report-btn" data-report-idx="${i}">⚠ Signaler un problème</button>
      </div>
    `;
  }).join('');
  // listeners report
  $$('[data-report-idx]').forEach(btn => {
    btn.addEventListener('click', () => reportProblem(parseInt(btn.dataset.reportIdx, 10)));
  });

  // Sauvegarder la séance dans l'historique
  saveSession({
    date: new Date().toISOString(),
    score, total: state.series.length, pct,
    withHelp,
    mode: state.mode,
    duree: state.duree,
    byTheme: computeByTheme(),
    themes: [...new Set(state.series.map(q => q.theme))],
    parcours: !!state.parcours
  });

  // Si c'était une séance parcours : mettre à jour les compétences
  if (state.parcours) {
    const p = getParcours();
    if (p) updateParcoursAfterSession(p, state.parcours.day);
    state.parcours = null;
  }

  showScreen('screen-results');
  renderMath($('#screen-results'));
}

/* Score par thème — pour le bilan par compétence */
function computeByTheme() {
  const out = {};
  state.series.forEach((q, i) => {
    const t = q.theme;
    if (!out[t]) out[t] = { ok: 0, total: 0 };
    out[t].total++;
    if (isAnswerCorrect(q, state.answers[i])) out[t].ok++;
  });
  return out;
}

/* ---------- Actions post-test ---------- */
$('#btn-retry-wrong').addEventListener('click', () => {
  const wrongIdx = state.answers
    .map((a, i) => isAnswerCorrect(state.series[i], a) ? -1 : i)
    .filter(i => i >= 0);
  if (wrongIdx.length === 0) { alert('Bravo, aucune erreur !'); return; }
  // Régénérer des variantes des questions manquées (mêmes thèmes, nouvelles valeurs)
  const themesWrong = wrongIdx.map(i => state.series[i].theme);
  const series = themesWrong.map(t => {
    const pool = QUESTION_BANK[t];
    return pool[Math.floor(Math.random() * pool.length)]();
  });
  state.series = series;
  state.answers = series.map(() => ({ selectedIdx: null, inputAnswer: '', helped: false }));
  state.current = 0;
  state.mode = 'train';  // mode entraînement automatique
  state.duree = 0;       // sans timer
  state.remaining = 0;
  startTimer();
  showScreen('screen-test');
  renderQuestion();
});

$('#btn-new-test').addEventListener('click', () => {
  // Même série (mêmes thèmes) mais nouvelles valeurs
  const themes = [...new Set(state.series.map(q => q.theme))];
  state.series = buildSeries(themes);
  state.answers = state.series.map(() => ({ selectedIdx: null, inputAnswer: '', helped: false }));
  state.current = 0;
  state.remaining = state.duree;
  startTimer();
  showScreen('screen-test');
  renderQuestion();
});

$('#btn-home').addEventListener('click', () => {
  clearInterval(state.timer);
  showScreen('screen-home');
});

/* ---------- Raccourcis clavier ---------- */
function initKeyboard() {
  document.addEventListener('keydown', e => {
    // Uniquement sur l'écran de test
    if (!$('#screen-test').classList.contains('active')) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    // A, B, C, D → sélectionner une réponse
    const key = e.key.toLowerCase();
    if (['a','b','c','d'].includes(key)) {
      const idx = key.charCodeAt(0) - 97;
      const choice = $$('.choice')[idx];
      if (choice) { choice.click(); e.preventDefault(); }
    } else if (['1','2','3','4'].includes(e.key)) {
      const idx = parseInt(e.key) - 1;
      const choice = $$('.choice')[idx];
      if (choice) { choice.click(); e.preventDefault(); }
    } else if (e.key === 'ArrowRight') {
      if (state.current < state.series.length - 1) { state.current++; renderQuestion(); }
      e.preventDefault();
    } else if (e.key === 'ArrowLeft') {
      if (state.current > 0) { state.current--; renderQuestion(); }
      e.preventDefault();
    }
  });
}

/* ==========================================================================
   PARCOURS 10 JOURS — Répétition espacée (Leitner)
   ==========================================================================
   Chaque compétence = un générateur (nom de fonction, ex. "t1_inverse_double").
   Niveau 0..5, interval = BOX_INTERVALS[level] jours.
   Juste → level++ ; Faux → level = 0 (retour au début).
   ========================================================================== */
const PARCOURS_KEY = 'auto3br.parcours';
const BOX_INTERVALS = [0, 1, 2, 4, 7, 14]; // jours d'attente après une réussite par niveau
const MAX_SESSIONS_PER_DAY = 3;

function daysBetween(isoA, isoB) {
  const a = new Date(isoA); a.setHours(0,0,0,0);
  const b = new Date(isoB); b.setHours(0,0,0,0);
  return Math.round((b - a) / (1000 * 3600 * 24));
}
function todayIso() {
  const d = new Date(); d.setHours(0,0,0,0);
  return d.toISOString();
}

function getParcours() {
  try { return JSON.parse(localStorage.getItem(PARCOURS_KEY) || 'null'); } catch(e) { return null; }
}
function setParcours(p) { localStorage.setItem(PARCOURS_KEY, JSON.stringify(p)); }

function initParcours() {
  const skills = {};
  Object.values(QUESTION_BANK).flat().forEach(gen => {
    skills[gen.name] = { level: 0, dueDay: 1, lastSeenDay: null, history: [] };
  });
  const p = {
    startDate: todayIso(),
    skills,
    sessions: [] // { day, date, score, total, byTheme }
  };
  setParcours(p);
  return p;
}
function resetParcours() {
  localStorage.removeItem(PARCOURS_KEY);
}

function parcoursCurrentDay(p) {
  // Jour depuis le début (1 = premier jour), sans plafond
  return daysBetween(p.startDate, todayIso()) + 1;
}
function sessionsDoneToday(p) {
  const today = todayIso();
  return p.sessions.filter(s => daysBetween(s.date, today) === 0).length;
}
function canDoSessionToday(p) {
  return sessionsDoneToday(p) < MAX_SESSIONS_PER_DAY;
}

/* Sélection de 12 compétences pour la séance du jour :
   - priorité aux compétences "dues" (dueDay <= currentDay) triées par niveau croissant (les plus faibles d'abord)
   - compléter avec des compétences nouvelles (jamais vues) si besoin
   - diversifier les thèmes si possible */
function buildParcoursSeries(p, day, n = 9) {
  const allGens = Object.values(QUESTION_BANK).flat();
  const byName = Object.fromEntries(allGens.map(g => [g.name, g]));
  const due = allGens.filter(g => {
    const s = p.skills[g.name];
    return s && s.dueDay <= day;
  }).map(g => ({ g, s: p.skills[g.name] }));

  // Priorité : niveau croissant (0 d'abord), puis ancienneté (lastSeenDay le plus ancien)
  due.sort((A, B) => {
    if (A.s.level !== B.s.level) return A.s.level - B.s.level;
    const aLast = A.s.lastSeenDay ?? -1;
    const bLast = B.s.lastSeenDay ?? -1;
    return aLast - bLast;
  });

  // Sélection avec diversification de thèmes : round-robin sur les thèmes parmi les dues
  const selected = [];
  const usedNames = new Set();
  const dueByTheme = {};
  due.forEach(({g}) => {
    const t = (g().theme); // appel léger pour trouver theme — en réalité on peut regarder QUESTION_BANK
  });

  // Plus simple : parcourir `due` triée, skipper un thème s'il a déjà 2 items déjà sélectionnés
  const themeCounts = {};
  for (const { g } of due) {
    if (selected.length >= n) break;
    // Trouver le thème du générateur via QUESTION_BANK
    let theme = null;
    for (const [t, gens] of Object.entries(QUESTION_BANK)) {
      if (gens.includes(g)) { theme = t; break; }
    }
    if ((themeCounts[theme] || 0) >= 2 && selected.length < n - 2) continue; // limiter la concentration
    selected.push(g);
    usedNames.add(g.name);
    themeCounts[theme] = (themeCounts[theme] || 0) + 1;
  }

  // Si pas assez, compléter avec autres "dues" sans limite
  for (const { g } of due) {
    if (selected.length >= n) break;
    if (!usedNames.has(g.name)) { selected.push(g); usedNames.add(g.name); }
  }

  return shuffle(selected).map(g => {
    const q = g();
    q._genName = g.name; // traçage pour update après séance
    return q;
  });
}

/* Mise à jour des compétences après une séance parcours */
function updateParcoursAfterSession(p, day) {
  const byTheme = {};
  state.series.forEach((q, i) => {
    const correct = isAnswerCorrect(q, state.answers[i]);
    const gName = q._genName;
    if (!gName || !p.skills[gName]) return;
    const s = p.skills[gName];
    s.lastSeenDay = day;
    s.history.push({ day, correct });
    if (correct) {
      s.level = Math.min(5, s.level + 1);
    } else {
      s.level = 0;
    }
    s.dueDay = day + BOX_INTERVALS[s.level];
    // stats par thème
    const t = q.theme;
    if (!byTheme[t]) byTheme[t] = { ok: 0, total: 0 };
    byTheme[t].total++;
    if (correct) byTheme[t].ok++;
  });
  const score = state.answers.reduce((s, a, i) => s + (isAnswerCorrect(state.series[i], a) ? 1 : 0), 0);
  p.sessions.push({
    day, date: new Date().toISOString(),
    score, total: state.series.length,
    pct: Math.round(100 * score / state.series.length),
    byTheme
  });
  setParcours(p);
  return { score, total: state.series.length, byTheme };
}

/* ---------- UI Parcours ---------- */
function renderParcours() {
  const container = $('#parcours-content');
  const p = getParcours();
  if (!p) {
    container.innerHTML = `
      <div class="card" style="text-align:center;padding:32px 24px;">
        <h3 style="margin-bottom:8px;">Prêt à commencer ?</h3>
        <p style="color:var(--muted);">Tu feras une séance de 9 questions par jour pendant 10 jours. Les compétences maîtrisées s'espaceront dans le temps, celles à retravailler reviendront souvent.</p>
        <button class="primary" id="btn-start-parcours">Commencer mon parcours</button>
      </div>`;
    $('#btn-start-parcours').addEventListener('click', () => { initParcours(); renderParcours(); });
    return;
  }

  const day = parcoursCurrentDay(p);
  const todayCount = sessionsDoneToday(p);
  const canContinue = canDoSessionToday(p);
  const levels = Object.values(p.skills).map(s => s.level);
  const mastered = levels.filter(l => l >= 4).length;
  const total = levels.length;
  const masteredPct = Math.round((mastered / total) * 100);
  const allMastered = mastered === total;

  container.innerHTML = `
    <div class="card parcours-main">
      <div class="parcours-head">
        <div>
          <div class="parcours-day">${masteredPct}% maîtrisées</div>
          <div style="color:var(--muted);font-size:0.9rem;">Début le ${new Date(p.startDate).toLocaleDateString('fr-FR')} · Jour ${day}</div>
        </div>
        <div class="parcours-mastery-count">
          <span class="big-num">${mastered}</span>
          <span style="font-size:0.85rem;color:var(--muted);">/ ${total} compétences</span>
        </div>
      </div>
      <div class="parcours-progress">
        <div class="parcours-progress-fill" style="width:${masteredPct}%;"></div>
      </div>
      ${allMastered ? `
        <p style="margin-top:16px;text-align:center;"><strong>🏆 Félicitations !</strong> Tu as maîtrisé toutes les compétences. Continue à t'entraîner pour maintenir tes acquis.</p>
      ` : canContinue ? `
        <button class="primary" id="btn-session-day" style="margin-top:16px;width:100%;">▶ Faire une séance (9 questions · sans timer) — ${todayCount}/${MAX_SESSIONS_PER_DAY} aujourd'hui</button>
        <p style="text-align:center;color:var(--muted);font-size:0.85rem;margin-top:8px;">Max 3 séances par jour pour laisser le cerveau assimiler (répétition espacée).</p>
      ` : `
        <p style="margin-top:16px;text-align:center;color:var(--ok);"><strong>✓ ${todayCount} séances faites aujourd'hui.</strong> Reviens demain — le sommeil consolide ce que tu as appris.</p>
      `}
    </div>

    <h3 style="margin-top:24px;">Progression des compétences</h3>
    <p style="color:var(--muted);font-size:0.9rem;margin-top:-4px;">Chaque carré = une compétence. Couleur = niveau de maîtrise (gris = nouveau, vert = maîtrisé).</p>
    <div class="mastery-legend">
      <span><span class="lvl-dot" style="background:#cbd5e1;"></span>Niveau 0 (à découvrir)</span>
      <span><span class="lvl-dot" style="background:#fbbf24;"></span>1-2 (en cours)</span>
      <span><span class="lvl-dot" style="background:#f97316;"></span>3 (confirmé)</span>
      <span><span class="lvl-dot" style="background:#22c55e;"></span>4-5 (maîtrisé)</span>
    </div>
    <div class="mastery-themes">
      ${Object.entries(QUESTION_BANK).map(([theme, gens]) => {
        const meta = THEME_META[theme];
        return `
          <div class="mastery-theme">
            <div class="mastery-theme-head">
              <span class="chip-icon" style="background:${meta.color};width:24px;height:24px;border-radius:6px;display:inline-grid;place-items:center;color:white;font-weight:700;font-size:0.75rem;">${meta.icon}</span>
              <span style="font-weight:600;">${meta.short}</span>
            </div>
            <div class="mastery-squares">
              ${gens.map(g => {
                const skill = p.skills[g.name] || { level: 0, dueDay: 1 };
                const lvl = skill.level;
                const colors = ['#cbd5e1','#fbbf24','#fbbf24','#f97316','#22c55e','#16a34a'];
                const q = gens.find(x => x.name === g.name);
                const title = q ? q().title : g.name;
                // Prochaine révision : jour dû par rapport au jour actuel
                const daysUntil = skill.dueDay - day;
                let nextReview = '';
                if (lvl === 5) nextReview = ' · maîtrisé';
                else if (daysUntil <= 0) nextReview = ' · à revoir aujourd\'hui';
                else if (daysUntil === 1) nextReview = ' · à revoir demain';
                else nextReview = ` · prochaine révision dans ${daysUntil} j`;
                return `<div class="mastery-sq" title="${title.replace(/"/g, '&quot;')} — niveau ${lvl}/5${nextReview}" style="background:${colors[lvl]};"></div>`;
              }).join('')}
            </div>
          </div>`;
      }).join('')}
    </div>

    ${p.sessions.length ? `
      <h3 style="margin-top:24px;">Séances réalisées</h3>
      <div class="parcours-sessions">
        ${p.sessions.slice().reverse().map(s => {
          const dateStr = new Date(s.date).toLocaleDateString('fr-FR') + ' ' +
                          new Date(s.date).toLocaleTimeString('fr-FR', {hour:'2-digit',minute:'2-digit'});
          return `<div class="session-row">
            <span>Jour ${s.day} · ${dateStr}</span>
            <span class="tag ${s.pct>=70?'ok':(s.pct>=40?'':'ko')}">${s.score}/${s.total} · ${s.pct}%</span>
          </div>`;
        }).join('')}
      </div>
    ` : ''}

    <div style="margin-top:20px;text-align:right;">
      <button class="ghost small" id="btn-reset-parcours" style="color:var(--muted);">Réinitialiser le parcours</button>
    </div>
  `;

  // Attacher le listener si le bouton est présent (c.-à-d. si le joueur peut faire une séance)
  const sessionBtn = $('#btn-session-day');
  if (sessionBtn) {
    sessionBtn.addEventListener('click', () => startParcoursSession(p, day));
  }
  $('#btn-reset-parcours')?.addEventListener('click', () => {
    if (confirm('Réinitialiser le parcours ? Toute la progression actuelle sera perdue.')) {
      resetParcours();
      renderParcours();
    }
  });
}

function startParcoursSession(p, day) {
  const series = buildParcoursSeries(p, day, 9);
  state.series = series;
  state.answers = series.map(() => ({ selectedIdx: null, inputAnswer: '', helped: false }));
  state.current = 0;
  state.mode = 'train';  // aide dispo
  state.duree = 0;       // pas de timer pour le parcours
  state.remaining = 0;
  state.parcours = { day }; // flag pour identifier une séance parcours
  startTimer();
  showScreen('screen-test');
  renderQuestion();
}

/* ==========================================================================
   MODE DUEL — tour par tour sur un même appareil
   ========================================================================== */

const DUEL_KEYS = {
  PLAYERS: 'auto3br.duel.players',
  MATCHES: 'auto3br.duel.matches'
};

const BADGES = {
  first_win:  { icon: '🏆', title: 'Première victoire',     desc: 'Gagner ton premier duel' },
  no_miss:    { icon: '💯', title: 'Sans faute',            desc: 'Gagner sans te tromper' },
  comeback:   { icon: '🔥', title: 'Retour de flamme',      desc: 'Gagner après avoir été mené' },
  speed:      { icon: '⚡', title: 'Éclair',                desc: 'Gagner un duel en mode rapide' },
  serial3:    { icon: '🎯', title: 'Triplé',                desc: '3 victoires consécutives' },
  serial5:    { icon: '🚀', title: 'Invincible',            desc: '5 victoires consécutives' },
  duel10:     { icon: '🎖️', title: 'Vétéran',              desc: '10 duels joués' },
  perfect:    { icon: '👑', title: 'Souverain',             desc: 'Écraser l\'adversaire (écart max)' },
  polymath:   { icon: '🧠', title: 'Polymathe',             desc: 'Gagner sur 5 thèmes différents' }
};

const LEVELS = [
  { name: 'Apprenti',  xp: 0 },
  { name: 'Stratège',  xp: 100 },
  { name: 'Expert',    xp: 250 },
  { name: 'Champion',  xp: 500 },
  { name: 'Maître',    xp: 1000 },
  { name: 'Légende',   xp: 2000 }
];

function computeLevel(xp) {
  let lvl = LEVELS[0], next = LEVELS[1];
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].xp) { lvl = LEVELS[i]; next = LEVELS[i+1] || null; }
  }
  return { lvl, next, idx: LEVELS.indexOf(lvl) };
}

/* State du duel en cours */
const duelState = {
  players: [null, null], // [{name, avatar, color}, ...]
  currentIdx: 0,
  questions: [],         // une question par tour par joueur ? Non : une pool de N*2 questions (chacun répond à sa question)
  scores: [0, 0],
  turn: 0,               // index du tour (0..nbRounds-1)
  nbQuestions: 7,
  theme: 'all',
  mode: 'normal',
  timer: null,
  remaining: 0,
  wrongs: [0, 0],
  scoreHistory: [[0], [0]],
  startedAt: null
};

/* ---------- Persistance des joueurs ---------- */
function loadPlayers() {
  try { return JSON.parse(localStorage.getItem(DUEL_KEYS.PLAYERS) || '{}'); } catch(e) { return {}; }
}
function savePlayers(obj) { localStorage.setItem(DUEL_KEYS.PLAYERS, JSON.stringify(obj)); }
function loadMatches() {
  try { return JSON.parse(localStorage.getItem(DUEL_KEYS.MATCHES) || '[]'); } catch(e) { return []; }
}
function saveMatches(arr) { localStorage.setItem(DUEL_KEYS.MATCHES, JSON.stringify(arr.slice(0, 100))); }

function getOrCreateProfile(name) {
  const players = loadPlayers();
  const key = name.trim().toLowerCase();
  if (!players[key]) {
    players[key] = {
      name: name.trim(),
      xp: 0,
      duels: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      streak: 0,         // série actuelle de victoires
      bestStreak: 0,
      badges: [],
      themesWon: [],     // thèmes sur lesquels on a déjà gagné au moins 1 fois
      lastMatch: null
    };
    savePlayers(players);
  }
  return players[key];
}

function updateProfile(name, fn) {
  const players = loadPlayers();
  const key = name.trim().toLowerCase();
  if (!players[key]) getOrCreateProfile(name);
  fn(players[key]);
  savePlayers(players);
  return players[key];
}

/* ---------- Avatars (couleur déterministe depuis prénom) ---------- */
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (h*31 + s.charCodeAt(i)) | 0; }
  return Math.abs(h);
}
function avatarColor(name) {
  if (!name) return '#9ca3af';
  const palette = ['#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6','#ec4899','#06b6d4','#f97316','#14b8a6','#6366f1'];
  return palette[hashStr(name) % palette.length];
}
function avatarInitial(name) { return (name || '?').trim().charAt(0).toUpperCase() || '?'; }

// Sélection stratégique des thèmes
const stratSelection = { 1: [], 2: [] };

function renderStratThemesList(playerIdx) {
  const container = $(`#strat-themes-${playerIdx}`);
  container.innerHTML = Object.entries(THEME_META).map(([id, m]) => {
    const sel = stratSelection[playerIdx].includes(id);
    return `<div class="strat-theme-pill ${sel ? 'selected' : ''}" data-id="${id}">
      <span class="chip-icon" style="background:${m.color};color:white;display:grid;place-items:center;font-weight:700;">${m.icon}</span>
      <span>${m.short}</span>
    </div>`;
  }).join('');
  container.querySelectorAll('.strat-theme-pill').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.dataset.id;
      const list = stratSelection[playerIdx];
      const i = list.indexOf(id);
      if (i >= 0) list.splice(i, 1);
      else if (list.length < 2) list.push(id);
      else return; // max 2 atteint
      renderStratThemesList(playerIdx);
      updateStratCount(playerIdx);
    });
  });
  updateStratCount(playerIdx);
}
function updateStratCount(p) {
  const el = $(`#strat-count-${p}`);
  if (!el) return;
  const n = stratSelection[p].length;
  el.textContent = `${n} / 2 thèmes choisis`;
  el.classList.toggle('full', n === 2);
}

/* ---------- Init (appelé au chargement) ---------- */
function initDuel() {
  const themeSel = $('#duel-theme');
  if (themeSel) {
    themeSel.innerHTML = '<option value="all">🎲 Tous les thèmes (mixé)</option>' +
      Object.entries(THEME_META).map(([id, m]) => `<option value="${id}">${m.icon} ${m.label}</option>`).join('');
  }
  // Avatars qui se mettent à jour en temps réel
  ['1','2'].forEach(n => {
    const inp = $(`#duel-p${n}`);
    const av = $(`#duel-avatar-${n}`);
    if (!inp || !av) return;
    const refresh = () => {
      const val = inp.value.trim();
      av.textContent = avatarInitial(val);
      av.style.background = val ? `linear-gradient(135deg, ${avatarColor(val)} 0%, ${avatarColor(val + '_')} 100%)` : '';
      // Mettre à jour les labels du mode stratégique
      const lab = $(`#strat-label-${n}`);
      if (lab) lab.textContent = val || `Joueur ${n}`;
    };
    inp.addEventListener('input', refresh);
    refresh();
  });
  // Mode des thèmes : afficher/masquer les options
  const modeSel = $('#duel-theme-mode');
  if (modeSel) {
    const refreshMode = () => {
      const val = modeSel.value;
      const needsSelection = val === 'strategic' || val === 'homeaway';
      $('#duel-theme-row').style.display = needsSelection ? 'none' : '';
      const box = $('#duel-strategic-themes');
      if (box) {
        box.style.display = needsSelection ? '' : 'none';
        // Mise à jour du texte selon le mode
        if (val === 'strategic') {
          $('#strat-title').textContent = '🎯 Choix stratégique des thèmes';
          $('#strat-desc').innerHTML = 'Chaque joueur choisit <strong>exactement 2 thèmes</strong> sur lesquels il sera interrogé. Joue safe sur tes forts, ou ose sur ce que tu sais faible chez toi.';
        } else if (val === 'homeaway') {
          $('#strat-title').textContent = '🏟 Match aller-retour — choix à domicile';
          $('#strat-desc').innerHTML = 'Chaque joueur choisit <strong>1 ou 2 thèmes</strong> pour son match à domicile. Match aller sur les thèmes de <strong>Joueur 1</strong>, match retour sur ceux de <strong>Joueur 2</strong>. En cas d\'égalité, une <strong>belle</strong> sera jouée sur tous les thèmes mélangés.';
        }
        if (needsSelection) {
          renderStratThemesList(1);
          renderStratThemesList(2);
        }
      }
    };
    modeSel.addEventListener('change', refreshMode);
    refreshMode();
  }
  // Lancer le duel
  const btn = $('#btn-start-duel');
  if (btn) btn.addEventListener('click', startDuel);
  // Quitter le duel
  const btnQuit = $('#btn-quit-duel');
  if (btnQuit) btnQuit.addEventListener('click', () => {
    if (confirm('Abandonner le duel en cours ?')) {
      clearInterval(duelState.timer);
      showScreen('screen-home');
    }
  });
}

/* Filtre : une question est-elle « mobile-friendly » ? (QCM court, sans grosse figure) */
function isMobileFriendly(q) {
  if (q.type !== 'qcm') return false;
  const bodyLen = (q.body || '').length;
  if (bodyLen > 700) return false; // exclut les énoncés avec grosses figures SVG
  const maxChoice = Math.max(...(q.choices || ['']).map(c => (c || '').length));
  if (maxChoice > 80) return false; // chaque choix doit rester lisible
  return true;
}

/* ---------- Démarrer un duel ---------- */
function startDuel() {
  const n1 = $('#duel-p1').value.trim();
  const n2 = $('#duel-p2').value.trim();
  if (!n1 || !n2) { alert('Saisis les deux prénoms.'); return; }
  if (n1.toLowerCase() === n2.toLowerCase()) { alert('Les deux prénoms doivent être différents.'); return; }

  const themeMode = $('#duel-theme-mode').value;
  const theme = $('#duel-theme').value;
  const nbQ = parseInt($('#duel-nbq').value, 10);
  const mode = $('#duel-mode').value;
  const mobileOnly = $('#duel-mobile').checked;
  const miniGame = $('#duel-minigame').value;

  // Mode stratégique : exactement 2 thèmes / joueur
  if (themeMode === 'strategic') {
    if (stratSelection[1].length !== 2 || stratSelection[2].length !== 2) {
      alert('Chaque joueur doit choisir exactement 2 thèmes.');
      return;
    }
  }
  // Mode aller-retour : 1 ou 2 thèmes / joueur
  if (themeMode === 'homeaway') {
    if (stratSelection[1].length < 1 || stratSelection[2].length < 1) {
      alert('Chaque joueur doit choisir au moins 1 thème à domicile.');
      return;
    }
  }

  // Créer les profils si besoin
  getOrCreateProfile(n1);
  getOrCreateProfile(n2);

  // Pools de générateurs par joueur (avec filtre mobile éventuel)
  function buildPoolFromThemes(themes, n) {
    const gens = themes.flatMap(t => (QUESTION_BANK[t] || []).slice());
    const shuffled = shuffle(gens);
    const picked = [];
    let tries = 0;
    let idx = 0;
    const maxTries = Math.max(n * 20, 100);
    while (picked.length < n && tries < maxTries) {
      if (idx >= shuffled.length) idx = 0;
      const gen = shuffled[idx++];
      tries++;
      const q = gen();
      if (mobileOnly && !isMobileFriendly(q)) continue; // on « zappe » si pas compatible
      q._genName = gen.name;
      picked.push(q);
    }
    // Fallback : si pas assez après filtrage, on complète sans filtre
    while (picked.length < n) {
      const gen = shuffled[picked.length % shuffled.length];
      const q = gen();
      q._genName = gen.name;
      picked.push(q);
    }
    return picked;
  }

  let themesP1, themesP2;
  if (themeMode === 'strategic') {
    themesP1 = stratSelection[1].slice();
    themesP2 = stratSelection[2].slice();
  } else if (themeMode === 'homeaway') {
    // En aller-retour, themesP1 = thèmes à domicile de J1 (utilisés au match aller)
    //                 themesP2 = thèmes à domicile de J2 (utilisés au match retour)
    themesP1 = stratSelection[1].slice();
    themesP2 = stratSelection[2].slice();
  } else {
    const all = theme === 'all' ? Object.keys(QUESTION_BANK) : [theme];
    themesP1 = all;
    themesP2 = all;
  }

  // Génération des questions de la MANCHE COURANTE (init = manche aller)
  let roundThemes;
  if (themeMode === 'homeaway') {
    // Manche aller : thèmes de J1 communs aux deux (chacun interrogé sur les thèmes « à domicile » de J1)
    roundThemes = themesP1;
  } else {
    roundThemes = null; // pas homeaway → pools distincts par joueur
  }

  function buildQuestionsForRound(poolThemes, commonPool) {
    const questions = [];
    if (commonPool) {
      // pool commun (aller-retour) : chacun tire dans le même pool
      const pool = buildPoolFromThemes(commonPool, nbQ * 2);
      for (let t = 0; t < nbQ * 2; t++) questions.push(pool[t]);
    } else {
      // pools distincts par joueur (mode random / stratégique)
      const p1 = buildPoolFromThemes(themesP1, nbQ);
      const p2 = buildPoolFromThemes(themesP2, nbQ);
      for (let t = 0; t < nbQ * 2; t++) {
        questions.push(t % 2 === 0 ? p1[Math.floor(t/2)] : p2[Math.floor(t/2)]);
      }
    }
    return questions;
  }

  const questions = buildQuestionsForRound(null, roundThemes);

  duelState.players = [
    { name: n1, color: avatarColor(n1), initial: avatarInitial(n1) },
    { name: n2, color: avatarColor(n2), initial: avatarInitial(n2) }
  ];
  duelState.questions = questions;
  duelState.scores = [0, 0];
  duelState.wrongs = [0, 0];
  duelState.scoreHistory = [[0], [0]];
  duelState.turn = 0;
  duelState.currentIdx = 0;
  duelState.nbQuestions = nbQ;
  duelState.theme = theme;
  duelState.themeMode = themeMode;
  duelState.themesP1 = themesP1;
  duelState.themesP2 = themesP2;
  duelState.mode = mode;
  duelState.mobileOnly = mobileOnly;
  duelState.miniGame = miniGame;
  duelState.miniGameState = null;
  duelState.miniGameWinner = null;
  initMiniGame();
  duelState.startedAt = Date.now();
  // Aller-retour : état des manches
  duelState.round = themeMode === 'homeaway' ? 'aller' : 'unique';
  duelState.roundScores = []; // [[s1,s2], ...] par manche

  // Remplir le scoreboard
  renderDuelScoreboard();
  showScreen('screen-duel');
  renderDuelTurn();
}

function renderDuelScoreboard() {
  // En mode Puissance 4, on force les couleurs P4 : bleu pour J1, orange pour J2
  // En Course de pions aussi. En mode classique, on utilise l'avatar couleur prénom.
  const useFixedColors = duelState.miniGame === 'connect4' || duelState.miniGame === 'race';
  const fixedColors = [
    { main: '#3b82f6', dark: '#1e40af' },  // bleu P4
    { main: '#f59e0b', dark: '#b45309' }   // orange P4
  ];
  duelState.players.forEach((p, i) => {
    const c = useFixedColors ? fixedColors[i] : { main: p.color, dark: avatarColor(p.name+'_') };
    const miniBg = `radial-gradient(circle at 35% 35%, ${c.main} 0%, ${c.dark} 100%)`;
    const el = $(`#duel-mini-${i+1}`);
    if (el) { el.style.background = miniBg; el.textContent = p.initial; }
    $(`#duel-pc-name-${i+1}`).textContent = p.name;
    $(`#duel-pc-score-${i+1}`).textContent = duelState.scores[i];
  });
  const pbarPct = (duelState.turn / (duelState.nbQuestions * 2)) * 100;
  $('#duel-pbar-fill').style.width = pbarPct + '%';
  const qNum = Math.floor(duelState.turn / 2) + 1;
  $('#duel-qnum').textContent = `Tour ${Math.min(qNum, duelState.nbQuestions)} / ${duelState.nbQuestions}`;
  // active player
  $('#duel-p1-card').classList.toggle('active', duelState.currentIdx === 0);
  $('#duel-p2-card').classList.toggle('active', duelState.currentIdx === 1);
}

function renderDuelTurn() {
  if (duelState.turn >= duelState.nbQuestions * 2) {
    // Fin de manche
    if (duelState.themeMode === 'homeaway') {
      onHomeAwayRoundEnd();
      return;
    }
    finishDuel();
    return;
  }
  const p = duelState.players[duelState.currentIdx];
  const q = duelState.questions[duelState.turn];

  // Bandeau tour
  const banner = $('#duel-turn-banner');
  banner.className = 'duel-turn-banner ' + (duelState.currentIdx === 0 ? 'p1' : 'p2');
  banner.textContent = `${p.name}, à toi !`;

  renderDuelScoreboard();

  // Question
  const meta = THEME_META[q.theme] || {};
  const container = $('#duel-question-container');
  const isInput = q.type === 'input';
  const answerBlock = isInput ? `
    <div class="input-answer">
      <label style="font-weight:600;color:var(--muted);font-size:0.9rem;">Ta réponse :</label>
      <div class="input-row">
        <input type="text" id="duel-qinput" placeholder="tape ta réponse ici" autocomplete="off" />
        ${q.inputSuffix ? `<span class="input-suffix">${q.inputSuffix}</span>` : ''}
      </div>
    </div>
    <button class="primary duel-next-btn" id="duel-btn-validate">Valider ma réponse</button>
  ` : `
    <div class="choices" id="duel-choices">
      ${q.choices.map((ch, i) => `
        <label class="choice" data-idx="${i}">
          <span class="letter">${String.fromCharCode(65 + i)}</span>
          <span class="content">${ch}</span>
        </label>
      `).join('')}
    </div>
  `;
  // Mini-jeu (affiché en haut, si actif) — vue lecture seule pendant la question
  const mgBlock = (duelState.miniGame && duelState.miniGame !== 'none' && duelState.miniGameState) ? `
    <div class="minigame-box">
      <h4>${duelState.miniGame === 'connect4' ? '🔴 Puissance 4' : '🏇 Course de pions'} — <span style="color:var(--duel-accent);">réponds juste pour jouer un coup</span></h4>
      ${duelState.miniGame === 'connect4' ? renderConnect4(duelState.miniGameState, null) : renderRace(duelState.miniGameState, duelState.players)}
    </div>` : '';

  container.innerHTML = `
    ${mgBlock}
    <div class="q-chip" style="color:${meta.color || 'var(--muted)'};">
      <span class="chip-icon" style="background:${meta.color || 'var(--muted)'};">${meta.icon || '?'}</span>
      ${themeLabel(q.theme)} · ${q.title}
    </div>
    <div class="q-body">${q.body}</div>
    ${answerBlock}
    <div id="duel-feedback"></div>
  `;
  renderMath(container);

  // Listeners
  if (isInput) {
    const inp = $('#duel-qinput');
    setTimeout(() => inp && inp.focus(), 80);
    $('#duel-btn-validate').addEventListener('click', () => handleDuelAnswer(q, { inputAnswer: inp.value }));
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); handleDuelAnswer(q, { inputAnswer: inp.value }); }
    });
  } else {
    $$('#duel-choices .choice').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.idx, 10);
        handleDuelAnswer(q, { selectedIdx: idx });
      });
    });
  }

  // Timer
  if (duelState.mode === 'fast') {
    $('#duel-timer').style.display = 'block';
    duelState.remaining = 15;
    $('#duel-timer').textContent = '15';
    $('#duel-timer').classList.remove('low');
    clearInterval(duelState.timer);
    duelState.timer = setInterval(() => {
      duelState.remaining--;
      $('#duel-timer').textContent = duelState.remaining;
      if (duelState.remaining <= 5) $('#duel-timer').classList.add('low');
      if (duelState.remaining <= 0) {
        clearInterval(duelState.timer);
        // Échec automatique
        handleDuelAnswer(q, { selectedIdx: null, inputAnswer: '', timeout: true });
      }
    }, 1000);
  } else {
    $('#duel-timer').style.display = 'none';
  }
}

function handleDuelAnswer(q, answer) {
  clearInterval(duelState.timer);
  const a = { selectedIdx: answer.selectedIdx ?? null, inputAnswer: answer.inputAnswer ?? '' };
  const correct = isAnswerCorrect(q, a);
  if (correct) duelState.scores[duelState.currentIdx]++;
  else duelState.wrongs[duelState.currentIdx]++;
  duelState.scoreHistory[duelState.currentIdx].push(duelState.scores[duelState.currentIdx]);

  // Bloquer les inputs
  const container = $('#duel-question-container');
  const choices = container.querySelectorAll('.choice');
  choices.forEach(c => {
    c.style.pointerEvents = 'none';
    const idx = parseInt(c.dataset.idx, 10);
    if (idx === q.correctIdx) c.classList.add('correct');
    else if (idx === a.selectedIdx) c.classList.add('wrong');
  });
  const inp = $('#duel-qinput');
  if (inp) inp.disabled = true;
  const validateBtn = $('#duel-btn-validate');
  if (validateBtn) validateBtn.style.display = 'none';

  // Feedback + bouton suivant
  const expectedShown = q.type === 'input' ? (Array.isArray(q.expected) ? q.expected[0] : q.expected) : '';
  const goodStr = q.type === 'input'
    ? `<code>${expectedShown}${q.inputSuffix ? ' ' + q.inputSuffix : ''}</code>`
    : `<strong>${String.fromCharCode(65 + q.correctIdx)}.</strong> ${q.choices[q.correctIdx]}`;
  const fb = $('#duel-feedback');
  if (correct) {
    fb.innerHTML = `<div class="duel-feedback ok">✓ Juste ! +1 point pour ${duelState.players[duelState.currentIdx].name}</div>`;
  } else {
    fb.innerHTML = `<div class="duel-feedback ko">✗ Faux. Bonne réponse : ${goodStr}</div>`;
  }
  renderMath(fb);

  // Passer au tour suivant (joueur suivant + question suivante)
  const btnNext = document.createElement('button');
  btnNext.className = 'primary duel-next-btn';
  btnNext.textContent = duelState.turn < duelState.nbQuestions * 2 - 1 ? 'Tour suivant →' : 'Voir les résultats';

  const nextTurn = () => {
    duelState.turn++;
    duelState.currentIdx = 1 - duelState.currentIdx;
    renderDuelTurn();
  };

  btnNext.addEventListener('click', () => {
    // Si mini-jeu actif ET bonne réponse : déclencher le coup avant passage au suivant
    if (correct && duelState.miniGame && duelState.miniGame !== 'none') {
      miniGamePlayMove(() => {
        // Vérifier victoire du mini-jeu
        miniGameCheckWinAndMaybeEnd(() => {
          nextTurn();
        });
      });
      return;
    }
    nextTurn();
  });
  container.appendChild(btnNext);
  renderDuelScoreboard();
}

/* ---------- Mode aller-retour : fin de manche ---------- */
function onHomeAwayRoundEnd() {
  // Sauvegarder les scores de la manche
  const round = duelState.round;
  const before = duelState.roundScores.reduce((acc, r) => [acc[0]+r[0], acc[1]+r[1]], [0,0]);
  const thisRound = [duelState.scores[0] - before[0], duelState.scores[1] - before[1]];
  duelState.roundScores.push(thisRound);

  const s1 = duelState.scores[0], s2 = duelState.scores[1];
  const nextRound = round === 'aller' ? 'retour' : (round === 'retour' && s1 === s2 ? 'belle' : null);

  if (!nextRound) {
    finishDuel();
    return;
  }

  // Transition : afficher un récap et bouton pour lancer la manche suivante
  showHomeAwayTransition(round, nextRound);
}

function showHomeAwayTransition(endedRound, nextRound) {
  const container = $('#duel-question-container');
  const [p1, p2] = duelState.players;
  const [s1, s2] = duelState.scores;
  const thisScores = duelState.roundScores[duelState.roundScores.length - 1];
  const nextLabel = nextRound === 'retour' ? 'Match retour' : 'Belle (thèmes mélangés)';
  const nextChooser = nextRound === 'retour' ? p2.name : 'aucun joueur';
  const nextThemes = nextRound === 'retour' ? duelState.themesP2 :
    (nextRound === 'belle' ? Object.keys(QUESTION_BANK) : duelState.themesP1);

  container.innerHTML = `
    <div style="text-align:center;padding:20px 10px;">
      <div style="font-size:0.9rem;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:0.08em;">
        Fin du match ${endedRound}
      </div>
      <div style="font-size:1.8rem;font-weight:800;margin:10px 0;">
        ${s1} <span style="opacity:0.6;">vs</span> ${s2}
      </div>
      <div style="color:var(--muted);font-size:0.9rem;">
        (Manche : ${thisScores[0]}–${thisScores[1]})
      </div>
      <div style="margin:20px 0;padding:14px;background:var(--bg-elev-2);border-radius:10px;">
        <div style="font-weight:700;margin-bottom:6px;">🏟 Place au <strong>${nextLabel}</strong></div>
        <div style="font-size:0.9rem;color:var(--muted);">
          ${nextRound === 'retour'
            ? `Thèmes à domicile de <strong>${p2.name}</strong> : ${duelState.themesP2.map(t => (THEME_META[t]||{}).short||t).join(', ')}`
            : `Égalité ${s1}–${s2} ! Manche décisive avec <strong>tous les thèmes mélangés</strong>.`}
        </div>
      </div>
      <button class="primary big-btn" id="btn-next-round">Lancer ${nextRound === 'retour' ? 'le match retour' : 'la belle'} →</button>
    </div>
  `;

  $('#btn-next-round').addEventListener('click', () => {
    duelState.round = nextRound;
    duelState.turn = 0;
    // Swap qui commence (le joueur à domicile commence la manche ? ou l'inverse ?)
    // Par souci de fair-play : joueur visiteur commence (répond en premier chez l'autre)
    duelState.currentIdx = nextRound === 'retour' ? 0 : (Math.random() < 0.5 ? 0 : 1);
    // Pour la belle, réduire un peu : nbQ de la belle = max(3, nbQ - 2)
    // Mais pour rester simple, on garde le même nbQ
    // Regénérer les questions selon la manche, avec filtre mobile si actif
    function buildPoolFromThemes(themes, n) {
      const gens = themes.flatMap(t => (QUESTION_BANK[t] || []).slice());
      const sh = shuffle(gens);
      const res = []; let i = 0, tries = 0;
      const maxTries = Math.max(n * 20, 100);
      while (res.length < n && tries < maxTries) {
        if (i >= sh.length) i = 0;
        const g = sh[i++]; tries++;
        const q = g();
        if (duelState.mobileOnly && !isMobileFriendly(q)) continue;
        q._genName = g.name;
        res.push(q);
      }
      while (res.length < n) { const g = sh[res.length % sh.length]; const q = g(); q._genName = g.name; res.push(q); }
      return res;
    }
    let roundThemes;
    if (nextRound === 'retour') roundThemes = duelState.themesP2;
    else roundThemes = Object.keys(QUESTION_BANK);
    // Belle plus courte : nbQBelle = 3 (ou nbQ si nbQ < 3)
    const nbBelleQ = nextRound === 'belle' ? Math.min(3, duelState.nbQuestions) : duelState.nbQuestions;
    duelState.nbQuestionsRound = nbBelleQ;
    // Temporairement : recalculer par rapport à cette manche
    const needed = nbBelleQ * 2;
    const pool = buildPoolFromThemes(roundThemes, needed);
    duelState.questions = pool;
    // Ajuster aussi nbQuestions pour le renderDuelTurn (qui utilise nbQuestions pour fin de manche)
    if (nextRound === 'belle') duelState.nbQuestions = nbBelleQ;
    renderDuelScoreboard();
    renderDuelTurn();
  });
  // Mettre à jour scoreboard (hors question)
  renderDuelScoreboard();
  // Masquer timer
  $('#duel-timer').style.display = 'none';
}

/* ---------- Fin de duel → calcul XP, badges, sauvegarde ---------- */
function finishDuel() {
  clearInterval(duelState.timer);
  const [s1, s2] = duelState.scores;
  const [p1, p2] = duelState.players;
  const winnerIdx = s1 === s2 ? -1 : (s1 > s2 ? 0 : 1);
  const winner = winnerIdx >= 0 ? duelState.players[winnerIdx] : null;
  const loser  = winnerIdx >= 0 ? duelState.players[1 - winnerIdx] : null;

  // Calcul XP
  const gains = [0, 0];
  const details = [[], []];
  for (let i = 0; i < 2; i++) {
    const isWinner = winnerIdx === i;
    const isDraw = winnerIdx === -1;
    if (isDraw) { gains[i] = 25; details[i].push('+25 XP égalité'); }
    else if (isWinner) { gains[i] = 50; details[i].push('+50 XP victoire'); }
    else { gains[i] = 10; details[i].push('+10 XP participation'); }

    if (isWinner && duelState.wrongs[i] === 0) { gains[i] += 30; details[i].push('+30 XP sans faute'); }
    if (isWinner && duelState.mode === 'fast') { gains[i] += 20; details[i].push('+20 XP mode rapide'); }
    const ecart = Math.abs(s1 - s2);
    if (isWinner && ecart >= Math.ceil(duelState.nbQuestions * 0.6)) { gains[i] += 15; details[i].push('+15 XP écart important'); }
  }

  // Update profils + détection badges débloqués
  const unlocked = [[], []];
  for (let i = 0; i < 2; i++) {
    const p = duelState.players[i];
    updateProfile(p.name, profile => {
      profile.xp += gains[i];
      profile.duels++;
      if (winnerIdx === -1) profile.draws++;
      else if (winnerIdx === i) { profile.wins++; profile.streak++; profile.bestStreak = Math.max(profile.bestStreak, profile.streak); }
      else { profile.losses++; profile.streak = 0; }
      if (winnerIdx === i && !profile.themesWon.includes(duelState.theme) && duelState.theme !== 'all') {
        profile.themesWon.push(duelState.theme);
      }
      profile.lastMatch = new Date().toISOString();

      // Badges
      const checkAndUnlock = (key, cond) => {
        if (cond && !profile.badges.includes(key)) { profile.badges.push(key); unlocked[i].push(key); }
      };
      checkAndUnlock('first_win', profile.wins >= 1 && winnerIdx === i);
      checkAndUnlock('no_miss', winnerIdx === i && duelState.wrongs[i] === 0);
      // Comeback : détection dans scoreHistory (a été mené à un moment puis a gagné)
      if (winnerIdx === i) {
        const hist = duelState.scoreHistory;
        const wasBehind = hist[i].some((v, k) => hist[1-i][k] !== undefined && v < hist[1-i][k]);
        checkAndUnlock('comeback', wasBehind);
      }
      checkAndUnlock('speed', winnerIdx === i && duelState.mode === 'fast');
      checkAndUnlock('serial3', profile.bestStreak >= 3);
      checkAndUnlock('serial5', profile.bestStreak >= 5);
      checkAndUnlock('duel10', profile.duels >= 10);
      checkAndUnlock('perfect', winnerIdx === i && duelState.wrongs[1-i] === duelState.nbQuestions);
      checkAndUnlock('polymath', profile.themesWon.length >= 5);
    });
  }

  // Sauvegarder le match
  const matches = loadMatches();
  matches.unshift({
    date: new Date().toISOString(),
    players: [p1.name, p2.name],
    scores: [s1, s2],
    winner: winner ? winner.name : null,
    theme: duelState.theme,
    nbQuestions: duelState.nbQuestions,
    mode: duelState.mode,
    gains, unlocked
  });
  saveMatches(matches);

  renderDuelResults({ gains, unlocked, winnerIdx });
}

function renderDuelResults({ gains, unlocked, winnerIdx }) {
  const [p1, p2] = duelState.players;
  const [s1, s2] = duelState.scores;
  const winner = winnerIdx >= 0 ? duelState.players[winnerIdx] : null;

  const box = $('#duel-results-content');
  const prof1 = getOrCreateProfile(p1.name);
  const prof2 = getOrCreateProfile(p2.name);
  const lvl1 = computeLevel(prof1.xp);
  const lvl2 = computeLevel(prof2.xp);

  const gainCard = (pi) => {
    const p = duelState.players[pi];
    const prof = pi === 0 ? prof1 : prof2;
    const lvl = pi === 0 ? lvl1 : lvl2;
    const newBadges = unlocked[pi];
    const gain = gains[pi];
    const color = p.color;
    const xpPct = lvl.next ? Math.round(100 * (prof.xp - lvl.lvl.xp) / (lvl.next.xp - lvl.lvl.xp)) : 100;
    return `
      <div class="duel-gain-card" style="border-left-color:${color};">
        <div class="name">
          <div class="duel-avatar-mini" style="background:linear-gradient(135deg,${color} 0%,${avatarColor(p.name+'_')} 100%);">${p.initial}</div>
          ${p.name}
          <span class="level-name" style="margin-left:auto;">${lvl.lvl.name}</span>
        </div>
        <div class="duel-gain-list">
          ${details_for(pi, gains).map(d => '• ' + d).join('<br>')}
        </div>
        <div style="margin-top:10px;">
          <div class="level-info"><span>Niv ${lvl.idx+1} — ${prof.xp} XP</span><span>${lvl.next ? lvl.next.name + ' : ' + lvl.next.xp + ' XP' : 'MAX'}</span></div>
          <div class="level-bar"><div class="level-fill" style="width:${xpPct}%;"></div></div>
        </div>
        ${newBadges.length ? `
          <div class="duel-new-badges">
            ${newBadges.map(b => `<div class="badge-card"><span class="emoji">${BADGES[b].icon}</span>${BADGES[b].title}</div>`).join('')}
          </div>` : ''}
      </div>
    `;
  };

  // Couleur du pion/avatar du vainqueur (fixe si mini-jeu, sinon avatar)
  const useFixed = duelState.miniGame === 'connect4' || duelState.miniGame === 'race';
  const fixedColors = [
    { main: '#3b82f6', dark: '#1e40af' },
    { main: '#f59e0b', dark: '#b45309' }
  ];
  const wColor = winner ? (useFixed ? fixedColors[winnerIdx] : { main: winner.color, dark: avatarColor(winner.name+'_') }) : null;
  const pionSvg = wColor
    ? `<span style="display:inline-block;width:48px;height:48px;border-radius:50%;background:radial-gradient(circle at 35% 35%,${wColor.main} 0%,${wColor.dark} 100%);box-shadow:0 4px 12px rgba(0,0,0,0.35),inset -3px -4px 6px rgba(0,0,0,0.15);vertical-align:middle;margin-right:14px;"></span>`
    : '';
  box.innerHTML = `
    <div class="duel-podium">
      <div class="duel-podium-title">${winner ? 'Vainqueur' : 'Match nul'}</div>
      <div class="duel-podium-winner">${pionSvg}${winner ? winner.name : 'Égalité'}</div>
      <div class="duel-podium-score">${s1} <span style="opacity:0.7;">vs</span> ${s2}</div>
    </div>

    <h3 style="margin-top:20px;">Gains de la partie</h3>
    ${gainCard(0)}
    ${gainCard(1)}

    <div class="actions">
      <button class="primary" id="btn-duel-rematch">🔁 Revanche</button>
      <button class="ghost" id="btn-duel-new">⚔ Nouveau duel</button>
      <button class="ghost" id="btn-duel-home">Accueil</button>
    </div>
  `;

  $('#btn-duel-rematch').addEventListener('click', () => {
    // Même joueurs + mêmes thèmes → nouvelle partie
    duelState.currentIdx = 1 - duelState.currentIdx;
    function rebuild(themes, n) {
      const gens = themes.flatMap(t => (QUESTION_BANK[t] || []).slice());
      const sh = shuffle(gens);
      const res = []; let i = 0, tries = 0;
      const maxTries = Math.max(n * 20, 100);
      while (res.length < n && tries < maxTries) {
        if (i >= sh.length) i = 0;
        const g = sh[i++]; tries++;
        const q = g();
        if (duelState.mobileOnly && !isMobileFriendly(q)) continue;
        q._genName = g.name;
        res.push(q);
      }
      while (res.length < n) { const g = sh[res.length % sh.length]; const q = g(); q._genName = g.name; res.push(q); }
      return res;
    }
    const poolP1 = rebuild(duelState.themesP1, duelState.nbQuestions);
    const poolP2 = rebuild(duelState.themesP2, duelState.nbQuestions);
    const qs = [];
    for (let t = 0; t < duelState.nbQuestions * 2; t++) {
      qs.push(t % 2 === 0 ? poolP1[Math.floor(t/2)] : poolP2[Math.floor(t/2)]);
    }
    duelState.questions = qs;
    duelState.scores = [0, 0];
    duelState.wrongs = [0, 0];
    duelState.scoreHistory = [[0], [0]];
    duelState.turn = 0;
    renderDuelScoreboard();
    showScreen('screen-duel');
    renderDuelTurn();
  });
  $('#btn-duel-new').addEventListener('click', () => { showScreen('screen-home'); document.querySelector('[data-target=tab-duel]').click(); });
  $('#btn-duel-home').addEventListener('click', () => showScreen('screen-home'));

  showScreen('screen-duel-results');
}

function details_for(pi, gains) {
  // Re-construire la liste de détails (déjà faite dans finishDuel, mais pas exposée)
  // Simplifié : on affiche juste +X XP gagnés
  const [s1, s2] = duelState.scores;
  const winnerIdx = s1 === s2 ? -1 : (s1 > s2 ? 0 : 1);
  const lines = [];
  if (winnerIdx === -1) lines.push(`+25 XP (égalité)`);
  else if (winnerIdx === pi) lines.push(`+50 XP (victoire)`);
  else lines.push(`+10 XP (participation)`);
  if (winnerIdx === pi && duelState.wrongs[pi] === 0) lines.push(`+30 XP (sans faute)`);
  if (winnerIdx === pi && duelState.mode === 'fast') lines.push(`+20 XP (mode rapide)`);
  const ecart = Math.abs(s1 - s2);
  if (winnerIdx === pi && ecart >= Math.ceil(duelState.nbQuestions * 0.6)) lines.push(`+15 XP (écart important)`);
  lines.push(`<strong>Total : +${gains[pi]} XP</strong>`);
  return lines;
}

/* ---------- Profils & classement ---------- */
function renderDuelProfiles() {
  const players = loadPlayers();
  const matches = loadMatches();

  // Classement (par wins desc, puis XP desc)
  const ranked = Object.values(players).sort((a, b) => b.wins - a.wins || b.xp - a.xp);
  const rankingBox = $('#duel-ranking');
  if (!ranked.length) {
    rankingBox.innerHTML = '<p class="note">Aucun duel joué pour l\'instant. Lance-toi !</p>';
  } else {
    rankingBox.innerHTML = ranked.slice(0, 10).map((p, i) => {
      const rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
      const rankIcon = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i+1) + '.';
      return `<div class="ranking-row">
        <span class="rank ${rankClass}">${rankIcon}</span>
        <span class="name">${p.name}</span>
        <span class="stats">${p.wins}V / ${p.losses}D · ${p.xp} XP</span>
      </div>`;
    }).join('');
  }

  // Profils détaillés
  const profBox = $('#duel-profiles');
  if (!ranked.length) {
    profBox.innerHTML = '';
    return;
  }
  profBox.innerHTML = ranked.map(p => {
    const lvl = computeLevel(p.xp);
    const xpPct = lvl.next ? Math.round(100 * (p.xp - lvl.lvl.xp) / (lvl.next.xp - lvl.lvl.xp)) : 100;
    const badgesHtml = Object.keys(BADGES).map(key => {
      const has = p.badges.includes(key);
      return `<div class="badge-mini ${has ? '' : 'locked'}" title="${BADGES[key].title} — ${BADGES[key].desc}">${BADGES[key].icon}</div>`;
    }).join('');
    const color = avatarColor(p.name);
    return `<div class="duel-profile-card">
      <div class="duel-profile-head">
        <div class="duel-avatar-mini" style="background:linear-gradient(135deg,${color} 0%,${avatarColor(p.name+'_')} 100%);">${avatarInitial(p.name)}</div>
        <div class="name">${p.name}</div>
        <span class="level-name">${lvl.lvl.name}</span>
      </div>
      <div class="level-info"><span>Niv ${lvl.idx+1} — ${p.xp} XP</span><span>${lvl.next ? lvl.next.xp + ' XP' : 'MAX'}</span></div>
      <div class="level-bar"><div class="level-fill" style="width:${xpPct}%;"></div></div>
      <div class="duel-profile-stats">
        <div class="duel-stat-box"><div class="val">${p.duels}</div><div class="lab">duels</div></div>
        <div class="duel-stat-box"><div class="val">${p.wins}</div><div class="lab">victoires</div></div>
        <div class="duel-stat-box"><div class="val">${p.bestStreak}</div><div class="lab">meilleure série</div></div>
      </div>
      <div class="duel-profile-badges">${badgesHtml}</div>
    </div>`;
  }).join('');
}

/* ==========================================================================
   EXERCICES DE RÉDACTION (glisser-déposer / tap-to-place)
   ==========================================================================
   Chaque exercice : template HTML avec {n} = emplacement numéroté.
   Pool = liste de tags à placer (correct + distracteurs).
   Validation : comparer chaque blank à sa valeur "correct".
   ========================================================================== */

const REDACTIONS = {
  pythagore_direct: {
    title: "Pythagore — calculer la longueur d'un côté",
    context: "Le triangle ABC est rectangle en A avec AB = 3 cm et AC = 4 cm. On veut calculer la longueur BC.",
    template: `Dans le triangle ABC rectangle en {1}, d'après le théorème de {2} :<br>
{3}² = {4}² + {5}² = 3² + 4² = 9 + 16 = 25<br>
Donc BC = √25 = <strong>{6} cm</strong>.`,
    blanks: [
      { id: 1, correct: 'A' },
      { id: 2, correct: 'Pythagore' },
      { id: 3, correct: 'BC' },
      { id: 4, correct: 'AB' },
      { id: 5, correct: 'AC' },
      { id: 6, correct: '5' }
    ],
    pool: ['A', 'B', 'C', 'Pythagore', 'Thalès', 'BC', 'AB', 'AC', '5', '25', '7']
  },

  pythagore_reciproque_vrai: {
    title: "Réciproque de Pythagore — triangle rectangle (vrai)",
    context: "Un triangle ABC a pour côtés AB = 3 cm, AC = 4 cm et BC = 5 cm. Est-il rectangle ?",
    template: `D'une part : {1}² = 5² = <strong>25</strong>.<br>
D'autre part : {2}² + {3}² = 3² + 4² = 9 + 16 = <strong>25</strong>.<br>
On constate que <strong>BC² {4} AB² + AC²</strong>.<br>
Donc d'après la {5} du théorème de Pythagore,<br>
le triangle ABC est <strong>rectangle en {6}</strong>.`,
    blanks: [
      { id: 1, correct: 'BC' },
      { id: 2, correct: 'AB' },
      { id: 3, correct: 'AC' },
      { id: 4, correct: '=' },
      { id: 5, correct: 'réciproque' },
      { id: 6, correct: 'A' }
    ],
    pool: ['BC', 'AB', 'AC', 'A', 'B', 'C', '=', '≠', 'réciproque', 'contraposée', 'énoncé']
  },

  pythagore_reciproque_faux: {
    title: "Réciproque de Pythagore — triangle non rectangle (faux)",
    context: "Un triangle ABC a pour côtés AB = 4 cm, AC = 5 cm et BC = 7 cm. Est-il rectangle ?",
    template: `D'une part : {1}² = 7² = <strong>49</strong>.<br>
D'autre part : AB² + AC² = 4² + 5² = 16 + 25 = <strong>41</strong>.<br>
On constate que <strong>BC² {2} AB² + AC²</strong>.<br>
Donc d'après la {3} du théorème de Pythagore,<br>
le triangle ABC <strong>{4} rectangle</strong>.`,
    blanks: [
      { id: 1, correct: 'BC' },
      { id: 2, correct: '≠' },
      { id: 3, correct: 'contraposée' },
      { id: 4, correct: "n'est pas" }
    ],
    pool: ['BC', 'AB', 'AC', '=', '≠', 'réciproque', 'contraposée', 'est', "n'est pas"]
  },

  thales_direct: {
    title: "Thalès — calculer une longueur",
    context: "Sur la figure, (MN)//(BC) avec AM = 2, AB = 6, AN = 3. On cherche AC.",
    template: `Les points A, M, B sont alignés et A, N, C sont alignés.<br>
Les droites (MN) et {1} sont parallèles.<br>
D'après le théorème de {2} :<br>
<span style="font-size:1.1em;">AM / {3} = AN / {4} = MN / BC</span><br>
Donc : 2 / 6 = 3 / {5}<br>
D'où AC = <strong>{6}</strong> (par produit en croix).`,
    blanks: [
      { id: 1, correct: '(BC)' },
      { id: 2, correct: 'Thalès' },
      { id: 3, correct: 'AB' },
      { id: 4, correct: 'AC' },
      { id: 5, correct: 'AC' },
      { id: 6, correct: '9' }
    ],
    pool: ['(BC)', '(MN)', 'Thalès', 'Pythagore', 'AB', 'AC', 'BC', '9', '6', '4']
  },

  thales_reciproque_vrai: {
    title: "Réciproque de Thalès — droites parallèles (vrai)",
    context: "A, M, B alignés dans cet ordre. A, N, C alignés. AM = 2, AB = 6, AN = 3, AC = 9. (MN) et (BC) sont-elles parallèles ?",
    template: `D'une part : AM / AB = {1} / {2} = <strong>1/3</strong>.<br>
D'autre part : AN / AC = {3} / {4} = <strong>1/3</strong>.<br>
On constate que <strong>AM/AB {5} AN/AC</strong>, et les points sont dans le même ordre.<br>
Donc d'après la {6} du théorème de Thalès,<br>
les droites (MN) et (BC) sont <strong>{7}</strong>.`,
    blanks: [
      { id: 1, correct: '2' },
      { id: 2, correct: '6' },
      { id: 3, correct: '3' },
      { id: 4, correct: '9' },
      { id: 5, correct: '=' },
      { id: 6, correct: 'réciproque' },
      { id: 7, correct: 'parallèles' }
    ],
    pool: ['2', '3', '6', '9', '=', '≠', 'réciproque', 'théorème', 'parallèles', 'sécantes', 'confondues']
  },

  thales_reciproque_faux: {
    title: "Réciproque de Thalès — droites non parallèles (faux)",
    context: "A, M, B alignés. A, N, C alignés. AM = 2, AB = 5, AN = 3, AC = 8. (MN) et (BC) sont-elles parallèles ?",
    template: `D'une part : AM / AB = 2 / 5 = <strong>0,4</strong>.<br>
D'autre part : AN / AC = 3 / 8 = <strong>0,375</strong>.<br>
On constate que <strong>AM/AB {1} AN/AC</strong>.<br>
Donc d'après la {2} du théorème de Thalès,<br>
les droites (MN) et (BC) <strong>{3} parallèles</strong>.`,
    blanks: [
      { id: 1, correct: '≠' },
      { id: 2, correct: 'contraposée' },
      { id: 3, correct: "ne sont pas" }
    ],
    pool: ['=', '≠', 'réciproque', 'contraposée', 'sont', "ne sont pas"]
  },

  trigo_cote: {
    title: "Trigonométrie — calculer un côté",
    context: "Dans un triangle ABC rectangle en A, on connaît l'angle ABC = 35° et BC = 10 cm. On cherche AB.",
    template: `Dans le triangle ABC rectangle en {1}, pour l'angle en B :<br>
• côté adjacent à B : <strong>{2}</strong><br>
• hypoténuse : <strong>{3}</strong><br>
On connaît l'hypoténuse, on cherche l'adjacent → on utilise {4}.<br>
{4}(B̂) = adjacent / hypoténuse = {5} / {6}<br>
Donc AB = BC × {4}(35°) ≈ 10 × 0,82 ≈ <em>8,2 cm</em>.`,
    blanks: [
      { id: 1, correct: 'A' },
      { id: 2, correct: 'AB' },
      { id: 3, correct: 'BC' },
      { id: 4, correct: 'cos' },
      { id: 5, correct: 'AB' },
      { id: 6, correct: 'BC' }
    ],
    pool: ['A', 'B', 'C', 'AB', 'AC', 'BC', 'cos', 'sin', 'tan']
  },

  triangles_semblables: {
    title: "Triangles semblables — rédaction",
    context: "Les triangles ABC et A'B'C' ont AB = 3, BC = 4 et A'B' = 6, B'C' = 8.",
    template: `On compare les rapports :<br>
A'B' / AB = {1} / {2} = <strong>2</strong><br>
B'C' / BC = {3} / {4} = <strong>2</strong><br>
On constate que les côtés correspondants sont <strong>{5}</strong>.<br>
Donc les triangles ABC et A'B'C' sont <strong>{6}</strong>,<br>
avec un rapport de similitude égal à <strong>{7}</strong>.`,
    blanks: [
      { id: 1, correct: '6' },
      { id: 2, correct: '3' },
      { id: 3, correct: '8' },
      { id: 4, correct: '4' },
      { id: 5, correct: 'proportionnels' },
      { id: 6, correct: 'semblables' },
      { id: 7, correct: '2' }
    ],
    pool: ['3', '4', '6', '8', '2', 'proportionnels', 'égaux', 'semblables', 'isocèles', 'rectangles']
  }
};

/* État de l'exercice en cours */
let redactionState = null;

function openRedaction(key) {
  const ex = REDACTIONS[key];
  if (!ex) return;

  // Initialiser l'état : chaque blank commence vide
  redactionState = {
    key,
    ex,
    filled: Object.fromEntries(ex.blanks.map(b => [b.id, null])), // { 1: 'A', 2: null, ... }
    selectedTag: null,         // tag cliqué en attente de placement
    selectedBlank: null,       // blank cliqué en attente
    validated: false
  };

  const modal = document.createElement('div');
  modal.className = 'modal-backdrop redaction-modal';
  modal.innerHTML = `
    <div class="modal">
      <h3>✍️ ${ex.title}</h3>
      <div class="redaction-context">${ex.context}</div>
      <div class="redaction-phrase" id="redaction-phrase"></div>
      <div class="redaction-pool" id="redaction-pool">
        <div class="redaction-pool-title">Étiquettes à placer — clique sur une étiquette puis sur un emplacement</div>
      </div>
      <div id="redaction-score-zone"></div>
      <div class="redaction-actions">
        <button class="ghost" id="btn-redaction-reset">🔄 Effacer</button>
        <button class="ghost" id="btn-redaction-close">Fermer</button>
        <button class="primary" id="btn-redaction-validate">✓ Valider</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  renderRedactionPhrase();
  renderRedactionPool();

  $('#btn-redaction-close').addEventListener('click', () => modal.remove());
  $('#btn-redaction-reset').addEventListener('click', () => {
    ex.blanks.forEach(b => redactionState.filled[b.id] = null);
    redactionState.selectedTag = null;
    redactionState.validated = false;
    $('#redaction-score-zone').innerHTML = '';
    renderRedactionPhrase();
    renderRedactionPool();
  });
  $('#btn-redaction-validate').addEventListener('click', validateRedaction);
}

function renderRedactionPhrase() {
  const { ex, filled, validated } = redactionState;
  let html = ex.template;
  ex.blanks.forEach(b => {
    const val = filled[b.id];
    let cls = 'blank';
    if (val) cls += ' filled';
    if (validated) cls += ' ' + (isBlankCorrect(b) ? 'correct' : 'wrong');
    // split/join pour remplacer TOUTES les occurrences du placeholder {id}
    // (utile quand un même emplacement apparaît plusieurs fois dans la rédaction)
    html = html.split(`{${b.id}}`).join(
      `<span class="${cls}" data-blank-id="${b.id}">${val || '?'}</span>`);
  });
  $('#redaction-phrase').innerHTML = html;
  $('#redaction-phrase').querySelectorAll('.blank').forEach(b => {
    b.addEventListener('click', () => {
      const id = parseInt(b.dataset.blankId, 10);
      if (redactionState.validated) return;
      if (redactionState.selectedTag) {
        // Placer le tag sélectionné
        redactionState.filled[id] = redactionState.selectedTag;
        redactionState.selectedTag = null;
        renderRedactionPhrase();
        renderRedactionPool();
      } else if (redactionState.filled[id]) {
        // Vider un blank déjà rempli
        redactionState.filled[id] = null;
        renderRedactionPhrase();
        renderRedactionPool();
      }
    });
  });
}

function isBlankCorrect(b) {
  const val = redactionState.filled[b.id];
  if (!val) return false;
  const correct = b.correct;
  if (Array.isArray(correct)) return correct.includes(val);
  return val === correct;
}

function renderRedactionPool() {
  const { ex, selectedTag } = redactionState;
  const poolEl = $('#redaction-pool');
  poolEl.innerHTML = '<div class="redaction-pool-title">Étiquettes à placer — clique sur une étiquette puis sur un emplacement</div>' +
    ex.pool.map(tag => {
      const isSelected = selectedTag === tag;
      return `<button class="redaction-tag ${isSelected ? 'selected' : ''}" data-tag="${tag}">${tag}</button>`;
    }).join('');
  poolEl.querySelectorAll('.redaction-tag').forEach(t => {
    t.addEventListener('click', () => {
      if (redactionState.validated) return;
      const tag = t.dataset.tag;
      redactionState.selectedTag = redactionState.selectedTag === tag ? null : tag;
      renderRedactionPool();
    });
  });
}

function validateRedaction() {
  redactionState.validated = true;
  const { ex, filled } = redactionState;
  const nbTotal = ex.blanks.length;
  const nbCorrect = ex.blanks.filter(b => isBlankCorrect(b)).length;
  const cls = nbCorrect === nbTotal ? 'perfect' : (nbCorrect >= nbTotal * 0.6 ? 'ok' : 'ko');
  const msg = nbCorrect === nbTotal
    ? `🎉 Parfait ! ${nbCorrect}/${nbTotal} — rédaction sans faute.`
    : `${nbCorrect}/${nbTotal} étiquettes correctes. Les verts sont justes, les rouges à revoir.`;
  $('#redaction-score-zone').innerHTML = `<div class="redaction-score ${cls}">${msg}</div>`;
  renderRedactionPhrase();
}

/* ==========================================================================
   MINI-JEUX : Puissance 4 + Course de pions
   ========================================================================== */

/* ---------- PUISSANCE 4 ---------- */
function c4_init() {
  // 6 lignes x 7 colonnes, null = vide, 0 = J1, 1 = J2
  return {
    grid: Array.from({length: 6}, () => Array(7).fill(null)),
    winner: null,
    winningLine: null
  };
}

function c4_drop(state, col, playerIdx) {
  for (let r = 5; r >= 0; r--) {
    if (state.grid[r][col] === null) {
      state.grid[r][col] = playerIdx;
      const win = c4_checkWin(state.grid, r, col, playerIdx);
      if (win) {
        state.winner = playerIdx;
        state.winningLine = win;
      }
      return { row: r };
    }
  }
  return null; // colonne pleine
}

function c4_checkWin(grid, r, c, p) {
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  for (const [dr, dc] of dirs) {
    const line = [[r,c]];
    // Dans un sens
    let rr = r + dr, cc = c + dc;
    while (rr>=0 && rr<6 && cc>=0 && cc<7 && grid[rr][cc] === p) {
      line.push([rr,cc]);
      rr += dr; cc += dc;
    }
    // Sens opposé
    rr = r - dr; cc = c - dc;
    while (rr>=0 && rr<6 && cc>=0 && cc<7 && grid[rr][cc] === p) {
      line.unshift([rr,cc]);
      rr -= dr; cc -= dc;
    }
    if (line.length >= 4) return line.slice(0, 4);
  }
  return null;
}

function c4_isFull(state) {
  return state.grid[0].every(v => v !== null);
}

function c4_canPlay(state, col) {
  return state.grid[0][col] === null;
}

function renderConnect4(state, interactiveForPlayerIdx) {
  const winSet = new Set((state.winningLine || []).map(p => p.join(',')));
  let arrows = '<div class="c4-arrows">';
  for (let c = 0; c < 7; c++) {
    const playable = c4_canPlay(state, c);
    const active = interactiveForPlayerIdx != null && playable && state.winner === null;
    arrows += `<div class="c4-arrow ${active ? 'active' : ''} ${!playable ? 'disabled' : ''}" data-col="${c}">↓</div>`;
  }
  arrows += '</div>';
  let grid = '<div class="c4-grid">';
  for (let c = 0; c < 7; c++) {
    const playable = c4_canPlay(state, c) && interactiveForPlayerIdx != null && state.winner === null;
    grid += `<div class="c4-col ${playable ? 'playable' : ''} ${!c4_canPlay(state, c) ? 'full' : ''}" data-col="${c}">`;
    for (let r = 0; r < 6; r++) {
      const val = state.grid[r][c];
      const cls = val === 0 ? 'p1' : val === 1 ? 'p2' : '';
      const winning = winSet.has(`${r},${c}`);
      grid += `<div class="c4-cell ${cls} ${winning ? 'winning' : ''}"></div>`;
    }
    grid += '</div>';
  }
  grid += '</div>';
  return arrows + grid;
}

/* ---------- COURSE DE PIONS ---------- */
function race_init() {
  // 12 cases + ligne arrivée (case 12)
  // Générer des bonus (+1) et malus (-1) aléatoires entre case 2 et 10
  const specials = {};
  const positions = shuffle([2,3,4,5,6,7,8,9,10]);
  specials[positions[0]] = 'bonus';
  specials[positions[1]] = 'bonus';
  specials[positions[2]] = 'malus';
  specials[positions[3]] = 'malus';
  return {
    positions: [0, 0], // position de chaque joueur
    specials,          // {case: 'bonus'|'malus'}
    winner: null,
    finishLine: 12
  };
}

function race_advance(state, playerIdx, steps) {
  state.positions[playerIdx] = Math.min(state.finishLine, state.positions[playerIdx] + steps);
  // Déclencher case spéciale
  const cell = state.positions[playerIdx];
  let bonus = 0;
  if (state.specials[cell] === 'bonus') {
    bonus = 1;
    state.positions[playerIdx] = Math.min(state.finishLine, state.positions[playerIdx] + 1);
  } else if (state.specials[cell] === 'malus') {
    bonus = -1;
    state.positions[playerIdx] = Math.max(0, state.positions[playerIdx] - 1);
  }
  if (state.positions[playerIdx] >= state.finishLine) {
    state.winner = playerIdx;
  }
  return { bonus };
}

function renderRace(state, players) {
  let html = '<div class="race-track"><div class="race-lanes">';
  for (let p = 0; p < 2; p++) {
    html += `<div class="race-lane"><span class="race-label p${p+1}">${players[p].name}</span>`;
    for (let i = 1; i <= 12; i++) {
      const special = state.specials[i] || '';
      const isFinish = i === 12 ? 'finish' : '';
      const hasPawn = state.positions[p] === i;
      html += `<div class="race-cell ${special} ${isFinish}">${hasPawn ? `<div class="race-pawn p${p+1}"></div>` : ''}</div>`;
    }
    html += `<span class="race-label p${p+1}">🏁</span></div>`;
  }
  html += '</div></div>';
  return html;
}

/* ---------- Intégration mini-jeu dans le flow duel ---------- */
function initMiniGame() {
  if (duelState.miniGame === 'connect4') duelState.miniGameState = c4_init();
  else if (duelState.miniGame === 'race') duelState.miniGameState = race_init();
  else duelState.miniGameState = null;
}

/* Appelé APRÈS une bonne réponse du joueur currentIdx.
   Pour Puissance 4 : demande au joueur de choisir une colonne.
   Pour Course : avance automatiquement.
   Appelle onDone() quand le coup est joué (ou immédiatement pour race). */
function miniGamePlayMove(onDone) {
  const pIdx = duelState.currentIdx;
  const state = duelState.miniGameState;
  if (duelState.miniGame === 'connect4') {
    // Afficher grille interactive + message très visible
    const container = $('#duel-question-container');
    const pionColor = pIdx === 0 ? '#3b82f6' : '#f59e0b';
    const pionColorDark = pIdx === 0 ? '#1e40af' : '#b45309';
    const pionSvg = `<span style="display:inline-block;width:28px;height:28px;border-radius:50%;background:radial-gradient(circle at 35% 35%,${pionColor} 0%,${pionColorDark} 100%);box-shadow:0 2px 4px rgba(0,0,0,0.25);vertical-align:middle;margin-right:8px;"></span>`;
    container.innerHTML = `
      <div style="background:linear-gradient(90deg, ${pionColor} 0%, ${pionColorDark} 100%);color:white;padding:14px 18px;border-radius:12px;margin-bottom:14px;text-align:center;font-weight:700;font-size:1.05rem;box-shadow:0 4px 12px ${pionColor}55;">
        ${pionSvg}✓ Bonne réponse ! ${duelState.players[pIdx].name}, place ton pion dans la colonne de ton choix ↓
      </div>
      <div class="minigame-box">
        ${renderConnect4(state, pIdx)}
      </div>
    `;
    container.querySelectorAll('.c4-col.playable, .c4-arrow.active').forEach(el => {
      el.addEventListener('click', () => {
        const col = parseInt(el.dataset.col, 10);
        if (!c4_canPlay(state, col)) return;
        c4_drop(state, col, pIdx);
        // Re-render (non interactif, pour voir le pion posé)
        container.innerHTML = `
          <div class="minigame-box">
            <h4>🔴 Puissance 4</h4>
            ${renderConnect4(state, null)}
          </div>
        `;
        setTimeout(onDone, 500);
      });
    });
  } else if (duelState.miniGame === 'race') {
    const result = race_advance(state, pIdx, 1);
    const bonusMsg = result.bonus === 1 ? ` <strong>+1 bonus !</strong>`
      : result.bonus === -1 ? ` <strong>−1 malus !</strong>` : '';
    const pionColor = pIdx === 0 ? '#3b82f6' : '#f59e0b';
    const pionColorDark = pIdx === 0 ? '#1e40af' : '#b45309';
    const pionSvg = `<span style="display:inline-block;width:26px;height:26px;border-radius:50%;background:radial-gradient(circle at 35% 35%,${pionColor} 0%,${pionColorDark} 100%);vertical-align:middle;margin-right:8px;"></span>`;
    const container = $('#duel-question-container');
    container.innerHTML = `
      <div style="background:linear-gradient(90deg, ${pionColor} 0%, ${pionColorDark} 100%);color:white;padding:14px 18px;border-radius:12px;margin-bottom:14px;text-align:center;font-weight:700;font-size:1.05rem;box-shadow:0 4px 12px ${pionColor}55;">
        ${pionSvg}✓ Bonne réponse ! ${duelState.players[pIdx].name} avance d'une case${bonusMsg}
      </div>
      <div class="minigame-box">
        ${renderRace(state, duelState.players)}
      </div>
    `;
    setTimeout(onDone, 1600);
  } else {
    onDone();
  }
}

function miniGameCheckWinAndMaybeEnd(onContinue) {
  const s = duelState.miniGameState;
  if (!s) { onContinue(); return; }
  if (s.winner !== null) {
    // Mini-jeu terminé, on clôture le duel avec ce vainqueur
    duelState.miniGameWinner = s.winner;
    // Ajuster scores pour que le winner du mini-jeu soit celui qui finit en tête
    // Solution simple : +1 point fictif au vainqueur si égalité
    if (duelState.scores[0] === duelState.scores[1]) {
      duelState.scores[s.winner]++;
    } else if ((duelState.scores[0] > duelState.scores[1]) !== (s.winner === 0)) {
      // Le vainqueur du mini-jeu n'est pas en tête aux questions → ajuster
      duelState.scores[s.winner] = duelState.scores[1 - s.winner] + 1;
    }
    finishDuel();
    return;
  }
  onContinue();
}

/* ---------- Init ---------- */
initDarkMode();
initA11y();
initTabs();
initThemes();
initKeyboard();
initDuel();
refreshStudentBadge();
// Bandeau d'invitation au 1er lancement (non bloquant)
if (!getStudent() && !localStorage.getItem('auto3br.welcome-dismissed')) {
  setTimeout(showWelcomeBanner, 400);
}
function showWelcomeBanner() {
  const banner = document.createElement('div');
  banner.className = 'welcome-banner';
  banner.innerHTML = `
    <div class="welcome-content">
      <strong>Bienvenue !</strong> Identifie-toi (prénom + classe) pour garder ton historique. Ton identité reste <strong>sur ton appareil</strong>, rien n'est envoyé.
    </div>
    <div class="welcome-actions">
      <button class="ghost small" id="welcome-dismiss">Plus tard</button>
      <button class="primary small" id="welcome-login">M'identifier</button>
    </div>`;
  document.body.appendChild(banner);
  $('#welcome-dismiss').addEventListener('click', () => {
    localStorage.setItem('auto3br.welcome-dismissed', '1');
    banner.remove();
  });
  $('#welcome-login').addEventListener('click', () => {
    banner.remove();
    showLogin();
  });
}
