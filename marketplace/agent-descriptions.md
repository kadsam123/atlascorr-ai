# CircleTrade AI — Agent Marketplace Descriptions

> **Platform:** CircleTrade AI · **App:** https://kadsam123.github.io/circletrade-ai/ · **API Base:** https://api.circletrade.ai  
> **Stack:** Circle Agent Stack v1 · 7 specialist export-intelligence agents

---

## 1. HS Code Agent

### Tagline
> *"Turn any product description into a globally-recognised tariff code in seconds."*

### Description
The HS Code Agent uses large-language-model reasoning combined with a curated Harmonised System (HS) ontology to extract the correct 6-digit (or country-extended 8–10 digit) HS code from free-text product descriptions. It is built for exporters, freight forwarders, customs brokers, and e-commerce operators who lose hours — and money — manually searching customs tariff schedules. By classifying goods accurately upfront, businesses avoid mis-declaration penalties, prevent shipment delays, and unlock the correct duty rates before a purchase order is signed. The agent returns the most probable HS code alongside confidence scoring and alternative codes when ambiguity exists, giving compliance teams an auditable starting point rather than a black-box result.

### Capabilities
- Classifies any physical product description into the correct HS chapter, heading, and 6-digit subheading
- Returns up to 3 alternative HS codes with confidence scores when the description is ambiguous
- Supports country-specific extensions: UK 10-digit commodity codes, EU CN8, US HTS 10-digit
- Flags descriptions that are too vague to classify reliably and prompts for additional product detail
- Explains the classification rationale in plain English, citing the relevant HS chapter notes

### Example User Prompts
1. *"What is the HS code for cold-pressed extra virgin olive oil in glass bottles of 500ml?"*
2. *"Classify: brushless DC electric motors, 24V, 500W, used in industrial conveyor systems."*
3. *"I'm exporting bamboo cutting boards with a silicone non-slip base — what's my HS code?"*
4. *"Give me the UK commodity code for women's woollen overcoats, not knitted, weight over 500g."*

### Example Output
```json
{
  "agent": "hs-code",
  "product_input": "cold-pressed extra virgin olive oil in 500ml glass bottles",
  "primary_result": {
    "hs_code": "1509.10",
    "description": "Virgin olive oil and its fractions",
    "confidence": 0.97,
    "chapter": "15",
    "chapter_description": "Animal or vegetable fats and oils"
  },
  "country_extensions": {
    "UK": "15091010",
    "EU_CN8": "15091010",
    "US_HTS": "1509.10.2000"
  },
  "alternatives": [
    { "hs_code": "1509.90", "description": "Other olive oil", "confidence": 0.03 }
  ],
  "rationale": "Extra virgin classification confirmed by 'cold-pressed' qualifier. HS 1509.10 covers virgin olive oil and fractions thereof. HS Chapter 15 Note 1 applies.",
  "flags": []
}
```

### Pricing
| Tier | Price |
|------|-------|
| Per call | **£0.10** |
| Volume (500+/mo) | Contact sales |

### Limitations / What It Does NOT Do
- Does **not** provide legally binding customs rulings — for binding tariff information (BTI) consult your national customs authority
- Does **not** classify services, digital goods, or intangible assets
- Does **not** account for product-specific import prohibitions or end-use reliefs
- Classification accuracy depends on the quality and specificity of the product description provided

---

## 2. Tariff Agent

### Tagline
> *"Instant duty rates for any HS code and destination country — know your landed cost before you commit."*

### Description
The Tariff Agent retrieves current import duty rates, VAT/GST rates, and applicable trade preference rates for any HS code exported to a specific destination country. It draws on a continuously updated database of WTO bound rates, bilateral and regional trade agreement (FTA) preferential rates, and most-favoured-nation (MFN) rates — covering 180+ destination markets. Designed for export sales teams, finance directors, and supply chain analysts, it transforms the opaque world of customs tariffs into a simple cost calculation that sits directly inside your quoting workflow. The agent also surfaces anti-dumping duties, countervailing duties, and quota information where applicable, ensuring no hidden landed-cost surprise reaches your customer invoice.

### Capabilities
- Returns MFN, FTA preferential, and GSP duty rates for any valid HS code + destination pair
- Calculates effective landed cost impact as a percentage of declared customs value
- Identifies applicable trade agreements (e.g., UK–Australia FTA, EU–Japan EPA) and preferential rate conditions
- Surfaces anti-dumping duties, safeguard measures, and tariff-rate quotas (TRQs) where active
- Returns VAT/GST rate at import and indicates whether VAT deferment schemes apply

