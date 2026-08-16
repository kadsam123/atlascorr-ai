'use strict';

const fs = require('fs');
const path = require('path');

const API_BASE_URL = 'https://circletrade-agent-api-production.up.railway.app';
const API_KEY = 'ct-demo-key-2026';

const RAW_EXPORTERS_POOL = [
  // --- Agricultural / Food Category (High tariff & CITES compliance bottleneck) ---
  { company: 'Great Mountain Ginseng', contact: 'Logistics Manager', email: 'sales@greatmountain.ca', product: 'Ginseng Root Blend', desc: 'Premium dried Canadian ginseng roots and capsules shipped to Asian markets.', dest: 'SG' },
  { company: 'Canadian Ginseng Farm Ltd', contact: 'Wholesale Sales', email: 'info@canadianginsengfarm.com', product: 'Bulk Dried Ginseng', desc: 'Wholesale washed ginseng roots for direct import into the European Union.', dest: 'DE' },
  { company: 'Rainey Ginseng Farm', contact: 'Export Team', email: 'export@raineyginseng.com', product: 'Ginseng Crown Roots', desc: 'Raw unwashed agricultural ginseng roots for plant cultivation brokers.', dest: 'GB' },
  { company: 'Sunmore Healthtech', contact: 'Sales Director', email: 'info@sunmore.ca', product: 'Sunmore Ginseng Extract', desc: 'Liquid extracts and tea infusions exported globally under CITES guidelines.', dest: 'JP' },
  { company: 'Canadian Vita', contact: 'Trade Director', email: 'ops@canadianvita.com', product: 'Certified Ginseng Roots', desc: 'OGGA certified dried ginseng roots packed for bulk distribution.', dest: 'US' },
  { company: 'Victory Ginseng Ontario', contact: 'Logistics Supervisor', email: 'victory@victoryginseng.com', product: 'Ginseng Supplements', desc: 'Dietary organic ginseng capsules exported to Asian pharmaceutical distributors.', dest: 'SG' },
  { company: 'Maritimes Lobster Co', contact: 'Fresh Cargo Manager', email: 'shipping@maritimeslobster.ca', product: 'Frozen Lobster Tails', desc: 'Flash-frozen Atlantic lobster packed for commercial EU restaurants.', dest: 'FR' },
  { company: 'Ontario Organic Agri', contact: 'Farm Operations', email: 'info@ontarioorganic.ca', product: 'Organic Honey & Herbs', desc: 'Raw unfiltered honey and export-grade agricultural herbs shipped to UK supermarkets.', dest: 'GB' },

  // --- Tech / Electronics / Dual-Use Category (ITAR/EAR & BIS bottleneck) ---
  { company: 'AVSS - UAV Safety Systems', contact: 'Sales Team', email: 'info@avss.co', product: 'PRS-M350 Parachute', desc: 'Drone parachute recovery safety pods containing electronic ignition triggers.', dest: 'DE' },
  { company: 'Volatus Aerospace', contact: 'Logistics Division', email: 'logistics@volatusaerospace.com', product: 'Volatus Cargo Drone V2', desc: 'Heavy payload long-range autonomous drone platforms with composite wing panels.', dest: 'GB' },
  { company: 'ARA Robotics', contact: 'Product Director', email: 'support@ara-uas.com', product: 'ARA Flight Controller', desc: 'Advanced autopilot hardware containing dual-use military-grade navigation sensors.', dest: 'JP' },
  { company: 'Aeromao Inc', contact: 'Geospatial Team', email: 'mapping@aeromao.com', product: 'Aeromapper Talon Drone', desc: 'Fixed-wing autonomous drone systems fitted with multispectral thermal cameras.', dest: 'US' },
  { company: 'Avidrone Aerospace', contact: 'Operations Lead', email: 'ops@avidrone.com', product: 'Avidrone 210 UAS', desc: 'Tandem rotor cargo unmanned aerial vehicles for long-distance transport.', dest: 'SG' },
  { company: 'Draganfly Inc', contact: 'Defense Sales', email: 'sales@draganfly.com', product: 'Commander 3 XL Drone', desc: 'Multirotor tactical UAV systems exported to European security agencies.', dest: 'DE' },
  { company: 'Pegasus Imagery', contact: 'Logistics Lead', email: 'info@pegasusimagery.ca', product: 'Aeria Sensor Payload', desc: 'Airborne surveillance cameras and radar telemetry sensors for forestry monitoring.', dest: 'US' },

  // --- Medical Devices Category (Strict FDA / CE license bottleneck) ---
  { company: 'Edmonton BioMed Devices', contact: 'Compliance Director', email: 'qa@edmontonbiomed.ca', product: 'Ultrasound Scanner Probes', desc: 'Diagnostic ultrasound transducer probes for clinical medical imaging.', dest: 'JP' },
  { company: 'Quebec MedTech Systems', contact: 'Logistics Manager', email: 'info@quebecmedtech.ca', product: 'Surgical Laser Sensors', desc: 'High-precision laser diagnostic instruments and fiber optics for surgical applications.', dest: 'DE' },
  { company: 'Ontario CardioInstruments', contact: 'Regulatory Lead', email: 'compliance@ontariocardio.ca', product: 'ECG Telemetry Monitors', desc: 'Wireless heart monitoring sensors and clinical telemetry systems.', dest: 'BR' },
  { company: 'BC Dental Imaging', contact: 'Logistics Division', email: 'shipping@bcdental.ca', product: 'Digital X-Ray Sensors', desc: 'Intraoral dental X-ray imaging receptors exported to healthcare providers.', dest: 'SG' }
];

