import type { Metadata } from "next";
import { RelayHub } from "@/components/hub/RelayHub";

export const metadata: Metadata = {
  title: "Relay Hub — RelayAX",
  description:
    "Slack + Discord + Claude Desktop Cowork 모티브의 멀티 에이전트 채팅 허브. Notion 스타일 동료 캐릭터로 의인화된 AI 팀원과 실시간 협업하세요.",
};

export default function HubPage() {
  return <RelayHub />;
}
