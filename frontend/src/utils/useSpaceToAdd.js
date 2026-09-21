import { useEffect } from 'react';

// Lets Space open the "Add" modal from anywhere on the page, not just when
// the button itself has focus. Skipped while focus is in a text input/
// textarea/select/contenteditable (so typing a space, and the browser's
// native page-scroll-on-space, aren't hijacked), and skipped while a modal
// is already open (via the `disabled` flag).
export default function useSpaceToAdd(onOpen, disabled = false) {
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.code !== 'Space' || disabled) return;
      const el = document.activeElement;
      const tag = el?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el?.isContentEditable) return;
      e.preventDefault();
      onOpen();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onOpen, disabled]);
}
