import { useState } from "react";
import styled from "styled-components";
import { useAuth } from "./AuthContext";
import { errorMessage } from "./api";
import { Card, Input, Label, Muted, PrimaryButton } from "./ui";
import trainerIcon from "./assets/trainer_icon.png";

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
      <Hero>
        <img src={trainerIcon} alt="" />
        <h1>Circuit Trainer</h1>
        <Muted>Workouts, sets and progress in one place.</Muted>
      </Hero>
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
          <PrimaryButton $size="lg" $block type="submit" disabled={submitting}>
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
  max-width: 380px;
  margin: 0 auto;
  padding: calc(48px + env(safe-area-inset-top)) 0 48px;
`;

const Hero = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 6px;

  img {
    width: 72px;
    height: 72px;
  }

  h1 {
    font-family: "Revalia", sans-serif;
    font-size: 1.6rem;
    font-weight: 400;
    margin-top: 8px;
  }
`;

const Heading = styled.h2`
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0 0 18px;
`;

const Fields = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const ErrorText = styled.p`
  color: var(--danger);
`;

const Switch = styled.button`
  background: none;
  border: none;
  color: var(--accent);
  font-weight: 600;
  margin-top: 16px;
  width: 100%;
  font-size: 0.95rem;
`;
