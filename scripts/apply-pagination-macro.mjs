#!/usr/bin/env node
// 인라인 <div class="eval-result-pagination">...</div> 블록을
// {{ pagination(current=N, total=M) }} 매크로 호출로 치환.
//
// active 페이지 = <button class="page active">N</button> 의 N
// total = 표시된 마지막 페이지 번호 (ellipsis 뒤에 있는 가장 큰 숫자)

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

const BLOCK_RE = /<div class="eval-result-pagination">[\s\S]*?<\/div>\s*<\/div>/g;

function parsePagination(block) {
  // active 페이지 추출
  const activeMatch = block.match(/<button[^>]*class="[^"]*\bactive[^"]*"[^>]*>(\d+)<\/button>/);
  const current = activeMatch ? parseInt(activeMatch[1], 10) : 1;

  // 모든 page 번호 추출 후 최대값 = total
  const allPages = [...block.matchAll(/<button[^>]*class="page[^"]*"[^>]*>(\d+)<\/button>/g)].map((m) =>
    parseInt(m[1], 10)
  );
  if (allPages.length === 0) return null;
  const total = Math.max(...allPages);

  return { current, total };
}

function ensureImport(txt) {
  const importRe = /\{%\s*from\s+"_inc\/components\.html"\s+import\s+([^%]+?)\s*%\}/;
  const m = txt.match(importRe);
  if (m) {
    const names = m[1]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!names.includes('pagination')) {
      names.push('pagination');
      txt = txt.replace(importRe, `{% from "_inc/components.html" import ${names.join(', ')} %}`);
    }
    return txt;
  }
  return txt.replace(/(<html lang="ko">\s*\n)/, '$1{% from "_inc/components.html" import pagination %}\n');
}

function convert(file) {
  const before = readFileSync(file, 'utf8');
  if (!before.includes('class="eval-result-pagination"')) return { file, status: 'skip' };

  let count = 0;
  let failed = 0;
  const after = before.replace(BLOCK_RE, (block) => {
    const parsed = parsePagination(block);
    if (!parsed) {
      failed++;
      return block;
    }
    count++;
    return `{{ pagination(current=${parsed.current}, total=${parsed.total}) }}`;
  });

  if (count === 0) return { file, status: 'no-match', failed };

  const withImport = ensureImport(after);
  writeFileSync(file, withImport);
  return { file, status: 'converted', count, failed };
}

const files = walk(ROOT);
const results = files.map(convert);
const converted = results.filter((r) => r.status === 'converted');

console.log(`검사: ${files.length}개 / 변환: ${converted.length}개`);
for (const r of converted) {
  console.log(`  ✓ ${relative(process.cwd(), r.file)} — ${r.count}개 pagination 변환`);
}

const failed = results.filter((r) => r.failed > 0);
if (failed.length) {
  console.log('\n파싱 실패:');
  for (const r of failed) console.log(`  ! ${relative(process.cwd(), r.file)}`);
}
