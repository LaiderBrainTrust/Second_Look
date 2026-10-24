import type { CaseView } from "../shared/contracts";
import { currency } from "./product-api";

// Read the same saved amounts as the offer page. Never infer a missing total.
export function DealSummary({ data }: { data: CaseView }) {
  if (!data.privateReview) return null;
  return (
    <aside className="sl-deal-summary" aria-label="Your deal at a glance">
      <p>Your deal at a glance</p>
      <dl>
        <div>
          <dt>Buyer pays you</dt>
          <dd>{currency(data.offer.purchasePriceCents)}</dd>
        </div>
        <div>
          <dt>Who keeps the fund payout?</dt>
          <dd>{data.offer.distributionRecipient === "seller"
            ? "You keep it"
            : data.offer.distributionRecipient === "buyer"
              ? "The buyer keeps it"
              : "Not confirmed"}</dd>
        </div>
        <div className="sl-summary-total">
          <dt>Your total before costs</dt>
          <dd>{data.privateReview.grossReceiptsCents == null
            ? "Not confirmed yet"
            : currency(data.privateReview.grossReceiptsCents)}</dd>
        </div>
      </dl>
      <small>Based on the saved terms and fund answer. Before taxes, fees and timing.</small>
    </aside>
  );
}
