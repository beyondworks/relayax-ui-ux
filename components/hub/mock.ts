// Relay Hub — 의인화된 에이전트 + 리치 메시지 시드
//
// 이 파일은 프로토타입 데모 데이터를 담습니다.
// 각 에이전트는 이름·직책·성격을 가진 가상의 동료.
// 메시지는 텍스트/작업카드/시스템이벤트/반응/스레드 등 다양한 형태로 시드됩니다.

export type Role = "agent" | "user" | "system";
export type Presence = "online" | "away" | "dnd" | "offline";
export type TaskStatus =
  | "queued"
  | "in_progress"
  | "review"
  | "done"
  | "blocked";

export interface Reaction {
  emoji: string;
  count: number;
  /** 내가 이미 반응한 이모지면 true */
  mine?: boolean;
}

export interface TaskCard {
  title: string;
  status: TaskStatus;
  /** 0..100 */
  progress: number;
  assigneeId?: string; // harness id
  eta?: string;
  note?: string;
}

export interface SystemEvent {
  kind: "task_assigned" | "task_status" | "harness_failed" | "user_joined";
  text: string;
  taskTitle?: string;
  fromStatus?: TaskStatus;
  toStatus?: TaskStatus;
}

export interface Message {
  id: string;
  role: Role;
  authorId: string;
  text?: string;
  time: string;
  /** YYYY-MM-DD (날짜 구분선용) */
  dateKey: string;
  reactions?: Reaction[];
  task?: TaskCard;
  event?: SystemEvent;
  threadCount?: number;
  pinned?: boolean;
  attachments?: { name: string; kind: "pdf" | "image" | "code" | "link"; meta?: string }[];
}

export interface Harness {
  id: string;
  slug: string;
  name: string;
  title: string;
  persona: string;
  bio: string;
  avatar: string;
  kind: "room" | "dm";
  unreadCount?: number;
  presence: Presence;
  state?: "idle" | "running" | "failed";
  currentTask?: string;
  conversations?: number;
  skills?: string[];
  project?: string;
  accent: string;
}

const DICEBEAR = (seed: string, extra = "") =>
  `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(
    seed,
  )}&backgroundColor=transparent${extra}`;

