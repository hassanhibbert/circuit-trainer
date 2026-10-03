import { useMemo, useState } from "react";
import styled from "styled-components";
import { ACCENT, CARD, MUTED, TEXT } from "./ui";

const WIDTH = 600;
const HEIGHT = 180;
const PAD = { top: 16, right: 16, bottom: 24, left: 44 };
const DAY_MS = 86400000;

const formatDay = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });

// Single-series line chart of body weight over time. One series, so no legend: the card
// title names it. Hovering (or touching) snaps to the nearest weigh-in and shows its value.
export const WeightChart = ({ entries }) => {
  const [hoverIndex, setHoverIndex] = useState(null);

  const geometry = useMemo(() => {
    const points = [...entries].sort((a, b) => a.measuredOn.localeCompare(b.measuredOn));
    const times = points.map((p) => new Date(`${p.measuredOn}T00:00:00`).getTime());
    const weights = points.map((p) => Number(p.weightLb));
    const minT = Math.min(...times);
    const maxT = Math.max(...times, minT + DAY_MS);
    const pad = Math.max(1, (Math.max(...weights) - Math.min(...weights)) * 0.15);
    const minW = Math.floor(Math.min(...weights) - pad);
    const maxW = Math.ceil(Math.max(...weights) + pad);
    const x = (t) => PAD.left + ((t - minT) / (maxT - minT)) * (WIDTH - PAD.left - PAD.right);
    const y = (w) => PAD.top + ((maxW - w) / (maxW - minW)) * (HEIGHT - PAD.top - PAD.bottom);
    return {
      points: points.map((p, i) => ({ ...p, x: x(times[i]), y: y(weights[i]) })),
      minW,
      maxW,
      yOf: y,
    };
  }, [entries]);

  if (entries.length < 2) return null;

  const { points, minW, maxW, yOf } = geometry;
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const hovered = hoverIndex != null ? points[hoverIndex] : null;
  const showMarkers = points.length <= 30;

  const handlePointer = (event) => {
    const svg = event.currentTarget;
    const rect = svg.getBoundingClientRect();
    const svgX = ((event.clientX - rect.left) / rect.width) * WIDTH;
    let nearest = 0;
    points.forEach((p, i) => {
      if (Math.abs(p.x - svgX) < Math.abs(points[nearest].x - svgX)) nearest = i;
    });
    setHoverIndex(nearest);
  };

  return (
    <Figure>
      <Readout aria-live="polite">
        {hovered
          ? `${formatDay(hovered.measuredOn)} · ${Number(hovered.weightLb).toFixed(1)} lb`
          : `${formatDay(points[0].measuredOn)} – ${formatDay(points.at(-1).measuredOn)}`}
      </Readout>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width="100%"
        role="img"
        aria-label={`Body weight from ${points[0].weightLb} lb to ${points.at(-1).weightLb} lb`}
        onPointerMove={handlePointer}
        onPointerDown={handlePointer}
        onPointerLeave={() => setHoverIndex(null)}
        style={{ touchAction: "pan-y", display: "block" }}
      >
        {[minW, maxW].map((w) => (
          <g key={w}>
            <line x1={PAD.left} x2={WIDTH - PAD.right} y1={yOf(w)} y2={yOf(w)} stroke="#555" strokeWidth="1" />
            <text x={PAD.left - 6} y={yOf(w) + 4} textAnchor="end" fill={MUTED} fontSize="12">
              {w}
            </text>
          </g>
        ))}
        <path d={path} fill="none" stroke={ACCENT} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {showMarkers &&
          points.map((p) => (
            <circle key={p.id} cx={p.x} cy={p.y} r="4" fill={ACCENT} stroke={CARD} strokeWidth="2" />
          ))}
        {hovered && (
          <>
            <line x1={hovered.x} x2={hovered.x} y1={PAD.top} y2={HEIGHT - PAD.bottom} stroke={MUTED} strokeWidth="1" />
            <circle cx={hovered.x} cy={hovered.y} r="6" fill={ACCENT} stroke={CARD} strokeWidth="2" />
          </>
        )}
        <text x={PAD.left} y={HEIGHT - 6} fill={MUTED} fontSize="12">
          {formatDay(points[0].measuredOn)}
        </text>
        <text x={WIDTH - PAD.right} y={HEIGHT - 6} textAnchor="end" fill={MUTED} fontSize="12">
          {formatDay(points.at(-1).measuredOn)}
        </text>
      </svg>
    </Figure>
  );
};

const Figure = styled.figure`
  margin: 12px 0;
`;

const Readout = styled.div`
  color: ${TEXT};
  font-size: 0.9rem;
  min-height: 1.4em;
`;
