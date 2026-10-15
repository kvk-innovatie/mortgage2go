import { useState } from "react";

import {
  VCT,
  claim,
  claimLabel,
  claimNumber,
  claimString,
  displayName,
  findCredential,
  flattenClaims,
  formatValue,
  isLeaf,
  type DisclosedResponse,
} from "./claims";

/** Dutch wording for the enumerated keurmerk answers the consult looks at. */
const ANSWER_LABELS: Record<string, string> = {
  yes: "ja",
  no: "nee",
  always: "altijd",
  mostly: "meestal",
  sometimes: "soms",
  never: "nooit",
  existing_freelancer: "bestaande zelfstandige",
  starting_freelancer: "startende zelfstandige",
  less_than_1_year: "korter dan 1 jaar",
  less_than_3_years: "1 tot 3 jaar",
  more_than_3_years: "langer dan 3 jaar",
  eur_0_39: "tot € 39 per uur",
  eur_39_50: "€ 39 tot € 50 per uur",
  eur_50_plus: "€ 50 of meer per uur",
  valid: "geldig",
  invalid: "ongeldig",
  not_provided: "niet opgegeven",
};

/** KVK legal-form codes as the EUCC carries them. Unknown codes are shown as is. */
const LEGAL_FORM_LABELS: Record<string, string> = {
  EMZ: "Eenmanszaak",
  BV: "Besloten vennootschap (bv)",
  NV: "Naamloze vennootschap (nv)",
  VOF: "Vennootschap onder firma (vof)",
  CV: "Commanditaire vennootschap (cv)",
  MTS: "Maatschap",
  STG: "Stichting",
  VER: "Vereniging",
  COOP: "Coöperatie",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Actief",
  inactive: "Inactief",
  dissolved: "Ontbonden",
  bankrupt: "Failliet",
};

/** A few SBI codes a zzp'er is likely to carry; anything else shows as "SBI <code>". */
const SBI_LABELS: Record<string, string> = {
  "62010": "Ontwikkelen, produceren en uitgeven van software",
  "62100": "Ontwikkelen, produceren en uitgeven van software",
  "62020": "Advisering op het gebied van informatietechnologie",
  "62090": "Overige dienstverlenende activiteiten op het gebied van informatietechnologie",
  "70221": "Organisatie-adviesbureaus",
  "71121": "Architecten",
  "73110": "Reclamebureaus",
  "74101": "Communicatie- en grafisch ontwerp",
  "78202": "Uitleenbureaus",
  "90030": "Scheppende kunst en documentaire schrijvers",
};

const AUTH_TYPE_LABELS: Record<string, string> = {
  sole: "zelfstandig bevoegd",
  jointly: "gezamenlijk bevoegd",
  limited: "beperkt bevoegd",
};

const VERDICT_LABELS: Record<string, string> = {
  passed: "Geslaagd",
  warning: "Waarschuwing",
  rejected: "Afgekeurd",
};

const CREDENTIAL_LABELS: Record<string, string> = {
  [VCT.LPID]: "Business Wallet Owner ID (LPID)",
  [VCT.EUCC]: "European Company Certificate (EUCC)",
  [VCT.POX]: "KVK Bevoegdheid (POX)",
  [VCT.KEURMERK]: "ZZP-keurmerk",
};

function answerLabel(value: string | undefined): string {
  if (!value) return "—";
  return ANSWER_LABELS[value] ?? value.replace(/_/g, " ");
}

function legalFormLabel(code: string | undefined): string | undefined {
  if (!code) return undefined;
  return LEGAL_FORM_LABELS[code.toUpperCase()] ?? code;
}

function statusLabel(status: string | undefined): string | undefined {
  if (!status) return undefined;
  return STATUS_LABELS[status.toLowerCase()] ?? status;
}

function activityLabel(code: string | undefined): string | undefined {
  if (!code) return undefined;
  const label = SBI_LABELS[code];
  return label ? `${label} (SBI ${code})` : /^\d{4,5}$/.test(code) ? `SBI ${code}` : code;
}

function authTypeLabel(type: string | undefined): string | undefined {
  if (!type) return undefined;
  return AUTH_TYPE_LABELS[type.toLowerCase()] ?? type;
}

function formatDate(iso: string | undefined): string | undefined {
  if (!iso) return undefined;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}

/** Whole years between an ISO date and today, or undefined when unparseable. */
function yearsSince(iso: string | undefined): number | undefined {
  if (!iso) return undefined;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return undefined;
  const now = new Date();
  let years = now.getFullYear() - date.getFullYear();
  const beforeAnniversary =
    now.getMonth() < date.getMonth() || (now.getMonth() === date.getMonth() && now.getDate() < date.getDate());
  if (beforeAnniversary) years -= 1;
  return Math.max(0, years);
}

