import { createElement } from 'react';
import { createRoot } from 'react-dom/client';

// ==========================================
// SANALPARSEL - Figma Quality UI Design
// Mobile-First | Glassmorphism | Dark Premium Theme
// Drone-Feel | Cinematic GIS UI
// ==========================================

// ==========================================
// STYLES
// ==========================================
const styles = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

* { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --primary: #ef4444;
  --primary-light: #f87171;
  --primary-dark: #dc2626;
  --primary-glow: rgba(239, 68, 68, 0.4);
  --bg-dark: #0a0a0f;
  --bg-darker: #050508;
  --bg-glass: rgba(255, 255, 255, 0.03);
  --bg-glass-hover: rgba(255, 255, 255, 0.06);
  --text-primary: #ffffff;
  --text-secondary: rgba(255, 255, 255, 0.7);
  --text-muted: rgba(255, 255, 255, 0.4);
  --accent-cyan: #06b6d4;
  --accent-green: #22c55e;
  --border-subtle: rgba(255, 255, 255, 0.06);
  --border-light: rgba(255, 255, 255, 0.1);
  --glass-blur: blur(20px);
}

html, body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background: var(--bg-dark);
  color: var(--text-primary);
  min-height: 100vh;
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
}

.app {
  min-height: 100vh;
  max-width: 430px;
  margin: 0 auto;
  position: relative;
  background: linear-gradient(180deg, #0a0a0f 0%, #0f0f18 50%, #0a0a0f 100%);
}

.screen {
  padding: 20px;
  padding-bottom: 100px;
  min-height: 100vh;
}

/* GLASS PANEL */
.glass-panel {
  background: var(--bg-glass);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  padding: 20px;
  transition: all 0.3s ease;
}

.glass-panel:hover { background: var(--bg-glass-hover); }

/* BUTTONS */
.gradient-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 28px;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  box-shadow: 0 0 30px var(--primary-glow);
}

.gradient-btn:hover { transform: translateY(-2px); box-shadow: 0 0 40px var(--primary-glow); }
.gradient-btn:active { transform: translateY(0); }

.secondary-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 28px;
  background: transparent;
  border: 1px solid var(--border-light);
  border-radius: 12px;
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.3s ease;
}

.secondary-btn:hover { background: var(--bg-glass); }
.full-width { width: 100%; justify-content: center; }

/* INPUTS */
.glass-input, .glass-textarea {
  width: 100%;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  color: var(--text-primary);
  font-size: 15px;
  font-family: inherit;
  transition: all 0.3s ease;
}

.glass-input:focus, .glass-textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 20px var(--primary-glow);
}

.glass-textarea { min-height: 120px; resize: vertical; }

.form-group { margin-bottom: 16px; }
.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}

/* ANIMATIONS */
@keyframes float {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(30px, 30px); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.2); }
}

@keyframes drone-fly {
  0% { opacity: 0.3; transform: translateY(-50%) translateX(-20%); }
  50% { opacity: 1; transform: translateY(-50%) translateX(20%); }
  100% { opacity: 0.3; transform: translateY(-50%) translateX(-20%); }
}

@keyframes parcel-glow {
  0%, 100% { box-shadow: 0 0 20px var(--primary-glow); }
  50% { box-shadow: 0 0 40px var(--primary-glow); }
}

@keyframes drone-hover {
  0%, 100% { transform: translate(-50%, -50%) translateY(0); }
  50% { transform: translate(-50%, -50%) translateY(-10px); }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes pin-pulse {
  0% { transform: scale(1); opacity: 0.5; }
  100% { transform: scale(2); opacity: 0; }
}

/* =============== LANDING =============== */
.landing-screen { padding: 0; position: relative; overflow: hidden; }

.bg-animation {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  pointer-events: none;
  z-index: 0;
}

.grid-overlay {
  position: absolute;
  inset: 0;
  background-image: 
    linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
  background-size: 60px 60px;
}

.gradient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.4;
}

.orb-1 {
  width: 400px; height: 400px;
  background: var(--primary);
  top: -100px; right: -100px;
  animation: float 8s ease-in-out infinite;
}

.orb-2 {
  width: 300px; height: 300px;
  background: var(--accent-cyan);
  bottom: 100px; left: -100px;
  animation: float 10s ease-in-out infinite reverse;
}

.landing-header {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
}

.logo { display: flex; align-items: center; gap: 10px; }
.logo-icon { font-size: 28px; color: var(--primary); }
.logo-text { font-size: 20px; font-weight: 700; letter-spacing: -0.5px; }

.landing-hero {
  position: relative;
  z-index: 1;
  padding: 40px 20px;
  text-align: center;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  color: var(--primary-light);
  margin-bottom: 24px;
}

.badge-dot {
  width: 8px; height: 8px;
  background: var(--primary);
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.hero-title {
  font-size: 36px;
  font-weight: 800;
  line-height: 1.1;
  margin-bottom: 16px;
  letter-spacing: -1px;
}

.gradient-text {
  background: linear-gradient(135deg, var(--primary) 0%, #ff8c00 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-subtitle {
  font-size: 16px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 32px;
}

.hero-cta {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
}

.features-grid {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding: 20px;
}

.feature-card { padding: 20px; text-align: center; }
.feature-icon { font-size: 32px; margin-bottom: 12px; }
.feature-card h3 { font-size: 14px; font-weight: 600; margin-bottom: 6px; }
.feature-card p { font-size: 12px; color: var(--text-muted); line-height: 1.4; }

/* Map Preview Mock */
.map-preview-container { position: relative; z-index: 1; padding: 20px; padding-bottom: 60px; }

.map-preview-mock {
  position: relative;
  height: 400px;
  border-radius: 20px;
  overflow: hidden;
  padding: 0;
}

.mock-map-bg {
  position: absolute;
  inset: 0;
  background: 
    linear-gradient(rgba(15, 20, 25, 0.9), rgba(15, 20, 25, 0.9)),
    repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(255,255,255,0.03) 40px, rgba(255,255,255,0.03) 41px),
    repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(255,255,255,0.03) 40px, rgba(255,255,255,0.03) 41px);
}

.mock-drone-path {
  position: absolute;
  top: 50%; left: 20%;
  width: 60%; height: 2px;
  background: linear-gradient(90deg, transparent, var(--primary), var(--primary), transparent);
  transform: translateY(-50%);
  box-shadow: 0 0 10px var(--primary);
}

.mock-drone-path.animated { animation: drone-fly 3s ease-in-out infinite; }

.mock-parcel {
  position: absolute;
  top: 40%; left: 35%;
  width: 30%; height: 25%;
  border: 3px solid var(--primary);
  border-radius: 4px;
  box-shadow: 0 0 20px var(--primary-glow);
  animation: parcel-glow 2s ease-in-out infinite;
}

