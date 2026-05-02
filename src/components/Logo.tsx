import logo from "@/assets/ethara-logo.png";

export function Logo({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <img
      src={logo}
      alt="Ethara"
      width={size}
      height={size}
      loading="lazy"
      className={`rounded-lg shadow-glow ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
