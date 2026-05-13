#!/usr/bin/env node
// 인라인 <div class="eval-result-search">...</div> 블록을 search_filter / filter_daterange /
// filter_select / filter_select_keyword 매크로 호출로 치환.

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

// 한 search-item 안의 구성 요소를 파싱
function parseSearchItem(item) {
  const labelMatch = item.match(/<span class="label">([^<]+)<\/span>/);
  const label = labelMatch ? labelMatch[1].trim() : '';

  const hasDategroup = /<div class="date-group">/.test(item);
  const hasSelect = /<div class="select-box">/.test(item);
  const hasKeyword = /<div class="search-keyword">/.test(item);

  if (hasDategroup) {
    // datepicker 매크로 호출에서 value 추출
    const values = [...item.matchAll(/datepicker\([^)]*value="([^"]+)"[^)]*\)/g)].map((m) => m[1]);
    return {
      type: 'daterange',
      label,
      start: values[0] || '2026.04.20',
      end: values[1] || '2026.04.24',
    };
  }
  if (hasSelect) {
    const options = [...item.matchAll(/<option[^>]*>([^<]+)<\/option>/g)].map((m) => m[1].trim());
    if (hasKeyword) {
      const phMatch = item.match(/<input[^>]*placeholder="([^"]+)"/);
      return {
        type: 'select_keyword',
        label,
        options,
        placeholder: phMatch ? phMatch[1] : '검색어를 입력해주세요.',
      };
    }
    return { type: 'select', label, options };
  }
  return null;
}

const escStr = (s) => s.replace(/"/g, '\\"');
const fmtArr = (arr) => '[' + arr.map((s) => `"${escStr(s)}"`).join(', ') + ']';

function buildMacroCall(item, indent) {
  if (item.type === 'daterange') {
    return `${indent}{{ filter_daterange("${escStr(item.label)}", "${item.start}", "${item.end}") }}`;
  }
  if (item.type === 'select') {
    return `${indent}{{ filter_select("${escStr(item.label)}", ${fmtArr(item.options)}) }}`;
  }
  if (item.type === 'select_keyword') {
    const defaultPh = '검색어를 입력해주세요.';
    const phArg = item.placeholder === defaultPh ? '' : `, "${escStr(item.placeholder)}"`;
    return `${indent}{{ filter_select_keyword("${escStr(item.label)}", ${fmtArr(item.options)}${phArg}) }}`;
  }
  return null;
}

// 전체 eval-result-search 블록을 잡는 정규식 - 내부 div 균형은 어렵기 때문에 한 블록씩 자르려면 다른 방법 필요
function findSearchBlocks(txt) {
  const blocks = [];
  const re = /<div class="eval-result-search">/g;
  let m;
  while ((m = re.exec(txt)) !== null) {
    const start = m.index;
    const openLen = m[0].length;
    let i = start + openLen;
    let depth = 1;
    while (i < txt.length && depth > 0) {
      // 다음 <div 또는 </div 찾기
      const nextOpen = txt.indexOf('<div', i);
      const nextClose = txt.indexOf('</div>', i);
      if (nextClose === -1) break;
      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth++;
        i = nextOpen + 4;
      } else {
        depth--;
        i = nextClose + 6;
      }
    }
    blocks.push({ start, end: i });
  }
  return blocks;
}

function findSearchItems(blockTxt) {
  const items = [];
  const re = /<div class="search-item">/g;
  let m;
  while ((m = re.exec(blockTxt)) !== null) {
    const start = m.index;
    const openLen = m[0].length;
    let i = start + openLen;
    let depth = 1;
    while (i < blockTxt.length && depth > 0) {
      const nextOpen = blockTxt.indexOf('<div', i);
      const nextClose = blockTxt.indexOf('</div>', i);
      if (nextClose === -1) break;
      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth++;
        i = nextOpen + 4;
      } else {
        depth--;
        i = nextClose + 6;
      }
    }
    items.push({ start, end: i, html: blockTxt.slice(start, i) });
  }
  return items;
}

function ensureImport(txt) {
  const importRe = /\{%\s*from\s+"_inc\/components\.html"\s+import\s+([^%]+?)\s*%\}/;
  const m = txt.match(importRe);
  const needed = ['search_filter', 'filter_daterange', 'filter_select', 'filter_select_keyword'];
  if (m) {
    const names = m[1]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    let changed = false;
    for (const name of needed) {
      if (!names.includes(name)) {
        names.push(name);
        changed = true;
      }
    }
    if (changed) {
      txt = txt.replace(importRe, `{% from "_inc/components.html" import ${names.join(', ')} %}`);
    }
    return txt;
  }
  return txt.replace(/(<html lang="ko">\s*\n)/, `$1{% from "_inc/components.html" import ${needed.join(', ')} %}\n`);
}

function convert(file) {
  let txt = readFileSync(file, 'utf8');
  const blocks = findSearchBlocks(txt);
  if (blocks.length === 0) return { file, status: 'skip' };

  // 뒤에서부터 치환해야 인덱스 안 깨짐
  let count = 0;
  for (let bi = blocks.length - 1; bi >= 0; bi--) {
    const { start, end } = blocks[bi];
    const blockTxt = txt.slice(start, end);
    const items = findSearchItems(blockTxt);
    if (items.length === 0) continue;

    // 들여쓰기 추정 (start 앞 줄에서 추출)
    const lineStart = txt.lastIndexOf('\n', start - 1) + 1;
    const baseIndent = txt.slice(lineStart, start).match(/^\s*/)[0];
    const itemIndent = baseIndent + '  ';

    const parsed = items.map((it) => parseSearchItem(it.html)).filter(Boolean);
    if (parsed.length !== items.length) continue; // 일부 파싱 실패 시 안전을 위해 건너뜀

    const callLines = parsed.map((p) => buildMacroCall(p, itemIndent));
    const replacement =
      `${baseIndent}{% call search_filter() %}\n` + callLines.join('\n') + `\n${baseIndent}{% endcall %}`;

    txt = txt.slice(0, start) + replacement + txt.slice(end);
    count++;
  }

  if (count === 0) return { file, status: 'no-match' };
  txt = ensureImport(txt);
  writeFileSync(file, txt);
  return { file, status: 'converted', count };
}

const files = walk(ROOT);
const results = files.map(convert);
const converted = results.filter((r) => r.status === 'converted');

console.log(`검사: ${files.length}개 / 변환: ${converted.length}개`);
for (const r of converted) {
  console.log(`  ✓ ${relative(process.cwd(), r.file)} — ${r.count}개 search 블록 변환`);
}