.mock-floating-controls {
  position: absolute;
  top: 20px; right: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mock-floating-controls button {
  width: 40px; height: 40px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid var(--border-light);
  border-radius: 10px;
  color: white;
  font-size: 18px;
  cursor: pointer;
}

.mock-bottom-sheet {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  background: rgba(10, 10, 15, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 24px 24px 0 0;
  padding: 30px 20px 20px;
}

.sheet-handle {
  width: 40px; height: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  margin: 0 auto 20px;
}

.mock-content {
  height: 60px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
}

/* =============== AUTH =============== */
.auth-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 60px;
  min-height: 100vh;
}

.back-btn {
  position: absolute;
  top: 20px; left: 20px;
  width: 40px; height: 40px;
  background: transparent;
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  color: white;
  font-size: 20px;
  cursor: pointer;
}

.auth-logo { display: flex; align-items: center; gap: 10px; margin-bottom: 40px; }
.auth-logo .logo-icon { font-size: 32px; color: var(--primary); }
.auth-logo .logo-text { font-size: 24px; font-weight: 700; }

.auth-card { width: 100%; max-width: 380px; text-align: center; }
.auth-title { font-size: 24px; font-weight: 700; margin-bottom: 8px; }
.auth-subtitle { color: var(--text-secondary); margin-bottom: 32px; }
.auth-form { text-align: left; }

.forgot-link { text-align: right; margin-bottom: 20px; }
.forgot-link a { color: var(--text-muted); font-size: 13px; text-decoration: none; }
.auth-submit-btn { width: 100%; justify-content: center; margin-top: 8px; }

.auth-divider {
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 24px 0;
  color: var(--text-muted);
  font-size: 13px;
}

.auth-divider::before, .auth-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border-subtle);
}

.auth-switch { margin-top: 24px; font-size: 14px; color: var(--text-secondary); }
.auth-switch a { color: var(--primary); cursor: pointer; text-decoration: none; font-weight: 500; }

/* =============== DASHBOARD =============== */
.dashboard-screen { padding-top: 60px; }

.dash-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.greeting-text { font-size: 14px; color: var(--text-muted); }
.dash-header h2 { font-size: 24px; font-weight: 700; }

.header-actions { display: flex; align-items: center; gap: 12px; }

.credits-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 20px;
}

.credit-icon { color: var(--primary); font-size: 16px; }
.credit-count { font-size: 18px; font-weight: 700; }
.credit-label { font-size: 12px; color: var(--text-muted); }

.notif-btn {
  width: 40px; height: 40px;
  background: transparent;
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  font-size: 18px;
  cursor: pointer;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}

.stat-card { text-align: center; padding: 16px; }
.stat-card.highlight { border-color: var(--primary); background: rgba(239, 68, 68, 0.1); }
.stat-value { display: block; font-size: 28px; font-weight: 800; }
.stat-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }

.quick-create-section { margin-bottom: 24px; }

.quick-create-card {
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
}

.qc-icon {
  width: 56px; height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  border-radius: 14px;
  font-size: 28px;
  box-shadow: 0 0 30px var(--primary-glow);
}

.qc-text h3 { font-size: 16px; font-weight: 600; margin-bottom: 4px; }
.qc-text p { font-size: 13px; color: var(--text-muted); }
.qc-text + .icon { margin-left: auto; font-size: 24px; color: var(--text-muted); }

.projects-section { margin-bottom: 100px; }
.section-title { font-size: 18px; font-weight: 600; margin-bottom: 16px; }

.project-card {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 12px;
  cursor: pointer;
}

.project-thumb {
  width: 56px; height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  font-size: 24px;
}

.project-info { flex: 1; }
.project-info h4 { font-size: 15px; font-weight: 600; margin-bottom: 4px; }
.project-info p { font-size: 13px; color: var(--text-muted); }

.project-status {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
}

.project-status[data-status="ready"] { color: var(--accent-green); font-size: 20px; }
.project-status[data-status="draft"] { font-size: 12px; color: var(--text-muted); }

.progress-ring { position: relative; width: 36px; height: 36px; }
.progress-ring svg { transform: rotate(-90deg); }
.progress-ring span {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
}

/* =============== BOTTOM NAV =============== */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 430px;
  display: flex;
  justify-content: space-around;
  padding: 12px 20px 30px;
  background: rgba(10, 10, 15, 0.9);
  backdrop-filter: blur(20px);
  border-top: 1px solid var(--border-subtle);
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.nav-item span:first-child { font-size: 22px; }
.nav-item.active { color: var(--primary); }
.nav-item.active span:first-child { filter: drop-shadow(0 0 8px var(--primary-glow)); }

/* =============== WIZARD =============== */
.wizard-screen { padding-top: 60px; }

.wizard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.wizard-header .back-btn {
  position: relative;
  top: auto; left: auto;
  width: auto; height: auto;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 500;
}

.step-indicator { display: flex; align-items: center; gap: 12px; }
.step-indicator span { font-size: 14px; font-weight: 600; color: var(--text-secondary); }

.step-bar {
  width: 120px; height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.step-progress {
  height: 100%;
  background: linear-gradient(90deg, var(--primary), var(--primary-light));
  border-radius: 2px;
  transition: width 0.3s ease;
}

.cancel-btn {
  width: 36px; height: 36px;
  background: transparent;
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  color: var(--text-muted);
  font-size: 18px;
  cursor: pointer;
}

.step-header { margin-bottom: 24px; }
.step-header h2 { font-size: 24px; font-weight: 700; margin-bottom: 8px; }
.step-header p { color: var(--text-secondary); font-size: 14px; }
.step-content { margin-bottom: 24px; }

/* Map Step */
.large-map-mock {
  position: relative;
  height: 450px;
  border-radius: 20px;
  overflow: hidden;
  padding: 0;
}

.mock-search-bar { position: absolute; top: 16px; left: 16px; right: 16px; z-index: 10; }
.search-input { border-radius: 12px; padding: 14px 16px; font-size: 14px; }

.mock-map-area {
  position: absolute;
  inset: 0;
  background: 
    linear-gradient(rgba(20, 30, 40, 0.95), rgba(20, 30, 40, 0.95)),
    repeating-linear-gradient(0deg, transparent, transparent 30px, rgba(255,255,255,0.02) 30px, rgba(255,255,255,0.02) 31px),
    repeating-linear-gradient(90deg, transparent, transparent 30px, rgba(255,255,255,0.02) 30px, rgba(255,255,255,0.02) 31px);
}

.mock-pin {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  font-size: 40px;
  z-index: 5;
}

.mock-pin.pulse::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: var(--primary);
  opacity: 0;
  animation: pin-pulse 2s infinite;
}

.mock-drone-path.animated { top: 45%; left: 15%; width: 70%; }

.mock-parcel-outline {
  position: absolute;
  top: 35%; left: 30%;
  width: 40%; height: 30%;
  border: 3px solid var(--primary);
  border-radius: 4px;
  box-shadow: 0 0 30px var(--primary-glow);
}

