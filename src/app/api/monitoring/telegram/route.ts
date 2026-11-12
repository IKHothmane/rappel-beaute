import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { publicRoute } from "@/lib/http/route-scope";
import { runMonitorCommand } from "@/lib/monitoring/commands";
import { allowTelegramCommand, sendTelegramMessage } from "@/lib/monitoring/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TelegramUpdate = {
  message?: {
    text?: string;
    chat?: { id?: number; type?: string };
    from?: { id?: number; is_bot?: boolean };
  };
};

function secretMatches(expected: string, provided: string): boolean {
  const left = Buffer.from(expected);
  const right = Buffer.from(provided);
  if (left.length !== right.length || left.length < 16) return false;
  return timingSafeEqual(left, right);
}

function authorizedChat(update: TelegramUpdate): boolean {
  const chat = update.message?.chat;
  const from = update.message?.from;
  const expected = process.env.TELEGRAM_CHAT_ID?.trim() ?? "";
  if (!expected || !chat || chat.type !== "private") return false;
  if (from?.is_bot) return false;
  if (from?.id == null || chat.id == null) return false;
  if (String(from.id) !== String(chat.id)) return false;
  return String(chat.id) === expected;
}

export const POST = publicRoute(async function POST(request: NextRequest) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET?.trim() ?? "";
  const provided = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (!secretMatches(expected, provided)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (process.env.MONITORING_ENABLED !== "true") {
    return NextResponse.json({ ok: true });
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: true });
  }

  const text = update.message?.text?.trim() ?? "";
  if (!text.startsWith("/") || text.length > 100 || !authorizedChat(update)) {
    return NextResponse.json({ ok: true });
  }

  const chatId = String(update.message?.chat?.id ?? "");
  if (!(await allowTelegramCommand(chatId))) {
    return NextResponse.json({ ok: true });
  }

  try {
    const reply = await runMonitorCommand(text);
    await sendTelegramMessage(reply);
  } catch {
    // Une réponse 500 ferait répéter Telegram indéfiniment.
  }
  return NextResponse.json({ ok: true });
});
