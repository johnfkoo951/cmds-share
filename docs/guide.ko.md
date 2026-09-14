# CMDS Share 사용설명서
노트를 읽기 좋은 웹페이지로 발행하고, 선택한 호스트가 제공하는 범위 안에서 관리합니다.

## 배포 상태와 준비물
**2026-09-14**에 로컬 소스와 공개 릴리스를 확인한 **2.1.1** 기준입니다. 릴리스에는 `main.js`, `manifest.json`, `styles.css`가 있으며 Community Plugins 목록에도 등록되어 있습니다. 목록에는 Obsidian 직원의 수동 검토를 받지 않았다는 고지가 있습니다.
- **Obsidian 1.7.2 이상**. manifest는 데스크톱과 모바일을 허용하지만 이 설명서 작업에서 모바일 실기 검증을 하지는 않았습니다.
- 인터넷과 선택한 호스트의 계정/토큰. 기본 호스트는 관리형 CMDSPACE 서버가 아니라 **GitHub Pages**입니다.
- 노트, 원본 Markdown, 이미지, 메타데이터, 테마 자산을 공개할 권한. 비민감 예제를 따로 준비합니다.
- 플러그인은 MIT 라이선스입니다. 호스팅 요금, 한도, 저장과 전송 비용은 별도이며 바뀔 수 있습니다.

