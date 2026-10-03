import { useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import { toast } from "react-toastify";
import { api, errorMessage } from "./api";
import { Card, CardTitle, DangerButton, Muted, QuietButton, formatDuration, MUTED, ACCENT } from "./ui";

const PAGE_SIZE = 10;

export const HistoryPanel = ({ refreshKey, onChanged }) => {
  const [sessions, setSessions] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [openId, setOpenId] = useState(null);

  const load = useCallback(async (pageNumber) => {
    try {
      const result = await api.get(`/api/v1/sessions?page=${pageNumber}&size=${PAGE_SIZE}`);
      setSessions((current) => (pageNumber === 0 ? result.content : [...current, ...result.content]));
      setPage(pageNumber);
      setTotalPages(result.totalPages);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    load(0);
  }, [load, refreshKey]);

  const handleDelete = async (session) => {
    if (!window.confirm(`Delete "${session.workoutTitle}" from ${new Date(session.completedAt).toLocaleDateString()}?`)) {
      return;
    }
    try {
      await api.del(`/api/v1/sessions/${session.id}`);
      setSessions((current) => current.filter((s) => s.id !== session.id));
      onChanged?.();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <Card>
      <CardTitle>History</CardTitle>
      {sessions.length === 0 && <Muted>No workouts logged yet.</Muted>}
      <List>
        {sessions.map((session) => (
          <li key={session.id}>
            <Summary onClick={() => setOpenId(openId === session.id ? null : session.id)} aria-expanded={openId === session.id}>
              <span>
                <strong>{session.workoutTitle}</strong>
                <Muted as="span">
                  {" "}
                  · {new Date(session.completedAt).toLocaleDateString()} · {formatDuration(session.totalSeconds)}
                  {session.sets.length > 0 && ` · ${session.sets.length} sets`}
                  {Number(session.volumeLb) > 0 && ` · ${Number(session.volumeLb).toLocaleString()} lb volume`}
                </Muted>
              </span>
            </Summary>
            {openId === session.id && (
              <Details>
                {session.notes && <p>{session.notes}</p>}
                {session.sets.map((set, i) => (
                  <div key={i}>
                    {set.exerciseTitle}
                    {set.setLabel && <SetLabel> {set.setLabel}</SetLabel>}:{" "}
                    {[set.reps != null && `${set.reps} reps`, set.weightLb != null && `${set.weightLb} lb`,
                      set.durationSeconds != null && `${set.durationSeconds}s`].filter(Boolean).join(" × ")}
                  </div>
                ))}
                {session.sets.length === 0 && !session.notes && <Muted>No sets logged.</Muted>}
                <DangerButton onClick={() => handleDelete(session)}>Delete</DangerButton>
              </Details>
            )}
          </li>
        ))}
      </List>
      {page + 1 < totalPages && <QuietButton onClick={() => load(page + 1)}>Load more</QuietButton>}
    </Card>
  );
};

const List = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0 0 8px;

  li {
    border-bottom: 1px solid #4d4d4d;
  }
`;

const Summary = styled.button`
  background: none;
  border: none;
  border-radius: 0;
  width: 100%;
  text-align: left;
  padding: 8px 0;
  color: inherit;
  font-family: inherit;
`;

const Details = styled.div`
  padding: 0 0 12px 12px;
  color: ${MUTED};
  font-size: 0.9rem;
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
`;

const SetLabel = styled.span`
  color: ${ACCENT};
`;
