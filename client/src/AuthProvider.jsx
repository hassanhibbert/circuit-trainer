import { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { toast } from "react-toastify";
import { AuthContext } from "./AuthContext";
import { logIn, logOut, refreshSession, setSlowRequestHandler, setUnauthorizedHandler } from "./api";
import { Brand } from "./Shell";
import { Button, Muted } from "./ui";

// "checking" while we see if the refresh cookie still holds a session
export const AuthProvider = ({ children }) => {
  const [status, setStatus] = useState("checking");
  const [username, setUsername] = useState(null);

  const signedIn = useCallback((data) => {
    setUsername(data.username);
    setStatus("in");
  }, []);

  const signedOut = useCallback(() => {
    setUsername(null);
    setStatus("out");
  }, []);

  const restore = useCallback(() => {
    setStatus("checking");
    refreshSession()
      .then((data) => (data ? signedIn(data) : signedOut()))
      .catch(() => setStatus("offline"));
  }, [signedIn, signedOut]);

  useEffect(() => {
    // tokens used to be kept in localStorage, don't leave the old one lying around
    try {
      localStorage.removeItem("circuit-trainer:auth");
    } catch {
      // ignore
    }
    restore();
  }, [restore]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      signedOut();
      toast.info("Your session expired. Please log in again.", { toastId: "session-expired" });
    });
    setSlowRequestHandler(() => {
      toast.info("Waking up the server. The first request after a while can take up to a minute.", {
        toastId: "server-waking",
      });
    });
    return () => {
      setUnauthorizedHandler(null);
      setSlowRequestHandler(null);
    };
  }, [signedOut]);

  const logout = useCallback(async () => {
    signedOut();
    await logOut();
  }, [signedOut]);

  const value = useMemo(
    () => ({
      user: status === "in" ? { username } : null,
      login: async (name, password) => signedIn(await logIn("/api/v1/auth/login", name, password)),
      register: async (name, password) => signedIn(await logIn("/api/v1/auth/register", name, password)),
      logout,
    }),
    [status, username, signedIn, logout]
  );

  if (status === "checking" || status === "offline") {
    return (
      <Splash>
        <Brand />
        {status === "checking" ? (
          <Muted>Signing you in…</Muted>
        ) : (
          <>
            <Muted>Couldn&apos;t reach the server.</Muted>
            <Button $variant="primary" onClick={restore}>
              Try again
            </Button>
          </>
        )}
      </Splash>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

const Splash = styled.div`
  min-height: 80vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  text-align: center;
`;
