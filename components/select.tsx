"use client";

import { Check, ChevronDown } from "lucide-react";
import { useCallback, useId, useRef, useState } from "react";
import { useDismiss } from "@/lib/hooks/use-dismiss";

export type SelectOption = { value: string; label: string; disabled?: boolean };

type Props = {
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  name?: string;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
};

export function Select({
  options,
  value,
  defaultValue = "",
  onChange,
  name,
  placeholder = "Select",
  ariaLabel,
  className = "",
  disabled,
}: Props) {
  const [inner, setInner] = useState(defaultValue);
  const current = value ?? inner;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const listId = useId();

  const selectedIndex = options.findIndex((o) => o.value === current);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  const closeMenu = useCallback(() => setOpen(false), []);
  useDismiss(root, open, closeMenu);

  function openMenu() {
    if (disabled) return;
    setActive(Math.max(selectedIndex, 0));
    setOpen(true);
  }

  function choose(next: string) {
    if (options.find((o) => o.value === next)?.disabled) return;
    if (value === undefined) setInner(next);
    onChange?.(next);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      let next = active;
      do next = Math.min(next + 1, options.length - 1);
      while (options[next]?.disabled && next < options.length - 1);
      setActive(next);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      let next = active;
      do next = Math.max(next - 1, 0);
      while (options[next]?.disabled && next > 0);
      setActive(next);
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(options.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (options[active]) choose(options[active].value);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <div
      ref={root}
      className={`select ${open ? "open" : ""} ${className}`.trim()}
    >
      {name && <input type="hidden" name={name} value={current} />}
      <button
        type="button"
        className="select-trigger"
        role="combobox"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
      >
        <span className={selected ? "" : "select-placeholder"}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={16} />
      </button>
      {open && (
        <ul className="select-menu" id={listId} role="listbox">
          {options.map((o, i) => (
            <li
              key={o.value}
              role="option"
              aria-selected={o.value === current}
              aria-disabled={o.disabled}
              className={`${i === active ? "active" : ""} ${
                o.value === current ? "selected" : ""
              } ${o.disabled ? "option-disabled" : ""}`.trim()}
              onMouseEnter={() => !o.disabled && setActive(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.preventDefault();
                choose(o.value);
              }}
            >
              <span>{o.label}</span>
              {o.value === current && <Check size={14} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
