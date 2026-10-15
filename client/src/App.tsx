import { useCallback, useState } from "react";
import WalletConnectButton from "wallet-connect-button-react";

import { AccountMenu } from "./AccountMenu";
import { Consult } from "./Consult";
import { EXAMPLE_DISCLOSURE } from "./example";
import { IntegrationExample } from "./IntegrationExample";
import { TABS, useRoute } from "./useRoute";
import { VCT, claimString, findClaim, findCredential, type DisclosedResponse } from "./claims";

/**
 * Identifies Mortgage2Go to NB Wallet Connect, which maps it to a
 * verification_server usecase and the attestations and claims to request. No
 * API key here on purpose — the page calls its own backend, which attaches the
 * key server-side.
 */
const SERVICE_ID = import.meta.env.VITE_SERVICE_ID || "EH_A530D4346A7ACD00";

const REQUESTED = [
  {
    vct: VCT.EUCC,
    name: "European Company Certificate",
    short: "EUCC",
    why: "Rechtsvorm, inschrijfdatum, status en adres van je onderneming, zoals geregistreerd bij KVK.",
  },
  {
    vct: VCT.LPID,
    name: "Business Wallet Owner ID",
    short: "LPID",
    why: "De naam en het EUID van de onderneming die eigenaar is van je wallet.",
  },
  {
    vct: VCT.POX,
    name: "KVK Bevoegdheid",
    short: "POX",
    why: "Wie jij bent en of je bevoegd bent om namens de onderneming een hypotheekgesprek te voeren.",
  },
  {
    vct: VCT.KEURMERK,
    name: "ZZP-keurmerk",
    short: "ZZP Garantie",
    why: "De beoordeling van je zelfstandigheid: score, uitslag en aandachtspunten uit de check van ZZP Garantie.",
  },
];

const STEPS = [
  { title: "Deel je gegevens", text: "Eén keer scannen met je NB Wallet. Geen uittreksels, geen overtypen." },
  { title: "Wij bereiden het consult voor", text: "Je bedrijfsgegevens en je ZZP-keurmerk komen geverifieerd bij de adviseur." },
  { title: "Consult met de adviseur", text: "Gratis en vrijblijvend. Je hoort wat je als zzp'er kunt lenen." },
  { title: "Pre-Checked Hypotheek", text: "Na akkoord van de bank ontvang je je certificaat binnen 24 uur." },
];

