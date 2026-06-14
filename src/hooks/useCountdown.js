import { useRef, useState, useCallback, useEffect } from 'react';

/** Countdown timer — stable interval, no effect dependency flicker. */
export function useCountdown() {
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef(null);

  const clear = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback((duration) => {
    clear();
    setSeconds(duration);
    intervalRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clear();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, [clear]);

  useEffect(() => () => clear(), [clear]);

  return { seconds, running: seconds > 0, start, clear };
}
