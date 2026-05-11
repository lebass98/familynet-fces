#!/usr/bin/env node
// 변환된 페이지에 의미있는 pageTitle / currentSection / breadcrumb macro 적용.
// 1. 페이지 내 breadcrumb current 또는 <h2 class="page-title"> 텍스트로 pageTitle 갱신
// 2. 파일코드 접두어 기반으로 currentSection 자동 설정
//      FE_SE_* → self-eval,  FE_EV_* → eval-mgmt,  FE_NT_* → notice,  FE_MY_* → mypage
// 3. 인라인 <nav class="krds-breadcrumb-wrap"> 블록을 {{ breadcrumb([...]) }} 매크로로 교체

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, basename, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../src', import.meta.url));

const SECTION_BY_PREFIX = {
  FE_SE: 'self-eval',
  FE_EV: 'eval-mgmt',
  FE_NT: 'notice',
  FE_MY: 'mypage',
};

const SECTION_LABEL = {
  'self-eval': '자체평가',
  'eval-mgmt': '평가관리',
  notice: '알림마당',
  mypage: '마이페이지',
};

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

function getSectionFor(file) {
  const name = basename(file, '.html');
  const prefix = name.slice(0, 5);
  return SECTION_BY_PREFIX[prefix] || null;
}

// breadcrumb의 current 또는 page-title h2 텍스트 추출
function extractPageLabel(html) {
  const current = html.match(/<li class="current">\s*<a[^>]*>([^<]+)<\/a>/);
  if (current) return current[1].trim();
  const h2 = html.match(/<h2 class="page-title"[^>]*>([^<]+)<\/h2>/);
  if (h2) return h2[1].trim();
  return null;
}

// breadcrumb <nav>...</nav> 블록을 매크로 호출로 교체
function replaceBreadcrumb(html) {
  const navRe = /[ \t]*<nav class="krds-breadcrumb-wrap"[\s\S]*?<\/nav>/;
  const match = html.match(navRe);
  if (!match) return { html, replaced: false };

  const block = match[0];
  const items = [];
  const liRe = /<li([^>]*)>\s*<a[^>]*(?:href="([^"]*)")?[^>]*>([^<]+)<\/a>/g;
  let m;
  while ((m = liRe.exec(block)) !== null) {
    const classAttr = m[1] || '';
    const href = m[2] || '';
    const text = m[3].trim();
    const isCurrent = /class="[^"]*current/.test(classAttr);
    if (isCurrent || !href) items.push(`["${text}"]`);
    else items.push(`["${text}", "${href}"]`);
  }
  if (items.length === 0) return { html, replaced: false };

  const macroCall = `      {{ breadcrumb([${items.join(', ')}]) }}`;
  return { html: html.replace(navRe, macroCall), replaced: true };
}

function enhance(file) {
  let txt = readFileSync(file, 'utf8');
  if (!txt.includes('{% include "_inc/head.html" %}')) {
    return { file, status: 'skip-not-converted' };
  }

  const section = getSectionFor(file);
  const pageLabel = extractPageLabel(txt);
  const sectionLabel = section ? SECTION_LABEL[section] : null;

  // pageTitle 갱신
  let newTitle;
  if (pageLabel && sectionLabel) newTitle = `${sectionLabel} - ${pageLabel} | 한국건강가정진흥원 평가시스템`;
  else if (pageLabel) newTitle = `${pageLabel} | 한국건강가정진흥원 평가시스템`;
  else if (sectionLabel) newTitle = `${sectionLabel} | 한국건강가정진흥원 평가시스템`;
  else newTitle = null;

  if (newTitle) {
    txt = txt.replace(/\{% set pageTitle = "[^"]*" %\}/, `{% set pageTitle = "${newTitle}" %}`);
  }

  // currentSection 삽입
  if (section && !txt.includes('{% set currentSection')) {
    txt = txt.replace(/(\{% set pageTitle = "[^"]*" %\}\n)/, `$1{% set currentSection = "${section}" %}\n`);
  }

  // breadcrumb 매크로 변환
  const { html: txtWithBc, replaced } = replaceBreadcrumb(txt);
  txt = txtWithBc;

  // 매크로 import 갱신 (datepicker 이미 있으면 breadcrumb 추가)
  const importRe = /\{% from "_inc\/components\.html" import ([^%]+) %\}/;
  const importMatch = txt.match(importRe);
  if (replaced) {
    if (importMatch) {
      const names = importMatch[1]
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (!names.includes('breadcrumb')) {
        names.push('breadcrumb');
        txt = txt.replace(importRe, `{% from "_inc/components.html" import ${names.join(', ')} %}`);
      }
    } else {
      txt = txt.replace(/(<html lang="ko">\n)/, '$1{% from "_inc/components.html" import breadcrumb %}\n');
    }
  }

  writeFileSync(file, txt);
  return { file, status: 'enhanced', section, pageLabel, breadcrumbReplaced: replaced };
}

const files = walk(ROOT);
const results = files.map(enhance);

const enhanced = results.filter((r) => r.status === 'enhanced');
const skipped = results.filter((r) => r.status !== 'enhanced');
const withBc = enhanced.filter((r) => r.breadcrumbReplaced);

console.log(`총 ${files.length}개 파일 검사`);
console.log(`- 처리: ${enhanced.length}개`);
console.log(`- 건너뜀: ${skipped.length}개`);
console.log(`- breadcrumb 매크로 변환: ${withBc.length}개`);
console.log(`- pageTitle 추출 성공: ${enhanced.filter((r) => r.pageLabel).length}개`);
console.log(`- section 지정: ${enhanced.filter((r) => r.section).length}개`);

const noLabel = enhanced.filter((r) => !r.pageLabel);
if (noLabel.length) {
  console.log('\n페이지 라벨 추출 실패 (breadcrumb/page-title 둘 다 없음):');
  for (const r of noLabel.slice(0, 20)) console.log(`  ${relative(process.cwd(), r.file)}`);
  if (noLabel.length > 20) console.log(`  ... ${noLabel.length - 20}개 더`);
}
