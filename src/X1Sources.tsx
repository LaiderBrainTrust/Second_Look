import { useEffect, useState } from "react";
import { request } from "./product-api";
import { confirmDiscardChanges } from "./useDraftGuard";
import type { X1Evidence } from "../shared/funding";
export function X1Sources({
  caseBase,
  revision,
  onChanged,
  purpose = "sale",
}: {
  caseBase: string;
  revision: number;
  onChanged: () => void;
  purpose?: "sale" | "funding";
}) {
  const [status, setStatus] = useState<{
    configured: boolean;
    canConnectOAuth: boolean;
    canConnect?: boolean;
    mode?: string;
  } | null>(null);
  const [evidence, setEvidence] = useState<X1Evidence[]>([]),
    [matches, setMatches] = useState<(X1Evidence & { selectionId: string })[]>(
      [],
    );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [note, setNote] = useState(""),
    [query, setQuery] = useState(""),
    [searched, setSearched] = useState(false);
  const [reload, setReload] = useState(0);
  const [matchRevision, setMatchRevision] = useState<number | null>(null);
  useEffect(() => {
    let active = true;
    Promise.all([request(caseBase + "/x1"), request(caseBase + "/funding")])
      .then(([s, f]) => {
        if (active) {
          setError("");
          setStatus(s);
          setEvidence(f.evidence);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [caseBase, revision, reload]);
  async function act(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNote("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function search(text: string) {
    const q = text.trim();
    if (q.length < 3) {
      setError(
        "Enter a fund name or at least three letters from the document.",
      );
      return;
    }
    setQuery(q);
    setMatches([]);
    setSearched(false);
    void act(async () => {
      const r = await request(caseBase + "/x1/search", {
        expectedRevision: revision,
        query: q,
      });
      setMatches(r.matches);
      setMatchRevision(revision);
      setSearched(true);
    });
  }
  const example =
    status?.mode !== "individual_case_read_only" && status?.configured;
  return (
    <section className="sl-sheet">
      <div className="sl-decision-title">
        <h2>
          {purpose === "funding"
            ? "Find the notice for the payment you need to make"
            : "Find your fund’s documents"}
        </h2>
        <span className="sl-pill">X1 · optional</span>
      </div>
      <p>
        {purpose === "funding"
          ? "Look up a capital-call notice to check the amount and due date, or a cash record to check the money already available."
          : "Look up a distribution notice, fund report or sale agreement to check the amounts and terms in this review."}
      </p>
      <p className="sl-help">
        This searches documents already saved in X1. Start with a document type
        below, or enter the fund’s name. You can read a matching excerpt and
        save it with this review.
      </p>
      {error && (
        <p className="sl-error" role="alert">
          {error}
        </p>
      )}
      {matches.length > 0 && matchRevision !== revision && (
        <p role="status">
          The review changed. Search again to save an excerpt with the current
          version.
        </p>
      )}
      {note && (
        <p className="sl-success" role="status">
          {note}
        </p>
      )}
      {!status ? (
        error ? (
          <button
            type="button"
            onClick={() => {
              setError("");
              setReload((n) => n + 1);
            }}
          >
            Try connecting again
          </button>
        ) : (
          <p role="status">Checking your document connection…</p>
        )
      ) : !status.configured ? (
        <>
          <p>
            Connect X1 if you keep your financial documents there. You can also
            continue using the notices and records you already have outside this
            app.
          </p>
          {status.canConnectOAuth ? (
            <button
              className="sl-primary"
              disabled={busy}
              onClick={() => {
                if (!confirmDiscardChanges()) return;
                void act(async () => {
                  const r = await request(caseBase + "/x1/authorize", {});
                  const u = new URL(r.authorizationUrl);
                  if (
                    u.origin !== "https://clerk.x1wealth.com" ||
                    u.pathname !== "/oauth/authorize"
                  )
                    throw Error(
                      "The connection address was not recognized. Try again.",
                    );
                  location.assign(u.href);
                });
              }}
            >
              {busy ? "Opening X1…" : "Connect my X1 documents"}
            </button>
          ) : status.canConnect ? (
            <details>
              <summary>Connect using a read-only X1 key</summary>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const key = String(new FormData(form).get("key") ?? "");
                  form.reset();
                  void act(async () => {
                    const s = await request(caseBase + "/x1/connection", {
                      key,
                    });
                    setStatus({ ...status, ...s });
                  });
                }}
              >
                <p>
                  Get a read-only key from{" "}
                  <a
                    href="https://app.x1wealth.com/settings/api-keys"
                    target="_blank"
                    rel="noreferrer"
                  >
                    your X1 settings
                  </a>
                  .
                </p>
                <label>
                  Read-only X1 key
                  <input
                    type="password"
                    name="key"
                    autoComplete="off"
                    required
                  />
                </label>
                <button disabled={busy}>Connect documents</button>
              </form>
            </details>
          ) : (
            <p className="sl-help">
              Document connection is unavailable here. You can still enter the
              terms from your own records and ask your fund contact to confirm
              them.
            </p>
          )}
        </>
      ) : (
        <>
          {example && (
            <p className="sl-help">
              You’re searching the fictional documents prepared for this
              example. Try the capital-call notice first.
            </p>
          )}
          <div className="sl-actions" aria-label="Suggested document searches">
            <button
              type="button"
              className="sl-secondary"
              disabled={busy}
              onClick={() => search("capital")}
            >
              {example
                ? "Find the example capital-call notice"
                : "Find capital-call notices"}
            </button>
            <button
              type="button"
              className="sl-secondary"
              disabled={busy}
              onClick={() => search("distribution")}
            >
              Find distribution notices
            </button>
            <button
              type="button"
              className="sl-secondary"
              disabled={busy}
              onClick={() => search("liquidity")}
            >
              Find cash records
            </button>
          </div>
          <form
            className="sl-search-row"
            onSubmit={(e) => {
              e.preventDefault();
              search(query);
            }}
          >
            <label>
              Or search by fund name or words in a document
              <input
                name="query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                required
                minLength={3}
                maxLength={300}
                placeholder="e.g. Waypoint, capital call, or distribution"
              />
            </label>
            <button className="sl-primary" disabled={busy}>
              {busy ? "Searching documents…" : "Find matching documents"}
            </button>
          </form>
        </>
      )}
      {searched && !matches.length && (
        <p role="status">
          No matching excerpts found. Try the fund’s name or a shorter phrase.
          If the notice is not saved in X1, use your copy of the notice to enter
          the amount or ask your fund contact for it.
        </p>
      )}
      {!!matches.length && matchRevision === revision && (
        <>
          <h3>Read a result, then save the one that supports this review</h3>
          <p className="sl-help">
            Saving keeps a copy here. Check the amount and date before entering
            them in the review.
          </p>
        </>
      )}
      {(matchRevision === revision ? matches : []).map((m) => (
        <article className="sl-source-result" key={m.selectionId}>
          <h3>{m.label}</h3>
          <blockquote>{m.snippet}</blockquote>
          <p className="sl-help">
            {m.page ? `Page ${m.page} · ` : ""}
            {m.sourceDate
              ? `Document date: ${m.sourceDate} · `
              : ""}Retrieved {new Date(m.retrievedAt).toLocaleDateString()}
          </p>
          <button
            className="sl-secondary"
            disabled={busy}
            onClick={() =>
              void act(async () => {
                await request(caseBase + "/x1/import", {
                  expectedRevision: revision,
                  selectionId: m.selectionId,
                });
                setMatches([]);
                setSearched(false);
                setNote(
                  purpose === "funding"
                    ? "Saved below. Use the notice’s amount and due date in the payment form above; no amounts have been filled in automatically."
                    : "Saved below with your review. You can refer to it when checking the offer or asking your fund contact a question.",
                );
                onChanged();
              })
            }
          >
            Save this excerpt with my review
          </button>
        </article>
      ))}
      {!!evidence.length && (
        <details open>
          <summary>
            {evidence.length} saved document excerpt
            {evidence.length === 1 ? "" : "s"}
          </summary>
          {evidence.map((e, i) => (
            <article className="sl-source-result" key={e.contentHash + i}>
              <h3>{e.label}</h3>
              <blockquote>{e.snippet}</blockquote>
              <p className="sl-help">
                Saved {new Date(e.retrievedAt).toLocaleDateString()}. This is a
                dated copy of the source.
              </p>
            </article>
          ))}
        </details>
      )}
      <details className="sl-source">
        <summary>Document privacy and connection</summary>
        <p>
          Only you can search your connected X1 account. Saving an excerpt does
          not change X1 or automatically fill financial terms. Copies stay in
          this review after disconnecting and do not update automatically.
        </p>
        {status?.mode === "individual_case_read_only" && (
          <button
            className="sl-text-button"
            disabled={busy}
            onClick={() =>
              void act(async () => {
                const r = await request(caseBase + "/x1/disconnect", {});
                setStatus({ ...status, configured: false });
                setMatches([]);
                setNote(
                  r.notice ??
                    "X1 disconnected. Saved excerpts remain in this review.",
                );
              })
            }
          >
            Disconnect X1
          </button>
        )}
      </details>
    </section>
  );
}
