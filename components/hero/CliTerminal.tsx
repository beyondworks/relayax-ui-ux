"use client";

import { useEffect, useRef } from "react";

/**
 * CliTerminal
 * -----------
 * 히어로 마지막 슬롯에 사용되는 모의 CLI 터미널.
 * 원본: Image/cli_smaller.html — 터미널 크롬 + 픽셀 아트 RelayAX 로고 + 로그인 성공 메시지.
 * 다운로드 버튼 제거, 반응형 크기로 재작성.
 */
export function CliTerminal() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const GRID = 11;
    const GAP = 2;
    const ISO_H = 4;
    const STEP = GRID + GAP;

    const R = 5.4;
    const LCX = 4.5;
    const RCX = 12.1;
    const CY = 5.5;
    const COLS = 18;
    const ROWS = 12;

    canvas.width = COLS * STEP;
    canvas.height = ROWS * STEP + ISO_H + 4;

    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const drawBlock = (col: number, row: number) => {
      const x = col * STEP;
      const y = row * STEP;

      // 아래 이소메트릭 면
      ctx.fillStyle = "#888";
      ctx.beginPath();
      ctx.moveTo(x, y + GRID);
      ctx.lineTo(x, y + GRID + ISO_H);
      ctx.lineTo(x + GRID, y + GRID + ISO_H);
      ctx.lineTo(x + GRID, y + GRID);
      ctx.closePath();
      ctx.fill();

      // 윗면
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x, y, GRID, GRID);

      // 우/하단 섀도우
      ctx.fillStyle = "rgba(0,0,0,0.08)";
      ctx.fillRect(x + GRID - 2, y, 2, GRID);
      ctx.fillRect(x, y + GRID - 2, GRID, 2);

      // 상/좌 하이라이트
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fillRect(x + 1, y + 1, Math.floor(GRID * 0.5), 2);
      ctx.fillRect(x + 1, y + 1, 2, Math.floor(GRID * 0.35));
    };

    // 두 원이 겹친 로고 (RelayAX)
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const ldx = col - LCX;
        const ldy = row - CY;
        const rdx = col - RCX;
        const rdy = row - CY;
        if (ldx * ldx + ldy * ldy <= R * R || rdx * rdx + rdy * rdy <= R * R) {
          drawBlock(col, row);
        }
      }
    }
  }, []);

  return (
    <div className="flex w-full max-w-[440px] flex-col">
      <div className="overflow-hidden rounded-[10px] bg-[#1a1a1a] shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
        {/* macOS style titlebar */}
        <div className="flex items-center gap-2 bg-[#2d2d2d] px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </div>
        {/* Canvas logo — aspect-ratio 고정으로 높이 자동 계산 */}
        <div className="flex items-center justify-center px-10 py-5">
          <canvas
            ref={canvasRef}
            className="block w-full"
            style={{
              imageRendering: "pixelated",
              aspectRatio: "234 / 164",
              maxHeight: "200px",
              width: "auto",
              maxWidth: "100%",
            }}
          />
        </div>
        {/* Bottom line */}
        <div className="px-6 pb-4 font-mono text-[12px] text-[#f0f0f0]">
          Login successful. Press Enter to continue
          <span className="ml-0.5 inline-block h-[12px] w-[7px] animate-[blink_1s_step-end_infinite] align-middle bg-[#f0f0f0]" />
        </div>
      </div>
      <style jsx>{`
        @keyframes blink {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
