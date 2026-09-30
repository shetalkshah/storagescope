const DATA_FILES = {
  indicators: "data/national_indicators.csv",
  rankings: "data/market_rankings.csv",
  pipeline: "data/supply_pipeline_by_region_cw_q1_2026.csv",
  themes: "data/industry_themes.csv",
  sources: "data/source_inventory.csv",
  msaRates: "data/msa_street_rates_tractiq_dec2025.csv",
  definitions: "data/data_dictionary.csv"
};

const viewMeta = {
  overview: ["Industry snapshot", "National overview", "Market conditions, pricing power, demand and new supply"],
  pricing: ["Pricing intelligence", "Pricing & revenue", "Street-rate direction, promotions and metro-level pricing power"],
  demand: ["Operating fundamentals", "Demand & occupancy", "Occupancy stabilization, absorption signals and demand drivers"],
  markets: ["Market drilldown", "MSA markets", "Compare street rates and momentum across major metropolitan areas"],
  supply: ["Development monitor", "Supply pipeline", "Projects by stage and region, with year-over-year pressure signals"],
  capital: ["Investment market", "Capital markets", "Liquidity, valuation and financing conditions for self-storage assets"],
  structure: ["Competitive landscape", "Market structure", "Ownership fragmentation, third-party management and technology adoption"],
  sources: ["Research reference", "Sources & definitions", "Methodology, included evidence and explicit exclusions"]
};

const state = {
  view: "overview",
  data: null,
  unit: "10x10 non-climate-controlled",
  marketSearch: "",
  marketSort: "rate-desc",
  pipelineRegion: "total",
  rankType: "most_improved"
};

function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i += 1; }
      else quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell); cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(cell); cell = "";
      if (row.some(value => value !== "")) rows.push(row);
      row = [];
    } else cell += char;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [headers, ...records] = rows;
  return records.map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

