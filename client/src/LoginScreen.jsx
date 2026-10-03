import { useState } from "react";
import styled from "styled-components";
import { useAuth } from "./AuthContext";
import { errorMessage } from "./api";
import { Card, Input, Label, Muted, PrimaryButton, ACCENT } from "./ui";

export const LoginScreen = () => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const isRegister = mode === "register";

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await (isRegister ? register : login)(username.trim(), password);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const switchMode = () => {
    setMode(isRegister ? "login" : "register");
    setError(null);
  };

  return (
    <Narrow>
      <Card as="form" onSubmit={handleSubmit}>
        <Heading>{isRegister ? "Create an account" : "Log in"}</Heading>
        <Fields>
          <Label>
            Username
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              required
            />
          </Label>
          <Label>
            Password
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isRegister ? "new-password" : "current-password"}
              minLength={isRegister ? 8 : undefined}
              required
            />
          </Label>
          {isRegister && <Muted>At least 8 characters.</Muted>}
          {error && <ErrorText role="alert">{error}</ErrorText>}
          <PrimaryButton type="submit" disabled={submitting}>
            {submitting ? "Please wait…" : isRegister ? "Create account" : "Log in"}
          </PrimaryButton>
        </Fields>
        <Switch type="button" onClick={switchMode}>
          {isRegister ? "Already have an account? Log in" : "New here? Create an account"}
        </Switch>
      </Card>
    </Narrow>
  );
};

const Narrow = styled.div`
  max-width: 360px;
  margin: 0 auto;
`;

const Heading = styled.h2`
  color: ${ACCENT};
  margin: 0 0 16px;
  text-align: center;
`;

const Fields = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ErrorText = styled.p`
  color: #e7a0a0;
  margin: 0;
`;

const Switch = styled.button`
  background: none;
  border: none;
  color: ${ACCENT};
  margin-top: 12px;
  width: 100%;
  font-size: 0.9rem;
`;
