import { env } from '../config/env.js';
import { AppDataSource } from '../database/data-source.js';
import { Port, PortStatus } from '../database/entities.js';

interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}
interface OverpassResponse { elements: OverpassElement[] }

const bounds = { south: 53.70, west: 14.10, north: 54.95, east: 19.85 };
const query = `[out:json][timeout:90];
area["ISO3166-1"="PL"]["boundary"="administrative"]->.poland;
(
  nwr(area.poland)["leisure"="marina"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
  nwr(area.poland)["seamark:type"="harbour"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
  nwr(area.poland)["harbour"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
);
out center tags qt;`;

function text(tags: Record<string, string>, ...keys: string[]): string | null {
  for (const key of keys) if (tags[key]?.trim()) return tags[key].trim();
  return null;
}

function normalizedName(value: string): string {
  return value.toLocaleLowerCase('pl').replace(/[^a-z0-9ąćęłńóśźż]+/g, ' ').trim();
}

async function fetchPorts(): Promise<OverpassElement[]> {
  const response = await fetch(env.OVERPASS_API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
      'user-agent': 'BojaPortImporter/1.0 (local one-off import)',
    },
    body: new URLSearchParams({ data: query }),
  });
  if (!response.ok) throw new Error(`Overpass returned ${response.status} ${response.statusText}`);
  return (await response.json() as OverpassResponse).elements;
}

await AppDataSource.initialize();
await AppDataSource.runMigrations({ transaction: 'all' });

try {
  const elements = await fetchPorts();
  const repository = AppDataSource.getRepository(Port);
  const seenNames = new Set<string>();
  let imported = 0;
  let updated = 0;
  let skipped = 0;
  const importedExternalIds: string[] = [];

  for (const element of elements) {
    const tags = element.tags ?? {};
    const name = text(tags, 'name:pl', 'name', 'seamark:name');
    const latitude = element.lat ?? element.center?.lat;
    const longitude = element.lon ?? element.center?.lon;
    const inactive = Boolean(tags.historic || tags.abandoned || tags.disused || tags['disused:leisure'] || tags['abandoned:leisure']);
    if (!name || latitude === undefined || longitude === undefined || inactive) { skipped += 1; continue; }

    const nameKey = normalizedName(name);
    if (seenNames.has(nameKey)) { skipped += 1; continue; }
    seenNames.add(nameKey);

    const externalId = `${element.type}/${element.id}`;
    importedExternalIds.push(externalId);
    const existing = await repository.findOne({ where: { source: 'openstreetmap', externalId } });
    const description = text(tags, 'description:pl', 'description')
      ?? 'Port lub marina zaimportowana z danych OpenStreetMap. Informacje wymagają weryfikacji przez zarządzającego portem.';
    await repository.save(repository.create({
      ...existing,
      name,
      description,
      location: { type: 'Point', coordinates: [longitude, latitude] },
      contactEmail: text(tags, 'contact:email', 'email'),
      contactPhone: text(tags, 'contact:phone', 'phone'),
      vhfChannel: text(tags, 'vhf', 'seamark:radio_station:channel'),
      status: PortStatus.Active,
      source: 'openstreetmap',
      externalId,
    }));
    if (existing) updated += 1; else imported += 1;
  }
  let pruned = 0;
  if (process.argv.includes('--prune') && importedExternalIds.length) {
    const result = await repository.createQueryBuilder().delete()
      .where('source = :source', { source: 'openstreetmap' })
      .andWhere('external_id NOT IN (:...externalIds)', { externalIds: importedExternalIds })
      .execute();
    pruned = result.affected ?? 0;
  }
  console.info(JSON.stringify({ source: 'OpenStreetMap/Overpass', imported, updated, skipped, pruned, received: elements.length }));
} finally {
  await AppDataSource.destroy();
}
