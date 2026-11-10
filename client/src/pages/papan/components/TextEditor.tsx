import React, { useEffect, useRef, useState } from 'react';
import { TextEditorState, BoardView } from '../engine/types';

export interface TextEditorProps {
  editor: TextEditorState | null;
  view: BoardView;
  onCommit: (editor: TextEditorState, value: string) => void;
  onCancel: () => void;
}

export function TextEditor({
  editor,
  view,
  onCommit,
  onCancel,
}: TextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [val, setVal] = useState('');

  useEffect(() => {
    if (editor) {
      setVal(editor.text);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.select();
          textareaRef.current.style.height = 'auto';
          textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
      }, 10);
    }
  }, [editor]);

  if (!editor) return null;

  const isTable = editor.r !== undefined;
  const isTextObj = editor.obj && editor.obj.type === 'text';
  const fs = isTextObj ? (editor.obj as any).fs : isTable ? 16 : 24;
  const fw = isTextObj ? (editor.obj as any).fw || 600 : 600;
  const minW = isTable && editor.obj ? (editor.obj as any).cw * view.z : 160;

  const left = editor.x * view.z + view.x;
  const top = editor.y * view.z + view.y;

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setVal(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    e.stopPropagation();
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || isTable)) {
      e.preventDefault();
      onCommit(editor, val);
    }
  };

  const handleBlur = () => {
    onCommit(editor, val);
  };

  return (
    <textarea
      ref={textareaRef}
      className="text-editor-overlay"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        fontSize: `${fs * view.z}px`,
        fontWeight: fw,
        minWidth: `${minW}px`,
      }}
      rows={1}
      value={val}
      onChange={handleInput}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      aria-label="Editor teks kanvas"
    />
  );
}

