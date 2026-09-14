[![English](https://img.shields.io/badge/English-README-134538)](README.md) [![한국어](https://img.shields.io/badge/한국어-README-E985A2)](README.ko.md)

# CMDS Share
Obsidian 노트를 웹페이지로 발행하고, 공유 전에 호스팅과 개인정보 범위를 선택합니다.

**버전 2.1.1 | 커뮤니티 플러그인에서 설치할 수 있습니다.**

Obsidian 1.7.2 이상 | 데스크톱과 모바일.

## 주요 활용
- 명령 팔레트에서 노트를 발행/갱신하고 링크를 복사합니다.
- 기본 GitHub Pages 또는 호환 관리형/자체 백엔드를 선택합니다.
- 목차, 테마 전환, Markdown 복사/다운로드를 독자에게 제공합니다.
- 노트 암호화를 선택할 수 있으며 거버넌스 기능은 선택한 호스트에 따라 다릅니다.

## 설치와 첫 사용
**커뮤니티 설치:** 설정 → 커뮤니티 플러그인 → 탐색 → **CMDS Share** → 설치 → 활성화.

**수동 설치:** [2.1.1 릴리스](https://github.com/johnfkoo951/cmds-share/releases/tag/2.1.1)의 `main.js`, `manifest.json`, `styles.css`를 `<vault>/.obsidian/plugins/cmds-share/`에 넣고 다시 로드한 뒤 활성화합니다. 기존 설정을 백업하고 다른 사용자의 `data.json`을 복사하지 않습니다.

비민감 예제를 준비합니다. GitHub Pages의 **공개 저장소** 설정을 검토하고 연결을 시험한 뒤 **Share current note to web**를 실행합니다. Pages 빌드를 기다리고 로그아웃한 브라우저에서 페이지와 원문을 확인합니다.

## 설명서
- [English user guide](docs/guide.md)
- [한국어 사용설명서](docs/guide.ko.md)
- [Web manual](https://apps.cmdspace.work/plugins/cmds-share/)
- [Product family](https://apps.cmdspace.work/plugins/)
- [Issues and support](https://github.com/johnfkoo951/cmds-share/issues)

## 개인정보와 한계
GitHub Pages는 공개 저장소를 사용합니다. 암호화 노트도 이미지는 **평문 업로드**합니다. 서버 만료 강제, 조회수, 철회/복구는 모든 호스트의 공통 기능이 아닙니다. CMDSPACE 관리형 인스턴스는 초대제입니다.

## 개발
```sh
npm install
npm run build
```
로컬 개발용 플러그인 파일을 빌드합니다.

## 제작자와 라이선스
**Yohan Koo (CMDSPACE)**, https://cmdspace.work. **MIT**, [LICENSE](LICENSE).