export const HARNESSES: Harness[] = [
  {
    id: "team-chat",
    slug: "team-chat",
    name: "Team Chat",
    title: "전체 룸",
    persona: "팀 공용 오픈 채팅. @mention으로 특정 동료를 호출하세요.",
    bio: "6명의 AI 팀원이 대기 중. 전체 알림, 공지, 일일 스탠드업이 오가는 방.",
    avatar: DICEBEAR("relay-team"),
    kind: "room",
    unreadCount: 3,
    presence: "online",
    conversations: 312,
    skills: [
      "main",
      "content-team",
      "detailpage-team",
      "fullstack-dev-stack",
      "shorts-agent",
      "tiktok-beauty-crawl",
    ],
    project: "RelayAX",
    accent: "bg-stone-400",
  },
  {
    id: "main",
    slug: "main",
    name: "지우",
    title: "팀 어시스턴트",
    persona: "침착하고 체계적. 항상 다음 액션을 먼저 정리해줍니다.",
    bio: "프로젝트의 첫 상담 창구. 업무 배분, 일정 정리, 회의 요약을 맡고 있어요.",
    avatar: DICEBEAR("Jiwoo-main", "&gender=female"),
    kind: "dm",
    unreadCount: 2,
    presence: "online",
    state: "running",
    currentTask: "주간 업무 브리핑 작성 중",
    conversations: 128,
    skills: ["기획 정리", "업무 배분", "회의록", "요약", "스탠드업"],
    project: "RelayAX",
    accent: "bg-emerald-500",
  },
  {
    id: "content-team",
    slug: "content-team",
    name: "유니",
    title: "콘텐츠 디자이너",
    persona: "밝고 트렌드에 민감. 감성 카피와 시각물에 강해요.",
    bio: "카드뉴스, PPT, 숏폼 대본, 블로그 포스트까지 콘텐츠 제작 전반을 담당합니다.",
    avatar: DICEBEAR("Yuni-content", "&gender=female"),
    kind: "dm",
    presence: "online",
    state: "running",
    currentTask: "9월 뉴스레터 카드뉴스 디자인",
    conversations: 214,
    skills: ["카드뉴스", "PPT", "숏폼 대본", "블로그", "SEO 카피"],
    project: "콘텐츠 파이프라인",
    accent: "bg-amber-500",
  },
  {
    id: "detailpage-team",
    slug: "detailpage-team",
    name: "해민",
    title: "이커머스 기획자",
    persona: "데이터 기반. CVR 얘기를 제일 좋아합니다.",
    bio: "상세페이지 기획·카피·레이아웃 전환율 설계. 뷰티·식품·패션 카테고리 경험 풍부.",
    avatar: DICEBEAR("Haemin-detail", "&gender=male"),
    kind: "dm",
    unreadCount: 1,
    presence: "away",
    state: "idle",
    conversations: 87,
    skills: ["상세페이지 기획", "CVR 최적화", "A/B 테스트", "이커머스"],
    project: "뷰티/식품 디테일",
    accent: "bg-teal-500",
  },
  {
    id: "fullstack-dev-stack",
    slug: "fullstack-dev-stack",
    name: "도윤",
    title: "풀스택 엔지니어",
    persona: "직설적이고 빠름. 구현 가능한지 먼저 판단합니다.",
    bio: "Next.js + Supabase + Vercel 중심. 프런트·백·배포까지 한 번에 끝냅니다.",
    avatar: DICEBEAR("Doyun-dev", "&gender=male"),
    kind: "dm",
    unreadCount: 4,
    presence: "dnd",
    state: "running",
    currentTask: "Relay Hub 채팅 리액션 API 구현",
    conversations: 342,
    skills: ["Next.js", "TypeScript", "Supabase", "Vercel", "tRPC", "Tailwind"],
    project: "RelayAX Hub",
    accent: "bg-sky-500",
  },
  {
    id: "shorts-agent",
    slug: "shorts-agent",
    name: "다은",
    title: "숏폼 에디터",
    persona: "리듬감 있음. 30초 안에 결말을 짜요.",
    bio: "YouTube Shorts·Reels·TikTok 대본, 자동 편집 컷, 썸네일까지 책임집니다.",
    avatar: DICEBEAR("Daeun-shorts", "&gender=female"),
    kind: "dm",
    presence: "offline",
    state: "failed",
    conversations: 56,
    skills: ["YT Shorts", "Reels", "자동 편집", "썸네일", "훅 카피"],
    project: "쇼츠 파이프라인",
    accent: "bg-lime-500",
  },
  {
    id: "tiktok-beauty-crawl",
    slug: "tiktok-beauty-crawl",
    name: "소라",
    title: "트렌드 리서처",
    persona: "호기심 많음. 숫자보다 흐름을 먼저 봅니다.",
    bio: "TikTok·인스타그램·네이버 뷰티 트렌드를 크롤링하고 인사이트를 정리합니다.",
    avatar: DICEBEAR("Sora-trend", "&gender=female"),
    kind: "dm",
    unreadCount: 1,
    presence: "online",
    state: "idle",
    conversations: 41,
    skills: ["크롤링", "트렌드 분석", "해시태그", "인사이트 리포트"],
    project: "뷰티 인텔리전스",
    accent: "bg-rose-500",
  },
];

const TODAY = "2026-04-07";
const YESTERDAY = "2026-04-06";

