import { useEffect, useState } from "react";
import styled from "styled-components";
import { AccountPanel } from "./AccountPanel";
import { GoalsPanel } from "./GoalsPanel";
import { HistoryPanel } from "./HistoryPanel";
import { WeightPanel } from "./WeightPanel";
import { PageTitle, formatDuration } from "./ui";

const formatChange = (lb) => {
  const n = Number(lb);
  if (n === 0) return "±0 lb";
  return `${n > 0 ? "+" : "−"}${Math.abs(n).toFixed(1)} lb`;
};

export const ProgressScreen = ({ stats, refreshStats }) => {
  const [historyKey, setHistoryKey] = useState(0);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  const tiles = stats
    ? [
        { label: "Workouts", value: stats.totalSessions },
        { label: "This week", value: stats.sessionsThisWeek },
        { label: "Time trained", value: formatDuration(stats.totalSeconds) },
        { label: "Volume", value: `${Math.round(Number(stats.totalVolumeLb)).toLocaleString()} lb` },
        stats.weight && { label: "Weight change", value: formatChange(stats.weight.changeLb) },
      ].filter(Boolean)
    : [];

  return (
    <>
      <PageTitle>Progress</PageTitle>
      <Tiles>
        {tiles.map((tile) => (
          <Tile key={tile.label}>
            <TileValue>{tile.value}</TileValue>
            <TileLabel>{tile.label}</TileLabel>
          </Tile>
        ))}
      </Tiles>
      <Columns>
        <div>
          <GoalsPanel goals={stats?.goals ?? []} onChanged={refreshStats} />
          <WeightPanel onChanged={refreshStats} />
        </div>
        <div>
          <HistoryPanel refreshKey={historyKey} onChanged={refreshStats} />
          <AccountPanel
            onRestored={() => {
              setHistoryKey((k) => k + 1);
              refreshStats();
            }}
          />
        </div>
      </Columns>
    </>
  );
};

const Tiles = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;

  @media (max-width: 480px) {
    grid-template-columns: 1fr 1fr;

    > :last-child:nth-child(odd) {
      grid-column: 1 / -1;
    }
  }
`;

const Tile = styled.div`
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px 16px;
`;

const TileValue = styled.div`
  font-family: "Oswald", sans-serif;
  font-size: 1.7rem;
  font-weight: 600;
  line-height: 1.2;
  color: var(--accent);
`;

const TileLabel = styled.div`
  color: var(--muted);
  font-size: 0.85rem;
  font-weight: 600;
`;

const Columns = styled.div`
  @media (min-width: 900px) {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    align-items: start;
  }
`;
