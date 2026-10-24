import { useEffect, useState } from "react";
import type { CaseView, ProviderStatus, Role } from "../shared/contracts";
import { DecisionWorkbench } from "../integration/DecisionWorkbench";
import { FundingPanel } from "../integration/FundingPanel";
import { GamingPanel } from "./GamingPanel";
import { ResearchPanel } from "./ResearchPanel";
import { AuthScreen, Brand, JoinCase, Workspace } from "./AccountScreens";
import {
  cents,
  currency,
  navigate,
  readRoute,
  request,
  type Session,
} from "./product-api";
import { X1Sources } from "./X1Sources";
const names: Record<Role, string> = {
  lp: "Investor",
  gp: "Fund manager",
  buyer: "Buyer",
};
const steps = [
  ["deal", "The deal"],
  ["evidence", "The evidence"],
  ["conversation", "The conversation"],
  ["decision", "Your decision"],
] as const;
export function ProductApp() {
  const [session, setSession] = useState<Session | null>(null),
    [route, setRoute] = useState(readRoute),
    [error, setError] = useState("");
  async function loadSession() {
    const s = await request("/api/session");
    setSession(s);
    return s;
  }
  useEffect(() => {
    loadSession().catch((e) => setError(e.message));
    const changed = () => setRoute(readRoute());
    window.addEventListener("hashchange", changed);
    const expired = () => setSession({ hosted: true, authenticated: false });
    window.addEventListener("second-look-session-expired", expired);
    return () => {
      window.removeEventListener("hashchange", changed);
      window.removeEventListener("second-look-session-expired", expired);
    };
  }, []);
  async function signedIn() {
    const s = await loadSession();
    if (s.mode !== "account") {
      navigate({ view: "deal" });
    } else if (!readRoute().get("case") && !readRoute().get("invite"))
      navigate({});
  }
  async function signOut(keepInvite = false) {
    try {
      await request("/api/session/logout", {});
      setSession({ hosted: true, authenticated: false });
      if (!keepInvite) navigate({});
    } catch (e) {
      setError((e as Error).message);
    }
  }
  if (!session)
    return (
      <main className="sl-loading">
        <Brand />
        <h1>Opening your workspace…</h1>
        {error && (
          <>
            <p role="alert">{error}</p>
            <button onClick={() => location.reload()}>Try again</button>
          </>
        )}
      </main>
    );
  if (!session.authenticated)
    return (
      <AuthScreen
        invite={route.get("invite") ?? undefined}
        onLogin={signedIn}
      />
    );
  const personal = session.mode === "account",
    caseId = route.get("case"),
    invite = route.get("invite");
  return (
    <div className="sl-root">
      <a
        className="sl-skip"
        href="#workspace"
        onClick={(e) => {
          e.preventDefault();
          const m = document.getElementById("workspace");
          m?.focus();
          m?.scrollIntoView();
        }}
      >
        Skip to workspace
      </a>
      <header className="sl-app-header">
        <Brand />
        <nav aria-label="Workspace">
          <a href="#">{personal ? "Your cases" : "Team example"}</a>
          {personal && <span>{session.user?.displayName}</span>}
          {session.hosted && (
            <button className="sl-text-button" onClick={() => void signOut()}>
              Sign out
            </button>
          )}
        </nav>
      </header>
      {error && (
        <p className="sl-error" role="alert">
          {error}
        </p>
      )}
      {invite && !personal ? (
        <main className="sl-workspace" id="workspace" tabIndex={-1}>
          <h1>Join with your own account.</h1>
          <p>
            This invitation gives you a specific role in a private case. The
            team example login cannot accept it.
          </p>
          <button className="sl-primary" onClick={() => void signOut(true)}>
            Sign in to accept this invitation
          </button>
        </main>
      ) : personal && invite ? (
        <JoinCase token={invite} onJoined={() => void loadSession()} />
      ) : personal && !caseId ? (
        <Workspace session={session} />
      ) : (
        <CasePage
          key={personal ? caseId : "example"}
          session={session}
          caseId={personal ? caseId! : undefined}
          stage={route.get("view") ?? "deal"}
        />
      )}
      <footer className="sl-app-footer">
        <span>Second Look</span>
        <span>Evidence you can trace. Decisions you can revisit.</span>
        <a href="/mcp">Use with your agent</a>
      </footer>
    </div>
  );
}
function CasePage({
  session,
  caseId,
  stage,
}: {
  session: Session;
  caseId?: string;
  stage: string;
}) {
  const personal = session.mode === "account",
    base = personal ? `/api/cases/${encodeURIComponent(caseId!)}` : "/api/case";
  const [role, setRole] = useState<Role>(session.role ?? "lp"),
    [data, setData] = useState<CaseView | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [providers, setProviders] = useState<ProviderStatus[]>([]),
    [researchVersion, setResearchVersion] = useState(0),
    [hasUpdate, setHasUpdate] = useState(false);
  const view =
    steps.some(([id]) => id === stage) &&
    (role === "lp" || stage === "deal" || stage === "conversation")
      ? stage
      : "deal";
  function go(next: string) {
    navigate({ ...(caseId ? { case: caseId } : {}), view: next });
  }
  async function refresh(nextRole = role) {
    const d = await request(base, undefined, nextRole);
    setData(d);
    setHasUpdate(false);
    return d;
  }
  async function providerRefresh() {
    try {
      const p = await request("/api/providers");
      setProviders(p);
    } catch {
      /* core case remains usable */
    }
  }
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        let nextRole = role;
        if (personal) {
          const list = await request("/api/cases");
          const c = list.cases.find((x: { id: string }) => x.id === caseId);
          if (!c)
            throw Error(
              "This case is not available to your account. Ask the owner for an invitation.",
            );
          nextRole = c.role;
        }
        const d = await request(base, undefined, nextRole);
        if (active) {
          setRole(nextRole);
          setData(d);
        }
      } catch (e) {
        if (active) setError((e as Error).message);
      }
    })();
    void providerRefresh();
    return () => {
      active = false;
    };
  }, [base]);
  useEffect(() => {
    if (!data) return;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      request(base, undefined, role)
        .then((next) => setHasUpdate(next.revision !== data.revision))
        .catch(() => {});
    }, 5000);
    return () => clearInterval(timer);
  }, [base, role, data?.revision]);
  useEffect(() => {
    document.title = data ? `${data.title} · Second Look` : "Second Look";
  }, [data?.title]);
  async function run(operation: () => Promise<unknown>, message = "") {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await operation();
      await refresh();
      if (message) setNotice(message);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function command(command: unknown, message: string) {
    if (!data) return;
    await run(
      () =>
        request(
          base + "/commands",
          { expectedRevision: data.revision, command },
          role,
        ),
      message,
    );
  }
  async function switchRole(next: Role) {
    setBusy(true);
    setError("");
    try {
      if (session.hosted) await request("/api/session/role", { role: next });
      const d = await request(base, undefined, next);
      setRole(next);
      setData(d);
      go(
        next === "gp" ? "conversation" : next === "buyer" ? "deal" : "decision",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!data)
    return (
      <main tabIndex={-1} id="workspace" className="sl-workspace">
        <h1>{error ? "This case could not be opened" : "Opening the case…"}</h1>
        {error && (
          <>
            <p role="alert" className="sl-error">
              {error}
            </p>
            <a className="sl-button" href="#">
              Return to your cases
            </a>
          </>
        )}
      </main>
    );
  const review = data.privateReview,
    approved = review?.status === "approved",
    changed = review?.status === "terms_changed";
  const stageTitle =
    view === "evidence"
      ? "What changed behind the numbers?"
      : view === "conversation"
        ? "Get the answer that matters."
        : view === "decision"
          ? "Know exactly what you’re reviewing."
          : "Look at the whole deal.";
  const ready =
    !!data.answer &&
    review?.grossReceiptsCents != null &&
    !review?.diligenceBlockers?.length;
  return (
    <main tabIndex={-1} id="workspace" className="sl-workspace">
      <div className="sl-case-top">
        <div>
          <a href="#">{personal ? "Your cases" : "Example case"}</a>
          <span aria-hidden="true"> / </span>
          <span>{data.title}</span>
        </div>
        <span className="sl-pill">{names[role]}</span>
      </div>
      {!personal && (
        <div className="sl-demo-strip">
          <span>
            <strong>Fictional example.</strong> Real research tools;
            illustrative fund ownership and sale terms.
          </span>
          <details>
            <summary>Presenter controls</summary>
            <label>
              Show this participant
              <select
                value={role}
                disabled={busy}
                onChange={(e) => void switchRole(e.target.value as Role)}
              >
                {Object.entries(names).map(([r, n]) => (
                  <option key={r} value={r}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <p>
              These controls simulate participants. Individual accounts use
              assigned case permissions.
            </p>
          </details>
        </div>
      )}
      <div className="sl-case-heading">
        <div>
          <h1>{stageTitle}</h1>
          <p>
            {view === "deal"
              ? "A sale price tells you one number. The terms tell you what you actually keep."
              : view === "evidence"
                ? "Use current evidence to ask a better question—not to guess what the fund owes you."
                : view === "conversation"
                  ? "Keep the question, supporting answer and next step together."
                  : "This review applies to the current sale below. A change to the terms requires a fresh review."}
          </p>
        </div>
        <span className={`sl-status ${changed ? "sl-status-warning" : ""}`}>
          {approved
            ? "Review recorded"
            : changed
              ? "Changed since review"
              : data.answer
                ? "Manager answered"
                : "Awaiting manager answer"}
        </span>
      </div>
      <nav className="sl-step-nav" aria-label="Review workflow">
        {steps
          .filter(
            ([s]) => role === "lp" || s === "deal" || s === "conversation",
          )
          .map(([s, label], i) => (
            <a
              href={`#${new URLSearchParams({ ...(caseId ? { case: caseId } : {}), view: s })}`}
              key={s}
              aria-current={view === s ? "step" : undefined}
            >
              <span aria-hidden="true">{i + 1}</span>
              {label}
            </a>
          ))}
      </nav>
      {error && (
        <div className="sl-error" role="alert">
          {error}{" "}
          <button
            className="sl-text-button"
            onClick={() => void run(() => refresh())}
          >
            Refresh this case
          </button>
        </div>
      )}
      {notice && (
        <p className="sl-success" role="status">
          {notice}
        </p>
      )}
      {hasUpdate && (
        <div className="sl-success" role="status">
          There’s an update to this case. Your edits have not been replaced.{" "}
          <button
            className="sl-text-button"
            onClick={() => void run(() => refresh(), "Latest case loaded.")}
          >
            Load the latest version
          </button>
        </div>
      )}
      {changed && (
        <div className="sl-change-alert">
          <strong>Your previous review no longer applies.</strong>
          <span>
            The sale terms or supporting information changed. The earlier review
            is preserved in history.
          </span>
          {review?.lastTermChange?.atRevision === data.revision &&
            review.lastTermChange.previousGrossReceiptsCents != null &&
            review.lastTermChange.revisedGrossReceiptsCents != null && (
              <p className="sl-change-amount">
                Gross cash changed from{" "}
                <b>
                  {currency(review.lastTermChange.previousGrossReceiptsCents)}
                </b>{" "}
                to{" "}
                <b>
                  {currency(review.lastTermChange.revisedGrossReceiptsCents)}
                </b>
                .
              </p>
            )}
        </div>
      )}
      {view === "deal" && (
        <>
          <div className="sl-deal-layout">
            <section className="sl-sale">
              <h2>The current sale, at a glance</h2>
              <CashTerms data={data} />
              <p className="sl-help">
                Gross cash before taxes, fees and timing. These figures use the
                entered terms and the manager’s stated distribution.
              </p>
              <details className="sl-source">
                <summary>Where these terms came from</summary>
                <p>{data.offer.source.label}</p>
                {review && (
                  <>
                    <p>{review.report.label}</p>
                    <p>Interest held by {review.ownerEntity}.</p>
                  </>
                )}
              </details>
            </section>
            <aside className="sl-next-step">
              <span className="sl-small-label">Your next move</span>
              <h2>
                {role === "gp"
                  ? "Confirm what the investor keeps."
                  : role === "buyer"
                    ? "Make your sale terms clear."
                    : approved
                      ? "Your review is on record."
                      : data.answer
                        ? "Check the answer against the offer."
                        : "Find out who keeps the distribution."}
              </h2>
              <p>
                {role === "gp"
                  ? "Give the investor the amount, contractual basis and source for your answer."
                  : role === "buyer"
                    ? "The investor will need to review the sale again if you change its terms."
                    : data.answer
                      ? "The manager has answered. Review the sale and record your decision for this version."
                      : "A distribution can change the economics of a sale. Get the manager’s answer before treating it as money you will receive."}
              </p>
              <button
                className="sl-primary"
                onClick={() =>
                  go(
                    role === "buyer"
                      ? "conversation"
                      : role === "gp"
                        ? "conversation"
                        : data.answer
                          ? "decision"
                          : "conversation",
                  )
                }
              >
                {role === "gp"
                  ? "Answer the investor"
                  : role === "buyer"
                    ? "Review requested terms"
                    : data.answer
                      ? "Review this sale"
                      : "Open the manager question"}
              </button>
              {role === "lp" && !data.answer && (
                <button
                  className="sl-text-button"
                  onClick={() => go("evidence")}
                >
                  First, check the evidence
                </button>
              )}
            </aside>
          </div>
          {role === "lp" && (
            <>
              <details className="sl-option">
                <summary>
                  Compare an alternative offer
                  <span>
                    Compare cash terms without changing the current sale.
                  </span>
                </summary>
                <DecisionWorkbench
                  caseBase={base}
                  showFunding={false}
                  onChanged={() => void refresh()}
                />
              </details>
              <details className="sl-option">
                <summary>
                  Check a cash deadline
                  <span>
                    See whether expected proceeds could cover a funding need.
                  </span>
                </summary>
                <FundingPanel
                  caseBase={base}
                  revision={data.revision}
                  ownerEntity={review?.ownerEntity ?? ""}
                  onChanged={() => void refresh()}
                />
              </details>
            </>
          )}
          {role === "buyer" && (
            <BuyerForm
              key={data.revision}
              data={data}
              busy={busy}
              onSave={(c) =>
                command(
                  c,
                  "Updated terms saved. The investor must review this version.",
                )
              }
            />
          )}
        </>
      )}
      {view === "evidence" && role === "lp" && (
        <div className="sl-evidence-page">
          {personal ? (
            <>
              <X1Sources
                caseBase={base}
                revision={data.revision}
                onChanged={() => void refresh()}
              />
              {!review?.allowExternalResearch ? (
                <section className="sl-sheet">
                  <h2>Research outside the fund report</h2>
                  <p>
                    With your permission, selected company evidence and relevant
                    sale terms are processed by Akta, Roundtable, Nicrron and
                    PRISM. Your X1 credentials are never shared with them.
                  </p>
                  <button
                    className="sl-primary"
                    disabled={busy}
                    onClick={() =>
                      void run(
                        () =>
                          request(base + "/external-research", {
                            expectedRevision: data.revision,
                            enabled: true,
                          }),
                        "External research enabled for this case.",
                      )
                    }
                  >
                    Enable external research for this case
                  </button>
                </section>
              ) : (
                <ResearchPanel
                  data={data}
                  caseBase={base}
                  refreshVersion={researchVersion}
                  onShared={(d) => {
                    setData(d);
                    go("conversation");
                  }}
                  onProviderChange={() => void providerRefresh()}
                />
              )}
            </>
          ) : (
            <>
              <GamingPanel
                revision={data.revision}
                onPrepared={() => {
                  setResearchVersion((v) => v + 1);
                  void providerRefresh();
                  document
                    .getElementById("research-heading")
                    ?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
                }}
              />
              <ResearchPanel
                data={data}
                refreshVersion={researchVersion}
                onShared={(d) => {
                  setData(d);
                  go("conversation");
                }}
                onProviderChange={() => void providerRefresh()}
              />
            </>
          )}
        </div>
      )}
      {view === "conversation" && (
        <>
          <div className="sl-conversation-layout">
            <section className="sl-conversation">
              <div className="sl-message">
                <span className="sl-person">Investor’s question</span>
                <h2>{data.question}</h2>
                {data.questionSource && (
                  <p className="sl-help">
                    Based on: {data.questionSource.label}
                  </p>
                )}
              </div>
              {data.answer ? (
                <div className="sl-message sl-message-answer">
                  <span className="sl-person">
                    Fund manager’s answer ·{" "}
                    {currency(data.answer.distributionCents)}
                  </span>
                  <p>{data.answer.text}</p>
                  <small>{data.answer.source.label}</small>
                </div>
              ) : (
                <div className="sl-waiting">
                  <h3>The manager hasn’t answered yet.</h3>
                  <p>
                    {personal
                      ? "Invite the fund manager below so they can respond in this case."
                      : "To try the complete example, switch to Fund manager in Presenter controls above, then enter an answer."}
                  </p>
                </div>
              )}
              {role === "gp" && (
                <AnswerForm
                  key={data.revision}
                  data={data}
                  busy={busy}
                  example={!personal}
                  onSave={(c) =>
                    command(
                      c,
                      "Your answer is saved. The investor can now review this version.",
                    )
                  }
                />
              )}
              {role === "lp" && (
                <>
                  <details className="sl-option">
                    <summary>Refine the question</summary>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const f = new FormData(e.currentTarget);
                        void command(
                          {
                            kind: "set_question",
                            text: f.get("question"),
                            sourceNote: "Question written by the investor",
                          },
                          "Question updated. A fresh manager answer is required.",
                        );
                      }}
                    >
                      <label>
                        Your question
                        <textarea
                          name="question"
                          key={data.revision}
                          defaultValue={data.question}
                          maxLength={5000}
                          required
                          rows={4}
                        />
                      </label>
                      <p className="sl-help">
                        Replaces this question and clears its answer. Earlier
                        reviews remain in history.
                      </p>
                      <button className="sl-primary" disabled={busy}>
                        Save question
                      </button>
                    </form>
                  </details>
                  {data.answer && (
                    <button
                      className="sl-primary"
                      onClick={() => go("decision")}
                    >
                      Review the answer and sale
                    </button>
                  )}
                </>
              )}
              {role === "buyer" && (
                <BuyerForm
                  key={data.revision}
                  data={data}
                  busy={busy}
                  onSave={(c) =>
                    command(
                      c,
                      "Your revised offer is saved. The investor must review it again.",
                    )
                  }
                />
              )}
            </section>
            <aside className="sl-next-step">
              <h2>
                {role === "lp"
                  ? "Keep the handoff moving."
                  : "Your response stays with the deal."}
              </h2>
              <p>
                Questions and answers are saved against the case. If the terms
                change later, the previous review stays in history.
              </p>
              <p className="sl-help">
                Saving a question does not send an email. Share the case
                invitation with the person who needs to respond.
              </p>
            </aside>
          </div>
          {personal && role === "lp" && <Collaborators caseBase={base} />}
        </>
      )}
      {view === "decision" && role === "lp" && (
        <>
          <section className="sl-decision-sheet">
            <div className="sl-decision-title">
              <h2>Review this sale</h2>
              <span>Offer version {data.offer.version}</span>
            </div>
            <CashTerms data={data} />
            <p className="sl-help">
              This is the current sale, not an alternative comparison quote.
            </p>
            <div className="sl-checklist">
              <p>
                <span>
                  {data.answer ? "Confirmed by manager" : "Still needed"}
                </span>{" "}
                Distribution amount and explanation
              </p>
              <p>
                <span>
                  {data.offer.priceAdjustmentCents === null
                    ? "Still needed"
                    : "Recorded"}
                </span>{" "}
                Price adjustment
              </p>
              <p>
                <span>
                  {review?.diligenceBlockers?.length
                    ? "Still open"
                    : "No tracked blockers"}
                </span>{" "}
                Tracked questions and closing conditions
              </p>
            </div>
            {review?.diligenceBlockers?.map((b) => (
              <p className="sl-error" key={b}>
                {b}
              </p>
            ))}
            {data.answer && <blockquote>{data.answer.text}</blockquote>}
            <p>
              Your review records that you checked these terms. It does not
              accept a sale, send money, or replace the signed agreement.
            </p>
            <div className="sl-actions">
              <button
                className="sl-primary"
                disabled={busy || approved || !ready}
                onClick={() =>
                  void command(
                    { kind: "approve" },
                    "Review recorded for this version. A later change will require a fresh review.",
                  )
                }
              >
                {busy
                  ? "Saving review…"
                  : approved
                    ? "Review recorded"
                    : "Record my review of this sale"}
              </button>
              <RecordDownload base={base} revision={data.revision} />
            </div>
            {!ready && (
              <p className="sl-help">
                Resolve the missing answer, adjustment or tracked conditions
                before recording your review.
              </p>
            )}
          </section>
          <section className="sl-history">
            <h2>The decision history</h2>
            {!review?.events.length && !review?.reviews.length ? (
              <p>No decisions recorded yet. Start with the manager’s answer.</p>
            ) : (
              <>
                <ol>
                  {review?.events.map((e) => (
                    <li key={e.revision}>
                      <span>{new Date(e.at).toLocaleString()}</span>
                      <p>{e.text}</p>
                    </li>
                  ))}
                </ol>
                {review?.reviews.map((r) => (
                  <details key={r.revision}>
                    <summary>
                      {r.revision === data.revision
                        ? "Current review"
                        : "Earlier review"}{" "}
                      · {new Date(r.approvedAt).toLocaleString()}
                    </summary>
                    <p>{r.responseText}</p>
                    {r.revision !== data.revision && (
                      <p>This review does not approve the current version.</p>
                    )}
                    <RecordDownload base={base} revision={r.revision} />
                  </details>
                ))}
              </>
            )}
          </section>
        </>
      )}
      <div className="sl-case-bottom">
        <span>Saved case · revision {data.revision}</span>
        <button
          className="sl-text-button"
          disabled={busy}
          onClick={() =>
            void run(
              () => refresh(),
              "You’re looking at the latest saved case.",
            )
          }
        >
          Refresh saved case
        </button>
        <details className="sl-service">
          <summary>Service details</summary>
          <p>
            These statuses describe observed requests on this server. Completed
            research contains its own saved provider receipts.
          </p>
          <ul>
            {providers.map((p) => (
              <li key={p.provider}>
                <strong>{p.provider === "x1" ? "X1" : p.provider}</strong>
                <span>{p.status.replaceAll("_", " ")}</span>
                <small>{p.detail}</small>
              </li>
            ))}
          </ul>
        </details>
      </div>
    </main>
  );
}
function CashTerms({ data }: { data: CaseView }) {
  const amount = data.answer?.distributionCents,
    total = data.privateReview?.grossReceiptsCents;
  return (
    <div className="sl-cash-terms">
      <div>
        <span>Sale payment to investor</span>
        <strong>{currency(data.offer.purchasePriceCents)}</strong>
      </div>
      <div>
        <span>Price adjustment</span>
        <strong>
          {data.offer.priceAdjustmentCents === null
            ? "Not confirmed"
            : `${data.offer.priceAdjustmentCents >= 0 ? "+ " : ""}${currency(data.offer.priceAdjustmentCents)}`}
        </strong>
      </div>
      <div className={!data.answer ? "sl-cash-unresolved" : ""}>
        <span>
          {data.offer.distributionRecipient === "seller"
            ? "Investor keeps the distribution"
            : "Buyer keeps the distribution"}
        </span>
        <strong>
          {data.offer.distributionRecipient === "buyer"
            ? "Not included"
            : amount === undefined
              ? "Needs an answer"
              : `+ ${currency(amount)}`}
        </strong>
      </div>
      <div className="sl-cash-total">
        <span>
          {!data.privateReview
            ? "Investor’s private review"
            : total == null
              ? "Before calling this your total"
              : "Investor’s gross cash proceeds"}
        </span>
        <strong>
          {!data.privateReview
            ? "Visible to the investor"
            : total == null
              ? "Confirm the missing terms"
              : currency(total)}
        </strong>
      </div>
    </div>
  );
}
function AnswerForm({
  data,
  busy,
  example,
  onSave,
}: {
  data: CaseView;
  busy: boolean;
  example: boolean;
  onSave: (c: unknown) => Promise<void>;
}) {
  const [amount, setAmount] = useState(
      data.answer ? String(data.answer.distributionCents / 100) : "",
    ),
    [text, setText] = useState(data.answer?.text ?? ""),
    [error, setError] = useState("");
  return (
    <form
      className="sl-sheet"
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        try {
          void onSave({
            kind: "answer",
            distributionCents: cents(amount),
            text,
          });
        } catch (e) {
          setError((e as Error).message);
        }
      }}
    >
      <h2>{data.answer ? "Update your answer" : "Answer the investor"}</h2>
      <label>
        Distribution attributable to this interest (USD)
        <input
          inputMode="decimal"
          value={amount}
          required
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter the confirmed amount"
        />
      </label>
      <label>
        Explain the contractual basis and source
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          required
          maxLength={5000}
          rows={5}
          placeholder="What supports this amount, and who receives it under the sale terms?"
        />
      </label>
      {example && (
        <button
          className="sl-text-button"
          type="button"
          onClick={() => {
            setAmount("100000");
            setText(
              "Fictional manager response: the example distribution notice allocates $100,000 to this LP interest. This is an illustrative contractual assumption, not a forecast from game performance. The signed sale terms determine whether the seller or buyer receives it.",
            );
          }}
        >
          Use the labeled fictional example
        </button>
      )}
      {error && (
        <p className="sl-error" role="alert">
          {error}
        </p>
      )}
      <p className="sl-help">
        Saving makes previous reviews historical. The investor must review your
        new answer.
      </p>
      <button className="sl-primary" disabled={busy}>
        {busy ? "Saving answer…" : "Save my answer"}
      </button>
    </form>
  );
}
function BuyerForm({
  data,
  busy,
  onSave,
}: {
  data: CaseView;
  busy: boolean;
  onSave: (c: unknown) => Promise<void>;
}) {
  const [error, setError] = useState("");
  return (
    <form
      className="sl-sheet"
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        const f = new FormData(e.currentTarget);
        try {
          void onSave({
            kind: "revise_offer",
            purchasePriceCents: cents(f.get("payment")),
            priceAdjustmentCents: f.get("adjustment")
              ? cents(f.get("adjustment"), true)
              : null,
            distributionRecipient: f.get("recipient"),
            sourceNote: f.get("source"),
          });
        } catch (e) {
          setError((e as Error).message);
        }
      }}
    >
      <h2>Update the actual sale terms</h2>
      <div className="sl-form-grid">
        <label>
          Purchase payment (USD)
          <input
            name="payment"
            inputMode="decimal"
            defaultValue={data.offer.purchasePriceCents / 100}
            required
          />
        </label>
        <label>
          Price adjustment (USD)
          <input
            name="adjustment"
            inputMode="decimal"
            defaultValue={
              data.offer.priceAdjustmentCents == null
                ? ""
                : data.offer.priceAdjustmentCents / 100
            }
            placeholder="Blank if unknown"
          />
        </label>
        <label>
          Who receives distributions?
          <select
            name="recipient"
            defaultValue={data.offer.distributionRecipient}
          >
            <option value="seller">Seller</option>
            <option value="buyer">Buyer</option>
          </select>
        </label>
        <label>
          Supporting source
          <input
            name="source"
            defaultValue={data.offer.source.label}
            required
            maxLength={2000}
          />
        </label>
      </div>
      {error && (
        <p role="alert" className="sl-error">
          {error}
        </p>
      )}
      <p>
        This creates a new offer version. Earlier investor reviews will no
        longer apply.
      </p>
      <button className="sl-primary" disabled={busy}>
        {busy ? "Saving terms…" : "Save revised sale terms"}
      </button>
    </form>
  );
}
function Collaborators({ caseBase }: { caseBase: string }) {
  const [invite, setInvite] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <details className="sl-option">
      <summary>
        Invite a manager or buyer
        <span>Give each person their own access to this case.</span>
      </summary>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          const f = new FormData(e.currentTarget);
          request(caseBase + "/invitations", {
            role: f.get("role"),
            ...(f.get("handle") ? { recipientHandle: f.get("handle") } : {}),
          })
            .then((r) => setInvite(r.acceptanceUrl))
            .catch((e) => setError(e.message))
            .finally(() => setBusy(false));
        }}
      >
        <label>
          Their role
          <select name="role">
            <option value="gp">Fund manager — answers questions</option>
            <option value="buyer">Buyer — updates sale terms</option>
          </select>
        </label>
        <label>
          Account handle (optional)
          <input
            name="handle"
            placeholder="Restrict the invitation to a specific account"
          />
        </label>
        <p className="sl-help">
          The invitation expires in 24 hours and can be used once. This creates
          a link; it does not send an email.
        </p>
        <button className="sl-primary" disabled={busy}>
          {busy ? "Creating invitation…" : "Create invitation link"}
        </button>
      </form>
      {invite && (
        <div className="sl-invite-result">
          <label>
            Share privately with the intended participant
            <input readOnly value={invite} onFocus={(e) => e.target.select()} />
          </label>
          <button
            className="sl-secondary"
            onClick={() => {
              navigator.clipboard
                .writeText(invite)
                .catch(() => setError("Select and copy the invitation above."));
            }}
          >
            Copy invitation
          </button>
        </div>
      )}
      {error && (
        <p className="sl-error" role="alert">
          {error}
        </p>
      )}
    </details>
  );
}

function RecordDownload({
  base,
  revision,
}: {
  base: string;
  revision: number;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <>
      <button
        className="sl-secondary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const r = await fetch(
              `${base}/decision-record?revision=${revision}`,
              { headers: { "x-demo-role": "lp" } },
            );
            if (!r.ok) {
              const e = await r.json();
              throw Error(e.error ?? "Could not download the record.");
            }
            const url = URL.createObjectURL(await r.blob());
            const a = document.createElement("a");
            a.href = url;
            a.download = `second-look-decision-r${revision}.html`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 30000);
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Preparing record…" : "Download decision record"}
      </button>
      {error && (
        <p role="alert" className="sl-error">
          {error}
        </p>
      )}
    </>
  );
}
