// Pictogrammes dessinés pour FORMA-7 (trait 1.8, coins arrondis).
const P: Record<string, string> = {
  map: "M9 4 3 6.5v13L9 17l6 2.5 6-2.5v-13L15 7 9 4Zm0 0v13m6-10v12.5",
  base: "M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5v-13ZM13 4h5.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H13V4Zm-6 4h1.5M7 11h1.5m8-3H15m1.5 3H15",
  maint: "M14.7 6.3a4 4 0 0 0-5.4 5.2L4 16.8V20h3.2l5.3-5.3a4 4 0 0 0 5.2-5.4l-2.6 2.6-2.4-.6-.6-2.4 2.6-2.6Z",
  forge: "M4 9h11a4 4 0 0 1-4 4H9l-1 4h6m-9 3h14M15 9l5-3",
  gear: "M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Zm7.4-3.2c0-.5 0-.9-.1-1.3l2-1.6-2-3.4-2.4 1a7.4 7.4 0 0 0-2.2-1.3L14.3 3h-4l-.4 2.4c-.8.3-1.5.8-2.2 1.3l-2.4-1-2 3.4 2 1.6a7.6 7.6 0 0 0 0 2.6l-2 1.6 2 3.4 2.4-1c.7.5 1.4 1 2.2 1.3l.4 2.4h4l.4-2.4c.8-.3 1.5-.8 2.2-1.3l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.3Z",
  back: "M15 5 8 12l7 7",
  close: "M6 6l12 12M18 6 6 18",
  bolt: "M13 2 4 14h7l-1 8 9-12h-7l1-8Z",
  flame: "M12 22c4 0 7-2.8 7-6.8 0-4.2-3-6.7-4.6-9.7-.5 2.3-1.8 3.6-3.1 4.2.1-2.8-1-5.6-3.3-7.7C8.4 6.6 5 9.6 5 15.2 5 19.2 8 22 12 22Z",
  lock: "M7 11V8a5 5 0 0 1 10 0v3M6 11h12v10H6V11Zm6 4v2",
  check: "M5 12.5 10 17 19 7",
  play: "M8 5v14l11-7L8 5Z",
  speaker: "M4 10v4h4l5 4V6L8 10H4Zm12.5-1.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12",
  share: "M12 3v12m0-12L8 7m4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7",
  signal: "M12 13a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm-4.2-5.7a6 6 0 0 0 0 8.4m8.4 0a6 6 0 0 0 0-8.4M5 4.5a10 10 0 0 0 0 14m14 0a10 10 0 0 0 0-14M12 13v8",
  spark: "M12 3v4m0 10v4M3 12h4m10 0h4M6 6l2.5 2.5m7 7L18 18M6 18l2.5-2.5m7-7L18 6",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  refresh: "M20 11a8 8 0 0 0-14.8-4M4 4v4h4m-4 5a8 8 0 0 0 14.8 4M20 20v-4h-4",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-10v6m0-9.5v.5",
  trophy: "M8 4h8v5a4 4 0 0 1-8 0V4Zm0 2H4v1a4 4 0 0 0 4 4m8-5h4v1a4 4 0 0 1-4 4m-4 2v4m-4 3h8",
  plus: "M12 5v14M5 12h14",
  trash: "M5 7h14M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3",
  copy: "M9 9h10v11H9V9ZM5 15V4h10",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
};

export function Icon({ name, size = 22, stroke = 1.8, className }: { name: keyof typeof P | string; size?: number; stroke?: number; className?: string }) {
  const filled = name === "play" || name === "bolt";
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor"
      strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={P[name] ?? P.info} />
    </svg>
  );
}
