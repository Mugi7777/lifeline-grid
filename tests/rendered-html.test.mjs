import assert from "node:assert/strict";
import test from "node:test";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

test("renders development preview metadata", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  const html = await response.text();
  assert.match(html, developmentPreviewMeta);
  assert.match(html, /LIFELINE GRID/);
  assert.match(html, /Emergency Power/);
  assert.match(html, /GPT-5.6 SOL × VERIFIED OPTIMIZATION/);
  assert.match(html, /Run Sol Power Council/);
  assert.match(html, /Sol separates uncertainty/);
  assert.match(html, /Exact kernel proves consequences/);
  assert.match(html, /Authorized humans decide/);
  assert.match(html, /REAL OSM BASEMAP · SYNTHETIC KOCHI EXERCISE/);
  assert.match(html, /No Sol world applied automatically/);
  assert.match(html, /One narrative is unsafe\. Test competing worlds\./);
  assert.match(html, /Generate \+ prove 3 worlds/);
  assert.match(html, /Every assignment carries its proof\./);
  assert.match(html, /Run N-1 hardening/);
  assert.match(html, /HUMAN AUTHORITY GATE/);
  assert.match(html, /FIELD OPERATION BLOCKED/);
});
