"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export default function SplashScreen() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (sessionStorage.getItem("splashPlayed")) {
      setVisible(false);
      return;
    }

    const t1 = setTimeout(() => {
      const el = document.getElementById("splash-root");
      if (el) el.style.animation = "splashFadeOut 0.6s ease-out forwards";
    }, 2800);

    const t2 = setTimeout(() => {
      setVisible(false);
      sessionStorage.setItem("splashPlayed", "1");
    }, 3500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      id="splash-root"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-noir"
      style={{ willChange: "opacity, transform" }}
    >
      {/* Halo doré */}
      <div
        className="absolute rounded-full bg-or/20 blur-3xl w-64 h-64"
        style={{
          animation: "splashHaloIn 1.2s cubic-bezier(0.22, 0.61, 0.36, 1) forwards, splashHaloPulse 2s ease-in-out 1.2s infinite",
          opacity: 0,
          willChange: "transform, opacity",
        }}
      />

      {/* Logo */}
      <div
        className="relative"
        style={{
          animation: "splashLogoIn 1.2s cubic-bezier(0.22, 0.61, 0.36, 1) forwards, splashLogoFloat 2s ease-in-out 1.2s infinite",
          opacity: 0,
          willChange: "transform, opacity",
        }}
      >
        <Image
          src="/Logo.png"
          alt="Logo"
          width={180}
          height={180}
          className="rounded-2xl shadow-2xl"
          priority
        />
      </div>

      {/* Texte "CTF" */}
      <div className="mt-8 h-14 flex items-center overflow-hidden">
        <span
          className="font-display text-3xl sm:text-4xl font-bold text-blanc"
          style={{
            animation: "splashTextIn 0.8s cubic-bezier(0.22, 0.61, 0.36, 1) 0.8s forwards",
            opacity: 0,
            willChange: "transform, opacity, filter",
          }}
        >
          CTF{" "}
          <span
            className="text-or"
            style={{
              animation: "splashFinanceIn 0.8s cubic-bezier(0.22, 0.61, 0.36, 1) 1.2s forwards",
              opacity: 0,
              willChange: "opacity, letter-spacing, filter",
            }}
          >
            Finance
          </span>
        </span>
      </div>

      {/* Ligne dorée */}
      <div
        className="mt-5 h-0.5 bg-gradient-or rounded-full"
        style={{
          animation: "splashLineGrow 0.8s cubic-bezier(0.22, 0.61, 0.36, 1) 1.6s forwards",
          width: 0,
          opacity: 0,
          willChange: "width, opacity",
        }}
      />

      {/* Particules dorées */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(16)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-or/60"
            style={{
              left: `${5 + i * 6}%`,
              top: `${15 + (i % 5) * 18}%`,
              animation: `floatParticle ${2.5 + (i % 3)}s ease-in-out ${i * 0.12}s infinite`,
              willChange: "transform, opacity",
            }}
          />
        ))}
      </div>
    </div>
  );
}