function getCategory(hsHint) {
  if (hsHint === '1509.10' || hsHint === '0904.11') return 'food';
  if (hsHint === '8541.40') return 'electronics';
  if (hsHint === '7308.90') return 'machinery';
  if (hsHint === '9018.12') return 'medical';
  return 'general';
}

function scoreBottleneck(lead) {
  let score = 20;
  const cat = getCategory(lead.product.hs_code_hint || '8541.40');
  if (cat === 'medical') score += 40;
  if (cat === 'electronics') score += 30;
  if (cat === 'food') score += 25;

  const descLower = lead.desc.toLowerCase();
  if (descLower.includes('autonomous') || descLower.includes('military') || descLower.includes('guidance') || descLower.includes('laser')) {
    score += 20;
  }
  if (descLower.includes('dried') || descLower.includes('bulk') || descLower.includes('organic')) {
    score += 10;
  }
  return Math.min(100, score);
}

function generateMailtoLink(lead, apiResult) {
  const hsStep = apiResult.pipeline_steps.find(s => s.module === 'DDTRS:HSCode')?.output.resolved[0] || {};
  const routeStep = apiResult.pipeline_steps.find(s => s.module === 'MeridianFlow:Route')?.output || {};
  const tariffStep = apiResult.pipeline_steps.find(s => s.module === 'TradeMatch:Tariff')?.output || {};
  const complianceStep = apiResult.pipeline_steps.find(s => s.module === 'DDTRS:Compliance')?.output || {};

  const resolvedHs = hsStep.hs_code || 'Pending Audit';
  const category = hsStep.category || 'general';
  const bestRoute = routeStep.best_route || 'Direct Corridor';
  const tariffRate = tariffStep.tariff_rate !== undefined ? `${tariffStep.tariff_rate}%` : 'Variable';
  const isLicenseReq = complianceStep.license_required || false;
  const isSanctioned = complianceStep.sanctioned || false;

  const subject = `Trade Compliance Audit Report for ${lead.company}`;
  const body = `Dear ${lead.contact},

I hope this message finds you well.

As a Canadian exporter, navigating international customs and trade corridors can introduce unexpected shipping delays and tariff costs. We ran a complimentary compliance audit for your product, "${lead.product}", using CircleTrade AI.

Here is the structured export intelligence report resolved by our autonomous agents:

*   Classified HS Code: ${resolvedHs} (Category: ${category})
*   Target Corridor Route: ${bestRoute}
*   Applicable Customs Tariff: ${tariffRate}
*   Export License Required: ${isLicenseReq ? 'YES (ECCN clearance needed)' : 'NO (Standard clearance)'}
*   Sanctions Flag Status: ${isSanctioned ? 'RESTRICTED (EMBARGO)' : 'CLEARED (PASS)'}

Navigating this corridor manually takes days. CircleTrade AI ran this audit and verified the requirements in less than 2 seconds.

You can view your active shipping plan, check other global tariffs, and compile complete export blueprints directly through our portal:
👉 https://kadsam123.github.io/circletrade-ai/

Let us know if you have any questions about this audit.

Best regards,
CircleTrade AI Team`;

  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(body);
  return `mailto:${lead.email}?subject=${encodedSubject}&body=${encodedBody}`;
}

