"use client";

import { useState } from "react";

export default function StringListEditor({
  label,
  hint,
  placeholder,
  items,
  onChange,
}: {
  label: string;
  hint?: string;
  placeholder?: string;
  items: string[];
  onChange: (items: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const value = draft.trim();
    if (!value) return;
    onChange([...items, value]);
    setDraft("");
  }

  return (
    <div className="field">
      <label>{label}</label>
      {hint && <span className="hint">{hint}</span>}
      {items.length > 0 && (
        <ul className="list-plain">
          {items.map((item, i) => (
            <li key={`${item}-${i}`}>
              <span>{item}</span>
              <button
                type="button"
                className="link-btn"
                onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="btn-row">
        <input
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <button type="button" className="btn" style={{ width: "auto" }} onClick={add}>
          Add
        </button>
      </div>
    </div>
  );
}
