import { afterEach, expect, it, vi } from "vitest";
import { cents, request } from "../src/product-api";
import { confirmDiscardChanges } from "../src/useDraftGuard";
afterEach(() => vi.unstubAllGlobals());
it("accepts pasted dollar amounts without silently losing cents or permitting excess precision", () => {
  expect(cents("$700,000.25")).toBe(70000025);
  expect(cents("-2,000.50", true)).toBe(-200050);
  expect(() => cents("-100")).toThrow();
  expect(() => cents("$1.005")).toThrow();
  expect(() => cents("")).toThrow();
  expect(() => cents("1e5")).toThrow();
});
it("makes a failed connection actionable without exposing an exception", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
  );
  await expect(request("/api/cases")).rejects.toThrow("Check your connection");
});
it("handles a proxy error page and preserves the conflict recovery message", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response("<html>bad gateway</html>", { status: 502 }),
      ),
  );
  await expect(request("/api/cases")).rejects.toThrow("Please try again");
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            error: "This case changed. Refresh and review the current version.",
          }),
          { status: 409 },
        ),
      ),
  );
  await expect(request("/api/cases/a/commands", {})).rejects.toThrow(
    "Your edits are still here",
  );
});
it("asks before discarding a registered draft but never prompts for a clean view", () => {
  const target = Object.assign(new EventTarget(), {
    confirm: vi.fn(() => false),
  });
  vi.stubGlobal("window", target);
  expect(confirmDiscardChanges()).toBe(true);
  expect(target.confirm).not.toHaveBeenCalled();
  const listener = (e: Event) => e.preventDefault();
  target.addEventListener("second-look-check-drafts", listener);
  expect(confirmDiscardChanges()).toBe(false);
  target.confirm.mockReturnValue(true);
  expect(confirmDiscardChanges()).toBe(true);
  target.removeEventListener("second-look-check-drafts", listener);
  expect(confirmDiscardChanges()).toBe(true);
});

it("keeps specific conflict messages such as duplicate usernames", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ error: "Username is already taken." }), {
          status: 409,
        }),
      ),
  );
  await expect(request("/api/accounts/register", {})).rejects.toThrow(
    "Username is already taken.",
  );
});
