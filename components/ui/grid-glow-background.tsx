"use client";

import React, { useRef, useEffect } from "react";

interface GridGlowBackgroundProps {
  children: React.ReactNode;
  backgroundColor?: string;
  gridColor?: string;
  gridSize?: number;
  glowColors?: string[];
  glowCount?: number;
}

export const GridGlowBackground: React.FC<GridGlowBackgroundProps> = ({
  children,
  backgroundColor = "#0a0a0a",
  gridColor = "rgba(255, 255, 255, 0.05)",
  gridSize = 50,
  glowColors = ["#4A00E0", "#8E2DE2", "#4A00E0"],
  glowCount = 10,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas: HTMLCanvasElement | null = canvasRef.current;
    if (!canvas) return;
    const ctx: CanvasRenderingContext2D | null = canvas.getContext("2d");
    if (!ctx) return;
    const c: HTMLCanvasElement = canvas;
    const cx: CanvasRenderingContext2D = ctx;

    let glows: Glow[] = [];
    let frameId = 0;

    class Glow {
      x: number;
      y: number;
      targetX: number;
      targetY: number;
      radius: number;
      speed: number;
      color: string;
      alpha: number;

      constructor() {
        this.x =
          Math.floor(Math.random() * (c.width / gridSize)) * gridSize;
        this.y =
          Math.floor(Math.random() * (c.height / gridSize)) * gridSize;
        this.targetX = this.x;
        this.targetY = this.y;
        this.radius = Math.random() * 80 + 40;
        this.speed = Math.random() * 0.015 + 0.01;
        this.color =
          glowColors[Math.floor(Math.random() * glowColors.length)] ?? "#4A00E0";
        this.alpha = 0;
        this.setNewTarget();
      }

      setNewTarget() {
        this.targetX =
          Math.floor(Math.random() * (c.width / gridSize)) * gridSize;
        this.targetY =
          Math.floor(Math.random() * (c.height / gridSize)) * gridSize;
      }

      update() {
        this.x += (this.targetX - this.x) * this.speed;
        this.y += (this.targetY - this.y) * this.speed;

        if (
          Math.abs(this.targetX - this.x) < 1 &&
          Math.abs(this.targetY - this.y) < 1
        ) {
          this.setNewTarget();
        }
        if (this.alpha < 1) this.alpha += 0.01;
      }

      draw() {
        cx.globalAlpha = this.alpha;
        const grad = cx.createRadialGradient(
          this.x,
          this.y,
          0,
          this.x,
          this.y,
          this.radius,
        );
        grad.addColorStop(0, this.color);
        grad.addColorStop(1, "transparent");
        cx.fillStyle = grad;
        cx.beginPath();
        cx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
        cx.fill();
        cx.globalAlpha = 1;
      }
    }

    const resize = () => {
      c.width = window.innerWidth;
      c.height = window.innerHeight;
      glows = Array.from({ length: glowCount }, () => new Glow());
    };

    const drawGrid = () => {
      cx.strokeStyle = gridColor;
      cx.lineWidth = 1;
      for (let x = 0; x < c.width; x += gridSize) {
        cx.beginPath();
        cx.moveTo(x, 0);
        cx.lineTo(x, c.height);
        cx.stroke();
      }
      for (let y = 0; y < c.height; y += gridSize) {
        cx.beginPath();
        cx.moveTo(0, y);
        cx.lineTo(c.width, y);
        cx.stroke();
      }
    };

    const animate = () => {
      cx.clearRect(0, 0, c.width, c.height);
      drawGrid();
      glows.forEach((g) => {
        g.update();
        g.draw();
      });
      frameId = requestAnimationFrame(animate);
    };

    resize();
    animate();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(frameId);
    };
  }, [gridColor, gridSize, glowColors, glowCount]);

  return (
    <div className="relative min-h-screen w-full" style={{ backgroundColor }}>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 z-0 h-full w-full opacity-50 pointer-events-none"
      />
      <div className="relative z-10 min-h-screen w-full">
        {children}
      </div>
    </div>
  );
};

export default GridGlowBackground;
