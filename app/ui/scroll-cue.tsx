import { css } from "remix/component"

// Pure server markup and CSS. It is positioned inside the landing screen, so it scrolls away with it.
const cueStyle = css({
  "@keyframes nudge": {
    "0%,100%": { transform: "translateY(0)", opacity: "1" },
    "50%": { transform: "translateY(9px)", opacity: ".35" },
  },
  position: "absolute",
  left: "50%",
  bottom: "34px",
  transform: "translateX(-50%)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "12px",
  font: "500 14px/1 var(--sans)",
  letterSpacing: "0",
  color: "var(--muted)",
  textDecoration: "none",
  padding: "8px 14px",
  "& svg": {
    width: "18px",
    height: "16px",
    display: "block",
    color: "var(--ink)",
    animation: "nudge 1.7s cubic-bezier(.45,0,.25,1) infinite",
  },
  "&:hover svg": { animationDuration: "1s" },
  "&:focus-visible": { borderRadius: "8px" },
})

export function ScrollCue() {
  return () => (
    <a href="#intro" aria-label="Scroll to learn more" mix={cueStyle}>
      <span>Scroll</span>
      <svg viewBox="0 0 24 22" aria-hidden="true">
        <path d="M1.5 2h21L12 20z" fill="currentColor" />
      </svg>
    </a>
  )
}
