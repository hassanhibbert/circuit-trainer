import styled from "styled-components";
import { Badge, Button, Muted, SectionTitle } from "./ui";
import { PlayIcon, PlusIcon } from "./icons";
import { lengthLabel } from "./workoutInfo";

const shortDate = (iso) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

export const WorkoutList = ({ workouts, getStatsFor, onOpen, onCopy, onEdit, onDelete, onNew }) => {
  const builtIns = workouts.filter((w) => w.builtIn);
  const mine = workouts.filter((w) => !w.builtIn);

  const renderCard = (program) => (
    <WorkoutCard
      key={program.id}
      program={program}
      stats={getStatsFor(program)}
      onOpen={onOpen}
      onCopy={onCopy}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );

  return (
    <>
      <SectionTitle>Programs</SectionTitle>
      <Grid>{builtIns.map(renderCard)}</Grid>

      <SectionHeader>
        <SectionTitle>My workouts</SectionTitle>
        <Button $size="sm" $variant="ghost" onClick={onNew}>
          <PlusIcon size={16} /> New
        </Button>
      </SectionHeader>
      {mine.length ? (
        <Grid>{mine.map(renderCard)}</Grid>
      ) : (
        <Empty>
          <Muted>Copy a program to tweak it, or build your own from scratch.</Muted>
        </Empty>
      )}
    </>
  );
};

const WorkoutCard = ({ program, stats, onOpen, onCopy, onEdit, onDelete }) => {
  const stop = (fn) => (event) => {
    event.stopPropagation();
    fn(program);
  };

  return (
    <Card onClick={() => onOpen(program)}>
      <Top>
        <Title>{program.title}</Title>
        <StartButton $variant="primary" $size="sm" onClick={stop(onOpen)} aria-label={`Open ${program.title}`}>
          <PlayIcon size={14} />
        </StartButton>
      </Top>
      <Badges>
        <Badge>{program.type === "manual" ? "Self-paced" : "Timed"}</Badge>
        <Badge>{lengthLabel(program)}</Badge>
        {stats?.currentWeek && program.programWeeks && (
          <Badge $accent>
            Week {stats.currentWeek} of {program.programWeeks}
          </Badge>
        )}
      </Badges>
      <Bottom>
        <Muted as="span">
          {stats?.timesCompleted
            ? `${stats.timesCompleted} done · last ${shortDate(stats.lastCompletedAt)}`
            : "Not started yet"}
        </Muted>
        <Actions>
          {program.builtIn ? (
            <TextButton onClick={stop(onCopy)}>Copy</TextButton>
          ) : (
            <>
              <TextButton onClick={stop(onEdit)}>Edit</TextButton>
              <TextButton $danger onClick={stop(onDelete)}>
                Delete
              </TextButton>
            </>
          )}
        </Actions>
      </Bottom>
    </Card>
  );
};

const Grid = styled.div`
  display: grid;
  gap: 12px;

  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 28px;
  margin-bottom: 10px;

  h2 {
    margin: 0;
  }
`;

const Empty = styled.div`
  border: 1px dashed var(--border);
  border-radius: var(--radius);
  padding: 18px;
  text-align: center;
`;

const Card = styled.article`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  transition: border-color 0.15s;

  &:hover {
    border-color: #55555b;
  }
`;

const Top = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
`;

const Title = styled.h3`
  font-size: 1.05rem;
  font-weight: 700;
  line-height: 1.3;
`;

const StartButton = styled(Button)`
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  padding: 0;
  border-radius: 999px;
`;

const Badges = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const Bottom = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: auto;
`;

const Actions = styled.div`
  display: flex;
  gap: 4px;
`;

const TextButton = styled.button`
  background: none;
  border: none;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 700;
  color: ${(p) => (p.$danger ? "var(--danger)" : "var(--muted)")};

  &:hover {
    background: var(--surface-2);
  }
`;
