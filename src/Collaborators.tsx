import { useEffect, useRef, useState } from "react";
import { request } from "./product-api";

type Access = {
  members: { id: string; displayName: string; role: string }[];
  invitations: {
    role: string;
    expires: number;
    acceptedBy: string | null;
    revoked: number;
  }[];
};
export function Collaborators({
  caseBase,
  answered,
  needsBuyer = false,
}: {
  caseBase: string;
  answered: boolean;
  needsBuyer?: boolean;
}) {
  const [access, setAccess] = useState<Access | null>(null);
  const [invite, setInvite] = useState("");
  const [role, setRole] = useState(needsBuyer ? "buyer" : "gp");
  const roleChosen = useRef(false);
  useEffect(() => {
    if (!roleChosen.current) setRole(needsBuyer ? "buyer" : "gp");
  }, [needsBuyer]);
  const [inviteRole, setInviteRole] = useState("gp");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const load = () =>
      request(caseBase + "/members")
        .then((r) => {
          if (active) {
            setAccess(r);
            setError("");
          }
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    void load();
    const timer = window.setInterval(() => {
      if (!document.hidden) void load();
    }, 10000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [caseBase]);
  const manager = access?.members.find((m) => m.role === "gp");
  const participants = access?.members.filter((m) => m.role !== "lp") ?? [];
  const pending = access?.invitations.some(
    (i) =>
      i.role === "gp" && !i.acceptedBy && !i.revoked && i.expires > Date.now(),
  );
  const Invitation = manager && !needsBuyer ? "details" : "div";
  return (
    <section aria-labelledby="invite-heading">
      <h2 id="invite-heading">
        {needsBuyer
          ? "Confirm the missing offer terms"
          : manager
            ? "People in this review"
            : "Ask your contact at the fund"}
      </h2>
      <p>
        {needsBuyer
          ? "Some sale terms are not confirmed. Invite the buyer to confirm the price adjustment and who keeps fund payouts under the agreement."
          : manager
            ? answered
              ? "The fund contact’s answer is saved. Review it alongside the sale terms."
              : `${manager.displayName} has joined. They can open this review and answer the question beside it.`
            : "Send a private link to your contact at the fund—for example, investor relations or the fund administrator. They can confirm the payout amount from their own account."}
      </p>
      {!!participants.length && (
        <ul className="sl-people">
          {participants.map((p) => (
            <li key={p.id}>
              <strong>{p.displayName}</strong>
              <span>{p.role === "gp" ? "Fund contact" : "Buyer"} · joined</span>
            </li>
          ))}
        </ul>
      )}
      {!manager && pending && (
        <p className="sl-help">
          An invitation is waiting to be accepted. If you already sent the link,
          no further action is needed.
        </p>
      )}
      <Invitation className="sl-invitation-form">
        {manager && !needsBuyer && <summary>Invite another person</summary>}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            setCopied(false);
            const f = new FormData(e.currentTarget);
            try {
              const r = await request(caseBase + "/invitations", {
                role,
                ...(f.get("handle")
                  ? { recipientHandle: String(f.get("handle")).trim() }
                  : {}),
              });
              setInvite(r.acceptanceUrl);
              setInviteRole(role);
              setAccess(await request(caseBase + "/members"));
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Who are you inviting?
            <select
              name="role"
              value={role}
              onChange={(e) => {
                roleChosen.current = true;
                setRole(e.target.value);
                setInvite("");
                setCopied(false);
              }}
            >
              <option value="gp">Fund contact</option>
              <option value="buyer">Buyer</option>
            </select>
          </label>
          <details className="sl-source">
            <summary>Limit the link to a specific username</summary>
            <label>
              Their Second Look username (optional)
              <input
                name="handle"
                autoComplete="off"
                placeholder="e.g. alex.morgan"
              />
            </label>
          </details>
          <button className="sl-primary sl-full" disabled={busy}>
            {busy ? "Creating private link…" : "Create invitation link"}
          </button>
        </form>
        {invite && (
          <div className="sl-invite-result">
            <p>
              <strong>
                Link ready. Send it to the{" "}
                {inviteRole === "gp" ? "fund contact" : "buyer"}.
              </strong>
            </p>
            <label>
              Private invitation link
              <input
                readOnly
                value={invite}
                onFocus={(e) => e.target.select()}
              />
            </label>
            <button
              className="sl-secondary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(invite);
                  setCopied(true);
                } catch {
                  setError(
                    "Copy the private link from the field above, then paste it into your message.",
                  );
                }
              }}
            >
              {copied ? "Link copied" : "Copy invitation link"}
            </button>
            <p role="status" className="sl-help">
              {copied
                ? "Copied. Paste it into your email or message to them."
                : "They’ll sign in or create an account, then see this review."}
            </p>
          </div>
        )}
      </Invitation>
      <p className="sl-help">
        Only the invited role can respond or change terms. Each link works once
        and expires after 24 hours. Second Look does not send the invitation for
        you.
      </p>
      {error && (
        <p role="alert" className="sl-error">
          {error}
        </p>
      )}
    </section>
  );
}
