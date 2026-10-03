// Shared styled pieces, matching the existing look: dark cards, teal accent, Source Sans 3.
import styled from "styled-components";

export const ACCENT = "#00b7ac";
export const CARD = "#414141";
export const MUTED = "#a0a0a0";
export const TEXT = "#e2e2e2";
export const DANGER = "#603939";

export const Card = styled.section`
  background: ${CARD};
  border-radius: 12px;
  padding: 18px 20px;
  margin-top: 20px;
  text-align: left;
  font-family: "Source Sans 3", sans-serif;
  color: ${TEXT};
`;

export const CardTitle = styled.h2`
  color: ${ACCENT};
  font-family: "Source Sans 3", sans-serif;
  font-weight: 600;
  font-size: 1.3rem;
  margin: 0 0 12px;
`;

export const Muted = styled.p`
  color: ${MUTED};
  font-size: 0.9rem;
  margin: 4px 0;
`;

export const Label = styled.label`
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.85rem;
  color: ${MUTED};
  text-align: left;
`;

export const Input = styled.input`
  background: #2a2a2a;
  color: ${TEXT};
  border: 1px solid #5f5e5a;
  border-radius: 6px;
  padding: 8px 10px;
  font-size: 1rem;
  font-family: inherit;
  min-width: 0;

  &:focus {
    outline: 2px solid ${ACCENT};
    border-color: transparent;
  }
`;

export const TextArea = styled(Input).attrs({ as: "textarea" })`
  resize: vertical;
  min-height: 60px;
`;

export const Select = styled(Input).attrs({ as: "select" })``;

export const Row = styled.div`
  display: flex;
  gap: 10px;
  align-items: flex-end;
  flex-wrap: wrap;
`;

export const PrimaryButton = styled.button`
  background: ${ACCENT};
  color: #10302d;
  font-weight: 700;

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`;

export const QuietButton = styled.button`
  background: none;
  border: 1px solid #5f5e5a;
  color: ${MUTED};
  font-size: 0.85rem;
  padding: 0.4em 0.9em;

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`;

export const DangerButton = styled(QuietButton)`
  border-color: #8a4a4a;
  color: #e7a0a0;
`;

export const ProgressBar = styled.div`
  height: 8px;
  border-radius: 4px;
  background: #2a2a2a;
  overflow: hidden;

  &::after {
    content: "";
    display: block;
    height: 100%;
    width: ${(p) => Math.max(0, Math.min(100, p.$percent ?? 0))}%;
    background: ${ACCENT};
    border-radius: 4px;
  }
`;

export const formatDuration = (totalSeconds) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
};

export const formatLb = (value) => (value == null ? "–" : `${Number(value).toFixed(1)} lb`);

// Today's date as YYYY-MM-DD in the user's local zone (toISOString would use UTC).
export const localToday = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
};