### Example User Prompts
1. *"What's the import duty rate for HS 6403.51 leather shoes entering the European Union from the UK?"*
2. *"Give me all applicable tariff rates for HS 8471.30 laptops exported from the UK to India."*
3. *"Is there a preferential rate under CPTPP for HS 0901.11 green coffee beans shipped to Japan?"*
4. *"What are the anti-dumping duties on HS 7214.20 steel rebar being exported to the US?"*

### Example Output
```json
{
  "agent": "tariff",
  "hs_code": "6403.51",
  "origin_country": "GB",
  "destination_country": "EU",
  "tariff_rates": {
    "MFN_rate_pct": 3.7,
    "preferential_rate_pct": 0.0,
    "applicable_agreement": "UK–EU Trade and Cooperation Agreement (TCA)",
    "preference_conditions": "Rules of origin: sufficient processing in UK required; EUR.1 or REX declaration needed",
    "GSP_rate_pct": null
  },
  "indirect_taxes": {
    "VAT_rate_pct": 20.0,
    "VAT_deferment_available": true,
    "notes": "Varies by EU member state; Germany 19%, France 20%"
  },
  "special_measures": {
    "anti_dumping": false,
    "safeguard": false,
    "TRQ_active": false
  },
  "effective_landed_cost_uplift_pct": 0.0,
  "data_as_of": "2026-08-01",
  "disclaimer": "Indicative rates only. Verify with official TARIC/customs authority before filing."
}
```

### Pricing
| Tier | Price |
|------|-------|
| Per call | **£0.20** |
| Volume (250+/mo) | Contact sales |

### Limitations / What It Does NOT Do
- Does **not** provide legally binding duty rates; always verify with the destination country's customs authority
- Does **not** calculate excise duties, environmental levies, or product-specific licence fees
- Does **not** handle in-quota vs out-of-quota TRQ administration
- Rate data has a publication lag of up to 30 days for newly negotiated agreements

---

## 3. RouteAgent

### Tagline
> *"Score and rank every trade corridor so you export smarter, not harder."*

### Description
The RouteAgent evaluates and ranks trade corridors for a given product and origin country, scoring each potential route across five dimensions: duty cost, logistics cost and lead time, market demand strength, regulatory friction, and political/payment risk. It synthesises tariff data, World Bank logistics performance indices, IMF trade flow statistics, and country risk ratings into a single corridor score (0–100), giving export managers and trade strategists an objective, data-backed ranking of where to focus sales effort. Rather than choosing markets by intuition or historical relationships, businesses can use RouteAgent output to prioritise resources, build market-entry roadmaps, and justify board-level trade investment decisions with quantitative evidence.

### Capabilities
- Scores up to 25 trade corridors simultaneously on a normalised 0–100 composite score
- Breaks down each corridor score across 5 weighted sub-dimensions: duty cost, logistics, demand, regulation, and risk
- Ranks corridors by overall score and provides a tiered recommendation: Priority, Develop, Monitor, Avoid
- Calculates estimated duty-inclusive export unit cost for each corridor
- Identifies the single biggest improvement lever for low-scoring corridors (e.g., FTA qualification, Incoterms optimisation)

### Example User Prompts
1. *"Rank the best trade corridors for exporting UK-made gin to Southeast Asia."*
2. *"Score routes from the UK to 10 African markets for HS 8517.12 smartphones."*
3. *"Which corridor gives the lowest landed cost for our HS 3004.90 pharmaceutical tablets — UAE, India, or Singapore?"*
4. *"Compare exporting to Canada vs Australia vs New Zealand for our artisan cheese business."*

