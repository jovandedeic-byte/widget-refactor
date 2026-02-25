"use client";

import { ReactNode, useEffect, useRef } from "react";
import clsx from "clsx";
import { createNoise3D } from "simplex-noise";

type LightVortexProps = {
  children?: ReactNode;
  className?: string;
  hue?: "blue" | "red";
};

// hot (red) = purple-blue, cold (blue) = green-yellow-orange
const PALETTE = {
  red: { baseHue: 30, rangeHue: 90 }, // 30-120: orange → yellow → green
  blue: { baseHue: 220, rangeHue: 60 }, // 220-280: blue → purple
} as const;

const PARTICLE_COUNT = 300;
const PROP_COUNT = 9; // x, y, vx, vy, life, ttl, speed, radius, hue
const BASE_TTL = 50;
const RANGE_TTL = 150;
const BASE_SPEED = 0.0;
const RANGE_SPEED = 1.5;
const BASE_RADIUS = 1;
const RANGE_RADIUS = 2;
const NOISE_STEPS = 3;
const X_OFF = 0.00125;
const Y_OFF = 0.00125;
const Z_OFF = 0.0005;
const TAU = 2 * Math.PI;

export default function LightVortex({
  children,
  className,
  hue = "blue",
}: LightVortexProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    if (!ctx) return;

    const { baseHue, rangeHue } = PALETTE[hue];
    const noise3D = createNoise3D();
    const propsLen = PARTICLE_COUNT * PROP_COUNT;
    let props = new Float32Array(propsLen);
    let tick = 0;
    let center: [number, number] = [0, 0];

    const rand = (n: number) => n * Math.random();
    const randRange = (n: number) => n - rand(2 * n);
    const fadeInOut = (t: number, m: number) => {
      const hm = 0.5 * m;
      return Math.abs(((t + hm) % m) - hm) / hm;
    };
    const lerp = (a: number, b: number, s: number) => (1 - s) * a + s * b;

    function resize() {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      center[0] = 0.5 * canvas.width;
      center[1] = 0.5 * canvas.height;
    }

    function initParticle(i: number) {
      props[i] = rand(canvas.width); // x
      props[i + 1] = center[1] + randRange(canvas.height * 0.4); // y
      props[i + 2] = 0; // vx
      props[i + 3] = 0; // vy
      props[i + 4] = 0; // life
      props[i + 5] = BASE_TTL + rand(RANGE_TTL); // ttl
      props[i + 6] = BASE_SPEED + rand(RANGE_SPEED); // speed
      props[i + 7] = BASE_RADIUS + rand(RANGE_RADIUS); // radius
      props[i + 8] = baseHue + rand(rangeHue); // hue
    }

    function draw() {
      tick++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < propsLen; i += PROP_COUNT) {
        const x = props[i];
        const y = props[i + 1];
        const n =
          noise3D(x * X_OFF, y * Y_OFF, tick * Z_OFF) * NOISE_STEPS * TAU;
        const vx = lerp(props[i + 2], Math.cos(n), 0.5);
        const vy = lerp(props[i + 3], Math.sin(n), 0.5);
        const life = props[i + 4];
        const ttl = props[i + 5];
        const speed = props[i + 6];
        const radius = props[i + 7];
        const h = props[i + 8];
        const x2 = x + vx * speed;
        const y2 = y + vy * speed;

        // draw dot
        ctx.beginPath();
        ctx.arc(x2, y2, radius, 0, TAU);
        ctx.fillStyle = `hsla(${h},100%,60%,${fadeInOut(life, ttl)})`;
        ctx.fill();

        props[i] = x2;
        props[i + 1] = y2;
        props[i + 2] = vx;
        props[i + 3] = vy;
        props[i + 4] = life + 1;

        if (
          x2 < 0 ||
          x2 > canvas.width ||
          y2 < 0 ||
          y2 > canvas.height ||
          life > ttl
        ) {
          initParticle(i);
        }
      }

      // single soft glow pass
      ctx.save();
      ctx.filter = "blur(6px) brightness(150%)";
      ctx.globalCompositeOperation = "lighter";
      ctx.drawImage(canvas, 0, 0);
      ctx.restore();

      frameRef.current = requestAnimationFrame(draw);
    }

    resize();
    for (let i = 0; i < propsLen; i += PROP_COUNT) initParticle(i);
    draw();

    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(frameRef.current);
    };
  }, [hue]);

  return (
    <div
      className={clsx(
        "relative w-full h-full overflow-hidden bg-black",
        className,
      )}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <div className="relative z-10 w-full h-full flex flex-col">
        {children}
      </div>
    </div>
  );
}
