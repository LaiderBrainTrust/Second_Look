import { useEffect, useRef, useState } from "react";
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
  const [mode, setMode] = useState<"login" | "register" | "example">("login"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
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
        <span>Private-market decisions, made clear.</span>
      </header>
      <main className="sl-entry-layout">
        <section className="sl-intro">
          <h1>
            The price isn’t
            <br />
            the whole deal.
          </h1>
          <p className="sl-lead">
            Understand what you keep when you sell a fund interest. Check the
            evidence, get the missing answer, and review the terms before you
            commit.
          </p>
          <div className="sl-example-illustration">
            <div>
              <span>Sale payment</span>
              <strong>$700,000</strong>
            </div>
            <div>
              <span>Distribution you may keep</span>
              <strong>+ $100,000</strong>
            </div>
            <p>The same headline price. A very different outcome.</p>
            <small>
              Illustrative example. The distribution and sale rights must be
              confirmed.
            </small>
          </div>
          <p className="sl-entry-foot">
            Your evidence. Your collaborators. One shared record of the
            decision.
          </p>
        </section>
        <section className="sl-auth">
          <h2>
            {invite
              ? "You’ve been invited to a case"
              : mode === "example"
                ? "Explore the team example"
                : mode === "register"
                  ? "Create your workspace"
                  : "Welcome to Second Look"}
          </h2>
          <p>
            {invite
              ? "Sign in or create an account to join with the role the case owner assigned."
              : mode === "example"
                ? "Use your team access code. The fund and sale in this example are fictional."
                : "Keep your cases, questions and decisions together."}
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
                  Account handle
                  <input
                    name="handle"
                    autoComplete="username"
                    required
                    minLength={3}
                    maxLength={60}
                    pattern="[A-Za-z0-9][A-Za-z0-9._-]{2,59}"
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
                  : "Early-access enrollment code"}
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
        </section>
      </main>
    </div>
  );
}
export function Workspace({ session }: { session: Session }) {
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
        distributionRecipient: f.get("recipient"),
        reportNote: f.get("report") || "Report not yet provided",
        offerNote: f.get("source"),
        question:
          "What distribution is attributable to this interest, and who keeps it under the sale terms?",
        allowExternalResearch: f.get("research") === "on",
      };
      const payload = JSON.stringify(body);
      if (payload !== retry.current.payload)
        retry.current = { payload, id: crypto.randomUUID() };
      const c = await request("/api/cases", {
        ...body,
        requestId: retry.current.id,
      });
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
          <h1>Your decisions, in one place.</h1>
          <p>
            Welcome, {session.user?.displayName}. Open a case or start with the
            sale you’re considering.
          </p>
        </div>
        <button className="sl-primary" onClick={() => setCreating(true)}>
          New sale review
        </button>
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
            Start with the terms you have. You can confirm the missing facts
            with the manager next.
          </p>
          <form className="sl-form-grid" onSubmit={create}>
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
              Owner of the interest
              <input
                name="owner"
                required
                maxLength={200}
                placeholder="e.g. Morgan Family Trust"
              />
            </label>
            <label>
              Proposed sale payment (USD)
              <input
                name="payment"
                inputMode="decimal"
                required
                placeholder="700,000"
              />
            </label>
            <label>
              Price adjustment (USD)
              <input
                name="adjustment"
                inputMode="decimal"
                placeholder="Leave blank if unknown"
              />
            </label>
            <label>
              Who keeps distributions under this offer?
              <select name="recipient">
                <option value="seller">Seller</option>
                <option value="buyer">Buyer</option>
              </select>
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
              These are your entered terms and references. Second Look has not
              read or verified the underlying documents.
            </p>
            <label className="sl-check sl-span">
              <input name="research" type="checkbox" />
              Enable external research. Selected company evidence and relevant
              sale terms will be processed by Akta, Roundtable, Nicrron and
              PRISM.
            </label>
            <div className="sl-actions sl-span">
              <button className="sl-primary" disabled={busy}>
                {busy ? "Creating case…" : "Start this review"}
              </button>
              <button
                type="button"
                className="sl-secondary"
                onClick={() => setCreating(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}
      {!loaded && !error ? (
        <p role="status">Loading your cases…</p>
      ) : cases.length ? (
        <div className="sl-case-list">
          {cases.map((c) => (
            <a key={c.id} href={`#case=${encodeURIComponent(c.id)}&view=deal`}>
              <div>
                <span className="sl-pill">
                  {c.role === "lp"
                    ? "Investor"
                    : c.role === "gp"
                      ? "Fund manager"
                      : "Buyer"}
                </span>
                <h2>{c.title}</h2>
                <p>Open the current terms and conversation</p>
              </div>
              <span aria-hidden="true">→</span>
            </a>
          ))}
        </div>
      ) : (
        !creating && (
          <section className="sl-empty">
            <h2>Start with one real question.</h2>
            <p>
              Create a sale review to put the offer, manager’s answer and your
              decision in the same place.
            </p>
            <button className="sl-primary" onClick={() => setCreating(true)}>
              Create your first case
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
          The case owner has invited you to collaborate. Joining gives this
          account the role assigned in the invitation.
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
