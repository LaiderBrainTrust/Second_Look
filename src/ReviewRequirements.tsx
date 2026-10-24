import { useEffect, useState } from "react";
import type { DiligenceCommand, DiligenceView } from "../shared/diligence";
import type { Role } from "../shared/contracts";
import { request } from "./product-api";
import { useDraftGuard } from "./useDraftGuard";

/** Only appears when this review actually has additional questions or conditions. */
export function ReviewRequirements({
  base,
  role,
  revision,
  onChanged,
}: {
  base: string;
  role: Role;
  revision: number;
  onChanged: () => Promise<unknown>;
}) {
  const [data, setData] = useState<DiligenceView | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    request(base + "/diligence", undefined, role)
      .then((result) => {
        if (active) {
          setData(result);
          setError("");
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [base, role, revision]);
  if (error)
    return (
      <p className="sl-error" role="alert">
        Could not load additional review requirements. {error}
      </p>
    );
  if (
    !data ||
    (!data.questions.length && !data.privateDiligence?.conditions.length)
  )
    return null;
  async function save(command: DiligenceCommand) {
    await request(
      base + "/diligence/commands",
      { expectedRevision: data!.revision, command },
      role,
    );
    await onChanged();
  }
  return (
    <section className="sl-sheet" aria-labelledby="requirements-heading">
      <h2 id="requirements-heading">Other questions and requirements</h2>
      <p>
        Keep the supporting answer or document reference with each item before
        recording your review.
      </p>
      {data.questions.map((q) => (
        <div className="sl-source" key={q.id}>
          <h3>{q.question}</h3>
          <p>
            {q.status === "resolved"
              ? "Reviewed"
              : q.answer
                ? "Answer ready to review"
                : `Waiting for ${q.owner === "lp" ? "the investor" : q.owner === "gp" ? "your fund contact" : "the buyer"}`}
          </p>
          {q.answer && <blockquote>{q.answer.text}</blockquote>}
          {q.resolution && <p>{q.resolution}</p>}
          {q.status !== "resolved" &&
            (q.owner === role && !q.answer ? (
              <RequirementForm
                key={q.status}
                label="Your answer and supporting source"
                button="Save answer"
                onSave={(note) =>
                  save({ kind: "answer_question", id: q.id, text: note })
                }
              />
            ) : role === "lp" && q.answer ? (
              <RequirementForm
                key={q.status}
                label="Why this answer resolves the question"
                button="Record question as resolved"
                onSave={(note) =>
                  save({ kind: "resolve_question", id: q.id, note })
                }
              />
            ) : null)}
        </div>
      ))}
      {data.privateDiligence?.conditions.map((c) => (
        <div className="sl-source" key={c.id}>
          <h3>{c.title}</h3>
          <p>
            {c.status === "pending"
              ? "Awaiting confirmation"
              : c.status === "satisfied"
                ? "Confirmed"
                : "Not applicable"}{" "}
            · Responsible: {c.owner}
          </p>
          {c.evidenceNote && <p>{c.evidenceNote}</p>}
          {c.status === "pending" && (
            <RequirementForm
              key={c.status}
              label="Supporting evidence or document reference"
              button="Save confirmation"
              condition
              onSave={(note, status) =>
                save({
                  kind: "save_condition",
                  condition: {
                    ...c,
                    status:
                      status === "not_applicable"
                        ? "not_applicable"
                        : "satisfied",
                    evidenceNote: note,
                  },
                })
              }
            />
          )}
        </div>
      ))}
    </section>
  );
}
function RequirementForm({
  label,
  button,
  condition = false,
  onSave,
}: {
  label: string;
  button: string;
  condition?: boolean;
  onSave: (note: string, status?: string) => Promise<void>;
}) {
  const draft = useDraftGuard();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      onChange={draft.markDirty}
      onSubmit={async (e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        setBusy(true);
        setError("");
        try {
          await onSave(
            String(form.get("note")).trim(),
            String(form.get("status")),
          );
          draft.markClean();
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      {condition && (
        <label>
          What did you confirm?
          <select name="status" required defaultValue="">
            <option value="" disabled>
              Select what you confirmed…
            </option>
            <option value="satisfied">The requirement is satisfied</option>
            <option value="not_applicable">
              The requirement does not apply
            </option>
          </select>
        </label>
      )}
      <label>
        {label}
        <textarea name="note" required minLength={3} maxLength={5000} />
      </label>
      {error && (
        <p className="sl-error" role="alert">
          {error}
        </p>
      )}
      <button className="sl-secondary" disabled={busy}>
        {busy ? "Saving…" : button}
      </button>
    </form>
  );
}