### Example Output
```json
{
  "agent": "route",
  "product": "UK-made gin",
  "hs_code": "2208.50",
  "origin": "GB",
  "corridors_evaluated": 8,
  "top_corridors": [
    {
      "destination": "Singapore",
      "overall_score": 84,
      "tier": "Priority",
      "sub_scores": {
        "duty_cost": 90,
        "logistics": 88,
        "market_demand": 82,
        "regulatory_friction": 79,
        "political_risk": 92
      },
      "MFN_duty_pct": 0.0,
      "estimated_landed_cost_uplift_pct": 4.2,
      "key_lever": "Register brand with Singapore Food Agency for premium positioning"
    },
    {
      "destination": "Japan",
      "overall_score": 77,
      "tier": "Priority",
      "sub_scores": {
        "duty_cost": 72,
        "logistics": 85,
        "market_demand": 88,
        "regulatory_friction": 65,
        "political_risk": 90
      },
      "MFN_duty_pct": 0.0,
      "estimated_landed_cost_uplift_pct": 6.1,
      "key_lever": "UK–Japan CEPA preferential rate applies; ensure Form A documentation"
    }
  ],
  "avoid_list": ["Myanmar", "Belarus"],
  "generated_at": "2026-08-11T17:41:00Z"
}
```

### Pricing
| Tier | Price |
|------|-------|
| Per call | **£0.50** |
| Volume (100+/mo) | Contact sales |

### Limitations / What It Does NOT Do
- Does **not** replace full market entry studies or in-country due diligence
- Does **not** account for distributor availability, brand positioning, or cultural fit
- Corridor scores are indicative models; real logistics quotes should be obtained before commitment
- Risk ratings are based on published indices (World Bank, OECD) and may lag real-world events by 1–3 months

---

## 4. MarketAgent

### Tagline
> *"Find the markets where your product has the highest chance of success — ranked by opportunity score."*

### Description
The MarketAgent analyses a product category or HS code and matches it to the markets where demand signals, competitive positioning, import growth trends, and per-capita spend indicators converge into the strongest near-term commercial opportunity. Unlike a generic market research tool, MarketAgent is purpose-built for export: it combines trade flow data (UN Comtrade, ITC Trade Map), economic indicators, and sector-specific demand drivers to produce an opportunity score for each market. It is the ideal first step for exporters looking to expand their addressable market beyond familiar geographies, giving sales and marketing teams a short-list of validated, data-backed target markets rather than an overwhelmingly large map.

### Capabilities
- Generates opportunity scores (0–100) for up to 20 markets per query based on demand, growth, and competitive whitespace
- Surfaces import trend data: 3-year CAGR of the product category into each market
- Identifies the top 3 competing exporter nations in each market and estimates UK market share gap
- Flags markets with strong buyer concentration (B2B lead potential) vs fragmented consumer demand
- Highlights relevant trade shows, regulatory entry points, and buyer communities per market

### Example User Prompts
1. *"Which markets have the highest opportunity score for UK-manufactured safety footwear?"*
2. *"Find me the top 5 markets for plant-based food products — where is demand growing fastest?"*
3. *"Match our HS 9403.20 steel office furniture range to the best 3 export markets."*
4. *"I make bespoke Scottish tweed fabric — where should I be selling internationally?"*

### Example Output
```json
{
  "agent": "market",
  "product": "plant-based food products",
  "hs_codes_analysed": ["2106.10", "2106.90", "1601.00"],
  "markets_scored": 20,
  "top_opportunities": [
    {
      "market": "United Arab Emirates",
      "opportunity_score": 88,
      "import_3yr_CAGR_pct": 34.2,
      "uk_market_share_pct": 4.1,
      "uk_market_share_gap": "High — top exporters are USA (31%) and Netherlands (18%)",
      "demand_profile": "B2C: health-conscious urban consumers; premium price tolerance high",
      "competitive_whitespace": "Certified halal plant-based SKUs severely undersupplied",
      "key_entry_points": ["Gulfood Dubai (Feb)", "Dubai Municipality food registration"]
    },
    {
      "market": "South Korea",
      "opportunity_score": 81,
      "import_3yr_CAGR_pct": 28.7,
      "uk_market_share_pct": 1.9,
      "demand_profile": "B2C: K-wellness trend driving premium imports; younger demographic",
      "competitive_whitespace": "UK-origin premium branding underrepresented vs US brands"
    }
  ],
  "generated_at": "2026-08-11T17:41:00Z"
}
```

### Pricing
| Tier | Price |
|------|-------|
| Per call | **£0.50** |
| Volume (100+/mo) | Contact sales |

### Limitations / What It Does NOT Do
- Does **not** conduct primary research or in-country consumer surveys
- Does **not** assess distributor or retail partner availability in target markets
- Opportunity scores are quantitative models and do not account for brand reputation or existing relationships
- Trade flow data may have a 12–18 month lag for some reporting countries

