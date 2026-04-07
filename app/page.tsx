import Link from "next/link";
import { HeroHeritageScrub } from "@/components/hero/HeroHeritageScrub";

export default function HomePage() {
  return (
    <main>
      {/* 상단 네비게이션 — 고정, 히어로 위에 떠있음 */}
      <nav className="pointer-events-none fixed inset-x-0 top-0 z-50 flex items-center justify-between px-8 py-5">
        <div className="pointer-events-auto flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-[10px] font-bold text-paper">
            ▸
          </div>
          <span className="text-sm font-semibold tracking-tight text-ink">
            RelayAX
          </span>
        </div>
        <Link
          href="/hub"
          className="pointer-events-auto group inline-flex items-center gap-2 rounded-full border border-ink/15 bg-paper/80 px-4 py-2 text-[13px] font-medium text-ink backdrop-blur transition hover:border-ink/40 hover:bg-paper"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Relay Hub
          <svg
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="none"
            className="transition group-hover:translate-x-0.5"
          >
            <path
              d="M5 12h14M13 6l6 6-6 6"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      </nav>

      <HeroHeritageScrub />
      <section className="px-6 py-32 text-center text-sm text-ink/50">
        다음 섹션 자리 (현재는 히어로 스크러빙만 구현)
      </section>
    </main>
  );
}
