import styled from "styled-components";
import trainerIcon from "./assets/trainer_icon.png";
import { ChartIcon, DumbbellIcon } from "./icons";

const TABS = [
  { id: "workouts", label: "Workouts", Icon: DumbbellIcon },
  { id: "progress", label: "Progress", Icon: ChartIcon },
];

export const Brand = () => (
  <BrandRow>
    <Logo src={trainerIcon} alt="" />
    <BrandName>Circuit Trainer</BrandName>
  </BrandRow>
);

export const Shell = ({ view, onNavigate, username, onLogout, children }) => {
  const activeTab = view === "progress" ? "progress" : "workouts";

  return (
    <>
      <Header>
        <Brand />
        <Nav aria-label="Main">
          {TABS.map((tab) => {
            const TabIcon = tab.Icon;
            return (
              <NavButton
                key={tab.id}
                $active={activeTab === tab.id}
                aria-current={activeTab === tab.id ? "page" : undefined}
                onClick={() => onNavigate(tab.id)}
              >
                <TabIcon size={22} />
                <span>{tab.label}</span>
              </NavButton>
            );
          })}
        </Nav>
        <User>
          <span>{username}</span>
          <LogoutButton onClick={onLogout}>Log out</LogoutButton>
        </User>
      </Header>
      {children}
      <NavSpacer />
    </>
  );
};

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: calc(12px + env(safe-area-inset-top)) 0 12px;
`;

const NavSpacer = styled.div`
  height: calc(var(--nav-height) + 32px + env(safe-area-inset-bottom));

  @media (min-width: 768px) {
    height: 48px;
  }
`;

const BrandRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const Logo = styled.img`
  width: 36px;
  height: 36px;
`;

const BrandName = styled.span`
  font-family: "Revalia", sans-serif;
  font-size: 1.15rem;
  white-space: nowrap;
`;

const User = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--muted);
  font-size: 0.9rem;

  span {
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @media (max-width: 420px) {
    span {
      display: none;
    }
  }
`;

const LogoutButton = styled.button`
  background: none;
  border: none;
  padding: 4px 0;
  color: var(--accent);
  font-weight: 600;
`;

// bottom bar on phones, inline tabs in the header on wider screens
const Nav = styled.nav`
  position: fixed;
  z-index: 10;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  height: calc(var(--nav-height) + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  background: var(--bg);
  border-top: 1px solid var(--border);

  @media (min-width: 768px) {
    position: static;
    height: auto;
    padding: 4px;
    gap: 4px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--surface);
  }
`;

const NavButton = styled.button`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  background: none;
  border: none;
  font-size: 0.75rem;
  font-weight: 700;
  color: ${(p) => (p.$active ? "var(--accent)" : "var(--muted)")};

  @media (min-width: 768px) {
    flex-direction: row;
    gap: 8px;
    padding: 8px 18px;
    border-radius: 999px;
    font-size: 0.95rem;
    background: ${(p) => (p.$active ? "var(--accent-soft)" : "none")};

    svg {
      width: 18px;
      height: 18px;
    }
  }
`;
