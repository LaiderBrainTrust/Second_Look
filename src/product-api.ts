export type Session = {
  hosted: boolean;
  authenticated: boolean;
  mode?: "account" | "presenter";
  role?: "lp" | "gp" | "buyer";
  user?: { id: string; handle: string; displayName: string };
};
export async function request(path: string, body?: unknown, role = "lp") {
  const response = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json", "x-demo-role": role },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (response.status === 401 && path !== "/api/session/login") {
    window.dispatchEvent(new Event("second-look-session-expired"));
  }
  const value = await response.json();
  if (!response.ok)
    throw Error(
      value.error ?? "We could not save that. Refresh the case and try again.",
    );
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
