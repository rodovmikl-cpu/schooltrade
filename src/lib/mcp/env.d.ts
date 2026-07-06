// MCP tool files run inside a Deno edge function bundle where `process.env` is
// polyfilled. Declare it so the frontend TS config doesn't complain.
declare const process: { env: Record<string, string | undefined> };
