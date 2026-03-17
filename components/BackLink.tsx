"use client";

export default function BackLink({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <a
      href="#"
      role="button"
      onClick={(e) => {
        e.preventDefault();
        window.history.back();
      }}
      style={style}
    >
      {children}
    </a>
  );
}
