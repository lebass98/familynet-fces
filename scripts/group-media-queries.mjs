#!/usr/bin/env node
// contents.css 안의 @media (screen and ...) 블록을 모두 파일 끝으로 이동.
// 작성 순서는 보존 (cascade override 순서 그대로).
// prefers-reduced-motion 같은 화면 크기 외 미디어쿼리는 건드리지 않음.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const FILE = fileURLToPath(new URL('../public/assets/css/contents.css', import.meta.url));

const src = readFileSync(FILE, 'utf8');

// @media screen ... { ... } 블록을 brace-counting 으로 추출
const blocks = [];
let i = 0;
const out = [];
while (i < src.length) {
  // @media screen 으로 시작하는 위치 찾기
  if (src.startsWith('@media ', i)) {
    const header = src.slice(i).match(/^@media\s+screen[^{]*\{/);
    if (header) {
      // 매칭된 여는 중괄호부터 짝 맞는 닫는 중괄호 찾기
      const openIdx = i + header[0].length - 1; // 여는 { 의 위치
      let depth = 1;
      let j = openIdx + 1;
      while (j < src.length && depth > 0) {
        const ch = src[j];
        if (ch === '{') depth++;
        else if (ch === '}') depth--;
        j++;
      }
      // [i, j) 가 한 @media 블록 (마지막 } 포함)
      blocks.push(src.slice(i, j));
      // 블록 앞에 붙어있는 공백/줄바꿈도 함께 제거 (정돈)
      // 단순히 본문에서 건너뛰기만 함
      i = j;
      // 다음 줄바꿈 한 줄 정도는 흡수
      while (i < src.length && (src[i] === '\n' || src[i] === '\r')) {
        // 첫 줄바꿈 하나만 흡수, 두 줄 연속 줄바꿈이면 빈 줄 유지
        out.push(src[i]);
        i++;
        break;
      }
      continue;
    }
  }
  out.push(src[i]);
  i++;
}

let body = out
  .join('')
  .replace(/\n{3,}/g, '\n\n')
  .trimEnd();

const grouped =
  '\n\n' +
  '/* ============================================\n' +
  '   반응형 (Responsive) 미디어 쿼리\n' +
  '   파일 상단의 모든 @media screen 규칙을 이 곳으로 모음.\n' +
  '   원래 작성 순서를 그대로 유지하여 cascade 동작 보존.\n' +
  '   ============================================ */\n\n' +
  blocks.join('\n\n') +
  '\n';

writeFileSync(FILE, body + grouped);

console.log(`이동한 @media screen 블록: ${blocks.length}개`);