.map-floating-controls {
  position: absolute;
  bottom: 20px; right: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.map-floating-controls button {
  width: 44px; height: 44px;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  color: white;
  font-size: 20px;
  cursor: pointer;
}

/* Upload Step */
.upload-zone {
  text-align: center;
  padding: 40px 20px;
  border: 2px dashed var(--border-light);
  border-radius: 20px;
  margin-bottom: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.upload-zone:hover { border-color: var(--primary); background: rgba(239, 68, 68, 0.05); }
.upload-icon { font-size: 48px; margin-bottom: 16px; }
.upload-zone h3 { font-size: 18px; margin-bottom: 8px; }
.upload-zone p { color: var(--text-secondary); font-size: 14px; margin-bottom: 16px; }
.upload-hint { font-size: 12px; color: var(--text-muted); margin-top: 12px; }
.preview-zone { padding: 16px; }
.preview-zone h4 { font-size: 14px; font-weight: 600; margin-bottom: 12px; color: var(--text-secondary); }

.geojson-preview { display: flex; flex-direction: column; gap: 8px; }
.json-line { height: 14px; background: rgba(255, 255, 255, 0.05); border-radius: 4px; }
.json-line:nth-child(2) { width: 80%; }
.json-line:nth-child(3) { width: 90%; }
.json-line:nth-child(4) { width: 70%; }
.json-line.highlight { width: 85%; background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.3); }

/* Drone Step */
.drone-preview {
  position: relative;
  height: 280px;
  border-radius: 20px;
  overflow: hidden;
  padding: 0;
  margin-bottom: 16px;
}

.mock-drone-map {
  position: absolute;
  inset: 0;
  background: 
    linear-gradient(rgba(20, 30, 40, 0.95), rgba(20, 30, 40, 0.95)),
    repeating-linear-gradient(0deg, transparent, transparent 20px, rgba(255,255,255,0.015) 20px, rgba(255,255,255,0.015) 21px),
    repeating-linear-gradient(90deg, transparent, transparent 20px, rgba(255,255,255,0.015) 20px, rgba(255,255,255,0.015) 21px);
}

.drone-icon {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  font-size: 36px;
  filter: drop-shadow(0 0 10px var(--primary-glow));
}

.drone-icon.animated { animation: drone-hover 2s ease-in-out infinite; }

.drone-trail {
  position: absolute;
  top: 30%; left: 20%;
  width: 60%; height: 40%;
  border: 2px solid var(--primary);
  border-radius: 50%;
  opacity: 0.3;
}

.drone-settings { padding: 20px; }
.setting-group { margin-bottom: 24px; }
.setting-group:last-child { margin-bottom: 0; }
.setting-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 12px;
  color: var(--text-secondary);
}

.slider-container { display: flex; align-items: center; gap: 16px; }

.glass-slider {
  flex: 1;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  appearance: none;
  cursor: pointer;
}

.glass-slider::-webkit-slider-thumb {
  appearance: none;
  width: 20px; height: 20px;
  background: var(--primary);
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 0 10px var(--primary-glow);
}

.slider-value { min-width: 60px; text-align: right; font-size: 14px; font-weight: 600; color: var(--primary); }

.stepper-container {
  display: flex;
  align-items: center;
  gap: 16px;
  background: rgba(255, 255, 255, 0.05);
  padding: 8px 16px;
  border-radius: 12px;
  width: fit-content;
}

.stepper-container button {
  width: 32px; height: 32px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 18px;
  cursor: pointer;
}

.stepper-container span { font-size: 18px; font-weight: 600; min-width: 30px; text-align: center; }

/* AI Step */
.voice-select { margin-bottom: 16px; }
.voice-select h4, .text-preview h4, .environment-select h4 {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--text-secondary);
}

.voice-options { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }

.voice-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 8px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.voice-card.selected { border-color: var(--primary); background: rgba(239, 68, 68, 0.1); }
.voice-card span:first-child { font-size: 24px; }
.voice-name { font-size: 13px; font-weight: 600; }
.voice-gender { font-size: 11px; color: var(--text-muted); }

.voice-check {
  position: absolute;
  top: 8px; right: 8px;
  width: 20px; height: 20px;
  background: var(--primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.text-preview { margin-bottom: 16px; }
.glass-textarea { min-height: 100px; }

.env-chips { display: flex; flex-wrap: wrap; gap: 8px; }

.env-chip {
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-subtle);
  border-radius: 20px;
  font-size: 13px;
}

/* Preview Step */
.video-preview-container { margin-bottom: 16px; }
.video-player-card { padding: 0; overflow: hidden; }

.video-screen {
  position: relative;
  aspect-ratio: 9/16;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.video-thumbnail {
  position: absolute;
  inset: 0;
  background: 
    linear-gradient(rgba(20, 30, 40, 0.9), rgba(20, 30, 40, 0.9)),
    repeating-linear-gradient(0deg, transparent, transparent 15px, rgba(255,255,255,0.02) 15px, rgba(255,255,255,0.02) 16px),
    repeating-linear-gradient(90deg, transparent, transparent 15px, rgba(255,255,255,0.02) 15px, rgba(255,255,255,0.02) 16px);
}

.video-overlay { position: absolute; inset: 0; background: rgba(0, 0, 0, 0.3); }

.play-button-large {
  position: relative;
  z-index: 1;
  width: 70px; height: 70px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  cursor: pointer;
}

.video-time {
  position: absolute;
  bottom: 16px; right: 16px;
  padding: 6px 12px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
}

.video-meta { padding: 16px; }
.video-meta h3 { font-size: 16px; margin-bottom: 4px; }
.video-meta p { font-size: 13px; color: var(--text-muted); }

.render-settings { display: flex; flex-direction: column; gap: 12px; }

.format-option {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  cursor: pointer;
}

.format-option.selected { border-color: var(--primary); background: rgba(239, 68, 68, 0.1); }
.format-option span:first-child { font-size: 24px; }
.format-option div span { display: block; font-size: 14px; font-weight: 600; }
.format-option div small { font-size: 12px; color: var(--text-muted); }

/* Wizard Nav */
.wizard-nav {
  display: flex;
  gap: 12px;
  justify-content: space-between;
  margin-top: 24px;
  padding-bottom: 100px;
}

.wizard-nav .gradient-btn { flex: 1; justify-content: center; }

.bottom-nav.mini {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 430px;
  padding: 16px 20px 40px;
  background: transparent;
  border: none;
  backdrop-filter: none;
  justify-content: center;
  gap: 20px;
}

.mini-step {
  width: 12px; height: 12px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mini-step.active { background: var(--primary); box-shadow: 0 0 10px var(--primary-glow); }
.mini-step.done { background: var(--primary); }
.mini-step.done span { font-size: 10px; }

/* =============== RENDERING =============== */
.rendering-screen {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}

.render-container { width: 100%; }
.render-progress-card { text-align: center; padding: 40px 30px; }

.render-animation {
  position: relative;
  width: 120px; height: 120px;
  margin: 0 auto 30px;
}

.processing-ring {
  position: absolute;
  inset: 0;
  border: 3px solid transparent;
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1.5s linear infinite;
}

.drone-mini {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  font-size: 32px;
  filter: drop-shadow(0 0 10px var(--primary-glow));
}

.render-progress-card h2 { font-size: 22px; margin-bottom: 8px; }

.progress-percentage {
  font-size: 48px;
  font-weight: 800;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 16px;
}

.progress-bar-container {
  width: 100%; height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 30px;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary), var(--primary-light));
  border-radius: 3px;
  transition: width 0.5s ease;
}

.render-steps { text-align: left; margin-bottom: 24px; }

.render-step {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-subtle);
  font-size: 14px;
  color: var(--text-muted);
}

