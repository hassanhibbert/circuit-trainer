import { useRef, useState } from "react";
import styled from "styled-components";
import { toast } from "react-toastify";
import { api, errorMessage } from "./api";
import { QuietButton } from "./ui";

const readFileAsText = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.readAsText(file);
  });

export const BackupControls = ({ onRestored, canRestore = true }) => {
  const fileInputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    setBusy(true);
    try {
      const sessions = await api.get("/api/v1/sessions/export");
      const blob = new Blob([JSON.stringify(sessions, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `circuit-trainer-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setBusy(true);
    try {
      let entries;
      try {
        entries = JSON.parse(await readFileAsText(file));
      } catch {
        throw new Error("Couldn't read that file as JSON.");
      }
      if (!Array.isArray(entries)) throw new Error("Backup file isn't a valid history export.");
      const { added, skipped } = await api.post("/api/v1/sessions/import", { entries });
      if (added === 0) {
        toast.info("Nothing new to import - already up to date.");
      } else {
        toast.success(`Imported ${added} session${added === 1 ? "" : "s"}${skipped ? ` (${skipped} already saved)` : ""}.`);
        onRestored?.();
      }
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Buttons>
      <QuietButton onClick={handleExport} disabled={busy}>
        Backup data
      </QuietButton>
      {canRestore && (
        <QuietButton onClick={() => fileInputRef.current?.click()} disabled={busy}>
          Restore backup
        </QuietButton>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
    </Buttons>
  );
};

const Buttons = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
`;
