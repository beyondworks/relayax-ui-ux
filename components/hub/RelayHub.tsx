"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  EMOJI_PALETTE,
  HARNESSES,
  MY_AVATAR,
  MY_NAME,
  SEED_MESSAGES,
  SLASH_COMMANDS,
  type Harness,
  type Message,
  type Presence,
  type Reaction,
  type TaskStatus,
} from "./mock";

/**
 * RelayHub — 완전 기능 프로토타입
 * --------------------------------
 * Slack + Discord + Claude Cowork 스타일의 멀티 에이전트 채팅 허브.
 *
 * 구현된 기능:
 * - 3-컬럼 레이아웃 (사이드바 / 채팅 / 프로필 패널)
 * - 의인화된 동료(Notion 스타일 아바타) + 프레즌스
 * - 사이드바 검색, unread 배지, 현재 작업 인디케이터
 * - 날짜 구분선, 메시지 버블, 호버 퀵 액션
 * - 이모지 반응 (토글·피커)
 * - 작업 카드(상태 배지 + 진행률 바)
 * - 시스템 이벤트 (join, harness_failed, task_status 등)
 * - 첨부파일 프리뷰 (PDF/코드/이미지/링크)
 * - 스레드 카운트, 핀 표시
 * - @mention 파싱 + 자동 응답
 * - 슬래시 커맨드 (/task, /assign, /status, /summary, /pin)
 * - 실시간 타이핑 인디케이터
 */

type MessagesByHarness = Record<string, Message[]>;

const STATUS_LABEL: Record<TaskStatus, string> = {
  queued: "대기",
  in_progress: "진행 중",
  review: "리뷰",
  done: "완료",
  blocked: "블록",
};

const STATUS_CLASSES: Record<TaskStatus, string> = {
  queued: "bg-stone-100 text-stone-600 border-stone-300",
  in_progress: "bg-sky-50 text-sky-700 border-sky-200",
  review: "bg-violet-50 text-violet-700 border-violet-200",
  done: "bg-emerald-50 text-emerald-700 border-emerald-200",
  blocked: "bg-rose-50 text-rose-700 border-rose-200",
};

const STATUS_BAR: Record<TaskStatus, string> = {
  queued: "bg-stone-400",
  in_progress: "bg-sky-500",
  review: "bg-violet-500",
  done: "bg-emerald-500",
  blocked: "bg-rose-500",
};

const PRESENCE_COLOR: Record<Presence, string> = {
  online: "bg-emerald-500",
  away: "bg-amber-500",
  dnd: "bg-rose-500",
  offline: "bg-stone-400",
};

const PRESENCE_LABEL: Record<Presence, string> = {
  online: "온라인",
  away: "자리비움",
  dnd: "방해 금지",
  offline: "오프라인",
};

