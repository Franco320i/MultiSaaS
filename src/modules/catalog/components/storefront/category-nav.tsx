"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Barra de categorías del catálogo: fija arriba, con desplazamiento horizontal.
 * Marca la sección que se está viendo y la mantiene visible en la barra.
 */
export function CategoryNav({ items }: { items: { id: string; label: string }[] }) {
  const [active, setActive] = useState(items[0]?.id);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const sections = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );
    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  }, [items]);

  useEffect(() => {
    const link = listRef.current?.querySelector<HTMLElement>(`[data-id="${active}"]`);
    link?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [active]);

  if (items.length < 2) return null;

  return (
    <nav aria-label="Categorías" className="sticky top-0 z-10 border-b border-line bg-background/95 backdrop-blur">
      <ul
        ref={listRef}
        className="mx-auto flex max-w-2xl gap-6 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item) => {
          const isActive = item.id === active;
          return (
            <li key={item.id} className="shrink-0">
              <a
                href={`#${item.id}`}
                data-id={item.id}
                aria-current={isActive ? "true" : undefined}
                className={`block whitespace-nowrap border-b-2 py-3 text-[15px] transition-colors ${
                  isActive ? "border-brand font-semibold text-foreground" : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                {item.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