async function startCampaign() {
  console.log('================================================================');
  console.log('🤖 AI Marketing Agent: Scrape, Filter, Score & Auto-Audit Leads');
  console.log('================================================================\n');

  const scoredLeads = RAW_EXPORTERS_POOL.map(lead => {
    const bottleneckScore = scoreBottleneck(lead);
    return { ...lead, bottleneckScore };
  }).sort((a, b) => b.bottleneckScore - a.bottleneckScore);

  const targetLeads = scoredLeads.filter(l => l.bottleneckScore >= 45);
  console.log(`[AI Agent] Filtered ${targetLeads.length}/${scoredLeads.length} leads matching target trade bottlenecks.\n`);

  const auditResults = [];

  for (const lead of targetLeads) {
    console.log(`[AI Agent] Running live export audit query: ${lead.company} (${lead.product})`);

    const requestPayload = {
      customer: lead.company,
      product: {
        name: lead.product,
        description: lead.desc,
        origin_country: 'CA', // Force real ISO-2 country codes
        destination_country: lead.dest,
        hs_code_hint: lead.company.includes('Ginseng') || lead.company.includes('Lobster') ? '1509.10' : lead.company.includes('Autopilot') || lead.company.includes('Sensor') || lead.company.includes('Parachute') || lead.company.includes('Drone') ? '8541.40' : '9018.12'
      },
      additional_requirements: ['document_extraction']
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/pipeline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        body: JSON.stringify(requestPayload)
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Server returned status: ${response.status} - Body: ${errText}`);
      }

      const apiResult = await response.json();
      console.log(`   ✅ Success! request_id: ${apiResult.request_id}`);

      const hsStep = apiResult.pipeline_steps.find(s => s.module === 'DDTRS:HSCode')?.output.resolved[0] || {};
      const tariffStep = apiResult.pipeline_steps.find(s => s.module === 'TradeMatch:Tariff')?.output || {};
      const complianceStep = apiResult.pipeline_steps.find(s => s.module === 'DDTRS:Compliance')?.output || {};

      const mailtoUrl = generateMailtoLink(lead, apiResult);

      auditResults.push({
        lead,
        apiResult,
        resolvedHs: hsStep.hs_code || '9999.00',
        tariffRate: tariffStep.tariff_rate !== undefined ? `${tariffStep.tariff_rate}%` : 'Variable',
        licenseRequired: complianceStep.license_required || false,
        mailtoUrl
      });

    } catch (err) {
      console.error(`   ❌ Audit failed for ${lead.company}:`, err.message);
    }
  }

  const crmHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CircleTrade AI — Outbound Marketing CRM</title>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-dark: #070e17;
      --bg-card: #0c1622;
      --accent-teal: #00d4ff;
      --accent-violet: #7c3aed;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --border: rgba(255, 255, 255, 0.08);
      --success: #10b981;
      --warning: #f59e0b;
    }
    body {
      background-color: var(--bg-dark);
      color: var(--text-main);
      font-family: 'Outfit', sans-serif;
      margin: 0;
      padding: 24px;
    }
    .header {
      margin-bottom: 32px;
      border-bottom: 1px solid var(--border);
      padding-bottom: 20px;
    }
    .header h1 {
      margin: 0 0 8px;
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .header p {
      margin: 0;
      color: var(--text-muted);
      font-size: 14px;
    }
    .crm-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 20px;
    }
    .lead-card {
      background-color: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      position: relative;
      transition: all 0.2s ease;
    }
    .lead-card:hover {
      border-color: var(--accent-teal);
      transform: translateY(-2px);
    }
    .lead-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .lead-title h3 {
      margin: 0 0 4px;
      font-size: 18px;
      font-weight: 600;
    }
    .lead-title span {
      font-size: 12px;
      color: var(--text-muted);
      font-family: 'JetBrains Mono', monospace;
    }
    .score-badge {
      background: rgba(0, 212, 255, 0.1);
      border: 1px solid var(--accent-teal);
      color: var(--accent-teal);
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
    .lead-details {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 12px;
      background: rgba(255,255,255,0.02);
      padding: 12px;
      border-radius: 8px;
      border: 1px solid var(--border);
    }
    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .detail-label {
      font-size: 10px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .detail-value {
      font-size: 14px;
      font-weight: 500;
    }
    .lead-pitch-box {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 8px;
      padding: 12px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      color: var(--text-muted);
      white-space: pre-wrap;
      max-height: 120px;
      overflow-y: auto;
      border: 1px solid var(--border);
    }
    .action-btn {
      display: inline-block;
      text-align: center;
      background: linear-gradient(135deg, var(--accent-teal), var(--accent-violet));
      color: #fff;
      text-decoration: none;
      padding: 10px 16px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      transition: opacity 0.2s;
    }
    .action-btn:hover {
      opacity: 0.9;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 CircleTrade AI — Outbound Marketing CRM</h1>
    <p>Filtered and scored autonomously. Verified against production API stack. Ready to transact.</p>
  </div>
  <div class="crm-grid">
    ${auditResults.map(res => `
      <div class="lead-card">
        <div class="lead-header">
          <div class="lead-title">
            <h3>${res.lead.company}</h3>
            <span>Contact: ${res.lead.contact} (${res.lead.email})</span>
          </div>
          <div class="score-badge">BOTTLENECK SCORE: ${res.lead.bottleneckScore}%</div>
        </div>
        <div class="lead-details">
          <div class="detail-item">
            <span class="detail-label">Export Route</span>
            <span class="detail-value">${res.lead.origin} → ${res.lead.dest}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">HS Code</span>
            <span class="detail-value" style="font-family: 'JetBrains Mono';">${res.resolvedHs}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Tariff Rate</span>
            <span class="detail-value">${res.tariffRate}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Regulatory Vibe</span>
            <span class="detail-value" style="color: ${res.licenseRequired ? 'var(--warning)' : 'var(--success)'}">
              ${res.licenseRequired ? '⚠️ License Required' : '✅ Standard'}
            </span>
          </div>
        </div>
        <div class="lead-pitch-box">Subject: Free Compliance Audit for ${res.lead.company}

Dear ${res.lead.contact},

We ran a trade compliance audit for your product "${res.lead.product}" exporting to ${res.lead.dest}...
HS Classified: ${res.resolvedHs}
Tariff: ${res.tariffRate}
License: ${res.licenseRequired ? 'Required' : 'Not Required'}
Check plan here: https://kadsam123.github.io/circletrade-ai/</div>
        <a href="${res.mailtoUrl}" class="action-btn">📧 Open Click-to-Send Email Pitch</a>
      </div>
    `).join('')}
  </div>
</body>
</html>
  `;

  const outputPath = path.join(__dirname, 'lead_crm_dashboard.html');
  fs.writeFileSync(outputPath, crmHtml, 'utf8');

  console.log('\n================================================================');
  console.log(`🎉 Campaign complete. Lead CRM Generated: ${outputPath}`);
  console.log('================================================================');
}

startCampaign();
