#!/usr/bin/env node
// 인라인으로 작성된 <div class="stepper-wrap"><ol class="stepper">...</ol></div> 블록을
// {{ stepper([라벨...], active=N) }} 매크로 호출로 치환.
//
// 각 파일의 stepper 안에서:
//   - <dl class="active"> 또는 <dl class="complete"> 의 위치로 active 단계 추정
//   - <dd> 텍스트로 step 라벨 추출
// 추출 실패 시 해당 stepper 는 건너뜀.

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

const STEPPER_RE = /<div class="stepper-wrap">\s*<ol class="stepper">([\s\S]*?)<\/ol>\s*<\/div>/g;

function parseStepper(block) {
  const liRe = /<li>\s*<dl([^>]*)>[\s\S]*?<dd>([^<]+)<\/dd>\s*<\/dl>\s*<\/li>/g;
  const steps = [];
  let active = 0;
  let m;
  let i = 0;
  while ((m = liRe.exec(block)) !== null) {
    i++;
    const dlAttr = m[1] || '';
    const label = m[2].trim();
    steps.push(label);
    if (/class="[^"]*\bactive\b/.test(dlAttr) && active === 0) active = i;
  }
  if (active === 0) active = 1; // 기본값
  return steps.length > 0 ? { steps, active } : null;
}

function ensureImport(txt) {
  const importRe = /\{%\s*from\s+"_inc\/components\.html"\s+import\s+([^%]+?)\s*%\}/;
  const m = txt.match(importRe);
  if (m) {
    const names = m[1]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!names.includes('stepper')) {
      names.push('stepper');
      txt = txt.replace(importRe, `{% from "_inc/components.html" import ${names.join(', ')} %}`);
    }
    return txt;
  }
  // import 자체가 없으면 html 태그 직후에 추가
  return txt.replace(/(<html lang="ko">\s*\n)/, '$1{% from "_inc/components.html" import stepper %}\n');
}

function convert(file) {
  const before = readFileSync(file, 'utf8');
  if (!before.includes('class="stepper-wrap"')) return { file, status: 'skip-no-stepper' };

  let count = 0;
  let parseFailed = 0;
  const after = before.replace(STEPPER_RE, (_, body) => {
    const parsed = parseStepper(`<ol>${body}</ol>`);
    if (!parsed) {
      parseFailed++;
      return _; // 원본 유지
    }
    count++;
    const labels = parsed.steps.map((s) => `"${s.replace(/"/g, '\\"')}"`).join(', ');
    return `{{ stepper([${labels}], active=${parsed.active}) }}`;
  });

  if (count === 0) return { file, status: 'skip-no-match', parseFailed };

  const withImport = ensureImport(after);
  writeFileSync(file, withImport);
  return { file, status: 'converted', count, parseFailed };
}

const files = walk(ROOT);
const results = files.map(convert);
const converted = results.filter((r) => r.status === 'converted');

console.log(`검사: ${files.length}개 / 변환: ${converted.length}개`);
for (const r of converted) {
  console.log(`  ✓ ${relative(process.cwd(), r.file)} — ${r.count}개 stepper 변환`);
}

const failed = results.filter((r) => r.parseFailed > 0);
if (failed.length) {
  console.log('\n파싱 실패 (수동 점검 필요):');
  for (const r of failed) console.log(`  ! ${relative(process.cwd(), r.file)}`);
}
