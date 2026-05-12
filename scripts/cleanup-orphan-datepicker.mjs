#!/usr/bin/env node
// 이전 일괄 변환 스크립트의 부정확한 정규식 때문에 생긴 datepicker 고아 마크업 제거.
//
// 증상: 페이지 안에 {{ datepicker(...) }} 매크로 호출은 들어갔지만,
//       그 직후에 잘려나가야 할 캘린더 내부 HTML (btn-cal-move next 버튼,
//       <div class="calendar-body">, <div class="calendar-footer">, 닫힘 div 3개)
//       이 남아있음.
//
// 동작: 각 매크로 호출 뒤에 이 패턴이 보이면 통째로 삭제.

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../src', import.meta.url));

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name === '_inc') continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (extname(p) === '.html') out.push(p);
  }
  return out;
}

// 고아 패턴: <button ... btn-cal-move next ...>...</button>
//          </div>
//          <div class="calendar-body"> ... </tbody></table></div></div>
//          <div class="calendar-footer"> ... </div></div>
//          </div> </div> </div>  (orphan closes for calendar-wrap, krds-calendar-area, calendar-conts)
const ORPHAN_RE =
  /(\{\{\s*datepicker\([^)]*\)\s*\}\})\s*\n\s*<button[^>]*\bbtn-cal-move\s+next\b[^>]*>[\s\S]*?<\/button>\s*<\/div>\s*<div class="calendar-body">[\s\S]*?<\/tbody>\s*<\/table>\s*<\/div>\s*<\/div>\s*<div class="calendar-footer">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/g;

function clean(file) {
  const before = readFileSync(file, 'utf8');
  const bodyCountBefore = (before.match(/class="calendar-body"/g) || []).length;
  if (bodyCountBefore === 0) return { file, status: 'skip' };

  const after = before.replace(ORPHAN_RE, '$1');
  const bodyCountAfter = (after.match(/class="calendar-body"/g) || []).length;
  const removed = bodyCountBefore - bodyCountAfter;

  if (after === before) return { file, status: 'no-match', bodyCountBefore };

  writeFileSync(file, after);
  return { file, status: 'cleaned', removed, bodyCountAfter };
}

const files = walk(ROOT);
const results = files.map(clean);

const cleaned = results.filter((r) => r.status === 'cleaned');
const noMatch = results.filter((r) => r.status === 'no-match');

console.log(`검사 파일: ${files.length}개`);
console.log(`- 정리 완료: ${cleaned.length}개`);
console.log(`- 매치 안됨(고아 있으나 패턴 다름): ${noMatch.length}개`);

for (const r of cleaned) {
  console.log(`  ✓ ${relative(process.cwd(), r.file)} — 고아 ${r.removed}개 제거 (남은 calendar-body: ${r.bodyCountAfter})`);
}
for (const r of noMatch) {
  console.log(`  ! ${relative(process.cwd(), r.file)} — calendar-body ${r.bodyCountBefore}개 잔존 (수동 점검 필요)`);
}
