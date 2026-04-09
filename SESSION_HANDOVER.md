# Session Handover

## 날짜: 2026-04-09

## 프로젝트 개요
RelayAX — Next.js 15 App Router 기반 프론트엔드/UI/UX 프로토타입.
- `/` : Heritage 타임라인 스크러빙 히어로 (1972→2026) + CLI 리빌
- `/hub` : Relay Hub 멀티 에이전트 채팅 프로토타입

## 완료 (이번 세션 + 누적)
### 하네스·인프라
- `.claude/agents/` 6명 디자인 팀 에이전트 정의 + `.claude/skills/` 2개 (relayax-design-orchestrator, hero-video-scrubbing)
- Next.js 15 + Tailwind + TS strict 스캐폴드
- GitHub repo: `beyondworks/relayax-ui-ux` (main 브랜치)

### 히어로 섹션 (`components/hero/`)
- `HeroHeritageScrub.tsx` — 9장 헤리티지 이미지(Frame 12~20) 가로 스크럽 + 자석 스냅 + 2 beats 홀드 버퍼
- `CliTerminal.tsx` — canvas 픽셀아트 RelayAX 로고, macOS 터미널 크롬, 리빌 페이즈에 crossfade 등장
- 카피 4단계 내러티브: "도구를 배웠다" → "질문을 던진다" → "한 줄의 명령" → "RelayAX"
- 타임라인 스크러버 (1972-2026, 매년 틱, 10년 라벨, 플레이헤드)
- 롤백용 백업: `HeroHeritageScrub.backup.tsx`

### Relay Hub (`components/hub/`, `app/hub/`)
- 3-컬럼 레이아웃 (사이드바 260px / 채팅 / 프로필 320px)
- 6명 의인화 동료 (지우/유니/해민/도윤/다은/소라) + Notion 스타일 DiceBear 아바타
- 기능: 프레즌스, unread 배지, 검색, 이모지 반응 토글·피커, @mention 파싱, 슬래시 커맨드(/task /assign /status /summary /pin), 작업 카드(5상태+진행률), 첨부파일, 시스템 이벤트, 날짜 구분선, 핀 메시지, 스레드 카운트, 타이핑 인디케이터
- `mock.ts`에 모든 시드 데이터

### 홈 네비
- `app/page.tsx` 상단에 RelayAX 로고 + Relay Hub pill 버튼 (fixed, pointer-events 통과)

## 미완료 / 다음 작업
1. **홈 페이지 하위 섹션** — 현재 히어로만 있음. "다음 섹션 자리" placeholder를 실제 USE CASES / HOW IT WORKS / CTA로 채워야 함. 우선순위: 높음
2. **Relay Hub 실제 LLM 연동** — 현재 mockReply 템플릿. Claude API 연결 지점 필요. 우선순위: 중
3. **Hub 반응형** — 모바일 레이아웃(< 768px) 미구현. 사이드바 오프캔버스 전환 필요. 우선순위: 중
4. **스레드 뷰** — 스레드 카운트 표시만 있고 클릭 시 동작 없음. 사이드 패널 또는 모달로 답글 뷰 필요. 우선순위: 낮음
5. **이미지 최적화** — `public/heritage/*.png` 원본 5504x3072 그대로 서빙. `<Image>` 컴포넌트 + responsive sizes 적용 필요. 우선순위: 낮음
6. **Vercel 배포** — 아직 배포 안 됨. `vercel link` + `vercel` 필요

## 주요 결정 사항
- **히어로 축 통일** — 세로 스크롤 vs 가로 스크럽 축 불일치 이슈 후 가로로 통일 (A 옵션 롤백)
- **CLI는 스크럽에서 분리** — 마지막 이미지를 스크럽의 일부로 두면 내러티브 무게가 평평해짐. 독립 레이어 crossfade + scale + translateY로 "답" 선언 효과
- **의인화된 동료** — slug(시스템)과 name(사람)을 분리 필드로 유지. @mention은 slug/name/id 모두 매칭
- **DiceBear notionists** — 캐릭터 다양성·Notion 느낌·번들 없음 3박자를 동시에 만족하는 선택
- **gitignore 정책** — `.claude/`, `Image/`, `.omc/`, `tsconfig.tsbuildinfo` 제외. 에이전트 정의는 repo에 포함 안 됨 (로컬 전용)

## 에러/학습
- **Playwright verify 스크립트가 sticky 영역 밖을 찍는 문제** — 트랙 높이가 vh 여러 배라 `scroll-{pct}` 포지션이 sticky 구간을 벗어남. 실제 사용 범위 확인은 `usefulEnd` 이내에서 해야 함
- **이미지 누끼 — Python PIL threshold** — DSLR 촬영 종이 배경은 L=214~234로 제품마다 다름. `mix-blend-multiply + filter brightness`로 임시 처리 후 결국 PIL로 실제 알파 채널 생성이 깔끔
- **Next.js 15 App Router + `'use client'`** — sticky+scroll 계산하는 컴포넌트는 반드시 client. 서버 컴포넌트 기본 유지
- **macOS 호환** — `sed -i` 금지, PIL/Python 또는 perl 사용
- **Typescript strict** — `progress * (TOTAL - 1)`처럼 float 산출 시 `Math.min/max` 클램프 필수 (자석 스냅 구현할 때 음수 나옴)

## 다음 세션 시작 시
1. `npm run dev`로 서버 기동 후 `/`와 `/hub` 양쪽 동작 확인
2. 홈 하위 섹션 작업이 우선 → USE CASES 섹션부터 설계
3. Hub는 LLM 연동 전에 반응형 먼저 해결
4. 커밋되지 않은 변경 있는지 `git status`로 확인 후 이어가기

## 파일 위치
- 에이전트 정의: `.claude/agents/*.md` (gitignore)
- 디자인 스킬: `.claude/skills/{relayax-design-orchestrator,hero-video-scrubbing}/skill.md`
- 히어로: `components/hero/HeroHeritageScrub.tsx`, `CliTerminal.tsx`
- 허브: `components/hub/RelayHub.tsx`, `mock.ts`, `app/hub/page.tsx`
- 이미지 원본: `Image/Frame 1.png ~ Frame 20.png` (gitignore, public/heritage로 복사된 것만 배포)
