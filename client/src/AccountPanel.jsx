import { useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "./AuthContext";
import { api, errorMessage } from "./api";
import { BackupControls } from "./BackupControls";
import { Card, CardTitle, DangerButton, Input, Label, Muted, PrimaryButton, QuietButton, Row } from "./ui";

export const AccountPanel = ({ onRestored }) => {
  const { user, logout } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState("");

  const handleDelete = async (event) => {
    event.preventDefault();
    try {
      await api.del("/api/v1/me", { password });
      toast.info("Your account and all its data were deleted.");
      logout();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <Card>
      <CardTitle>Your data</CardTitle>
      <Muted>Download every logged workout as JSON, or restore from a backup (old device backups work too).</Muted>
      <BackupControls onRestored={onRestored} canRestore={!user.readOnly} />
      <CardTitle style={{ marginTop: 20 }}>Account</CardTitle>
      <Muted>Signed in as {user.username}</Muted>
      <Row style={{ marginTop: 8 }}>
        <QuietButton onClick={logout}>Log out</QuietButton>
        {user.readOnly ? (
          <PrimaryButton $size="sm" onClick={logout}>
            Create your account
          </PrimaryButton>
        ) : (
          !confirming && <DangerButton onClick={() => setConfirming(true)}>Delete account</DangerButton>
        )}
      </Row>
      {confirming && (
        <form onSubmit={handleDelete} style={{ marginTop: 12 }}>
          <Muted>This permanently deletes your workouts, history, weights and goals.</Muted>
          <Row>
            <Label>
              Confirm password
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
            </Label>
            <QuietButton type="button" onClick={() => setConfirming(false)}>
              Cancel
            </QuietButton>
            <DangerButton type="submit">Delete forever</DangerButton>
          </Row>
        </form>
      )}
    </Card>
  );
};
