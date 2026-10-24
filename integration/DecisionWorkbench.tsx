import { useDraftGuard, confirmDiscardChanges } from "../src/useDraftGuard";
import { cents as parseDollars } from "../src/product-api";
import { FundingPanel } from "./FundingPanel";
import "./decision.css";
import { useEffect, useState } from "react";
import type { DecisionAnalysis } from "../shared/decision";
import type { DiligenceView } from "../shared/diligence";
import type { CaseView } from "../shared/contracts";
import type { ComparisonOffer } from "../shared/diligence";

const usd = (c: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    c / 100,
  );

const blank = {
  buyer: "",
  payment: "",
  fees: "",
  adjustment: "",
  recipient: "",
  date: "",
  source: "",
  paymentDate: "",
  distributionDate: "",
};
function cents(value: string, nullable = false) {
  if (!value.trim() && nullable) return null;
  return parseDollars(value, true);
}
/** Self-contained investor workflow; styling can be replaced by Ryan. */
export function DecisionWorkbench({
  caseBase,
  onChanged,
  showFunding = true,
}: {
  caseBase: string;
  onChanged?: () => void;
  showFunding?: boolean;
}) {
  const draft = useDraftGuard();
  const [analysis, setAnalysis] = useState<DecisionAnalysis | null>(null);
  const [diligence, setDiligence] = useState<DiligenceView | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [caseView, setCaseView] = useState<CaseView | null>(null);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<ComparisonOffer | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  function editOffer(offer: ComparisonOffer) {
    if (!confirmDiscardChanges()) return;
    draft.markClean();
    setEditing(offer);
    setFormOpen(true);
    setForm({
      buyer: offer.buyer,
      payment: String(offer.purchasePriceCents / 100),
      fees:
        offer.sellerFeesCents === null
          ? ""
          : String(offer.sellerFeesCents / 100),
      adjustment:
        offer.priceAdjustmentCents === null
          ? ""
          : String(offer.priceAdjustmentCents / 100),
      recipient: offer.distributionRecipient ?? "",
      date: offer.recordDate ?? "",
      source: offer.sourceNote,
      paymentDate: offer.paymentDate ?? "",
      distributionDate: offer.distributionDate ?? "",
    });
  }
  const validBase = /^\/api\/case$|^\/api\/cases\/[a-f0-9-]{36}$/.test(
    caseBase,
  );
  useEffect(() => {
    setAnalysis(null);
    setDiligence(null);
    setCaseView(null);
    setForm(blank);
    setEditing(null);
  }, [caseBase]);
  useEffect(() => {
    if (!validBase) return;
    let active: AbortController | undefined;
    let disposed = false;
    async function load() {
      if (document.hidden || active || disposed) return;
      active = new AbortController();
      try {
        const results = await Promise.all(
          ["decision", "diligence", ""].map(async (path) => {
            const res = await fetch(path ? `${caseBase}/${path}` : caseBase, {
              signal: active!.signal,
              headers: { "x-demo-role": "lp" },
            });
            const body = await res.json();
            if (!res.ok)
              throw new Error(body.error ?? "Could not load comparison.");
            return body;
          }),
        );
        if (!disposed) {
          // Concurrent reads can straddle a write. Keep the last consistent view.
          if (
            results[0].revision !== results[1].revision ||
            results[0].revision !== results[2].revision
          )
            return;
          setAnalysis(results[0]);
          setDiligence(results[1]);
          setCaseView(results[2]);
        }
      } catch (e) {
        if (
          !disposed &&
          !(e instanceof DOMException && e.name === "AbortError")
        )
          setError(
            e instanceof Error ? e.message : "Could not load comparison.",
          );
      } finally {
        active = undefined;
      }
    }
    void load();
    const timer = window.setInterval(load, 4000);
    document.addEventListener("visibilitychange", load);
    return () => {
      disposed = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", load);
      active?.abort();
    };
  }, [caseBase, refresh, validBase]);
  async function requestAnswer() {
    if (!analysis || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`${caseBase}/decision/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-demo-role": "lp" },
        body: JSON.stringify({ expectedRevision: analysis.revision }),
      });
      const body = await res.json();
      if (!res.ok)
        throw new Error(body.error ?? "Could not save the question.");
      setRefresh((x) => x + 1);
      onChanged?.();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not save the question. Refresh before retrying.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function saveOffer(offer: Omit<ComparisonOffer, "version">) {
    if (!analysis || busy) return false;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`${caseBase}/diligence/commands`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-demo-role": "lp" },
        body: JSON.stringify({
          expectedRevision: analysis.revision,
          command: { kind: "save_offer", offer },
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Could not save offer.");
      setRefresh((x) => x + 1);
      onChanged?.();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save offer.");
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function addOffer(event: React.FormEvent) {
    event.preventDefault();
    try {
      const saved = await saveOffer({
        id: editing?.id ?? crypto.randomUUID(),
        buyer: form.buyer,
        purchasePriceCents: cents(form.payment)!,
        priceAdjustmentCents: cents(form.adjustment, true),
        sellerFeesCents: cents(form.fees, true),
        distributionRecipient: form.recipient
          ? (form.recipient as "seller" | "buyer")
          : null,
        distributionBasisSourceId: null,
        recordDate: form.date || null,
        paymentDate: form.paymentDate || null,
        distributionDate: form.distributionDate || null,
        expiresAt: editing?.expiresAt ?? null,
        sourceNote: form.source,
        conditions:
          editing?.conditions ??
          "Closing conditions not assessed in this comparison.",
        withdrawn: editing?.withdrawn ?? false,
      });
      if (saved) {
        draft.markClean();
        setForm(blank);
        setEditing(null);
        setFormOpen(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check the entered terms.");
    }
  }
  if (!validBase)
    return <p role="alert">Choose a case before opening the comparison.</p>;
  const offers = diligence?.privateDiligence?.comparison.offers ?? [];
  const names = (ids: string[]) =>
    ids.map((id) => offers.find((o) => o.id === id)?.buyer ?? id).join(", ");
  return (
    <section className="decision-workbench" aria-labelledby="decision-question">
      <h2 id="decision-question">Which offer leaves you with more?</h2>
      {error && (
        <p role="alert">
          {error}{" "}
          <button onClick={() => setRefresh((x) => x + 1)}>
            Refresh comparison
          </button>
        </p>
      )}
      {!analysis ? (
        <p role="status">Loading the current terms…</p>
      ) : (
        <>
          <p>
            Case version {analysis.revision} ·{" "}
            {analysis.status === "confirmed"
              ? "Current inputs confirmed"
              : analysis.status === "conditional"
                ? "Conditional comparison"
                : "Missing comparison inputs"}
          </p>
          {offers.length === 0 && (
            <p>
              Add competing offers to this case to compare their payments, fees
              and distribution rights.
            </p>
          )}
          <details
            open={formOpen || offers.length < 2}
            onToggle={(e) => setFormOpen(e.currentTarget.open)}
          >
            <summary>
              {editing ? `Edit ${editing.buyer}` : "Add a competing offer"}
            </summary>
            <form onSubmit={addOffer} onChange={draft.markDirty}>
              <label>
                Buyer or quote label
                <input
                  name="buyer"
                  value={form.buyer}
                  required
                  maxLength={120}
                  onChange={(e) => setForm({ ...form, buyer: e.target.value })}
                />
              </label>
              <label>
                Purchase payment (USD)
                <input
                  name="payment"
                  inputMode="decimal"
                  value={form.payment}
                  required
                  onChange={(e) =>
                    setForm({ ...form, payment: e.target.value })
                  }
                />
              </label>
              <label>
                Seller fees (USD; blank means unknown)
                <input
                  name="fees"
                  inputMode="decimal"
                  value={form.fees}
                  onChange={(e) => setForm({ ...form, fees: e.target.value })}
                />
              </label>
              <label>
                Price adjustment (USD; blank means unknown)
                <input
                  name="adjustment"
                  inputMode="decimal"
                  value={form.adjustment}
                  onChange={(e) =>
                    setForm({ ...form, adjustment: e.target.value })
                  }
                />
              </label>
              <label>
                Distribution goes to
                <select
                  name="recipient"
                  value={form.recipient}
                  onChange={(e) =>
                    setForm({ ...form, recipient: e.target.value })
                  }
                >
                  <option value="">Unknown</option>
                  <option value="seller">Seller</option>
                  <option value="buyer">Buyer</option>
                </select>
              </label>
              <label>
                Comparison record date
                <input
                  name="date"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </label>
              <label>
                Purchase payment date (optional)
                <input
                  name="paymentDate"
                  type="date"
                  value={form.paymentDate}
                  onChange={(e) =>
                    setForm({ ...form, paymentDate: e.target.value })
                  }
                />
              </label>
              <label>
                Retained distribution payment date (optional)
                <input
                  name="distributionDate"
                  type="date"
                  value={form.distributionDate}
                  onChange={(e) =>
                    setForm({ ...form, distributionDate: e.target.value })
                  }
                />
              </label>
              <label>
                Source reference
                <input
                  name="source"
                  value={form.source}
                  required
                  maxLength={2000}
                  onChange={(e) => setForm({ ...form, source: e.target.value })}
                />
              </label>
              <p>
                This saves a private comparison quote. It does not replace the
                current deal or accept an offer. Fees and adjustments must be
                explicitly entered, including zero when known.
              </p>
              <button disabled={busy}>
                {busy
                  ? "Saving offer…"
                  : editing
                    ? "Save revised offer"
                    : "Save comparison offer"}
              </button>
              {editing && (
                <button
                  type="button"
                  onClick={() => {
                    if (!confirmDiscardChanges()) return;
                    draft.markClean();
                    setEditing(null);
                    setForm(blank);
                    setFormOpen(false);
                  }}
                >
                  Cancel edit
                </button>
              )}
            </form>
          </details>
          {offers.length > 0 && (
            <div
              className="decision-table"
              tabIndex={0}
              role="region"
              aria-label="Comparison offers"
            >
              <table>
                <caption>Entered offers — amounts in USD</caption>
                <thead>
                  <tr>
                    <th scope="col">Buyer</th>
                    <th scope="col">Payment</th>
                    <th scope="col">Seller fees</th>
                    <th scope="col">Distribution goes to</th>
                    <th scope="col">Cash before tax</th>
                    <th scope="col">Change quote</th>
                  </tr>
                </thead>
                <tbody>
                  {offers.map((o) => (
                    <tr key={o.id}>
                      <th scope="row">
                        {o.buyer}
                        {o.withdrawn
                          ? " (withdrawn)"
                          : o.expired
                            ? " (expired)"
                            : ""}
                      </th>
                      <td>{usd(o.purchasePriceCents)}</td>
                      <td>
                        {o.sellerFeesCents === null
                          ? "Unknown"
                          : usd(o.sellerFeesCents)}
                      </td>
                      <td>{o.distributionRecipient ?? "Unknown"}</td>
                      <td>
                        {o.netBeforeTaxCents === null
                          ? "Unresolved"
                          : usd(o.netBeforeTaxCents)}
                      </td>
                      <td>
                        <button disabled={busy} onClick={() => editOffer(o)}>
                          Edit {o.buyer}
                        </button>
                        <button
                          disabled={busy}
                          onClick={() =>
                            void saveOffer({ ...o, withdrawn: !o.withdrawn })
                          }
                        >
                          {o.withdrawn ? "Restore" : "Withdraw"} {o.buyer}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {analysis.frontier && (
            <div aria-live="polite">
              <h3>
                {analysis.frontier.withinSupportedRange
                  ? `The comparison changes at ${usd(analysis.frontier.tieDistributionCents)}`
                  : "Distribution uncertainty does not reverse these offers"}
              </h3>
              <p>{analysis.frontier.explanation}</p>
              <p>
                Retain distribution:{" "}
                {names(analysis.frontier.retainingOfferIds)}. Assign
                distribution: {names(analysis.frontier.assigningOfferIds)}.
              </p>
            </div>
          )}
          {analysis.excluded.length > 0 && (
            <ul>
              {analysis.excluded.map((x) => (
                <li key={x.offerId}>
                  {names([x.offerId])}: {x.reasons.join("; ")}
                </li>
              ))}
            </ul>
          )}
          {analysis.nextQuestion &&
            !(
              caseView?.answer &&
              caseView.question === analysis.nextQuestion.text
            ) && (
              <>
                <h3>The answer to get next</h3>
                <p>{analysis.nextQuestion.text}</p>
                <p>
                  Saving replaces the shared manager question and clears its old
                  answer. Previous reviews remain historical. Competing bids and
                  this threshold stay private. No external message is sent.
                </p>
                <button disabled={busy} onClick={requestAnswer}>
                  {busy
                    ? "Saving manager question…"
                    : "Save this question for the manager"}
                </button>
              </>
            )}
          {analysis.confirmedHighestOfferIds.length > 0 && (
            <p aria-live="polite">
              Highest calculated cash before tax:{" "}
              {names(analysis.confirmedHighestOfferIds)}.
            </p>
          )}
          {caseView?.answer && (
            <div>
              <h3>Confirm the distribution basis</h3>
              <p>{caseView.answer.text}</p>
              <p>
                Manager-entered amount: {usd(caseView.answer.distributionCents)}
                . Confirm only after checking that each quote uses this answer
                and record date. This is your recorded check, not independent
                verification.
              </p>
              {offers
                .filter(
                  (o) =>
                    !o.withdrawn &&
                    o.distributionBasisSourceId !== caseView.answer!.source.id,
                )
                .map((o) => (
                  <button
                    key={o.id}
                    disabled={busy}
                    onClick={() =>
                      void saveOffer({
                        ...o,
                        distributionBasisSourceId: caseView.answer!.source.id,
                      })
                    }
                  >
                    Confirm {o.buyer} against this answer
                  </button>
                ))}
            </div>
          )}
          {showFunding && (
            <FundingPanel
              caseBase={caseBase}
              revision={analysis.revision}
              ownerEntity={caseView?.privateReview?.ownerEntity ?? ""}
              onChanged={() => {
                setRefresh((x) => x + 1);
                onChanged?.();
              }}
            />
          )}
          <details>
            <summary>Calculation assumptions</summary>
            <p>{analysis.assumptions}</p>
          </details>
        </>
      )}
    </section>
  );
}
