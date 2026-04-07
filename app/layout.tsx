import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RelayAX — AI Agent Package Manager",
  description: "플로피 디스크부터 AI까지. 업무와 공유의 헤리티지, 그 다음은 RelayAX.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="font-sans">{children}</body>
    </html>
  );
}
