import { useEffect, useState } from "react";
import type { CaseView } from "../shared/contracts";
import type { Company, ResearchRun } from "../shared/research";

import { request as api } from "./product-api";

export function ResearchPanel({
  data,
  refreshVersion,
  onShared,
  onProviderChange,
  caseBase = "/api/case",
}: {
  caseBase?: string;
  data: CaseView;
  refreshVersion: number;
  onShared: (data: CaseView) => void;
  onProviderChange: () => void;
}) {
  const [showAll, setShowAll] = useState(caseBase !== "/api/case");
  const [query, setQuery] = useState(
    caseBase === "/api/case" ? "Pounce Light" : "",
  );
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [after, setAfter] = useState(
    caseBase === "/api/case" ? "2026-09-30" : "",
  );
  const [runs, setRuns] = useState<ResearchRun[]>([]);
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const replace = (run: ResearchRun) =>
    setRuns((previous) =>
      previous.some((r) => r.id === run.id)
        ? previous.map((r) => (r.id === run.id ? run : r))
        : [run, ...previous],
    );
  async function load() {
    setRuns((await api(`${caseBase}/research`)).runs);
  }
  useEffect(() => {
    let active = true;
    void api(`${caseBase}/research`)
      .then((result) => {
        if (active) setRuns(result.runs);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [caseBase, data.revision, refreshVersion]);
  useEffect(() => {
    const pending = runs.filter((run) => run.status === "queued");
    if (!pending.length) return;
    let stopped = false;
    const timer = setTimeout(async () => {
      for (const run of pending) {
        if (stopped) break;
        try {
          const next = await api(`${caseBase}/research/${run.id}/check`, {});
          if (!stopped) replace(next);
        } catch (e) {
          if (!stopped)
            setError(
              e instanceof Error
                ? e.message
                : "Could not check the saved task.",
            );
        }
      }
      if (!stopped) onProviderChange();
    }, 5000);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [runs, caseBase]);
  async function action(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
      onProviderChange();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not complete the request.",
      );
      await load().catch(() => {});
    } finally {
      setBusy(false);
    }
  }
  const currentRuns = runs.filter(
    (run) => run.gamingContext && run.caseRevision === data.revision,
  );
  const visibleRuns = showAll
    ? runs
    : currentRuns.length
      ? currentRuns.slice(0, 1)
      : runs.filter((run) => run.gamingContext).slice(0, 1);
  return (
    <section className="research" aria-labelledby="research-heading">
      <h2 id="research-heading">
        Find company news worth asking your fund about
      </h2>
      <p>
        Look up a company named in your fund report. We find recent news and
        help draft a question for your contact at the fund. Their answer can
        help you understand whether the news affects your investment before you
        sell.
      </p>
      {caseBase === "/api/case" && (
        <p className="muted">
          The fund is fictional. The company and news are real demonstration
          inputs; no holding in this fund is established.
        </p>
      )}
      <details
        className="extra-research"
        open={caseBase !== "/api/case" ? true : undefined}
      >
        <summary>Look up a company from your fund report</summary>
        <p>
          Enter a company named in your report, such as “Pounce Light”, or paste
          its website. Choose the correct match, then enter the date of your
          latest fund report to find newer news.
        </p>
        <form
          className="research-search"
          onSubmit={(e) => {
            e.preventDefault();
            void action(async () => {
              const result = await api(
                caseBase === "/api/case"
                  ? "/api/research/search"
                  : `${caseBase}/research/lookup/search`,
                { query: query.trim() },
              );
              setCompanies(result.companies);
              setCompanyId("");
              setShowAll(true);
              if (!result.companies.length)
                setError(
                  "No companies found. Try a company website or another name.",
                );
            });
          }}
        >
          <div>
            <label htmlFor="company-search">Company name or website</label>
            <input
              id="company-search"
              name="company"
              placeholder="For example, Pounce Light…"
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              required
              maxLength={300}
              pattern={".*\\S.*"}
            />
          </div>
          <button disabled={busy}>
            {busy ? "Working…" : "Search companies"}
          </button>
        </form>
        {companies.length > 0 && (
          <form
            className="research-search"
            onSubmit={(e) => {
              e.preventDefault();
              void action(async () => {
                replace(
                  await api(`${caseBase}/research`, {
                    expectedRevision: data.revision,
                    companyId,
                    after,
                  }),
                );
              });
            }}
          >
            <div>
              <label htmlFor="company-match">Choose the matching company</label>
              <select
                id="company-match"
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                required
              >
                <option value="">Choose the matching company…</option>
                {companies.map((c) => (
                  <option key={c.uuid} value={c.uuid}>
                    {c.name} — {c.website || c.uuid}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="report-cutoff">
                Date of your latest fund report
              </label>
              <input
                id="report-cutoff"
                type="date"
                value={after}
                onChange={(e) => setAfter(e.target.value)}
                required
              />
            </div>
            <button disabled={busy || !companyId}>
              {busy ? "Fetching…" : "Find news since that report"}
            </button>
          </form>
        )}
      </details>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div aria-live="polite">
        {!visibleRuns.length && (
          <p className="waiting">
            {caseBase === "/api/case"
              ? "Choose a game above and select ‘Draft a question about this game’, or look up another company. Your research and draft question will appear here."
              : "Start with one company from your fund report. Search above to see matching companies; nothing is sent to your fund contact until you choose a question and invite them."}
          </p>
        )}
        {visibleRuns.slice(0, 15).map((run) => {
          const stale = run.caseRevision !== data.revision;
          return (
            <article className="research-run" key={run.id}>
              <div className="research-title">
                <h3>{run.company.name}</h3>
                <span>
                  {run.acceptedRevision
                    ? "Added to your conversation"
                    : {
                        fetching: "Finding news…",
                        ready: "Choose an article below",
                        dispatching: "Preparing your draft…",
                        queued: "Drafting your question…",
                        done: "Your question is ready",
                        blocked: "Research needs attention",
                      }[run.status]}
                </span>
              </div>
              <p className="muted">
                Saved research started{" "}
                {new Date(run.createdAt).toLocaleString()}.{" "}
                {run.status === "done"
                  ? "This is a saved result from that date."
                  : ""}
              </p>
              {stale && !run.acceptedRevision && (
                <p className="changed">
                  <strong>This review has changed.</strong> This research
                  belongs to an earlier version. Start a new search above before
                  adding a question about the current offer.
                </p>
              )}
              {run.error && <p className="error">{run.error}</p>}
              {run.status === "fetching" && (
                <p>Fetching dated news from Akta…</p>
              )}
              {run.status === "ready" && (
                <>
                  <p className="muted">{run.coverage}</p>
                  {run.findings.length ? (
                    <fieldset disabled={busy || stale}>
                      <legend>
                        Which news should your fund contact explain?
                      </legend>
                      {run.findings.map((f) => (
                        <div className="finding" key={f.source.id}>
                          <label>
                            <input
                              type="radio"
                              name={`finding-${run.id}`}
                              value={f.source.id}
                              checked={
                                (chosen[run.id] ?? run.selectedFindingId) ===
                                f.source.id
                              }
                              onChange={() =>
                                setChosen((prev) => ({
                                  ...prev,
                                  [run.id]: f.source.id,
                                }))
                              }
                            />
                            <span>
                              {f.claim}
                              <small>
                                {f.publishedAt.slice(0, 10)} · {f.companyName}
                              </small>
                            </span>
                          </label>
                          <a
                            href={f.source.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Read source ↗
                          </a>
                        </div>
                      ))}
                    </fieldset>
                  ) : (
                    <p>
                      No matching articles in this result page. Try an earlier
                      cutoff or another company.
                    </p>
                  )}
                  <button
                    disabled={
                      busy ||
                      stale ||
                      !(chosen[run.id] ?? run.selectedFindingId)
                    }
                    onClick={() =>
                      void action(async () =>
                        replace(
                          await api(`${caseBase}/research/${run.id}/review`, {
                            expectedRevision: data.revision,
                            findingId: chosen[run.id] ?? run.selectedFindingId,
                          }),
                        ),
                      )
                    }
                  >
                    {busy ? "Sending…" : "Draft a question from this evidence"}
                  </button>
                </>
              )}
              {run.status === "dispatching" && (
                <button
                  disabled={busy}
                  onClick={() =>
                    void action(async () =>
                      replace(
                        await api(`${caseBase}/research/${run.id}/review`, {
                          expectedRevision: data.revision,
                        }),
                      ),
                    )
                  }
                >
                  Check whether your draft is ready
                </button>
              )}
              {run.status === "queued" && (
                <>
                  <p>
                    Your question is being drafted. You can leave this page and
                    return later; the work will continue.
                  </p>
                  <button
                    className="secondary"
                    disabled={busy}
                    onClick={() =>
                      void action(async () =>
                        replace(
                          await api(`${caseBase}/research/${run.id}/check`, {}),
                        ),
                      )
                    }
                  >
                    Check for your draft
                  </button>
                </>
              )}
              {run.status === "blocked" && run.taskId && (
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() =>
                    void action(async () =>
                      replace(
                        await api(`${caseBase}/research/${run.id}/check`, {}),
                      ),
                    )
                  }
                >
                  Try checking your draft again
                </button>
              )}
              {run.taskId && (
                <details>
                  <summary>Research task receipt</summary>
                  <code>{run.taskId}</code>
                </details>
              )}
              {run.result && (
                <>
                  <blockquote>
                    {run.result.question}
                    <footer>{run.result.explanation}</footer>
                  </blockquote>
                  <details>
                    <summary>How this draft was created</summary>
                    <p className="muted">
                      PRISM trace:{" "}
                      {run.result.trace?.status.replaceAll("_", " ") ??
                        "not recorded for this older review"}
                      {run.result.trace?.id ? ` · ${run.result.trace.id}` : ""}
                    </p>
                  </details>
                  <details>
                    <summary>Source versions used by the reviewer</summary>
                    <ul>
                      {run.result.sources.map((s) => (
                        <li key={`${s.path}:${s.version}`}>
                          <code>
                            {s.path} @ {s.version}
                          </code>
                        </li>
                      ))}
                    </ul>
                  </details>
                  <p className="muted">
                    Add this draft to the conversation with your fund contact.
                    This replaces the current question and clears its previous
                    answer. You’ll then see how to invite your contact; no email
                    is sent automatically.
                  </p>
                  <button
                    disabled={busy || stale || Boolean(run.acceptedRevision)}
                    onClick={() =>
                      void action(async () => {
                        onShared(
                          await api(`${caseBase}/research/${run.id}/share`, {
                            expectedRevision: data.revision,
                          }),
                        );
                        await load();
                      })
                    }
                  >
                    {run.acceptedRevision
                      ? "Question added to your conversation"
                      : busy
                        ? "Adding question…"
                        : "Use this question"}
                  </button>
                </>
              )}
            </article>
          );
        })}
      </div>
      {caseBase === "/api/case" &&
      (runs.length > visibleRuns.length || showAll) ? (
        <button className="secondary" onClick={() => setShowAll(!showAll)}>
          {showAll
            ? "Show latest gaming review only"
            : `Show all ${runs.length} saved research checks`}
        </button>
      ) : null}
    </section>
  );
}