type Tone = "ok" | "warn" | "bad" | "neutral";

interface Indicator {
  tone: Tone;
  title: string;
  detail: string;
}

/**
 * The consult summary: what an adviser would want to know before the first
 * conversation with a self-employed applicant, read straight from the four
 * attestations. Indicative only — the demo mirrors common lender practice
 * (three years of figures, a verified business, an authorised signatory), it
 * does not give advice.
 */
export function Consult({
  disclosed,
  example = false,
  onRestart,
}: {
  disclosed: DisclosedResponse;
  example?: boolean;
  onRestart: () => void;
}) {
  const [booked, setBooked] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  const lpid = findCredential(disclosed, VCT.LPID);
  const eucc = findCredential(disclosed, VCT.EUCC);
  const pox = findCredential(disclosed, VCT.POX);
  const keurmerk = findCredential(disclosed, VCT.KEURMERK);

  const legalName =
    claimString(eucc, "legal_person_name") ??
    claimString(lpid, "legal_name") ??
    claimString(pox, "legal_name") ??
    claimString(keurmerk, "legal_name") ??
    "Onbekende onderneming";
  const euid =
    claimString(lpid, "euid") ?? claimString(eucc, "euid") ?? claimString(pox, "euid") ?? claimString(keurmerk, "euid");

  const legalForm = claimString(eucc, "legal_form_type");
  const registrationDate = claimString(eucc, "registration_date");
  const yearsRegistered = yearsSince(registrationDate);
  const status = claimString(eucc, "legal_person_status");
  const activity = claimString(eucc, "legal_person_activity");
  const street = claimString(eucc, "registered_address", "thoroughfare");
  const number = claimString(eucc, "registered_address", "locator_designator");
  const postCode = claimString(eucc, "registered_address", "post_code");
  const city = claimString(eucc, "registered_address", "post_name");
  const address =
    street && city
      ? `${street}${number ? ` ${number}` : ""}, ${postCode ? `${postCode} ` : ""}${city}`
      : claimString(eucc, "registered_address", "full_address")?.replace(/;\s*/g, ", ");
  const email = claimString(eucc, "contact_point", "contact_email");
  const website = claimString(eucc, "contact_point", "contact_page");

  const euccRepresentative = Array.isArray(eucc?.attributes?.legal_representative)
    ? (eucc!.attributes!.legal_representative as Record<string, unknown>[])[0]
    : undefined;
  const euccRepName =
    euccRepresentative && isLeaf(euccRepresentative.natural_person_full_name)
      ? String(euccRepresentative.natural_person_full_name.value ?? "")
      : undefined;
  const repName = claimString(pox, "representatives_person_name") ?? (euccRepName || undefined);
  const repRole = claimString(pox, "representatives_role");
  const repAuth = claimString(pox, "representatives_authorisation_type");
  const mandateScope = claim(pox, "mandate_scope");
  const mandateDescription = claimString(pox, "mandate_description");
  const monetaryLimit = claimString(pox, "monetary_limit");
  const authorised = disclosed.representation?.authorised ?? null;

  const score = claimNumber(keurmerk, "certainty_percentage");
  const verdict = claimString(keurmerk, "verdict");
  const conclusion = claimString(keurmerk, "conclusion");
  const checksTotal = claimNumber(keurmerk, "checks_total");
  const checksPassed = claimNumber(keurmerk, "checks_passed");
  const checksFailed = claimNumber(keurmerk, "checks_failed");
  const assessedAt = claimString(keurmerk, "assessed_at");
  const attention = claim(keurmerk, "attention_items");
  const attentionItems = Array.isArray(attention) ? attention.map(String) : [];

  const years = claimString(keurmerk, "answers", "years_self_employed");
  const rate = claimString(keurmerk, "answers", "hourly_rate");
  const multipleClients = claimString(keurmerk, "answers", "multiple_clients");
  const singleClient = claimString(keurmerk, "answers", "over_70_percent_single_client");
  const earning = claimString(keurmerk, "answers", "earning_as_entrepreneur");
  const continues = claimString(keurmerk, "answers", "intends_to_continue");
  const bankAccount = claimString(keurmerk, "answers", "business_bank_account");
  const insurance = claimString(keurmerk, "answers", "business_insurance");

  const indicators: Indicator[] = [];

  if (yearsRegistered !== undefined) {
    indicators.push(
      yearsRegistered >= 3
        ? {
            tone: "ok",
            title: `${yearsRegistered} jaar ingeschreven`,
            detail: "Adviseurs rekenen meestal met drie jaarcijfers. Die periode heeft je onderneming al bereikt.",
          }
        : {
            tone: "warn",
            title: `${yearsRegistered < 1 ? "Korter dan een jaar" : `${yearsRegistered} jaar`} ingeschreven`,
            detail: "Met minder dan drie jaarcijfers vraagt een geldverstrekker vaak om een prognose. Neem die mee naar het consult.",
          },
    );
  } else if (years) {
    indicators.push(
      years === "more_than_3_years"
        ? { tone: "ok", title: "Langer dan drie jaar zelfstandig", detail: "Volgens je ZZP-keurmerk. Adviseurs rekenen meestal met drie jaarcijfers." }
        : { tone: "warn", title: `Zelfstandig: ${answerLabel(years)}`, detail: "Met minder dan drie jaarcijfers vraagt een geldverstrekker vaak om een prognose." },
    );
  }

  if (!keurmerk) {
    indicators.push({
      tone: "neutral",
      title: "Geen ZZP-keurmerk gedeeld",
      detail: "Zonder keurmerk beoordeelt de adviseur je zelfstandigheid tijdens het consult. Je kunt het keurmerk vooraf aanvragen bij ZZP Garantie.",
    });
  } else if (verdict === "passed") {
    indicators.push({
      tone: "ok",
      title: "ZZP-keurmerk: geslaagd",
      detail: `Zekerheid zelfstandigheid ${score ?? "?"}%. ${conclusion ?? ""}`.trim(),
    });
  } else if (verdict === "warning") {
    indicators.push({
      tone: "warn",
      title: "ZZP-keurmerk: waarschuwing",
      detail: `Zekerheid zelfstandigheid ${score ?? "?"}%. De aandachtspunten hieronder komen in het consult aan bod.`,
    });
  } else if (verdict === "rejected") {
    indicators.push({
      tone: "bad",
      title: "ZZP-keurmerk: afgekeurd",
      detail: `Zekerheid zelfstandigheid ${score ?? "?"}%. Een adviseur bespreekt met je of een hypotheek op basis van zelfstandig inkomen haalbaar is.`,
    });
  }

  if (pox) {
    indicators.push(
      authorised === false
        ? {
            tone: "warn",
            title: "Bevoegdheid dekt dit consult niet",
            detail: `${repName ?? "De vertegenwoordiger"} is ${authTypeLabel(repAuth) ?? "bevoegd"}, maar het mandaat noemt deze dienst niet. De adviseur vraagt dan om een aanvullende machtiging.`,
          }
        : {
            tone: authorised ? "ok" : "neutral",
            title: authorised ? "Bevoegd om namens de onderneming te handelen" : "Vertegenwoordiging gedeeld",
            detail: `${repName ?? "Onbekend"}${repRole ? `, ${repRole}` : ""}${repAuth ? `, ${authTypeLabel(repAuth)}` : ""}.`,
          },
    );
  }

  if (multipleClients || singleClient) {
    const spread = multipleClients === "yes" && singleClient !== "yes";
    indicators.push(
      spread
        ? { tone: "ok", title: "Meerdere opdrachtgevers", detail: "Je inkomen hangt niet van één opdrachtgever af. Dat weegt mee in de inkomensbeoordeling." }
        : { tone: "warn", title: "Inkomen leunt op één opdrachtgever", detail: "Geldverstrekkers kijken dan scherper naar de bestendigheid van je inkomen. Bespreek dit in het consult." },
    );
  }

  if (rate) {
    indicators.push({
      tone: rate === "eur_50_plus" ? "ok" : "neutral",
      title: `Uurtarief: ${answerLabel(rate)}`,
      detail: "Samen met je gefactureerde uren bepaalt dit de inkomensindicatie die de adviseur voorbereidt.",
    });
  }

  const credentials = disclosed.credentials ?? [];
  const missing = (Object.values(VCT) as string[]).filter((vct) => !credentials.some((c) => c.type === vct));

  return (
    <>
      {example && (
        <p className="demo-note">
          Dit is een voorbeeld met fictieve gegevens, zodat u ziet hoe het consult eruitziet nadat de vier
          attestaties zijn gedeeld. Deel uw eigen gegevens via de knop op de startpagina.
        </p>
      )}
      <section className="card consult-head">
        <div>
          <p className="eyebrow">Consult voorbereid</p>
          <h2>{legalName}</h2>
          <p className="lead">
            De gegevens hieronder komen rechtstreeks uit je NB Wallet en zijn cryptografisch geverifieerd. Een adviseur
            van Mortgage2Go gebruikt ze om je consult voor te bereiden, zodat het eerste gesprek direct over je
            hypotheek gaat.
          </p>
        </div>
        {score !== undefined && (
          <div className={`score score-${verdict ?? "neutral"}`} role="img" aria-label={`Zekerheid zelfstandigheid ${score} procent`}>
            <svg viewBox="0 0 120 120" width="120" height="120" aria-hidden="true">
              <circle cx="60" cy="60" r="52" className="score-track" />
              <circle
                cx="60"
                cy="60"
                r="52"
                className="score-arc"
                strokeDasharray={`${(Math.min(100, Math.max(0, score)) / 100) * 2 * Math.PI * 52} ${2 * Math.PI * 52}`}
              />
            </svg>
            <div className="score-value">
              <strong>{score}</strong>
              <span>/ 100</span>
            </div>
            <span className="score-label">{VERDICT_LABELS[verdict ?? ""] ?? "Zelfstandigheid"}</span>
          </div>
        )}
      </section>

      {indicators.length > 0 && (
        <section className="card">
          <h3 className="section-title">Indicatie voor je consult</h3>
          <p className="lead small">
            Een eerste lezing van je gegevens, geen advies. De adviseur neemt deze punten met je door.
          </p>
          <ul className="indicators">
            {indicators.map((item) => (
              <li key={item.title} className={`indicator indicator-${item.tone}`}>
                <span className="indicator-mark" aria-hidden="true" />
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="summary-grid">
        <section className="card summary">
          <h3 className="section-title">Onderneming</h3>
          <p className="source">uit EUCC en LPID</p>
          <dl className="facts">
            <div><dt>Naam</dt><dd>{legalName}</dd></div>
            <div><dt>EUID</dt><dd className="mono">{euid ?? "—"}</dd></div>
            <div><dt>Rechtsvorm</dt><dd>{legalFormLabel(legalForm) ?? "—"}</dd></div>
            <div><dt>Ingeschreven sinds</dt><dd>{formatDate(registrationDate) ?? "—"}</dd></div>
            <div><dt>Status</dt><dd>{statusLabel(status) ?? "—"}</dd></div>
            <div><dt>Activiteit</dt><dd>{activityLabel(activity) ?? "—"}</dd></div>
            <div><dt>Adres</dt><dd>{address ?? "—"}</dd></div>
            <div><dt>E-mail</dt><dd>{email ?? "—"}</dd></div>
            <div><dt>Website</dt><dd>{website ?? "—"}</dd></div>
          </dl>
        </section>

        <section className="card summary">
          <h3 className="section-title">Vertegenwoordiging</h3>
          <p className="source">uit KVK Bevoegdheid (POX)</p>
          {pox ? (
            <dl className="facts">
              <div><dt>Naam</dt><dd>{repName ?? "—"}</dd></div>
              <div><dt>Functie</dt><dd>{repRole ?? "—"}</dd></div>
              <div><dt>Bevoegdheid</dt><dd>{authTypeLabel(repAuth) ?? "—"}</dd></div>
              {mandateScope !== undefined && <div><dt>Mandaat</dt><dd>{formatValue(mandateScope)}</dd></div>}
              <div><dt>Machtiging voor</dt><dd>{mandateDescription ?? "—"}</dd></div>
              <div><dt>Financieel limiet</dt><dd>{monetaryLimit ?? "—"}</dd></div>
              <div>
                <dt>Bevoegd voor deze dienst</dt>
                <dd>{authorised === null ? "niet vastgesteld" : authorised ? "ja" : "nee"}</dd>
              </div>
            </dl>
          ) : (
            <p className="missing">Niet gedeeld.</p>
          )}
        </section>

        <section className="card summary">
          <h3 className="section-title">ZZP-keurmerk</h3>
          <p className="source">uit het keurmerk van ZZP Garantie</p>
          {keurmerk ? (
            <>
              <dl className="facts">
                <div><dt>Uitslag</dt><dd><span className={`badge badge-${verdict ?? "neutral"}`}>{VERDICT_LABELS[verdict ?? ""] ?? verdict ?? "—"}</span></dd></div>
                <div><dt>Conclusie</dt><dd>{conclusion ?? "—"}</dd></div>
                <div>
                  <dt>Controles</dt>
                  <dd>
                    {checksPassed ?? "?"} van {checksTotal ?? "?"} geslaagd
                    {checksFailed ? `, ${checksFailed} afgekeurd` : ""}
                  </dd>
                </div>
                <div><dt>Beoordeeld op</dt><dd>{formatDate(assessedAt) ?? "—"}</dd></div>
                <div><dt>Situatie</dt><dd>{answerLabel(claimString(keurmerk, "answers", "situation"))}</dd></div>
                <div><dt>Zelfstandig</dt><dd>{answerLabel(years)}</dd></div>
                <div><dt>Verdient als ondernemer</dt><dd>{answerLabel(earning)}</dd></div>
                <div><dt>Gaat door</dt><dd>{answerLabel(continues)}</dd></div>
                <div><dt>Zakelijke rekening</dt><dd>{answerLabel(bankAccount)}</dd></div>
                <div><dt>Zakelijk verzekerd</dt><dd>{answerLabel(insurance)}</dd></div>
              </dl>
              {attentionItems.length > 0 && (
                <div className="attention">
                  <strong>Aandachtspunten</strong>
                  <ul>
                    {attentionItems.map((item) => {
                      const label = claimLabel(keurmerk, "answers", item)?.replace(/^\d+\.\s*/, "") ?? item.replace(/_/g, " ");
                      const answer = claimString(keurmerk, "answers", item);
                      return (
                        <li key={item}>
                          {label}
                          {answer ? <span className="attention-answer"> — {answerLabel(answer)}</span> : null}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <p className="missing">
              Niet gedeeld. Vraag het keurmerk aan bij{" "}
              <a href="https://zzpgarantie.mayersoftwaredevelopment.nl" target="_blank" rel="noopener noreferrer">
                ZZP Garantie
              </a>{" "}
              en zet het in je NB Wallet.
            </p>
          )}
        </section>
      </div>

      <section className="card book">
        {booked ? (
          <>
            <p className="eyebrow">Aanvraag ontvangen</p>
            <h3>Een adviseur neemt contact met je op</h3>
            <p className="lead">
              {email
                ? `We mailen binnen één werkdag een voorstel voor je consult naar ${email}.`
                : "We nemen binnen één werkdag contact met je op voor een consult."}{" "}
              Dit is een demo: er wordt niets verstuurd en je gegevens worden niet bewaard.
            </p>
          </>
        ) : (
          <>
            <h3>Plan je hypotheekconsult</h3>
            <p className="lead">
              Je gegevens staan klaar. Plan een gratis en vrijblijvend consult met een hypotheekadviseur van
              Mortgage2Go. Na het consult weet je wat je als zzp'er kunt lenen en vraag je je Pre-Checked Hypotheek aan.
            </p>
            <ul className="checks">
              <li>100% gratis intake</li>
              <li>Geheel vrijblijvend</li>
              <li>Certificaat binnen 24 uur na akkoord</li>
            </ul>
          </>
        )}
        <div className="actions">
          {!booked && (
            <button className="primary" onClick={() => setBooked(true)}>
              Plan mijn consult ›
            </button>
          )}
          <button className="secondary" onClick={onRestart}>
            Opnieuw beginnen
          </button>
        </div>
      </section>

      <section className="card">
        <div className="toggle-row">
          <h3 className="section-title">Alle gedeelde gegevens</h3>
          <div className="actions">
            <button className="secondary" onClick={() => setShowAll((v) => !v)}>
              {showAll ? "Verberg" : "Toon"} gegevens
            </button>
            <button className="secondary" onClick={() => setShowRaw((v) => !v)}>
              {showRaw ? "Verberg" : "Toon"} onbewerkte respons
            </button>
          </div>
        </div>

        {showAll && (
          <>
            {credentials.map((credential, index) => (
              <div className="credential" key={`${credential.type}-${index}`}>
                <h4 className="credential-name">
                  {CREDENTIAL_LABELS[credential.type] ?? displayName(credential.name, credential.type)}
                  <code>{credential.type}</code>
                </h4>
                <dl className="attributes">
                  {flattenClaims(credential.attributes ?? {}).map(([path, value]) => (
                    <div key={path.join(" › ")}>
                      <dt>{path.join(" › ")}</dt>
                      <dd>{formatValue(value)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
            {credentials.length === 0 && <p className="missing">Er zijn geen gegevens gedeeld.</p>}
            {missing.length > 0 && (
              <p className="missing">
                Niet gedeeld: {missing.map((vct) => CREDENTIAL_LABELS[vct] ?? vct).join(", ")}.
              </p>
            )}
          </>
        )}

        {showRaw && <pre className="raw">{JSON.stringify(disclosed, null, 2)}</pre>}
      </section>
    </>
  );
}