function timeNow() {
  return new Date().toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function byId(id: string): Harness | undefined {
  return HARNESSES.find((h) => h.id === id);
}

function formatDateLabel(key: string) {
  const today = todayKey();
  if (key === today) return "오늘";
  const d = new Date(key);
  const diff = Math.floor(
    (new Date(today).getTime() - d.getTime()) / 86400000,
  );
  if (diff === 1) return "어제";
  return d.toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
}

export function RelayHub() {
  const [activeId, setActiveId] = useState<string>("team-chat");
  const [messagesByHarness, setMessagesByHarness] =
    useState<MessagesByHarness>(SEED_MESSAGES);
  const [draft, setDraft] = useState("");
  const [typingAgent, setTypingAgent] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [emojiPickerFor, setEmojiPickerFor] = useState<string | null>(null);
  const [showSlash, setShowSlash] = useState(false);

  const scrollerRef = useRef<HTMLDivElement>(null);

  const active = byId(activeId)!;
  const messages = messagesByHarness[activeId] ?? [];

  // 새 메시지 도착 시 하단 스크롤
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length, activeId, typingAgent]);

  // 슬래시 팔레트 표시
  useEffect(() => {
    setShowSlash(draft.startsWith("/"));
  }, [draft]);

  const rooms = useMemo(() => HARNESSES.filter((h) => h.kind === "room"), []);
  const dms = useMemo(
    () =>
      HARNESSES.filter((h) => h.kind === "dm").filter((h) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          h.name.toLowerCase().includes(q) ||
          h.slug.toLowerCase().includes(q) ||
          h.title.toLowerCase().includes(q)
        );
      }),
    [search],
  );

  const pinned = messages.filter((m) => m.pinned);
  const dateGroups = useMemo(() => groupByDate(messages), [messages]);

  function updateMessage(harnessId: string, msgId: string, fn: (m: Message) => Message) {
    setMessagesByHarness((prev) => ({
      ...prev,
      [harnessId]: (prev[harnessId] ?? []).map((m) => (m.id === msgId ? fn(m) : m)),
    }));
  }

  function pushMessage(harnessId: string, msg: Message) {
    setMessagesByHarness((prev) => ({
      ...prev,
      [harnessId]: [...(prev[harnessId] ?? []), msg],
    }));
  }

  function toggleReaction(msgId: string, emoji: string) {
    updateMessage(activeId, msgId, (m) => {
      const existing = m.reactions ?? [];
      const idx = existing.findIndex((r) => r.emoji === emoji);
      let next: Reaction[];
      if (idx === -1) {
        next = [...existing, { emoji, count: 1, mine: true }];
      } else {
        const r = existing[idx];
        if (r.mine) {
          const count = r.count - 1;
          next =
            count <= 0
              ? existing.filter((_, i) => i !== idx)
              : existing.map((rr, i) =>
                  i === idx ? { ...rr, count, mine: false } : rr,
                );
        } else {
          next = existing.map((rr, i) =>
            i === idx ? { ...rr, count: rr.count + 1, mine: true } : rr,
          );
        }
      }
      return { ...m, reactions: next };
    });
    setEmojiPickerFor(null);
  }

  function handleSend() {
    const text = draft.trim();
    if (!text) return;

    // 슬래시 커맨드 처리
    if (text.startsWith("/")) {
      const cmd = text.split(/\s+/)[0];
      const rest = text.slice(cmd.length).trim();
      executeSlash(cmd, rest);
      setDraft("");
      return;
    }

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      authorId: "me",
      text,
      time: timeNow(),
      dateKey: todayKey(),
    };
    pushMessage(activeId, userMsg);
    setDraft("");

    // @mention 파싱
    const mentionMatch = text.match(/@([\w가-힣-]+)/);
    const mentionedSlug = mentionMatch?.[1];
    const mentionedAgent = mentionedSlug
      ? HARNESSES.find(
          (h) =>
            h.slug === mentionedSlug ||
            h.name === mentionedSlug ||
            h.id === mentionedSlug,
        )
      : undefined;

    let responder: Harness | undefined;
    if (active.kind === "dm") {
      responder = active;
    } else if (mentionedAgent) {
      responder = mentionedAgent;
    } else {
      responder = byId("main");
    }
    if (!responder) return;

    if (responder.state === "failed") {
      setTimeout(() => {
        pushMessage(activeId, {
          id: `s-${Date.now()}`,
          role: "system",
          authorId: responder!.id,
          time: timeNow(),
          dateKey: todayKey(),
          event: {
            kind: "harness_failed",
            text: `${responder!.name}(${responder!.slug}) harness가 실행되지 않았습니다 — 커넥터 포트 없음`,
          },
        });
      }, 400);
      return;
    }

    setTypingAgent(responder.id);
    setTimeout(
      () => {
        setTypingAgent(null);
        pushMessage(activeId, {
          id: `a-${Date.now()}`,
          role: "agent",
          authorId: responder!.id,
          text: mockReply(responder!, text),
          time: timeNow(),
          dateKey: todayKey(),
        });
      },
      900 + Math.random() * 600,
    );
  }

  function executeSlash(cmd: string, rest: string) {
    const tsBase = { time: timeNow(), dateKey: todayKey() };
    switch (cmd) {
      case "/task": {
        const title = rest || "새 작업";
        pushMessage(activeId, {
          id: `sl-${Date.now()}`,
          role: "agent",
          authorId: "main",
          text: `"${title}" 작업을 만들었어요. 누구에게 맡길까요?`,
          task: {
            title,
            status: "queued",
            progress: 0,
            eta: "미정",
          },
          ...tsBase,
        });
        break;
      }
      case "/assign": {
        const [who, ...titleParts] = rest.split(/\s+/);
        const title = titleParts.join(" ") || "새 작업";
        const assignee =
          HARNESSES.find((h) => h.name === who || h.slug === who) ?? byId("main");
        pushMessage(activeId, {
          id: `sl-${Date.now()}`,
          role: "system",
          authorId: "system",
          event: {
            kind: "task_assigned",
            text: `${MY_NAME}님이 ${assignee?.name}에게 "${title}" 작업을 배정했습니다`,
          },
          ...tsBase,
        });
        pushMessage(activeId, {
          id: `sl2-${Date.now() + 1}`,
          role: "agent",
          authorId: assignee?.id ?? "main",
          text: `네, "${title}" 맡을게요. 바로 시작할게요!`,
          task: {
            title,
            status: "in_progress",
            progress: 5,
            assigneeId: assignee?.id,
            eta: "추후 안내",
          },
          ...tsBase,
        });
        break;
      }
      case "/status": {
        const running = HARNESSES.filter((h) => h.state === "running").length;
        const failed = HARNESSES.filter((h) => h.state === "failed").length;
        pushMessage(activeId, {
          id: `sl-${Date.now()}`,
          role: "agent",
          authorId: "main",
          text: `현재 팀 상태 요약이에요. 실행 중 ${running}명, 실패 ${failed}명, 대기 중 ${HARNESSES.filter((h) => h.kind === "dm").length - running - failed}명입니다.`,
          ...tsBase,
        });
        break;
      }
      case "/summary": {
        pushMessage(activeId, {
          id: `sl-${Date.now()}`,
          role: "agent",
          authorId: "main",
          text: `지금까지의 대화 요약드릴게요:\n• 리액션 API는 도윤님이 진행 중 (65%)\n• 유니님 9월 뉴스레터 카드뉴스 78% 완료\n• 다은님(shorts-agent) 커넥터 에러 → 재시작 필요\n• 소라님이 이번 주 TikTok 리포트 공유 ✨`,
          ...tsBase,
        });
        break;
      }
      case "/pin": {
        const last = messages[messages.length - 1];
        if (last) {
          updateMessage(activeId, last.id, (m) => ({ ...m, pinned: !m.pinned }));
        }
        break;
      }
      default:
        pushMessage(activeId, {
          id: `sl-${Date.now()}`,
          role: "system",
          authorId: "system",
          event: {
            kind: "task_status",
            text: `알 수 없는 명령: ${cmd}`,
          },
          ...tsBase,
        });
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="grid h-screen w-full grid-cols-[280px_minmax(0,1fr)_320px] bg-[#f7f6f2] text-ink">
      {/* ─── 좌측 사이드바 ─── */}
      <aside className="flex flex-col border-r border-black/5 bg-[#f1efe8]">
        {/* 브랜드 */}
        <div className="flex items-center gap-2 px-5 pt-6 pb-3">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-black text-[10px] font-bold text-white">
            ▸
          </div>
          <span className="text-sm font-semibold tracking-tight">relay hub</span>
          <span className="ml-1 rounded bg-black/5 px-1.5 py-0.5 text-[9px] font-medium text-ink/50">
            v0.1
          </span>
        </div>

        {/* 검색 */}
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-1.5">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" className="text-ink/40">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6" />
              <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="동료 검색"
              className="flex-1 bg-transparent text-[12px] placeholder:text-ink/35 focus:outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-[10px] text-ink/40 hover:text-ink/70"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* 섹션: ROOMS */}
        <SectionLabel>ROOMS</SectionLabel>
        <div className="px-2">
          {rooms.map((h) => (
            <SidebarItem
              key={h.id}
              harness={h}
              active={h.id === activeId}
              onClick={() => setActiveId(h.id)}
            />
          ))}
        </div>

        {/* 섹션: DIRECT MESSAGES */}
        <SectionLabel className="mt-4">DIRECT MESSAGES</SectionLabel>
        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {dms.map((h) => (
            <SidebarItem
              key={h.id}
              harness={h}
              active={h.id === activeId}
              onClick={() => setActiveId(h.id)}
            />
          ))}
          {dms.length === 0 && (
            <div className="px-3 py-6 text-center text-[11px] text-ink/40">
              일치하는 동료가 없어요
            </div>
          )}
        </div>

        {/* 내 프로필 */}
        <div className="flex items-center gap-3 border-t border-black/5 px-4 py-3">
          <AvatarWithPresence
            src={MY_AVATAR}
            alt={MY_NAME}
            size={34}
            presence="online"
          />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{MY_NAME}</div>
            <div className="truncate text-[11px] text-ink/50">온라인 · 프로덕트</div>
          </div>
          <button className="text-ink/40 hover:text-ink/80" aria-label="Settings">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
              <path
                d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          </button>
        </div>
      </aside>

      {/* ─── 중앙: 채팅 ─── */}
      <section className="flex min-w-0 flex-col">
        {/* 헤더 */}
        <header className="flex items-center gap-3 border-b border-black/5 bg-white/40 px-6 py-4 backdrop-blur">
          <AvatarWithPresence
            src={active.avatar}
            alt={active.name}
            size={38}
            presence={active.presence}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-base font-semibold">{active.name}</h2>
              {active.kind === "dm" && (
                <span className="text-xs text-ink/50">· {active.title}</span>
              )}
              <StateBadge state={active.state} />
              {active.presence && (
                <span className="text-[10.5px] text-ink/45">
                  {PRESENCE_LABEL[active.presence]}
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate text-[11px] text-ink/50">
              {active.kind === "room"
                ? active.persona
                : `@${active.slug} · ${active.persona}`}
            </p>
          </div>
          {active.currentTask && (
            <div className="flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-[11px] text-sky-700">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-500" />
              작업 중: {active.currentTask}
            </div>
          )}
        </header>

        {/* 고정된 핀 메시지 알림 바 */}
        {pinned.length > 0 && (
          <div className="flex items-center gap-2 border-b border-black/5 bg-amber-50/60 px-6 py-2 text-[11.5px] text-amber-900">
            <span>📌</span>
            <span>
              고정된 메시지 {pinned.length}개 · {pinned[0].text?.slice(0, 60)}…
            </span>
          </div>
        )}

        {/* 메시지 스크롤러 */}
        <div ref={scrollerRef} className="flex-1 overflow-y-auto px-6 py-6">
          <div className="mx-auto flex max-w-3xl flex-col gap-5">
            {dateGroups.map(([dateKey, group]) => (
              <div key={dateKey} className="flex flex-col gap-5">
                <DateSeparator label={formatDateLabel(dateKey)} />
                {group.map((m) => (
                  <MessageRow
                    key={m.id}
                    message={m}
                    pickerOpen={emojiPickerFor === m.id}
                    onOpenPicker={(id) =>
                      setEmojiPickerFor((cur) => (cur === id ? null : id))
                    }
                    onToggleReaction={toggleReaction}
                  />
                ))}
              </div>
            ))}
            {typingAgent && <TypingIndicator harness={byId(typingAgent)!} />}
          </div>
        </div>

        {/* 슬래시 팔레트 */}
        {showSlash && (
          <div className="mx-auto mb-2 w-full max-w-3xl px-6">
            <div className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-lg">
              <div className="border-b border-black/5 px-4 py-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink/50">
                슬래시 커맨드
              </div>
              {SLASH_COMMANDS.filter((c) => c.cmd.startsWith(draft.split(/\s+/)[0])).map(
                (c) => (
                  <button
                    key={c.cmd}
                    onClick={() => setDraft(c.example)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-2 text-left hover:bg-black/5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[13px] font-semibold text-sky-700">
                        {c.cmd}
                      </span>
                      <span className="text-[12px] text-ink/70">{c.desc}</span>
                    </div>
                    <span className="font-mono text-[10.5px] text-ink/40">
                      {c.example}
                    </span>
                  </button>
                ),
              )}
            </div>
          </div>
        )}

        {/* 입력창 */}
        <div className="border-t border-black/5 bg-white/50 px-6 py-4 backdrop-blur">
          <div className="mx-auto max-w-3xl">
            <div className="flex items-end gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3 shadow-sm focus-within:border-black/30">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder={`${active.name}에게 메시지… (@ 로 호출, / 로 명령)`}
                className="flex-1 resize-none bg-transparent text-[14px] placeholder:text-ink/35 focus:outline-none"
                style={{ maxHeight: 140 }}
              />
              <button
                onClick={handleSend}
                disabled={!draft.trim()}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black text-white transition hover:bg-black/80 disabled:bg-black/20"
                aria-label="Send"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
                  <path
                    d="M4 12 20 4l-8 16-2-7-6-1z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
            <p className="mt-2 text-[10.5px] text-ink/40">
              Enter 전송 · Shift+Enter 줄바꿈 · @ 호출 · / 명령 ·{" "}
              <span className="font-mono text-ink/60">/task</span>,{" "}
              <span className="font-mono text-ink/60">/assign</span>,{" "}
              <span className="font-mono text-ink/60">/status</span>,{" "}
              <span className="font-mono text-ink/60">/summary</span>
            </p>
          </div>
        </div>
      </section>

      {/* ─── 우측 패널 ─── */}
      <aside className="flex flex-col gap-6 overflow-y-auto border-l border-black/5 bg-[#f1efe8] px-6 py-8">
        <div className="flex flex-col items-center text-center">
          <AvatarWithPresence
            src={active.avatar}
            alt={active.name}
            size={88}
            presence={active.presence}
            ringClass="ring-2 ring-white"
            dotClass="h-3.5 w-3.5 border-2 border-white"
          />
          <h3 className="mt-4 text-base font-semibold">{active.name}</h3>
          <p className="text-[11px] uppercase tracking-[0.18em] text-ink/50">
            {active.title}
          </p>
          <div className="mt-2 text-[11px] text-ink/50">
            {PRESENCE_LABEL[active.presence]}
          </div>
        </div>

        <p className="text-[12.5px] leading-relaxed text-ink/70">{active.bio}</p>

        {/* 현재 작업 미니 카드 */}
        {active.currentTask && (
          <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-600">
              현재 작업
            </div>
            <div className="mt-1 text-[13px] font-medium text-sky-900">
              {active.currentTask}
            </div>
          </div>
        )}

        {/* 통계 */}
        <div className="grid grid-cols-2 gap-2">
          <StatCard label="Conversations" value={active.conversations ?? 0} />
          <StatCard label="State" value={stateLabel(active.state)} />
        </div>

        {/* Skills */}
        <div>
          <div className="mb-3 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-ink/50">
            Skills
          </div>
          <div className="flex flex-wrap gap-1.5">
            {active.skills?.map((s) => (
              <span
                key={s}
                className="rounded-md border border-black/10 bg-white px-2 py-1 text-[11px] text-ink/75"
              >
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* Project */}
        <div>
          <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-ink/50">
            Project
          </div>
          <div className="text-[13px] text-ink/80">{active.project ?? "—"}</div>
        </div>

        {/* 온라인 팀원 */}
        <div>
          <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-ink/50">
            Team
          </div>
          <div className="flex flex-wrap gap-1.5">
            {HARNESSES.filter((h) => h.kind === "dm").map((h) => (
              <button
                key={h.id}
                onClick={() => setActiveId(h.id)}
                className="group relative"
                title={`${h.name} · ${PRESENCE_LABEL[h.presence]}`}
              >
                <AvatarWithPresence
                  src={h.avatar}
                  alt={h.name}
                  size={28}
                  presence={h.presence}
                />
              </button>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

/* ───────── Subcomponents ───────── */

function SectionLabel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`px-5 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/40 ${className}`}
    >
      {children}
    </div>
  );
}

function SidebarItem({
  harness,
  active,
  onClick,
}: {
  harness: Harness;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left transition ${
        active ? "bg-black/10" : "hover:bg-black/5"
      }`}
    >
      <AvatarWithPresence
        src={harness.avatar}
        alt={harness.name}
        size={30}
        presence={harness.presence}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[13px] font-medium">{harness.name}</span>
          {harness.state === "running" && (
            <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-sky-500" />
          )}
        </div>
        <div className="truncate text-[10.5px] text-ink/45">
          {harness.currentTask ?? (harness.kind === "room" ? harness.persona : harness.title)}
        </div>
      </div>
      {harness.unreadCount ? (
        <span className="shrink-0 rounded-full bg-rose-500 px-1.5 py-0.5 text-[9.5px] font-semibold text-white">
          {harness.unreadCount}
        </span>
      ) : null}
    </button>
  );
}

function AvatarWithPresence({
  src,
  alt,
  size = 32,
  presence,
  ringClass = "",
  dotClass = "",
}: {
  src: string;
  alt: string;
  size?: number;
  presence?: Presence;
  ringClass?: string;
  dotClass?: string;
}) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className={`h-full w-full overflow-hidden rounded-full bg-white shadow-sm ring-1 ring-black/5 ${ringClass}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="h-full w-full" />
      </div>
      {presence && (
        <span
          className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-white ${PRESENCE_COLOR[presence]} ${dotClass}`}
        />
      )}
    </div>
  );
}

function DateSeparator({ label }: { label: string }) {
  return (
    <div className="relative flex items-center gap-3 py-2">
      <div className="h-px flex-1 bg-black/10" />
      <span className="rounded-full border border-black/10 bg-white px-3 py-1 text-[10.5px] font-medium uppercase tracking-[0.14em] text-ink/50">
        {label}
      </span>
      <div className="h-px flex-1 bg-black/10" />
    </div>
  );
}

function MessageRow({
  message,
  pickerOpen,
  onOpenPicker,
  onToggleReaction,
}: {
  message: Message;
  pickerOpen: boolean;
  onOpenPicker: (id: string) => void;
  onToggleReaction: (msgId: string, emoji: string) => void;
}) {
  // 시스템 이벤트
  if (message.role === "system" && message.event) {
    return <SystemEventRow message={message} />;
  }

  // 사용자 메시지
  if (message.role === "user") {
    return (
      <div className="group relative flex justify-end">
        <div className="flex max-w-[70%] flex-row-reverse items-start gap-3">
          <AvatarWithPresence
            src={MY_AVATAR}
            alt={MY_NAME}
            size={32}
            presence="online"
          />
          <div className="flex flex-col items-end">
            <div className="rounded-2xl rounded-tr-sm bg-black px-4 py-2.5 text-[14px] text-white">
              {renderInline(message.text ?? "")}
            </div>
            <div className="mt-1 flex items-center gap-2 text-[10px] text-ink/40">
              <span>{message.time}</span>
              <QuickActions
                onReact={() => onOpenPicker(message.id)}
                rightAlign
              />
            </div>
            {message.reactions && message.reactions.length > 0 && (
              <ReactionBar
                reactions={message.reactions}
                onToggle={(emoji) => onToggleReaction(message.id, emoji)}
              />
            )}
            {pickerOpen && (
              <EmojiPicker
                onPick={(emoji) => onToggleReaction(message.id, emoji)}
                rightAlign
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  // 에이전트 메시지
  const harness = byId(message.authorId);
  if (!harness) return null;

  return (
    <div className="group relative flex gap-3">
      <AvatarWithPresence
        src={harness.avatar}
        alt={harness.name}
        size={32}
        presence={harness.presence}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-[13px] font-semibold">{harness.name}</span>
          <span className="text-[10.5px] text-ink/40">{harness.title}</span>
          {message.pinned && (
            <span className="text-[10px] text-amber-600">📌 pinned</span>
          )}
          <span className="ml-auto flex items-center gap-2 text-[10px] text-ink/40">
            <QuickActions onReact={() => onOpenPicker(message.id)} />
            <span>{message.time}</span>
          </span>
        </div>

        {message.text && (
          <div className="mt-1 inline-block max-w-full rounded-2xl rounded-tl-sm border border-black/5 bg-white px-4 py-2.5 text-[14px] leading-relaxed text-ink/90 shadow-sm">
            {renderInline(message.text)}
          </div>
        )}

        {message.task && <TaskCardView task={message.task} />}
        {message.attachments && <Attachments items={message.attachments} />}

        {message.reactions && message.reactions.length > 0 && (
          <ReactionBar
            reactions={message.reactions}
            onToggle={(emoji) => onToggleReaction(message.id, emoji)}
          />
        )}

        {message.threadCount && message.threadCount > 0 && (
          <button className="mt-1.5 flex items-center gap-1.5 text-[11px] text-sky-700 hover:underline">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none">
              <path
                d="M4 4v8a4 4 0 0 0 4 4h12M16 20l4-4-4-4"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            스레드 답글 {message.threadCount}개
          </button>
        )}

        {pickerOpen && (
          <EmojiPicker onPick={(emoji) => onToggleReaction(message.id, emoji)} />
        )}
      </div>
    </div>
  );
}

function renderInline(text: string) {
  // @mention 을 하이라이트
  const parts = text.split(/(@[\w가-힣-]+)/g);
  return (
    <span className="whitespace-pre-wrap break-words">
      {parts.map((p, i) =>
        p.startsWith("@") ? (
          <span
            key={i}
            className="rounded bg-sky-500/15 px-1 py-0.5 font-medium text-sky-700"
          >
            {p}
          </span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </span>
  );
}

function SystemEventRow({ message }: { message: Message }) {
  const ev = message.event!;
  const styles: Record<string, string> = {
    task_assigned: "border-sky-200 bg-sky-50/60 text-sky-900",
    task_status: "border-violet-200 bg-violet-50/60 text-violet-900",
    harness_failed: "border-amber-300 bg-amber-50/70 text-amber-900",
    user_joined: "border-emerald-200 bg-emerald-50/60 text-emerald-800",
  };
  const icons: Record<string, string> = {
    task_assigned: "➜",
    task_status: "●",
    harness_failed: "⚠︎",
    user_joined: "👋",
  };
  return (
    <div
      className={`mx-auto flex max-w-xl items-center gap-2 rounded-lg border px-3 py-2 text-[11.5px] ${styles[ev.kind]}`}
    >
      <span className="text-base">{icons[ev.kind]}</span>
      <span className="flex-1">{ev.text}</span>
      <span className="text-[10px] opacity-60">{message.time}</span>
    </div>
  );
}

function TaskCardView({ task }: { task: Message["task"] }) {
  if (!task) return null;
  const assignee = task.assigneeId ? byId(task.assigneeId) : undefined;
  return (
    <div className="mt-2 max-w-md rounded-xl border border-black/10 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/45">
            Task
          </div>
          <div className="mt-0.5 text-[14px] font-semibold">{task.title}</div>
        </div>
        <span
          className={`shrink-0 rounded-md border px-2 py-0.5 text-[10.5px] font-medium ${STATUS_CLASSES[task.status]}`}
        >
          {STATUS_LABEL[task.status]}
        </span>
      </div>

      {/* 진행률 바 */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-[10.5px] text-ink/55">
          <span>진행률</span>
          <span className="tabular-nums">{task.progress}%</span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/5">
          <div
            className={`h-full rounded-full transition-all ${STATUS_BAR[task.status]}`}
            style={{ width: `${task.progress}%` }}
          />
        </div>
      </div>

      {(assignee || task.eta) && (
        <div className="mt-3 flex items-center gap-3 text-[11px] text-ink/55">
          {assignee && (
            <div className="flex items-center gap-1.5">
              <AvatarWithPresence
                src={assignee.avatar}
                alt={assignee.name}
                size={18}
              />
              <span className="font-medium text-ink/80">{assignee.name}</span>
            </div>
          )}
          {task.eta && (
            <div className="flex items-center gap-1">
              <span>⏱</span>
              <span>{task.eta}</span>
            </div>
          )}
        </div>
      )}

      {task.note && (
        <div className="mt-2 rounded-md bg-black/5 px-3 py-2 text-[11.5px] text-ink/70">
          {task.note}
        </div>
      )}
    </div>
  );
}

function Attachments({ items }: { items: NonNullable<Message["attachments"]> }) {
  const icons: Record<string, string> = {
    pdf: "📄",
    image: "🖼",
    code: "💻",
    link: "🔗",
  };
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {items.map((a, i) => (
        <div
          key={i}
          className="flex items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-2 text-[11.5px] shadow-sm"
        >
          <span className="text-base">{icons[a.kind]}</span>
          <div>
            <div className="font-medium text-ink/85">{a.name}</div>
            {a.meta && <div className="text-[10px] text-ink/45">{a.meta}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

function ReactionBar({
  reactions,
  onToggle,
}: {
  reactions: Reaction[];
  onToggle: (emoji: string) => void;
}) {
  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {reactions.map((r) => (
        <button
          key={r.emoji}
          onClick={() => onToggle(r.emoji)}
          className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition ${
            r.mine
              ? "border-sky-300 bg-sky-50 text-sky-800"
              : "border-black/10 bg-white text-ink/70 hover:border-black/25"
          }`}
        >
          <span>{r.emoji}</span>
          <span className="tabular-nums">{r.count}</span>
        </button>
      ))}
    </div>
  );
}

function EmojiPicker({
  onPick,
  rightAlign = false,
}: {
  onPick: (emoji: string) => void;
  rightAlign?: boolean;
}) {
  return (
    <div
      className={`mt-1.5 flex max-w-xs flex-wrap gap-1 rounded-xl border border-black/10 bg-white p-2 shadow-lg ${rightAlign ? "self-end" : ""}`}
    >
      {EMOJI_PALETTE.map((e) => (
        <button
          key={e}
          onClick={() => onPick(e)}
          className="flex h-7 w-7 items-center justify-center rounded-md text-[16px] hover:bg-black/5"
        >
          {e}
        </button>
      ))}
    </div>
  );
}

function QuickActions({
  onReact,
  rightAlign = false,
}: {
  onReact: () => void;
  rightAlign?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 opacity-0 transition group-hover:opacity-100 ${rightAlign ? "mr-1" : ""}`}
    >
      <button
        onClick={onReact}
        className="rounded-md border border-black/10 bg-white px-1.5 py-0.5 text-[12px] hover:border-black/30"
        title="반응 추가"
      >
        😊
      </button>
    </span>
  );
}

function TypingIndicator({ harness }: { harness: Harness }) {
  return (
    <div className="flex gap-3">
      <AvatarWithPresence
        src={harness.avatar}
        alt={harness.name}
        size={32}
        presence={harness.presence}
      />
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold">{harness.name}</div>
        <div className="mt-1 inline-flex items-center gap-1 rounded-2xl rounded-tl-sm border border-black/5 bg-white px-4 py-3 shadow-sm">
          <Dot delay={0} />
          <Dot delay={150} />
          <Dot delay={300} />
        </div>
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink/40"
      style={{ animationDelay: `${delay}ms`, animationDuration: "900ms" }}
    />
  );
}

function StateBadge({ state }: { state?: Harness["state"] }) {
  if (!state) return null;
  const cls =
    state === "running"
      ? "bg-emerald-100 text-emerald-700"
      : state === "failed"
        ? "bg-rose-100 text-rose-700"
        : "bg-stone-100 text-stone-600";
  const label =
    state === "running" ? "● running" : state === "failed" ? "● failed" : "○ idle";
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${cls}`}>
      {label}
    </span>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-xl border border-black/10 bg-white px-3 py-3">
      <div className="text-[20px] font-semibold leading-none tabular-nums">
        {value}
      </div>
      <div className="mt-1.5 text-[10px] uppercase tracking-[0.14em] text-ink/45">
        {label}
      </div>
    </div>
  );
}

function stateLabel(state?: Harness["state"]) {
  if (!state) return "—";
  if (state === "running") return "ON";
  if (state === "failed") return "ERR";
  return "IDLE";
}

function groupByDate(messages: Message[]): [string, Message[]][] {
  const map = new Map<string, Message[]>();
  for (const m of messages) {
    const k = m.dateKey;
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(m);
  }
  return Array.from(map.entries());
}

/* ───────── Mock reply generator ───────── */

function mockReply(agent: Harness, userText: string): string {
  const first = userText.slice(0, 60);
  const templates: Record<string, string[]> = {
    main: [
      `네 ${first.length ? `"${first}"` : "그 건"} 바로 정리해드릴게요. 우선 핵심 목표부터 여쭤봐도 될까요?`,
      `제가 먼저 팀원 누구에게 배정할지 정리해볼게요. 30초만요.`,
    ],
    "content-team": [
      `좋아요! 🎨 톤 앤 매너 기준(감성/정보/유머)만 알려주시면 초안 3개 바로 뽑아드릴게요.`,
      `카드뉴스로 가면 9컷, 숏폼이면 30초 훅형으로 짤게요. 어느 쪽이 좋으세요?`,
    ],
    "detailpage-team": [
      `상세페이지 시작할게요. 카테고리·가격대·메인 경쟁사 3개만 주세요. 그럼 뼈대 뽑아드립니다.`,
      `CVR 기준으로 접근할게요. 타깃이 신규 유입인지 재구매인지에 따라 구성이 크게 달라져요.`,
    ],
    "fullstack-dev-stack": [
      `접수했습니다. 데이터 모델부터 잡고 API → UI 순으로 갈게요.`,
      `이 요구면 서버 액션으로 처리 가능해요. 바로 구현 들어갈게요.`,
    ],
    "tiktok-beauty-crawl": [
      `키워드랑 기간(예: 최근 7일) 주시면 바로 크롤링 돌릴게요. 썸네일도 같이 긁을까요?`,
    ],
  };
  const pool = templates[agent.slug] ?? [
    `${agent.name}예요. "${first}" 관련해서 바로 확인해볼게요.`,
  ];
  return pool[Math.floor(Math.random() * pool.length)];
}
