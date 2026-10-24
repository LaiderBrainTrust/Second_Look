import { useEffect, useState } from "react";
import type { GamingSnapshot, HoldingEvidence } from "../shared/gaming";
import { GAMING_HOLDINGS, GAMING_DISCLOSURE } from "../shared/gaming";
import type { ResearchRun } from "../shared/research";

import { request as api } from "./product-api";

const percent = (value: number | null) =>
  value === null ? "Not enough data" : `${value}%`;
const date = (value: string) =>
  new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
function Evidence({ item }: { item: HoldingEvidence }) {
  const steam = item.steam;
  return (
    <>
      <div className="game-verdict">
        <span
          className={`priority ${item.priority === "Investigate" ? "priority-alert" : ""}`}
        >
          {item.priority}
        </span>
        <p>{item.reason}</p>
      </div>
      {steam && (
        <>
          <div className="game-metrics">
            <div>
              <span>Before report</span>
              <strong>{percent(steam.baseline.positivePercent)}</strong>
              <small>
                positive · {steam.baseline.count} sampled reviews
                <br />
                {date(steam.baseline.from)}–{date(steam.baseline.to)}
              </small>
            </div>
            <div>
              <span>After report</span>
              <strong>{percent(steam.current.positivePercent)}</strong>
              <small>
                positive · {steam.current.count} sampled reviews
                <br />
                {date(steam.current.from)}–{date(steam.current.to)}
              </small>
            </div>
            <div>
              <span>Change in sample</span>
              <strong>
                {steam.deltaPoints === null
                  ? "Unknown"
                  : `${steam.deltaPoints > 0 ? "+" : ""}${steam.deltaPoints}`}
              </strong>
              <small>
                {steam.deltaPoints === null ? "" : "percentage points"}
                {steam.deltaPoints !== null && <br />}
                {steam.playersNow === null
                  ? "Player count unavailable"
                  : `${steam.playersNow.toLocaleString()} players online at observation`}
                <br />
                Observed {date(steam.retrievedAt)}
              </small>
            </div>
          </div>
          <details className="evidence-detail">
            <summary>See the player evidence and its limits</summary>
            <p>
              At most 100 recent English reviews per window; not all players or
              a representative survey. Different window lengths and low volume
              can distort comparisons. We only compare windows with at least 20
              reviews each. A player count is a point-in-time observation, not a
              growth rate.
            </p>
            <div className="review-excerpts">
              {steam.current.excerpts.map((r, i) => (
                <blockquote key={i}>
                  “{r.text}…”
                  <footer>
                    {r.positive ? "Recommended" : "Not recommended"} · {r.date}
                  </footer>
                </blockquote>
              ))}
            </div>
            <p>
              Steam lists the developer as{" "}
              {steam.developers.join(", ") || "unavailable"} and publisher as{" "}
              {steam.publishers.join(", ") || "unavailable"}. These credits do
              not establish equity ownership or economic rights.
            </p>
            <a href={steam.sourceUrl} target="_blank" rel="noreferrer">
              Open Steam source ↗
            </a>
          </details>
        </>
      )}
      {item.profile && (
        <div className="studio-profile">
          <h4>The company behind the game</h4>
          <p>
            <strong>{item.profile.name}</strong>
            {item.profile.foundedYear
              ? ` · Founded ${item.profile.foundedYear}`
              : ""}
            {item.profile.headcount
              ? ` · ${item.profile.headcount} people`
              : ""}
          </p>
          <p className="muted">
            Akta classifies ownership as:{" "}
            {item.profile.ownership ?? "not available"}. This is provider
            research, not a verified cap table.
          </p>
          <details>
            <summary>Read Akta’s business profile</summary>
            <p className="profile-description">{item.profile.description}</p>
            {item.profile.website && (
              <a href={item.profile.website} target="_blank" rel="noreferrer">
                Company website ↗
              </a>
            )}
            <p className="muted">
              Retrieved {date(item.profile.retrievedAt)}. Provider-generated
              summary; verify commercial claims with your fund contact and
              primary documents.
            </p>
          </details>
        </div>
      )}
      <div className="game-news">
        <h4>Outside the game · Akta news</h4>
        {item.news.length ? (
          <ul>
            {item.news.slice(0, 3).map((n) => (
              <li key={n.source.id}>
                <a href={n.source.url} target="_blank" rel="noreferrer">
                  {n.claim} ↗
                </a>
                <small>
                  {date(n.publishedAt)} · headline, not a verified commercial
                  conclusion
                </small>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">
            {item.errors.some((e) => e.startsWith("Akta"))
              ? "News could not be checked."
              : "No matching post-report articles in Akta’s first page. This does not establish that nothing changed."}
          </p>
        )}
      </div>
      {item.errors.length > 0 && (
        <p className="error">{item.errors.join(" ")}</p>
      )}
    </>
  );
}
export function GamingPanel({
  revision,
  onPrepared,
  onSelection,
}: {
  revision: number;
  onPrepared: () => void;
  onSelection: (selection: { holdingId: string; snapshotId: string } | null) => void;
}) {
  const [snapshot, setSnapshot] = useState<GamingSnapshot | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<GamingSnapshot | null>(
    null,
  );
  const [useSaved, setUseSaved] = useState(false);
  const [selected, setSelected] = useState("");
  const [brokenCovers, setBrokenCovers] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const load = async () => {
    const result = await api("/api/case/gaming");
    setSnapshot(result.snapshot);
    setSavedSnapshot(result.savedSnapshot);
  };
  useEffect(() => {
    void load().catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    if (snapshot?.status !== "fetching") return;
    const timer = setTimeout(() => {
      void load().catch((e) => setError(e.message));
    }, 3000);
    return () => clearTimeout(timer);
  }, [snapshot]);
  const displaySnapshot = useSaved && savedSnapshot ? savedSnapshot : snapshot;
  const items = displaySnapshot?.holdings ?? [];
  const item = items.find((h) => h.holding.id === selected) ?? items[0];
  useEffect(() => {
    onSelection(item && displaySnapshot ? { holdingId: item.holding.id, snapshotId: displaySnapshot.id } : null);
  }, [item?.holding.id, displaySnapshot?.id]);
  async function run(work: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await work();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not complete the request.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="gaming" aria-labelledby="gaming-heading">
      <div className="gaming-heading">
        <div>
          <h2 id="gaming-heading">
            The report is old.
            <br />
            The players aren’t waiting.
          </h2>
          <p>
            Before selling a gaming-fund investment, check what has changed
            since the last fund report. Player reactions and company news can
            reveal questions worth asking your fund contact.
          </p>
        </div>
        <button
          disabled={busy || snapshot?.status === "fetching"}
          onClick={() =>
            void run(async () => {
              setUseSaved(false);
              setSnapshot(
                await api("/api/case/gaming/refresh", {
                  expectedRevision: revision,
                }),
              );
            })
          }
        >
          {snapshot?.status === "fetching"
            ? "Checking Steam + Akta…"
            : snapshot
              ? "Check for newer game and company news"
              : "Check these three games"}
        </button>
      </div>
      <p className="scenario-label">{GAMING_DISCLOSURE}</p>
      <p>
        <strong>How to use this example:</strong> check the three games, choose
        one to inspect, then draft a question about it. The draft appears below
        for you to review before adding it to the conversation with your fund.
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {snapshot?.error && (
        <p role="alert" className="error">
          {snapshot.error}
        </p>
      )}
      {snapshot?.status === "fetching" && (
        <p role="status" className="waiting">
          Checking the three games and their studios. The snapshot is saved; you
          can leave and come back.
        </p>
      )}
      {savedSnapshot && snapshot?.id !== savedSnapshot.id && (
        <div className="waiting" role="status">
          <p>
            {useSaved
              ? `Showing saved evidence from ${date(savedSnapshot.createdAt)}. This is not a fresh provider response.`
              : "A previous successful evidence check is still available."}
          </p>
          <button className="secondary" onClick={() => setUseSaved(!useSaved)}>
            {useSaved ? "Show latest check" : "Use previous saved evidence"}
          </button>
        </div>
      )}
      <div className="game-tabs" aria-label="Choose a game">
        {(items.length ? items.map((h) => h.holding) : GAMING_HOLDINGS).map(
          (holding) => {
            const evidence = items.find((h) => h.holding.id === holding.id);
            return (
              <button
                className={`game-tab ${item?.holding.id === holding.id ? "selected" : ""}`}
                key={holding.id}
                aria-pressed={item?.holding.id === holding.id}
                disabled={!evidence}
                onClick={() => setSelected(holding.id)}
              >
                {evidence?.steam?.imageUrl && !brokenCovers[holding.id] ? (
                  <img
                    src={evidence.steam.imageUrl}
                    alt=""
                    width="460"
                    height="215"
                    loading="lazy"
                    onError={() =>
                      setBrokenCovers((b) => ({ ...b, [holding.id]: true }))
                    }
                  />
                ) : (
                  <span className="game-cover-fallback" aria-hidden="true">
                    {holding.game}
                  </span>
                )}
                <span>
                  <small>
                    {evidence
                      ? `Investigation priority ${evidence.rank}`
                      : holding.studio}
                  </small>
                  <strong>{holding.game}</strong>
                  {item?.holding.id === holding.id && (
                    <span className="sl-game-selected"><span aria-hidden="true">✓ </span>Selected game</span>
                  )}
                  <small>
                    {holding.fundNavExposurePercent}% of the example fund’s
                    reported value
                  </small>
                </span>
              </button>
            );
          },
        )}
      </div>
      {item && (
        <article className="game-evidence">
          <div className="game-evidence-heading">
            <div>
              <h3>{item.holding.game}</h3>
              <p className="muted">{item.holding.studio}</p>
            </div>
            <span className="tag">Real observations · fictional exposure</span>
          </div>
          <Evidence item={item} />
          <div className="research-bridge">
            <div>
              <strong>What does this mean for your investment?</strong>
              <p>
                These signals do not tell us how much cash you will receive.
                Draft a question asking your fund contact what changed at this
                company and whether it affects payments to investors.
              </p>
            </div>
            <button
              disabled={busy || (!item.steam && !item.news.length)}
              onClick={() =>
                void run(async () => {
                  const prepared: ResearchRun = await api(
                    `/api/case/gaming/${displaySnapshot!.id}/prepare`,
                    { expectedRevision: revision, holdingId: item.holding.id },
                  );
                  if (
                    prepared.status === "ready" ||
                    prepared.status === "dispatching"
                  )
                    await api(`/api/case/research/${prepared.id}/review`, {
                      expectedRevision: revision,
                      findingId: prepared.selectedFindingId,
                    });
                  setMessage(
                    prepared.status === "done"
                      ? "Your saved question is ready below. Review it, then select ‘Use this question’ to add it to the conversation."
                      : "Your question is being drafted. It will appear below for your review; nothing has been sent to your fund contact.",
                  );
                  onPrepared();
                })
              }
            >
              {busy ? "Preparing review…" : "Draft a question about this game"}
            </button>
          </div>
        </article>
      )}
      {message && (
        <p role="status" className="waiting">
          {message}
        </p>
      )}
      {displaySnapshot && (
        <details>
          <summary>When this was checked and how games are ranked</summary>
          <p className="muted">
            Evidence snapshot {date(displaySnapshot.createdAt)} · report cutoff{" "}
            {displaySnapshot.reportCutoff}. Ranking prioritizes investigation,
            not expected returns. A ≥10 percentage-point sample decline comes
            first, then missing Steam evidence; remaining games sort by sample
            change, then fictional exposure.
          </p>
        </details>
      )}
    </section>
  );
}
