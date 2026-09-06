import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { fromFile } from 'geotiff';
import proj4 from 'proj4';

const SOURCE_CRS = '+proj=laea +lat_0=52 +lon_0=10 +x_0=4321000 +y_0=3210000 +ellps=GRS80 +units=m +no_defs';
const RECORD_BYTES = 12;
const DEFAULT_OUTPUT = resolve(process.cwd(), 'data/historical-ais/helcom-ais-2024.bin.gz');

interface HistoricalAisMetadata {
  provider: string;
  dataset: string;
  year: number;
  shipType: string;
  metric: string;
  resolutionMeters: number;
  sourceCrs: string;
  outputCrs: string;
  sourceUrl: string;
  downloadUrl: string;
  attribution: string;
  sourceFile: string;
  sourceSha256: string;
  recordCount: number;
  minimumTrips: number;
  maximumTrips: number;
}

async function importHistoricalAis(inputPath: string, outputPath: string): Promise<void> {
  const tiff = await fromFile(inputPath);
  const image = await tiff.getImage();
  const geoKeys = image.getGeoKeys();
  if (!geoKeys || geoKeys.ProjectedCSTypeGeoKey !== 3035) {
    throw new Error(`Expected EPSG:3035, received ${String(geoKeys?.ProjectedCSTypeGeoKey)}.`);
  }

  const origin = image.getOrigin();
  const resolution = image.getResolution();
  const originX = origin[0];
  const originY = origin[1];
  const resolutionX = resolution[0];
  const resolutionY = resolution[1];
  if (originX === undefined || originY === undefined || resolutionX === undefined || resolutionY === undefined) {
    throw new Error('GeoTIFF does not define a two-dimensional origin and resolution.');
  }
  if (Math.abs(resolutionX) !== 1000 || Math.abs(resolutionY) !== 1000) {
    throw new Error(`Expected a 1 km grid, received ${resolutionX} x ${resolutionY}.`);
  }

  const rasters = await image.readRasters();
  const raster = rasters[0];
  if (!raster) throw new Error('GeoTIFF does not contain a raster band.');
  const noData = image.getGDALNoData();
  let recordCount = 0;
  for (const value of raster) {
    if (value > 0 && value !== noData) recordCount += 1;
  }
  const records = Buffer.allocUnsafe(recordCount * RECORD_BYTES);
  let recordIndex = 0;
  let minimumTrips = Number.POSITIVE_INFINITY;
  let maximumTrips = 0;

  for (let index = 0; index < raster.length; index += 1) {
    const trips = raster[index];
    if (trips === undefined || trips <= 0 || trips === noData) continue;
    const column = index % image.getWidth();
    const row = Math.floor(index / image.getWidth());
    const x = originX + (column + 0.5) * resolutionX;
    const y = originY + (row + 0.5) * resolutionY;
    const [longitude, latitude] = proj4(SOURCE_CRS, 'EPSG:4326', [x, y]);
    const offset = recordIndex * RECORD_BYTES;
    records.writeFloatLE(longitude, offset);
    records.writeFloatLE(latitude, offset + 4);
    records.writeUInt32LE(trips, offset + 8);
    recordIndex += 1;
    minimumTrips = Math.min(minimumTrips, trips);
    maximumTrips = Math.max(maximumTrips, trips);
  }

  const source = await readFile(inputPath);
  const metadata: HistoricalAisMetadata = {
    provider: 'HELCOM',
    dataset: 'HELCOM AIS Shipping density maps',
    year: 2024,
    shipType: 'all',
    metric: 'ship trips crossing a 1 x 1 km grid cell',
    resolutionMeters: 1000,
    sourceCrs: 'EPSG:3035',
    outputCrs: 'EPSG:4326',
    sourceUrl: 'https://metadata.helcom.fi/geonetwork/srv/api/records/2558244b-0cea-46e9-8053-af6ef5d01853',
    downloadUrl: 'https://maps.helcom.fi/website/download/Shipping_traffic_intensity/2024.zip',
    attribution: 'HELCOM AIS Shipping density maps (2024)',
    sourceFile: basename(inputPath),
    sourceSha256: createHash('sha256').update(source).digest('hex'),
    recordCount,
    minimumTrips,
    maximumTrips,
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await Promise.all([
    writeFile(outputPath, gzipSync(records, { level: 9 })),
    writeFile(outputPath.replace(/\.bin\.gz$/, '.metadata.json'), `${JSON.stringify(metadata, null, 2)}\n`),
  ]);
  console.log(`Imported ${recordCount} historical AIS cells to ${outputPath}.`);
}

const inputPath = process.argv[2];
if (!inputPath) {
  throw new Error('Usage: npm run historical-ais:import -- /path/to/all_shiptypes_all_months2024.tif [output.bin.gz]');
}

await importHistoricalAis(resolve(inputPath), resolve(process.argv[3] ?? DEFAULT_OUTPUT));