---

## 5. OpportunityAgent

### Tagline
> *"A full 15-market opportunity scan — your export strategy starting point in one call."*

### Description
The OpportunityAgent is CircleTrade AI's most comprehensive single-call intelligence product, conducting a full export opportunity scan across 15+ markets simultaneously. It combines the capabilities of MarketAgent and RouteAgent into a unified analysis: classifying the product, scoring each market for opportunity, ranking trade corridors, estimating duty costs, and flagging top compliance risks — all returned as a structured, boardroom-ready opportunity brief. Built for export directors, trade finance teams, and DIT/DBT-funded export advisers who need a credible starting point for strategy workshops or funding applications, OpportunityAgent eliminates weeks of manual research and delivers a consistent, repeatable analysis framework that can be run monthly to track how the global opportunity landscape shifts.

### Capabilities
- Scans 15+ global markets in a single call, covering demand, corridor score, duty cost, and compliance risk
- Produces a tiered market shortlist: Top 3 Priority markets, 3–5 Develop markets, and Watch list
- Estimates total addressable export revenue per market based on category size and UK market share gap
- Generates a narrative opportunity summary per market (3–4 sentences) suitable for board presentations
- Flags the top compliance check required per market (e.g., product certification, sanctions risk, labelling law)

### Example User Prompts
1. *"Run a full opportunity scan for my HS 8481.20 pneumatic valves product line."*
2. *"Give me a 15-market opportunity report for UK-made luxury candles and home fragrance."*
3. *"OpportunityAgent: where should a £2M-revenue Welsh food producer focus their export growth?"*
4. *"Scan global markets for HS 3401.11 toilet soap bars — I need a board-ready brief."*

### Example Output
```json
{
  "agent": "opportunity",
  "product": "UK luxury candles and home fragrance",
  "hs_code": "3406.00",
  "markets_scanned": 16,
  "priority_markets": [
    {
      "rank": 1,
      "market": "USA",
      "opportunity_score": 91,
      "corridor_score": 85,
      "MFN_duty_pct": 0.0,
      "estimated_TAM_gbp": "£420M",
      "uk_share_gap_pct": 12.3,
      "top_compliance_flag": "CPSC flammability standard 16 CFR 1500.44 — lab test required",
      "narrative": "The US home fragrance market is growing at 8.4% CAGR, driven by premium lifestyle spending. UK-origin products command a 'British heritage' premium of 15–20% over domestic brands. Entry via Amazon US Luxury Stores and Nordstrom requires CPSC certification."
    },
    {
      "rank": 2,
      "market": "Germany",
      "opportunity_score": 86,
      "corridor_score": 88,
      "MFN_duty_pct": 0.0,
      "estimated_TAM_gbp": "£310M",
      "top_compliance_flag": "REACH SVHC substance declaration required for fragrance compounds"
    }
  ],
  "develop_markets": ["Australia", "Canada", "UAE"],
  "watch_list": ["India", "Brazil", "Saudi Arabia"],
  "generated_at": "2026-08-11T17:41:00Z"
}
```

### Pricing
| Tier | Price |
|------|-------|
| Per call | **£1.00** |
| Full Pipeline (all 7 agents) | **£5.00** |
| Volume (50+/mo) | Contact sales |

### Limitations / What It Does NOT Do
- Does **not** replace a full market entry study or in-country legal due diligence
- Does **not** produce financial projections or guaranteed revenue forecasts
- Compliance flags are indicative starting points — full compliance checks require ComplianceAgent
- Data currency varies by market; emerging market data may lag by 18–24 months

---

## 6. ComplianceAgent

### Tagline
> *"Export compliantly. Sanctions, licences, and DTTRS checks before the shipment leaves the door."*

### Description
The ComplianceAgent is CircleTrade AI's export control and regulatory compliance gateway. Before any shipment moves, it checks the product (by HS code), the destination country, and the end-user against the UK's Export Control Joint Unit (ECJU) dual-use and military control lists, the DTTRS (Department for Transport Trade Restrictions and Sanctions) database, the UK Consolidated List of Financial Sanctions Targets, and OFAC/EU sanctions registers. It flags whether an Export Licence is required, identifies prohibited destinations, and surfaces product-specific labelling, certification, and registration requirements for the destination market. Designed for compliance officers, freight forwarders, and export managers, it transforms a historically manual, error-prone process into an auditable, API-driven compliance checkpoint that can be embedded directly into ERP and order management systems.

