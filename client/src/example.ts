import { VCT, type DisclosedResponse } from "./claims";

/**
 * A fictitious disclosure, for the "Bekijk voorbeeld" action on the hero: what
 * the consult looks like once all four attestations have been shared, for a
 * visitor whose wallet does not hold them (yet). The keurmerk values are the
 * example values of the credential type in nb-wallet-connect; the company and
 * representative are made up.
 */
const nl = (label: string) => ({ "nl-NL": label });

const leaf = (label: string, value: unknown) => ({ name: nl(label), value });

export const EXAMPLE_DISCLOSURE: DisclosedResponse = {
  credentials: [
    {
      type: VCT.LPID,
      name: { "en-US": "Business Wallet Owner ID", "nl-NL": "Business Wallet Owner ID" },
      attributes: {
        euid: leaf("EUID", "NLNHR.12345678"),
        legal_name: leaf("Naam van de organisatie", "Voorbeeld Freelance"),
      },
    },
    {
      type: VCT.EUCC,
      name: { "en-US": "European Company Certificate", "nl-NL": "European Company Certificate" },
      attributes: {
        legal_person_name: leaf("Naam rechtspersoon", "Voorbeeld Freelance"),
        euid: leaf("EUID", "NLNHR.12345678"),
        legal_form_type: leaf("Rechtsvorm", "EMZ"),
        registration_member_state: leaf("Lidstaat van registratie", "NL"),
        registered_address: {
          full_address: leaf("Volledig adres", "Keizersgracht 123; 1015 CJ; Amsterdam; NL"),
          thoroughfare: leaf("Straat", "Keizersgracht"),
          locator_designator: leaf("Huisnummer", "123"),
          post_code: leaf("Postcode", "1015 CJ"),
          post_name: leaf("Plaats", "Amsterdam"),
        },
        registration_date: leaf("Registratiedatum", "2019-03-11"),
        legal_person_status: leaf("Status", "active"),
        legal_person_activity: leaf("Activiteit", "62020"),
        contact_point: {
          contact_email: leaf("E-mail", "info@voorbeeldfreelance.nl"),
          contact_page: leaf("Website", "https://voorbeeldfreelance.nl"),
        },
      },
    },
    {
      type: VCT.POX,
      name: { "en-US": "Power of Representation", "nl-NL": "KVK Bevoegdheid" },
      attributes: {
        legal_name: leaf("Naam onderneming", "Voorbeeld Freelance"),
        euid: leaf("EUID", "NLNHR.12345678"),
        representatives_person_name: leaf("Naam gemachtigde", "Sam de Vries"),
        representatives_role: leaf("Functie", "Eigenaar"),
        representatives_authorisation_type: leaf("Type bevoegdheid", "sole"),
        mandate_description: leaf("Machtiging voor", "Alle rechtshandelingen namens de onderneming"),
        monetary_limit: leaf("Financieel limiet", "Onbeperkt"),
      },
    },
    {
      type: VCT.KEURMERK,
      name: { "en-US": "ZZP Quality Mark", "nl-NL": "Keurmerk voor zzp'ers" },
      attributes: {
        legal_name: leaf("Naam onderneming", "Voorbeeld Freelance"),
        euid: leaf("EUID", "NLNHR.12345678"),
        certainty_percentage: leaf("Zekerheid zelfstandigheid (%)", 80),
        verdict: leaf("Uitslag", "passed"),
        conclusion: leaf("Conclusie", "Waarschijnlijk kenmerken van zelfstandigheid"),
        checks_total: leaf("Controles", 27),
        checks_completed: leaf("Controles voltooid", 27),
        checks_passed: leaf("Controles geslaagd", 24),
        checks_failed: leaf("Controles afgekeurd", 3),
        checks_inconclusive: leaf("Controles niet overtuigend", 0),
        attention_items: leaf("Aandachtspunten", ["vat_number_valid", "business_insurance", "business_bank_account"]),
        assessed_at: leaf("Beoordeeld op", "2026-10-15"),
        answers: {
          situation: leaf("2. Wat is uw situatie?", "existing_freelancer"),
          earning_as_entrepreneur: leaf("4. Verdient u momenteel geld als ondernemer?", "yes"),
          intends_to_continue: leaf("5. Heeft u het doel om de komende jaren door te gaan met uw bedrijf?", "yes"),
          years_self_employed: leaf("18. Hoe lang bent u al zelfstandige?", "more_than_3_years"),
          hourly_rate: leaf("19. Wat is uw gemiddelde uurtarief?", "eur_50_plus"),
          multiple_clients: leaf("20. Heeft u meer dan 1 opdrachtgever?", "yes"),
          over_70_percent_single_client: leaf("17. Werkt u meer dan 70% per jaar voor dezelfde klant of opdrachtgever?", "no"),
          business_bank_account: leaf("11. Heeft u een zakelijke bankrekening op naam van uw onderneming?", "no"),
          business_insurance: leaf("9. Heeft u één of meer zakelijke verzekeringen afgesloten?", "no"),
        },
      },
    },
  ],
  representation: { authorised: true, basis: "authorisation_type", serviceId: "EH_A530D4346A7ACD00" },
};
