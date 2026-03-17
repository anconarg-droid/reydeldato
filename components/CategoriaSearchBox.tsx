"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  actionBase: string;
  initialQ?: string;
  comuna?: string;
  subcategoria?: string;
};

export default function CategoriaSearchBox({
  actionBase,
  initialQ = "",
  comuna = "",
  subcategoria = "",
}: Props) {
  const router = useRouter();
  const [value, setValue] = useState(initialQ);
  const firstRender = useRef(true);

  useEffect(() => {
    setValue(initialQ || "");
  }, [initialQ]);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    const timer = setTimeout(() => {
      const params = new URLSearchParams();

      if (value.trim()) params.set("q", value.trim());
      if (comuna.trim()) params.set("comuna", comuna.trim());
      if (subcategoria.trim()) params.set("subcategoria", subcategoria.trim());

      const url = params.toString()
        ? `${actionBase}?${params.toString()}`
        : actionBase;

      router.replace(url);
    }, 450);

    return () => clearTimeout(timer);
  }, [value, comuna, subcategoria, actionBase, router]);

  return (
    <input
      id="q"
      name="q"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder="ej: gas, vidrio, calefont, portón..."
      style={{
        width: "100%",
        height: 52,
        borderRadius: 14,
        border: "1px solid #d1d5db",
        padding: "0 16px",
        fontSize: 15,
        background: "#fff",
        color: "#111827",
      }}
    />
  );
}