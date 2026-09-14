"use client";

import { useEffect, useRef, useState } from "react";

export function Toast() {
  const [text, setText] = useState("");
  const [show, setShow] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onToast = (e: Event) => {
      setText((e as CustomEvent<{ message: string }>).detail.message);
      setShow(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setShow(false), 2200);
    };
    window.addEventListener("hlp:toast", onToast);
    return () => window.removeEventListener("hlp:toast", onToast);
  }, []);

  return (
    <div className={`toast${show ? " show" : ""}`} role="status" aria-live="polite">
      {text}
    </div>
  );
}
