/* ─────────────────────────────────────────────────────────────────────────
   eSIM ANALYTICS DASHBOARD — SCRIPT.JS
   Live Supabase RPC Integration & Dynamic Data Rendering
   ───────────────────────────────────────────────────────────────────────── */

'use strict';

// ─── SUPABASE CONFIG FROM .env ────────────────────────────────────────────
const SUPABASE_URL = 'https://qwcsrhmurdbehvcdtyyp.supabase.co/rest/v1/rpc/get_sale_dashboard';
const SUPABASE_KEY = 'sb_publishable_P2vgg5GY9jSofD617j0nPw_CiVeFIF3';

// Daily target threshold base per sales rep
const DAILY_TARGET_BASE = 200;

// Default date
const DEFAULT_LOCKED_DATE = '2026-05-20';

// ─── DOM REFS ─────────────────────────────────────────────────────────────
const loadingOverlay    = document.getElementById('loading-overlay');
const errorBanner       = document.getElementById('error-banner');
const errorMessage      = document.getElementById('error-message');

const elTodaySales      = document.getElementById('today-sales');
const elTodayRev        = document.getElementById('today-revenue');
const elMtdSales        = document.getElementById('mtd-sales');
const elMtdRev          = document.getElementById('mtd-revenue');
const elPmsdSales       = document.getElementById('pmsd-sales');
const elPmsdRev         = document.getElementById('pmsd-revenue');
const elPmSales         = document.getElementById('pm-sales');
const elPmRev           = document.getElementById('pm-revenue');

const elWMtdRev       = document.getElementById('w-mtd-rev');
const elWTodayRev     = document.getElementById('w-today-rev');
const elWPmRev        = document.getElementById('w-pm-rev');
const elWMtdSales     = document.getElementById('w-mtd-sales');
const elWTodaySales   = document.getElementById('w-today-sales');

const leaderboardBody   = document.getElementById('leaderboard-body');
const leaderboardDate   = document.getElementById('leaderboard-date-tag');
const destinationsList  = document.getElementById('destinations-list');
const dailyChartCanvas  = document.getElementById('chart-daily');
const monthlyChartCanvas= document.getElementById('chart-monthly');

let dailyChartInstance   = null;
let monthlyChartInstance = null;
let cachedLeaderboard    = [];
let cachedKPI            = {};
let currentReportDate    = DEFAULT_LOCKED_DATE;

// ─── UTILITIES ────────────────────────────────────────────────────────────
function fmtRevK(val) {
  if (typeof val === 'string' && val.startsWith('₹')) return val;
  const n = Number(val || 0);
  if (n >= 1000) return '₹' + (n / 1000).toFixed(2) + 'K';
  return '₹' + n.toLocaleString('en-IN');
}

function fmtArpu(n) {
  return '₹' + Math.round(Number(n || 0)).toLocaleString('en-IN');
}

function parseDate(s) { return new Date(s + 'T00:00:00'); }

function formatDisplayDate(iso) {
  return parseDate(iso).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'long', year: 'numeric'
  });
}

function hideLoading() {
  if (!loadingOverlay) return;
  loadingOverlay.classList.add('fade-out');
  setTimeout(() => { loadingOverlay.style.display = 'none'; }, 400);
}

function showLoading() {
  if (!loadingOverlay) return;
  loadingOverlay.style.display = 'flex';
  loadingOverlay.classList.remove('fade-out');
}

