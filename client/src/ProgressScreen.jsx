import { useEffect, useState } from "react";
import styled from "styled-components";
import { AccountPanel } from "./AccountPanel";
import { GoalsPanel } from "./GoalsPanel";
import { HistoryPanel } from "./HistoryPanel";
import { WeightPanel } from "./WeightPanel";
import { ACCENT, CARD, MUTED, formatDuration } from "./ui";

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
      <Tiles>
        {tiles.map((tile) => (
          <Tile key={tile.label}>
            <TileValue>{tile.value}</TileValue>
            <TileLabel>{tile.label}</TileLabel>
          </Tile>
        ))}
      </Tiles>
      <GoalsPanel goals={stats?.goals ?? []} onChanged={refreshStats} />
      <WeightPanel onChanged={refreshStats} />
      <HistoryPanel refreshKey={historyKey} onChanged={refreshStats} />
      <AccountPanel
        onRestored={() => {
          setHistoryKey((k) => k + 1);
          refreshStats();
        }}
      />
    </>
  );
};

const Tiles = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: 12px;
  margin-top: 24px;
`;

const Tile = styled.div`
  background: ${CARD};
  border-radius: 12px;
  padding: 14px 10px;
  font-family: "Source Sans 3", sans-serif;
`;

const TileValue = styled.div`
  color: ${ACCENT};
  font-size: 1.5rem;
  font-weight: 700;
`;

const TileLabel = styled.div`
  color: ${MUTED};
  font-size: 0.85rem;
`;
