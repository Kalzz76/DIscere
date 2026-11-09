import React from 'react';
import { ToolType } from '../engine/types';
import { TOOLS } from '../engine/shapes';

export interface ToolRailProps {
  activeTool: ToolType;
  onSelectTool: (tool: ToolType, buttonEl: HTMLElement) => void;
}

export function ToolRail({ activeTool, onSelectTool }: ToolRailProps) {
  return (
    <nav className="pn tool-rail" aria-label="Alat gambar">
      {TOOLS.map(([id, name, shortcut, iconSvg]) => {
        const isUpload = id === 'upload';
        const isAi = id === 'ai';
        const isOn = activeTool === id;

        return (
          <React.Fragment key={id}>
            {isUpload && <hr className="dv" />}
            <button
              className={`t ${isOn ? 'on' : ''}`}
              data-t={id}
              title={isAi ? 'Tanya AI (Segera)' : `${name} (${shortcut})`}
              aria-label={name}
              disabled={isAi}
              style={isAi ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
              onClick={(e) => {
                if (!isAi) {
                  onSelectTool(id, e.currentTarget);
                }
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