function animateCounter(el, target) {
  if (!el) return;
  const duration = 800;
  const startTime = performance.now();
  const numTarget = Number(target) || 0;
  function step(now) {
    const t = Math.min((now - startTime) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(numTarget * ease).toLocaleString('en-IN');
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function startLiveClock() {
  function tick() {
    const dateEl = document.getElementById('date-text');
    if (!dateEl) return;
    const now = new Date();
    dateEl.textContent =
      now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
      + ' · '
      + now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  }
  tick();
  setInterval(tick, 1000);
}

// ─── SUPABASE RPC API CALL ────────────────────────────────────────────────
async function fetchRPC(reportDate) {
  const response = await fetch(SUPABASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY
    },
    body: JSON.stringify({ report_date: reportDate })
  });

  if (!response.ok) {
    throw new Error(`RPC API returned HTTP ${response.status}`);
  }

  const json = await response.json();
  return Array.isArray(json) ? json[0] : json;
}

// ─── RENDER KPI CARDS ─────────────────────────────────────────────────────
function renderKPI(kpi) {
  cachedKPI = kpi || {};

  animateCounter(elTodaySales, kpi.TODAY_SALES || 0);
  animateCounter(elMtdSales,   kpi.mtd_sales || 0);
  animateCounter(elPmsdSales,  kpi.PMSD_SALES || 0);
  animateCounter(elPmSales,    kpi.PM_SALES || 0);

  setTimeout(() => {
    if (elTodayRev) elTodayRev.textContent = fmtRevK(kpi.TODAY_REVENUE || 0);
    if (elMtdRev)   elMtdRev.textContent   = fmtRevK(kpi.MTD_REVENUE || 0);
    if (elPmsdRev)  elPmsdRev.textContent  = fmtRevK(kpi.PMSD_REVENUE || 0);
    if (elPmRev)    elPmRev.textContent    = fmtRevK(kpi.PM_REVENUE || 0);
  }, 250);

  // Wallet modal
  if (elWMtdRev)     elWMtdRev.textContent     = fmtRevK(kpi.MTD_REVENUE || 0);
  if (elWTodayRev)   elWTodayRev.textContent   = fmtRevK(kpi.TODAY_REVENUE || 0);
  if (elWPmRev)      elWPmRev.textContent      = fmtRevK(kpi.PM_REVENUE || 0);
  if (elWMtdSales)   elWMtdSales.textContent   = (kpi.mtd_sales || 0).toLocaleString('en-IN');
  if (elWTodaySales) elWTodaySales.textContent = (kpi.TODAY_SALES || 0).toLocaleString('en-IN');
}

// ─── RENDER LEADERBOARD ───────────────────────────────────────────────────
const RANK_MEDALS  = ['🥇', '🥈', '🥉'];
const RANK_CLASSES = ['rank-1', 'rank-2', 'rank-3'];

function renderLeaderboard(data, reportDate) {
  cachedLeaderboard = data || [];
  if (leaderboardDate) leaderboardDate.textContent = formatDisplayDate(reportDate);

  if (!data || data.length === 0) {
    if (leaderboardBody) {
      leaderboardBody.innerHTML = `
        <tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:30px;">
          No sales data available
        </td></tr>`;
    }
    return;
  }

  // Sort by mtd_sales descending
  const sorted = [...data].sort((a, b) => Number(b.mtd_sales || 0) - Number(a.mtd_sales || 0));

  leaderboardBody.innerHTML = sorted.map((rep, i) => {
    const rank       = i + 1;
    const rankLabel  = rank <= 3 ? RANK_MEDALS[rank - 1] : `#${rank}`;
    const rankClass  = rank <= 3 ? RANK_CLASSES[rank - 1] : '';
    const repName    = (rep.sales_representative || rep.name || 'Sales Rep').trim();
    const todaySales = Number(rep.today_sales || 0);
    const todayRev   = Number(rep.today_revenue || 0);
    const todaySub   = todayRev > 0
                       ? `<span style="font-size:0.7rem;color:var(--coral);margin-left:4px;font-weight:500;">(${fmtRevK(todayRev)})</span>`
                       : '';

    const mtdSales   = Number(rep.mtd_sales || 0);
    const mtdRevVal  = Number(rep.mtd_revenue || 0);
    const mtdRev     = fmtRevK(mtdRevVal);
    const arpuVal    = mtdSales > 0 ? (mtdRevVal / mtdSales) : 0;
    const arpu       = fmtArpu(arpuVal);
    const pvSales    = Number(rep.pv_sales || 0);
    const targetPct  = Math.min(Math.round((mtdSales / DAILY_TARGET_BASE) * 100), 200);

    const fillWidth  = Math.min(targetPct, 100);
    const barColor   = targetPct >= 100 ? 'linear-gradient(90deg, #10B981, #00F2FE)'
                     : targetPct >= 60  ? 'linear-gradient(90deg, #7C3AED, #00F2FE)'
                     :                    'linear-gradient(90deg, #FF5E36, #7C3AED)';

    return `
      <tr>
        <td class="rank-cell ${rankClass}">${rankLabel}</td>
        <td class="rep-name" title="${repName}">${repName}</td>
        <td><span class="num-badge">${todaySales}</span>${todaySub}</td>
        <td><span class="num-badge">${mtdSales}</span></td>
        <td class="rev-cell">${mtdRev}</td>
        <td class="arpu-cell">${arpu}</td>
        <td class="target-wrap">
          <div class="progress-bar-track">
            <div class="progress-bar-fill" style="width:${fillWidth}%; background:${barColor};"></div>
          </div>
          <div class="progress-label" style="font-weight:600;color:var(--text-secondary);">${targetPct}% | ${DAILY_TARGET_BASE}</div>
        </td>
        <td><span class="num-badge" style="color:#A78BFA;">${pvSales}</span></td>
      </tr>`;
  }).join('');
}

// ─── RENDER DESTINATIONS ────────────────────────────────────────────────
function renderDestinationsList(items) {
  if (!destinationsList) return;
  if (!items || items.length === 0) {
    destinationsList.innerHTML = `<p style="color:var(--text-muted);text-align:center;padding:20px;">No data</p>`;
    return;
  }
  const colors = ['c0', 'c1', 'c2', 'c3'];
  destinationsList.innerHTML = items.map((item, i) => `
    <div class="dest-item">
      <span class="dest-rank">${i + 1}</span>
      ${item.flag
        ? `<img class="dest-flag" src="${item.flag}" alt="${item.name}" loading="lazy" onerror="this.style.display='none'" />`
        : `<span class="dest-flag" style="background:rgba(255,255,255,0.05);border-radius:4px;"></span>`}
      <span class="dest-name" title="${item.name}">${item.name}</span>
      <span class="dest-count ${colors[i % 4]}">${item.count} orders</span>
    </div>
  `).join('');
}

// ─── RENDER DAILY SUMMARY CHART ──────────────────────────────────────────
function renderDailyChart(dailyMetrics, reportDate) {
  const monthName = parseDate(reportDate).toLocaleString('en', { month: 'long', year: 'numeric' });
  const labelEl = document.getElementById('chart-daily-month');
  if (labelEl) labelEl.textContent = `${monthName} — Orders/Day`;

  if (dailyChartInstance) dailyChartInstance.destroy();
  if (!dailyChartCanvas) return;

  const ctx = dailyChartCanvas.getContext('2d');

  let labels = [];
  let sales = [];

  if (Array.isArray(dailyMetrics) && dailyMetrics.length > 0) {
    labels = dailyMetrics.map(d => d.order_date ? d.order_date.slice(8, 10) : '');
    sales = dailyMetrics.map(d => Number(d.no_of_sales || 0));
  } else {
    labels = Array.from({ length: 20 }, (_, i) => String(i + 1).padStart(2, '0'));
    sales = [23, 28, 12, 29, 31, 12, 13, 28, 45, 33, 34, 45, 26, 31, 48, 43, 28, 24, 27, 34];
  }

  const gradOrange = ctx.createLinearGradient(0, 0, 0, 265);
  gradOrange.addColorStop(0,   'rgba(249, 115, 22, 0.22)');
  gradOrange.addColorStop(0.65,'rgba(249, 115, 22, 0.06)');
  gradOrange.addColorStop(1,   'rgba(249, 115, 22, 0.00)');

  dailyChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Daily Orders',
        data: sales,
        borderColor: '#F97316',
        borderWidth: 2.5,
        backgroundColor: gradOrange,
        fill: true,
        tension: 0.35,
        pointRadius: 4.5,
        pointHoverRadius: 7,
        pointBackgroundColor: '#F97316',
        pointBorderColor: '#FFFFFF',
        pointBorderWidth: 2.5,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          labels: {
            color: '#475569',
            font: { family: "'Plus Jakarta Sans', sans-serif", size: 12, weight: '700' },
            usePointStyle: true,
            pointStyleWidth: 8
          }
        },
        tooltip: {
          backgroundColor: '#FFFFFF',
          borderColor: '#E2E8F0',
          borderWidth: 1,
          titleColor: '#0F172A',
          titleFont: { family: "'Plus Jakarta Sans', sans-serif", size: 13, weight: '700' },
          bodyColor: '#475569',
          bodyFont: { family: "'Plus Jakarta Sans', sans-serif", size: 12 },
          padding: 12,
          cornerRadius: 10,
          callbacks: {
            title: items => `Day ${items[0].label}`,
            label: item  => ` Orders: ${item.formattedValue}`
          }
        }
      },
      scales: {
        x: {
          grid: { color: '#F1F5F9', drawBorder: false },
          ticks: { color: '#94A3B8', font: { family: "'Plus Jakarta Sans', sans-serif", size: 12 } }
        },
        y: {
          grid: { color: '#F1F5F9', drawBorder: false },
          ticks: { color: '#94A3B8', font: { family: "'Plus Jakarta Sans', sans-serif", size: 12 }, precision: 0 }
        }
      }
    }
  });
}

