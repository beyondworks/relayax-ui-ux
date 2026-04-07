import { HeroHeritageScrub } from "@/components/hero/HeroHeritageScrub";

export default function HomePage() {
  return (
    <main>
      <HeroHeritageScrub />
      <section className="px-6 py-32 text-center text-sm text-ink/50">
        다음 섹션 자리 (현재는 히어로 스크러빙만 구현)
      </section>
    </main>
  );
}
