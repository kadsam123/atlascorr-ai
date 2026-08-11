/* ============================================================
   CircleTrade AI — Mock Data Layer
   Provides realistic static data for all four AI modules.
   ============================================================ */
window.CT = window.CT || {};

CT.data = {

  // ── SME Customer Profiles ──────────────────────────────────
  customers: [
    {
      id: 'SME-001',
      name: 'Hargreaves Textiles Ltd',
      country: 'UK',
      flag: '🇬🇧',
      sector: 'Textiles & Apparel',
      products: [
        { id: 'P001', name: 'Merino Wool Scarves',  hsCode: '6117.10', category: 'textiles' },
        { id: 'P002', name: 'Cotton Dress Shirts',   hsCode: '6205.20', category: 'textiles' },
      ],
      budget: 45000,
      riskTolerance: 'medium',
      targetMarkets: ['UAE', 'Japan', 'Australia'],
      status: 'active',
      lastRun: '2026-08-10T09:00:00Z',
    },
    {
      id: 'SME-002',
      name: 'GreenTech Solutions GmbH',
      country: 'Germany',
      flag: '🇩🇪',
      sector: 'Clean Energy Equipment',
      products: [
        { id: 'P003', name: 'Solar Panel Mounting Systems', hsCode: '7308.90', category: 'machinery'  },
        { id: 'P004', name: 'Battery Storage Units',        hsCode: '8507.60', category: 'electronics' },
      ],
      budget: 120000,
      riskTolerance: 'low',
      targetMarkets: ['India', 'Brazil', 'South Africa'],
      status: 'active',
      lastRun: '2026-08-10T09:00:00Z',
    },
    {
      id: 'SME-003',
      name: 'Artisan Foods Co.',
      country: 'Italy',
      flag: '🇮🇹',
      sector: 'Food & Beverage',
      products: [
        { id: 'P005', name: 'Truffle-Infused Olive Oil', hsCode: '1509.10', category: 'food' },
        { id: 'P006', name: 'Aged Parmesan Cheese',      hsCode: '0406.20', category: 'food' },
      ],
      budget: 30000,
      riskTolerance: 'medium',
      targetMarkets: ['Singapore', 'Hong Kong', 'UAE'],
      status: 'active',
      lastRun: '2026-08-09T09:00:00Z',
    },
    {
      id: 'SME-004',
      name: 'MedDevPro Inc.',
      country: 'USA',
      flag: '🇺🇸',
      sector: 'Medical Devices',
      products: [
        { id: 'P007', name: 'Portable Ultrasound Devices', hsCode: '9018.12', category: 'medical' },
        { id: 'P008', name: 'Surgical Instrument Sets',     hsCode: '9018.90', category: 'medical' },
      ],
      budget: 200000,
      riskTolerance: 'low',
      targetMarkets: ['EU', 'Canada', 'Australia'],
      status: 'active',
      lastRun: '2026-08-10T09:00:00Z',
    },
    {
      id: 'SME-005',
      name: 'Spice Route Trading',
      country: 'India',
      flag: '🇮🇳',
      sector: 'Agricultural Commodities',
      products: [
        { id: 'P009', name: 'Organic Turmeric Powder', hsCode: '0910.30', category: 'food' },
        { id: 'P010', name: 'Black Pepper Whole',       hsCode: '0904.11', category: 'food' },
      ],
      budget: 20000,
      riskTolerance: 'high',
      targetMarkets: ['UK', 'USA', 'Canada', 'Germany'],
      status: 'active',
      lastRun: '2026-08-11T06:00:00Z',
    },
  ],

  // ── Trade Corridors ─────────────────────────────────────────
  corridors: [
    { id:'C001', origin:'UK',      destination:'UAE',          name:'UK → UAE',        score:87, transitDays:9,  costIndex:3.2, portEfficiency:91, politicalRisk:12, volume:4.2,  trend:'up'     },
    { id:'C002', origin:'EU',      destination:'SE Asia',      name:'EU → SE Asia',    score:82, transitDays:18, costIndex:4.1, portEfficiency:88, politicalRisk:18, volume:8.7,  trend:'up'     },
    { id:'C003', origin:'USA',     destination:'EU',           name:'USA → EU',        score:79, transitDays:12, costIndex:3.8, portEfficiency:85, politicalRisk:8,  volume:12.1, trend:'stable' },
    { id:'C004', origin:'India',   destination:'USA',          name:'India → USA',     score:75, transitDays:21, costIndex:3.5, portEfficiency:78, politicalRisk:22, volume:6.3,  trend:'up'     },
    { id:'C005', origin:'Germany', destination:'India',        name:'DE → India',      score:73, transitDays:20, costIndex:4.0, portEfficiency:76, politicalRisk:25, volume:3.8,  trend:'up'     },
    { id:'C006', origin:'Italy',   destination:'Singapore',    name:'IT → Singapore',  score:88, transitDays:22, costIndex:3.9, portEfficiency:95, politicalRisk:5,  volume:2.9,  trend:'up'     },
    { id:'C007', origin:'USA',     destination:'LATAM',        name:'USA → LATAM',     score:68, transitDays:14, costIndex:3.2, portEfficiency:71, politicalRisk:35, volume:5.4,  trend:'down'   },
    { id:'C008', origin:'UK',      destination:'Australia',    name:'UK → Australia',  score:81, transitDays:28, costIndex:5.1, portEfficiency:89, politicalRisk:7,  volume:3.1,  trend:'stable' },
  ],

  // ── Destination Markets ─────────────────────────────────────
  markets: [
    { id:'M001', name:'United Arab Emirates', code:'UAE', region:'Middle East',    gdpGrowth:4.2, importGrowth:7.8,  easeOfTrade:88, bestCategories:['textiles','food','electronics','medical'] },
    { id:'M002', name:'Singapore',            code:'SGP', region:'SE Asia',        gdpGrowth:3.8, importGrowth:6.1,  easeOfTrade:95, bestCategories:['food','machinery','medical']              },
    { id:'M003', name:'Japan',                code:'JPN', region:'East Asia',      gdpGrowth:1.9, importGrowth:3.2,  easeOfTrade:82, bestCategories:['textiles','food']                        },
    { id:'M004', name:'India',                code:'IND', region:'South Asia',     gdpGrowth:6.5, importGrowth:9.4,  easeOfTrade:67, bestCategories:['machinery','electronics','medical']       },
    { id:'M005', name:'Brazil',               code:'BRA', region:'South America',  gdpGrowth:2.8, importGrowth:5.2,  easeOfTrade:59, bestCategories:['machinery','medical']                    },
    { id:'M006', name:'South Africa',         code:'ZAF', region:'Africa',         gdpGrowth:1.5, importGrowth:4.3,  easeOfTrade:62, bestCategories:['machinery','medical']                    },
    { id:'M007', name:'Germany',              code:'DEU', region:'Europe',         gdpGrowth:1.8, importGrowth:2.9,  easeOfTrade:91, bestCategories:['food','textiles']                        },
    { id:'M008', name:'Hong Kong',            code:'HKG', region:'East Asia',      gdpGrowth:2.1, importGrowth:4.8,  easeOfTrade:94, bestCategories:['food','textiles','electronics']          },
    { id:'M009', name:'Canada',               code:'CAN', region:'North America',  gdpGrowth:2.4, importGrowth:3.7,  easeOfTrade:87, bestCategories:['food','medical']                         },
    { id:'M010', name:'Australia',            code:'AUS', region:'Oceania',        gdpGrowth:2.9, importGrowth:5.1,  easeOfTrade:86, bestCategories:['textiles','food','medical']              },
    { id:'M011', name:'United Kingdom',       code:'GBR', region:'Europe',         gdpGrowth:1.4, importGrowth:2.8,  easeOfTrade:89, bestCategories:['food','textiles']                        },
    { id:'M012', name:'United States',        code:'USA', region:'North America',  gdpGrowth:2.7, importGrowth:4.1,  easeOfTrade:84, bestCategories:['food','medical','machinery']             },
    { id:'M013', name:'South Korea',          code:'KOR', region:'East Asia',      gdpGrowth:2.5, importGrowth:4.3,  easeOfTrade:83, bestCategories:['electronics','machinery']                },
    { id:'M014', name:'Netherlands',          code:'NLD', region:'Europe',         gdpGrowth:1.9, importGrowth:3.5,  easeOfTrade:90, bestCategories:['food','machinery']                       },
    { id:'M015', name:'Vietnam',              code:'VNM', region:'SE Asia',        gdpGrowth:6.8, importGrowth:11.2, easeOfTrade:70, bestCategories:['textiles','machinery']                   },
  ],

  // ── Tariff Table by Category × Destination Code ────────────
  tariffTable: {
    textiles:    { UAE:5,  SGP:0,  JPN:8.4,  IND:20,  AUS:10, GBR:12, USA:11.4, DEU:12, HKG:0,   CAN:14,  ZAF:30, BRA:35, KOR:13, NLD:12, VNM:12 },
    food:        { UAE:5,  SGP:0,  JPN:15.3, IND:30,  AUS:0,  GBR:0,  USA:5.6,  DEU:15, HKG:0,   CAN:0,   ZAF:30, BRA:55, KOR:54, NLD:15, VNM:30 },
    machinery:   { UAE:5,  SGP:0,  JPN:0,    IND:7.5, AUS:5,  GBR:0,  USA:0,    DEU:0,  HKG:0,   CAN:0,   ZAF:10, BRA:14, KOR:0,  NLD:0,  VNM:0  },
    electronics: { UAE:5,  SGP:0,  JPN:0,    IND:15,  AUS:5,  GBR:0,  USA:0,    DEU:0,  HKG:0,   CAN:0,   ZAF:10, BRA:16, KOR:0,  NLD:0,  VNM:0  },
    medical:     { UAE:5,  SGP:0,  JPN:0,    IND:12,  AUS:0,  GBR:0,  USA:0,    DEU:0,  HKG:0,   CAN:0,   ZAF:15, BRA:14, KOR:0,  NLD:0,  VNM:0  },
  },

  // ── HS Code Keyword Extractor Map ──────────────────────────
  hsCodes: {
    'wool':'5101.11',   'merino':'6117.10',   'cotton':'6205.20',   'shirt':'6205.20',
    'scarf':'6117.10',  'textile':'5208.11',  'fabric':'5208.11',   'apparel':'6211.20',
    'solar':'8541.40',  'panel':'8541.40',    'battery':'8507.60',  'storage':'8507.60',
    'oil':'1509.10',    'olive':'1509.10',    'truffle':'1509.10',  'cheese':'0406.20',
    'parmesan':'0406.20', 'dairy':'0406.20',  'ultrasound':'9018.12','medical':'9018.90',
    'surgical':'9018.90','instrument':'9018.90','device':'9018.12', 'turmeric':'0910.30',
    'spice':'0910.30',  'pepper':'0904.11',   'mounting':'7308.90', 'steel':'7308.90',
    'electronic':'8542.31','circuit':'8542.31','food':'2106.90',    'chemical':'2904.99',
    'pharmaceutical':'3004.90','drug':'3004.90','cosmetic':'3304.99',
  },

  // ── Sanctioned / Restricted Destinations ───────────────────
  sanctionedCountries: ['Iran', 'North Korea', 'Syria', 'Cuba', 'Venezuela', 'Belarus', 'Myanmar'],

  // ── Compliance Rules by Category ───────────────────────────
  complianceRules: {
    medical:     { requiresLicense:true,  licenseType:'FDA Export Permit / CE Mark',        checkBody:'FDA / EMA',    dualUse:false },
    electronics: { requiresLicense:false, licenseType:null,                                  checkBody:'BIS / ECCN',   dualUse:true  },
    machinery:   { requiresLicense:false, licenseType:null,                                  checkBody:'BIS / ECCN',   dualUse:true  },
    food:        { requiresLicense:false, licenseType:null, certRequired:'Phytosanitary / Food Safety Certificate', checkBody:'USDA / EFSA', dualUse:false },
    textiles:    { requiresLicense:false, licenseType:null,                                  checkBody:'WTO / GATT',   dualUse:false },
  },
};