export default function App() {
  // `/hypotheekconsult?voorbeeld` opens straight on the example consult, so the
  // filled-in page is linkable (and screenshot-able) without a wallet.
  const startWithExample = new URLSearchParams(window.location.search).has("voorbeeld");
  const [disclosed, setDisclosed] = useState<DisclosedResponse | null>(startWithExample ? EXAMPLE_DISCLOSURE : null);
  const [isExample, setIsExample] = useState(startWithExample);
  const [path, navigate] = useRoute();

  // Identity-stable so the button's effect doesn't re-run on every render.
  const handleSuccess = useCallback((response: Record<string, unknown> | undefined) => {
    setIsExample(false);
    setDisclosed((response ?? {}) as DisclosedResponse);
    window.scrollTo({ top: 0 });
  }, []);

  const showExample = () => {
    setIsExample(true);
    setDisclosed(EXAMPLE_DISCLOSURE);
    window.scrollTo({ top: 0 });
  };

  const reset = () => {
    setDisclosed(null);
    setIsExample(false);
  };

  const legalName =
    claimString(findCredential(disclosed, VCT.EUCC), "legal_person_name") ??
    findClaim(disclosed, "legal_name") ??
    "Onbekende onderneming";

  return (
    <main className="page">
      <header className="header">
        <a
          className="brand"
          href="/hypotheekconsult"
          onClick={(e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
            e.preventDefault();
            navigate("/hypotheekconsult");
          }}
        >
          <img src="/logo.svg" alt="Mortgage2Go" className="brand-logo" />
          <span className="brand-tag">Hypotheekconsult voor zzp'ers</span>
        </a>

        <nav className="tabs" aria-label="Pagina's">
          {TABS.map((tab) => (
            <a
              key={tab.path}
              href={tab.path}
              className={`tab${path === tab.path ? " active" : ""}`}
              aria-current={path === tab.path ? "page" : undefined}
              onClick={(e) => {
                // Keep it a real link for middle-click and copy-link, but stay in
                // the SPA for a plain left click.
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                e.preventDefault();
                navigate(tab.path);
              }}
            >
              {tab.label}
            </a>
          ))}
        </nav>

        {disclosed && (
          <AccountMenu
            legalName={legalName}
            euid={findClaim(disclosed, "euid")}
            representative={claimString(findCredential(disclosed, VCT.POX), "representatives_person_name")}
            onLogout={reset}
          />
        )}
      </header>

      {path === "/voor-ontwikkelaars" ? (
        <>
          <section className="card">
            <h2>Voor ontwikkelaars</h2>
            <p className="lead">
              Deze demo is een gewone <em>relying party</em> van het nb-wallet-ecosysteem: een React-pagina met de{" "}
              <code>wallet-connect-button-react</code>-knop en een backend van één handler die de API-sleutel van
              NB Wallet Connect toevoegt. De vier attestaties worden in één disclosure-sessie opgevraagd; de wallet laat
              de zzp'er zien wat Mortgage2Go vraagt en waarom.
            </p>
          </section>
          <IntegrationExample />
        </>
      ) : path === "/hoe-het-werkt" ? (
        <>
          <section className="card">
            <h2>Hoe het werkt</h2>
            <p className="lead">
              Als zzp'er lever je voor een hypotheek normaal gesproken een stapel bewijsstukken aan: een KVK-uittreksel,
              jaarcijfers, een toelichting op je opdrachtgevers. Met de NB Wallet deel je de gegevens die daar al
              geverifieerd in staan, en bereidt Mortgage2Go je consult voor voordat het gesprek begint.
            </p>
            <ol className="steps">
              {STEPS.map((step, i) => (
                <li key={step.title}>
                  <span className="step-number" aria-hidden="true">{i + 1}</span>
                  <div>
                    <strong>{step.title}</strong>
                    <p>{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="card">
            <h3 className="section-title">Wat we uit je wallet vragen</h3>
            <div className="requested-grid">
              {REQUESTED.map((item) => (
                <article className="requested-item" key={item.vct}>
                  <span className="pill">{item.short}</span>
                  <strong>{item.name}</strong>
                  <p>{item.why}</p>
                  <code>{item.vct}</code>
                </article>
              ))}
            </div>
            <p className="lead small">
              Je deelt alleen de claims die de adviseur nodig heeft; de wallet toont ze voordat je akkoord geeft.
              Mortgage2Go bewaart de gegevens niet na het consult.
            </p>
          </section>
        </>
      ) : disclosed ? (
        <Consult disclosed={disclosed} example={isExample} onRestart={reset} />
      ) : (
        <>
          <section className="hero">
            <div className="hero-copy">
              <p className="eyebrow light">Pre-Checked Hypotheek voor zzp'ers</p>
              <h1>Je hypotheekconsult, zonder stapels papier.</h1>
              <p className="hero-lead">
                Deel je bedrijfsgegevens en je ZZP-keurmerk rechtstreeks vanuit je NB Wallet. Wij bereiden je consult
                voor, jij hoeft niets over te typen.
              </p>
              <ul className="checks light">
                <li>100% gratis intake</li>
                <li>Geheel vrijblijvend</li>
                <li>Gegevens cryptografisch geverifieerd</li>
              </ul>
              <div className="button-row">
                <WalletConnectButton
                  serviceId={SERVICE_ID}
                  nbwallet
                  label="Deel gegevens met je NB Wallet"
                  lang="nl"
                  onSuccess={handleSuccess}
                />
                <button type="button" className="ghost" onClick={showExample}>
                  Bekijk voorbeeld
                </button>
              </div>
            </div>
            <div className="hero-art" aria-hidden="true">
              <img src="/logo-symbol.svg" alt="" />
            </div>
          </section>

          <p className="demo-note">
            Let op: dit is een demo van een tool die Mortgage2Go in ontwikkeling heeft. Er wordt geen consult
            ingepland en er worden geen gegevens bewaard. De knop vraagt wel echt de attestaties uit je NB Wallet op.
          </p>

          <section className="card">
            <h2>Wat we uit je wallet vragen</h2>
            <p className="lead">
              Vier attestaties, één keer scannen. De wallet laat precies zien welke gegevens je deelt voordat je
              akkoord geeft.
            </p>
            <div className="requested-grid">
              {REQUESTED.map((item) => (
                <article className="requested-item" key={item.vct}>
                  <span className="pill">{item.short}</span>
                  <strong>{item.name}</strong>
                  <p>{item.why}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="card">
            <h2>Zo werkt het</h2>
            <ol className="steps">
              {STEPS.map((step, i) => (
                <li key={step.title}>
                  <span className="step-number" aria-hidden="true">{i + 1}</span>
                  <div>
                    <strong>{step.title}</strong>
                    <p>{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </>
      )}

      <footer className="footer">
        <div className="footer-brand">
          <img src="/logo-diap.svg" alt="Mortgage2Go" />
          <span>
            Demo relying party · {new Date().getFullYear()} © Mortgage2Go, onderdeel van Nobel Hypotheken
          </span>
        </div>
        <div className="footer-links">
          <a href="https://mortgage2go.com" target="_blank" rel="noopener noreferrer">
            mortgage2go.com
          </a>
          <a href="https://nbwallet.org" target="_blank" rel="noopener noreferrer">
            NB Wallet
          </a>
          <a href="https://zzpgarantie.mayersoftwaredevelopment.nl" target="_blank" rel="noopener noreferrer">
            ZZP Garantie
          </a>
        </div>
      </footer>
    </main>
  );
}
