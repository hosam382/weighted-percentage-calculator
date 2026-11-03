// حساب النسبة الموزونة للقبول في الجامعات السعودية
// كل الدوال هنا "نقية": ما تلمس الصفحة، فسهل نختبرها (calc.test.js)

export const PARTS = ['school', 'qudrat', 'tahsili'];

export const LABELS = { school: 'الثانوية', qudrat: 'القدرات', tahsili: 'التحصيلي' };

// صيغ شائعة وليست رسمية: كل جامعة تعلن أوزانها في دليل القبول، وتتغير من سنة لسنة
export const PRESETS = [
  { id: 'sci', label: 'علمي وصحي وهندسي', weights: { school: 30, qudrat: 30, tahsili: 40 } },
  { id: 'hum', label: 'نظري وإداري', weights: { school: 50, qudrat: 50, tahsili: 0 } },
];

export const round2 = (n) => Math.round(n * 100) / 100;

export function isScore(x) {
  return typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= 100;
}

export function weightsError(w) {
  for (const p of PARTS) {
    if (!isScore(w[p])) return `وزن ${LABELS[p]} لازم يكون بين 0 و100`;
  }
  const sum = PARTS.reduce((s, p) => s + w[p], 0);
  if (Math.abs(sum - 100) > 1e-9) return `مجموع الأوزان لازم يكون 100 (الحين ${round2(sum)})`;
  return null;
}

// النسبة الموزونة = مجموع (الدرجة × الوزن ÷ ١٠٠). الجزء اللي وزنه صفر ما يحتاج درجة
export function weighted(scores, weights) {
  const err = weightsError(weights);
  if (err) throw new Error(err);
  const parts = {};
  let total = 0;
  for (const p of PARTS) {
    if (weights[p] === 0) { parts[p] = 0; continue; }
    if (!isScore(scores[p])) throw new Error(`درجة ${LABELS[p]} لازم تكون بين 0 و100`);
    parts[p] = (scores[p] * weights[p]) / 100;
    total += parts[p];
  }
  return { total, parts };
}

// كم تحتاج في جزء واحد (unknown) عشان توصل نسبة موزونة معيّنة (target)؟
// status: ok = تحتاج value | done = وصلت الهدف بدونه | impossible = يحتاج أكثر من 100 | no-weight = وزنه صفر
export function required(scores, weights, target, unknown) {
  const err = weightsError(weights);
  if (err) throw new Error(err);
  if (!PARTS.includes(unknown)) throw new Error('اختر الجزء اللي تبي تعرف كم تحتاج فيه');
  if (!isScore(target)) throw new Error('النسبة المطلوبة لازم تكون بين 0 و100');
  if (weights[unknown] === 0) return { status: 'no-weight', value: null };
  let known = 0;
  for (const p of PARTS) {
    if (p === unknown || weights[p] === 0) continue;
    if (!isScore(scores[p])) throw new Error(`درجة ${LABELS[p]} لازم تكون بين 0 و100`);
    known += (scores[p] * weights[p]) / 100;
  }
  const value = ((target - known) * 100) / weights[unknown];
  if (value <= 0) return { status: 'done', value: 0 };
  if (value > 100 + 1e-9) return { status: 'impossible', value };
  return { status: 'ok', value };
}
