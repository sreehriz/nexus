import React from "react";
import { WhiteboardFlowchart } from "./types";

interface WhiteboardPanelProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  drawingColor: string;
  lineWidth: number;
  whiteboardFlowcharts: WhiteboardFlowchart[];
  onSetDrawingColor: (color: string) => void;
  onSetLineWidth: (width: number) => void;
  onCleanToFlowchart: () => void;
  onClearWhiteboard: () => void;
  onStartDrawing: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onDraw: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onStopDrawing: () => void;
}

export default function WhiteboardPanel({
  canvasRef,
  drawingColor,
  lineWidth,
  whiteboardFlowcharts,
  onSetDrawingColor,
  onSetLineWidth,
  onCleanToFlowchart,
  onClearWhiteboard,
  onStartDrawing,
  onDraw,
  onStopDrawing,
}: WhiteboardPanelProps) {
  return (
    <div className="flex-1 flex flex-col gap-3 h-full justify-between text-left relative">
      <div className="flex items-center justify-between font-mono text-[10px] uppercase text-theme-text-muted">
        <span>AI Diagram Canvas</span>
        <div className="flex gap-2">
          <button
            onClick={onCleanToFlowchart}
            className="text-[9px] text-cyan-400 hover:underline cursor-pointer font-bold uppercase tracking-wider"
            title="Generate flow diagram blocks from sketch lines"
          >
            Clean Diagram
          </button>
          <button
            onClick={onClearWhiteboard}
            className="text-[9px] text-red-500 hover:underline cursor-pointer font-bold uppercase tracking-wider"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Colors and brush width options */}
      <div className="flex items-center justify-between bg-theme-surface/50 border border-theme-border/20 px-2 py-1.5 rounded-lg text-[9px] gap-2 select-none">
        <div className="flex gap-1">
          {["#FFFFFF", "#EC4899", "#3B82F6", "#10B981", "#F59E0B"].map((c) => (
            <span
              key={c}
              onClick={() => onSetDrawingColor(c)}
              className="w-3.5 h-3.5 rounded-full border cursor-pointer block transition-transform hover:scale-110"
              style={{ backgroundColor: c, borderColor: drawingColor === c ? "#FFFFFF" : "transparent" }}
            />
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-theme-text-secondary">
          <span>Brush:</span>
          <input
            type="range"
            min="1"
            max="8"
            value={lineWidth}
            onChange={(e) => onSetLineWidth(Number(e.target.value))}
            className="w-16 accent-theme-text-primary"
          />
        </div>
      </div>

      {/* Canvas drawing container */}
      <div className="flex-1 relative rounded-xl border border-theme-border bg-black/40 overflow-hidden min-h-[220px]">
        <canvas
          ref={canvasRef}
          width={300}
          height={250}
          onMouseDown={onStartDrawing}
          onMouseMove={onDraw}
          onMouseUp={onStopDrawing}
          onMouseLeave={onStopDrawing}
          className="absolute inset-0 cursor-crosshair w-full h-full"
        />

        {/* Clean flowchart overlays */}
        {whiteboardFlowcharts.map((box) => (
          <div
            key={box.id}
            style={{ left: box.x, top: box.y }}
            className={`absolute p-2 border text-[8px] font-mono rounded shadow bg-theme-bg/90 select-none z-10 max-w-[80px] text-center leading-tight transition-all duration-300 ${
              box.type === "decision" ? "border-amber-500 text-amber-400" : "border-emerald-500 text-emerald-400"
            }`}
          >
            {box.label}
          </div>
        ))}
      </div>
    </div>
  );
}
