import { Box } from "@mui/material";
import React, { useState } from "react";

interface SciLatexAnimatedLogoProps {
  size?: number | string;
  mode?: "light" | "dark";
}

export const SciLatexAnimatedLogo: React.FC<SciLatexAnimatedLogoProps> = ({
  size = 320,
  mode = "dark",
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Box
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      sx={{
        position: "relative",
        width: size,
        height: size,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        transition: "transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        filter:
          mode === "dark"
            ? "drop-shadow(0 0 28px rgba(14, 165, 233, 0.4)) drop-shadow(0 0 16px rgba(49, 94, 245, 0.3))"
            : "drop-shadow(0 12px 28px rgba(0, 0, 0, 0.12))",
        "&:hover": {
          transform: "scale(1.03)",
        },
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 800 800"
        style={{ width: "100%", height: "100%", overflow: "visible" }}
      >
        <defs>
          <linearGradient id="arcGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#16C7A0" />
            <stop offset="0.5" stopColor="#0EA5E9" />
            <stop offset="1" stopColor="#315EF5" />
          </linearGradient>
          <linearGradient id="brainGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#08A9F5" />
            <stop offset="1" stopColor="#5B35E8" />
          </linearGradient>
          <linearGradient id="codeGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#0B356F" />
            <stop offset="1" stopColor="#08224B" />
          </linearGradient>
          <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="10" stdDeviation="12" floodOpacity="0.14" />
          </filter>
          <filter id="softGlow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <style>{`
          .logo-root { transform-origin: 400px 400px; }
          .orbit { transform-origin: 400px 400px; stroke-dasharray: 2200; stroke-dashoffset: 2200; animation: orbitDraw 2.2s ease-out forwards, orbitFloat 5s ease-in-out 2.2s infinite; transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1); }
          .orbit-ticks { transform-origin: 400px 400px; animation: orbitFloat 5s ease-in-out 2.2s infinite; transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1); }
          .document { transform-origin: 400px 400px; animation: documentIn .8s cubic-bezier(.2,.8,.2,1) .35s both, documentFloat 4s ease-in-out 1.2s infinite; }
          .brain { transform-origin: 400px 140px; animation: brainIn .75s cubic-bezier(.2,.9,.2,1) .75s both, brainPulse 3s ease-in-out 1.5s infinite; }
          .brain-circuit { stroke-dasharray: 35; stroke-dashoffset: 35; animation: circuitDraw 1.2s ease-out 1.15s forwards, circuitGlow 3s ease-in-out 2.4s infinite; }
          .code-window { transform-origin: 240px 540px; animation: codeIn .75s cubic-bezier(.2,.9,.2,1) .85s both, codeFloat 4.5s ease-in-out 1.6s infinite; }
          .pen { transform-origin: 500px 510px; animation: penIn .7s cubic-bezier(.2,.9,.2,1) 1.1s both, penWriting 2.5s ease-in-out infinite; }
          .tasks { transform-origin: 640px 380px; animation: tasksIn .7s cubic-bezier(.2,.9,.2,1) 1.35s both; }
          .check1 { animation: checkIn .35s ease-out 1.9s both; }
          .check2 { animation: checkIn .35s ease-out 2.15s both; }
          .check3 { animation: checkIn .35s ease-out 2.4s both; }
          .pen-scribble { stroke-dasharray: 130; stroke-dashoffset: 130; animation: scribbleDraw 2.5s ease-in-out infinite; }

          .brain-wrap { transform-origin: 400px 140px; transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1); }
          .doc-wrap   { transform-origin: 400px 400px; transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1); }
          .code-wrap  { transform-origin: 240px 540px; transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1); }
          .tasks-wrap { transform-origin: 640px 380px; transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1); }
          .pen-wrap   { transform-origin: 500px 510px; transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1); }

          @keyframes orbitDraw { to { stroke-dashoffset: 0; } }
          @keyframes orbitFloat { 0%,100% { transform: rotate(0deg); } 50% { transform: rotate(2deg); } }
          @keyframes documentIn { from { opacity:0; transform:translateY(28px) scale(.94); } to { opacity:1; transform:translateY(0) scale(1); } }
          @keyframes documentFloat { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-5px); } }
          @keyframes brainIn { from { opacity:0; transform:scale(.7); } to { opacity:1; transform:scale(1); } }
          @keyframes brainPulse { 0%,100% { transform:scale(1); } 50% { transform:scale(1.025); } }
          @keyframes circuitDraw { to { stroke-dashoffset:0; } }
          @keyframes circuitGlow { 0%,100% { filter:none; } 50% { filter:url(#softGlow); } }
          @keyframes codeIn { from { opacity:0; transform:translateX(-30px) scale(.9); } to { opacity:1; transform:translateX(0) scale(1); } }
          @keyframes codeFloat { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-4px); } }
          @keyframes penIn { from { opacity:0; transform:translate(25px,25px) rotate(15deg); } to { opacity:1; transform:translate(0,0) rotate(0deg); } }
          @keyframes penWriting { 0%, 100% { transform: translate(0, 0) rotate(0deg); } 50% { transform: translate(-100px, -5px) rotate(-6deg); } }
          @keyframes scribbleDraw { 0% { stroke-dashoffset: 130; } 50%, 100% { stroke-dashoffset: 0; } }
          @keyframes tasksIn { from { opacity:0; transform:translateX(25px) scale(.9); } to { opacity:1; transform:translateX(0) scale(1); } }
          @keyframes checkIn { from { opacity:0; transform:scale(.4); } to { opacity:1; transform:scale(1); } }
        `}</style>

        <g className="logo-root">
          {/* Dynamic orbit circle */}
          <circle
            className="orbit"
            cx="400"
            cy="400"
            r="345"
            fill="none"
            stroke="url(#arcGrad)"
            strokeWidth="12"
            strokeLinecap="round"
            style={{
              transform: isHovered ? "scale(1.04)" : "scale(1)",
            }}
          />

          {/* 12 Internal Chronometer Hour Dial Ticks (Inside Outer Ring) */}
          <g
            className="orbit-ticks"
            fill="none"
            strokeLinecap="round"
            style={{
              transform: isHovered ? "scale(1.04)" : "scale(1)",
            }}
          >
            <line x1="400" y1="65" x2="400" y2="95" stroke="#0EA5E9" strokeWidth="5" transform="rotate(0 400 400)" />
            <line x1="400" y1="65" x2="400" y2="85" stroke="#38BDF8" strokeWidth="3" opacity="0.85" transform="rotate(30 400 400)" />
            <line x1="400" y1="65" x2="400" y2="85" stroke="#38BDF8" strokeWidth="3" opacity="0.85" transform="rotate(60 400 400)" />
            <line x1="400" y1="65" x2="400" y2="95" stroke="#0EA5E9" strokeWidth="5" transform="rotate(90 400 400)" />
            <line x1="400" y1="65" x2="400" y2="85" stroke="#38BDF8" strokeWidth="3" opacity="0.85" transform="rotate(120 400 400)" />
            <line x1="400" y1="65" x2="400" y2="85" stroke="#38BDF8" strokeWidth="3" opacity="0.85" transform="rotate(150 400 400)" />
            <line x1="400" y1="65" x2="400" y2="95" stroke="#0EA5E9" strokeWidth="5" transform="rotate(180 400 400)" />
            <line x1="400" y1="65" x2="400" y2="85" stroke="#38BDF8" strokeWidth="3" opacity="0.85" transform="rotate(210 400 400)" />
            <line x1="400" y1="65" x2="400" y2="85" stroke="#38BDF8" strokeWidth="3" opacity="0.85" transform="rotate(240 400 400)" />
            <line x1="400" y1="65" x2="400" y2="95" stroke="#0EA5E9" strokeWidth="5" transform="rotate(270 400 400)" />
            <line x1="400" y1="65" x2="400" y2="85" stroke="#38BDF8" strokeWidth="3" opacity="0.85" transform="rotate(300 400 400)" />
            <line x1="400" y1="65" x2="400" y2="85" stroke="#38BDF8" strokeWidth="3" opacity="0.85" transform="rotate(330 400 400)" />
          </g>

          {/* AI brain (High Top-Center) */}
          <g
            className="brain-wrap"
            style={{
              transform: isHovered ? "translateY(-165px) scale(1.08)" : "translateY(-120px)",
            }}
          >
            <g className="brain" filter="url(#shadow)">
              <path
                d="M400 205 C365 175 315 196 320 238 C285 245 282 295 313 310 C294 348 331 378 365 365 C382 390 418 390 435 365 C469 378 506 348 487 310 C518 295 515 245 480 238 C485 196 435 175 400 205Z"
                fill="url(#brainGrad)"
              />
              <path
                className="brain-circuit"
                d="M400 215 V350 M400 255 H360 V230 M400 280 H445 V245 M400 310 H355 V295 M400 330 H440 V315"
                fill="none"
                stroke="#fff"
                strokeWidth="9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <g fill="#fff">
                <circle cx="360" cy="230" r="8" />
                <circle cx="445" cy="245" r="8" />
                <circle cx="355" cy="295" r="8" />
                <circle cx="440" cy="315" r="8" />
              </g>
            </g>
          </g>

          {/* Scientific document (Centered at X=400, Y=400) */}
          <g
            className="doc-wrap"
            style={{
              transform: isHovered ? "translateY(20px) scale(0.96)" : "translateY(0)",
            }}
          >
            <g className="document" filter="url(#shadow)">
              <path d="M295 230 H455 L505 280 V570 H295 Z" fill="#fff" />
              <path d="M455 230 V280 H505" fill="#DCEAFF" />
              <path d="M455 230 L505 280 H455 Z" fill="#C9DDF7" />
              <rect x="325" y="305" width="115" height="13" rx="6" fill="#0B3F86" />
              <rect x="325" y="335" width="145" height="10" rx="5" fill="#9DB9D8" />
              <rect x="325" y="380" width="140" height="10" rx="5" fill="#AFC5DE" />
              <rect x="325" y="405" width="120" height="10" rx="5" fill="#AFC5DE" />
              <rect x="325" y="430" width="150" height="13" rx="6" fill="#0B3F86" />
              <rect x="325" y="460" width="125" height="10" rx="5" fill="#AFC5DE" />
              <rect x="325" y="485" width="95" height="10" rx="5" fill="#AFC5DE" />
              {/* Animated writing scribble stroke */}
              <path
                className="pen-scribble"
                d="M325 515 Q 355 507, 385 515 T 435 515"
                fill="none"
                stroke="#1697F3"
                strokeWidth="5"
                strokeLinecap="round"
              />
            </g>
          </g>

          {/* VS Code-style editor (Bottom-Left: X=130..365, Y=450..635) */}
          <g
            className="code-wrap"
            style={{
              transform: isHovered ? "translate(-65px, 45px) scale(1.06)" : "translate(0, 0)",
            }}
          >
            <g className="code-window" filter="url(#shadow)">
              <rect x="130" y="450" width="235" height="185" rx="22" fill="url(#codeGrad)" />
              <circle cx="160" cy="478" r="7" fill="#20A9F4" />
              <circle cx="183" cy="478" r="7" fill="#20A9F4" />
              <circle cx="206" cy="478" r="7" fill="#20A9F4" />
              <path
                d="M190 540 L250 585 L290 555 L250 525 L190 570"
                fill="none"
                stroke="#1697F3"
                strokeWidth="20"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M250 525 V585" stroke="#1697F3" strokeWidth="20" strokeLinecap="round" />
            </g>
          </g>

          {/* Goals / tasks (Top-Right: X=560..725, Y=310..455) */}
          <g
            className="tasks-wrap"
            style={{
              transform: isHovered ? "translate(65px, -45px) scale(1.06)" : "translate(0, 0)",
            }}
          >
            <g className="tasks" filter="url(#shadow)">
              <rect x="560" y="310" width="165" height="145" rx="20" fill="#10B98E" />
              <g fill="none" stroke="#fff" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round">
                <path className="check1" d="M580 345 L593 358 L615 333" />
                <path className="check2" d="M580 385 L593 398 L615 373" />
                <path className="check3" d="M580 425 L593 438 L615 413" />
              </g>
              <g stroke="#D5FFF5" strokeWidth="8" strokeLinecap="round">
                <path d="M635 345 H695" />
                <path d="M635 385 H695" />
                <path d="M635 425 H695" />
              </g>
            </g>
          </g>

          {/* Writing / authoring pen (Active Writing Position) */}
          <g
            className="pen-wrap"
            style={{
              transform: isHovered ? "translate(60px, 60px) rotate(18deg)" : "translate(0, 0)",
            }}
          >
            <g className="pen" filter="url(#shadow)">
              <path d="M470 510 L535 430 L575 460 L510 540 Z" fill="#0A3D82" />
              <path d="M470 510 L445 548 L510 540 Z" fill="#0A3D82" />
              <path d="M535 430 L550 415 L590 445 L575 460 Z" fill="#1A74D8" />
              <path d="M445 548 L438 560 L465 555 Z" fill="#123F79" />
            </g>
          </g>
        </g>
      </svg>
    </Box>
  );
};
