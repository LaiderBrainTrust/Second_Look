export type Session = {
  hosted: boolean;
  authenticated: boolean;
  mode?: "account" | "presenter";
  role?: "lp" | "gp" | "buyer";
  user?: { id: string; handle: string; displayName: string };
};
export async function request(path: string, body?: unknown, role = "lp") {
  let response: Response;
  try {
    response = await fetch(path, {
      method: body === undefined ? "GET" : "POST",
      headers: { "Content-Type": "application/json", "x-demo-role": role },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    throw Error(
      "We couldn’t reach Second Look. Check your connection and try again. Your edits are still here.",
    );
  }
  if (response.status === 401 && path !== "/api/session/login") {
    window.dispatchEvent(new Event("second-look-session-expired"));
  }
  const value = await response.json().catch(() => null);
  if (!response.ok || value === null) {
    if (
      response.status === 409 &&
      value?.error ===
        "This case changed. Refresh and review the current version."
    )
      throw Error(
        "Someone updated this review while you were working. Your edits are still here. Load the latest version before saving again.",
      );
    throw Error(
      value?.error ??
        "Second Look couldn’t complete that request. Please try again.",
    );
  }
  return value;
}
export const currency = (value: number | null | undefined) =>
  value == null
    ? "Not confirmed"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
      }).format(value / 100);
export function cents(
  raw: FormDataEntryValue | null,
  allowNegative = false,
): number {
  const value = String(raw ?? "")
    .trim()
    .replace(/^\$/, "")
    .replaceAll(",", "");
  if (
    !(allowNegative ? /^-?\d+(\.\d{1,2})?$/ : /^\d+(\.\d{1,2})?$/).test(value)
  )
    throw Error("Enter a dollar amount with no more than two decimal places.");
  const amount = Math.round(Number(value) * 100);
  if (!Number.isSafeInteger(amount) || Math.abs(amount) > 1_000_000_000_000)
    throw Error("That amount is outside the supported range.");
  return amount;
}
export const readRoute = () => new URLSearchParams(location.hash.slice(1));
export function navigate(values: Record<string, string>) {
  location.hash = new URLSearchParams(values).toString();
}
