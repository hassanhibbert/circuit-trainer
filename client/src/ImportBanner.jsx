import { useState } from "react";
import styled from "styled-components";
import { toast } from "react-toastify";
import { api, errorMessage } from "./api";
import { PrimaryButton, QuietButton } from "./ui";

// Before accounts existed, history lived only in this browser's localStorage. On first login
// we offer to upload it once; the server skips anything it already has.
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
        <PrimaryButton onClick={handleImport} disabled={busy}>
          {busy ? "Importing…" : "Import"}
        </PrimaryButton>
      </Buttons>
    </Banner>
  );
};

const Banner = styled.div`
  background-color: #2d4a45;
  border: 1px solid #03b7ad;
  padding: 15px 24px;
  border-radius: 6px;
  margin-top: 30px;
  text-align: center;
  color: #e2e2e2;
  font-family: "Source Sans 3", sans-serif;
`;

const Buttons = styled.div`
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 12px;
`;
