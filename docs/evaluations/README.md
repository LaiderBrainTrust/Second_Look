# Fixed MCP evaluation

This is a synthetic, read-only evaluation set, not customer evidence. Run the
fixture server with `node --import tsx tests/fixtures/evaluation-server.ts` as the
MCP command. It uses the production tool schemas and deterministic comparison;
all writes are refused. No credentials or network services are needed.

Use the independent questions in `second-look.xml`. The expected answers describe
only this frozen fixture. These questions have not been scored against a Claude
or Codex model; protocol and permission tests are separate from model acceptance.
