export interface ToastProps {
  message: string | null;
}

export function Toast({ message }: ToastProps) {
  return (
    <div
      className={`papan-toast ${message ? 'on' : ''}`}
      role="status"
      aria-live="polite"
    >
      {message || ''}
    </div>
  );
}

