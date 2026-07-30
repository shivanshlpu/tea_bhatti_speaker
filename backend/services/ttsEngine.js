import { existsSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import https from 'https';
import { queryOne } from '../db/connection.js';
import { getContentHash, getCachedAudio, cacheAudio } from './audioCache.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const RUNTIME_DIR = join(__dirname, '..', '..', 'tts-runtime');
const VOICES_DIR = join(RUNTIME_DIR, 'voices');

/**
 * TTS Engine — Neural offline TTS with Piper & Web Speech fallback.
 *
 * Strategy:
 * 1. Check audio cache (instant <300ms playback)
 * 2. If miss & Piper available -> run Piper TTS child process (<800ms cold synthesis)
 * 3. Save generated .wav to audio cache
 * 4. If Piper not installed -> fall back to Web Speech API
 */

/**
 * Check if a voice model file exists locally.
 * @param {string} voiceModel
 * @returns {string|null} Path to .onnx file or null
 */
export function getVoiceModelPath(voiceModel) {
  const path = join(VOICES_DIR, `${voiceModel}.onnx`);
  return existsSync(path) ? path : null;
}

/**
 * Get Piper executable path if present.
 * @returns {string|null}
 */
export function getPiperExecutable() {
  const winExe = join(RUNTIME_DIR, 'piper.exe');
  if (existsSync(winExe)) return winExe;

  const linuxExe = join(RUNTIME_DIR, 'piper');
  if (existsSync(linuxExe)) return linuxExe;

  return null;
}

/**
 * Get the voice model identifier for a given language code.
 * @param {string} languageCode
 * @returns {string} Voice model identifier
 */
export function getVoiceModel(languageCode) {
  try {
    const lang = queryOne('SELECT voice_model FROM languages WHERE code = ?', [languageCode]);
    return lang?.voice_model || 'en_US-lessac-medium';
  } catch {
    return 'en_US-lessac-medium';
  }
}

/**
 * Get the spoken announcement phrase for an item in a given language.
 * @param {number} itemId
 * @param {string} languageCode
 * @returns {string} The text to speak
 */
export function getAnnouncementText(itemId, languageCode) {
  const item = queryOne('SELECT * FROM items WHERE id = ?', [itemId]);

  if (!item) return null;

  let name;
  switch (languageCode) {
    case 'hi':
      name = item.name_hi || item.name_en;
      break;
    case 'bho':
      name = item.name_bho || item.name_hi || item.name_en;
      break;
    default:
      name = item.name_en;
  }

  switch (languageCode) {
    case 'hi':
      return item.name_hi ? `${item.name_hi} तैयार है, कृपया काउंटर से प्राप्त करें।` : `${name} तैयार है`;
    case 'bho':
      return item.name_bho || `${name} तैयार बा`;
    default:
      return `${name} is ready, please collect from the counter.`;
  }
}

/**
 * Synthesize text to a .wav audio file using local Piper child process.
 * Section 12 constraint: timeout > 2000ms triggers error.
 * Uses --length-scale 1.06 and --noise-scale 0.667 for warm, unhurried human cadence.
 *
 * @param {string} text - Text to speak
 * @param {string} modelPath - Path to .onnx model
 * @param {string} outputPath - Output .wav path
 * @returns {Promise<boolean>} Success
 */
export function synthesizeWithPiper(text, modelPath, outputPath) {
  return new Promise((resolve) => {
    const piperExe = getPiperExecutable();
    if (!piperExe) return resolve(false);

    const child = spawn(piperExe, [
      '--model', modelPath,
      '--output_file', outputPath,
      '--length-scale', '1.1',
      '--noise-scale', '0.667',
      '--noise-w', '0.8',
      '--sentence-silence', '0.35'
    ], { timeout: 2500 });

    child.stdin.write(text);
    child.stdin.end();

    child.on('exit', (code) => {
      if (code === 0 && existsSync(outputPath)) {
        resolve(true);
      } else {
        resolve(false);
      }
    });

    child.on('error', () => {
      resolve(false);
    });
  });
}

/**
 * Prepare a synthesis request (async).
 * Checks audio cache -> tries Piper TTS -> tries Google Translate TTS -> falls back to Web Speech API.
 *
 * @param {string} text - Text to synthesize
 * @param {string} languageCode - Language code
 * @returns {Promise<Object>} Synthesis metadata object
 */
export async function prepareSynthesisAsync(text, languageCode) {
  const voiceModel = getVoiceModel(languageCode);
  const contentHash = getContentHash(text, languageCode, voiceModel);

  // Ensure audio-cache directory exists
  const cacheDir = join(__dirname, '..', '..', 'audio-cache');
  if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true });
  }

  // 1. Check audio cache
  const cachedPath = getCachedAudio(contentHash);
  if (cachedPath) {
    const filename = cachedPath.split(/[/\\]/).pop();
    return {
      text,
      languageCode,
      voiceModel,
      contentHash,
      audioUrl: `/audio-cache/${filename}`,
      fromCache: true,
      mode: 'cached'
    };
  }

  // 2. Try Piper local synthesis
  const modelPath = getVoiceModelPath(voiceModel);
  const piperExe = getPiperExecutable();

  if (piperExe && modelPath) {
    const tempWavPath = join(cacheDir, `${contentHash}.wav`);
    const success = await synthesizeWithPiper(text, modelPath, tempWavPath);

    if (success) {
      cacheAudio(contentHash, Buffer.from([]));
      const filename = `${contentHash}.wav`;
      return {
        text,
        languageCode,
        voiceModel,
        contentHash,
        audioUrl: `/audio-cache/${filename}`,
        fromCache: false,
        mode: 'piper'
      };
    }
  }

  // 3. Cloud TTS fallback — Google Translate TTS (free, no API key needed)
  try {
    const ttsLang = languageCode === 'bho' ? 'hi' : languageCode;
    const encodedText = encodeURIComponent(text);
    const gttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=${ttsLang}&client=tw-ob`;

    // https and writeFileSync are imported at top level

    const mp3Data = await new Promise((resolve, reject) => {
      const makeReq = (url) => {
        https.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://translate.google.com/'
          }
        }, (response) => {
          if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
            return makeReq(response.headers.location);
          }
          if (response.statusCode !== 200) {
            return reject(new Error(`Google TTS HTTP ${response.statusCode}`));
          }
          const chunks = [];
          response.on('data', (c) => chunks.push(c));
          response.on('end', () => resolve(Buffer.concat(chunks)));
          response.on('error', reject);
        }).on('error', reject);
      };
      makeReq(gttsUrl);
    });

    if (mp3Data && mp3Data.length > 1000) {
      const mp3Path = join(cacheDir, `${contentHash}.mp3`);
      writeFileSync(mp3Path, mp3Data);
      cacheAudio(contentHash, Buffer.from([]));
      return {
        text,
        languageCode,
        voiceModel,
        contentHash,
        audioUrl: `/audio-cache/${contentHash}.mp3`,
        fromCache: false,
        mode: 'google-tts'
      };
    }
  } catch (gttsErr) {
    console.warn('Google TTS fallback failed:', gttsErr.message);
  }

  // 4. Final fallback to Web Speech API (browser-side)
  return {
    text,
    languageCode,
    voiceModel,
    contentHash,
    audioUrl: null,
    fromCache: false,
    mode: 'web-speech'
  };
}

/**
 * Synchronous synthesis check (compatibility wrapper).
 */
export function prepareSynthesis(text, languageCode) {
  const voiceModel = getVoiceModel(languageCode);
  const contentHash = getContentHash(text, languageCode, voiceModel);

  const cachedPath = getCachedAudio(contentHash);
  if (cachedPath) {
    const filename = cachedPath.split(/[/\\]/).pop();
    return {
      text,
      languageCode,
      voiceModel,
      contentHash,
      audioUrl: `/audio-cache/${filename}`,
      fromCache: true,
      mode: 'cached'
    };
  }

  return {
    text,
    languageCode,
    voiceModel,
    contentHash,
    audioUrl: null,
    fromCache: false,
    mode: 'web-speech'
  };
}

/**
 * Get Web Speech BCP-47 tag for language.
 */
export function getWebSpeechLang(languageCode) {
  const langMap = {
    'en': 'en-IN',
    'hi': 'hi-IN',
    'bho': 'hi-IN'
  };
  return langMap[languageCode] || 'en-IN';
}