### Capabilities
- Checks HS code against UK dual-use (UK Dual-Use List) and military control lists for licence requirements
- Screens destination country against active UK, EU, UN, and OFAC sanctions regimes
- Returns a binary PASS / REVIEW / BLOCK result with specific flag codes and regulatory references
- Identifies product-specific certification requirements: CE marking, FDA registration, REACH, RoHS, etc.
- Generates a compliance summary memo formatted for audit files and trade finance documentation

### Example User Prompts
1. *"Check compliance for exporting HS 8542.31 integrated circuits to China."*
2. *"Is there a licence requirement to export night-vision equipment (HS 9013.20) to Saudi Arabia?"*
3. *"Run a sanctions and export control check for HS 3601.00 propellants being shipped to Russia."*
4. *"What certifications do I need to export HS 9018.90 medical devices to the United States?"*

### Example Output
```json
{
  "agent": "compliance",
  "hs_code": "8542.31",
  "product_description": "Integrated circuits — processors and controllers",
  "destination_country": "CN",
  "overall_result": "REVIEW",
  "flags": [
    {
      "flag_code": "DUAL_USE_LICENCE",
      "severity": "HIGH",
      "detail": "HS 8542.31 appears on UK Dual-Use List Category 3A001. An Export Licence (OGEL or SIEL) is required for export to China above performance thresholds. Check ECJU SPIRE system.",
      "reference": "UK Strategic Export Control List — ML3 / 3A001"
    },
    {
      "flag_code": "US_REEXPORT_RESTRICTION",
      "severity": "MEDIUM",
      "detail": "If components contain US-origin IP or are manufactured with US equipment, EAR99 / ECCN classification and BIS re-export restrictions apply.",
      "reference": "US Export Administration Regulations 15 CFR 734"
    }
  ],
  "sanctions_check": {
    "UK_sanctions": "CLEAR",
    "EU_sanctions": "CLEAR",
    "OFAC_SDN": "CLEAR",
    "UN_sanctions": "CLEAR"
  },
  "certifications_required": [],
  "compliance_memo_available": true,
  "generated_at": "2026-08-11T17:41:00Z"
}
```

### Pricing
| Tier | Price |
|------|-------|
| Per call | **£0.75** |
| Full Pipeline (all 7 agents) | **£5.00** |
| Volume (200+/mo) | Contact sales |

### Limitations / What It Does NOT Do
- Does **not** provide a legally binding export control determination — final licensing decisions rest with ECJU
- Does **not** screen individual end-users or entities against the full Consolidated List (use dedicated KYC/AML tools for person-level screening)
- Does **not** cover import restrictions at the destination country (e.g., import bans, quarantine requirements)
- Sanctions data is updated daily; intra-day changes may not be reflected immediately

---

## 7. ExportPlanAgent

### Tagline
> *"From product to export strategy — a complete, investor-ready export plan generated in minutes."*

### Description
The ExportPlanAgent is the flagship output agent of the Circle Agent Stack, synthesising the intelligence from all preceding agents into a structured, narrative export strategy document. It takes a product description, target market (or market shortlist), and business context, and generates a full export plan: market overview, target customer profile, recommended market entry mode, logistics and distribution strategy, compliance and licensing roadmap, financial model (duty costs, landed cost, suggested export pricing), and a phased 12-month action plan with milestones. The output is designed to meet the documentation standards expected by UKEF (UK Export Finance), DIT/DBT export growth programmes, and high-street bank trade finance departments — meaning it can be used directly in funding applications, board papers, and partner negotiations without heavy reformatting.

### Capabilities
- Generates a structured 8-section export plan document (see output schema below)
- Produces a financial summary: duty cost estimate, landed cost model, break-even export volume, and suggested CIF pricing
- Recommends market entry mode with rationale: direct export, distributor, agent, JV, or e-commerce channel
- Creates a 12-month phased action plan with 90-day quick-win milestones
- Outputs in Markdown (default), DOCX-compatible structure, or JSON for system integration

### Example User Prompts
1. *"Generate a full export plan for my Welsh craft beer brand entering the Japanese market."*
2. *"Build an export strategy document for HS 8479.89 industrial mixing machines targeting Saudi Arabia and UAE."*
3. *"I need a UKEF-ready export plan for my cybersecurity software company entering the US Federal market."*
4. *"Create a 12-month export roadmap for our sustainable packaging business — target markets: Germany, Netherlands, Denmark."*

