import { useEffect, useRef, useState } from "react";
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
import { ReviewRequirements } from "./ReviewRequirements";
import { Collaborators } from "./Collaborators";
import {
  confirmDiscardChanges,
  hasUnsavedChanges,
  useDraftGuard,
} from "./useDraftGuard";
import { X1Sources } from "./X1Sources";
import { DealSummary } from "./DealSummary";
const names: Record<Role, string> = {
  lp: "Investor",
  gp: "Fund contact",
  buyer: "Buyer",
};
const steps = [
  ["deal", "Your offer"],
  ["evidence", "Research (optional)"],
  ["conversation", "Confirm details"],
  ["decision", "Review & save"],
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
    let lastHash = location.hash;
    const changed = () => {
      if (!confirmDiscardChanges()) {
        history.replaceState(
          null,
          "",
          location.pathname + location.search + lastHash,
        );
        return;
      }
      lastHash = location.hash;
      setRoute(readRoute());
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: "instant" });
        document.querySelector<HTMLElement>("#workspace h1")?.focus();
      });
    };
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
    if (!confirmDiscardChanges()) return;
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
          <a href="#">{personal ? "Your sale reviews" : "Team example"}</a>
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
    [researchSelection, setResearchSelection] = useState<{ holdingId: string; snapshotId: string } | null>(null),
    [hasUpdate, setHasUpdate] = useState(false),
    [draftEpoch, setDraftEpoch] = useState(0);
  const latestData = useRef(data);
  latestData.current = data;
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
              "This sale review is not available to your account. Ask the investor for an invitation.",
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
    let active = true;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      request(base, undefined, role)
        .then((next) => {
          if (!active || next.revision <= (latestData.current?.revision ?? 0))
            return;
          if (hasUnsavedChanges()) setHasUpdate(true);
          else {
            setData((current) =>
              current && current.revision >= next.revision ? current : next,
            );
            setHasUpdate(false);
            setNotice("The latest update is now shown.");
          }
        })
        .catch(() => {});
    }, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
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
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function loadLatest(message = "Latest update loaded.") {
    if (!confirmDiscardChanges()) return;
    if (await run(async () => {}, message)) setDraftEpoch((x) => x + 1);
  }
  async function command(command: unknown, message: string) {
    if (!data) return false;
    return run(
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
    if (!confirmDiscardChanges()) return;
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
          ? "Review the terms before you save."
          : "Look at the whole deal.";
  const ready =
    !!data.answer &&
    review?.grossReceiptsCents != null &&
    !review?.diligenceBlockers?.length;
  return (
    <main tabIndex={-1} id="workspace" className="sl-workspace">
      <div className="sl-case-top">
        <div>
          <a href="#">{personal ? "Your sale reviews" : "Example review"}</a>
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
          <details key={role}>
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
          <h1 tabIndex={-1}>{stageTitle}</h1>
          <p>
            {view === "deal"
              ? "A sale price tells you one number. The terms tell you what you actually keep."
              : view === "evidence"
                ? "Use current evidence to ask a better question about your investment."
                : view === "conversation"
                  ? "Keep the question, supporting answer and next step together."
                  : "This review applies to the current sale below. A change to the terms requires a fresh review."}
          </p>
        </div>
        <span
          className={`sl-status ${changed ? "sl-status-warning" : approved || data.answer ? "sl-status-confirmed" : ""}`}
        >
          {approved
            ? "Review recorded"
            : changed
              ? "Changed since review"
              : data.answer
                ? "Fund response saved"
                : "Fund payout not confirmed"}
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
      {role === "lp" && (view === "evidence" || view === "conversation") && (
        <DealSummary data={data} />
      )}
      {error && (
        <div className="sl-error" role="alert">
          {error}{" "}
          <button className="sl-text-button" onClick={() => void loadLatest()}>
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
          <button className="sl-text-button" onClick={() => void loadLatest()}>
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
              <div>
                <p className="sl-change-delta">
                  {currency(Math.abs(review.lastTermChange.revisedGrossReceiptsCents - review.lastTermChange.previousGrossReceiptsCents))}{" "}
                  {review.lastTermChange.revisedGrossReceiptsCents < review.lastTermChange.previousGrossReceiptsCents
                    ? "less for you"
                    : review.lastTermChange.revisedGrossReceiptsCents > review.lastTermChange.previousGrossReceiptsCents
                      ? "more for you"
                      : "change in cash"}
                </p>
                <dl className="sl-payoff-comparison" aria-label="How your proceeds changed">
                  <div>
                    <dt>Before the change</dt>
                    <dd>{currency(review.lastTermChange.previousGrossReceiptsCents)}</dd>
                  </div>
                  <div>
                    <dt>With the revised terms</dt>
                    <dd>{currency(review.lastTermChange.revisedGrossReceiptsCents)}</dd>
                  </div>
                </dl>
                <p className="sl-help">Cash before taxes, fees and timing. Your earlier review stays in the record.</p>
              </div>
            )}
        </div>
      )}
      {!personal && role !== "lp" && data.answer && (
        <div className="sl-demo-next">
          <p>This example lets you see both sides of the same sale.</p>
          <button className="sl-primary" disabled={busy} onClick={() => void switchRole("lp")}>
            See the investor’s updated total
          </button>
        </div>
      )}
      {view === "deal" && (
        <>
          <div className="sl-deal-layout">
            <section className="sl-sale">
              <h2>The current sale, at a glance</h2>
              <CashTerms data={data} />
              <p className="sl-help">
                Cash before taxes, fees and timing. These figures use the
                entered terms and the fund contact’s stated distribution.
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
              <h2>
                {role === "gp"
                  ? "Confirm the fund’s payout."
                  : role === "buyer"
                    ? "Make your sale terms clear."
                    : approved
                      ? "Your review is on record."
                      : data.answer
                        ? "Check the answer against the offer."
                        : "Check the fund payout before you decide."}
              </h2>
              <p>
                {role === "gp"
                  ? "Give the investor the distribution amount and the dated notice or report that supports it. The sale agreement separately determines who keeps it."
                  : role === "buyer"
                    ? "The investor will need to review the sale again if you change its terms."
                    : approved
                      ? "Your review is saved with these terms. You can revisit the record or download a copy to share."
                      : data.answer
                        ? "The fund contact has answered. Review the sale and record your decision for this version."
                        : "Ask your contact at the fund—such as investor relations—to confirm the distribution amount. Then check whether your sale agreement lets you keep it."}
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
                    : approved
                      ? "View your recorded review"
                      : data.answer
                        ? "Review this sale"
                        : "Ask your fund about the payout"}
              </button>
              {role === "lp" && !data.answer && (
                <button
                  className="sl-text-button"
                  onClick={() => go("evidence")}
                >
                  Optional: check company news
                </button>
              )}
            </aside>
          </div>
          {role === "lp" && (
            <>
              <details className="sl-option" id="compare-offers" open>
                <summary>
                  Compare offers
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
                  onAddOffer={() => {
                    const panel = document.getElementById(
                      "compare-offers",
                    ) as HTMLDetailsElement | null;
                    if (panel) {
                      panel.open = true;
                      panel.scrollIntoView({ block: "start" });
                    }
                  }}
                />
              </details>
            </>
          )}
          {role === "buyer" && (
            <BuyerForm
              key={`${draftEpoch}:${JSON.stringify(data.offer)}`}
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
          {(!personal || review?.allowExternalResearch) && <div className="sl-actions">
            <button className="sl-secondary" onClick={() => {
              const heading = document.getElementById("research-heading");
              heading?.scrollIntoView({ block: "start" });
              heading?.focus({ preventScroll: true });
            }}>Jump to the proposed question</button>
          </div>}
          {personal ? (
            <>
              <X1Sources
                key={base}
                caseBase={base}
                revision={data.revision}
                onChanged={() => void refresh()}
              />
              {!review?.allowExternalResearch ? (
                <section className="sl-sheet">
                  <h2>Check news about companies in your fund</h2>
                  <p>
                    Find news published after your fund report, then turn a
                    relevant change into a question for your fund contact. With
                    your permission, selected company evidence and relevant sale
                    terms are processed by Akta, Roundtable, Nicrron and PRISM.
                    Your X1 credentials are never shared with them.
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
                    Allow company research for this review
                  </button>
                </section>
              ) : (
                <ResearchPanel
                  key={base}
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
                onSelection={setResearchSelection}
                revision={data.revision}
                onPrepared={() => {
                  setResearchVersion((v) => v + 1);
                  void providerRefresh();
                  document.getElementById("research-heading")?.scrollIntoView({
                    behavior: matchMedia("(prefers-reduced-motion: reduce)")
                      .matches
                      ? "auto"
                      : "smooth",
                    block: "start",
                  });
                }}
              />
              <ResearchPanel
                selection={researchSelection}
                key={base}
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
                    Fund contact’s answer ·{" "}
                    {currency(data.answer.distributionCents)}
                  </span>
                  <p>{data.answer.text}</p>
                  <small>{data.answer.source.label}</small>
                </div>
              ) : (
                <div className="sl-waiting">
                  <h3>
                    {role === "gp"
                      ? "Add your answer below."
                      : "The fund contact’s answer will appear here."}
                  </h3>
                  <p>
                    {role === "gp"
                      ? "Confirm the amount and explain which document supports it."
                      : role === "buyer"
                        ? "Your fund contact supplies the payout amount. You can confirm the buyer’s sale terms in the form below."
                        : personal
                          ? "Create a private invitation using the invitation form so your fund contact can answer."
                          : "Choose the button below to try the fund contact’s part of this example."}
                  </p>
                </div>
              )}
              {!personal && role === "lp" && !data.answer && (
                <button
                  className="sl-secondary"
                  onClick={() => void switchRole("gp")}
                >
                  Try answering as the fund contact
                </button>
              )}
              {role === "gp" && (
                <AnswerForm
                  key={`${draftEpoch}:${JSON.stringify(data.answer)}`}
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
                    <summary>Edit the question</summary>
                    <QuestionForm
                      key={`${draftEpoch}:${data.question}`}
                      onSubmit={(e) => {
                        e.preventDefault();
                        const f = new FormData(e.currentTarget);
                        return command(
                          {
                            kind: "set_question",
                            text: f.get("question"),
                            sourceNote: "Question written by the investor",
                          },
                          "Question updated. A fresh fund contact answer is required.",
                        );
                      }}
                    >
                      <label>
                        Your question
                        <textarea
                          name="question"
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
                    </QuestionForm>
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
                  key={`${draftEpoch}:${JSON.stringify(data.offer)}`}
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
              {personal && role === "lp" ? (
                <Collaborators
                  caseBase={base}
                  answered={!!data.answer}
                  needsBuyer={
                    !!data.answer &&
                    (data.offer.priceAdjustmentCents === null ||
                      data.offer.distributionRecipient === null)
                  }
                />
              ) : (
                <>
                  <h2>
                    {role === "gp"
                      ? "What happens after you answer?"
                      : role === "buyer"
                        ? "What happens when terms change?"
                        : "Keep the answer with the offer"}
                  </h2>
                  <p>
                    {role === "gp"
                      ? "Your answer appears in the investor’s review. They can check the amount against the offer and save their review. You don’t need to send a separate document."
                      : role === "buyer"
                        ? "The investor sees the revised terms and must review them again. Their earlier review stays in the history."
                        : "The fund contact supplies the payout amount. The sale agreement says who keeps it. Second Look brings both together so you can review what you would receive."}
                  </p>
                </>
              )}
            </aside>
          </div>
        </>
      )}
      {view === "conversation" && role !== "lp" && (
        <ReviewRequirements
          key={draftEpoch}
          base={base}
          role={role}
          revision={data.revision}
          onChanged={refresh}
        />
      )}
      {view === "decision" && role === "lp" && (
        <>
          <section className="sl-decision-sheet">
            <div className="sl-decision-title">
              <h2>{approved ? "Your review is saved" : ready ? "Ready to save your review" : "Complete your review"}</h2>
              <span>Offer version {data.offer.version}</span>
            </div>
            <CashTerms data={data} />
            <p className="sl-help">
              This is the current sale, not an alternative comparison quote.
            </p>
            {!ready && (
              <div className="sl-review-next">
                <h3>What needs to happen next</h3>
                <ul>
                  {!data.answer && <li>Ask your fund contact to confirm the payout amount and the notice that supports it.</li>}
                  {data.offer.priceAdjustmentCents === null && <li>Ask the buyer whether the price has any additional adjustment.</li>}
                  {data.offer.distributionRecipient === null && <li>Ask the buyer to confirm who keeps the fund payout under the sale agreement.</li>}
                  {review?.diligenceBlockers?.map((b) => <li key={b}>{b}</li>)}
                </ul>
                <p>You can save your review once these details are complete. You can download the current summary at any time.</p>
              </div>
            )}
            {approved ? (
              <p className="sl-review-saved" role="status">Your review is saved for these terms. Download a copy to keep or share.</p>
            ) : ready ? (
              <p>Save these terms and the fund’s answer in a dated summary. Saving records your review; it does not accept the sale or send money.</p>
            ) : null}
            <div className="sl-actions sl-review-actions">
              {!ready ? (
                <button
                  className="sl-primary"
                  onClick={() => {
                    if (!data.answer || data.offer.priceAdjustmentCents === null || data.offer.distributionRecipient === null) {
                      go("conversation");
                    } else {
                      const section = document.getElementById("review-requirements");
                      section?.scrollIntoView({ block: "start" });
                      section?.focus();
                    }
                  }}
                >
                  {!data.answer
                    ? "Get the fund contact’s answer"
                    : data.offer.priceAdjustmentCents === null || data.offer.distributionRecipient === null
                      ? "Ask the buyer to confirm the terms"
                      : "Resolve the open requirements"}
                </button>
              ) : !approved ? (
                <button
                  className="sl-primary"
                  disabled={busy}
                  onClick={() => void command(
                    { kind: "approve" },
                    "Review recorded for this version. A later change will require a fresh review.",
                  )}
                >
                  {busy ? "Saving review…" : "Save this review"}
                </button>
              ) : null}
              <RecordDownload base={base} revision={data.revision} />
            </div>
            <details className="sl-source sl-review-sources">
              <summary>Details behind these figures</summary>
              <dl className="sl-review-checks">
                <div>
                  <dt>Fund contact’s answer</dt>
                  <dd className={!data.answer ? "sl-review-missing" : undefined}>
                    {data.answer
                      ? `${currency(data.answer.distributionCents)} reported for this fund interest`
                      : "Waiting for the payout amount and supporting notice"}
                  </dd>
                </div>
                <div>
                  <dt>Price adjustment</dt>
                  <dd className={data.offer.priceAdjustmentCents === null ? "sl-review-missing" : undefined}>
                    {data.offer.priceAdjustmentCents === null
                      ? "The buyer needs to confirm this"
                      : data.offer.priceAdjustmentCents === 0
                        ? "No adjustment in the recorded offer"
                        : `${currency(data.offer.priceAdjustmentCents)} in the recorded offer`}
                  </dd>
                </div>
                <div>
                  <dt>Who keeps the fund payout?</dt>
                  <dd className={data.offer.distributionRecipient === null ? "sl-review-missing" : undefined}>
                    {data.offer.distributionRecipient === null
                      ? "The buyer needs to confirm the sale terms"
                      : data.offer.distributionRecipient === "seller"
                        ? "You, under the recorded sale terms"
                        : "The buyer, under the recorded sale terms"}
                  </dd>
                </div>
              </dl>
              {data.answer && (
                <details className="sl-source">
                  <summary>Read the fund contact’s full answer</summary>
                  <blockquote>{data.answer.text}</blockquote>
                </details>
              )}
            </details>
            {!personal && approved && (
              <div className="sl-demo-next">
                <p>What if the buyer changes who keeps the fund payout after this review?</p>
                <button className="sl-secondary" onClick={() => void switchRole("buyer")}>
                  Try changing the buyer’s terms
                </button>
              </div>
            )}
          </section>
          <ReviewRequirements
            key={draftEpoch}
            base={base}
            role={role}
            revision={data.revision}
            onChanged={refresh}
          />
          {!!(review?.events.length || review?.reviews.length) && (
            <section className="sl-history">
              <h2>The decision history</h2>
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
            </section>
          )}
        </>
      )}
      <div className="sl-case-bottom">
        <span>Saved case · version {data.revision}</span>
        <button
          className="sl-text-button"
          disabled={busy}
          onClick={() =>
            void loadLatest("You’re looking at the latest saved review.")
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
        <span>
          {data.privateReview ? "Buyer pays you" : "Buyer pays the investor"}
        </span>
        <strong>{currency(data.offer.purchasePriceCents)}</strong>
      </div>
      <div
        className={
          data.offer.priceAdjustmentCents === null ? "sl-cash-unresolved" : ""
        }
      >
        <span>Adjustment in the offer</span>
        <strong>
          {data.offer.priceAdjustmentCents === null
            ? "Not confirmed"
            : `${data.offer.priceAdjustmentCents >= 0 ? "+ " : ""}${currency(data.offer.priceAdjustmentCents)}`}
        </strong>
      </div>
      <div
        className={
          !data.answer || data.offer.distributionRecipient === null
            ? "sl-cash-unresolved"
            : ""
        }
      >
        <span>
          {data.offer.distributionRecipient === null
            ? "Who keeps the fund payout?"
            : data.offer.distributionRecipient === "seller"
              ? data.privateReview
                ? "Fund payout you keep"
                : "Fund payout the investor keeps"
              : "Fund payout goes to the buyer"}
        </span>
        <strong>
          {data.offer.distributionRecipient === null
            ? "Check the sale agreement"
            : data.offer.distributionRecipient === "buyer"
              ? "Not included"
              : amount === undefined
                ? "Amount not confirmed"
                : `+ ${currency(amount)}`}
        </strong>
      </div>
      <div
        className={`sl-cash-total ${total == null ? "sl-cash-unresolved" : ""}`}
      >
        <span>
          {!data.privateReview
            ? "Investor’s private review"
            : total == null
              ? "Before calling this your total"
              : "Estimated cash before taxes and fees"}
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
function QuestionForm({
  onSubmit,
  children,
}: {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<boolean>;
  children: React.ReactNode;
}) {
  const draft = useDraftGuard();
  return (
    <form
      onChange={draft.markDirty}
      onSubmit={async (e) => {
        if (await onSubmit(e)) draft.markClean();
      }}
    >
      {children}
    </form>
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
  onSave: (c: unknown) => Promise<boolean>;
}) {
  const draft = useDraftGuard();
  const [amount, setAmount] = useState(
      data.answer ? String(data.answer.distributionCents / 100) : "",
    ),
    [text, setText] = useState(data.answer?.text ?? ""),
    [error, setError] = useState("");
  return (
    <form
      className="sl-sheet"
      onChange={draft.markDirty}
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        try {
          const saved = await onSave({
            kind: "answer",
            distributionCents: cents(amount),
            text,
          });
          if (saved) draft.markClean();
        } catch (e) {
          setError((e as Error).message);
        }
      }}
    >
      <h2>{data.answer ? "Update your answer" : "Answer the investor"}</h2>
      {example && (
        <aside className="funding-example">
          <p>
            For this walkthrough, fill in the prepared $100,000 fund answer.
            Review it below, then choose Save my answer.
          </p>
          <button
            className="secondary"
            disabled={busy}
            type="button"
            onClick={() => {
              if (!confirmDiscardChanges()) return;
              draft.markDirty();
              setAmount("100000");
              setText(
                "Fictional fund response: the example distribution notice allocates $100,000 to this LP interest. This is an illustrative contractual assumption, not a forecast from game performance. The signed sale terms determine whether the seller or buyer receives it.",
              );
            }}
          >
            Use the labeled fictional example
          </button>
        </aside>
      )}
      <label>
        How much will this fund interest receive? (USD)
        <input
          inputMode="decimal"
          value={amount}
          required
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter the confirmed amount"
        />
      </label>
      <label>
        Which dated notice or report confirms this amount?
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          required
          maxLength={5000}
          rows={5}
          placeholder="e.g. The October distribution notice lists $100,000 for this fund interest."
        />
      </label>
      {error && (
        <p className="sl-error" role="alert">
          {error}
        </p>
      )}
      <p className="sl-help">
        Saving shares your answer with the investor. If you change an earlier
        answer, the investor will need to review it again.
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
  onSave: (c: unknown) => Promise<boolean>;
}) {
  const draft = useDraftGuard();
  const [error, setError] = useState("");
  return (
    <form
      className="sl-sheet"
      onChange={draft.markDirty}
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        const f = new FormData(e.currentTarget);
        try {
          const saved = await onSave({
            kind: "revise_offer",
            purchasePriceCents: cents(f.get("payment")),
            priceAdjustmentCents: f.get("adjustment")
              ? cents(f.get("adjustment"), true)
              : null,
            distributionRecipient:
              f.get("recipient") === "unknown" ? null : f.get("recipient"),
            sourceNote: f.get("source"),
          });
          if (saved) draft.markClean();
        } catch (e) {
          setError((e as Error).message);
        }
      }}
    >
      <h2>Confirm or update the sale offer</h2>
      <div className="sl-form-grid">
        <label>
          Buyer’s payment to the investor (USD)
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
          Who keeps the fund payout under the sale agreement?
          <select
            name="recipient"
            required
            defaultValue={data.offer.distributionRecipient ?? "unknown"}
          >
            <option value="unknown">Not confirmed yet</option>
            <option value="seller">
              The investor selling the fund interest
            </option>
            <option value="buyer">The buyer of the fund interest</option>
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
        {busy ? "Preparing record…" : "Download review summary"}
      </button>
      {error && (
        <p role="alert" className="sl-error">
          {error}
        </p>
      )}
    </>
  );
}
