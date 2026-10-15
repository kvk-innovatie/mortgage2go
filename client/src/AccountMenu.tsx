import { useEffect, useRef, useState } from "react";

/**
 * Header account block for a logged-in company, after the nb-wallet-connect
 * component of the same name: only the company name is shown, and clicking it
 * unfolds the identity taken from the disclosed attestations plus the log-out
 * action.
 */
export function AccountMenu({
  legalName,
  euid,
  representative,
  onLogout,
}: {
  legalName: string;
  euid?: string;
  representative?: string;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="account" ref={ref}>
      <button
        type="button"
        className="account-button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={legalName}
      >
        <span className="account-avatar" aria-hidden="true">
          {legalName.trim().charAt(0).toUpperCase()}
        </span>
        <span className="account-name">{legalName}</span>
        <svg
          className={`account-chevron${open ? " open" : ""}`}
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="account-panel" role="dialog">
          <dl>
            <div>
              <dt>Onderneming</dt>
              <dd>{legalName}</dd>
            </div>
            {euid && (
              <div>
                <dt>EUID</dt>
                <dd className="mono">{euid}</dd>
              </div>
            )}
            {representative && (
              <div>
                <dt>Vertegenwoordiger</dt>
                <dd>{representative}</dd>
              </div>
            )}
          </dl>
          <button
            type="button"
            className="secondary account-logout"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            Uitloggen
          </button>
        </div>
      )}
    </div>
  );
}
