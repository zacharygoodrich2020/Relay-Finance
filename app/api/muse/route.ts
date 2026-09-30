import { NextRequest, NextResponse } from "next/server";
import type { MuseIntent, MuseIntentResponse } from "@/services/muse/intent";

const SYSTEM = `You are Muse, the natural-language command router for Relay Finance.
Convert the user's request into exactly one JSON intent. Never calculate financial results yourself.
Allowed intent types:
answer {message}
get_balance
get_cash_flow
get_lowest_balance
run_scenario {amount,date,label?}
set_balance {amount}
add_income {name,amount,frequency,startDate}
add_expense {name,amount,dueDate,recurring,frequency?}

Rules:
- Dates must be YYYY-MM-DD.
- Use the current date supplied in the request to resolve relative dates.
- Never invent an amount, date, frequency, or transaction name required for a write.
- If required information is missing, return answer with a short question asking for it.
- A hypothetical spend is run_scenario, never add_expense.
- Return JSON only: {"intent":{...}}.`;

function validIntent(value: any): value is MuseIntent {
  if (!value || typeof value !== "object" || typeof value.type !== "string") return false;
  const allowed = new Set([
    "answer",
    "get_balance",
    "get_cash_flow",
    "get_lowest_balance",
    "run_scenario",
    "set_balance",
    "add_income",
    "add_expense",
  ]);
  return allowed.has(value.type);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    const result: MuseIntentResponse = {
      intent: {
        type: "answer",
        message:
          "Muse reasoning is in local mode. I can still use Relay's built-in commands; configure OPENROUTER_API_KEY to enable free-form language routing.",
      },
      source: "local",
    };
    return NextResponse.json(result);
  }

  const model = process.env.MUSE_MODEL || "openai/gpt-4o-mini";
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "Relay Finance - Muse",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 300,
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: JSON.stringify({
            currentDate: new Date().toISOString().slice(0, 10),
            message,
          }),
        },
      ],
    }),
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: `Muse provider request failed (${response.status})` },
      { status: 502 }
    );
  }

  const data = await response.json();
  const raw = data?.choices?.[0]?.message?.content;
  if (typeof raw !== "string") {
    return NextResponse.json({ error: "Muse returned no intent" }, { status: 502 });
  }

  try {
    const cleaned = raw.replace(/^\`\`\`(?:json)?\s*/i, "").replace(/\s*\`\`\`$/, "");
    const parsed = JSON.parse(cleaned);
    if (!validIntent(parsed.intent)) throw new Error("Invalid intent");
    const result: MuseIntentResponse = { intent: parsed.intent, source: "llm" };
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Muse returned an invalid intent" }, { status: 502 });
  }
}
