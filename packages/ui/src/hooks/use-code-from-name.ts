'use client';

import { useCallback, useRef, useState } from 'react';
import { suggestCode } from '@marketlum/shared';

/**
 * Binds `code` to a slugified `name`, but only until the user types in `code`.
 * Once the user edits `code` manually, auto-sync stops for the rest of the form session.
 */
export function useCodeFromName(initialCode = '') {
  const [code, setCodeState] = useState(initialCode);
  const syncedRef = useRef(initialCode === '');

  const onNameChange = useCallback((name: string) => {
    if (syncedRef.current) {
      setCodeState(suggestCode(name));
    }
  }, []);

  const onCodeChange = useCallback((nextCode: string) => {
    syncedRef.current = false;
    setCodeState(nextCode);
  }, []);

  const reset = useCallback((nextCode = '') => {
    syncedRef.current = nextCode === '';
    setCodeState(nextCode);
  }, []);

  return { code, onNameChange, onCodeChange, reset };
}
