import { createWriteStream, existsSync, mkdirSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { get } from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const RUNTIME_DIR = join(__dirname, '..', '..', 'tts-runtime');
const VOICES_DIR = join(RUNTIME_DIR, 'voices');

if (!existsSync(RUNTIME_DIR)) mkdirSync(RUNTIME_DIR, { recursive: true });
if (!existsSync(VOICES_DIR)) mkdirSync(VOICES_DIR, { recursive: true });

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    if (existsSync(destPath)) {
      console.log(`  ✓ Already exists: ${destPath}`);
      return resolve();
    }

    console.log(`  📥 Downloading ${url}...`);
    const file = createWriteStream(destPath);

    const request = (currentUrl) => {
      get(currentUrl, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          const redirectUrl = new URL(response.headers.location, currentUrl).href;
          return request(redirectUrl);
        }

        if (response.statusCode !== 200) {
          unlinkSync(destPath);
          return reject(new Error(`HTTP ${response.statusCode}`));
        }

        response.pipe(file);

        file.on('finish', () => {
          file.close(() => {
            console.log(`  ✅ Downloaded: ${destPath}`);
            resolve();
          });
        });
      }).on('error', (err) => {
        if (existsSync(destPath)) unlinkSync(destPath);
        reject(err);
      });
    };

    request(url);
  });
}

// HuggingFace piper-voices exact paths
const VOICE_MODELS = [
  {
    name: 'hi_IN-priyamvada-medium',
    onnxUrl: 'https://huggingface.co/rhasspy/piper-voices/resolve/main/hi/hi_IN/priyamvada/medium/hi_IN-priyamvada-medium.onnx',
    jsonUrl: 'https://huggingface.co/rhasspy/piper-voices/resolve/main/hi/hi_IN/priyamvada/medium/hi_IN-priyamvada-medium.onnx.json'
  },
  {
    name: 'en_US-lessac-medium',
    onnxUrl: 'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx',
    jsonUrl: 'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json'
  }
];

async function setupPiperVoices() {
  console.log('🎙️ Setting up local Piper voice models...');

  for (const voice of VOICE_MODELS) {
    const onnxPath = join(VOICES_DIR, `${voice.name}.onnx`);
    const jsonPath = join(VOICES_DIR, `${voice.name}.onnx.json`);

    try {
      await downloadFile(voice.onnxUrl, onnxPath);
      await downloadFile(voice.jsonUrl, jsonPath);
    } catch (err) {
      console.warn(`  ⚠️ Could not download voice model ${voice.name}: ${err.message}`);
    }
  }

  console.log('✨ Voice model check complete.');
}

setupPiperVoices();