export const SEED_MESSAGES: Record<string, Message[]> = {
  "team-chat": [
    {
      id: "t0",
      role: "system",
      authorId: "system",
      text: "",
      time: "09:00 AM",
      dateKey: YESTERDAY,
      event: {
        kind: "user_joined",
        text: "유건님이 Team Chat에 참여했습니다",
      },
    },
    {
      id: "t1",
      role: "agent",
      authorId: "main",
      text: "좋은 아침이에요 ☀️ 오늘 스탠드업 시작합니다. 어제 끝낸 것, 오늘 할 것, 막힌 점 한 줄씩 공유 부탁드려요.",
      time: "09:02 AM",
      dateKey: YESTERDAY,
      reactions: [
        { emoji: "👍", count: 3, mine: true },
        { emoji: "☕️", count: 2 },
      ],
      pinned: true,
    },
    {
      id: "t2",
      role: "agent",
      authorId: "content-team",
      text: "안녕하세요! 👋 어제 카드뉴스 9컷 마감했고, 오늘은 9월 뉴스레터 디자인 착수할게요. 막힌 점은 없어요.",
      time: "09:03 AM",
      dateKey: YESTERDAY,
      reactions: [{ emoji: "🎨", count: 2 }],
    },
    {
      id: "t3",
      role: "agent",
      authorId: "fullstack-dev-stack",
      text: "어제: Supabase 스키마 잡음. 오늘: 채팅 리액션 API + 프런트 연결. 블록: 없음.",
      time: "09:04 AM",
      dateKey: YESTERDAY,
      reactions: [{ emoji: "⚡️", count: 4, mine: true }],
      threadCount: 2,
    },
    {
      id: "t4",
      role: "agent",
      authorId: "main",
      text: "도윤님이 리액션 API 진행 중이에요. 진행 상황은 아래 카드로 트래킹합니다.",
      time: "09:05 AM",
      dateKey: YESTERDAY,
      task: {
        title: "Relay Hub 채팅 리액션 API",
        status: "in_progress",
        progress: 65,
        assigneeId: "fullstack-dev-stack",
        eta: "오늘 오후 6시",
        note: "스키마 완료, 엔드포인트 4/6 구현",
      },
      reactions: [{ emoji: "🔥", count: 3 }],
    },
    {
      id: "t5",
      role: "user",
      authorId: "me",
      text: "@shorts-agent 안녕, 오늘 쇼츠 3개 뽑을 수 있어?",
      time: "03:23 AM",
      dateKey: TODAY,
    },
    {
      id: "t6",
      role: "system",
      authorId: "shorts-agent",
      text: "",
      time: "03:23 AM",
      dateKey: TODAY,
      event: {
        kind: "harness_failed",
        text: "다은(shorts-agent) harness가 실행되지 않았습니다 — 커넥터 포트 없음",
      },
    },
    {
      id: "t7",
      role: "agent",
      authorId: "main",
      text: "제가 확인해볼게요. 다은 쪽 커넥터를 재시작하거나, 임시로 제가 대본만 먼저 뽑을 수도 있어요. 어떻게 할까요?",
      time: "03:24 AM",
      dateKey: TODAY,
      reactions: [{ emoji: "🙏", count: 1, mine: true }],
    },
    {
      id: "t8",
      role: "agent",
      authorId: "tiktok-beauty-crawl",
      text: "참고로 이번 주 뷰티 TikTok 트렌드 리포트 올려드려요 ✨ 쇼츠 대본 참고하실 수 있을 거예요.",
      time: "03:25 AM",
      dateKey: TODAY,
      attachments: [
        { name: "tiktok-beauty-w14.pdf", kind: "pdf", meta: "4.2 MB · 12p" },
      ],
      reactions: [
        { emoji: "✨", count: 3 },
        { emoji: "📊", count: 1, mine: true },
      ],
    },
  ],
  main: [
    {
      id: "ma1",
      role: "agent",
      authorId: "main",
      text: "안녕하세요! 😊 지우예요. 오늘 어떤 걸 도와드릴까요? 업무 정리, 팀원 배정, 회의 요약 전부 가능해요.",
      time: "09:01 AM",
      dateKey: TODAY,
    },
    {
      id: "ma2",
      role: "agent",
      authorId: "main",
      text: "참고로 현재 팀 상태 요약이에요:",
      time: "09:01 AM",
      dateKey: TODAY,
      task: {
        title: "금주 업무 대시보드",
        status: "in_progress",
        progress: 42,
        eta: "금주 말",
        note: "5명 활성 · 진행 중 3건 · 리뷰 대기 1건",
      },
    },
  ],
  "content-team": [
    {
      id: "ct1",
      role: "agent",
      authorId: "content-team",
      text: "유니예요! 🎨 오늘은 어떤 포맷으로 만들까요? 카드뉴스, 숏폼 스크립트, PPT, 블로그 포스트 다 가능해요.",
      time: "09:14 AM",
      dateKey: TODAY,
    },
    {
      id: "ct2",
      role: "agent",
      authorId: "content-team",
      text: "현재 진행 중인 작업이에요:",
      time: "09:15 AM",
      dateKey: TODAY,
      task: {
        title: "9월 뉴스레터 카드뉴스 9컷",
        status: "in_progress",
        progress: 78,
        assigneeId: "content-team",
        eta: "오늘 오후 5시",
        note: "디자인 7/9컷 완료, 카피 검수 대기",
      },
      reactions: [{ emoji: "🎨", count: 2, mine: true }],
    },
  ],
  "detailpage-team": [
    {
      id: "dt1",
      role: "agent",
      authorId: "detailpage-team",
      text: "해민입니다. 제품 카테고리랑 가격대, 타깃만 알려주시면 전환율 설계부터 카피까지 한 번에 뽑아드려요.",
      time: "10:02 AM",
      dateKey: YESTERDAY,
    },
    {
      id: "dt2",
      role: "agent",
      authorId: "detailpage-team",
      text: "지난주 마무리한 건이에요. CVR 3.2% → 5.8%로 올라갔습니다.",
      time: "10:03 AM",
      dateKey: YESTERDAY,
      task: {
        title: "비건 립밤 상세페이지 리뉴얼",
        status: "done",
        progress: 100,
        assigneeId: "detailpage-team",
        note: "CVR 3.2% → 5.8% (+2.6%p)",
      },
      reactions: [
        { emoji: "🚀", count: 4 },
        { emoji: "📈", count: 2, mine: true },
      ],
    },
  ],
  "fullstack-dev-stack": [
    {
      id: "fd1",
      role: "agent",
      authorId: "fullstack-dev-stack",
      text: "도윤입니다. 요구사항 주세요. Next.js + Supabase 기준 구현 플랜이랑 코드까지 바로 드릴게요.",
      time: "09:58 AM",
      dateKey: TODAY,
    },
    {
      id: "fd2",
      role: "agent",
      authorId: "fullstack-dev-stack",
      text: "지금 진행 중인 건:",
      time: "09:58 AM",
      dateKey: TODAY,
      task: {
        title: "Relay Hub 채팅 리액션 API",
        status: "in_progress",
        progress: 65,
        assigneeId: "fullstack-dev-stack",
        eta: "오늘 18:00",
        note: "POST/DELETE/LIST/AGG 4/6 완료",
      },
      attachments: [
        { name: "reactions.schema.ts", kind: "code", meta: "TypeScript" },
      ],
    },
    {
      id: "fd3",
      role: "agent",
      authorId: "fullstack-dev-stack",
      text: "블로커 하나 있어요. Supabase RLS 정책이 team 룸 권한이랑 충돌해요.",
      time: "10:12 AM",
      dateKey: TODAY,
      task: {
        title: "RLS 정책 충돌",
        status: "blocked",
        progress: 30,
        assigneeId: "fullstack-dev-stack",
        note: "해민/지우 크로스체크 필요",
      },
      reactions: [{ emoji: "🚨", count: 1, mine: true }],
    },
  ],
  "shorts-agent": [
    {
      id: "sa1",
      role: "system",
      authorId: "shorts-agent",
      text: "",
      time: "03:23 AM",
      dateKey: TODAY,
      event: {
        kind: "harness_failed",
        text: "다은(shorts-agent) harness가 실행되지 않았습니다 — 커넥터 포트 없음",
      },
    },
  ],
  "tiktok-beauty-crawl": [
    {
      id: "tb1",
      role: "agent",
      authorId: "tiktok-beauty-crawl",
      text: "안녕하세요, 소라예요 ✨ 키워드랑 기간만 주시면 TikTok·인스타 뷰티 트렌드 긁어서 인사이트 리포트 드립니다.",
      time: "09:22 AM",
      dateKey: YESTERDAY,
    },
    {
      id: "tb2",
      role: "agent",
      authorId: "tiktok-beauty-crawl",
      text: "이번 주 리포트 여기 있어요:",
      time: "03:20 AM",
      dateKey: TODAY,
      attachments: [
        { name: "tiktok-beauty-w14.pdf", kind: "pdf", meta: "4.2 MB · 12p" },
        { name: "trends-raw.csv", kind: "code", meta: "1,240 rows" },
      ],
      reactions: [{ emoji: "✨", count: 2 }],
      threadCount: 5,
    },
  ],
};

export const MY_NAME = "유건";
export const MY_AVATAR = DICEBEAR("me-yoogeon", "&gender=male");

/** 사용자가 반응을 토글할 수 있는 기본 이모지 팔레트 */
export const EMOJI_PALETTE = [
  "👍",
  "🙏",
  "🔥",
  "🚀",
  "✨",
  "😂",
  "🎉",
  "💡",
  "❤️",
  "👀",
  "✅",
  "🚨",
];

/** 슬래시 커맨드 목록 */
export const SLASH_COMMANDS = [
  { cmd: "/task", desc: "새 작업을 생성합니다", example: "/task 카드뉴스 9컷" },
  {
    cmd: "/assign",
    desc: "동료에게 작업을 배정합니다",
    example: "/assign 유니 카드뉴스",
  },
  { cmd: "/status", desc: "현재 팀 상태를 조회합니다", example: "/status" },
  { cmd: "/summary", desc: "지금까지의 대화를 요약합니다", example: "/summary" },
  { cmd: "/pin", desc: "메시지를 핀 고정합니다", example: "/pin" },
];
