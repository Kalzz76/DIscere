import React, { useState, useEffect, useRef } from 'react';
import { Calculator, X, Delete } from 'lucide-react';

interface KalkulatorMelayangProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KalkulatorMelayang: React.FC<KalkulatorMelayangProps> = ({
  isOpen,
  onClose,
}) => {
  const [display, setDisplay] = useState('0');
  const [expression, setExpression] = useState('');
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [prevValue, setPrevValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);

  // Posisi melayang dan interaksi drag
  const [position, setPosition] = useState({ x: 80, y: 140 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Jangan drag jika klik tombol kalkulator
    if ((e.target as HTMLElement).tagName === 'BUTTON') return;
    setIsDragging(true);
    dragOffsetRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const newX = Math.max(10, Math.min(window.innerWidth - 280, e.clientX - dragOffsetRef.current.x));
      const newY = Math.max(70, Math.min(window.innerHeight - 380, e.clientY - dragOffsetRef.current.y));
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Input Digit
  const inputDigit = (digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? digit : display + digit);
    }
  };

  // Input Desimal
  const inputDecimal = () => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
      return;
    }
    if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  // Clear
  const clearAll = () => {
    setDisplay('0');
    setExpression('');
    setPrevValue(null);
    setOperation(null);
    setWaitingForOperand(false);
  };

  // Backspace / Del
  const handleDelete = () => {
    if (waitingForOperand) return;
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
    }
  };

  // Negasi (+/-)
  const toggleSign = () => {
    const current = parseFloat(display);
    if (!isNaN(current)) {
      setDisplay(String(-current));
    }
  };

  // Persen (%)
  const inputPercent = () => {
    const current = parseFloat(display);
    if (!isNaN(current)) {
      const fixed = parseFloat((current / 100).toFixed(8));
      setDisplay(String(fixed));
    }
  };

  // Operasi (+, -, *, /)
  const performOperation = (nextOp: string) => {
    const inputValue = parseFloat(display);

    if (prevValue === null) {
      setPrevValue(inputValue);
      setExpression(`${inputValue} ${nextOp}`);
    } else if (operation) {
      const currentValue = prevValue || 0;
      let newValue = currentValue;

      if (operation === '+') newValue = currentValue + inputValue;
      else if (operation === '-') newValue = currentValue - inputValue;
      else if (operation === '×' || operation === '*') newValue = currentValue * inputValue;
      else if (operation === '÷' || operation === '/') {
        if (inputValue === 0) {
          setDisplay('Error');
          setWaitingForOperand(true);
          return;
        }
        newValue = currentValue / inputValue;
      }

      // Format angka bersih
      const formatted = parseFloat(newValue.toFixed(6));
      setPrevValue(formatted);
      setDisplay(String(formatted));
      setExpression(`${formatted} ${nextOp}`);
    }

    setWaitingForOperand(true);
    setOperation(nextOp);
  };

  // Hitung Sama Dengan (=)
  const handleEqual = () => {
    const inputValue = parseFloat(display);
    if (prevValue !== null && operation) {
      let result = prevValue;
      if (operation === '+') result = prevValue + inputValue;
      else if (operation === '-') result = prevValue - inputValue;
      else if (operation === '×' || operation === '*') result = prevValue * inputValue;
      else if (operation === '÷' || operation === '/') {
        if (inputValue === 0) {
          setDisplay('Error');
          setWaitingForOperand(true);
          return;
        }
        result = prevValue / inputValue;
      }

      const formatted = parseFloat(result.toFixed(6));
      setExpression(`${prevValue} ${operation} ${inputValue} =`);
      setDisplay(String(formatted));
      setPrevValue(null);
      setOperation(null);
      setWaitingForOperand(true);
    }
  };

  // Keyboard support when calculator is open
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        inputDigit(e.key);
      } else if (e.key === '.') {
        e.preventDefault();
        inputDecimal();
      } else if (e.key === '+' || e.key === '-') {
        e.preventDefault();
        performOperation(e.key);
      } else if (e.key === '*') {
        e.preventDefault();
        performOperation('×');
      } else if (e.key === '/') {
        e.preventDefault();
        performOperation('÷');
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        handleEqual();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleDelete();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, display, prevValue, operation, waitingForOperand]);

  if (!isOpen) return null;

  return (
    <div
      ref={cardRef}
      style={{ left: position.x, top: position.y }}
      className="fixed z-40 w-64 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border-2 border-indigo-200 dark:border-indigo-900 shadow-2xl overflow-hidden select-none"
    >
      {/* Header Kalkulator (Drag Bar) */}
      <div
        onMouseDown={handleMouseDown}
        className="flex items-center justify-between px-3 py-2 bg-indigo-50 dark:bg-slate-800/80 border-b border-indigo-100 dark:border-slate-800 cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300">
          <Calculator className="w-3.5 h-3.5" />
          <span>Kalkulator Cepat</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          title="Tutup Kalkulator"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Display Screen */}
      <div className="p-3 bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 text-right">
        <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono h-4 overflow-hidden truncate">
          {expression || '\u00A0'}
        </div>
        <div className="text-2xl font-black text-slate-800 dark:text-white font-mono tracking-tight overflow-x-auto whitespace-nowrap">
          {display}
        </div>
      </div>

      {/* Grid Tombol */}
      <div className="p-2.5 grid grid-cols-4 gap-1.5 bg-white dark:bg-slate-900">
        <button
          onClick={clearAll}
          className="h-9 rounded-xl font-bold text-xs bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-200 dark:hover:bg-rose-900 transition-colors cursor-pointer"
        >
          C
        </button>
        <button
          onClick={handleDelete}
          className="h-9 rounded-xl font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          title="Hapus Digit"
        >
          <Delete className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={inputPercent}
          className="h-9 rounded-xl font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
        >
          %
        </button>
        <button
          onClick={() => performOperation('÷')}
          className="h-9 rounded-xl font-bold text-sm bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900 transition-colors cursor-pointer"
        >
          ÷
        </button>

        {/* Baris 7, 8, 9, × */}
        <button
          onClick={() => inputDigit('7')}
          className="h-9 rounded-xl font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
        >
          7
        </button>
        <button
          onClick={() => inputDigit('8')}
          className="h-9 rounded-xl font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
        >
          8
        </button>
        <button
          onClick={() => inputDigit('9')}
          className="h-9 rounded-xl font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
        >
          9
        </button>
        <button
          onClick={() => performOperation('×')}
          className="h-9 rounded-xl font-bold text-sm bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900 transition-colors cursor-pointer"
        >
          ×
        </button>

        {/* Baris 4, 5, 6, - */}
        <button
          onClick={() => inputDigit('4')}
          className="h-9 rounded-xl font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
        >
          4
        </button>
        <button
          onClick={() => inputDigit('5')}
          className="h-9 rounded-xl font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
        >
          5
        </button>
        <button
          onClick={() => inputDigit('6')}
          className="h-9 rounded-xl font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
        >
          6
        </button>
        <button
          onClick={() => performOperation('-')}
          className="h-9 rounded-xl font-bold text-sm bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900 transition-colors cursor-pointer"
        >
          −
        </button>

        {/* Baris 1, 2, 3, + */}
        <button
          onClick={() => inputDigit('1')}
          className="h-9 rounded-xl font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
        >
          1
        </button>
        <button
          onClick={() => inputDigit('2')}
          className="h-9 rounded-xl font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
        >
          2
        </button>
        <button
          onClick={() => inputDigit('3')}
          className="h-9 rounded-xl font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
        >
          3
        </button>
        <button
          onClick={() => performOperation('+')}
          className="h-9 rounded-xl font-bold text-sm bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900 transition-colors cursor-pointer"
        >
          +
        </button>

        {/* Baris +/-, 0, ., = */}
        <button
          onClick={toggleSign}
          className="h-9 rounded-xl font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
        >
          ±
        </button>
        <button
          onClick={() => inputDigit('0')}
          className="h-9 rounded-xl font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
        >
          0
        </button>
        <button
          onClick={inputDecimal}
          className="h-9 rounded-xl font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
        >
          .
        </button>
        <button
          onClick={handleEqual}
          className="h-9 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all cursor-pointer"
        >
          =
        </button>
      </div>
    </div>
  );
};
