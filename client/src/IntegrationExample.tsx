import { CodeBlock } from "./CodeBlock";

/**
 * The "secure approach" integration example from wallet-connect's own
 * IntegrationExamples component (React frontend + Node.js backend variant),
 * with the values and the proxy shape of this app rather than the generic ones,
 * so the page describes the code it is running: no apiKey prop on the button,
 * the key attached server-side.
 */

const INSTALL = "npm install wallet-connect-button-react@latest";

const REACT = `import WalletConnectButton from 'wallet-connect-button-react';
import { useState } from 'react';

function App() {
  const [attributes, setAttributes] = useState(null);

  if (attributes) {
    // One entry per attestation: EUCC, LPID, POX and the ZZP keurmerk.
    return (
      <div>
        <h3>Received attributes:</h3>
        <pre>{JSON.stringify(attributes, null, 2)}</pre>
      </div>
    );
  }

  return (
    <WalletConnectButton
      serviceId="EH_A530D4346A7ACD00"
      nbwallet
      label="Deel gegevens met je NB Wallet"
      lang="nl"
      onSuccess={(attrs) => {
        setAttributes(attrs);
      }}
    />
  );
}

export default App;`;

const STYLING = `/* Add to your CSS file */
nl-wallet-button::part(button) {
  border-radius: 999px;
  padding: 0 24px;
  height: 44px;
}

nl-wallet-button::part(button-span) {
  font-weight: 600;
}`;

const BACKEND = `import express from 'express';
import axios from 'axios';

const app = express();

app.use(express.json());

const WALLET_CONNECT_URL = 'https://connect.nbwallet.org';
const apiKey = 'xxx';

// Forward every /api call to NB Wallet Connect with the API key attached, so
// the key never reaches the browser. The button asks for these same-origin
// because it is used without an apiKey prop.
async function proxyToWalletConnect(req, res) {
  try {
    const response = await axios({
      method: req.method,
      url: \`\${WALLET_CONNECT_URL}\${req.originalUrl}\`,
      headers: {
        'Authorization': \`Bearer \${apiKey}\`,
        'Content-Type': 'application/json'
      },
      data: req.body,
    });

    res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(502).json({ error: 'Proxy error', message: error.message });
    }
  }
}

app.all('/api/*', proxyToWalletConnect);

app.listen(7020, () => {
  console.log('Backend running on port 7020');
});`;

const REQUESTED = `{
  "urn:eudi:lpid:nl:1":             [["euid"], ["legal_name"]],
  "urn:eudi:eucc:nl:1":             [["legal_person_name"], ["legal_form_type"],
                                     ["registration_date"], ["legal_person_status"],
                                     ["registered_address", "full_address"],
                                     ["contact_point", "contact_email"], ...],
  "urn:eudi:pox:nl:1":              [["representatives_person_name"],
                                     ["representatives_authorisation_type"],
                                     ["mandate_scope"], ...],
  "urn:zzpgarantie:keurmerk:nl:1":  [["certainty_percentage"], ["verdict"],
                                     ["conclusion"], ["attention_items"],
                                     ["answers", "years_self_employed"], ...]
}`;

export function IntegrationExample() {
  return (
    <section className="card integration">
      <h2>Integratievoorbeeld</h2>
      <p className="lead">
        Zo bouwt u deze knop in uw eigen applicatie in: de React-component in de frontend, en een backend die de
        API-sleutel toevoegt zodat die nooit in de browser terechtkomt. Welke attestaties en claims de wallet
        gevraagd wordt te delen staat niet in deze code maar in de registratie van de dienst bij{" "}
        <a href="https://connect.nbwallet.org" target="_blank" rel="noopener noreferrer">
          NB Wallet Connect
        </a>
        .
      </p>

      <h3 className="integration-heading">Registratie</h3>

      <div className="step">
        <h4>De dienst vraagt vier attestaties op</h4>
        <p className="step-note">
          Het volledige overzicht staat in <code>registration/mortgage2go.seed.json</code> in de broncode.
        </p>
        <CodeBlock code={REQUESTED} language="javascript" />
      </div>

      <h3 className="integration-heading">Frontend</h3>

      <div className="step">
        <h4>1. Install the component</h4>
        <CodeBlock code={INSTALL} language="bash" />
      </div>

      <div className="step">
        <h4>2. Use in your React code</h4>
        <CodeBlock code={REACT} language="jsx" />
      </div>

      <div className="step">
        <h4>3. Add custom styling (optional)</h4>
        <CodeBlock code={STYLING} language="css" />
      </div>

      <h3 className="integration-heading">Backend</h3>

      <div className="step">
        <CodeBlock code={BACKEND} language="javascript" />
      </div>
    </section>
  );
}
