const { BrowserWindow } = require('electron');

let sbWindow = null;

function getSbHtml() {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Stat Block</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #f8f0dc;
    color: #1a0e00;
    font-family: Georgia, serif;
    font-size: 13.5px;
    padding: 16px 18px 20px;
    overflow-y: auto;
  }
  .name {
    font-size: 1.35rem;
    color: #5c1a1a;
    font-weight: bold;
    margin-bottom: 2px;
  }
  .meta {
    font-style: italic;
    color: #5c1a1a;
    font-size: 0.88rem;
    margin-bottom: 10px;
  }
  .divider {
    border: none;
    border-top: 2px solid #9c2c2c;
    margin: 9px 0;
  }
  .row {
    font-size: 0.87rem;
    margin: 3px 0;
    line-height: 1.5;
  }
  .label {
    font-weight: bold;
    color: #5c1a1a;
    margin-right: 5px;
  }
  .stats {
    display: flex;
    text-align: center;
    border-top: 1px solid #c8a84c;
    border-bottom: 1px solid #c8a84c;
    padding: 7px 0;
    margin: 9px 0;
  }
  .stat { flex: 1; }
  .stat-label { font-size: 0.68rem; font-weight: bold; color: #5c1a1a; text-transform: uppercase; }
  .stat-val   { font-size: 0.95rem; font-weight: bold; }
  .stat-mod   { font-size: 0.78rem; color: #5c1a1a; }
  .section-title {
    font-variant: small-caps;
    font-size: 1.05rem;
    color: #5c1a1a;
    border-bottom: 1px solid #9c2c2c;
    margin-bottom: 6px;
    padding-bottom: 2px;
  }
  .ability { font-size: 0.85rem; margin: 5px 0; line-height: 1.5; }
  .ability-name { font-weight: bold; font-style: italic; }
  .description { font-size: 0.83rem; font-style: italic; color: #5a3a1a; line-height: 1.6; }
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-thumb { background: #c8a84c; border-radius: 3px; }
</style>
</head>
<body>
<div id="root"><p style="color:#9a8060;font-style:italic;padding:20px">Loading…</p></div>
<script>
function statMod(score) {
  const m = Math.floor((score - 10) / 2);
  return m >= 0 ? '+' + m : '' + m;
}
function esc(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function renderMonster(m) {
  const str  = m.str  || m.strength      || 10;
  const dex  = m.dex  || m.dexterity     || 10;
  const con  = m.con  || m.constitution  || 10;
  const int_ = m.int  || m.intelligence  || 10;
  const wis  = m.wis  || m.wisdom        || 10;
  const cha  = m.cha  || m.charisma      || 10;

  const ac       = m.ac || m.armor_class || '—';
  const acDesc   = m.ac_desc || m.armor_desc || '';
  const hp       = m.hp || m.hit_points  || '—';
  const hpDice   = m.hp_dice || m.hit_dice || '';

  const speedRaw = m.speed;
  const speed = typeof speedRaw === 'object' && speedRaw !== null
    ? Object.entries(speedRaw).filter(([k]) => k !== 'unit').map(([k,v]) => k + ' ' + v + ' ft.').join(', ')
    : speedRaw || '—';

  const typeName = (m.type && m.type.name) ? m.type.name : (m.type || '');
  const sizeName = (m.size && m.size.name) ? m.size.name : (m.size || '');
  const cr       = m.challenge_rating || m.challenge_rating_text || m.cr || '—';

  const skillsStr = m.skills && typeof m.skills === 'object'
    ? Object.entries(m.skills).map(([k,v]) => k.charAt(0).toUpperCase() + k.slice(1) + ' +' + v).join(', ')
    : m.skills || '';

  const specialAbilities = m.special_abilities || [];
  const actions          = m.actions           || [];
  const legendaryActions = m.legendary_actions || [];

  document.title = m.name;

  let html = '';
  html += '<h2 class="name">' + esc(m.name) + '</h2>';
  html += '<p class="meta">' + esc(sizeName + (typeName ? ' ' + typeName : '') + (m.alignment ? ', ' + m.alignment : '')) + '</p>';
  html += '<div class="divider"></div>';
  html += '<div class="row"><span class="label">Armour Class</span>' + esc(ac) + (acDesc ? ' (' + esc(acDesc) + ')' : '') + '</div>';
  html += '<div class="row"><span class="label">Hit Points</span>' + esc(hp) + (hpDice ? ' (' + esc(hpDice) + ')' : '') + '</div>';
  html += '<div class="row"><span class="label">Speed</span>' + esc(speed) + '</div>';
  html += '<div class="stats">' +
    [['STR',str],['DEX',dex],['CON',con],['INT',int_],['WIS',wis],['CHA',cha]].map(([l,v]) =>
      '<div class="stat"><div class="stat-label">' + l + '</div><div class="stat-val">' + v +
      '</div><div class="stat-mod">' + statMod(v) + '</div></div>'
    ).join('') + '</div>';
  html += '<div class="divider"></div>';

  if (m.saving_throws)        html += '<div class="row"><span class="label">Saving Throws</span>' + esc(m.saving_throws) + '</div>';
  if (skillsStr)              html += '<div class="row"><span class="label">Skills</span>' + esc(skillsStr) + '</div>';
  if (m.damage_vulnerabilities) html += '<div class="row"><span class="label">Vulnerabilities</span>' + esc(m.damage_vulnerabilities) + '</div>';
  if (m.damage_resistances)   html += '<div class="row"><span class="label">Resistances</span>' + esc(m.damage_resistances) + '</div>';
  if (m.damage_immunities)    html += '<div class="row"><span class="label">Immunities</span>' + esc(m.damage_immunities) + '</div>';
  if (m.condition_immunities) html += '<div class="row"><span class="label">Condition Immunities</span>' + esc(m.condition_immunities) + '</div>';
  if (m.senses)               html += '<div class="row"><span class="label">Senses</span>' + esc(m.senses) + '</div>';
  if (m.languages)            html += '<div class="row"><span class="label">Languages</span>' + esc(m.languages) + '</div>';
  html += '<div class="row"><span class="label">Challenge</span>' + esc(cr) + '</div>';

  if (specialAbilities.length > 0) {
    html += '<div class="divider"></div>';
    specialAbilities.forEach(a => {
      html += '<div class="ability"><span class="ability-name">' + esc(a.name) + '.</span> ' + esc(a.desc) + '</div>';
    });
  }
  if (actions.length > 0) {
    html += '<div class="divider"></div><div class="section-title">Actions</div>';
    actions.forEach(a => {
      html += '<div class="ability"><span class="ability-name">' + esc(a.name) + '.</span> ' + esc(a.desc) + '</div>';
    });
  }
  if (legendaryActions.length > 0) {
    html += '<div class="divider"></div><div class="section-title">Legendary Actions</div>';
    legendaryActions.forEach(a => {
      html += '<div class="ability"><span class="ability-name">' + esc(a.name) + '.</span> ' + esc(a.desc) + '</div>';
    });
  }
  if (m.description) {
    html += '<div class="divider"></div><div class="description">' + esc(m.description) + '</div>';
  }

  document.getElementById('root').innerHTML = html;
}
</script>
</body>
</html>`;
}

function openStatBlock(monsterData) {
  const js = `renderMonster(${JSON.stringify(monsterData)})`;

  if (sbWindow && !sbWindow.isDestroyed()) {
    sbWindow.webContents.executeJavaScript(js).catch(() => {});
    sbWindow.setTitle(monsterData.name);
    sbWindow.focus();
    return;
  }

  sbWindow = new BrowserWindow({
    width: 460,
    height: 720,
    minWidth: 340,
    minHeight: 300,
    title: monsterData.name,
    alwaysOnTop: false,
    backgroundColor: '#f8f0dc',
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });
  sbWindow.setMenuBarVisibility(false);
  sbWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(getSbHtml())}`);
  sbWindow.webContents.once('did-finish-load', () => {
    sbWindow.webContents.executeJavaScript(js).catch(() => {});
  });
  sbWindow.on('closed', () => { sbWindow = null; });
}

module.exports = { openStatBlock };
