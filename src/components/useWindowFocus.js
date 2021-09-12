import { useState, useEffect } from 'react';

function initState() {
  return {
    focused: document && document.hasFocus(),
    visible: document && !document.hidden,
  };
}

export default function useWindowFocus() {
  const [state, setState] = useState(initState)

  useEffect(() => {
    const onFocus = () => {
      console.log("focus")
      setState(s => ({
        ...s,
        focused: true,
      }));
    };

    const onBlur = () => {
      console.log("blur")
      setState(s => ({
        ...s,
        focused: false,
      }));
    };

    const onVizChange = () => {
      console.log("visibilitychange")
      setState(s => ({
        ...s,
        visible: !document.hidden,
      }));
    };

    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);
    window.addEventListener("visibilitychange", onVizChange);

    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("visibilitychange", onVizChange);
    };
  }, [])

  return state || initState();
}

