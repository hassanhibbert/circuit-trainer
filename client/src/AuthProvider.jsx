import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { AuthContext } from "./AuthContext";
import {
  apiFetch,
  clearStoredAuth,
  readStoredAuth,
  setSlowRequestHandler,
  setUnauthorizedHandler,
  storeAuth,
} from "./api";

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState(readStoredAuth);

  const logout = useCallback(() => {
    clearStoredAuth();
    setAuth(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
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
  }, [logout]);

  const authenticate = useCallback(async (path, username, password) => {
    const response = await apiFetch(path, { method: "POST", body: { username, password }, auth: false });
    const next = {
      token: response.accessToken,
      username: response.username,
      expiresAt: Date.now() + response.expiresIn * 1000,
    };
    storeAuth(next);
    setAuth(next);
  }, []);

  const value = useMemo(
    () => ({
      user: auth ? { username: auth.username } : null,
      login: (username, password) => authenticate("/api/v1/auth/login", username, password),
      register: (username, password) => authenticate("/api/v1/auth/register", username, password),
      logout,
    }),
    [auth, authenticate, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
