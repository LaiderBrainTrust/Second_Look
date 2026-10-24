import { useDraftGuard, confirmDiscardChanges } from "../src/useDraftGuard";
import { cents as parseDollars } from "../src/product-api";
import { FundingPanel } from "./FundingPanel";
import "./decision.css";
import "./comparison-guidance.css";
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
  const [selectedPair, setSelectedPair] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [formRevision, setFormRevision] = useState<number | null>(null);
  function startOffer(fromCurrent = false) {
    if (!analysis || !confirmDiscardChanges()) return;
    setFormRevision(analysis.revision);
    draft.markClean();
    setEditing(null);
    setForm(
      fromCurrent && caseView
        ? {
            ...blank,
            buyer: "Current offer",
            payment: String(caseView.offer.purchasePriceCents / 100),
            adjustment:
              caseView.offer.priceAdjustmentCents === null
                ? ""
                : String(caseView.offer.priceAdjustmentCents / 100),
            recipient: caseView.offer.distributionRecipient ?? "",
            source: caseView.offer.source.label,
          }
        : blank,
    );
    setFormOpen(true);
    requestAnimationFrame(() =>
      document.querySelector<HTMLInputElement>("#comparison-buyer")?.focus(),
    );
  }
  function editOffer(offer: ComparisonOffer) {
    if (!analysis || !confirmDiscardChanges()) return;
    setFormRevision(analysis.revision);
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
    requestAnimationFrame(() =>
      document.querySelector<HTMLInputElement>("#comparison-buyer")?.focus(),
    );
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
    setFormOpen(false);
    draft.markClean();
  }, [caseBase, draft.markClean]);
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
    if (
      caseView?.answer &&
      !window.confirm(
        "Replace the current fund question and clear its answer? The old answer stays in the review history.",
      )
    )
      return;
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
  async function saveOffer(
    offer: Omit<ComparisonOffer, "version">,
    expectedRevision = analysis?.revision,
  ) {
    if (!analysis || busy) return false;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`${caseBase}/diligence/commands`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-demo-role": "lp" },
        body: JSON.stringify({
          expectedRevision,
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
    if (!analysis || formRevision !== analysis.revision) return;
    try {
      const saved = await saveOffer(
        {
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
        },
        formRevision,
      );
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
    return <p role="alert">Open a sale review before comparing offers.</p>;
  const offers = diligence?.privateDiligence?.comparison.offers ?? [];
  const conversationHref = `#${new URLSearchParams({
    ...(caseBase === "/api/case" ? {} : { case: caseBase.split("/").at(-1)! }),
    view: "conversation",
  })}`;
  const pair = analysis?.pairs.find(p => p.offerIds.join(":") === selectedPair) ?? analysis?.pairs[0];
  const names = (ids: string[]) =>
    ids.map((id) => offers.find((o) => o.id === id)?.buyer ?? id).join(", ");
  return (
    <section className="decision-workbench" aria-labelledby="decision-question">
      <h2 id="decision-question">Which offer leaves you with more?</h2>
      <p>
        Have more than one offer for your fund interest? Compare what you would
        keep after fees and any fund payout. A higher sale price may leave you
        with less if the buyer keeps that payout.
      </p>
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
          <p className="comparison-status" role="status">
            {offers.filter((offer) => !offer.withdrawn).length < 2
              ? "Add two offers to see the comparison."
              : analysis.status === "confirmed"
                ? "Ready to compare using the terms you checked."
                : analysis.status === "conditional"
                  ? "The result still depends on the fund payout."
                  : "Some offer details need checking before we can compare."}
          </p>
          {offers.length === 0 && (
            <p>
              Start with the offer already in this review, then add the other
              buyer’s offer. You can leave details you don’t know blank and
              return to them later. This comparison is private to you.
            </p>
          )}
          {pair && (
            <section className="offer-difference" aria-label="Difference between offers" aria-live="polite">
              <h3>What changes between these offers?</h3>
              {analysis.pairs.length > 1 && <label>Choose two offers
                <select value={pair.offerIds.join(":")} onChange={e => setSelectedPair(e.target.value)}>
                  {analysis.pairs.map(p => <option key={p.offerIds.join(":")} value={p.offerIds.join(":")}>{names(p.offerIds)}</option>)}
                </select>
              </label>}
              <div className="offer-pair-grid">
                {pair.offerIds.map((id, index) => {
                  const o = analysis.offers.find(row => row.id === id)!;
                  return <div key={id}>
                    <h4>{o.buyer}</h4>
                    <strong className="offer-pair-total">{pair.cashCents ? usd(pair.cashCents[index]) : "Cash total needs confirmation"}</strong>
                    <dl>
                      <dt>Buyer pays</dt><dd>{usd(o.purchasePriceCents)}</dd>
                      <dt>Price adjustment</dt><dd>{o.priceAdjustmentCents === null ? "Unknown" : usd(o.priceAdjustmentCents)}</dd>
                      <dt>Your fees</dt><dd>{o.sellerFeesCents === null ? "Unknown" : usd(o.sellerFeesCents)}</dd>
                      <dt>Fund payout goes to</dt><dd>{o.distributionRecipient === "seller" ? "You" : o.distributionRecipient === "buyer" ? "The buyer" : "Unknown"}</dd>
                    </dl>
                    <details><summary>Entered source and date</summary><p>{o.sourceNotePreview}{o.sourceNoteTruncated ? "…" : ""}</p><p>Rights as of {o.recordDate ?? "an unknown date"}.</p></details>
                  </div>;
                })}
              </div>
              {pair.differenceCents !== null ? <p className="offer-pair-verdict"><strong>{pair.differenceCents === 0 ? "These offers leave you with the same cash." : `${names([pair.offerIds[pair.differenceCents > 0 ? 0 : 1]])} leaves you with ${usd(Math.abs(pair.differenceCents))} more.`}</strong> Before tax, using the fund answer and terms you checked.</p>
                : <p>No confirmed cash difference yet. Check the missing details and whether the fund answer applies to each offer.</p>}
              {pair.tieDistributionCents !== null && <p><strong>The turning point is a {usd(pair.tieDistributionCents)} fund payout.</strong> At that amount these two offers tie. Above it, {names([pair.retainingOfferId!])} leaves you with more cash; below it, the other offer does. This is a condition, not a payout forecast.</p>}
              {pair.status === "incomplete" && <ul>{pair.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>}
              <p className="muted">This compares cash terms for the same fund interest. It does not accept an offer or change your main sale.</p>
            </section>
          )}
          {!formOpen && (
            <div className="comparison-start-actions sl-actions">
              {offers.length === 0 && caseView && (
                <button type="button" onClick={() => startOffer(true)}>
                  Start with my current offer
                </button>
              )}
              <button type="button" onClick={() => startOffer()}>
                {offers.length === 0
                  ? "Enter an offer from scratch"
                  : "Add another offer"}
              </button>
            </div>
          )}
          {formOpen && (
            <div className="comparison-offer-editor">
              <h3>
                {editing ? `Edit ${editing.buyer}` : "Add an offer to compare"}
              </h3>
              <p>
                Use the buyer’s written offer or email. Enter 0 for fees or
                adjustments only if you know there are none.
              </p>
              <form onSubmit={addOffer} onChange={draft.markDirty}>
                {formRevision !== analysis.revision && (
                  <p role="alert">
                    The review changed while you were editing. Your draft is
                    still here. Cancel and reopen this offer to load its latest
                    terms before saving.
                  </p>
                )}
                <label>
                  Name this offer
                  <input
                    id="comparison-buyer"
                    name="buyer"
                    placeholder="e.g. Harbor Capital — October offer…"
                    value={form.buyer}
                    required
                    maxLength={120}
                    onChange={(e) =>
                      setForm({ ...form, buyer: e.target.value })
                    }
                  />
                </label>
                <label>
                  Buyer’s payment to you (USD)
                  <input
                    name="payment"
                    placeholder="e.g. 700,000…"
                    inputMode="decimal"
                    value={form.payment}
                    required
                    onChange={(e) =>
                      setForm({ ...form, payment: e.target.value })
                    }
                  />
                </label>
                <label>
                  Fees you would pay (USD)
                  <input
                    name="fees"
                    placeholder="0 if none; blank if unknown…"
                    inputMode="decimal"
                    value={form.fees}
                    onChange={(e) => setForm({ ...form, fees: e.target.value })}
                  />
                </label>
                <label>
                  Amount added to or deducted from the price (USD)
                  <input
                    name="adjustment"
                    placeholder="e.g. -5,000; 0 if none…"
                    inputMode="decimal"
                    value={form.adjustment}
                    onChange={(e) =>
                      setForm({ ...form, adjustment: e.target.value })
                    }
                  />
                </label>
                <label>
                  Who keeps the fund payout?
                  <select
                    name="recipient"
                    value={form.recipient}
                    onChange={(e) =>
                      setForm({ ...form, recipient: e.target.value })
                    }
                  >
                    <option value="">I don’t know yet</option>
                    <option value="seller">You, the seller</option>
                    <option value="buyer">The buyer</option>
                  </select>
                </label>
                <label>
                  Date the offer’s distribution rights are based on
                  <input
                    name="date"
                    aria-describedby="comparison-date-help"
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                  <span
                    id="comparison-date-help"
                    className="comparison-field-help"
                  >
                    Use the as-of date in the terms. Both offers must use the
                    same date to compare fairly. Leave blank if you need to ask
                    the buyer.
                  </span>
                </label>
                <label>
                  When would the buyer pay you? (optional)
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
                  When would the fund payout arrive? (optional)
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
                  Where did these terms come from?
                  <input
                    name="source"
                    placeholder="e.g. Harbor Capital email, Oct 24, paragraph 3…"
                    aria-describedby="comparison-source-help"
                    value={form.source}
                    required
                    maxLength={2000}
                    onChange={(e) =>
                      setForm({ ...form, source: e.target.value })
                    }
                  />
                  <span
                    id="comparison-source-help"
                    className="comparison-field-help"
                  >
                    Add a document name, email reference or link so you can
                    check it later. This field saves your note; it does not read
                    the document.
                  </span>
                </label>
                <p>
                  Saving adds this offer to your private comparison. It does not
                  accept the offer or change the deal on the main screen.
                </p>
                <div className="sl-actions">
                  <button disabled={busy || formRevision !== analysis.revision}>
                    {busy
                      ? "Saving offer…"
                      : editing
                        ? "Save revised offer"
                        : "Save comparison offer"}
                  </button>
                  {formOpen && (
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => {
                        if (!confirmDiscardChanges()) return;
                        draft.markClean();
                        setEditing(null);
                        setForm(blank);
                        setFormOpen(false);
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}
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
                    <th scope="col">Your fees</th>
                    <th scope="col">Who keeps the fund payout?</th>
                    <th scope="col">Cash before tax</th>
                    <th scope="col">Manage offer</th>
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
                      <td>
                        {o.distributionRecipient === "seller"
                          ? "You"
                          : o.distributionRecipient === "buyer"
                            ? "The buyer"
                            : "Not confirmed"}
                      </td>
                      <td>
                        {o.netBeforeTaxCents === null
                          ? "Details needed below"
                          : usd(o.netBeforeTaxCents)}
                      </td>
                      <td>
                        <div className="sl-actions">
                        <button disabled={busy} onClick={() => editOffer(o)}>
                          Edit {o.buyer}
                        </button>
                        <button
                          disabled={busy}
                          onClick={() =>
                            void saveOffer({ ...o, withdrawn: !o.withdrawn })
                          }
                        >
                          {o.withdrawn
                            ? "Include again"
                            : "Exclude from comparison"}
                        </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {analysis.frontier && (analysis.pairs.length > 1 || !pair?.tieDistributionCents) && (
            <div aria-live="polite">
              <h3>
                {analysis.frontier.withinSupportedRange
                  ? `The comparison changes at ${usd(analysis.frontier.tieDistributionCents)}`
                  : "Distribution uncertainty does not reverse these offers"}
              </h3>
              <p>
                {analysis.frontier.withinSupportedRange
                  ? `If the fund payout is below ${usd(analysis.frontier.tieDistributionCents)}, ${names(analysis.frontier.assigningOfferIds)} leaves you with more. Above that amount, ${names(analysis.frontier.retainingOfferIds)} leaves you with more. They tie at that amount, using the entered terms.`
                  : analysis.frontier.tieDistributionCents < 0
                    ? `${names(analysis.frontier.retainingOfferIds)} leaves more cash even if the fund pays nothing, using the entered terms.`
                    : "The payout needed to change the result is beyond the supported calculation range."}
              </p>
              <p>
                You keep the fund payout with{" "}
                {names(analysis.frontier.retainingOfferIds)}. The buyer keeps it
                with {names(analysis.frontier.assigningOfferIds)}.
              </p>
            </div>
          )}
          {analysis.excluded.length > 0 && (
            <div>
              <h3>Details to check before comparing</h3>
              <ul>
                {analysis.excluded.map((x) => {
                  const offer = offers.find((item) => item.id === x.offerId);
                  const instructions: Record<string, string> = {
                    "Price adjustment":
                      "Enter the price adjustment, or 0 if none.",
                    "Seller fees":
                      "Enter the fees you would pay, or 0 if none.",
                    "Distribution recipient":
                      "Check whether you or the buyer keeps the fund payout.",
                    "Record date":
                      "Check the date used for distribution rights in the offer.",
                    "Record dates differ; align them before a cash comparison":
                      "The offers use different dates. Ask the buyers for terms based on the same date before comparing.",
                    "Offer expired": "This offer has expired and is excluded.",
                  };
                  return (
                    <li key={x.offerId}>
                      <strong>{names([x.offerId])}:</strong>{" "}
                      {x.reasons
                        .map((reason) => instructions[reason] ?? reason)
                        .join(" ")}{" "}
                      {offer && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => editOffer(offer)}
                        >
                          Edit {offer.buyer}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
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
                  This puts the question in your conversation with your fund
                  contact. It replaces the current question and clears its
                  answer; the old answer remains in history. Your other offers
                  and the comparison stay private. You still need to share the
                  invitation link with your contact.
                </p>
                {caseView?.question === analysis.nextQuestion.text ? (
                  <p>
                    Question saved.{" "}
                    <a href={conversationHref}>
                      Open the conversation to invite your fund contact.
                    </a>
                  </p>
                ) : (
                  <button disabled={busy} onClick={requestAnswer}>
                    {busy
                      ? "Saving question…"
                      : "Use this question for my fund contact"}
                  </button>
                )}
              </>
            )}
          {!caseView?.answer && !analysis.nextQuestion && offers.length > 0 && (
            <p>
              To finish the comparison, you also need your fund’s answer about
              the payout attributable to your interest.{" "}
              <a href={conversationHref}>
                Ask your fund contact in the conversation.
              </a>
            </p>
          )}
          {analysis.confirmedHighestOfferIds.length > 0 && (
            <p aria-live="polite">
              Highest calculated cash before tax:{" "}
              {names(analysis.confirmedHighestOfferIds)}.
            </p>
          )}
          {caseView?.answer &&
            offers.some(
              (offer) =>
                !offer.withdrawn &&
                offer.distributionBasisSourceId !== caseView.answer!.source.id,
            ) && (
              <div>
                <h3>Check which offers this fund answer applies to</h3>
                <p>{caseView.answer.text}</p>
                <p>
                  Your fund contact reported{" "}
                  {usd(caseView.answer.distributionCents)}. For each offer
                  below, check that this answer covers the same fund interest
                  and date. Also check the buyer’s written terms for who keeps
                  the payout. Then record your check to include the amount in
                  the comparison.
                </p>
                <div className="sl-actions">{offers
                  .filter(
                    (o) =>
                      !o.withdrawn &&
                      o.distributionBasisSourceId !==
                        caseView.answer!.source.id,
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
                      I checked: this answer applies to {o.buyer}
                    </button>
                  ))}</div>
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
