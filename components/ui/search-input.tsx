import { Search, X } from "lucide-react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder: string;
  clearable?: boolean;
};

export function SearchInput({
  value,
  onChange,
  label,
  placeholder,
  clearable = true,
}: Props) {
  return (
    <div className="search-input">
      <Search size={18} />
      <input
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {clearable && value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange("")}
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}
