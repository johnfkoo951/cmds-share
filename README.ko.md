# CMDS Share

> [🇬🇧 English](README.md) · 🇰🇷 한국어

명령어 하나로 Obsidian 노트를 웹에 공유하고 — 공유한 뒤에도 통제권을 유지하세요.

단순 퍼블리시 플러그인과 달리 CMDS Share는 **거버넌스 우선**입니다: 공유된 노트에는 서버 측 조회수·만료·원클릭 취소(revoke)가 따라붙고, 웹 대시보드에서 내가 올린 모든 것을 한눈에 관리합니다. 렌더링은 Obsidian 자체 파이프라인을 그대로 사용하므로 표·콜아웃·이미지·테마가 볼트에서 보던 모습 그대로 나옵니다.

[CMDSPACE](https://cmdspace.work) 생태계의 일부입니다.

## 기능

- **원커맨드 공유** — `Share current note to web` 실행 → 공개 URL이 클립보드로
- **충실한 렌더링** — Obsidian 실제 렌더러(표·콜아웃·코드·한글) + 사용 중인 테마 CSS
- **공유 페이지 부가기능** — 스크롤스파이 목차 사이드바, 인터랙티브 로컬 그래프(포스 레이아웃·줌/팬·호버 하이라이트), 코드블럭 복사 버튼, 헤딩 딥링크, 다크/라이트 모드. 목차·그래프는 팝업 또는 고정 사이드바(도크)로 전환 가능
- **거버넌스** — 서버 측 레지스트리, 조회수(링크 미리보기 봇 제외), 만료 시 툼스톤 페이지, 삭제 없는 취소/복구, 타 볼트 ID 보호
- **E2E 암호화 (선택)** — 플러그인에서 AES-256-GCM 암호화; 키는 URL 프래그먼트로만 전달되어 서버에 절대 도달하지 않음
- **Obsidian 안의 CMS 뷰** — 전체 공유 목록, 서버와 대사(reconcile)된 실제 조회수, 재공유·취소·삭제
- **웹 대시보드** — 브라우저 어디서든 내 공유 관리
- **5가지 백엔드** — 상황에 맞는 호스팅 선택 (아래 참조)

## 호스팅 옵션

**내 노트는 어느 서버로 가나요?** 설정 → CMDS Share에서 활성화한 프로바이더로 갑니다. 서버 운영 주체와 거버넌스 기능 지원이 다릅니다:

| 프로바이더 | 서버 운영 주체 | 설정 | 조회수/만료/취소 | 대시보드 |
|---|---|---|---|---|
| **CMDSPACE** (기본) | CMDSPACE(관리형) *또는* 본인 인스턴스 | API 토큰 | ✅ 전부 | ✅ |
| Synology NAS | 본인 (WebDAV) | NAS 계정 | ❌ (단순 파일 호스팅) | ❌ |
| GitHub Pages | GitHub (본인 레포) | PAT 토큰 | ❌ | ❌ |
| Supabase | 본인 (본인 프로젝트) | 프로젝트 URL + anon key | ❌ | ❌ |
| Convex | 본인 (본인 배포) | 이 레포의 `convex/` 배포 | 만료만 | ❌ |

### CMDSPACE 프로바이더 — 활성화 전에 꼭 읽어주세요

플러그인 기본값은 **`share.cmdspace.work`**를 가리키는데, 이곳은 **CMDSPACE가 자체 멤버를 위해 운영하는 프라이빗·초대제 인스턴스**입니다. 열린 공용 서비스가 아닙니다:

- **토큰 없이는 사용할 수 없습니다.** 업로드는 인증이 필요하며, 회원가입 절차는 없습니다.
- **토큰을 받고 싶다면** [GitHub 이슈](https://github.com/johnfkoo951/cmds-share/issues)를 `Token request` 제목으로 열어주세요. 초대는 건별·베스트에포트로 판단하며, SLA나 가동률 보장은 없습니다 — 상용 서비스가 아닌 개인 운영 인스턴스입니다.
- **토큰은 인스턴스 전체 권한입니다.** 토큰 하나로 해당 인스턴스의 모든 공유를 조회·관리할 수 있으므로, 인스턴스 하나 = 한 사람(또는 서로 신뢰하는 한 팀)이 기준입니다. 토큰을 타인과 공유하지 마세요.

### 자체 거버넌스 서버 호스팅 (그 외 모든 분께 권장)

서버는 오픈소스입니다: **[cmds-share-server](https://github.com/johnfkoo951/cmds-share-server)** — Vercel + Supabase 위의 작은 Next.js 앱 (무료 티어로 충분). 배포 후 본인의 `CMDS_API_TOKENS`를 설정하고, 플러그인의 **Server URL**을 본인 도메인으로 바꾸면 조회수·만료·취소·대시보드까지 전체 거버넌스 기능을 본인 데이터 완전 통제 하에 사용합니다.

서버 운영 자체가 싫다면 Synology / GitHub Pages / Supabase / Convex 프로바이더를 쓰세요 — 완전 셀프서비스지만 거버넌스 기능은 빠집니다.

## 설치

### Obsidian 커뮤니티 플러그인 (승인 후)

설정 → 커뮤니티 플러그인 → **CMDS Share** 검색 → 설치·활성화.

### 수동 설치

1. 최신 [릴리스](https://github.com/johnfkoo951/cmds-share/releases)에서 `main.js`, `manifest.json`, `styles.css` 다운로드
2. `<볼트>/.obsidian/plugins/cmds-share/`에 배치
3. Obsidian 재시작 후 플러그인 활성화

## 빠른 시작

1. **설정 → CMDS Share** → 프로바이더 선택·인증 정보 입력 (CMDSPACE/자체 서버: Server URL + API 토큰) → **Test connection**
2. 노트 열기 → 커맨드 팔레트 → **Share current note to web**
3. 대화상자에서 암호화/만료 선택 → 공개 URL이 클립보드로 복사됨
4. 같은 노트를 재공유하면 페이지가 갱신되고 **링크는 그대로 유지**

## 명령어

- `Share current note to web` — 활성 노트 공유/갱신
- `Copy share link of current note` — 링크 재복사
- `Delete shared note from server` — 서버에서 삭제
- `Open CMS dashboard` — 볼트 내 관리 뷰
- `Browse all shared notes` — 전체 공유 탐색

## 프라이버시·보안 안내

- **일반 공유**는 공개 웹페이지입니다: 링크를 아는(또는 8자 ID를 맞힌) 누구나 읽을 수 있습니다.
- **암호화 공유**: 업로드 전에 플러그인 안에서 암호화되며, 키는 URL의 `#` 뒤에만 존재합니다(브라우저는 이 부분을 서버로 보내지 않음). 서버는 읽을 수 없는 암호문만 저장합니다. 단, 본문에 삽입된 **이미지는 비암호화로 업로드**됩니다(콘텐츠 해시 주소, 비공개 목록) — 이미지 자체가 민감한 노트에는 암호화 공유를 피하세요. 그래프용 링크·태그 메타데이터는 암호화 공유에서 제외됩니다.
- **조회수**는 근사치입니다: 알려진 봇·링크 미리보기 UA는 제외되며, 거버넌스 서버에서만 집계됩니다.
- 삭제는 레지스트리와 파일을 모두 제거하고, 취소(revoke)는 파일을 유지한 채 HTTP 410을 반환합니다.

## 개발

```bash
npm install
npm run dev     # watch 모드
npm run build   # 타입체크 + 프로덕션 번들
```

관련 레포: [cmds-share-server](https://github.com/johnfkoo951/cmds-share-server) (거버넌스 백엔드).

## 라이선스

MIT © [Yohan Koo (CMDSPACE)](https://cmdspace.work)
