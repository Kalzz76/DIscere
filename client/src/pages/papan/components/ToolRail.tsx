import React from 'react';
import { ToolType } from '../engine/types';
import { TOOLS } from '../engine/shapes';

export interface ToolRailProps {
  activeTool: ToolType;
  hanyaLihat?: boolean;
  disableAi?: boolean;
  onSelectTool: (tool: ToolType, buttonEl: HTMLElement) => void;
}

export function ToolRail({
  activeTool,
  hanyaLihat = false,
  disableAi = false,
  onSelectTool,
}: ToolRailProps) {
  // Jika hanyaLihat, tampilkan hanya alat yang diizinkan (Tangan & Laser)
  let availableTools = hanyaLihat
    ? TOOLS.filter(([id]) => id === 'hand' || id === 'laser')
    : TOOLS;

  if (disableAi) {
    availableTools = availableTools.filter(([id]) => id !== 'ai');
  }

  return (
    <nav className="pn tool-rail" aria-label="Alat gambar">
      {availableTools.map(([id, name, shortcut, iconSvg]) => {
        const isUpload = id === 'upload';
        const isAi = id === 'ai';
        const isOn = activeTool === id;

        return (
          <React.Fragment key={id}>
            {isUpload && <hr className="dv" />}
            <button
              className={`t ${isOn ? 'on' : ''} ${isAi ? 'ai-tool-btn' : ''}`}
              data-t={id}
              title={`${name} (${shortcut})`}
              aria-label={name}
              style={isAi ? { color: '#fbbf24' } : undefined}
              onClick={(e) => {
                onSelectTool(id, e.currentTarget);
              }}
            >
              <svg
                viewBox="0 0 24 24"
                dangerouslySetInnerHTML={{ __html: iconSvg }}
              />
              {name}
            </button>
          </React.Fragment>
        );
      })}
    </nav>
  );
}
