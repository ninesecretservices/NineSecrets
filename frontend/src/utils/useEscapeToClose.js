import { useEffect } from 'react';

// Lets any modal/dialog close on Escape, so keyboard users aren't forced to
// reach for the mouse to click X / Cancel / the backdrop.
export default function useEscapeToClose(isOpen, onClose) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);
}
