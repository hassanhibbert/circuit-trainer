import styled from "styled-components";
import { Badge, Button, Card, CardTitle, Muted, Page } from "./ui";
import { BackIcon, PlayIcon } from "./icons";
import { lengthLabel } from "./workoutInfo";

const isRest = (step) => /^(rest|get ready)\b/i.test(step.title?.trim() ?? "");

const seconds = (s) => (s >= 60 && s % 60 === 0 ? `${s / 60} min` : `${s}s`);

// consecutive sets of the same exercise become one line, e.g. "Goblet Squat · 3 sets · 12 reps"
const groupSets = (steps) =>
  steps.reduce((groups, step) => {
    const last = groups.at(-1);
    if (last && last.title === step.title) last.count++;
    else groups.push({ ...step, count: 1 });
    return groups;
  }, []);

export const WorkoutDetail = ({ program, stats, onBack, onStart }) => {
  const manual = program.type === "manual";

  return (
    <Page>
      <TopBar>
        <Button $variant="ghost" $size="sm" onClick={onBack}>
          <BackIcon size={16} /> Workouts
        </Button>
      </TopBar>

      <Title>{program.title}</Title>
      <Badges>
        <Badge>{manual ? "Self-paced" : "Timed"}</Badge>
        <Badge>{lengthLabel(program)}</Badge>
        {program.programWeeks && (
          <Badge $accent>
            {stats?.currentWeek ? `Week ${stats.currentWeek} of ${program.programWeeks}` : `${program.programWeeks} week program`}
          </Badge>
        )}
      </Badges>

      {program.description && (
        <Description dangerouslySetInnerHTML={{ __html: program.description }} />
      )}

      <Card>
        <CardTitle>What&apos;s inside</CardTitle>
        {manual ? (
          <List>
            {groupSets(program.exercises).map((group, i) => (
              <li key={i}>
                <strong>{group.title}</strong>
                <Muted as="span">
                  {[group.count > 1 && `${group.count} sets`, group.reps, group.durationSeconds && seconds(group.durationSeconds),
                    group.restSeconds && `rest ${seconds(group.restSeconds)}`].filter(Boolean).join(" · ")}
                </Muted>
              </li>
            ))}
          </List>
        ) : (
          program.sections.map((section) => (
            <Section key={section.id}>
              {section.title.length > 0 && <SectionName>{section.title.join(" · ")}</SectionName>}
              <List>
                {section.units.map((unit, i) => (
                  <li key={i} className={isRest(unit) ? "rest" : undefined}>
                    <span>{unit.title}</span>
                    <Muted as="span">{seconds(unit.durationSeconds)}</Muted>
                  </li>
                ))}
              </List>
            </Section>
          ))
        )}
      </Card>

      <StartBar>
        <Button $variant="primary" $size="lg" $block onClick={onStart}>
          <PlayIcon size={18} /> Start workout
        </Button>
      </StartBar>
    </Page>
  );
};

const TopBar = styled.div`
  padding: calc(12px + env(safe-area-inset-top)) 0 4px;
`;

const Title = styled.h1`
  font-size: 1.7rem;
  font-weight: 800;
  line-height: 1.2;
  margin-top: 12px;
`;

const Badges = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
`;

const Description = styled.div`
  margin-top: 16px;
  color: #cfcfd4;

  p {
    margin: 0 0 10px;
  }

  strong {
    color: var(--text);
  }
`;

const Section = styled.div`
  & + & {
    margin-top: 16px;
  }
`;

const SectionName = styled.h3`
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 6px;
`;

const List = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;

  li {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
    padding: 8px 0;
    border-bottom: 1px solid var(--border);
  }

  li:last-child {
    border-bottom: none;
  }

  li.rest {
    color: var(--muted);
  }

  span:last-child {
    text-align: right;
  }
`;

// sticks to the bottom of the screen so start is always one tap away
const StartBar = styled.div`
  position: sticky;
  bottom: 0;
  padding: 16px 0 calc(16px + env(safe-area-inset-bottom));
  margin-top: 8px;
  background: linear-gradient(to bottom, transparent, var(--bg) 30%);
`;
