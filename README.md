# ☕ Tea Bhatti — Voice Announcement Kiosk System

An offline-capable, kitchen-safe, multi-lingual voice announcement system designed for **Tea Bhatti**. Staff can tap menu item cards on a touchscreen kiosk or mobile phone to announce order readies over the cafe speaker system in natural human voice.

![Tea Bhatti Kiosk](images/logo.png)

---

## 🌟 Key Features

- **⚡ Sub-200ms Tap-to-Audio Latency**: Instant audio announcements powered by Piper Neural TTS & WebAssembly SQLite (`sql.js`).
- **🗣️ Multi-lingual Support**:
  - **English** (`en_US-lessac-medium`)
  - **Hindi (हिन्दी)** (`hi_IN-priyamvada-medium`)
  - **Bhojpuri (भोजपुरी)** (Custom authentic phrases: *"ए जी! ... वेजी आलू पैटी बर्गर तैयार बा, जल्दी काउंटर पर आईं!"*)
- **🖼️ Full Food Photography Menu**: Pre-loaded with 37 food items across 8 categories (Burgers, Sandwiches, Pizzas, Fries, Pasta, Maggie, Vada Pav, Combos).
- **📱 Ultra-Responsive Mobile Design**: Native bottom navigation bar for one-handed smartphone usage (`http://<LOCAL_IP>:3456`).
- **🚨 Emergency Override System**: Instant high-priority announcements with pre-empt controls.
- **🔁 Interactive History Log**: Reverse-chronological history with status filters and single-tap re-announcement.
- **🎨 Light & Dark Themes**: Kitchen-safe high contrast styling with 72×72px minimum tap targets.

---

## 🚀 Step-by-Step Deployment Guide

### Method 1: Local Cafe Kiosk & Wi-Fi Network (Recommended)

Run the application directly on the cafe counter PC and connect staff mobile phones over local Wi-Fi.

#### Step 1: Clone Repository & Install Dependencies
```bash
git clone https://github.com/shivanshlpu/tea_bhatti_speaker.git
cd tea_bhatti_speaker
npm install
```

#### Step 2: Download Offline Neural TTS Voices & Binary
```bash
# Download English & Hindi/Bhojpuri neural voice models
node backend/scripts/downloadVoices.js

# Download Piper offline TTS binary
node backend/scripts/downloadPiperBinary.js
```

#### Step 3: Seed Database with Tea Bhatti Menu
```bash
node backend/db/seed.js
```

#### Step 4: Start Kiosk Application

**For Desktop Kiosk Mode (Electron App Window):**
```bash
npm start
```

**For Web Browser / Background Server Mode:**
```bash
npm run dev
```

#### Step 5: Connect Staff Mobile Phones over Cafe Wi-Fi
1. Ensure mobile phones are connected to the same Wi-Fi network as the PC.
2. Find the PC's Local IP address (Open CMD/PowerShell and run `ipconfig` -> look for `IPv4 Address`, e.g., `192.168.1.5`).
3. On any mobile phone, open Chrome/Safari and visit:
   ```
   http://192.168.1.5:3456
   ```

---

### Method 2: Cloud Deployment (Render / Railway / VPS)

Deploy online so staff can access the kiosk interface from anywhere.

#### Step 1: Create New Web Service on Render / Railway
1. Connect your GitHub repository: `https://github.com/shivanshlpu/tea_bhatti_speaker.git`
2. Environment: `Node.js`
3. **Build Command**:
   ```bash
   npm install && node backend/scripts/downloadVoices.js
   ```
4. **Start Command**:
   ```bash
   node backend/server.js
   ```
5. **Environment Variables**:
   - `PORT`: `3456`

---

### Method 3: Build Windows Standalone Installer (.exe)

Package the application into a single executable installer file for Windows PCs.

```bash
# Build standalone .exe package
npx electron-builder --win
```
The installer executable `.exe` will be generated in the `dist/` directory.

---

## 🛠️ Technology Stack

- **Frontend**: HTML5, Vanilla CSS Design System, Web Speech API, Socket.IO Client.
- **Backend**: Node.js, Express 4, Socket.IO Server.
- **Database**: SQLite3 via WebAssembly (`sql.js`).
- **Offline TTS Engine**: Piper ONNX Neural Runtime (`piper.exe`).
- **Desktop Shell**: Electron.

---

## 📜 License

MIT License. Built for **Tea Bhatti**.
