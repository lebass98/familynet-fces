#!/usr/bin/env node
// 모든 src/**/*.html 파일을 Nunjucks include 패턴으로 일괄 변환.
// 1. <head>...</head>          → {% include "_inc/head.html" %} + pageTitle
// 2. <header id="krds-header">... → {% include "_inc/header.html" %}
// 3. <footer id="footer">...   → {% include "_inc/footer.html" %}
// 4. ../images/, ../css/, ../js/ → /assets/...
// 5. 인라인 datepicker → {{ datepicker(...) }}
//
// 이미 변환된 파일(includes 사용 중)은 건너뜀.

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, basename, extname, relative } from 'node:path';
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

const DATEPICKER_RE = /<div class="calendar-conts">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g;

function extractDatepickerArgs(block) {
  const value = block.match(/value="([^"]*)"/)?.[1] ?? '';
  const placeholder = block.match(/placeholder="([^"]*)"/)?.[1] ?? 'YYYY.MM.DD';
  const title = block.match(/<input[^>]*\btitle="([^"]*)"/)?.[1] ?? '';
  const readonly = /\breadonly\b/.test(block);
  const sronly = block.match(/<span class="sr-only">([^<]*)<\/span>/)?.[1] ?? '';
  const expectedSronly = title ? `${title} 선택` : '';

  const args = [];
  if (title) args.push(`title="${title}"`);
  if (value) args.push(`value="${value}"`);
  if (placeholder && placeholder !== 'YYYY.MM.DD') args.push(`placeholder="${placeholder}"`);
  if (!readonly) args.push('readonly=false');
  if (sronly && sronly !== expectedSronly) args.push(`sronly="${sronly}"`);
  return args.join(', ');
}

function convert(file) {
  let txt = readFileSync(file, 'utf8');
  const name = basename(file, '.html');

  if (txt.includes('{% include "_inc/head.html" %}')) {
    return { file, status: 'skip' };
  }
  if (!txt.includes('<head>') || !txt.includes('id="krds-header"')) {
    return { file, status: 'no-match' };
  }

  // 1. <head>...</head>
  const titleMatch = txt.match(/<title>([^<]+)<\/title>/);
  const origTitle = titleMatch ? titleMatch[1].trim() : '한국건강가정진흥원';
  const pageTitle = `${name} | ${origTitle.replace(/^한국건강가정진흥원\s*/, '').trim() || '한국건강가정진흥원'}`;

  txt = txt.replace(
    /<head>[\s\S]*?<\/head>/,
    `{% set pageTitle = "${pageTitle}" %}\n{% include "_inc/head.html" %}`
  );

  // 2. <header id="krds-header">...</header>
  txt = txt.replace(
    /[ \t]*<header id="krds-header">[\s\S]*?<\/header>/,
    '  {% include "_inc/header.html" %}'
  );

  // 3. <footer id="footer">...</footer>
  txt = txt.replace(
    /[ \t]*<footer id="footer">[\s\S]*?<\/footer>/,
    '  {% include "_inc/footer.html" %}'
  );

  // 4. ../images/, ../css/, ../js/ → /assets/...
  txt = txt.replace(/(["'])\.\.\/images\//g, '$1/assets/images/');
  txt = txt.replace(/(["'])\.\.\/css\//g, '$1/assets/css/');
  txt = txt.replace(/(["'])\.\.\/js\//g, '$1/assets/js/');

  // 5. datepicker macro
  const datepickers = txt.match(DATEPICKER_RE) || [];
  let hasDatepicker = false;
  if (datepickers.length > 0) {
    hasDatepicker = true;
    txt = txt.replace(DATEPICKER_RE, (block) => {
      const args = extractDatepickerArgs(block);
      return `{{ datepicker(${args}) }}`;
    });
  }

  // macro import 추가 (datepicker 사용하는 경우만)
  if (hasDatepicker && !txt.includes('import datepicker')) {
    txt = txt.replace(
      /(<html lang="ko">\n)/,
      '$1{% from "_inc/components.html" import datepicker %}\n'
    );
  }

  writeFileSync(file, txt);
  return { file, status: 'converted', datepickers: datepickers.length };
}

const files = walk(ROOT);
const results = files.map(convert);

const grouped = { converted: [], skip: [], 'no-match': [] };
for (const r of results) grouped[r.status].push(r);

console.log(`총 ${files.length}개 파일 검사`);
console.log(`- 변환: ${grouped.converted.length}개`);
console.log(`- 건너뜀(이미 변환): ${grouped.skip.length}개`);
console.log(`- 매치 안됨: ${grouped['no-match'].length}개`);

const withDp = grouped.converted.filter((r) => r.datepickers > 0);
if (withDp.length) {
  console.log(`\ndatepicker 매크로 적용 (${withDp.length}개 파일):`);
  for (const r of withDp) console.log(`  ${relative(process.cwd(), r.file)} (${r.datepickers}개)`);
}

if (grouped['no-match'].length) {
  console.log('\n매치 안된 파일:');
  for (const r of grouped['no-match']) console.log(`  ${relative(process.cwd(), r.file)}`);
}
