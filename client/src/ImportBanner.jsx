import { useState } from "react";
import styled from "styled-components";
import { toast } from "react-toastify";
import { api, errorMessage } from "./api";
import { PrimaryButton, QuietButton } from "./ui";

// one-time import of history saved before accounts existed
const LEGACY_KEY = "circuit-trainer:history";
const importedKey = (username) => `circuit-trainer:history-imported:${username}`;

const readLegacyHistory = (username) => {
  try {
    if (localStorage.getItem(importedKey(username))) return [];
    const parsed = JSON.parse(localStorage.getItem(LEGACY_KEY));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const markHandled = (username) => {
  try {
    localStorage.setItem(importedKey(username), new Date().toISOString());
  } catch {
    // ignore
  }
};

export const ImportBanner = ({ username, onImported }) => {
  const [entries, setEntries] = useState(() => readLegacyHistory(username));
  const [busy, setBusy] = useState(false);

  if (entries.length === 0) return null;

  const handleImport = async () => {
    setBusy(true);
    try {
      const { added, skipped } = await api.post("/api/v1/sessions/import", { entries });
      toast.success(`Imported ${added} session${added === 1 ? "" : "s"}${skipped ? ` (${skipped} already saved)` : ""}.`);
      markHandled(username);
      setEntries([]);
      onImported?.();
    } catch (err) {
      toast.error(errorMessage(err));
      setBusy(false);
    }
  };

  const handleDismiss = () => {
    markHandled(username);
    setEntries([]);
  };

  return (
    <Banner>
      <span>
        Found <strong>{entries.length}</strong> workout{entries.length === 1 ? "" : "s"} saved on this device
        before accounts. Add them to your account?
      </span>
      <Buttons>
        <QuietButton onClick={handleDismiss} disabled={busy}>
          No thanks
        </QuietButton>
        <PrimaryButton $size="sm" onClick={handleImport} disabled={busy}>
          {busy ? "Importing…" : "Import"}
        </PrimaryButton>
      </Buttons>
    </Banner>
  );
};

const Banner = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 16px;
  padding: 14px 16px;
  border-radius: var(--radius);
  border: 1px solid rgba(0, 183, 172, 0.45);
  background: var(--accent-soft);
`;

const Buttons = styled.div`
  display: flex;
  gap: 8px;
`;
