import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ASSETS_DIR = path.resolve(__dirname, '../public/assets');

if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

const assets = [
  // Car model (Low poly Porsche/Sports car from pmndrs market)
  {
    url: 'https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/porsche-911/model.gltf',
    dest: path.join(ASSETS_DIR, 'car.glb')
  },
  // Palm tree model
  {
    url: 'https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/palm-tree/model.gltf',
    dest: path.join(ASSETS_DIR, 'palm.glb')
  },
  // Road texture (Using a basic noise/asphalt-like texture from three.js examples)
  {
    url: 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/terrain/grasslight-big.jpg', 
    dest: path.join(ASSETS_DIR, 'asphalt.jpg')
  }
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

async function run() {
  console.log('Downloading assets...');
  for (const asset of assets) {
    console.log(`Downloading ${path.basename(asset.dest)}...`);
    try {
      await download(asset.url, asset.dest);
      console.log(`Saved ${path.basename(asset.dest)}`);
    } catch (err) {
      console.error(`Error downloading ${asset.dest}:`, err.message);
    }
  }
  console.log('Done!');
}

run();