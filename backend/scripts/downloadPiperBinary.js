import { createWriteStream, existsSync, mkdirSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { get } from 'https';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const RUNTIME_DIR = join(__dirname, '..', '..', 'tts-runtime');

if (!existsSync(RUNTIME_DIR)) mkdirSync(RUNTIME_DIR, { recursive: true });

const isWin = process.platform === 'win32';
const PIPER_URL = isWin
  ? 'https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_windows_amd64.zip'
  : 'https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_linux_x86_64.tar.gz';

const ARCHIVE_PATH = join(RUNTIME_DIR, isWin ? 'piper_windows.zip' : 'piper_linux.tar.gz');
const TARGET_EXE = join(RUNTIME_DIR, isWin ? 'piper.exe' : 'piper');

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    if (existsSync(TARGET_EXE)) {
      console.log(`  ✓ Piper executable already exists: ${TARGET_EXE}`);
      return resolve();
    }

    console.log(`  📥 Downloading Piper binary release (${isWin ? 'Windows' : 'Linux'}) from ${url}...`);
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
            console.log(`  ✅ Downloaded archive: ${destPath}`);
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
  if (existsSync(TARGET_EXE)) {
    console.log('✨ Piper binary is ready.');
    return;
  }

  try {
    await downloadFile(PIPER_URL, ARCHIVE_PATH);

    if (existsSync(ARCHIVE_PATH)) {
      console.log('📦 Extracting Piper archive...');
      if (isWin) {
        execSync(`powershell -Command "Expand-Archive -Path '${ARCHIVE_PATH}' -DestinationPath '${RUNTIME_DIR}_temp' -Force"`);
        const tempPath = join(RUNTIME_DIR + '_temp');
        execSync(`powershell -Command "Copy-Item -Path '${tempPath}\\piper\\*' -Destination '${RUNTIME_DIR}' -Recurse -Force; Remove-Item -Recurse -Force '${tempPath}'; Remove-Item -Force '${ARCHIVE_PATH}'"`);
      } else {
        execSync(`tar -xzf "${ARCHIVE_PATH}" -C "${RUNTIME_DIR}" --strip-components=1`);
        execSync(`chmod +x "${TARGET_EXE}"`);
        if (existsSync(ARCHIVE_PATH)) unlinkSync(ARCHIVE_PATH);
      }
      console.log('✅ Piper binary extracted successfully!');
    }
  } catch (err) {
    console.warn(`⚠️ Piper binary download/extract note: ${err.message}`);
    console.log('ℹ️ System will automatically fall back to Web Speech API if Piper binary is absent.');
  }
}

setupPiperBinary();
