/**
 * Custom Chrome installation script for Puppeteer
 * Handles various deployment environments (local, Render, Vercel, etc.)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Determine platform
const platform = os.platform();
const arch = os.arch();

// Chrome download URLs
const CHROME_VERSIONS = {
  linux: {
    x64: '1312.0.22/chrome-linux64/chrome-linux64.zip',
    arm64: '1312.0.22/chrome-linux64/chrome-linux64.zip',
  },
  darwin: {
    x64: '1312.0.22/chrome-mac-x64/chrome-mac-x64.zip',
    arm64: '1312.0.22/chrome-mac-arm64/chrome-mac-arm64.zip',
  },
  win32: {
    x64: '1312.0.22/chrome-win/win64/chrome-win64.zip',
    ia32: '1312.0.22/chrome-win/chrome-win.zip',
  },
};

function getChromeURL() {
  const key = `${platform}_${arch}`;
  console.log(`[Chrome Install] Platform: ${key}`);
  
  if (platform === 'linux') {
    return `https://storage.googleapis.com/chrome-for-testing-public/${CHROME_VERSIONS.linux.x64}`;
  } else if (platform === 'darwin') {
    return arch === 'arm64' 
      ? `https://storage.googleapis.com/chrome-for-testing-public/${CHROME_VERSIONS.darwin.arm64}`
      : `https://storage.googleapis.com/chrome-for-testing-public/${CHROME_VERSIONS.darwin.x64}`;
  } else if (platform === 'win32') {
    return `https://storage.googleapis.com/chrome-for-testing-public/${CHROME_VERSIONS.win32.x64}`;
  }
  
  return null;
}

async function installChrome() {
  const cacheDir = process.env.PUPPETEER_CACHE_DIR || path.join(os.homedir(), '.cache', 'puppeteer');
  const chromeDir = path.join(cacheDir, 'chrome', 'linux-1312.0.22');
  
  // Check if Chrome already exists
  const chromeExecutable = platform === 'win32' 
    ? path.join(chromeDir, 'chrome-win64', 'chrome.exe')
    : path.join(chromeDir, 'chrome-linux64', 'chrome');
  
  if (fs.existsSync(chromeExecutable)) {
    console.log(`[Chrome Install] Chrome already exists at: ${chromeExecutable}`);
    return;
  }
  
  console.log(`[Chrome Install] Chrome not found. Installing to: ${chromeDir}`);
  
  // Create directory
  fs.mkdirSync(chromeDir, { recursive: true });
  
  // Download Chrome
  const url = getChromeURL();
  if (!url) {
    console.log(`[Chrome Install] Unsupported platform: ${platform}_${arch}`);
    process.exit(1);
  }
  
  console.log(`[Chrome Install] Downloading from: ${url}`);
  
  const zipPath = path.join(os.tmpdir(), 'chrome.zip');
  
  // Download using curl
  try {
    execSync(`curl -L -o "${zipPath}" "${url}"`, { stdio: 'inherit' });
  } catch (error) {
    console.log(`[Chrome Install] Download failed: ${error.message}`);
    process.exit(1);
  }
  
  // Extract
  console.log(`[Chrome Install] Extracting...`);
  try {
    if (platform === 'win32') {
      execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${chromeDir}' -Force"`, { stdio: 'inherit' });
    } else {
      execSync(`unzip -o "${zipPath}" -d "${chromeDir}"`, { stdio: 'inherit' });
    }
  } catch (error) {
    console.log(`[Chrome Install] Extraction failed: ${error.message}`);
    // Try alternative extraction
    if (platform !== 'win32') {
      try {
        execSync(`cd "${chromeDir}" && unzip -o "${zipPath}"`, { stdio: 'inherit' });
      } catch (e2) {
        console.log(`[Chrome Install] Alternative extraction also failed`);
      }
    }
  }
  
  // Cleanup
  try {
    fs.unlinkSync(zipPath);
  } catch (e) {}
  
  console.log(`[Chrome Install] Chrome installed successfully!`);
  console.log(`[Chrome Install] Executable: ${chromeExecutable}`);
}

// Run
installChrome().catch(console.error);