import { useEffect, useRef, useState } from "react";
import { confirmDiscardChanges, useDraftGuard } from "./useDraftGuard";
import { cents, navigate, request, type Session } from "./product-api";
export function Brand() {
  return (
    <a className="sl-brand" href="#">
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path
          d="M6 4h13v19H6zM13 10h13v19H13z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        />
      </svg>
      <span>
        Second Look<span>Clarity before commitment</span>
      </span>
    </a>
  );
}
export function AuthScreen({
  onLogin,
  invite,
}: {
  onLogin: () => Promise<void>;
  invite?: string;
}) {
  const [accessOpen, setAccessOpen] = useState(Boolean(invite));
  const accessRef = useRef<HTMLElement>(null);
  const exampleButtonRef = useRef<HTMLButtonElement>(null);
  const [mode, setMode] = useState<"login" | "register" | "example">("login"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  function openAccess(nextMode: typeof mode) {
    setMode(nextMode);
    setError("");
    setAccessOpen(true);
    requestAnimationFrame(() => {
      accessRef.current?.scrollIntoView({ block: "nearest" });
      accessRef.current?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
    });
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      if (mode === "example")
        await request("/api/session/login", { code: f.get("code") });
      else if (mode === "register" && invite) {
        const r = await request("/api/invitations/accept", {
          token: invite,
          handle: f.get("handle"),
          displayName: f.get("displayName"),
          password: f.get("password"),
        });
        navigate({ case: r.caseId, view: "conversation" });
      } else
        await request(
          mode === "register" ? "/api/accounts" : "/api/session/login",
          {
            handle: f.get("handle"),
            password: f.get("password"),
            ...(mode === "register"
              ? {
                  displayName: f.get("displayName"),
                  registrationCode: f.get("code"),
                }
              : {}),
          },
        );
      await onLogin();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="sl-entry">
      <header className="sl-entry-header">
        <Brand />
        <button type="button" className="sl-link-button" onClick={() => openAccess("login")}>Sign in</button>
      </header>
      <main className="sl-entry-layout">
        <section className="sl-intro">
          <p className="sl-eyebrow">For fund investors and their advisers</p>
          <h1>
            Before you sell,<br />
            know what<br />
            you’ll <em>keep.</em>
          </h1>
          <p className="sl-lead">
            Selling your share of a fund? Compare the offer, get missing answers,
            and see how changing terms affect the money you receive.
          </p>
          <div className="sl-home-actions">
            <button ref={exampleButtonRef} type="button" className="sl-primary" onClick={() => openAccess("example")}>Try the example <span aria-hidden="true">→</span></button>
            <a href="/presenter/">See the walkthrough</a>
          </div>
          <p className="sl-home-access-note">Have a team code? Explore the working example. Otherwise, start with the walkthrough.</p>
        </section>
        {!accessOpen && <section className="sl-home-comparison" aria-labelledby="home-comparison-title">
          <p className="sl-eyebrow">One offer. One important difference.</p>
          <h2 id="home-comparison-title">The offer is $700,000.<br />Who keeps the fund payout?</h2>
          <div className="sl-home-outcome">
            <div><h3>You keep the payout</h3><p>$700,000 from the buyer<br />+ $100,000 from the fund</p></div>
            <div className="sl-home-amount"><span>You receive</span><strong>$800,000</strong></div>
          </div>
          <div className="sl-home-outcome">
            <div><h3>The buyer keeps it</h3><p>$700,000 from the buyer<br />The fund payout goes to them</p></div>
            <div className="sl-home-amount"><span>You receive</span><strong>$700,000</strong></div>
          </div>
          <p className="sl-home-difference"><strong>$100,000 less for you.</strong> The headline price never changed.</p>
          <p className="sl-help">Illustrative example, before taxes and fees. Actual proceeds depend on the agreed terms.</p>
        </section>}
        {accessOpen && <section className="sl-auth" ref={accessRef} aria-label="Access Second Look">
          <h2>
            {invite
              ? "You’ve been invited to a sale review"
              : mode === "example"
                ? "Explore the team example"
                : mode === "register"
                  ? "Create your workspace"
                  : "Welcome to Second Look"}
          </h2>
          <p>
            {invite
              ? "Create an account if this is your first visit, or sign in. You’ll go straight to the review you were invited to."
              : mode === "example"
                ? "Use your team access code. The fund and sale in this example are fictional."
                : "Keep your sale offers, questions and decisions together."}
          </p>
          <div className="sl-tabs" aria-label="Access options">
            {(
              ["login", "register", ...(!invite ? ["example"] : [])] as const
            ).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => {
                  setMode(m as typeof mode);
                  setError("");
                }}
              >
                {m === "login"
                  ? "Sign in"
                  : m === "register"
                    ? "Create account"
                    : "Team example"}
              </button>
            ))}
          </div>
          <form onSubmit={submit}>
            {mode !== "example" && (
              <>
                <label>
                  Username
                  <input
                    name="handle"
                    autoComplete="username"
                    required
                    minLength={3}
                    maxLength={60}
                    pattern="[A-Za-z0-9][A-Za-z0-9._-]{2,59}"
                    spellCheck={false}
                    autoCapitalize="none"
                    title="Use 3–60 letters, numbers, dots, underscores or hyphens. Start with a letter or number."
                    placeholder="e.g. alex.morgan"
                  />
                </label>
                {mode === "register" && (
                  <label>
                    Your name
                    <input
                      name="displayName"
                      autoComplete="name"
                      required
                      maxLength={100}
                    />
                  </label>
                )}
                <label>
                  Password
                  <input
                    name="password"
                    type="password"
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                    required
                    minLength={mode === "register" ? 12 : undefined}
                  />
                </label>
                {mode === "register" && (
                  <p className="sl-help">
                    Use at least 12 characters. Keep this password safe;
                    self-service account recovery is not available yet.
                  </p>
                )}
              </>
            )}
            {(mode === "example" || (mode === "register" && !invite)) && (
              <label>
                {mode === "example"
                  ? "Team access code"
                  : "Access code from the Second Look team"}
                <input
                  name="code"
                  type="password"
                  autoComplete="off"
                  required
                />
              </label>
            )}
            {error && (
              <p role="alert" className="sl-error">
                {error}
              </p>
            )}
            <button className="sl-primary sl-full" disabled={busy}>
              {busy
                ? "Signing you in…"
                : mode === "example"
                  ? "Open the example"
                  : mode === "register"
                    ? "Create account"
                    : "Sign in"}
            </button>
          </form>
          <p className="sl-help">
            Second Look records decisions. It does not execute sales or move
            money.
          </p>
          {!invite && <button type="button" className="sl-link-button" onClick={() => { setAccessOpen(false); setError(""); requestAnimationFrame(() => exampleButtonRef.current?.focus()); }}>Back to the overview</button>}
        </section>}
      </main>
      <section className="sl-sponsor-credits" aria-labelledby="sponsor-heading">
        <p className="sl-eyebrow" id="sponsor-heading">Built with the four Deal Flow hackathon sponsors</p>
        <div className="sl-sponsor-grid">
          <a href="https://nicrron.ai/"><strong>NicrronNinoo</strong><span>Question drafting through Nicrron</span></a>
          <a href="https://prism.blockconvey.com/"><strong>PRISM <small>by Block Convey</small></strong><span>Tracing the AI question draft</span></a>
          <a href="https://akta.pro/"><strong>akta.pro <small>by Wokelo AI</small></strong><span>Outside company research</span></a>
          <a href="https://roundtable.bot/"><strong>Roundtable</strong><span>Shared research tasks and history</span></a>
        </div>
      </section>
    </div>
  );
}
export function Workspace({ session }: { session: Session }) {
  const draft = useDraftGuard();
  const [cases, setCases] = useState<
      { id: string; title: string; role: string; revision: number }[]
    >([]),
    [loaded, setLoaded] = useState(false),
    [creating, setCreating] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const retry = useRef({ payload: "", id: "" });
  useEffect(() => {
    let active = true;
    request("/api/cases")
      .then((r) => {
        if (active) {
          setCases(r.cases);
          setLoaded(true);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, []);
  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const body = {
        title: f.get("title"),
        ownerEntity: f.get("owner"),
        purchasePriceCents: cents(f.get("payment")),
        priceAdjustmentCents: f.get("adjustment")
          ? cents(f.get("adjustment"), true)
          : null,
        distributionRecipient:
          f.get("recipient") === "unknown" ? null : f.get("recipient"),
        reportNote: f.get("report") || "Report not yet provided",
        offerNote: f.get("source"),
        question:
          "What distribution is attributable to this fund interest? Please give the amount and the dated notice or report supporting it.",
        allowExternalResearch: f.get("research") === "on",
      };
      const payload = JSON.stringify(body);
      if (payload !== retry.current.payload)
        retry.current = { payload, id: crypto.randomUUID() };
      const c = await request("/api/cases", {
        ...body,
        requestId: retry.current.id,
      });
      draft.markClean();
      navigate({ case: c.id, view: "deal" });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="sl-workspace" id="workspace" tabIndex={-1}>
      <div className="sl-page-heading">
        <div>
          <h1 tabIndex={-1}>Your sale reviews</h1>
          <p>
            Welcome, {session.user?.displayName}. Compare what an offer pays,
            confirm the fund payout, and keep a record of what you reviewed.
          </p>
        </div>
        {loaded && cases.length > 0 && !creating && (
          <button
            className="sl-primary"
            onClick={() => {
              setCreating(true);
              requestAnimationFrame(() =>
                document
                  .querySelector<HTMLInputElement>('[name="title"]')
                  ?.focus(),
              );
            }}
          >
            Review a sale offer
          </button>
        )}
      </div>
      {error && (
        <p className="sl-error" role="alert">
          {error}
        </p>
      )}
      {creating && (
        <section className="sl-sheet">
          <h2>What sale are you considering?</h2>
          <p>
            Have the buyer’s email or offer beside you. Enter its terms below;
            then ask your fund contact to confirm the payout amount.
          </p>
          <form
            className="sl-form-grid"
            onSubmit={create}
            onChange={draft.markDirty}
          >
            <label>
              Fund or investment name
              <input
                name="title"
                required
                maxLength={200}
                placeholder="e.g. Northstar Ventures Fund II"
              />
            </label>
            <label>
              Who owns the fund interest?
              <input
                name="owner"
                required
                maxLength={200}
                placeholder="e.g. Morgan Family Trust"
              />
            </label>
            <label>
              How much is the buyer offering? (USD)
              <input
                name="payment"
                inputMode="decimal"
                required
                placeholder="700,000"
              />
            </label>
            <label>
              Any additional price adjustment? (USD)
              <input
                name="adjustment"
                inputMode="decimal"
                placeholder="0 if none; blank if not confirmed"
              />
              <span className="sl-field-help">
                For example, −2,000 for a reduction. Leave blank until
                confirmed; an unknown amount will block a final review.
              </span>
            </label>
            <label>
              Under the sale agreement, who keeps the fund payouts?
              <select name="recipient" defaultValue="" required>
                <option value="" disabled>
                  Choose an answer
                </option>
                <option value="unknown">Not confirmed yet</option>
                <option value="seller">
                  The seller (owner of the interest)
                </option>
                <option value="buyer">The buyer</option>
              </select>
              <span className="sl-field-help">
                Distributions are payouts from the fund. If the offer does not
                say who keeps them, choose “Not confirmed yet.” You can start
                now and confirm the sale terms with the buyer later.
              </span>
            </label>
            <label>
              Where are these offer terms from?
              <input
                name="source"
                required
                maxLength={2000}
                placeholder="e.g. Buyer email, October 24"
              />
            </label>
            <label className="sl-span">
              Fund-report reference (optional)
              <input
                name="report"
                maxLength={2000}
                placeholder="e.g. Q3 report, page 4"
              />
            </label>
            <p className="sl-span sl-help">
              You’re entering the offer yourself. References help everyone find
              the original; entering a reference does not upload or verify the
              document.
            </p>
            <p className="sl-span sl-help">
              You can add company research or connect X1 after creating the
              review.
            </p>
            <div className="sl-actions sl-span">
              <button className="sl-primary" disabled={busy}>
                {busy ? "Creating review…" : "Start this review"}
              </button>
              <button
                type="button"
                className="sl-secondary"
                disabled={busy}
                onClick={() => {
                  if (confirmDiscardChanges()) {
                    draft.markClean();
                    setCreating(false);
                  }
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}
      {!loaded && !error ? (
        <p role="status">Loading your sale reviews…</p>
      ) : cases.length ? (
        <div className="sl-case-list">
          {cases.map((c) => (
            <a
              key={c.id}
              href={`#case=${encodeURIComponent(c.id)}&view=${c.role === "lp" ? "deal" : "conversation"}`}
            >
              <div>
                <span className="sl-pill">
                  {c.role === "lp"
                    ? "Investor"
                    : c.role === "gp"
                      ? "Fund contact"
                      : "Buyer"}
                </span>
                <h2>{c.title}</h2>
                <p>
                  {c.role === "gp"
                    ? "Open the investor’s question and give your answer"
                    : c.role === "buyer"
                      ? "Confirm or update the offer terms"
                      : "Open the offer, fund contact’s answer and your saved review"}
                </p>
              </div>
              <span aria-hidden="true">→</span>
            </a>
          ))}
        </div>
      ) : (
        !creating && (
          <section className="sl-empty">
            <h2>What would you actually keep from the sale?</h2>
            <p>
              Start with the offer. We’ll separate the buyer’s payment from fund
              distributions, help you get the missing answer, and save the terms
              you reviewed.
            </p>
            <button
              className="sl-primary"
              onClick={() => {
                setCreating(true);
                requestAnimationFrame(() =>
                  document
                    .querySelector<HTMLInputElement>('[name="title"]')
                    ?.focus(),
                );
              }}
            >
              Review a sale offer
            </button>
          </section>
        )
      )}
    </main>
  );
}
export function JoinCase({
  token,
  onJoined,
}: {
  token: string;
  onJoined: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <main className="sl-workspace" id="workspace" tabIndex={-1}>
      <section className="sl-sheet">
        <h1>Join this sale review</h1>
        <p>
          Accept to open the investor’s question or offer. You’ll have the
          specific access the investor assigned to you.
        </p>
        {error && (
          <p role="alert" className="sl-error">
            {error}
          </p>
        )}
        <button
          className="sl-primary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const r = await request("/api/invitations/accept", { token });
              navigate({ case: r.caseId, view: "conversation" });
              onJoined();
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Joining…" : "Accept invitation"}
        </button>
      </section>
    </main>
  );
}