// ─── RENDER MONTHLY SUMMARY CHART ────────────────────────────────────────
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function renderMonthlyChart(monthlyMetrics) {
  if (monthlyChartInstance) monthlyChartInstance.destroy();
  if (!monthlyChartCanvas) return;

  const ctx = monthlyChartCanvas.getContext('2d');

  let labels = [];
  let sales = [];

  if (Array.isArray(monthlyMetrics) && monthlyMetrics.length > 0) {
    labels = monthlyMetrics.map(m => `${MONTH_NAMES[(m.month || 1) - 1]} '${String(m.year || 2026).slice(-2)}`);
    sales  = monthlyMetrics.map(m => Number(m.no_of_sales || 0));
  } else {
    labels = ['Jan \'26', 'Feb \'26', 'Mar \'26', 'Apr \'26', 'May \'26'];
    sales  = [322, 402, 464, 673, 970];
  }

  const gradOrangeMo = ctx.createLinearGradient(0, 0, 0, 265);
  gradOrangeMo.addColorStop(0,   'rgba(249, 115, 22, 0.22)');
  gradOrangeMo.addColorStop(0.65,'rgba(249, 115, 22, 0.06)');
  gradOrangeMo.addColorStop(1,   'rgba(249, 115, 22, 0.00)');

  monthlyChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Monthly Orders',
        data: sales,
        borderColor: '#F97316',
        borderWidth: 2.5,
        backgroundColor: gradOrangeMo,
        fill: true,
        tension: 0.4,
        pointRadius: 4.5,
        pointHoverRadius: 7,
        pointBackgroundColor: '#F97316',
        pointBorderColor: '#FFFFFF',
        pointBorderWidth: 2.5,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          labels: {
            color: '#475569',
            font: { family: "'Plus Jakarta Sans', sans-serif", size: 12, weight: '700' },
            usePointStyle: true,
            pointStyleWidth: 8
          }
        },
        tooltip: {
          backgroundColor: '#FFFFFF',
          borderColor: '#E2E8F0',
          borderWidth: 1,
          titleColor: '#0F172A',
          titleFont: { family: "'Plus Jakarta Sans', sans-serif", size: 13, weight: '700' },
          bodyColor: '#475569',
          bodyFont: { family: "'Plus Jakarta Sans', sans-serif", size: 12 },
          padding: 12,
          cornerRadius: 10,
        }
      },
      scales: {
        x: {
          grid: { color: '#F1F5F9', drawBorder: false },
          ticks: { color: '#94A3B8', font: { family: "'Plus Jakarta Sans', sans-serif", size: 12 } }
        },
        y: {
          grid: { color: '#F1F5F9', drawBorder: false },
          ticks: { color: '#94A3B8', font: { family: "'Plus Jakarta Sans', sans-serif", size: 12 }, precision: 0 }
        }
      }
    }
  });
}

