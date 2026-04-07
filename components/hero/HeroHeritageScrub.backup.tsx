"use client";

import { useEffect, useRef, useState } from "react";
import { CliTerminal } from "./CliTerminal";

/**
 * HeroHeritageScrub (Cinematic Timeline)
 * --------------------------------------
 * 다크 시네마틱 톤의 1972 → 2026 헤리티지 타임라인 스크러버.
 *
 * 디자인 레퍼런스
 * - 완전한 블랙 배경
 * - 플레이헤드 뒤 웜 렌즈 플레어(앰버/오렌지) 글로우
 * - 얇은 틱 라인, 양끝 그라데이션 페이드
 * - 넓은 자간의 얇은 라이트 타이포
 *
 * 레이아웃
 * - 좌측: 메인 카피(3개, 이미지 3~4장당 교체)
 * - 우측: 이미지가 우→좌로 수평 슬라이드, 뒤에 웜 스포트라이트
 * - 하단: 1972~2026 타임라인 스크러버, 플레이헤드가 스크롤에 따라 이동
 */

const TOTAL = 10;
// 마지막 프레임(2026 · CLI)에 도달한 뒤 곧바로 다음 섹션으로 내려가지 않도록
// 스크롤 "2 beats"만큼 추가 버퍼를 둔다. 이 구간 동안 progress는 1에 고정된다.
const TRAIL_BUFFER = 2;
const IMAGES = Array.from(
  { length: TOTAL },
  (_, i) => `/heritage/${String(i + 1).padStart(2, "0")}.png`,
);

const START_YEAR = 1972;
const END_YEAR = 2026;
const MAJOR_TICKS = [1972, 1980, 1990, 2000, 2010, 2020, 2026];

// 카피 4개
// - Act 1: 이미지 0~2 (3장)
// - Act 2: 이미지 3~5 (3장)
// - Act 3: 이미지 6~8 (3장)
// - Finale: 이미지 9 (마지막 1장, "RelayAX")
const COPIES = [
  "우리는 지금껏 '문제 해결'을 위해\n도구를 배웠습니다",
  "이제 우리는 도구를 배우지 않습니다.\n단지 '질문'을 던질뿐입니다.",
  "한 줄의 명령,\n그리고 AI 에이전트.",
  "RelayAX",
];
const copyIndexFor = (floatIndex: number): number => {
  const idx = Math.round(floatIndex);
  if (idx >= TOTAL - 1) return 3; // 마지막 이미지 전용
  return Math.min(2, Math.floor(idx / 3));
};

