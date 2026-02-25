"use client";

import { ReactNode } from "react";
import clsx from "clsx";

type LightVortexProps = {
  children?: ReactNode;
  className?: string;
  hue?: "blue" | "red";
};

export default function LightVortex({
  children,
  className,
  hue = "blue",
}: LightVortexProps) {
  const palette =
    hue === "red"
      ? {
          l1: "rgba(255, 60, 80, 0.15)",
          l2: "rgba(255, 0, 100, 0.15)",
          l3: "rgba(255, 120, 150, 0.1)",
        }
      : {
          l1: "rgba(0, 255, 255, 0.15)",
          l2: "rgba(0, 140, 255, 0.15)",
          l3: "rgba(80, 180, 255, 0.1)",
        };

  return (
    <div
      className={clsx(
        "relative w-full h-full overflow-hidden bg-black",
        className,
      )}
    >
      {/* vortex layers */}
      <div
        className="absolute inset-[-50%] rounded-full pointer-events-none animate-vortexSlow blur-[0.5px]"
        style={{
          background: `radial-gradient(circle, ${palette.l1} 2px, transparent 3px)`,
          backgroundSize: "60px 60px",
        }}
      />

      <div
        className="absolute inset-[-50%] rounded-full pointer-events-none animate-vortexReverse blur"
        style={{
          background: `radial-gradient(circle, ${palette.l2} 2px, transparent 3px)`,
          backgroundSize: "40px 40px",
        }}
      />

      <div
        className="absolute inset-[-50%] rounded-full pointer-events-none animate-vortexFast"
        style={{
          background: `radial-gradient(circle, ${palette.l3} 1px, transparent 2px)`,
          backgroundSize: "30px 30px",
        }}
      />

      {/* content */}
      <div className="relative z-10 w-full h-full flex flex-col">
        {children}
      </div>
    </div>
  );
}
