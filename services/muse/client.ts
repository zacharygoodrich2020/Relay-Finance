import type { MuseIntentResponse } from "./intent";

export async function routeMuseMessage(message: string): Promise<MuseIntentResponse> {
  const response = await fetch("/api/muse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || "Muse reasoning request failed");
  }
  return data as MuseIntentResponse;
}
