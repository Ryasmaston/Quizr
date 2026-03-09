import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/**
 * A password input with a toggle button to show/hide the password.
 * Accepts all standard input props (value, onChange, placeholder, disabled, minLength, etc.)
 * plus an optional `inputClassName` to override the input's class.
 *
 * When `minLength` and `value` are provided, a character counter is shown
 * to the left of the eye icon.
 */
export function PasswordInput({ inputClassName, minLength, value, ...props }) {
  const [show, setShow] = useState(false);

  const defaultClass =
    "w-full px-4 py-3 pr-20 rounded-xl border border-slate-200/80 bg-white/70 text-slate-700 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-slate-300/70";

  const len = (value ?? "").length;
  const showCounter = typeof minLength === "number" && typeof value === "string";
  const isMet = len >= (minLength || 0);

  return (
    <div className="relative">
      <input
        {...props}
        value={value}
        minLength={minLength}
        type={show ? "text" : "password"}
        className={inputClassName ?? defaultClass}
      />
      <div className="absolute inset-y-0 right-0 flex items-center">
        {showCounter && len > 0 && (
          <span
            className={`text-xs tabular-nums select-none transition-colors ${
              isMet
                ? "text-emerald-500"
                : "text-slate-400"
            }`}
          >
            {len}
          </span>
        )}
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          tabIndex={-1}
          aria-label={show ? "Hide password" : "Show password"}
          className="flex items-center px-3 text-slate-400 hover:text-slate-600 transition-colors"
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}
