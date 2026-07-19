import { getChatGPTUser } from "../../chatgpt-auth";
import { regionalJson } from "../../../lib/regional-contract";

export async function requireLedgerUser() {
  const user = await getChatGPTUser();
  if (!user) return { ok: false as const, response: regionalJson({ error: "authentication_required" }, 401) };
  return { ok: true as const, user: { ...user, email: user.email.trim().toLowerCase() } };
}

export function normalizeReviewerEmail(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return false;
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
  return email;
}

export function ledgerFailure(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected ledger error";
  if (/no such table|D1 binding/i.test(message)) {
    return regionalJson({ error: "ledger_unavailable", message: "The durable decision ledger is not initialized." }, 503);
  }
  if (/UNIQUE constraint failed/i.test(message)) {
    return regionalJson({ error: "duplicate_decision", message: "This decision has already been recorded." }, 409);
  }
  console.error("Regional decision ledger request failed", error instanceof Error ? error.name : "UnknownError");
  return regionalJson({ error: "ledger_failed", message: "The durable decision ledger could not complete the request." }, 500);
}
