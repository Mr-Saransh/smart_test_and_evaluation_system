/* ═══════════════════════════════════════════════
   HELPERS — Date, Currency, String Utilities
   ═══════════════════════════════════════════════ */

/** Returns today's date as YYYY-MM-DD */
export function today() {
  return new Date().toISOString().split('T')[0];
}

/** Format a date string to readable format: "15 Jul 2026" */
export function formatDate(raw) {
  if (!raw) return '—';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Format a date to relative time: "2 hours ago", "3 days ago" */
export function timeAgo(raw) {
  if (!raw) return '';
  const now = Date.now();
  const past = new Date(raw).getTime();
  const diff = now - past;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(raw);
}

/** Format time: "09:30" -> "9:30 AM" */
export function formatTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  if (isNaN(h)) return timeStr;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
}

/** Format timetable time: "09:30:00" -> "9:30" (24h short) */
export function ttFmt(t) {
  if (!t) return '';
  return t.slice(0, 5).replace(/^0/, '');
}

/** Format currency: 15000 -> "₹15,000" */
export function formatCurrency(amount, currency = 'INR') {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Format large numbers: 1248 -> "1.2K" */
export function formatMetric(val) {
  if (val === null || val === undefined) return '0';
  const num = Number(val);
  if (isNaN(num)) return '0';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return String(num);
}

/** Get initials from a name: "John Doe" -> "JD" */
export function getInitials(name) {
  if (!name) return 'AV';
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

/** Get greeting based on time of day */
export function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

/** Calculate percentage with 1 decimal */
export function calcPercent(part, total) {
  if (!total || total === 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}

/** Get attendance color based on percentage */
export function getAttendanceColor(pct) {
  if (pct >= 75) return '#10b981';
  if (pct >= 50) return '#f59e0b';
  return '#ef4444';
}

/** Get score color based on percentage */
export function getScoreColor(pct) {
  if (pct >= 80) return '#10b981';
  if (pct >= 60) return '#3b82f6';
  if (pct >= 40) return '#f59e0b';
  return '#ef4444';
}

/** Format file size: 1024 -> "1 KB" */
export function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

/** Truncate text with ellipsis */
export function truncate(str, maxLen = 60) {
  if (!str || str.length <= maxLen) return str || '';
  return str.slice(0, maxLen) + '…';
}

/** Debounce a value (standalone, for non-hook usage) */
export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/** Generate a short unique ID */
export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

/** Validate password strength */
export function validatePassword(password) {
  if (!password || password.length < 8) return { valid: false, message: 'At least 8 characters required' };
  if (!/[A-Z]/.test(password)) return { valid: false, message: 'Must include an uppercase letter' };
  if (!/[a-z]/.test(password)) return { valid: false, message: 'Must include a lowercase letter' };
  if (!/[0-9]/.test(password)) return { valid: false, message: 'Must include a number' };
  if (!/[^A-Za-z0-9]/.test(password)) return { valid: false, message: 'Must include a special character' };
  return { valid: true, message: 'Strong password' };
}

/** Get password strength as a percentage (0-100) */
export function passwordStrength(password) {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score += 20;
  if (password.length >= 12) score += 10;
  if (/[A-Z]/.test(password)) score += 20;
  if (/[a-z]/.test(password)) score += 15;
  if (/[0-9]/.test(password)) score += 15;
  if (/[^A-Za-z0-9]/.test(password)) score += 20;
  return Math.min(score, 100);
}

/** Parse question text from document format for bulk import */
export function parseQuestionsFromText(text) {
  const blocks = text.split(/\n\s*\n/).filter(Boolean);
  const questions = [];
  for (const block of blocks) {
    const lines = block.trim().split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 3) continue;
    const qLine = lines[0].replace(/^\d+[\.\)]\s*/, '');
    const opts = [];
    let correctIdx = null;
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const optMatch = line.match(/^([a-dA-D])[\.\)]\s*(.*)/);
      if (optMatch) {
        opts.push(optMatch[2].trim());
        if (line.includes('*') || line.includes('✓') || line.includes('correct')) {
          correctIdx = opts.length - 1;
        }
      }
    }
    if (qLine && opts.length >= 2) {
      questions.push({ text: qLine, options: opts, correct_index: correctIdx });
    }
  }
  return questions;
}

/** Parse answer key text like "1-A, 2-B, 3-C" */
export function parseAnswerKey(text) {
  const map = {};
  const pairs = text.split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
  for (const p of pairs) {
    const m = p.match(/(\d+)\s*[-:.]\s*([a-dA-D])/);
    if (m) map[Number(m[1])] = 'abcd'.indexOf(m[2].toLowerCase());
  }
  return map;
}

/** Day of week index (Monday=0) from JS Date.getDay() (Sunday=0) */
export function getMondayBasedDayIndex() {
  return (new Date().getDay() + 6) % 7;
}