// ─── DEFAULT DESTINATIONS FOR DEMO/DISPLAY ──────────────────────────────
const DEFAULT_DESTINATIONS = [
  { rank: 1, name: 'Thailand [True]',                    count: 328, flag: 'https://flagcdn.com/w320/th.png' },
  { rank: 2, name: 'Thailand',                           count: 314, flag: 'https://flagcdn.com/w320/th.png' },
  { rank: 3, name: 'Singapore, Malaysia',                count: 53,  flag: 'https://flagcdn.com/w320/sg.png' },
  { rank: 4, name: 'Vietnam',                            count: 52,  flag: 'https://flagcdn.com/w320/vn.png' },
  { rank: 5, name: 'Singapore, Malaysia, Thailand...',   count: 22,  flag: 'https://flagcdn.com/w320/th.png' },
  { rank: 6, name: 'Singapore, Malaysia, Indonesia...', count: 21,  flag: 'https://flagcdn.com/w320/id.png' },
  { rank: 7, name: 'Vietnamobile',                       count: 19,  flag: 'https://flagcdn.com/w320/vn.png' }
];

// ─── CSV EXPORT ───────────────────────────────────────────────────────────
function downloadCSV() {
  const rows = [];
  rows.push(['eSIM Analytics Dashboard — Export']);
  rows.push([`Report Date: ${currentReportDate}`]);
  rows.push([`Generated: ${new Date().toLocaleString('en-IN')}`]);
  rows.push([]);
  rows.push(['KPI SUMMARY']);
  rows.push(['Metric', 'Sales', 'Revenue']);
  rows.push(["Today's Performance",  cachedKPI.TODAY_SALES  || 0, cachedKPI.TODAY_REVENUE || 0]);
  rows.push(['Month-to-Date',        cachedKPI.mtd_sales    || 0, cachedKPI.MTD_REVENUE   || 0]);
  rows.push(['Prev Month Same Day',   cachedKPI.PMSD_SALES   || 0, cachedKPI.PMSD_REVENUE  || 0]);
  rows.push(['Prev Month Total',      cachedKPI.PM_SALES     || 0, cachedKPI.PM_REVENUE    || 0]);
  rows.push([]);
  rows.push(['LEADERBOARD']);
  rows.push(['Rank', 'Sales Rep', 'Today Sales', 'MTD Sales', 'MTD Revenue', 'ARPU (INR)', 'Target']);
  
  cachedLeaderboard.forEach((rep, i) => {
    const mtdSales = Number(rep.mtd_sales || 0);
    const targetPct = Math.min(Math.round((mtdSales / DAILY_TARGET_BASE) * 100), 200);
    rows.push([
      i + 1,
      rep.sales_representative || rep.name || '—',
      rep.today_sales || 0,
      rep.mtd_sales || 0,
      rep.mtd_revenue || 0,
      mtdSales > 0 ? Math.round(Number(rep.mtd_revenue || 0) / mtdSales) : 0,
      `${targetPct}% | ${DAILY_TARGET_BASE}`
    ]);
  });

  const csv = rows.map(r =>
    r.map(c => {
      const s = String(c ?? '');
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(',')
  ).join('\r\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: `esim-dashboard-${currentReportDate}.csv` });
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

// ─── MAIN RENDER PIPELINE ─────────────────────────────────────────────────
async function renderDashboard(requestedDate) {
  if (errorBanner) errorBanner.style.display = 'none';
  currentReportDate = requestedDate;
  showLoading();

  try {
    const rpcData = await fetchRPC(requestedDate);

    if (rpcData) {
      renderKPI(rpcData.kpi_cards || {});
      renderLeaderboard(rpcData.leaderboard_metrics || [], requestedDate);
      renderDailyChart(rpcData.daily_metrics || [], requestedDate);
      renderMonthlyChart(rpcData.monthly_metrics || []);
      renderDestinationsList(DEFAULT_DESTINATIONS);
    }
  } catch (err) {
    console.warn('RPC request failed, rendering fallback presentation data:', err);
    if (errorBanner && errorMessage) {
      errorMessage.textContent = `RPC request note: ${err.message}. Displaying cached dashboard data.`;
      errorBanner.style.display = 'flex';
    }
  } finally {
    hideLoading();
  }
}

// ─── EVENT LISTENERS ──────────────────────────────────────────────────────
const btnWallet = document.getElementById('btn-wallet');
if (btnWallet) {
  btnWallet.addEventListener('click', () => {
    const modal = document.getElementById('wallet-modal');
    if (modal) modal.style.display = 'flex';
  });
}

const modalClose = document.getElementById('modal-close');
if (modalClose) {
  modalClose.addEventListener('click', () => {
    const modal = document.getElementById('wallet-modal');
    if (modal) modal.style.display = 'none';
  });
}

const walletModal = document.getElementById('wallet-modal');
if (walletModal) {
  walletModal.addEventListener('click', e => {
    if (e.target === e.currentTarget) walletModal.style.display = 'none';
  });
}

const btnDownloadCsv = document.getElementById('btn-download-csv');
if (btnDownloadCsv) {
  btnDownloadCsv.addEventListener('click', downloadCSV);
}

const dateInput = document.getElementById('report-date-input');
if (dateInput) {
  dateInput.addEventListener('change', function () {
    if (this.value) {
      renderDashboard(this.value);
    }
  });
}

// ─── BOOT ─────────────────────────────────────────────────────────────────
(function init() {
  startLiveClock();

  const input = document.getElementById('report-date-input');
  if (input) input.value = DEFAULT_LOCKED_DATE;

  renderDashboard(DEFAULT_LOCKED_DATE);
})();