"use client";

import { useState } from "react";

export default function TestPublicarPage() {
  const [draftId, setDraftId] = useState("");
  const [loading, setLoading] = useState(false);
  const [responseJson, setResponseJson] = useState<string>("");

  async function handlePublicar() {
    setLoading(true);
    setResponseJson("");
    try {
      const res = await fetch("/api/publicar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft_id: draftId.trim() }),
      });
      const text = await res.text();
      let parsed: unknown;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = { _parseError: true, raw: text };
      }
      setResponseJson(JSON.stringify(parsed, null, 2));
    } catch (e) {
      setResponseJson(JSON.stringify({ ok: false, error: String(e) }, null, 2));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <p>
        <label>
          draft_id{" "}
          <input
            value={draftId}
            onChange={(e) => setDraftId(e.target.value)}
            size={40}
          />
        </label>
      </p>
      <p>
        <button type="button" onClick={handlePublicar} disabled={loading}>
          {loading ? "…" : "Publicar"}
        </button>
      </p>
      {responseJson ? (
        <pre style={{ marginTop: 16 }}>{responseJson}</pre>
      ) : null}
    </div>
  );
}
