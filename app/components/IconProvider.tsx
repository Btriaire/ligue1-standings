"use client";
import { IconContext } from "@phosphor-icons/react";

/** Sets Phosphor icon defaults globally: light weight, inherited color/size */
export default function IconProvider({ children }: { children: React.ReactNode }) {
  return (
    <IconContext.Provider value={{ weight: "light" }}>
      {children}
    </IconContext.Provider>
  );
}
