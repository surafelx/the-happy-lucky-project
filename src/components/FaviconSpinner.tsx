"use client";

import { useEffect } from "react";

const HEART = "M0 0C-14-9-27-21-23-34C-20-44-8-46 0-38C8-46 20-44 23-34C27-21 14-9 0 0Z";
const SIZE = 64;
const STEP_MS = 120; // ~8 frames a second; background tabs are throttled by the browser anyway
const DEG_PER_STEP = 3;

/**
 * Makes the tab icon spin: the clover leaves turn while the face stays put.
 * Browsers don't animate SVG favicons, so the icon is redrawn on a canvas
 * and swapped in as a PNG. Skipped for reduced-motion users.
 */
export function FaviconSpinner() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) return;

    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const heart = new Path2D(HEART);
    const original = { href: link.href, type: link.type };
    let angle = 0;

    const draw = () => {
      ctx.clearRect(0, 0, SIZE, SIZE);
      ctx.save();
      ctx.scale(SIZE / 116, SIZE / 116);
      ctx.translate(8, 8); // the icon's viewBox starts at -8,-8

      // leaves
      ctx.save();
      ctx.translate(50, 50);
      ctx.rotate((angle * Math.PI) / 180);
      ctx.fillStyle = "#4B9B9D";
      ctx.strokeStyle = "#E47FC8";
      ctx.lineWidth = 3.5;
      ctx.lineJoin = "round";
      for (const deg of [-45, 45, 135, 225]) {
        ctx.save();
        ctx.rotate((deg * Math.PI) / 180);
        ctx.scale(1.12, 1.12);
        ctx.fill(heart);
        ctx.stroke(heart);
        ctx.restore();
      }
      ctx.restore();

      // face
      ctx.fillStyle = "#F3BC29";
      ctx.strokeStyle = "#E47FC8";
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(50, 50, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#E47FC8";
      for (const x of [41.5, 58.5]) {
        ctx.beginPath();
        ctx.arc(x, 45, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(39.5, 56.5);
      ctx.quadraticCurveTo(50, 66.5, 60.5, 56.5);
      ctx.moveTo(38, 55.5);
      ctx.lineTo(41, 55.5);
      ctx.moveTo(59, 55.5);
      ctx.lineTo(62, 55.5);
      ctx.stroke();
      ctx.restore();

      link.type = "image/png";
      link.href = canvas.toDataURL("image/png");
      angle = (angle + DEG_PER_STEP) % 360;
    };

    draw();
    const timer = window.setInterval(draw, STEP_MS);
    return () => {
      window.clearInterval(timer);
      link.type = original.type;
      link.href = original.href;
    };
  }, []);

  return null;
}
