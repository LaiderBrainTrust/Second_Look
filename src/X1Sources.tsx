import { useEffect, useState } from "react";
import { request } from "./product-api";
import type { X1Evidence } from "../shared/funding";
export function X1Sources({
  caseBase,
  revision,
  onChanged,
}: {
  caseBase: string;
  revision: number;
  onChanged: () => void;
}) {
  const [status, setStatus] = useState<{
      configured: boolean;
      canConnectOAuth: boolean;
    } | null>(null),
    [evidence, setEvidence] = useState<X1Evidence[]>([]),
    [matches, setMatches] = useState<(X1Evidence & { selectionId: string })[]>(
      [],
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [note, setNote] = useState("");
  useEffect(() => {
    let active = true;
    Promise.all([request(caseBase + "/x1"), request(caseBase + "/funding")])
      .then(([s, f]) => {
        if (active) {
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
  }, [caseBase, revision]);
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
  return (
    <section className="sl-sheet">
      <div className="sl-decision-title">
        <h2>Bring the source into the conversation.</h2>
        <span className="sl-pill">X1 · optional</span>
      </div>
      <p>
        Search your X1 documents for the relevant passage. Only you can search
        your connected account, and you choose what to copy into this case.
      </p>
      {error && (
        <p role="alert" className="sl-error">
          {error}
        </p>
      )}
      {note && (
        <p role="status" className="sl-success">
          {note}
        </p>
      )}
      {!status ? (
        <p>Checking your connection…</p>
      ) : !status.configured ? (
        <>
          <button
            className="sl-primary"
            disabled={busy || !status.canConnectOAuth}
            onClick={() =>
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
              })
            }
          >
            {busy ? "Opening X1…" : "Connect my X1 account"}
          </button>
          {!status.canConnectOAuth && (
            <p className="sl-help">
              X1 sign-in is not enabled on this server. You can continue with
              entered sources and external research.
            </p>
          )}
        </>
      ) : (
        <>
          <form
            className="sl-search-row"
            onSubmit={(e) => {
              e.preventDefault();
              const q = new FormData(e.currentTarget).get("query");
              void act(async () => {
                const r = await request(caseBase + "/x1/search", {
                  expectedRevision: revision,
                  query: q,
                });
                setMatches(r.matches);
                if (!r.matches.length)
                  setNote(
                    "No matching passages were returned. Try a different phrase.",
                  );
              });
            }}
          >
            <label>
              What are you looking for?
              <input
                name="query"
                required
                minLength={3}
                maxLength={300}
                placeholder="e.g. capital call or distribution notice"
              />
            </label>
            <button className="sl-primary" disabled={busy}>
              {busy ? "Searching…" : "Search my documents"}
            </button>
          </form>
          <button
            className="sl-text-button"
            disabled={busy}
            onClick={() =>
              void act(async () => {
                const r = await request(caseBase + "/x1/disconnect", {});
                setStatus({ ...status, configured: false });
                setMatches([]);
                setNote(r.notice);
              })
            }
          >
            Disconnect X1
          </button>
        </>
      )}
      {matches.map((m) => (
        <article className="sl-source-result" key={m.selectionId}>
          <h3>{m.label}</h3>
          <blockquote>{m.snippet}</blockquote>
          <p className="sl-help">
            {m.page ? `Page ${m.page} · ` : ""}Retrieved{" "}
            {new Date(m.retrievedAt).toLocaleString()}
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
                setNote(
                  "Source saved to your private case. Review any amounts before entering them as terms.",
                );
                onChanged();
              })
            }
          >
            Save this passage to the case
          </button>
        </article>
      ))}
      {evidence.length > 0 && (
        <details open>
          <summary>
            {evidence.length} saved source{evidence.length === 1 ? "" : "s"}
          </summary>
          {evidence.map((e, i) => (
            <article className="sl-source-result" key={e.contentHash + i}>
              <h3>{e.label}</h3>
              <blockquote>{e.snippet}</blockquote>
              <p className="sl-help">
                Copied {new Date(e.retrievedAt).toLocaleDateString()}. Saved
                passages do not update automatically.
              </p>
            </article>
          ))}
        </details>
      )}
      <p className="sl-help">
        Connecting does not change your X1 records or automatically fill
        financial terms. Saved passages remain in the case history after
        disconnecting.
      </p>
    </section>
  );
}
