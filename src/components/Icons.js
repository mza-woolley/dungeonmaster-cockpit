import React from 'react';

// Instrument icon set — single 1.5px stroke weight throughout.
const PATHS = {
  d20: (
    <>
      <path d="M12 2l8.66 5v10L12 22l-8.66-5V7z" />
      <path d="M12 7.5L17.5 15h-11z" />
      <path d="M12 2v5.5M20.66 7L17.5 15M3.34 7l3.16 8M12 22l5.5-7M12 22l-5.5-7" />
    </>
  ),
  person: (
    <>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.5 19c1.2-3.4 3.6-5 6.5-5s5.3 1.6 6.5 5" />
    </>
  ),
  map: (
    <>
      <path d="M9 4L4 6v14l5-2 6 2 5-2V4l-5 2-6-2z" />
      <path d="M9 4v14M15 6v14" />
    </>
  ),
  book: (
    <>
      <path d="M12 6c-1.5-1.3-3.8-2-7-2v14c3.2 0 5.5.7 7 2 1.5-1.3 3.8-2 7-2V4c-3.2 0-5.5.7-7 2z" />
      <path d="M12 6v14" />
    </>
  ),
  swords: (
    <>
      <path d="M5 4l12 12M19 4L7 16" />
      <path d="M14.5 17.5l4-4M5.5 13.5l4 4M16 19l3-3M8 19l-3-3" />
    </>
  ),
  board: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="1" />
      <path d="M4 10h16M10 10v10" />
    </>
  ),
  sliders: (
    <>
      <path d="M6 4v16M12 4v16M18 4v16" />
      <circle cx="6" cy="9" r="1.8" />
      <circle cx="12" cy="15" r="1.8" />
      <circle cx="18" cy="7" r="1.8" />
    </>
  ),
  quill: (
    <>
      <path d="M20 4C13 5 8 10 6 17l-1 3 3-1c7-2 11-7 12-15z" />
      <path d="M6 17l8-8" />
    </>
  ),
  sheet: (
    <>
      <rect x="6" y="3" width="12" height="18" rx="1" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </>
  ),
  hat: (
    <>
      <path d="M4 18.5c2.5-1.2 13.5-1.2 16 0" />
      <path d="M7 18L12 4l5 14" />
      <path d="M9.2 12.5h5.6" />
    </>
  ),
  pause: <path d="M9.5 7.5v9M14.5 7.5v9" />,
  play: <path d="M9 7l8 5-8 5z" />,
  prev: <path d="M17 7l-7 5 7 5zM7 7v10" />,
  next: <path d="M7 7l7 5-7 5zM17 7v10" />,
  stop: <rect x="8" y="8" width="8" height="8" />,
  eye: (
    <>
      <path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.6" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M4 4l16 16" />
      <path d="M9.9 5.2A9.4 9.4 0 0 1 12 5.8c6 0 9.5 6.2 9.5 6.2a17.5 17.5 0 0 1-3.2 3.9M6.6 6.9A17 17 0 0 0 2.5 12S6 18.2 12 18.2c1.2 0 2.3-.2 3.3-.7" />
    </>
  ),
  reset: (
    <>
      <path d="M5.5 12a6.5 6.5 0 1 0 1.9-4.6" />
      <path d="M5.5 4.5v4h4" />
    </>
  ),
};

export function Icon({ name, size = 15, className = '' }) {
  const paths = PATHS[name];
  if (!paths) return null;
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths}
    </svg>
  );
}

export default Icon;