async function loadData() {
  if (window.STORAGE_DATA) {
    state.data = window.STORAGE_DATA;
    return;
  }
  const entries = await Promise.all(Object.entries(DATA_FILES).map(async ([key, url]) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Unable to load ${url}`);
    return [key, parseCSV(await response.text())];
  }));
  state.data = Object.fromEntries(entries);
}

function icon(name) { return `<i data-lucide="${name}" aria-hidden="true"></i>`; }
function number(value, digits = 1) { return Number(value).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits }); }
function shortMarket(name) { return name.replace(/,? [A-Z]{2}(?:-[A-Z]{2})? MSA$/, "").replace(" MSA", ""); }
function sourceTag(label) { return `<span class="panel-source">${icon("file-text")} ${label}</span>`; }

function renderKPIs(items) {
  return `<section class="kpi-grid" aria-label="Key indicators">${items.map(item => `
    <article class="kpi-card">
      <div class="kpi-label">${item.label}</div>
      <div class="kpi-value">${item.value}</div>
      <div class="kpi-context ${item.tone || ""}">${item.context}</div>
    </article>`).join("")}</section>`;
}

function lineChart() {
  const rent = [116, 117, 109, 109.95, 118];
  const occupancy = [90, 90, 90, 90, 90];
  const labels = ["Q2 ’25", "Q3 ’25", "Q4 ’25", "Q1 ’26", "Q2 ’26"];
  const w = 690, h = 275, left = 50, right = 28, top = 25, bottom = 42;
  const min = 86, max = 122;
  const x = i => left + (i * (w - left - right) / (labels.length - 1));
  const y = v => top + ((max - v) * (h - top - bottom) / (max - min));
  const path = values => values.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ");
  const ticks = [90, 100, 110, 120];
  return `<div class="chart-wrap"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="National rent benchmark declined late in 2025 and recovered to 118 dollars in Q2 2026; median occupancy held at 90 percent">
    <defs><linearGradient id="area-blue" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2869b7" stop-opacity=".18"/><stop offset="1" stop-color="#2869b7" stop-opacity="0"/></linearGradient></defs>
    ${ticks.map(t => `<line class="chart-grid" x1="${left}" y1="${y(t)}" x2="${w-right}" y2="${y(t)}"/><text class="chart-axis" x="8" y="${y(t)+4}">${t}</text>`).join("")}
    <path class="chart-area" d="${path(rent)} L${x(4)},${h-bottom} L${x(0)},${h-bottom} Z"/>
    <path class="line-blue" d="${path(rent)}"/>
    <path class="line-green" d="${path(occupancy)}"/>
    ${rent.map((v,i) => `<circle class="chart-dot-blue" cx="${x(i)}" cy="${y(v)}" r="4" data-tooltip="${labels[i]} asking rent benchmark: $${v.toFixed(i === 3 ? 2 : 0)}"/>`).join("")}
    ${occupancy.map((v,i) => `<circle class="chart-dot-green" cx="${x(i)}" cy="${y(v)}" r="3.5" data-tooltip="${labels[i]} median occupancy: ${v}%"/>`).join("")}
    ${labels.map((label,i) => `<text class="chart-axis" x="${x(i)}" y="${h-12}" text-anchor="middle">${label}</text>`).join("")}
    <text class="chart-axis" x="${x(4)-4}" y="${y(118)-12}" text-anchor="end" style="fill:var(--blue);font-weight:600">$118</text>
    <text class="chart-axis" x="${x(4)-4}" y="${y(90)-11}" text-anchor="end" style="fill:var(--green);font-weight:600">90%</text>
  </svg></div>`;
}

function concessionsChart() {
  const values = [67, 68.7, 70.4, 70.8, 73.1];
  const labels = ["Q2 ’25", "Q3 ’25", "Q4 ’25", "Q1 ’26", "Q2 ’26"];
  return `<div class="bar-list">${values.map((value, i) => `<div class="bar-row"><span>${labels[i]}</span><div class="bar-track"><div class="bar-fill red" style="width:${value}%"></div></div><span class="bar-value">${value}%</span></div>`).join("")}</div>`;
}

function rankingRows(type, limit = 6, compact = false) {
  const rows = state.data.rankings.filter(row => row.ranking_type === type).slice(0, limit);
  return rows.map(row => {
    const market = compact ? shortMarket(row.market).split("-")[0] : shortMarket(row.market);
    const signal = type === "most_improved" ? (compact ? "Up" : "Improving") : "Watch";
    return `<tr><td class="market-name">${market}</td><td class="number ${Number(row.value) >= 0 ? "positive" : "negative"}">${Number(row.value) > 0 ? "+" : ""}${number(row.value, 1)}</td><td><span class="signal ${Number(row.value) >= 0 ? "positive" : "negative"}">${signal}</span></td></tr>`;
  }).join("");
}

function overviewView() {
  return `${renderKPIs([
    { label: "Average asking rent", value: "$1.18", context: "−0.8% YoY · per SF", tone: "negative" },
    { label: "Median occupancy", value: "90.0%", context: "Flat YoY", tone: "neutral" },
    { label: "2026 completions", value: "53.0M", context: "Smallest pace since 2016", tone: "positive" },
    { label: "Facilities discounting", value: "73.1%", context: "+6.1 pts seasonally", tone: "negative" },
    { label: "Mean cap rate", value: "6.59%", context: "180–220 bp Treasury spread" }
  ])}
  <section class="dashboard-grid">
    <article class="panel">
      <div class="panel-header"><div><h2 class="panel-title">Pricing and occupancy trend</h2><div class="panel-subtitle">National benchmark · Q2 2025 to Q2 2026</div></div><div><div class="legend"><span><i class="legend-dot" style="background:var(--blue)"></i>Asking rent</span><span><i class="legend-dot" style="background:var(--green)"></i>Occupancy</span></div></div></div>
      ${lineChart()}
      ${sourceTag("C&W SSPQ Q2 2026 · p. 21")}
    </article>
    <div class="stack">
      <article class="panel">
        <div class="panel-header"><div><h2 class="panel-title">Market signals</h2><div class="panel-subtitle">What changed most in the latest reports</div></div></div>
        <div class="insight-list">
          <div class="insight-row"><span class="insight-icon">${icon("trending-up")}</span><div><strong>Rent declines are moderating</strong><p>REIT street rates fell 3.9% YoY in Q4 2025 versus an 18.9% drop a year earlier.</p></div></div>
          <div class="insight-row"><span class="insight-icon">${icon("shield-check")}</span><div><strong>Occupancy reached an inflection</strong><p>Weighted REIT occupancy posted its first YoY gain since Q4 2021.</p></div></div>
          <div class="insight-row"><span class="insight-icon">${icon("construction")}</span><div><strong>Supply pressure is easing</strong><p>The Q1 2026 project pipeline was down 20% YoY; in-process construction fell 41%.</p></div></div>
        </div>
      </article>
      <article class="panel">
        <div class="panel-header"><div><h2 class="panel-title">MSA momentum</h2><div class="panel-subtitle">Aggregate growth score · Q2 2026</div></div><button class="text-button" type="button" data-view="markets">Open drilldown</button></div>
        <div class="data-table-wrap"><table class="data-table"><thead><tr><th>Market</th><th class="number">Score</th><th>Signal</th></tr></thead><tbody>${rankingRows("most_improved",2,true)}${rankingRows("watch_list",2,true)}</tbody></table></div>
      </article>
    </div>
  </section>`;
}

function pricingView() {
  return `${renderKPIs([
    { label: "Median asking rents", value: "+7.3%", context: "Quarter over quarter", tone: "positive" },
    { label: "Annual change", value: "+1.7%", context: "C&W top-50 sample", tone: "positive" },
    { label: "REIT street rates", value: "−3.9%", context: "Q4 2025 YoY", tone: "negative" },
    { label: "Non-REIT street rates", value: "−5.5%", context: "Q4 2025 YoY", tone: "negative" },
    { label: "Concession cost index", value: "159.1", context: "Up 9.8 QoQ", tone: "negative" }
  ])}
  <section class="dashboard-grid equal">
    <article class="panel"><div class="panel-header"><div><h2 class="panel-title">National asking-rent benchmark</h2><div class="panel-subtitle">Dollar benchmark and occupancy context</div></div>${sourceTag("C&W · p. 21")}</div>${lineChart()}</article>
    <article class="panel"><div class="panel-header"><div><h2 class="panel-title">Facilities offering concessions</h2><div class="panel-subtitle">Share of sampled facilities · five quarters</div></div>${sourceTag("C&W · p. 21")}</div>${concessionsChart()}<div class="callout"><strong>Pricing read:</strong> Street-rate recovery has started, but promotional intensity remains high. Concessions are still doing much of the work to defend physical occupancy.</div></article>
  </section>
  <section class="dashboard-grid single"><article class="panel"><div class="panel-header"><div><h2 class="panel-title">Pricing framework</h2><div class="panel-subtitle">How to read current industry pricing power</div></div></div><div class="metric-split"><div class="metric-block"><div class="kpi-label">Street vs. achieved rate</div><div class="big">−1.4 pts</div><div class="kpi-context">Gap between REIT street-rate and achieved-rate YoY declines in Q4 2025.</div></div><div class="metric-block"><div class="kpi-label">REIT peak-to-trough</div><div class="big">−36%</div><div class="kpi-context">Compared with a 47% contraction for non-REIT street rates.</div></div><div class="metric-block"><div class="kpi-label">Primary signal</div><div class="big">Promo-led</div><div class="kpi-context">Watch concessions and achieved rents alongside advertised street rates.</div></div></div></article></section>`;
}

function demandView() {
  const rows = state.rankType === "most_improved" ? rankingRows("most_improved") : rankingRows("watch_list");
  return `${renderKPIs([
    { label: "Median physical occupancy", value: "90.0%", context: "Flat QoQ and YoY", tone: "neutral" },
    { label: "REIT occupancy YoY", value: "+0.3 pts", context: "First gain since Q4 2021", tone: "positive" },
    { label: "Q1 unit absorption", value: "−4.5%", context: "Versus Q1 2025", tone: "negative" },
    { label: "Monthly churn", value: "5–6%", context: "Typical operator range" },
    { label: "Storage usage", value: "10%", context: "Share of U.S. population" }
  ])}
  <section class="dashboard-grid">
    <article class="panel"><div class="panel-header"><div><h2 class="panel-title">Market momentum ranking</h2><div class="panel-subtitle">Aggregate growth score · Q2 2026</div></div>${sourceTag("C&W · p. 42")}</div><div class="data-table-wrap"><table class="data-table"><thead><tr><th>Market</th><th class="number">Score</th><th>Signal</th></tr></thead><tbody>${rows}</tbody></table></div></article>
    <article class="panel"><div class="panel-header"><div><h2 class="panel-title">Demand driver hierarchy</h2><div class="panel-subtitle">Evidence repeated across market and annual reports</div></div></div><div class="insight-list">
      <div class="insight-row"><span class="insight-icon">${icon("house")}</span><div><strong>Household mobility</strong><p>Home sales, moves and relocation activity remain the clearest macro demand swing factors.</p></div></div>
      <div class="insight-row"><span class="insight-icon">${icon("briefcase-business")}</span><div><strong>Job and population growth</strong><p>Local employment and household formation support sustained unit absorption.</p></div></div>
      <div class="insight-row"><span class="insight-icon">${icon("calendar-range")}</span><div><strong>Seasonality</strong><p>Occupancy and leasing activity typically strengthen during summer moving months.</p></div></div>
      <div class="insight-row"><span class="insight-icon">${icon("building-2")}</span><div><strong>Local supply balance</strong><p>New facilities can depress move-in rates and extend stabilization periods.</p></div></div>
    </div></article>
  </section>`;
}

function marketRows() {
  let rows = state.data.msaRates.filter(row => row.unit_benchmark === state.unit);
  const query = state.marketSearch.trim().toLowerCase();
  if (query) rows = rows.filter(row => row.msa.toLowerCase().includes(query));
  rows.sort((a, b) => {
    if (state.marketSort === "rate-desc") return Number(b.street_rate_usd) - Number(a.street_rate_usd);
    if (state.marketSort === "rate-asc") return Number(a.street_rate_usd) - Number(b.street_rate_usd);
    if (state.marketSort === "yoy-desc") return Number(b.trailing_12m_change_pct) - Number(a.trailing_12m_change_pct);
    return Number(a.trailing_12m_change_pct) - Number(b.trailing_12m_change_pct);
  });
  return rows.map(row => `<tr><td class="market-name">${row.msa}</td><td class="number">$${number(row.street_rate_usd, 0)}</td><td class="number ${Number(row.qtq_change_pct) >= 0 ? "positive" : "negative"}">${Number(row.qtq_change_pct) > 0 ? "+" : ""}${number(row.qtq_change_pct, 1)}%</td><td class="number ${Number(row.trailing_12m_change_pct) >= 0 ? "positive" : "negative"}">${Number(row.trailing_12m_change_pct) > 0 ? "+" : ""}${number(row.trailing_12m_change_pct, 1)}%</td></tr>`).join("");
}

function marketsView() {
  const rows = state.data.msaRates.filter(row => row.unit_benchmark === state.unit);
  const avg = rows.reduce((sum, row) => sum + Number(row.street_rate_usd), 0) / rows.length;
  const improving = rows.filter(row => Number(row.trailing_12m_change_pct) > 0).length;
  const strongest = [...rows].sort((a,b) => Number(b.trailing_12m_change_pct) - Number(a.trailing_12m_change_pct))[0];
  const weakest = [...rows].sort((a,b) => Number(a.trailing_12m_change_pct) - Number(b.trailing_12m_change_pct))[0];
  return `${renderKPIs([
    { label: "Average sampled street rate", value: `$${number(avg, 0)}`, context: state.unit },
    { label: "Markets with YoY growth", value: `${improving}/${rows.length}`, context: "Positive trailing 12 months", tone: "positive" },
    { label: "Strongest annual move", value: `${Number(strongest.trailing_12m_change_pct) > 0 ? "+" : ""}${number(strongest.trailing_12m_change_pct,1)}%`, context: shortMarket(strongest.msa), tone: "positive" },
    { label: "Weakest annual move", value: `${number(weakest.trailing_12m_change_pct,1)}%`, context: shortMarket(weakest.msa), tone: "negative" },
    { label: "Market coverage", value: `${rows.length}`, context: "Major MSAs in TractIQ table" }
  ])}
  <section class="dashboard-grid single"><article class="panel"><div class="panel-header"><div><h2 class="panel-title">MSA street-rate drilldown</h2><div class="panel-subtitle">REIT 10×10 benchmark · December 2025</div></div>${sourceTag("TractIQ · pp. 7–8")}</div><div class="data-table-wrap"><table class="data-table"><thead><tr><th>Metro area</th><th class="number">Street rate</th><th class="number">QoQ</th><th class="number">Trailing 12m</th></tr></thead><tbody>${marketRows() || `<tr><td colspan="4"><div class="empty-state">No markets match this search.</div></td></tr>`}</tbody></table></div></article></section>`;
}

function pipelineBars(region) {
  const key = region === "total" ? "total_projects" : `${region}_projects`;
  const rows = state.data.pipeline.filter(row => row.pipeline_stage !== "Totals");
  const max = Math.max(...rows.map(row => Number(row[key])));
  return `<div class="bar-list">${rows.map(row => `<div class="bar-row"><span class="bar-label" title="${row.pipeline_stage}">${row.pipeline_stage}</span><div class="bar-track"><div class="bar-fill" style="width:${Number(row[key]) / max * 100}%"></div></div><span class="bar-value">${row[key]}</span></div>`).join("")}</div>`;
}

function supplyView() {
  const totals = state.data.pipeline.find(row => row.pipeline_stage === "Totals");
  return `${renderKPIs([
    { label: "Total pipeline", value: "656", context: "Projects · Q1 2026" },
    { label: "Annual pipeline change", value: "−20%", context: "Across all stages", tone: "positive" },
    { label: "In-process construction", value: "75", context: "−41% YoY", tone: "positive" },
    { label: "New construction starts", value: "100", context: "−30% YoY", tone: "positive" },
    { label: "2026 completions forecast", value: "53.0M", context: "Square feet" }
  ])}
  <section class="dashboard-grid">
    <article class="panel"><div class="panel-header"><div><h2 class="panel-title">Projects by stage</h2><div class="panel-subtitle">${state.pipelineRegion === "total" ? "National" : state.pipelineRegion[0].toUpperCase()+state.pipelineRegion.slice(1)} project count · Q1 2026</div></div>${sourceTag("C&W · p. 9")}</div>${pipelineBars(state.pipelineRegion)}</article>
    <article class="panel"><div class="panel-header"><div><h2 class="panel-title">Regional concentration</h2><div class="panel-subtitle">Share of 656 active and proposed projects</div></div></div><div class="bar-list">
      ${[["South", totals.south_projects, 35],["East", totals.east_projects,27],["West", totals.west_projects,26],["Midwest",totals.midwest_projects,13]].map(([name,count,share]) => `<div class="bar-row"><span>${name}</span><div class="bar-track"><div class="bar-fill green" style="width:${share}%"></div></div><span class="bar-value">${count}</span></div>`).join("")}
    </div><div class="callout"><strong>Supply read:</strong> The South still holds the largest project share, but falling starts and in-process counts point to lower future delivery pressure.</div></article>
  </section>`;
}

function capitalView() {
  return `${renderKPIs([
    { label: "Transactions", value: "+20%", context: "YoY as of June 2026", tone: "positive" },
    { label: "Deal volume", value: "+50%", context: "YoY as of June 2026", tone: "positive" },
    { label: "Versus 2022 peak", value: "−30%", context: "Trading activity", tone: "negative" },
    { label: "Mean cap rate", value: "6.59%", context: "Observed transaction average" },
    { label: "Cap-rate range", value: "5.2–8.2%", context: "Lower to upper range" }
  ])}
  <section class="dashboard-grid equal">
    <article class="panel"><div class="panel-header"><div><h2 class="panel-title">Liquidity recovery</h2><div class="panel-subtitle">Current transaction signals versus prior benchmarks</div></div>${sourceTag("M&M 2H26 · p. 2")}</div><div class="metric-split"><div class="metric-block"><div class="kpi-label">Transactions</div><div class="big positive">+20%</div><div class="kpi-context">Year over year</div></div><div class="metric-block"><div class="kpi-label">Dollar volume</div><div class="big positive">+50%</div><div class="kpi-context">Year over year</div></div><div class="metric-block"><div class="kpi-label">Recovery gap</div><div class="big negative">−30%</div><div class="kpi-context">Below 2022 activity peak</div></div></div><div class="callout"><strong>Capital-markets read:</strong> Liquidity has improved materially from the 2024 trough, but buyer and seller expectations have not fully reset to the higher-rate environment.</div></article>
    <article class="panel"><div class="panel-header"><div><h2 class="panel-title">Financing environment</h2><div class="panel-subtitle">Debt availability and risk indicators</div></div>${sourceTag("M&M 2H26 · p. 4")}</div><div class="insight-list"><div class="insight-row"><span class="insight-icon">${icon("percent")}</span><div><strong>Cap-rate spread: 180–220 bps</strong><p>Mean cap rates remain closely tied to the 10-year Treasury and financing costs.</p></div></div><div class="insight-row"><span class="insight-icon">${icon("landmark")}</span><div><strong>Banks remain central, but less dominant</strong><p>Banks and credit unions fell from roughly 70% of loan volume in 2023 to around half in 2026.</p></div></div><div class="insight-row"><span class="insight-icon">${icon("triangle-alert")}</span><div><strong>Watchlists deserve attention</strong><p>Reported delinquency was only 0.05%, yet nearly 30% of outstanding balance sat on servicer watchlists.</p></div></div></div></article>
  </section>`;
}

function structureView() {
  const circumference = 2 * Math.PI * 70;
  const segments = [37.3, 35.6, 27.1];
  let offset = 0;
  const colors = ["var(--blue)", "var(--purple)", "var(--green)"];
  const circles = segments.map((value, index) => {
    const dash = value / 100 * circumference;
    const circle = `<circle cx="105" cy="105" r="70" stroke="${colors[index]}" stroke-dasharray="${dash} ${circumference-dash}" stroke-dashoffset="${-offset}"/>`;
    offset += dash;
    return circle;
  }).join("");
  return `${renderKPIs([
    { label: "Public-company share", value: "37.3%", context: "Of rentable square feet" },
    { label: "Public-company facility share", value: "19.3%", context: "Of U.S. facilities" },
    { label: "Remaining local operators", value: "66.4%", context: "Share of facilities" },
    { label: "Top-3 managed stores", value: "3,224", context: "As of June 2026" },
    { label: "Managed-store growth", value: "+14.7%", context: "Annualized, 2023–2025", tone: "positive" }
  ])}
  <section class="dashboard-grid equal">
    <article class="panel"><div class="panel-header"><div><h2 class="panel-title">Rentable square-footage mix</h2><div class="panel-subtitle">Industry ownership and operating scale</div></div>${sourceTag("M&M 2H26 · p. 3")}</div><div class="donut-layout"><svg class="donut" viewBox="0 0 210 210" role="img" aria-label="Public companies hold 37.3 percent, other top operators 35.6 percent and the rest of the industry 27.1 percent of rentable square footage"><circle class="track" cx="105" cy="105" r="70"/>${circles}</svg><div class="donut-legend"><div class="donut-legend-row"><i class="donut-swatch" style="background:var(--blue)"></i><span>Public companies</span><strong>37.3%</strong></div><div class="donut-legend-row"><i class="donut-swatch" style="background:var(--purple)"></i><span>Other top operators</span><strong>35.6%</strong></div><div class="donut-legend-row"><i class="donut-swatch" style="background:var(--green)"></i><span>Rest of industry</span><strong>27.1%</strong></div></div></div></article>
    <article class="panel"><div class="panel-header"><div><h2 class="panel-title">Third-party management scale</h2><div class="panel-subtitle">Managed properties · June 2026</div></div>${sourceTag("M&M 2H26 · p. 3")}</div><div class="bar-list"><div class="bar-row"><span>Extra Space</span><div class="bar-track"><div class="bar-fill green" style="width:100%"></div></div><span class="bar-value">1,964</span></div><div class="bar-row"><span>CubeSmart</span><div class="bar-track"><div class="bar-fill green" style="width:44.4%"></div></div><span class="bar-value">872</span></div><div class="bar-row"><span>Public Storage</span><div class="bar-track"><div class="bar-fill green" style="width:19.8%"></div></div><span class="bar-value">388</span></div></div><div class="callout"><strong>Competitive read:</strong> Fragmented ownership leaves room for consolidation, while management platforms and algorithmic pricing raise the operating bar for independent facilities.</div></article>
  </section>`;
}

function sourcesView() {
  const sourceNames = {
    TRACTIQ_Q4_2025: "TractIQ REIT Report · Q4 2025",
    CW_SSPQ_Q2_2026: "Cushman & Wakefield SSPQ · Q2 2026",
    MM_NATIONAL_2H_2026: "Marcus & Millichap National Report · 2H 2026",
    CUBESMART_2025_10K: "CubeSmart 2025 Annual Report",
    EXR_2025_10K: "Extra Space Storage 2025 Annual Report",
    PSA_2025_10K: "Public Storage 2025 Annual Report"
  };
  return `<section class="dashboard-grid single"><article class="panel"><div class="panel-header"><div><h2 class="panel-title">Source inventory</h2><div class="panel-subtitle">Market evidence included; company financial statements excluded</div></div></div><div class="source-grid">${state.data.sources.map(source => `<article class="source-card"><h3>${sourceNames[source.source_id]}</h3><p>${source.source_role}</p><div class="source-meta"><span>${source.file_name}</span><span class="badge">${source.source_id.includes("10K") ? "Industry context" : "Market data"}</span></div></article>`).join("")}</div></article></section>
  <section class="dashboard-grid single"><article class="panel"><div class="panel-header"><div><h2 class="panel-title">Dataset guide</h2><div class="panel-subtitle">Grain and purpose of each compiled table</div></div></div><div class="definition-list">${state.data.definitions.map(row => `<div class="definition-row"><strong>${row.dataset}</strong><span>${row.description} Grain: ${row.grain}.</span></div>`).join("")}</div><div class="callout"><strong>Scope rule:</strong> FFO, NOI, debt, dividends, stock performance and company-specific profitability metrics were excluded. Annual reports were used only for industry structure, tenant behavior, technology, competition and supply context.</div></article></section>`;
}

function renderControls() {
  const controls = document.getElementById("view-controls");
  if (state.view === "markets") {
    controls.innerHTML = `<div class="control-field"><label for="unit-select">Unit benchmark</label><select class="filter-select" id="unit-select"><option${state.unit.includes("non-climate") ? " selected" : ""}>10x10 non-climate-controlled</option><option${state.unit.includes("climate-controlled") && !state.unit.includes("non-climate") ? " selected" : ""}>10x10 climate-controlled</option></select></div><div class="control-field"><label for="market-sort">Sort by</label><select class="filter-select" id="market-sort"><option value="rate-desc">Highest rate</option><option value="rate-asc">Lowest rate</option><option value="yoy-desc">Strongest annual change</option><option value="yoy-asc">Weakest annual change</option></select></div><div class="control-field"><label for="market-search">Find an MSA</label><input class="search-input" id="market-search" type="search" placeholder="Search metro area" value="${state.marketSearch}"></div>`;
    document.getElementById("market-sort").value = state.marketSort;
    document.getElementById("unit-select").addEventListener("change", event => { state.unit = event.target.value; render(); });
    document.getElementById("market-sort").addEventListener("change", event => { state.marketSort = event.target.value; render(); });
    document.getElementById("market-search").addEventListener("input", event => { state.marketSearch = event.target.value; renderContentOnly(); });
  } else if (state.view === "supply") {
    controls.innerHTML = `<div class="control-field"><label for="region-select">Region</label><select class="filter-select" id="region-select"><option value="total">National</option><option value="east">East</option><option value="midwest">Midwest</option><option value="south">South</option><option value="west">West</option></select></div>`;
    document.getElementById("region-select").value = state.pipelineRegion;
    document.getElementById("region-select").addEventListener("change", event => { state.pipelineRegion = event.target.value; render(); });
  } else if (state.view === "demand") {
    controls.innerHTML = `<div class="control-field"><label for="ranking-select">Momentum set</label><select class="filter-select" id="ranking-select"><option value="most_improved">Most improved</option><option value="watch_list">Watch list</option></select></div>`;
    document.getElementById("ranking-select").value = state.rankType;
    document.getElementById("ranking-select").addEventListener("change", event => { state.rankType = event.target.value; render(); });
  } else controls.innerHTML = "";
}

function currentViewMarkup() {
  return ({ overview: overviewView, pricing: pricingView, demand: demandView, markets: marketsView, supply: supplyView, capital: capitalView, structure: structureView, sources: sourcesView })[state.view]();
}

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons({ attrs: { "stroke-width": 1.8 } });
    return;
  }
  const fallback = {
    warehouse: "▦", "layout-dashboard": "▤", "badge-dollar-sign": "$", activity: "∿", map: "⌖",
    construction: "▥", landmark: "▰", network: "⌘", "book-open": "▣", menu: "☰", download: "↓",
    "file-text": "▧", "trending-up": "↗", "shield-check": "✓", house: "⌂", "briefcase-business": "□",
    "calendar-range": "▦", "building-2": "▥", percent: "%", "triangle-alert": "!", sparkles: "✦"
  };
  document.querySelectorAll("i[data-lucide]").forEach(element => {
    element.textContent = fallback[element.dataset.lucide] || "•";
    element.classList.add("fallback-icon");
  });
}
function renderContentOnly() { document.getElementById("dashboard-view").innerHTML = currentViewMarkup(); refreshIcons(); bindTooltips(); }

function render() {
  const [eyebrow, title, description] = viewMeta[state.view];
  document.getElementById("view-eyebrow").textContent = eyebrow;
  document.getElementById("view-title").textContent = title;
  document.getElementById("view-description").textContent = description;
  document.querySelectorAll("[data-view]").forEach(button => button.classList.toggle("active", button.dataset.view === state.view));
  renderControls();
  renderContentOnly();
  closeSidebar();
}

function navigate(view) {
  if (!viewMeta[view]) return;
  state.view = view;
  history.replaceState(null, "", `#${view}`);
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function bindNavigation() {
  document.addEventListener("click", event => {
    const target = event.target.closest("[data-view]");
    if (target) navigate(target.dataset.view);
  });
}

function openSidebar() { document.getElementById("sidebar").classList.add("open"); document.getElementById("sidebar-scrim").classList.add("visible"); }
function closeSidebar() { document.getElementById("sidebar").classList.remove("open"); document.getElementById("sidebar-scrim").classList.remove("visible"); }

function bindTooltips() {
  const tooltip = document.getElementById("tooltip");
  document.querySelectorAll("[data-tooltip]").forEach(element => {
    element.addEventListener("mouseenter", event => {
      tooltip.textContent = element.dataset.tooltip;
      tooltip.style.display = "block";
      const rect = event.currentTarget.getBoundingClientRect();
      tooltip.style.left = `${Math.min(window.innerWidth - tooltip.offsetWidth - 10, rect.left + rect.width / 2 - tooltip.offsetWidth / 2)}px`;
      tooltip.style.top = `${Math.max(8, rect.top - tooltip.offsetHeight - 8)}px`;
    });
    element.addEventListener("mouseleave", () => { tooltip.style.display = "none"; });
  });
}

function downloadData() {
  const blob = new Blob([JSON.stringify(state.data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = "storagescope-industry-data.json"; anchor.click();
  URL.revokeObjectURL(url);
}

async function init() {
  bindNavigation();
  document.getElementById("mobile-menu").addEventListener("click", openSidebar);
  document.getElementById("sidebar-scrim").addEventListener("click", closeSidebar);
  document.getElementById("download-button").addEventListener("click", downloadData);
  const initial = location.hash.slice(1);
  if (viewMeta[initial]) state.view = initial;
  try {
    await loadData();
    render();
  } catch (error) {
    document.getElementById("dashboard-view").innerHTML = `<div class="panel empty-state"><strong>Dashboard data could not be loaded.</strong><br>${error.message}</div>`;
  }
  refreshIcons();
}

document.getElementById("dashboard-view").innerHTML = `<div class="loading"><div><div class="loading-mark"></div>Loading market datasets…</div></div>`;
init();

