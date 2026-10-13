const Icon = ({ children, size = 22, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    {children}
  </svg>
);

export const DumbbellIcon = (props) => (
  <Icon {...props}>
    <path d="M6 7v10M3 9.5v5M18 7v10M21 9.5v5M6 12h12" />
  </Icon>
);

export const ChartIcon = (props) => (
  <Icon {...props}>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </Icon>
);

export const PlusIcon = (props) => (
  <Icon {...props}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const BackIcon = (props) => (
  <Icon {...props}>
    <path d="M15 18l-6-6 6-6" />
  </Icon>
);

export const CloseIcon = (props) => (
  <Icon {...props}>
    <path d="M18 6L6 18M6 6l12 12" />
  </Icon>
);

export const CheckIcon = (props) => (
  <Icon {...props}>
    <path d="M20 6L9 17l-5-5" />
  </Icon>
);

export const PlayIcon = (props) => (
  <Icon {...props}>
    <path d="M7 4l13 8-13 8z" fill="currentColor" />
  </Icon>
);

export const PauseIcon = (props) => (
  <Icon {...props}>
    <path d="M8 5v14M16 5v14" />
  </Icon>
);

export const SkipIcon = (props) => (
  <Icon {...props}>
    <path d="M5 5l10 7-10 7zM19 5v14" />
  </Icon>
);
