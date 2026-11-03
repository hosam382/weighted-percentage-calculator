// ربط الصفحة بدوال الحساب في calc.js. كل شي يتحدث وأنت تكتب، والرابط يحفظ المدخلات عشان تشاركها
import { PARTS, LABELS, PRESETS, weighted, required, weightsError, round2 } from './calc.js';

const $ = (id) => document.getElementById(id);
const state = { mode: 'calc' };

// يقبل الأرقام العربية (٩٥٫٥) والإنجليزية، ويرجع null إذا الخانة فاضية
function num(str) {
  const s = String(str ?? '').trim()
    .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    .replace(/[٫,]/g, '.');
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}
const fmt = (n) => round2(n).toFixed(2).replace(/\.00$/, '');

function weights() {
  const id = $('preset').value;
  if (id !== 'custom') return { ...PRESETS.find((p) => p.id === id).weights };
  const w = {};
  for (const p of PARTS) w[p] = num($('w-' + p).value) ?? 0;
  return w;
}

function scores() {
  const s = {};
  for (const p of PARTS) s[p] = num($('s-' + p).value);
  return s;
}

function setResult({ label, value = '—', note = '', tone = '' }) {
  $('resultLabel').textContent = label;
  $('resultValue').textContent = value;
  $('resultValue').className = 'rvalue ' + tone;
  $('resultNote').textContent = note;
}

function showBar(parts) {
  $('bar').hidden = !parts;
  $('legend').hidden = !parts;
  if (!parts) return;
  for (const p of PARTS) $('bar').querySelector(`[data-part="${p}"]`).style.width = parts[p] + '%';
  $('legend').innerHTML = PARTS.filter((p) => parts[p] > 0)
    .map((p) => `<li>${LABELS[p]}: <b>${fmt(parts[p])}</b></li>`).join('');
}

function render() {
  const w = weights();
  const s = scores();
  const need = state.mode === 'need';
  const unknown = $('unknown').value;

  // خانة الجزء اللي وزنه صفر (أو اللي نحسبه) تنطفي
  for (const p of PARTS) {
    const off = w[p] === 0 || (need && p === unknown);
    $('s-' + p).closest('.field').classList.toggle('off', off);
    $('s-' + p).disabled = off;
    const v = s[p];
    $('s-' + p).setAttribute('aria-invalid', String(v !== null && !(v >= 0 && v <= 100)));
  }

  const wErr = weightsError(w);
  if (wErr) { setResult({ label: 'الأوزان', note: wErr, tone: 'bad' }); showBar(null); return; }

  const needed = PARTS.filter((p) => w[p] > 0 && !(need && p === unknown));
  if (needed.some((p) => s[p] === null)) {
    setResult({ label: need ? 'تحتاج' : 'نسبتك الموزونة', note: 'اكتب ' + needed.filter((p) => s[p] === null).map((p) => LABELS[p]).join(' و') + '.' });
    showBar(null); return;
  }

  try {
    if (!need) {
      const r = weighted(s, w);
      setResult({ label: 'نسبتك الموزونة', value: fmt(r.total) + '%', note: 'هذي نسبتك حسب الأوزان اللي اخترتها.' });
      showBar(r.parts);
      return;
    }
    const target = num($('target').value);
    if (target === null) { setResult({ label: 'تحتاج', note: 'اكتب النسبة الموزونة اللي تبيها.' }); showBar(null); return; }
    const r = required(s, w, target, unknown);
    const what = LABELS[unknown];
    if (r.status === 'ok') setResult({ label: `تحتاج في ${what}`, value: fmt(r.value), note: `إذا جبت ${fmt(r.value)} أو أكثر في ${what}، توصل نسبة موزونة ${fmt(target)}%.` });
    else if (r.status === 'done') setResult({ label: `تحتاج في ${what}`, value: '0', tone: 'good', note: `درجاتك الحالية لحالها توصلك ${fmt(target)}% أو أكثر.` });
    else if (r.status === 'impossible') setResult({ label: `تحتاج في ${what}`, value: fmt(r.value), tone: 'bad', note: `هذا أكثر من 100، يعني ${fmt(target)}% ما تنوصل بهذي الأوزان والدرجات. جرّب هدف أقل.` });
    else setResult({ label: 'تحتاج', note: `${what} وزنه صفر في هذي الأوزان، فما يأثر على النسبة.` });
    showBar(null);
  } catch (e) {
    setResult({ label: need ? 'تحتاج' : 'نسبتك الموزونة', note: e.message, tone: 'bad' });
    showBar(null);
  }
}

function setMode(mode) {
  state.mode = mode;
  for (const b of document.querySelectorAll('.tabs button')) b.setAttribute('aria-selected', String(b.dataset.mode === mode));
  $('needRow').hidden = mode !== 'need';
  render();
}

// الرابط: ?m=need&p=sci&s=95&q=80&t=85&g=90&u=tahsili&w=30-30-40
function toUrl() {
  const u = new URLSearchParams();
  u.set('m', state.mode);
  u.set('p', $('preset').value);
  if ($('preset').value === 'custom') u.set('w', PARTS.map((p) => $('w-' + p).value || 0).join('-'));
  for (const [k, p] of [['s', 'school'], ['q', 'qudrat'], ['t', 'tahsili']]) if ($('s-' + p).value) u.set(k, $('s-' + p).value);
  if (state.mode === 'need') { u.set('g', $('target').value); u.set('u', $('unknown').value); }
  return location.origin + location.pathname + '?' + u.toString();
}

function fromUrl() {
  const u = new URLSearchParams(location.search);
  if (['sci', 'hum', 'custom'].includes(u.get('p'))) $('preset').value = u.get('p');
  if (u.get('w')) u.get('w').split('-').forEach((v, i) => { $('w-' + PARTS[i]).value = v; });
  for (const [k, p] of [['s', 'school'], ['q', 'qudrat'], ['t', 'tahsili']]) if (u.get(k)) $('s-' + p).value = u.get(k);
  if (u.get('g')) $('target').value = u.get('g');
  if (PARTS.includes(u.get('u'))) $('unknown').value = u.get('u');
  $('customWeights').hidden = $('preset').value !== 'custom';
  setMode(u.get('m') === 'need' ? 'need' : 'calc');
}

function toast(msg) {
  const t = $('toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { t.hidden = true; }, 2200);
}

$('preset').addEventListener('change', () => {
  const custom = $('preset').value === 'custom';
  $('customWeights').hidden = !custom;
  if (custom && !$('w-school').value) PARTS.forEach((p) => { $('w-' + p).value = PRESETS[0].weights[p]; });
  render();
});
for (const b of document.querySelectorAll('.tabs button')) b.addEventListener('click', () => setMode(b.dataset.mode));
document.querySelector('.wrap').addEventListener('input', render);
$('unknown').addEventListener('change', render);
$('share').addEventListener('click', async () => {
  const link = toUrl();
  history.replaceState(null, '', link);
  try { await navigator.clipboard.writeText(link); toast('انسخ الرابط، أرسله لمن تبي'); }
  catch { toast('الرابط صار في شريط العنوان، انسخه من هناك'); }
});

fromUrl();
