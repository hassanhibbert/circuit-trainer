import styled, { css } from "styled-components";

// hex copies of the css variables, for svg attributes
export const ACCENT = "#00b7ac";
export const CARD = "#2a2a2d";
export const MUTED = "#a1a1a8";
export const TEXT = "#ececee";

export const Page = styled.main`
  max-width: ${(p) => (p.$wide ? "1040px" : "640px")};
  margin: 0 auto;
  padding-top: 8px;
`;

export const PageTitle = styled.h1`
  font-size: 1.6rem;
  font-weight: 700;
  margin: 8px 0 16px;
`;

export const SectionTitle = styled.h2`
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
  margin: 28px 0 10px;
`;

export const Card = styled.section`
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 18px;
  margin-top: 16px;
`;

export const CardTitle = styled.h2`
  font-size: 1.15rem;
  font-weight: 700;
  margin: 0 0 14px;
`;

export const Muted = styled.p`
  color: var(--muted);
  font-size: 0.9rem;
`;

export const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(p) => p.$gap ?? 12}px;
`;

export const Row = styled.div`
  display: flex;
  gap: 10px;
  align-items: flex-end;
  flex-wrap: wrap;
`;

export const Label = styled.label`
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--muted);
`;

export const Input = styled.input`
  background: var(--surface-2);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  font: inherit;
  font-size: 1rem;
  min-width: 0;
  width: 100%;

  &::placeholder {
    color: #707078;
  }

  &:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-soft);
  }
`;

export const TextArea = styled(Input).attrs({ as: "textarea" })`
  resize: vertical;
  min-height: 72px;
`;

export const Select = styled(Input).attrs({ as: "select" })``;

const variants = {
  primary: css`
    background: var(--accent);
    color: var(--accent-ink);
    border-color: var(--accent);
  `,
  secondary: css`
    background: var(--surface-2);
    color: var(--text);
    border-color: var(--border);
  `,
  ghost: css`
    background: transparent;
    color: var(--muted);
    border-color: var(--border);
  `,
  danger: css`
    background: transparent;
    color: var(--danger);
    border-color: rgba(236, 143, 143, 0.4);
  `,
};

const sizes = {
  sm: css`
    padding: 6px 12px;
    font-size: 0.85rem;
    border-radius: 8px;
  `,
  md: css`
    padding: 10px 18px;
    font-size: 1rem;
  `,
  lg: css`
    padding: 16px 22px;
    font-size: 1.15rem;
  `,
};

export const Button = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  font-weight: 700;
  line-height: 1.2;
  transition: filter 0.15s, transform 0.05s;
  ${(p) => variants[p.$variant ?? "secondary"]}
  ${(p) => sizes[p.$size ?? "md"]}
  ${(p) => p.$block && "width: 100%;"}

  &:hover:not(:disabled) {
    filter: brightness(1.12);
  }

  &:active:not(:disabled) {
    transform: scale(0.98);
  }

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`;

export const PrimaryButton = styled(Button).attrs({ $variant: "primary" })``;
export const QuietButton = styled(Button).attrs((p) => ({ $variant: "ghost", $size: p.$size ?? "sm" }))``;
export const DangerButton = styled(Button).attrs((p) => ({ $variant: "danger", $size: p.$size ?? "sm" }))``;

export const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  white-space: nowrap;
  background: ${(p) => (p.$accent ? "var(--accent-soft)" : "var(--surface-2)")};
  color: ${(p) => (p.$accent ? "var(--accent)" : "var(--muted)")};
`;

export const ProgressBar = styled.div`
  height: ${(p) => p.$height ?? 8}px;
  border-radius: 999px;
  background: var(--surface-2);
  overflow: hidden;

  &::after {
    content: "";
    display: block;
    height: 100%;
    width: ${(p) => Math.max(0, Math.min(100, p.$percent ?? 0))}%;
    background: var(--accent);
    border-radius: 999px;
    transition: width 0.3s;
  }
`;

export const formatDuration = (totalSeconds) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
};

export const formatLb = (value) => (value == null ? "–" : `${Number(value).toFixed(1)} lb`);

// local date, toISOString would give UTC
export const localToday = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
};
