import type { Metadata } from "next";
import { AiAssistantPage } from "@/components/ai/ai-assistant-page";

export const metadata: Metadata = { title: "Assistant IA" };

export default function AiPage() {
  return <AiAssistantPage />;
}
