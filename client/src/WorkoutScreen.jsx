import styled from "styled-components";
import { Button, Muted, Page, ProgressBar } from "./ui";
import { CheckIcon, CloseIcon } from "./icons";
import { getFormattedCountdown } from "./utils";

export const WorkoutScreen = ({ title, sectionLines, position, total, nextTitle, onEnd, children }) => (
  <FullHeight>
    <TopBar>
      <Button $variant="ghost" $size="sm" onClick={onEnd}>
        <CloseIcon size={16} /> End
      </Button>
      <WorkoutName>{title}</WorkoutName>
      <Step>
        {position + 1}/{total}
      </Step>
    </TopBar>
    <ProgressBar $percent={(position / total) * 100} $height={6} />

    <Stage>
      {sectionLines?.length > 0 && <SectionName>{sectionLines.join(" · ")}</SectionName>}
      {children}
    </Stage>

    {nextTitle && (
      <Next>
        <Muted as="span">Up next</Muted>
        <strong>{nextTitle}</strong>
      </Next>
    )}
  </FullHeight>
);

export const CompleteScreen = ({ title, totalSeconds, children }) => (
  <Page>
    <Done>
      <Check>
        <CheckIcon size={34} />
      </Check>
      <h1>Workout complete</h1>
      <Muted>{title}</Muted>
      <Time>{getFormattedCountdown(Math.floor(totalSeconds / 60), totalSeconds % 60)}</Time>
      <Muted>total time</Muted>
    </Done>
    {children}
  </Page>
);

const FullHeight = styled(Page)`
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
`;

const TopBar = styled.div`
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 12px;
  padding: calc(12px + env(safe-area-inset-top)) 0 12px;
`;

const WorkoutName = styled.span`
  text-align: center;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Step = styled.span`
  color: var(--muted);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
`;

const Stage = styled.section`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin-top: 20px;
  padding: 28px 20px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 20px;
`;

const SectionName = styled.p`
  text-align: center;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 14px;
`;

const Next = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  padding: 14px 18px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
`;

const Done = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: calc(32px + env(safe-area-inset-top)) 0 8px;

  h1 {
    font-size: 1.7rem;
    font-weight: 800;
    margin-top: 14px;
  }
`;

const Check = styled.div`
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
`;

const Time = styled.p`
  font-family: "Oswald", sans-serif;
  font-size: 3rem;
  font-weight: 600;
  margin-top: 16px;
  line-height: 1;
`;
