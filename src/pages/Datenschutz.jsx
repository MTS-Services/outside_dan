export default function Datenschutz() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16 prose prose-invert">
      <h1 className="font-display text-5xl mb-6">DATENSCHUTZ</h1>
      <p className="text-white/70">
        Wir verarbeiten deine Daten nur, um deine Bestellung auszuführen und dich auf
        Wunsch über den Bestellstatus zu informieren. Eine Weitergabe an Dritte erfolgt
        nicht, ausgenommen unserer Liefer- und Zahlungsdienstleister.
      </p>
      <h2 className="text-2xl mt-8">Erhobene Daten</h2>
      <ul className="text-white/70 list-disc pl-6 space-y-1">
        <li>Name, E-Mail, Telefonnummer</li>
        <li>Lieferadresse</li>
        <li>Bestelldaten</li>
        <li>Push-Subscription-ID (sofern aktiviert)</li>
      </ul>
      <h2 className="text-2xl mt-8">Deine Rechte</h2>
      <p className="text-white/70">
        Du hast jederzeit Recht auf Auskunft, Berichtigung und Löschung. Schreib uns an
        privacy@rockinrumble.at.
      </p>
    </div>
  );
}
