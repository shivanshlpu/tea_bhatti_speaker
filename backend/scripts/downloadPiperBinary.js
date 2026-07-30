import { createWriteStream, existsSync, mkdirSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { get } from 'https';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const RUNTIME_DIR = join(__dirname, '..', '..', 'tts-runtime');

if (!existsSync(RUNTIME_DIR)) mkdirSync(RUNTIME_DIR, { recursive: true });

const PIPER_ZIP_URL = 'https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_windows_amd64.zip';
const ZIP_PATH = join(RUNTIME_DIR, 'piper_windows.zip');
const EXE_PATH = join(RUNTIME_DIR, 'piper.exe');

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    if (existsSync(EXE_PATH)) {
      console.log(`  ✓ Piper executable already exists: ${EXE_PATH}`);
      return resolve();
    }

    console.log(`  📥 Downloading Piper binary release from ${url}...`);
    const file = createWriteStream(destPath);

    const request = (currentUrl) => {
      get(currentUrl, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          const redirectUrl = new URL(response.headers.location, currentUrl).href;
          return request(redirectUrl);
        }

        if (response.statusCode !== 200) {
          if (existsSync(destPath)) unlinkSync(destPath);
          return reject(new Error(`HTTP ${response.statusCode}`));
        }

        response.pipe(file);

        file.on('finish', () => {
          file.close(() => {
            console.log(`  ✅ Zip downloaded: ${destPath}`);
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

async function setupPiperBinary() {
  if (existsSync(EXE_PATH)) {
    console.log('✨ Piper binary is ready.');
    return;
  }

  try {
    await downloadFile(PIPER_ZIP_URL, ZIP_PATH);

    if (existsSync(ZIP_PATH)) {
      console.log('📦 Extracting Piper archive using PowerShell...');
      execSync(`powershell -Command "Expand-Archive -Path '${ZIP_PATH}' -DestinationPath '${RUNTIME_DIR}_temp' -Force"`);

      // Move extracted contents from piper_windows_amd64/piper/* to tts-runtime/
      const tempPath = join(RUNTIME_DIR + '_temp');
      execSync(`powershell -Command "Copy-Item -Path '${tempPath}\\piper\\*' -Destination '${RUNTIME_DIR}' -Recurse -Force; Remove-Item -Recurse -Force '${tempPath}'; Remove-Item -Force '${ZIP_PATH}'"`);
      console.log('✅ Piper binary extracted successfully!');
    }
  } catch (err) {
    console.warn(`⚠️ Piper binary download/extract note: ${err.message}`);
    console.log('ℹ️ System will automatically fall back to Web Speech API if Piper binary is absent.');
  }
}

setupPiperBinary();
