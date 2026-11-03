// شغّلها بـ: node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weighted, required, weightsError, round2, PRESETS } from './calc.js';

const SCI = PRESETS.find((p) => p.id === 'sci').weights;
const HUM = PRESETS.find((p) => p.id === 'hum').weights;

test('30/30/40: مثال محسوب باليد', () => {
  // 95×0.3 + 80×0.3 + 85×0.4 = 28.5 + 24 + 34 = 86.5
  const r = weighted({ school: 95, qudrat: 80, tahsili: 85 }, SCI);
  assert.equal(round2(r.total), 86.5);
  assert.equal(round2(r.parts.tahsili), 34);
});

test('درجات كاملة تعطي ١٠٠', () => {
  assert.equal(round2(weighted({ school: 100, qudrat: 100, tahsili: 100 }, SCI).total), 100);
});

test('نظري ٥٠/٥٠ ما يحتاج درجة التحصيلي', () => {
  const r = weighted({ school: 90, qudrat: 70 }, HUM);
  assert.equal(round2(r.total), 80);
  assert.equal(r.parts.tahsili, 0);
});

test('أوزان مجموعها مو ١٠٠ ترجع رسالة خطأ', () => {
  assert.match(weightsError({ school: 30, qudrat: 30, tahsili: 30 }), /100/);
  assert.equal(weightsError(SCI), null);
  assert.throws(() => weighted({ school: 90, qudrat: 90, tahsili: 90 }, { school: 50, qudrat: 50, tahsili: 50 }));
});

test('درجة خارج ٠-١٠٠ أو ناقصة ترمي خطأ', () => {
  assert.throws(() => weighted({ school: 101, qudrat: 80, tahsili: 80 }, SCI));
  assert.throws(() => weighted({ school: 90, qudrat: 80 }, SCI));
  assert.throws(() => weighted({ school: NaN, qudrat: 80, tahsili: 80 }, SCI));
});

test('كم أحتاج في التحصيلي عشان أوصل ٩٠؟', () => {
  // 95×0.3 + 85×0.3 = 54 → (90 - 54) / 0.4 = 90
  const r = required({ school: 95, qudrat: 85 }, SCI, 90, 'tahsili');
  assert.equal(r.status, 'ok');
  assert.equal(round2(r.value), 90);
  // نتأكد بالعكس: لو جاب ٩٠ في التحصيلي تطلع النسبة ٩٠ بالضبط
  assert.equal(round2(weighted({ school: 95, qudrat: 85, tahsili: 90 }, SCI).total), 90);
});

test('هدف مستحيل يحتاج أكثر من ١٠٠', () => {
  const r = required({ school: 60, qudrat: 60 }, SCI, 95, 'tahsili');
  assert.equal(r.status, 'impossible');
  assert.ok(r.value > 100);
});

test('هدف وصلته أصلاً بدون الجزء الناقص', () => {
  const r = required({ school: 100, qudrat: 100 }, SCI, 50, 'tahsili');
  assert.equal(r.status, 'done');
});

test('الجزء اللي وزنه صفر ما ينحسب له شي', () => {
  assert.equal(required({ school: 90, qudrat: 90 }, HUM, 80, 'tahsili').status, 'no-weight');
});
