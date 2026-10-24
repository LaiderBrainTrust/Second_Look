import { useEffect, useState } from "react";
import type { FundingAnalysis } from "../shared/funding";
import { cents, request } from "../src/product-api";
import { confirmDiscardChanges, useDraftGuard } from "../src/useDraftGuard";
import { X1Sources } from "../src/X1Sources";
const usd = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    n / 100,
  );
type FundingPanelProps = {
  caseBase: string;
  revision: number;
  ownerEntity: string;
  onChanged: () => void;
  onAddOffer?: () => void;
};
export function FundingPanel(props: FundingPanelProps) {
  return <FundingPanelBody key={props.caseBase} {...props} />;
}
function FundingPanelBody({
  caseBase,
  revision,
  ownerEntity,
  onChanged,
  onAddOffer,
}: FundingPanelProps) {
  const draft = useDraftGuard();
  const [data, setData] = useState<FundingAnalysis | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formRevision, setFormRevision] = useState(revision);
  const [reload, setReload] = useState(0);
  const [form, setForm] = useState({
    ownerEntity,
    amount: "",
    neededBy: "",
    cash: "",
    cashAsOf: "",
    confirmed: false,
    source: "",
  });
  useEffect(() => {
    let active = true;
    request(`${caseBase}/funding`)
      .then((f) => {
        if (active) {
          setData(f);
          setError("");
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [caseBase, revision, reload]);
  function edit() {
    if (!data || data.revision !== revision || busy) return;
    setFormRevision(data.revision);
    const f = data?.funding;
    setForm(
      f
        ? {
            ownerEntity: f.ownerEntity,
            amount: String(f.amountCents / 100),
            neededBy: f.neededBy,
            cash:
              f.availableCashCents === null
                ? ""
                : String(f.availableCashCents / 100),
            cashAsOf: f.cashAsOf ?? "",
            confirmed: f.cashConfirmedForThisEntity,
            source: f.sourceNote,
          }
        : {
            ownerEntity,
            amount: "",
            neededBy: "",
            cash: "",
            cashAsOf: "",
            confirmed: false,
            source: "",
          },
    );
    setEditing(true);
  }
  function update(values: Partial<typeof form>) {
    setForm({ ...form, ...values });
    draft.markDirty();
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy || formRevision !== revision) return;
    setBusy(true);
    setError("");
    try {
      await request(`${caseBase}/diligence/commands`, {
        expectedRevision: formRevision,
        command: {
          kind: "save_funding",
          funding: {
            ownerEntity: form.ownerEntity,
            amountCents: cents(form.amount),
            neededBy: form.neededBy,
            availableCashCents: form.cash.trim() ? cents(form.cash) : null,
            cashAsOf: form.cashAsOf || null,
            cashConfirmedForThisEntity: form.confirmed,
            sourceNote: form.source,
          },
        },
      });
      setEditing(false);
      draft.markClean();
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section aria-labelledby="funding-heading" className="funding-panel">
      <h3 id="funding-heading">Do you need this money by a particular date?</h3>
      <p>
        For example, you may need $750,000 for a capital call on November 1.
        Compare that payment with cash you already have and the dates a buyer
        would pay you.
      </p>
      <p className="sl-help">
        This is optional. Skip it if you only want to review the sale terms.
      </p>
      {error && (
        <p className="sl-error" role="alert">
          {error}
        </p>
      )}
      {error && !editing && (
        <button
          type="button"
          onClick={() => {
            setError("");
            setReload((n) => n + 1);
          }}
        >
          Try loading again
        </button>
      )}
      {!data && !error && <p role="status">Loading your cash deadline…</p>}
      {!editing && (
        <button
          className="secondary"
          disabled={busy || !data || data.revision !== revision}
          onClick={edit}
        >
          {data?.funding
            ? "Edit amount and deadline"
            : "Set an amount and deadline"}
        </button>
      )}
      {editing && (
        <form onSubmit={save}>
          {formRevision !== revision && (
            <p role="alert" className="sl-error">
              This review changed while you were editing. Your draft is still
              here.{" "}
              <button
                type="button"
                disabled={!data || data.revision !== revision || busy}
                onClick={() => {
                  if (confirmDiscardChanges()) {
                    edit();
                    draft.markClean();
                  }
                }}
              >
                Load latest payment details
              </button>
            </p>
          )}
          <h4>1. What payment do you need to cover?</h4>
          <label>
            Who needs to make this payment?
            <input
              value={form.ownerEntity}
              placeholder="e.g. Your family trust"
              required
              onChange={(e) => update({ ownerEntity: e.target.value })}
            />
            <span className="sl-field-help">
              Use the same person or trust that owns this fund interest.
            </span>
          </label>
          <label>
            Amount you need (USD)
            <input
              inputMode="decimal"
              value={form.amount}
              placeholder="e.g. 750,000"
              required
              onChange={(e) => update({ amount: e.target.value })}
            />
          </label>
          <label>
            Payment deadline
            <input
              type="date"
              value={form.neededBy}
              required
              onChange={(e) => update({ neededBy: e.target.value })}
            />
          </label>
          <label>
            What is this payment for?
            <input
              value={form.source}
              required
              maxLength={2000}
              placeholder="e.g. Capital call in the October 20 notice from my fund"
              onChange={(e) => update({ source: e.target.value })}
            />
          </label>
          <h4>2. How much cash is already available?</h4>
          <label>
            Cash you can use before selling (USD)
            <input
              inputMode="decimal"
              value={form.cash}
              placeholder="Enter 0 if none; leave blank if unknown"
              onChange={(e) => update({ cash: e.target.value })}
            />
          </label>
          <label>
            When did you check that balance?
            <input
              type="date"
              value={form.cashAsOf}
              onChange={(e) => update({ cashAsOf: e.target.value })}
            />
            <span className="sl-field-help">
              Use a balance checked within the last seven days so this
              comparison uses recent cash information.
            </span>
          </label>
          <label className="funding-check">
            <input
              type="checkbox"
              checked={form.confirmed}
              onChange={(e) => update({ confirmed: e.target.checked })}
            />
            I checked that this cash belongs to the same owner, is available for
            this payment, and does not include money from this sale.
          </label>
          <p className="sl-help">
            Unknown cash can be saved, but the comparison will wait for you to
            confirm it. Saving updates this review; it does not transfer money.
          </p>
          <button disabled={busy || formRevision !== revision}>
            {busy ? "Saving…" : "Save amount and deadline"}
          </button>
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={() => {
              if (confirmDiscardChanges()) {
                setEditing(false);
                draft.markClean();
              }
            }}
          >
            Cancel
          </button>
        </form>
      )}
      {data?.funding && (
        <>
          <h4>Your cash deadline</h4>
          <p>
            <strong>{usd(data.funding.amountCents)}</strong> needed by{" "}
            {new Date(data.funding.neededBy + "T12:00:00").toLocaleDateString(
              undefined,
              { month: "long", day: "numeric", year: "numeric" },
            )}{" "}
            for {data.funding.ownerEntity}.
          </p>
          <p>{data.funding.sourceNote}</p>
          {data.cashGapCents !== null && (
            <p>
              {data.cashGapCents === 0
                ? "Your confirmed cash already covers this payment. You do not need sale proceeds to cover this particular amount."
                : `You still need ${usd(data.cashGapCents)} beyond your available cash.`}
            </p>
          )}
          {data.blockers.length > 0 && (
            <>
              <h4>What to confirm next</h4>
              <ul>
                {data.blockers.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </>
          )}
          {data.offers.length === 0 ? (
            <div className="sl-help">
              <p>
                To check whether sale proceeds arrive in time, add an offer with
                its payment date in “Compare offers.” Entering the deadline
                alone cannot confirm when a buyer will pay.
              </p>
              {onAddOffer && (
                <button
                  type="button"
                  className="secondary"
                  onClick={onAddOffer}
                >
                  Add an offer and its payment dates
                </button>
              )}
            </div>
          ) : (
            <>
              <h4>Which offer could cover the payment?</h4>
              <ul>
                {data.offers.map((o) => (
                  <li key={o.id}>
                    <strong>{o.buyer}: </strong>
                    {o.status === "unresolved"
                      ? `More information needed — ${o.reasons.join(" ")}`
                      : o.status === "shortfall"
                        ? `${usd(o.shortfallCents!)} short by your deadline.`
                        : `Could cover the payment (${usd(o.cashByDeadlineCents!)} including your available cash).`}
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
      <details>
        <summary>Find a capital-call notice or cash record in X1</summary>
        <X1Sources
          key={caseBase}
          caseBase={caseBase}
          revision={revision}
          onChanged={onChanged}
          purpose="funding"
        />
      </details>
    </section>
  );
}
