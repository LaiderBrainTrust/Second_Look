# Nicrron / Ninoo sponsor requirements — October 24

Source: owner-supplied `NicrronNinoo-Betaworks-VC-Hack-GTM.docx.pdf`, pages 1–3. These are statements from a sponsor guide, not verified organizer rulings. The guide is titled "VC Hack GTM"; the event is "Deal Flow". Applicability needs clarification.

## Eligibility issue to resolve before submission

The guide says all three are required:

1. Build the app with Ninoo Builder (`https://app.ninoo.ai`).
2. Publish a Ninoo Marketplace listing before judging (Builder → More → Marketplace).
3. Route application AI calls through `https://api.nicrron.ai/v1`.

This is stricter than the pasted Devpost requirement to use all four sponsors. We cannot claim that adding a Nicrron API call alone meets the PDF's rules. Ask the sponsor/organizer whether these rules apply to the whole event or a separate sponsor competition, and whether importing today's existing repo and continuing development in Ninoo qualifies.

The guide expressly supports importing a GitHub project or ZIP (page 2). Preserve the current app: import `stratten/vc_hackathon` branch `codex/sponsor-setup` if that route is approved. Do not import `.env.local`, `.local`, runtime credentials, or personal records. An import is not yet evidence the Express/SQLite/backend worker stack runs on Ninoo. Verify server execution, secret storage, durable storage, and background worker support. No import, listing or publication has been performed.

## API integration contract

Official quickstart verified: https://nicrron.ai/docs/quickstart

- OpenAI-compatible chat completions: `POST https://api.nicrron.ai/v1/chat/completions`.
- Server-only `NICRRON_API_KEY`; create it at https://nicrron.ai/dashboard/keys.
- The app defaults to `NICRRON_MODEL=nicrron/fastest`; use live model discovery before choosing a specific model. The PDF's example model names need not match the current catalogue.
- Insert reasoning in the existing `server/adapters/roundtable.ts` reviewer after input validation. Supply the pinned Akta finding and synthetic case terms as untrusted data.
- Ask for a concise proposed fund-manager question plus explanation of relevance and limitations. Do not let model output change price, distribution ownership, case revision, or approval state.
- Validate the returned structure, preserve the existing pinned input/output references and explicit human sharing step, and identify the model-backed method separately from the current `rule-based` method.
- Record safe request/model metadata and wire the actual call into PRISM once its current trace contract and credentials are available.
- Fail visibly on missing credentials/provider errors; do not silently label a deterministic fallback as a successful model call.

Current status: the API key and model variables already exist in `.env.example`. Nicrron model calls are implemented in the Roundtable reviewer; PRISM traces remain unimplemented. See TEAM_START.md for current credential provisioning. Akta and Roundtable are integrated and verified independently.

## Account / credits in the supplied guide

The guide offers code `BETAWORKS250`: $250 promotional credit plus $10 signup credit, one redemption per account. The promotional credit expires October 24, 2026 at 11:59 PM Eastern. One account spans Nicrron, Builder and Code; the guide warns against redeeming through both signup paths. Credits and redemption have not been verified for this team's account.

## Suggested team sequence

1. Clarify the eligibility scope/import interpretation with the sponsor in the room.
2. Create/redeem one account and configure a server-only Nicrron key.
3. Keep the current app and implement model reasoning inside its existing Roundtable reviewer.
4. If required and accepted, import into Ninoo, make the actual app changes there, and verify backend/runtime support.
5. Prepare the Marketplace listing for owner review and publish only with explicit authorization. Record the resulting URL and complete all four sponsor checks before claiming eligibility.
