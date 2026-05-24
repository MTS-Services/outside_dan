const prisma = require('../config/prisma');
const { ApiError } = require('../middlewares/error');

const DEFAULT_PAGES = [
  {
    slug: 'impressum',
    title: 'Impressum',
    sortOrder: 1,
    content: '<p>Angaben gemäß § 5 ECG.</p><h2>Kontakt</h2><p>Tarantella – Pizza Pasta Napoli<br />Sonnenweg 11<br />8793 Trofaiach, Österreich<br />Telefon: +43 676 632 86 77<br />E-Mail: reservierung@tarantella.at</p><h2>Inhaltlich verantwortlich</h2><p>Tarantella, Trofaiach.</p>',
  },
  {
    slug: 'datenschutz',
    title: 'Datenschutzerklärung',
    sortOrder: 2,
    content: '<p>Wir verarbeiten deine Daten nur, um deine Bestellung auszuführen und dich auf Wunsch über den Bestellstatus zu informieren. Eine Weitergabe an Dritte erfolgt nicht, ausgenommen unserer Liefer- und Zahlungsdienstleister.</p><h2>Erhobene Daten</h2><ul><li>Name, E-Mail, Telefonnummer</li><li>Lieferadresse</li><li>Bestelldaten</li><li>Push-Subscription-ID (sofern aktiviert)</li></ul><h2>Deine Rechte</h2><p>Du hast jederzeit Recht auf Auskunft, Berichtigung und Löschung. Schreib uns an reservierung@tarantella.at.</p>',
  },
  {
    slug: 'agb',
    title: 'Allgemeine Geschäftsbedingungen (AGB)',
    sortOrder: 3,
    content: '<p>Allgemeine Geschäftsbedingungen für Bestellungen über unsere Website.</p><h2>Vertragsschluss</h2><p>Mit Absenden der Bestellung gibst du ein verbindliches Angebot ab. Der Vertrag kommt zustande, wenn wir die Bestellung bestätigen.</p><h2>Lieferung</h2><p>Lieferzeiten sind Richtwerte. Bei Abholung informieren wir dich, sobald die Bestellung bereit ist.</p>',
  },
];

async function ensureDefaultLegalPages() {
  const count = await prisma.legalPage.count();
  if (count === 0) {
    await prisma.legalPage.createMany({
      data: DEFAULT_PAGES.map((p) => ({ ...p, isActive: true })),
    });
  }
  await Promise.all(
    DEFAULT_PAGES.map((p) =>
      prisma.legalPage.updateMany({ where: { slug: p.slug }, data: { title: p.title } })
    )
  );
}

async function listPublicLegalPages() {
  await ensureDefaultLegalPages();
  return prisma.legalPage.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    select: { id: true, slug: true, title: true, sortOrder: true },
  });
}

async function getPublicLegalPage(slug) {
  const page = await prisma.legalPage.findFirst({
    where: { slug, isActive: true },
  });
  if (!page) throw new ApiError(404, 'Seite nicht gefunden');
  return page;
}

async function listAllLegalPages() {
  await ensureDefaultLegalPages();
  return prisma.legalPage.findMany({
    orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
  });
}

async function createLegalPage(data) {
  return prisma.legalPage.create({ data });
}

async function updateLegalPage(id, data) {
  return prisma.legalPage.update({ where: { id }, data });
}

async function deleteLegalPage(id) {
  await prisma.legalPage.delete({ where: { id } });
}

module.exports = {
  listPublicLegalPages,
  getPublicLegalPage,
  listAllLegalPages,
  createLegalPage,
  updateLegalPage,
  deleteLegalPage,
};