### Example Output
```json
{
  "agent": "export-plan",
  "plan_id": "EP-2026-08-114892",
  "product": "Welsh craft beer",
  "target_market": "Japan",
  "hs_code": "2203.00",
  "sections": {
    "1_executive_summary": "A 12-month export plan targeting Japan's £2.1B premium beer import market. UK craft beer holds a 'British heritage' premium positioning opportunity with an estimated landed price of ¥2,800–3,200 per 330ml unit at retail, generating an estimated Year 1 export revenue of £85,000–£120,000 at target volumes.",
    "2_market_overview": { "market_size_gbp": "2.1B", "import_CAGR_3yr_pct": 11.2, "UK_share_pct": 0.9, "top_competitors": ["Germany", "Belgium", "USA"] },
    "3_target_customer_profile": "Urban professional, 28–45, disposable income in top quartile, frequents izakaya and specialty beer bars in Tokyo, Osaka, and Fukuoka. Influenced by social media, craft provenance, and origin storytelling.",
    "4_market_entry_mode": { "recommended": "Specialist importer/distributor", "rationale": "Japan's 3-tier alcohol distribution system requires a licensed importer. Direct-to-retail is not legally permitted. Recommended: partner with a Tokyo-based craft beer importer.", "alternatives": ["E-commerce via Rakuten with importer fulfilment", "Duty Free airport channel via AELIA/DFS"] },
    "5_logistics_strategy": { "incoterms": "CIF Yokohama", "lead_time_days": 28, "cold_chain_required": false, "recommended_freight": "LCL ocean freight via Felixstowe–Yokohama" },
    "6_compliance_roadmap": ["Register with Japan National Tax Agency as foreign alcohol producer", "Label in Japanese per Food Labelling Standards (FLS) Article 3", "FMCG import inspection by MHLW — no pre-approval required for beer"],
    "7_financial_model": { "duty_rate_pct": 0.0, "VAT_at_import_pct": 10.0, "landed_cost_per_330ml_gbp": 1.42, "suggested_CIF_price_per_330ml_gbp": 1.85, "Year1_target_volume_cases": 2400, "Year1_export_revenue_gbp": 95000 },
    "8_action_plan": [
      { "phase": "0–90 days", "actions": ["Identify and contract Japanese importer", "Commission Japanese label artwork", "Apply for HMRC REX self-certification"] },
      { "phase": "91–180 days", "actions": ["Ship trial order (20 cases) for market test", "Attend Foodex Japan trade show (March)", "Establish social media presence on Instagram Japan"] },
      { "phase": "181–365 days", "actions": ["Scale to full commercial order (200 cases/month)", "Pursue Sake no Wa craft beer festival presence", "Review distributor contract KPIs at Month 9"] }
    ]
  },
  "format": "markdown",
  "generated_at": "2026-08-11T17:41:00Z"
}
```

### Pricing
| Tier | Price |
|------|-------|
| Per call | **£2.50** |
| Full Pipeline (all 7 agents) | **£5.00** |
| Volume (20+/mo) | Contact sales |

### Limitations / What It Does NOT Do
- Does **not** replace legal, financial, or tax advice specific to the exporter's corporate structure
- Does **not** produce audited financial statements or business valuations
- Action plan milestones are generic frameworks; local market nuances require in-country adviser review
- UKEF and bank eligibility confirmation requires formal application; this plan is a supporting document only

---

## Pricing Summary

| Agent | Price/Call | Notes |
|-------|-----------|-------|
| HS Code Agent | **£0.10** | Cheapest entry point |
| Tariff Agent | **£0.20** | |
| RouteAgent | **£0.50** | |
| MarketAgent | **£0.50** | |
| OpportunityAgent | **£1.00** | Covers 15+ markets |
| ComplianceAgent | **£0.75** | |
| ExportPlanAgent | **£2.50** | Full strategy document |
| **Full Pipeline** | **£5.00** | All 7 agents, best value |

> **Start free:** Explore the CircleTrade AI app at https://kadsam123.github.io/circletrade-ai/  
> **API access:** https://api.circletrade.ai · **Contact:** hello@circletrade.ai