.render-step:last-child { border: none; }
.render-step.done span:first-child { color: var(--accent-green); }
.render-step.active span:first-child { color: var(--primary); }
.render-step.active { color: var(--text-primary); }

.eta-text { font-size: 13px; color: var(--text-muted); margin-bottom: 20px; }

/* =============== PREVIEW =============== */
.preview-screen { padding-top: 20px; }
.preview-container { display: flex; flex-direction: column; gap: 16px; }
.video-player-card { cursor: pointer; }

.preview-actions {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 10px;
}

.download-btn { font-size: 14px; }

.branding-panel h4 { font-size: 14px; font-weight: 600; margin-bottom: 12px; color: var(--text-secondary); }
.branding-toggles { display: flex; flex-direction: column; gap: 12px; }
.toggle-row { display: flex; justify-content: space-between; align-items: center; font-size: 14px; }

.toggle {
  width: 48px; height: 28px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  position: relative;
  cursor: pointer;
  transition: all 0.3s ease;
}

.toggle::after {
  content: '';
  position: absolute;
  top: 4px; left: 4px;
  width: 20px; height: 20px;
  background: var(--text-muted);
  border-radius: 50%;
  transition: all 0.3s ease;
}

.toggle.on { background: var(--primary); }
.toggle.on::after { left: 24px; background: white; }

.consultant-card { display: flex; align-items: center; gap: 16px; }

.consultant-avatar {
  width: 60px; height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 14px;
  font-size: 28px;
}

.consultant-info { flex: 1; }
.consultant-info h4 { font-size: 16px; margin-bottom: 4px; }
.consultant-info p { font-size: 13px; color: var(--text-muted); }

.edit-consultant-btn {
  width: 36px; height: 36px;
  background: transparent;
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  color: var(--text-muted);
  font-size: 16px;
  cursor: pointer;
}

/* =============== SUBSCRIPTION =============== */
.subscription-screen { padding-top: 60px; }

.sub-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.sub-header .back-btn { position: relative; top: auto; left: auto; }
.sub-header h2 { font-size: 20px; font-weight: 700; }

.current-credits { text-align: center; padding: 30px; margin-bottom: 24px; }

.credit-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 8px;
}

.credit-icon-large { font-size: 48px; color: var(--primary); }

.credit-number {
  display: block;
  font-size: 56px;
  font-weight: 800;
  background: linear-gradient(135deg, var(--primary) 0%, #ff8c00 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.credit-text { font-size: 14px; color: var(--text-muted); }

.packages-grid { display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px; }
.package-card { position: relative; }
.package-card.featured { border-color: var(--primary); background: rgba(239, 68, 68, 0.08); }

.package-badge {
  display: inline-block;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 16px;
}

.package-badge.highlight { background: var(--primary); }
.package-price { margin-bottom: 16px; }
.package-price .currency { font-size: 20px; font-weight: 600; vertical-align: top; }
.package-price .amount { font-size: 40px; font-weight: 800; }
.package-price .period { font-size: 14px; color: var(--text-muted); }

.package-features { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
.package-features span { font-size: 14px; color: var(--text-secondary); }
.package-card .gradient-btn { width: 100%; justify-content: center; }

.usage-history h4 { font-size: 14px; font-weight: 600; margin-bottom: 12px; color: var(--text-secondary); }
.history-list { display: flex; flex-direction: column; }

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-subtle);
  font-size: 14px;
}

.history-item:last-child { border: none; }
.history-item .cost { color: var(--primary); font-weight: 600; }

/* =============== PROFILE =============== */
.profile-screen { padding-top: 60px; }

.profile-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.profile-header .back-btn { position: relative; top: auto; left: auto; }
.profile-header h2 { font-size: 20px; font-weight: 700; }

.avatar-section { text-align: center; margin-bottom: 24px; }

.avatar-large {
  width: 100px; height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 24px;
  font-size: 48px;
  margin: 0 auto 16px;
}

.change-avatar-btn {
  padding: 10px 20px;
  background: transparent;
  border: 1px solid var(--border-light);
  border-radius: 10px;
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
}

.profile-form { margin-bottom: 16px; }
.save-btn { width: 100%; justify-content: center; margin-top: 8px; }
.branding-defaults { margin-bottom: 16px; }
.menu-section { padding: 0; }

.menu-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-subtle);
  font-size: 15px;
  cursor: pointer;
  transition: background 0.3s ease;
}

