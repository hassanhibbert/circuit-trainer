import { useRef } from "react";
import styled from "styled-components";
import { toast } from "react-toastify";

export const BackupControls = ({ exportHistory, importHistory, historyCount }) => {
  const fileInputRef = useRef(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const { added, skipped } = await importHistory(file);
      if (added === 0) {
        toast.info("Nothing new to import - already up to date.");
      } else {
        toast.success(
          `Imported ${added} session${added === 1 ? "" : "s"}${
            skipped ? ` (${skipped} already on this device)` : ""
          }.`
        );
      }
    } catch (err) {
      toast.error(err.message || "Couldn't import that backup.");
    }
  };

  return (
    <Footer>
      <FooterButton onClick={exportHistory} disabled={historyCount === 0}>
        Backup data
      </FooterButton>
      <FooterButton onClick={handleImportClick}>Restore backup</FooterButton>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
    </Footer>
  );
};

const Footer = styled.div`
  margin-top: 30px;
  display: flex;
  justify-content: center;
  gap: 12px;
`;

const FooterButton = styled.button`
  background: none;
  border: 1px solid #5f5e5a;
  color: #a0a0a0;
  font-size: 0.85rem;

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`;
