'use strict';
/**
 * 쇼츠 발행 시간표 계산기
 *  - shorts_schedule.json 을 읽어 "다음 발행 시각"을 한국 시간 기준으로 계산한다.
 *  - 유튜브자동화 엔진에서 require 해서 nextAt() 으로 다음 시각을 받아 쓴다.
 *  - 단독 실행: node schedule.js  → 앞으로 7일 발행 시각 21개 출력
 */
const fs = require('fs');
const path = require('path');

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const KST_OFFSET_MS = 9 * 3600e3; // 한국은 서머타임 없음

function load(file) {
  const cfg = JSON.parse(fs.readFileSync(file || path.join(__dirname, 'shorts_schedule.json'), 'utf8'));
  for (const d of DAYS) {
    const s = cfg.slots[d];
    if (!Array.isArray(s) || s.length !== cfg.perDay) throw new Error(d + ' 요일 시간 개수가 perDay(' + cfg.perDay + ')와 다릅니다');
    s.forEach((t) => { if (!/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(t)) throw new Error(d + ' 시간 형식 오류: ' + t); });
    const sorted = s.slice().sort();
    if (sorted.join() !== s.join()) throw new Error(d + ' 시간이 빠른 순서가 아닙니다');
  }
  return cfg;
}

/** 지금(now) 이후 가장 가까운 발행 시각 (Date, UTC 기준 객체) */
function nextAt(cfg, now) {
  const nowMs = (now || new Date()).getTime();
  const k = new Date(nowMs + KST_OFFSET_MS); // 한국 날짜·요일을 UTC 필드로 읽기 위한 이동
  for (let add = 0; add <= 7; add++) {
    const day = new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate() + add));
    for (const t of cfg.slots[DAYS[day.getUTCDay()]]) {
      const [h, m, s] = t.split(':').map(Number);
      const at = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), h, m, s) - KST_OFFSET_MS;
      if (at > nowMs) return new Date(at);
    }
  }
  throw new Error('다음 발행 시각을 찾지 못했습니다');
}

/** now 이후 n개의 발행 시각 */
function upcoming(cfg, n, now) {
  const out = [];
  let t = now || new Date();
  while (out.length < n) { t = nextAt(cfg, t); out.push(t); }
  return out;
}

function fmtKST(d) {
  const k = new Date(d.getTime() + KST_OFFSET_MS);
  const p = (x) => String(x).padStart(2, '0');
  return k.getUTCFullYear() + '-' + p(k.getUTCMonth() + 1) + '-' + p(k.getUTCDate()) + ' (' + '일월화수목금토'[k.getUTCDay()] + ') '
    + p(k.getUTCHours()) + ':' + p(k.getUTCMinutes()) + ':' + p(k.getUTCSeconds()) + ' KST';
}

module.exports = { load, nextAt, upcoming, fmtKST, DAYS };

if (require.main === module) {
  const cfg = load(process.argv[2]);
  upcoming(cfg, cfg.perDay * 7).forEach((d, i) => console.log(String(i + 1).padStart(2) + '. ' + fmtKST(d)));
}