## 설치
**설정 → 커뮤니티 플러그인 → 탐색 → CMDS Share → 설치 → 활성화**를 사용합니다. 커뮤니티 플러그인 권한 안내를 먼저 확인합니다.
수동 설치는 [2.1.1 릴리스](https://github.com/johnfkoo951/cmds-share/releases/tag/2.1.1)의 파일 3종을 `<vault>/.obsidian/plugins/cmds-share/`에 넣고 Obsidian을 다시 로드한 뒤 활성화합니다. 기존 `data.json`은 비공개로 보존합니다.

## 먼저 호스트를 고릅니다
백엔드는 발행할 노트를 받아 보관하고 웹에 제공하는 서비스입니다. 백엔드 선택만으로 계정이나 부가 기능이 생기지는 않습니다.

| 제공업체 | 준비할 것 | 서버 목록/조회수/철회 | 서버가 강제하는 만료 | 웹 대시보드 |
|---|---|---|---|---|
| GitHub Pages 기본값 | 본인 GitHub 토큰과 저장소 | 없음 | 없음 | 없음 |
| CMDSPACE | 초대 토큰 또는 직접 운영하는 호환 서버 | 있음 | 있음 | 있음 |
| Synology NAS | WebDAV 인증과 공개 URL | 없음 | 없음 | 없음 |
| Supabase | 프로젝트 URL, anon 키, 공개 버킷과 정책 | 없음 | 없음 | 없음 |
| Convex | 별도 배포한 호환 백엔드와 URL | 거버넌스 목록 없음 | 호환 백엔드에서 지원 | 거버넌스 대시보드 없음 |

정적 호스트의 업로드/삭제는 거버넌스 서버의 철회/복구와 다릅니다. 정적 페이지의 카운트다운이나 만료 메타데이터는 **접근 차단이 아닙니다**. 만료 강제가 필요하다면 거버넌스 서버를 고르며 GitHub Pages에서 보장한다고 안내하지 않습니다.

## 첫 성공: 공개 GitHub Pages 예제
**공개 저장소를 만들거나 사용하고 콘텐츠를 발행하는 절차입니다. 개인 노트를 테스트에 사용하지 않습니다.** Pages가 준비되기 전에도 공개 저장소의 파일은 GitHub에서 보일 수 있습니다.
1. GitHub 설정에서 개인 액세스 토큰을 만듭니다. 간편 설정 흐름은 `repo` 권한의 classic 토큰을 안내합니다. 광범위한 권한이므로 범위를 이해하고 비공개로 보관하며 노출 시 폐기합니다. Fine-grained 토큰은 저장소/Pages 권한을 별도로 맞춰야 하며 자동 생성의 무조건적인 대체재는 아닙니다.
2. **설정 → CMDS Share → Active provider → GitHub Pages**인지 확인합니다.
3. **Personal access token**에 토큰을 넣고 **Repository** 이름(기본 `obsidian-shared-notes`)을 확인합니다.
4. **Set up repository**를 누릅니다. 공개 저장소 생성, `.nojekyll` 추가, Pages 활성화, URL 기록이 일어날 수 있으므로 소유자와 저장소를 먼저 확인합니다.
5. **Test connection**을 실행합니다. 첫 시험에서는 고급 브랜치/경로/도메인을 기본값으로 둡니다.
6. 예제 제목, 문장, 공개 가능한 이미지로 노트를 만들고 **Share current note to web**를 실행합니다.
7. 암호화/만료 옵션을 확인해 발행하고 복사된 URL을 엽니다. GitHub Pages 빌드가 필요하므로 즉시 또는 30초 이내 공개를 보장하지 않습니다.
8. 로그아웃한 브라우저에서 렌더링과 **Markdown 복사/다운로드**를 확인합니다. 원본 Markdown도 공유물에 포함됩니다.
9. 예제를 수정하고 다시 공유해 같은 링크에서 호스트 처리 후 새 내용이 보이는지 확인합니다.
업로드 성공 직후 Pages가 안 열린다고 곧바로 업로드 실패는 아닙니다. 반복 발행 전에 저장소의 Pages 배포 상태를 확인합니다.

## 관리형 또는 자체 거버넌스
CMDSPACE 선택 시 기본 주소는 `https://share.cmdspace.work`입니다. **초대제 개인/팀 인스턴스**이며 공개 가입형 호스팅 서비스가 아닙니다. 토큰이 필요하고 가동시간/SLA를 보장하지 않습니다. [이슈 트래커](https://github.com/johnfkoo951/cmds-share/issues)에 문의할 수 있지만 토큰과 개인 내용을 게시하면 안 됩니다.
인스턴스 토큰은 해당 서버의 모든 공유물을 조회하고 관리할 수 있습니다. 노트 하나의 암호가 아닌 팀 전체 관리 자격증명으로 취급합니다. 한 사람 또는 서로 신뢰하는 팀 단위로 운영합니다.
자체 서버는 [cmds-share-server](https://github.com/johnfkoo951/cmds-share-server)를 따라 별도로 배포하고 플러그인에 **Server URL**, **API token**을 넣습니다. 평범한 버킷 주소를 바꾼다고 거버넌스 서버가 되지는 않습니다.
거버넌스 CMS는 로컬 기록과 서버 목록을 대조해 조회수, 철회, 고아 기록 등을 보여줍니다. 알려진 링크 미리보기 봇을 제외하지만 조회수는 실제 사람 수의 정확한 측정값이 아닙니다.

## 명령어 사전
Ctrl/Cmd+P에서 CMDS Share를 검색합니다. 일부 명령은 활성 노트나 이미 공유된 노트가 있을 때만 표시됩니다.

| 실제 명령 이름 | 결과 |
|---|---|
| Share current note to web | 현재 노트를 렌더링해 신규 발행/갱신하고 URL 복사 |
| Copy share link of current note | 다시 발행하지 않고 기존 공유 URL 복사 |
| Delete shared note from server | 선택한 제공업체에서 공유 노트 삭제; 로컬 실행취소와 다른 외부 변경 |
| Open CMS dashboard | 볼트 내 관리 화면 열기; 모든 호스트에 서버 기능이 생기는 것은 아님 |
| Browse all shared notes | 플러그인이 알고 있는 공유 노트 탐색 |

CMS에서 조회, 재공유, 삭제를 수행합니다. 거버넌스 서버의 철회는 파일을 보존하면서 HTTP 410 종료 안내를 제공하고, 삭제는 목록과 저장 노트를 제거합니다. 복구는 거버넌스 전용입니다. 이미 수신자가 내려받은 사본이나 모든 캐시/이력까지 회수하지는 못합니다.

## 설정 사전

| 구역 | 실제 설정과 의미 |
|---|---|
| Vault Identity | Vault display name과 Vault ID는 발행 볼트를 식별; 충돌 우회 목적으로 임의 변경하지 않기 |
| Server Provider | Active provider는 이후 작업의 목적지 |
| Sharing | Share title source, Share page theme, Footer link와 label, Encryption mode, Default expiration |
| 렌더링 | Include theme CSS, Remove backlinks, Remove frontmatter, Note width |
| Frontmatter Fields | Share field, Link field, Encrypted field, Expires field는 노트에서 쓸 필드 이름 |
| CMS Dashboard | Enable CMS dashboard, Auto refresh |
| Advanced | Debug mode; 지원에 보내기 전 비밀정보 제거 |
| CMDSPACE | Enabled, API token, Server URL |
| Synology NAS | Enabled, NAS URL, Username, Password, Shared folder, Public URL |
| GitHub Pages | Personal access token, Repository, 설정 버튼; 고급 Enabled/Branch/Path/Custom domain |
| Supabase | Enabled, Project URL, Anon key, Bucket, Table name |
| Convex | Enabled, Deployment URL, Public URL |

Remove frontmatter는 다운로드 Markdown의 앞쪽 YAML도 제거합니다. 본문, 주석 등 임의의 민감정보까지 지우지는 않으며 backlink 표시 제어도 완전한 원문 새니타이저는 아닙니다. 공개용 원본을 따로 준비하고 다운로드된 Markdown까지 확인합니다. 호스트 변경만으로 이전 공유물이 이관되거나 이전 URL이 철회되지는 않습니다.

## 이미지, 링크, 페이지 기능
Obsidian 렌더링과 테마 CSS를 사용해 읽기 화면을 재현합니다. 목차, 제목 링크, 코드 복사, 라이트/다크 모드, 그래프/목차 표시 제어를 제공합니다. 복잡한 플러그인, 스크립트, 로컬 파일 참조, 모든 사용자 테마의 동작을 독립 브라우저에서 보장하지는 않습니다.
Eagle 자료는 외부에서 읽을 수 있는 클라우드 URL 또는 Share가 업로드할 수 있는 지원 이미지로 준비합니다. `file://`는 특정 컴퓨터의 경로이며 `eagle://`는 앱 이동 링크입니다. 내 라이브러리가 없는 기기에서도 확인합니다.
페이지에는 원본 Markdown 복사/다운로드도 들어갑니다. 그래프는 링크/태그 이름을 드러낼 수 있고 암호화 공유에서는 해당 그래프 메타데이터를 제외합니다. 첫 화면뿐 아니라 원본과 전체 렌더링을 검토합니다.

## 암호화와 개인정보
선택적 **AES-256-GCM** 암호화는 업로드 전에 노트 페이로드를 암호화합니다. 복호화 키는 공유 URL의 `#` 뒤에 들어가며 일반 브라우저 요청은 그 부분을 서버에 보내지 않습니다. **전체 URL을 받은 사람은 키도 받습니다.** 링크 기반 접근이지 실명 사용자 인증, DRM, 재전달 방지가 아닙니다.
**암호화 노트의 삽입 이미지도 암호화하지 않고 업로드합니다.** 콘텐츠 해시 기반의 비공개 목록 URL은 접근 통제가 아닙니다. 기밀 스크린샷, 얼굴, 도표, 스캔 문서를 노트 암호화만 믿고 공개하지 않습니다. Markdown 원본은 암호화 페이로드 안에 있지만 이미지 바이트는 아닙니다.
- 공개 저장소나 호스트의 일반 HTML/원문은 공개 자료입니다. 짧고 찾기 어려운 ID를 비밀보장으로 삼지 않습니다.
- 호스트 운영자는 네트워크 요청을 처리합니다. GitHub/Supabase/NAS/Convex와 자체 서버의 로그, 보관 정책, 비용이 별도로 적용됩니다.
- API 토큰, 암호, 복호화 키, 공유 기록, 설정은 안전하게 백업합니다. `data.json`을 이슈나 공개 저장소에 올리지 않습니다.
- Git 이력, 캐시, 수신자의 사본은 과거 공개 내용을 보존할 수 있습니다. 나중에 암호화를 켜도 이전 평문 발행이 지워지지는 않습니다.
- 관리용 서비스 토큰과 URL 복호화 키는 서로 다른 자격증명입니다.

## 문제 해결

| 증상 | 안전한 확인 순서 |
|---|---|
| GitHub 토큰 거절 | 만료, repo/Pages 권한, 계정과 저장소 확인; 지원 이슈에 토큰 붙이지 않기 |
| 저장소는 있지만 Pages 설정 실패 | 공개 여부, Pages 활성화, 브랜치/경로 권한, GitHub 오류 확인 |
| 새 링크 404 | Pages 빌드 완료와 base URL/사용자 도메인 확인 |
| 이미지 누락 | 외부 읽기 가능 여부, 로컬 파일 참조, 이미지 URL, 브라우저 네트워크 오류 확인 |
| 만료/철회/조회수 없음 | 호스트 기능 표 확인; 정적 호스트에 거버넌스 강제 기능 없음 |
| HTTP 410 | 거버넌스 서버의 만료/철회 상태 확인 |
| 볼트 간 HTTP 409 | 볼트 식별/소유권 충돌 해결; 다른 볼트의 공유물 덮어쓰지 않기 |
| 암호화 페이지가 안 열림 | `#`까지 포함한 전체 URL 확인; 서버 암호문만으로 빠진 키 복구 불가 |
| CMS의 과거 기록이 예상과 다름 | 현재 제공업체와 원래 발행 볼트 확인; 호스트 전환은 이관이 아님 |

## 업데이트, 지원, 제작자
업데이트 전 설정과 중요한 원본 노트를 백업합니다. 커뮤니티 업데이트 또는 같은 릴리스 파일 3종을 함께 사용합니다. 비민감 노트로 같은 호스트의 발행/수정/삭제 흐름을 먼저 확인합니다.
[웹 설명서](https://apps.cmdspace.work/plugins/cmds-share/) | [릴리스](https://github.com/johnfkoo951/cmds-share/releases) | [문제 신고](https://github.com/johnfkoo951/cmds-share/issues).
신고에는 플러그인/Obsidian 버전, OS, 제공업체, 비밀정보를 지운 오류, 최소 예제를 제공합니다. 암호화된 전체 URL, 토큰, 개인 노트, 설정 파일을 첨부하지 않습니다.
MIT © **Yohan Koo (CMDSPACE)**, https://cmdspace.work. [LICENSE](https://github.com/johnfkoo951/cmds-share/blob/main/LICENSE).

## 검증 범위
`manifest.json`, `src/main.ts`, `src/settings.ts`, `src/types.ts`, `src/providers.ts`, `src/crypto.ts`와 기존 문서, 공개 릴리스/등록 목록을 대조했습니다. 실제 발행, 저장소 생성, 토큰 발급, 삭제, 모바일 시험은 실행하지 않았습니다. 현재 UI 스크린샷을 촬영했다고 주장하거나 생성 이미지로 대체하지 않았습니다.