export function HeroHeritageScrub() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reduced) return;
    const track = trackRef.current;
    if (!track) return;

    let raf = 0;
    const compute = () => {
      const rect = track.getBoundingClientRect();
      const total = track.offsetHeight - window.innerHeight;
      const rawP = Math.min(1, Math.max(0, -rect.top / Math.max(1, total)));
      // 뒤쪽 버퍼 구간은 progress 1로 고정 — 2026/CLI 프레임이 정지 상태로 유지됨
      const usefulEnd = TOTAL / (TOTAL + TRAIL_BUFFER);
      const p = Math.min(1, rawP / usefulEnd);
      setProgress(p);
      raf = 0;
    };

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(compute);
    };

    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reduced]);

  // 스크롤 진행도를 float 인덱스(0..TOTAL-1)로 변환
  const rawFloat = progress * (TOTAL - 1);

  // 자석 스냅 — 정수 인덱스(각 이미지 중앙)로 착 끌려오는 이징
  // delta ∈ [-0.5, 0.5]에 power curve 적용: 중앙 근처에서는 값이 천천히 벗어나고
  // 경계 부근에서는 빠르게 점프 → 이미지가 가운데에 오래 머무는 "자석" 느낌
  const nearest = Math.round(rawFloat);
  const delta = rawFloat - nearest;
  const SNAP = 2.8;
  const snapped =
    nearest +
    Math.sign(delta) * 0.5 * Math.pow(Math.min(1, Math.abs(delta) * 2), SNAP);
  const floatIndex = Math.max(0, Math.min(TOTAL - 1, snapped));

  const copyIdx = copyIndexFor(floatIndex);
  const currentCopy = COPIES[copyIdx];
  const year = Math.round(START_YEAR + progress * (END_YEAR - START_YEAR));
  const trackTranslate = -(floatIndex * 100) / TOTAL;

  // Reduced motion 폴백
  if (reduced) {
    return (
      <section className="bg-paper px-6 py-24 text-ink">
        <div className="mx-auto max-w-6xl space-y-24">
          {IMAGES.map((src, i) => (
            <div key={src} className="grid gap-10 md:grid-cols-2 md:items-center">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-ink/50">
                  {Math.round(
                    START_YEAR + (i / (TOTAL - 1)) * (END_YEAR - START_YEAR),
                  )}
                </p>
                <h2 className="mt-4 text-4xl font-semibold leading-tight text-ink">
                  {COPIES[copyIndexFor(i)]}
                </h2>
              </div>
              <img
                src={src}
                alt=""
                className="w-full"
                loading="lazy"
                decoding="async"
              />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      ref={trackRef}
      className="relative bg-paper text-ink"
      style={{ height: `${(TOTAL + TRAIL_BUFFER) * 55}vh` }}
      aria-label="RelayAX heritage timeline"
    >
      <div className="sticky top-0 flex h-screen flex-col overflow-hidden">
        {/* 상단: 카피 + 슬라이딩 이미지 (1:1 2-column) */}
        <div className="relative mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 items-center gap-10 px-6 md:grid-cols-2 md:gap-16 md:px-10">
          {/* 좌측: 카피 */}
          <div className="flex flex-col justify-center">
            <p className="text-[11px] uppercase tracking-[0.35em] text-ink/40 tabular-nums">
              RelayAX Heritage · {year}
            </p>
            <h1
              key={`copy-${copyIdx}`}
              className="mt-6 whitespace-pre text-[clamp(1.5rem,2.2vw,2rem)] font-semibold leading-[1.35] tracking-tight text-ink animate-fade"
            >
              {currentCopy}
            </h1>
          </div>

          {/*
            우측: 수평 슬라이딩 이미지 트랙
            - 그리드 셀 비율(1:1)은 그대로 두고, 슬라이더 내부 컨테이너만 좌우로
              bleed 시켜 슬롯 크기를 키운다 → 이미지가 자연스럽게 커진다.
            - slot width = 슬라이더 컨테이너 width = 그리드 셀의 1.4배
            - 좌우 overflow는 visible 허용 (패딩 박스를 넘쳐도 OK)
          */}
          <div
            className="relative h-[62vh] w-full overflow-hidden"
            style={{
              // 좌우 가장자리 페이드 — 이미지가 우→좌로 흐를 때 부드럽게 등장/퇴장
              maskImage:
                "linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)",
              WebkitMaskImage:
                "linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)",
            }}
          >
            <div
              className="absolute top-0 bottom-0"
              style={{ left: "-20%", right: "-20%" }}
            >
              <div
                className="flex h-full"
                style={{
                  width: `${TOTAL * 100}%`,
                  transform: `translate3d(${trackTranslate}%, 0, 0)`,
                  willChange: "transform",
                }}
              >
                {IMAGES.map((src, i) => {
                  const isLast = i === TOTAL - 1;
                  return (
                    <div
                      key={src}
                      className="flex h-full shrink-0 items-center justify-center px-14"
                      style={{ width: `${100 / TOTAL}%` }}
                    >
                      {isLast ? (
                        // 마지막 슬롯: CLI 터미널 컴포넌트
                        <div
                          className="w-full max-w-[680px] px-4"
                          style={{
                            filter:
                              "drop-shadow(0 24px 30px rgba(30,20,10,0.18)) drop-shadow(0 6px 10px rgba(30,20,10,0.08))",
                          }}
                        >
                          <CliTerminal />
                        </div>
                      ) : (
                        <img
                          src={src}
                          alt=""
                          loading={i === 0 ? "eager" : "lazy"}
                          decoding="async"
                          className="h-full w-full object-contain"
                          style={{
                            filter:
                              "drop-shadow(0 24px 30px rgba(30,20,10,0.14)) drop-shadow(0 6px 10px rgba(30,20,10,0.08))",
                          }}
                          draggable={false}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 하단: 타임라인 스크러버 */}
        <div className="relative mx-auto w-full max-w-[1500px] px-10 pb-16 md:pb-20">
          {/* 타임라인 라인 + 틱 — 양끝 페이드 마스크 */}
          <div
            className="relative h-10"
            style={{
              maskImage:
                "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
              WebkitMaskImage:
                "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
            }}
          >
            {/* 베이스 라인 */}
            <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-ink/25" />

            {/* 마이너 틱 (매년) */}
            {Array.from(
              { length: END_YEAR - START_YEAR + 1 },
              (_, i) => START_YEAR + i,
            ).map((y) => {
              const pct = ((y - START_YEAR) / (END_YEAR - START_YEAR)) * 100;
              const isMajor = MAJOR_TICKS.includes(y);
              return (
                <div
                  key={`tick-${y}`}
                  className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${pct}%` }}
                >
                  <div
                    className={`${isMajor ? "h-4" : "h-1.5"} w-px ${
                      isMajor ? "bg-ink/60" : "bg-ink/25"
                    }`}
                  />
                </div>
              );
            })}

            {/* 플레이헤드 */}
            <div
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${progress * 100}%` }}
            >
              <div className="h-2.5 w-2.5 rounded-full bg-ink" />
            </div>
          </div>

          {/* 메이저 연도 라벨 */}
          <div
            className="relative mt-3 h-5"
            style={{
              maskImage:
                "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)",
              WebkitMaskImage:
                "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)",
            }}
          >
            {MAJOR_TICKS.map((y) => {
              const pct = ((y - START_YEAR) / (END_YEAR - START_YEAR)) * 100;
              return (
                <div
                  key={`label-${y}`}
                  className="absolute -translate-x-1/2 text-[11px] tabular-nums tracking-[0.15em] text-ink/55"
                  style={{ left: `${pct}%` }}
                >
                  {y}
                </div>
              );
            })}
          </div>

          {/* 하단 캡션 — "YEAR 2006" */}
          <div className="mt-8 text-center">
            <p
              key={`year-${year}`}
              className="text-[13px] font-light uppercase tracking-[0.5em] text-ink/65 animate-fade-soft tabular-nums"
            >
              YEAR&nbsp;&nbsp;{year}
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        /* 카피 교체 시 단순 페이드 인 (이전 카피는 unmount되며 자연 사라짐) */
        .animate-fade {
          animation: fadeIn 600ms ease-out both;
        }
        .animate-fade-soft {
          animation: fadeSoft 250ms ease-out both;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes fadeSoft {
          from {
            opacity: 0.4;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </section>
  );
}
