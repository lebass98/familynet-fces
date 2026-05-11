# 한국건강가정진흥원 가족센터 평가시스템 - 퍼블리싱

KRDS(Korea Government Design System) 디자인 시스템 기반의 정적 HTML 퍼블리싱 프로젝트입니다.
Vite 와 Nunjucks 템플릿을 결합하여, **공통 영역(head / header / footer)을 한 곳에서 관리하면서도 최종 산출물은 일반 HTML 파일**로 떨어지도록 구성했습니다.

---

## 목차

- [기술 스택](#기술-스택)
- [사전 요구사항](#사전-요구사항)
- [빠른 시작](#빠른-시작)
- [명령어](#명령어)
- [폴더 구조](#폴더-구조)
- [페이지 작성 규칙](#페이지-작성-규칙)
- [매크로 레퍼런스](#매크로-레퍼런스)
- [파일 명명 규칙](#파일-명명-규칙)
- [자산 경로 규칙](#자산-경로-규칙)
- [CSS / SCSS 관리](#css--scss-관리)
- [빌드 산출물](#빌드-산출물)
- [코드 스타일](#코드-스타일)
- [헬퍼 스크립트](#헬퍼-스크립트)
- [개발 팁 & 트러블슈팅](#개발-팁--트러블슈팅)

---

## 기술 스택

| 항목           | 버전   | 비고                                                  |
| -------------- | ------ | ----------------------------------------------------- |
| Node.js        | 18+    | 권장 LTS                                              |
| Vite           | 5.4.x  | 멀티페이지 빌드 + 개발 서버                           |
| Nunjucks       | 3.2.x  | HTML 템플릿팅 (`{% include %}`, `{% macro %}`)        |
| Sass           | 1.77+  | `modern-compiler` API 사용                            |
| Prettier       | 3.x    | 코드 포매팅                                           |
| KRDS           | —      | 정부 디자인 시스템 (`public/assets/css/krds.min.css`) |
| Pretendard GOV | v1.3.9 | CDN 로드 (`<link>` in head)                           |

---

## 사전 요구사항

- **Node.js** 18 이상 (`node -v`)
- **npm** 9 이상 (`npm -v`)
- 작업용 텍스트 에디터 (VS Code 권장 — `.editorconfig` 자동 적용)

---

## 빠른 시작

```bash
# 1) 의존성 설치
npm install

# 2) 개발 서버 실행 (자동으로 브라우저 오픈)
npm run dev
# → http://localhost:3000

# 3) 운영용 정적 HTML 빌드
npm run build
# → dist/ 디렉터리에 완성 HTML 생성

# 4) 빌드 결과 로컬 미리보기
npm run preview
```

---

## 명령어

| 명령                   | 설명                                                                   |
| ---------------------- | ---------------------------------------------------------------------- |
| `npm run dev`          | 개발 서버 실행. HTML / SCSS / JS / include 파일 저장 시 자동 리로드    |
| `npm run build`        | `dist/` 에 최종 HTML 생성 (Nunjucks include 가 모두 인라인으로 펼쳐짐) |
| `npm run preview`      | `dist/` 결과를 HTTP 서버로 띄워 확인 (절대경로 정상 동작)              |
| `npm run format`       | Prettier 로 SCSS / JS / md / 설정 파일 포매팅 (HTML 제외)              |
| `npm run format:check` | 포매팅 차이만 확인 (CI 용)                                             |

---

## 폴더 구조

```
한국건강가정진흥원_React/
├── public/                          정적 자원 (Vite가 가공하지 않고 그대로 dist로 복사)
│   └── assets/
│       ├── css/                    KRDS 디자인 시스템 CSS (5개)
│       │   ├── krds.min.css
│       │   ├── base.css
│       │   ├── layout.css
│       │   ├── ui.css
│       │   └── contents.css
│       ├── js/
│       │   └── ui.js               KRDS UI 동작 스크립트 (datepicker, GNB, modal 등)
│       └── images/                 svg / png / jpg 자산
│           ├── common/             아이콘 (헤더, 체크박스, 라디오 등)
│           ├── main/               메인 페이지 전용
│           └── sub/                서브 페이지 전용 (stepper icon, pagination icon 등)
│
├── src/                             작업 소스
│   ├── _inc/                       Nunjucks include / macro 모음
│   │   ├── head.html               <head> 영역 공통 (CSS / JS 링크)
│   │   ├── header.html             상단 GNB, 모바일 메뉴
│   │   ├── footer.html             하단 푸터
│   │   └── components.html         재사용 매크로 (datepicker, breadcrumb, pagination, stepper)
│   ├── assets/                     Vite가 번들링하는 소스
│   │   ├── js/
│   │   │   └── main.js             진입점 (style.scss import)
│   │   └── scss/
│   │       ├── style.scss          엔트리
│   │       ├── _reset.scss
│   │       └── _common.scss        커스텀 오버라이드
│   ├── _inc/                       (위와 동일)
│   ├── index.html                  메인 페이지
│   ├── login.html                  로그인 페이지 (헤더의 isLoggedIn=false)
│   ├── assessment/                 자체평가 / 평가관리 / 알림마당 / 마이페이지 서브
│   │   ├── FE_SE_*.html            자체평가 (Self-Evaluation)
│   │   ├── FE_EV_*.html            평가관리 (Evaluation)
│   │   ├── FE_NT_*.html            알림마당 (Notice)
│   │   └── FE_MY_*.html            마이페이지 (My)
│   ├── community/index.html
│   ├── management/index.html
│   └── mypage/index.html
│
├── dist/                            빌드 산출물 (배포 / 개발팀 전달용 — gitignore)
│
├── scripts/                         일회성 마이그레이션 / 유틸 스크립트
│   ├── convert-pages.mjs           기존 인라인 HTML → include 패턴 일괄 변환
│   └── enhance-pages.mjs           pageTitle / currentSection / breadcrumb 자동 적용
│
├── vite.config.js                   Vite 설정 (멀티페이지 + Nunjucks 플러그인)
├── package.json
├── .editorconfig
├── .prettierrc
├── .prettierignore
└── .gitignore
```

> **`public/` vs `src/assets/`**
>
> - `public/assets/` 에 둔 파일은 Vite 가 절대 손대지 않고 `dist/assets/` 로 복사만 합니다. KRDS 미니파이드 CSS 처럼 가공하면 안 되는 파일을 둡니다.
> - `src/assets/scss`, `src/assets/js/main.js` 는 Vite 가 번들링합니다. 커스텀 SCSS / 동적 JS 를 둡니다.

---

## 페이지 작성 규칙

### 새 페이지 추가

서브 페이지는 해당 섹션 폴더(`assessment/`, `community/`, `management/`, `mypage/`) 안에 HTML 파일로 추가합니다.
파일을 만들면 Vite 가 자동으로 빌드 입력에 포함하므로 별도 설정은 필요 없습니다.

### 표준 템플릿

```html
<!DOCTYPE html>
<html lang="ko">
  {% from "_inc/components.html" import datepicker, breadcrumb, pagination, stepper %} {% set pageTitle = "자체평가 -
  평가하기 | 한국건강가정진흥원 평가시스템" %} {% set currentSection = "self-eval" %} {% include "_inc/head.html" %}

  <body>
    {% include "_inc/header.html" %}

    <main id="sub-contents">
      <div class="inner">
        {{ breadcrumb([["홈", "/index.html"], ["자체평가", "#"], ["평가하기"]]) }}

        <h2 class="page-title">평가하기</h2>

        <!-- 페이지 고유 콘텐츠 -->
      </div>
    </main>

    {% include "_inc/footer.html" %}
  </body>
</html>
```

### 페이지 단위 변수

| 변수             | 타입    | 기본값               | 설명                                                                              |
| ---------------- | ------- | -------------------- | --------------------------------------------------------------------------------- |
| `pageTitle`      | string  | `한국건강가정진흥원` | `<title>` 태그에 들어갈 텍스트. SEO / 브라우저 탭 표시                            |
| `currentSection` | string  | _unset_              | GNB 활성화 표시. `self-eval` / `eval-mgmt` / `notice` / `mypage` 중 하나          |
| `isLoggedIn`     | boolean | `true`               | 헤더 우측 영역. `false` 면 로그인 / 회원가입 버튼이 노출 (로그인 페이지에서 사용) |

### include 와 macro 의 차이

|      | include                                      | macro                                                               |
| ---- | -------------------------------------------- | ------------------------------------------------------------------- |
| 정의 | 한 파일을 통째로 삽입                        | 함수처럼 파라미터를 받음                                            |
| 용도 | head / header / footer 처럼 항상 동일한 영역 | datepicker / breadcrumb 처럼 호출 위치마다 내용이 달라지는 컴포넌트 |
| 호출 | `{% include "_inc/header.html" %}`           | `{{ datepicker(title="시작일") }}`                                  |

---

## 매크로 레퍼런스

매크로는 모두 [`src/_inc/components.html`](src/_inc/components.html) 에 정의되어 있습니다. 사용하려면 페이지 상단에 import 가 필요합니다.

```html
{% from "_inc/components.html" import datepicker, breadcrumb, pagination, stepper %}
```

### `datepicker(...)`

KRDS 캘린더 datepicker 한 개를 출력합니다.

| 파라미터      | 타입   | 기본값         | 설명                                                                                 |
| ------------- | ------ | -------------- | ------------------------------------------------------------------------------------ |
| `title`       | string | `"날짜"`       | input 의 `title` 속성. `sronly` 미지정 시 sr-only 텍스트로도 사용 (`"{title} 선택"`) |
| `value`       | string | `""`           | 초기값 (예: `"2026.04.20"`)                                                          |
| `placeholder` | string | `"YYYY.MM.DD"` | input placeholder                                                                    |
| `readonly`    | bool   | `true`         | `false` 면 readonly 속성 제외 (직접 입력 가능)                                       |
| `sronly`      | string | `""`           | 캘린더 버튼의 sr-only 텍스트 커스텀                                                  |
| `style`       | string | `""`           | input 인라인 style (예: `"width:200px"`)                                             |
| `year`        | number | `2026`         | 표시할 연도                                                                          |
| `month`       | number | `4`            | 표시할 월 (1~12)                                                                     |

**예시:**

```html
{# 시작일 ~ 종료일 범위 #}
<div class="date-group">
  {{ datepicker(title="시작일", value="2026.04.20") }}
  <span class="dash">~</span>
  {{ datepicker(title="종료일", value="2026.04.24") }}
</div>

{# 테이블 셀 내부에서 좁게 #} {{ datepicker(placeholder="YYYY-MM-DD", readonly=false, sronly="달력 선택",
style="width:200px;") }}
```

> 캘린더 본체(달력 표)는 4월 레이아웃 기준으로 출력됩니다. 사용자가 다른 달로 이동하면 `ui.js` 가 클릭 시점에 동적으로 갱신하므로 초기 표시만 차이가 있습니다.

### `breadcrumb(items)`

```html
{{ breadcrumb([["홈", "/index.html"], ["자체평가", "#"], ["평가하기"]]) }}
```

- `items` 는 `[라벨, 링크]` 튜플의 배열
- 첫 항목은 자동으로 `class="home"`
- 마지막 항목은 자동으로 `class="current"` (링크는 생략 가능)

### `pagination(current, total)`

```html
{{ pagination(current=3, total=10) }}
```

- 처음 / 이전 / 1..N / 다음 / 마지막 버튼 출력
- 현재 페이지가 1 이면 처음·이전 비활성, total 이면 다음·마지막 비활성

### `stepper(steps, active)`

```html
{{ stepper(["평가선택", "기관운영현황", "평가지표", "총평", "평가완료"], active=2) }}
```

- `steps` 배열 인덱스에 대응하는 step icon (`/assets/images/sub/step-icon-01.svg` ~ `05.svg`) 자동 매핑
- `active` 는 1-base 현재 단계

---

## 파일 명명 규칙

서브 페이지는 도메인 약어 + 일련번호 형식을 사용합니다. 파일명 접두어로 `currentSection` 이 자동 결정됩니다.

| 접두어   | 영역                       | `currentSection` | 예시                                  |
| -------- | -------------------------- | ---------------- | ------------------------------------- |
| `FE_SE_` | 자체평가 (Self-Evaluation) | `self-eval`      | `FE_SE_0001.html` ~ `FE_SE_0024.html` |
| `FE_EV_` | 평가관리 (Evaluation)      | `eval-mgmt`      | `FE_EV_0001.html` ~ `FE_EV_0030.html` |
| `FE_NT_` | 알림마당 (Notice)          | `notice`         | `FE_NT_0001.html` ~ `FE_NT_0014.html` |
| `FE_MY_` | 마이페이지 (My)            | `mypage`         | `FE_MY_0001.html` ~ `FE_MY_0003.html` |

파생 페이지는 `-1`, `-2` 등 하이픈 suffix 로 구분합니다 (예: `FE_SE_0001-1.html`).

---

## 자산 경로 규칙

모든 자산 경로는 **루트 절대경로(`/assets/...`)** 로 작성합니다. Vite 가 빌드 시 페이지 깊이에 맞게 `../assets/...` 등으로 자동 변환합니다.

```html
<!-- 이미지 -->
<img src="/assets/images/icon-logo.svg" alt="로고" />
<img src="/assets/images/sub/step-icon-01.svg" alt="단계 아이콘" />

<!-- CSS / JS (head.html 에서 처리됨) -->
<link href="/assets/css/krds.min.css" rel="stylesheet" />
<script defer src="/assets/js/ui.js"></script>
```

**Don't** ❌

```html
<img src="../images/icon-logo.svg" />
<!-- 페이지 깊이마다 깨짐 -->
<img src="images/icon-logo.svg" />
<!-- 위와 동일 -->
```

**Do** ✅

```html
<img src="/assets/images/icon-logo.svg" />
```

---

## CSS / SCSS 관리

### KRDS 디자인 시스템 (`public/assets/css/*.css`)

원본을 직접 수정해도 동작은 하지만, **권장하지 않습니다**. KRDS 업데이트 시 덮어쓰기 되기 때문입니다.

### 커스텀 스타일 (`src/assets/scss/`)

KRDS 위에 얹는 커스텀 / 오버라이드는 `_common.scss` 에 추가합니다.

```
src/assets/scss/
├── style.scss      엔트리 — @use 로 부분 파일 호출
├── _reset.scss     리셋
└── _common.scss    레이아웃, 컴포넌트 커스텀, 미디어쿼리 오버라이드
```

KRDS 의 특정 규칙을 덮을 때는 `_common.scss` 안에서 같은 선택자 + 우선순위를 맞추거나, 미디어 쿼리로 분기합니다.

### 스타일 로드 순서

`head.html` 에서 다음 순서로 로드됩니다.

```
1. Pretendard GOV (CDN)
2. KRDS:   krds.min → base → layout → ui → contents
3. 커스텀: dist/css/main.css (Vite 가 style.scss 를 컴파일한 결과)
```

커스텀이 마지막에 로드되므로 KRDS 규칙을 덮어쓸 수 있습니다.

---

## 빌드 산출물

`npm run build` 실행 시 다음 구조가 생성됩니다.

```
dist/
├── index.html
├── login.html
├── assessment/
│   ├── FE_SE_0001.html
│   ├── FE_SE_0001-1.html
│   ├── FE_EV_0001.html
│   └── ... (총 78개)
├── community/index.html
├── management/index.html
├── mypage/index.html
├── assets/                  ← public/ 의 복사본
│   ├── css/  (KRDS 5개 그대로)
│   ├── js/ui.js
│   └── images/ (subfolder 구조 유지)
├── css/
│   └── main.css            ← 커스텀 SCSS 컴파일 결과
└── js/
    └── main.js             ← Vite 번들 (HMR 등)
```

**개발팀 전달 시:**

- `dist/` 전체를 압축해서 전달
- `dist/index.html` 을 루트로 보고 통합 (모든 자산 경로가 절대경로 기준)
- 파일 단독 더블클릭(`file://`)으로는 절대경로가 풀리지 않으므로, 미리보기는 HTTP 서버로 (`npm run preview` 또는 정적 서버)

---

## 코드 스타일

### EditorConfig

VS Code / WebStorm 등 대부분의 에디터가 `.editorconfig` 를 자동 인식합니다.

```ini
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true
```

### Prettier

```json
{
  "printWidth": 120,
  "tabWidth": 2,
  "singleQuote": true,
  "trailingComma": "es5",
  "htmlWhitespaceSensitivity": "ignore",
  "overrides": [{ "files": "*.html", "options": { "printWidth": 200 } }]
}
```

- **HTML 은 Prettier 포매팅 대상에서 제외** — Nunjucks 템플릿 문법(`<li{% if %}>` 같은 태그 내 조건문)을 Prettier HTML 파서가 잘못 인식하기 때문. HTML 은 `.editorconfig` 규칙으로만 관리
- 포매팅 대상: SCSS, JS, 스크립트, 루트 설정 파일 (`*.json`, `*.md` 등)
- 적용: `npm run format`
- 차이만 확인: `npm run format:check` (CI 에서 실행)
- 무시 대상은 `.prettierignore` (KRDS minified CSS, ui.js, src.backup 등)

---

## 헬퍼 스크립트

`scripts/` 폴더에는 일회성 마이그레이션 도구가 보관되어 있습니다. 새 KRDS 마크업이 들어와 일괄 변환이 필요할 때 재사용할 수 있습니다.

### `convert-pages.mjs`

```bash
node scripts/convert-pages.mjs
```

- `src/**/*.html` 의 인라인 `<head>` / `<header>` / `<footer>` 를 `{% include %}` 패턴으로 일괄 교체
- `../images/`, `../css/`, `../js/` 상대경로를 `/assets/...` 절대경로로 변환
- 인라인 datepicker 마크업을 `{{ datepicker(...) }}` 매크로 호출로 자동 치환
- 이미 변환된 파일은 자동으로 건너뜀

### `enhance-pages.mjs`

```bash
node scripts/enhance-pages.mjs
```

- 페이지 내 breadcrumb 의 current 항목 또는 `<h2 class="page-title">` 텍스트를 추출하여 `pageTitle` 을 의미있는 값으로 갱신
- 파일명 접두어(`FE_SE`, `FE_EV` 등)를 기반으로 `currentSection` 자동 삽입
- 인라인 breadcrumb 마크업을 `{{ breadcrumb([...]) }}` 매크로 호출로 변환

---

## 개발 팁 & 트러블슈팅

### 헤더 / 푸터 / 매크로 변경이 즉시 안 보일 때

`vite.config.js` 의 `handleHotUpdate` 가 모든 `.html` 변경에 대해 풀 리로드를 트리거합니다. 그래도 반영이 안 되면 브라우저를 강력 새로고침 (`Cmd+Shift+R`) 하세요.

### `dist/` 를 그냥 더블클릭하면 깨져요

`/assets/...` 같은 절대경로는 `file://` 프로토콜에서 해석되지 않습니다. 반드시 HTTP 서버로 열어야 합니다:

```bash
npm run preview
# 또는
npx serve dist
```

### datepicker 가 동작하지 않을 때

- KRDS 의 `ui.js` 가 `DOMContentLoaded` 시 일괄 초기화하는데, 다른 초기화 함수에서 null 참조가 발생하면 체인이 중단됩니다.
- 헤더에 `aria-controls="mobile-nav"` 트리거(`<button class="btn-navi all">전체메뉴</button>`)가 반드시 존재해야 합니다 (이미 `_inc/header.html` 에 포함).
- 브라우저 콘솔에 빨간 에러가 있는지 우선 확인하세요.

### 새 페이지가 빌드에 안 들어가요

`vite.config.js` 가 `glob` 으로 `src/**/*.html` 을 자동 스캔하므로, **`src/` 하위에 `.html` 로 저장만 하면 자동 포함됩니다.** `_inc/` 폴더에 둔 파일은 build input 에서 제외되니, 페이지가 아닌 부분 템플릿은 반드시 `_inc/` 에 두세요.

### KRDS CSS 의 특정 규칙을 덮고 싶어요

원본을 건드리지 말고 `src/assets/scss/_common.scss` 에 같은 선택자 + 더 강한 우선순위로 작성하세요. 로드 순서상 커스텀 CSS 가 KRDS 보다 뒤이므로 자연스럽게 우선합니다.

### Sass `legacy-js-api` 경고가 다시 떠요

`vite.config.js` 의 `css.preprocessorOptions.scss.api` 가 `'modern-compiler'` 로 설정돼 있는지 확인하세요. 이 설정이 없으면 deprecation 경고가 발생합니다.

### 백업 폴더는 뭔가요?

`src.backup/` 은 일괄 변환 작업 직전의 스냅샷입니다. 안정성 확인이 끝났다면 안전하게 삭제할 수 있습니다.

```bash
rm -rf src.backup
```

---

## 라이선스 / 크레딧

- 디자인 시스템: [KRDS](https://www.krds.go.kr)
- 글꼴: [Pretendard GOV](https://github.com/orioncactus/pretendard) (SIL OFL 1.1)
- 본 저장소는 한국건강가정진흥원 가족센터 평가시스템 퍼블리싱 결과물입니다.