.menu-item:last-child { border: none; }
.menu-item:hover { background: var(--bg-glass-hover); }
.menu-item.danger { color: var(--primary); }
`;

// ==========================================
// UTILITY COMPONENTS
// ==========================================
const GlassPanel = ({ children, className = '', style = {}, onClick }) => 
  createElement('div', {
    className: `glass-panel ${className}`,
    style: {
      background: 'rgba(255, 255, 255, 0.03)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.06)',
      borderRadius: '16px',
      ...style
    },
    onClick
  }, children);

const GradientButton = ({ children, variant = 'primary', className = '', style = {}, onClick }) => {
  const variants = {
    primary: {
      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      boxShadow: '0 0 30px rgba(239, 68, 68, 0.4)',
    },
    ghost: {
      background: 'transparent',
      border: '1px solid rgba(255, 255, 255, 0.1)',
    }
  };
  return createElement('button', {
    className: `gradient-btn ${className}`,
    style: { ...variants[variant], ...style },
    onClick
  }, children);
};

// ==========================================
// SCREEN 1: LANDING PAGE
// ==========================================
const LandingScreen = ({ onNavigate }) => {
  return createElement('div', { className: 'screen landing-screen' },
    createElement('div', { className: 'bg-animation' },
      createElement('div', { className: 'grid-overlay' }),
      createElement('div', { className: 'gradient-orb orb-1' }),
      createElement('div', { className: 'gradient-orb orb-2' }),
    ),
    
    createElement('div', { className: 'landing-header' },
      createElement('div', { className: 'logo' },
        createElement('span', { className: 'logo-icon' }, '◉'),
        createElement('span', { className: 'logo-text' }, 'SanalParsel')
      ),
      createElement(GradientButton, { variant: 'ghost', onClick: () => onNavigate('login') }, 'Giriş Yap')
    ),
    
    createElement('div', { className: 'landing-hero' },
      createElement('div', { className: 'hero-badge' },
        createElement('span', { className: 'badge-dot' }),
        'Premium GIS Teknolojisi'
      ),
      createElement('h1', { className: 'hero-title' },
        'Emlak Videolarını',
        createElement('span', { className: 'gradient-text' }, ' Sinematik Hale Getir')
      ),
      createElement('p', { className: 'hero-subtitle' },
        'Drone görüntüleri, yapay zeka seslendirme ve premium harita animasyonları ile emlak sunumlarınızı dönüştürün.'
      ),
      createElement('div', { className: 'hero-cta' },
        createElement(GradientButton, { onClick: () => onNavigate('register') }, '＋ Ücretsiz Dene'),
        createElement('button', { className: 'secondary-btn', onClick: () => onNavigate('dashboard') }, '▶ Demo İzle')
      )
    ),
    
    createElement('div', { className: 'features-grid' },
      ['Drone Path Animasyonu', 'AI Seslendirme', 'Premium GIS Haritası', 'Cinematic Render'].map((feature, i) =>
        createElement(GlassPanel, { key: i, className: 'feature-card' },
          createElement('div', { className: 'feature-icon' }, ['◎', '🎤', '⬡', '▶'][i]),
          createElement('h3', null, feature),
          createElement('p', null, ['Drone rotalı sinematik geçişler', 'OpenRouter AI ile Türkçe', 'Apple Maps + Tesla UI', '4K MP4 çıktı'][i])
        )
      )
    ),
    
    createElement('div', { className: 'map-preview-container' },
      createElement(GlassPanel, { className: 'map-preview-mock', style: { padding: 0 } },
        createElement('div', { className: 'mock-map-bg' }),
        createElement('div', { className: 'mock-drone-path animated' }),
        createElement('div', { className: 'mock-parcel' }),
        createElement('div', { className: 'mock-floating-controls' },
          createElement('button', null, '⊕'),
          createElement('button', null, '⊖'),
        ),
        createElement('div', { className: 'mock-bottom-sheet' },
          createElement('div', { className: 'sheet-handle' }),
          createElement('div', { className: 'mock-content' }),
        )
      )
    )
  );
};

// ==========================================
// SCREEN 2: LOGIN / REGISTER
// ==========================================
const AuthScreen = ({ mode, onNavigate }) => {
  const isLogin = mode === 'login';
  return createElement('div', { className: 'screen auth-screen' },
    createElement('button', { className: 'back-btn', onClick: () => onNavigate('landing') }, '✕'),
    
    createElement('div', { className: 'auth-logo' },
      createElement('span', { className: 'logo-icon' }, '◉'),
      createElement('span', { className: 'logo-text' }, 'SanalParsel')
    ),
    
    createElement(GlassPanel, { className: 'auth-card' },
      createElement('h2', { className: 'auth-title' }, isLogin ? 'Hoş Geldiniz' : 'Hesap Oluşturun'),
      createElement('p', { className: 'auth-subtitle' }, isLogin ? 'Emlak videolarınızı oluşturmaya başlayın' : '5 ücretsiz kredi ile başlayın'),
      
      createElement('form', { className: 'auth-form' },
        !isLogin && createElement('div', { className: 'form-group' },
          createElement('label', null, 'Ad Soyad'),
          createElement('input', { type: 'text', placeholder: 'Mehmet Yılmaz', className: 'glass-input' })
        ),
        createElement('div', { className: 'form-group' },
          createElement('label', null, 'E-posta'),
          createElement('input', { type: 'email', placeholder: 'mehmet@emlak.com', className: 'glass-input' })
        ),
        createElement('div', { className: 'form-group' },
          createElement('label', null, 'Şifre'),
          createElement('input', { type: 'password', placeholder: '••••••••', className: 'glass-input' })
        ),
        isLogin && createElement('div', { className: 'forgot-link' },
          createElement('a', { href: '#' }, 'Şifremi unuttum?')
        ),
        createElement(GradientButton, { className: 'auth-submit-btn' }, isLogin ? 'Giriş Yap' : 'Hesap Oluştur')
      ),
      
      createElement('div', { className: 'auth-divider' }, createElement('span', null, 'veya')),
      createElement('button', { className: 'secondary-btn full-width' }, 'Google ile devam et'),
      
      createElement('p', { className: 'auth-switch' },
        isLogin ? 'Hesabınız yok mu? ' : 'Zaten hesabınız var mı? ',
        createElement('a', { onClick: () => onNavigate(isLogin ? 'register' : 'login') }, isLogin ? 'Kayıt olun' : 'Giriş yapın')
      )
    )
  );
};

// ==========================================
// SCREEN 3: DASHBOARD
// ==========================================
const DashboardScreen = ({ onNavigate }) => {
  const projects = [
    { id: 1, name: 'Merkez Kentsel Dönüşüm', address: 'Atatürk Cad. No:42, İstanbul', status: 'ready', thumb: '🌆' },
    { id: 2, name: 'Coastal Villas', address: 'Sahil Yolu 18, Antalya', status: 'rendering', thumb: '🏖️', progress: 67 },
    { id: 3, name: 'Lakeside Residence', address: 'Göl Kenarı Sok. 7, Ankara', status: 'draft', thumb: '🏡' },
  ];
  
  return createElement('div', { className: 'screen dashboard-screen' },
    createElement('div', { className: 'dash-header' },
      createElement('div', { className: 'user-greeting' },
        createElement('span', { className: 'greeting-text' }, 'Merhaba'),
        createElement('h2', null, 'Mehmet 👋')
      ),
      createElement('div', { className: 'header-actions' },
        createElement(GlassPanel, { className: 'credits-badge' },
          createElement('span', { className: 'credit-icon' }, '◉'),
          createElement('span', { className: 'credit-count' }, '12'),
          createElement('span', { className: 'credit-label' }, 'kredi')
        ),
        createElement('button', { className: 'notif-btn' }, '🔔')
      )
    ),
    
    createElement('div', { className: 'stats-row' },
      createElement(GlassPanel, { className: 'stat-card' },
        createElement('span', { className: 'stat-value' }, '24'),
        createElement('span', { className: 'stat-label' }, 'Toplam Video')
      ),
      createElement(GlassPanel, { className: 'stat-card' },
        createElement('span', { className: 'stat-value' }, '8'),
        createElement('span', { className: 'stat-label' }, 'Bu Ay')
      ),
      createElement(GlassPanel, { className: 'stat-card highlight' },
        createElement('span', { className: 'stat-value' }, '3'),
        createElement('span', { className: 'stat-label' }, 'İşleniyor')
      )
    ),
    
    createElement('div', { className: 'quick-create-section' },
      createElement(GlassPanel, { className: 'quick-create-card', onClick: () => onNavigate('wizard') },
        createElement('div', { className: 'qc-icon' }, '＋'),
        createElement('div', { className: 'qc-text' },
          createElement('h3', null, 'Yeni Proje Oluştur'),
          createElement('p', null, '5 dakikada profesyonel emlak videosu')
        ),
        createElement('span', null, '›')
      )
    ),
    
    createElement('div', { className: 'projects-section' },
      createElement('h3', { className: 'section-title' }, 'Son Projeler'),
      projects.map(proj => 
        createElement(GlassPanel, { key: proj.id, className: 'project-card', onClick: () => onNavigate('preview') },
          createElement('div', { className: 'project-thumb' }, proj.thumb),
          createElement('div', { className: 'project-info' },
            createElement('h4', null, proj.name),
            createElement('p', null, proj.address)
          ),
          createElement('div', { className: 'project-status', 'data-status': proj.status },
            proj.status === 'ready' && createElement('span', null, '✓'),
            proj.status === 'rendering' && createElement('div', { className: 'progress-ring' },
              createElement('span', null, `${proj.progress}%`)
            ),
            proj.status === 'draft' && createElement('span', null, 'Taslak')
          )
        )
      )
    ),
    
    createElement('div', { className: 'bottom-nav' },
      [{ name: 'home', label: 'Ana Sayfa', icon: '⌂' }, { name: 'plus', label: 'Yeni Proje', icon: '＋' }, { name: 'credit', label: 'Krediler', icon: '◉' }, { name: 'user', label: 'Profil', icon: '◯' }].map((item, i) =>
        createElement('button', { key: i, className: `nav-item ${item.name === 'home' ? 'active' : ''}`, onClick: item.name === 'credit' ? () => onNavigate('subscription') : item.name === 'user' ? () => onNavigate('profile') : undefined },
          createElement('span', null, item.icon),
          createElement('span', null, item.label)
        )
      )
    )
  );
};

// ==========================================
// SCREEN 4: PROJECT WIZARD
// ==========================================
const WizardScreen = ({ step, onNavigate }) => {
  const steps = ['Harita Seç', 'GeoJSON', 'Drone Ayarları', 'AI Ses', 'Önizleme'];
  const stepIndex = parseInt(step) || 1;
  
  return createElement('div', { className: 'screen wizard-screen' },
    createElement('div', { className: 'wizard-header' },
      createElement('button', { className: 'back-btn', onClick: () => stepIndex > 1 ? onNavigate('wizard', stepIndex - 1) : onNavigate('dashboard') }, '← Geri'),
      createElement('div', { className: 'step-indicator' },
        createElement('span', null, `${stepIndex}/${steps.length}`),
        createElement('div', { className: 'step-bar' },
          createElement('div', { className: 'step-progress', style: { width: `${(stepIndex/steps.length)*100}%` } })
        )
      ),
      createElement('button', { className: 'cancel-btn' }, '✕')
    ),
    
    createElement('div', { className: 'step-header' },
      createElement('h2', null, steps[stepIndex - 1]),
      createElement('p', null, { 1: 'Parsel konumunu haritadan seçin', 2: 'GeoJSON dosyası yükleyin', 3: 'Drone uçuş rotanızı ayarlayın', 4: 'Yapay zeka seslendirme tercihleri', 5: 'Video çıktınızı önizleyin' }[stepIndex])
    ),
    
    createElement('div', { className: 'step-content' },
      stepIndex === 1 && createElement('div', { className: 'map-step' },
        createElement(GlassPanel, { className: 'large-map-mock', style: { padding: 0 } },
          createElement('div', { className: 'mock-search-bar' },
            createElement('input', { className: 'glass-input search-input', placeholder: 'Adres ara...', value: 'İstanbul, Ataşehir' })
          ),
          createElement('div', { className: 'mock-map-area' }),
          createElement('div', { className: 'mock-pin pulse' }, '📍'),
          createElement('div', { className: 'mock-drone-path animated' }),
          createElement('div', { className: 'mock-parcel-outline' }),
          createElement('div', { className: 'map-floating-controls' },
            createElement('button', null, '⊕'),
            createElement('button', null, '⊖'),
            createElement('button', null, '⟳'),
          )
        )
      ),
      
      stepIndex === 2 && createElement('div', { className: 'upload-step' },
        createElement(GlassPanel, { className: 'upload-zone' },
          createElement('div', { className: 'upload-icon' }, '📐'),
          createElement('h3', null, 'GeoJSON Dosyası Yükle'),
          createElement('p', null, 'Parsel sınırlarınızı içeren dosyayı sürükle & bırak veya seç'),
          createElement('button', { className: 'secondary-btn' }, 'Dosya Seç'),
          createElement('p', { className: 'upload-hint' }, 'Desteklenen: .geojson, .json')
        ),
        createElement(GlassPanel, { className: 'preview-zone' },
          createElement('h4', null, 'Önizleme'),
          createElement('div', { className: 'geojson-preview' },
            createElement('div', { className: 'json-line' }),
            createElement('div', { className: 'json-line' }),
            createElement('div', { className: 'json-line highlight' }),
            createElement('div', { className: 'json-line' }),
          )
        )
      ),
      
      stepIndex === 3 && createElement('div', { className: 'drone-step' },
        createElement(GlassPanel, { className: 'drone-preview', style: { padding: 0 } },
          createElement('div', { className: 'mock-drone-map' }),
          createElement('div', { className: 'drone-icon animated' }, '⎋'),
          createElement('div', { className: 'drone-trail' }),
        ),
        createElement(GlassPanel, { className: 'drone-settings' },
          createElement('div', { className: 'setting-group' },
            createElement('label', null, 'Uçuş Yüksekliği'),
            createElement('div', { className: 'slider-container' },
              createElement('input', { type: 'range', min: 50, max: 500, value: 120, className: 'glass-slider' }),
              createElement('span', { className: 'slider-value' }, '120m')
            )
          ),
          createElement('div', { className: 'setting-group' },
            createElement('label', null, 'Uçuş Hızı'),
            createElement('div', { className: 'slider-container' },
              createElement('input', { type: 'range', min: 1, max: 10, value: 5, className: 'glass-slider' }),
              createElement('span', { className: 'slider-value' }, '5 m/s')
            )
          ),
          createElement('div', { className: 'setting-group' },
            createElement('label', null, 'Döngü Sayısı'),
            createElement('div', { className: 'stepper-container' },
              createElement('button', null, '−'),
              createElement('span', null, '3'),
              createElement('button', null, '＋')
            )
          )
        )
      ),
      
      stepIndex === 4 && createElement('div', { className: 'ai-step' },
        createElement(GlassPanel, { className: 'voice-select' },
          createElement('h4', null, 'AI Ses Seçimi'),
          createElement('div', { className: 'voice-options' },
            [{ name: 'Ayşe', gender: 'Kadın', active: true }, { name: 'Mehmet', gender: 'Erkek', active: false }, { name: 'Zeynep', gender: 'Kadın', active: false }].map((v, i) =>
              createElement('div', { key: i, className: `voice-card ${v.active ? 'selected' : ''}` },
                createElement('span', null, '🎤'),
                createElement('span', { className: 'voice-name' }, v.name),
                createElement('span', { className: 'voice-gender' }, v.gender),
                v.active && createElement('span', { className: 'voice-check' }, '✓')
              )
            )
          )
        ),
        createElement(GlassPanel, { className: 'text-preview' },
          createElement('h4', null, 'Video Metni'),
          createElement('textarea', { className: 'glass-textarea', placeholder: 'Video metninizi buraya yazın...' })
        ),
        createElement(GlassPanel, { className: 'environment-select' },
          createElement('h4', null, 'Çevre Analizi'),
          createElement('div', { className: 'env-chips' },
            ['🏥 Hastane', '🏫 Okul', '🛒 Market', '🏖️ Plaj', '🛣️ Otoyol'].map((env, i) =>
              createElement('div', { key: i, className: 'env-chip' }, env)
            )
          )
        )
      ),
      
      stepIndex === 5 && createElement('div', { className: 'preview-step' },
        createElement(GlassPanel, { className: 'video-preview-container', style: { padding: 0 } },
          createElement('div', { className: 'video-screen' },
            createElement('div', { className: 'video-thumbnail' }),
            createElement('div', { className: 'video-overlay' }),
            createElement('div', { className: 'play-button-large' }, '▶'),
            createElement('div', { className: 'video-time' }, '02:30')
          ),
          createElement('div', { className: 'video-meta' },
            createElement('h3', null, 'Merkez Kentsel Dönüşüm'),
            createElement('p', null, '📍 Ataşehir, İstanbul • 🎬 1080x1920')
          )
        ),
        createElement(GlassPanel, { className: 'render-settings' },
          createElement('div', { className: 'format-option selected' },
            createElement('span', null, '🎬'),
            createElement('div', null,
              createElement('span', null, '1080x1920'),
              createElement('small', null, 'Dikey (Sosyal Medya)')
            )
          ),
          createElement('div', { className: 'format-option' },
            createElement('span', null, '🎥'),
            createElement('div', null,
              createElement('span', null, '1920x1080'),
              createElement('small', null, 'Yatay (YouTube)')
            )
          )
        )
      )
    ),
    
    createElement('div', { className: 'wizard-nav' },
      stepIndex > 1 && createElement(GradientButton, { variant: 'ghost', onClick: () => onNavigate('wizard', stepIndex - 1) }, '← Geri'),
      createElement(GradientButton, { onClick: () => onNavigate('wizard', stepIndex < steps.length ? stepIndex + 1 : 'rendering') },
        stepIndex < steps.length ? 'Devam →' : '▶ Render Et'
      )
    ),
    
    createElement('div', { className: 'bottom-nav mini' },
      steps.map((s, i) =>
        createElement('div', { key: i, className: `mini-step ${i + 1 === stepIndex ? 'active' : ''} ${i + 1 < stepIndex ? 'done' : ''}` })
      )
    )
  );
};

// ==========================================
// SCREEN 5: RENDERING PROGRESS
// ==========================================
const RenderingScreen = ({ onNavigate }) => {
  return createElement('div', { className: 'screen rendering-screen' },
    createElement('div', { className: 'render-container' },
      createElement(GlassPanel, { className: 'render-progress-card' },
        createElement('div', { className: 'render-animation' },
          createElement('div', { className: 'processing-ring' }),
          createElement('div', { className: 'drone-mini' }, '⎋')
        ),
        createElement('h2', null, 'Video Hazırlanıyor'),
        createElement('div', { className: 'progress-percentage' }, '67%'),
        createElement('div', { className: 'progress-bar-container' },
          createElement('div', { className: 'progress-bar-fill', style: { width: '67%' } })
        ),
        createElement('div', { className: 'render-steps' },
          ['Harita oluşturuldu', 'Drone animasyonu', 'AI seslendirme', 'Final render'].map((s, i) =>
            createElement('div', { key: i, className: `render-step ${i < 2 ? 'done' : i === 2 ? 'active' : 'pending'}` },
              createElement('span', null, i < 2 ? '✓' : i === 2 ? '◐' : '○'),
              createElement('span', null, s)
            )
          )
        ),
        createElement('p', { className: 'eta-text' }, 'Tahmini süre: ~3 dakika'),
        createElement(GradientButton, { variant: 'ghost' }, 'İşlemi İptal Et')
      )
    )
  );
};

// ==========================================
// SCREEN 6: VIDEO PREVIEW
// ==========================================
const PreviewScreen = ({ onNavigate }) => {
  return createElement('div', { className: 'screen preview-screen' },
    createElement('div', { className: 'preview-container' },
      createElement(GlassPanel, { className: 'video-player-card', style: { padding: 0 } },
        createElement('div', { className: 'video-screen' },
          createElement('div', { className: 'video-thumbnail' }),
          createElement('div', { className: 'video-overlay' }),
          createElement('div', { className: 'play-button-large' }, '▶'),
          createElement('div', { className: 'video-time' }, '02:30')
        ),
        createElement('div', { className: 'video-meta' },
          createElement('h3', null, 'Merkez Kentsel Dönüşüm'),
          createElement('p', null, '📍 Ataşehir, İstanbul • 🎬 1080x1920')
        )
      ),
      
      createElement('div', { className: 'preview-actions' },
        createElement(GradientButton, { className: 'download-btn' }, '↓ MP4 İndir'),
        createElement(GradientButton, { variant: 'ghost' }, '↗ Paylaş'),
        createElement(GradientButton, { variant: 'ghost' }, '⟳ Yeniden Oluştur')
      ),
      
      createElement(GlassPanel, { className: 'branding-panel' },
        createElement('h4', null, 'Branding Seçenekleri'),
        createElement('div', { className: 'branding-toggles' },
          [{ label: 'Profil Fotoğrafı', on: true }, { label: 'Ad Soyad', on: true }, { label: 'Telefon', on: true }, { label: 'E-posta', on: false }, { label: 'Web Sitesi', on: false }].map((opt, i) =>
            createElement('div', { key: i, className: 'toggle-row' },
              createElement('span', null, opt.label),
              createElement('div', { className: `toggle ${opt.on ? 'on' : ''}` })
            )
          )
        )
      ),
      
      createElement(GlassPanel, { className: 'consultant-card' },
        createElement('div', { className: 'consultant-avatar' }, '👤'),
        createElement('div', { className: 'consultant-info' },
          createElement('h4', null, 'Mehmet Yılmaz'),
          createElement('p', null, 'Premium Emlak Danışmanı'),
          createElement('p', null, '📱 +90 532 123 4567')
        ),
        createElement('button', { className: 'edit-consultant-btn' }, '✎')
      )
    ),
    
    createElement('div', { className: 'bottom-nav' },
      createElement('button', { className: 'nav-item', onClick: () => onNavigate('dashboard') },
        createElement('span', null, '⌂'),
        createElement('span', null, 'Ana Sayfa')
      ),
      createElement('button', { className: 'nav-item', onClick: () => onNavigate('wizard') },
        createElement('span', null, '＋'),
        createElement('span', null, 'Yeni Proje')
      ),
      createElement('button', { className: 'nav-item active' },
        createElement('span', null, '◯'),
        createElement('span', null, 'Profil')
      )
    )
  );
};

// ==========================================
// SCREEN 7: SUBSCRIPTION
// ==========================================
const SubscriptionScreen = ({ onNavigate }) => {
  return createElement('div', { className: 'screen subscription-screen' },
    createElement('div', { className: 'sub-header' },
      createElement('button', { className: 'back-btn', onClick: () => onNavigate('dashboard') }, '←'),
      createElement('h2', null, 'Kredi Paketleri')
    ),
    
    createElement(GlassPanel, { className: 'current-credits' },
      createElement('div', { className: 'credit-display' },
        createElement('span', { className: 'credit-icon-large' }, '◉'),
        createElement('div', null,
          createElement('span', { className: 'credit-number' }, '12'),
          createElement('span', { className: 'credit-text' }, 'Kredi Bakiyesi')
        )
      ),
      createElement('p', null, '1 video = 1 kredi')
    ),
    
    createElement('div', { className: 'packages-grid' },
      [{ name: 'Starter', price: 149, features: ['10 video', 'Temel sesler', '720p render'] }, 
       { name: 'Pro ⭐', price: 349, features: ['50 video', 'Tüm sesler', '4K render', 'Öncelikli destek'], featured: true },
       { name: 'Enterprise', price: 999, features: ['Sınırsız video', 'Özel sesler', 'API erişimi', 'Özel branding'] }].map((pkg, i) =>
        createElement(GlassPanel, { key: i, className: `package-card ${pkg.featured ? 'featured' : ''}` },
          createElement('div', { className: `package-badge ${pkg.featured ? 'highlight' : ''}` }, pkg.name),
          createElement('div', { className: 'package-price' },
            createElement('span', { className: 'currency' }, '₺'),
            createElement('span', { className: 'amount' }, pkg.price),
            createElement('span', { className: 'period' }, '/ay')
          ),
          createElement('div', { className: 'package-features' },
            pkg.features.map((f, j) => createElement('span', { key: j }, `✓ ${f}`))
          ),
          createElement(GradientButton, { variant: pkg.featured ? 'primary' : 'ghost' }, 'Satın Al')
        )
      )
    ),
    
    createElement(GlassPanel, { className: 'usage-history' },
      createElement('h4', null, 'Kullanım Geçmişi'),
      createElement('div', { className: 'history-list' },
        [{ date: 'Bugün', desc: 'Coastal Villas render', cost: -1 }, { date: 'Dün', desc: 'Merkez Kentsel Dönüşüm', cost: -1 }, { date: '2 gün önce', desc: 'Lakeside Residence', cost: -1 }].map((item, i) =>
          createElement('div', { key: i, className: 'history-item' },
            createElement('span', null, item.date),
            createElement('span', null, item.desc),
            createElement('span', { className: 'cost' }, `${item.cost} kredi`)
          )
        )
      )
    )
  );
};

// ==========================================
// SCREEN 8: PROFILE
// ==========================================
const ProfileScreen = ({ onNavigate }) => {
  return createElement('div', { className: 'screen profile-screen' },
    createElement('div', { className: 'profile-header' },
      createElement('button', { className: 'back-btn', onClick: () => onNavigate('dashboard') }, '←'),
      createElement('h2', null, 'Profil Ayarları')
    ),
    
    createElement(GlassPanel, { className: 'avatar-section' },
      createElement('div', { className: 'avatar-large' }, '👤'),
      createElement('button', { className: 'change-avatar-btn' }, 'Fotoğraf Değiştir')
    ),
    
    createElement(GlassPanel, { className: 'profile-form' },
      createElement('div', { className: 'form-group' },
        createElement('label', null, 'Ad Soyad'),
        createElement('input', { type: 'text', value: 'Mehmet Yılmaz', className: 'glass-input' })
      ),
      createElement('div', { className: 'form-group' },
        createElement('label', null, 'E-posta'),
        createElement('input', { type: 'email', value: 'mehmet@emlak.com', className: 'glass-input' })
      ),
      createElement('div', { className: 'form-group' },
        createElement('label', null, 'Telefon'),
        createElement('input', { type: 'tel', value: '+90 532 123 4567', className: 'glass-input' })
      ),
      createElement('div', { className: 'form-group' },
        createElement('label', null, 'Web Sitesi'),
        createElement('input', { type: 'url', placeholder: 'https://', className: 'glass-input' })
      ),
      createElement(GradientButton, { className: 'save-btn' }, 'Değişiklikleri Kaydet')
    ),
    
    createElement(GlassPanel, { className: 'branding-defaults' },
      createElement('h4', null, 'Varsayılan Branding'),
      createElement('div', { className: 'branding-toggles' },
        [{ label: 'Profil Fotoğrafı', on: true }, { label: 'Ad Soyad', on: true }, { label: 'Telefon', on: true }, { label: 'E-posta', on: false }, { label: 'Web Sitesi', on: false }].map((opt, i) =>
          createElement('div', { key: i, className: 'toggle-row' },
            createElement('span', null, opt.label),
            createElement('div', { className: `toggle ${opt.on ? 'on' : ''}` })
          )
        )
      )
    ),
    
    createElement(GlassPanel, { className: 'menu-section' },
      createElement('div', { className: 'menu-item' }, createElement('span', null, '🔔 Bildirim Ayarları'), createElement('span', null, '›')),
      createElement('div', { className: 'menu-item' }, createElement('span', null, '💳 Ödeme Yöntemleri'), createElement('span', null, '›')),
      createElement('div', { className: 'menu-item' }, createElement('span', null, '📜 Kullanım Koşulları'), createElement('span', null, '›')),
      createElement('div', { className: 'menu-item danger' }, createElement('span', null, '🚪 Çıkış Yap'), createElement('span', null, '›'))
    )
  );
};

// ==========================================
// APP COMPONENT
// ==========================================
const App = () => {
  const [state, setState] = window.React ? window.React.useState({ screen: 'landing', param: null }) : [null];
  const [localState, setLocalState] = window.React ? [state, setState] : (() => {
    if (!window.__state) window.__state = { screen: 'landing', param: null };
    return [window.__state, (s, p) => { window.__state = { screen: s, param: p }; render(); }];
  })();
  
  const current = localState[0];
  const navigate = localState[1];
  
  const screens = {
    landing: createElement(LandingScreen, { onNavigate: navigate }),
    login: createElement(AuthScreen, { mode: 'login', onNavigate: navigate }),
    register: createElement(AuthScreen, { mode: 'register', onNavigate: navigate }),
    dashboard: createElement(DashboardScreen, { onNavigate: navigate }),
    wizard: createElement(WizardScreen, { step: current?.param || 1, onNavigate: navigate }),
    rendering: createElement(RenderingScreen, { onNavigate: navigate }),
    preview: createElement(PreviewScreen, { onNavigate: navigate }),
    subscription: createElement(SubscriptionScreen, { onNavigate: navigate }),
    profile: createElement(ProfileScreen, { onNavigate: navigate }),
  };
  
  return createElement('div', { className: 'app' }, screens[current?.screen || 'landing']);
};

// ==========================================
// RENDER
// ==========================================
function render() {
  const styleEl = document.getElementById('sanalparsel-styles');
  if (!styleEl) {
    const s = document.createElement('style');
    s.id = 'sanalparsel-styles';
    s.textContent = styles;
    document.head.appendChild(s);
  }
  
  const root = createRoot(document.getElementById('app'));
  root.render(createElement(App));
}

render();