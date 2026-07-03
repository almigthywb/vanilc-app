import * as React from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type Country = {
  code: string;
  dial: string;
  flag: string;
  name: string;
};

export const COUNTRY_CODES: Country[] = [
  { code: "AO", dial: "+244", flag: "🇦🇴", name: "Angola" },
  { code: "PT", dial: "+351", flag: "🇵🇹", name: "Portugal" },
  { code: "BR", dial: "+55", flag: "🇧🇷", name: "Brasil" },
  { code: "MZ", dial: "+258", flag: "🇲🇿", name: "Moçambique" },
  { code: "CV", dial: "+238", flag: "🇨🇻", name: "Cabo Verde" },
  { code: "ST", dial: "+239", flag: "🇸🇹", name: "São Tomé e Príncipe" },
  { code: "GW", dial: "+245", flag: "🇬🇼", name: "Guiné-Bissau" },
  { code: "ZA", dial: "+27", flag: "🇿🇦", name: "África do Sul" },
  { code: "NA", dial: "+264", flag: "🇳🇦", name: "Namíbia" },
  { code: "CD", dial: "+243", flag: "🇨🇩", name: "RD Congo" },
  { code: "CG", dial: "+242", flag: "🇨🇬", name: "Congo" },
  { code: "US", dial: "+1", flag: "🇺🇸", name: "Estados Unidos" },
  { code: "GB", dial: "+44", flag: "🇬🇧", name: "Reino Unido" },
  { code: "FR", dial: "+33", flag: "🇫🇷", name: "França" },
  { code: "ES", dial: "+34", flag: "🇪🇸", name: "Espanha" },
];

interface PhoneInputProps {
  dialCode: string;
  onDialCodeChange: (dial: string) => void;
  phone: string;
  onPhoneChange: (phone: string) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
}

export function PhoneInput({
  dialCode,
  onDialCodeChange,
  phone,
  onPhoneChange,
  error,
  required,
  placeholder = "123456789",
}: PhoneInputProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [focused, setFocused] = React.useState(false);
  const selected =
    COUNTRY_CODES.find((c) => c.dial === dialCode) ?? COUNTRY_CODES[0];

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRY_CODES;
    return COUNTRY_CODES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dial.includes(q) ||
        c.code.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <div className="w-full">
      <div
        className={cn(
          "flex h-12 items-stretch overflow-hidden rounded-xl border bg-card transition-all",
          focused || open
            ? "border-primary shadow-[0_0_0_4px_rgba(0,0,0,0.04)] ring-2 ring-primary/20"
            : error
              ? "border-destructive/60"
              : "border-border hover:border-muted-foreground/40",
        )}
      >
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Selecionar código do país"
              className="flex w-[104px] shrink-0 items-center justify-center gap-1.5 border-r border-border/70 bg-transparent px-2.5 text-sm font-medium outline-none transition hover:bg-muted/60 focus-visible:bg-muted/60"
            >
              <span className="text-base leading-none">{selected.flag}</span>
              <span className="tabular-nums">{selected.dial}</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            sideOffset={8}
            className="w-[300px] p-0"
            onOpenAutoFocus={(e) => {
              e.preventDefault();
            }}
          >
            <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Pesquisar país..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <ul className="max-h-64 overflow-y-auto py-1">
              {filtered.length === 0 && (
                <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                  Nenhum país encontrado
                </li>
              )}
              {filtered.map((c) => {
                const active = c.dial === dialCode;
                return (
                  <li key={c.code}>
                    <button
                      type="button"
                      onClick={() => {
                        onDialCodeChange(c.dial);
                        setOpen(false);
                        setQuery("");
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition hover:bg-muted",
                        active && "bg-muted/60",
                      )}
                    >
                      <span className="text-base leading-none">{c.flag}</span>
                      <span className="flex-1 truncate">{c.name}</span>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {c.dial}
                      </span>
                      {active && <Check className="h-4 w-4 text-primary" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </PopoverContent>
        </Popover>

        <input
          required={required}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          value={phone}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => onPhoneChange(e.target.value.replace(/[^\d]/g, ""))}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground/60"
        />
      </div>
      {error && (
        <p className="mt-1.5 text-xs font-medium text-destructive">{error}</p>
      )}
    </div>
  );
}

export function isValidPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 6 && digits.length <= 15;
}
