# CircleTrade AI — Circle Agent Stack
### Replit Agent Marketplace Listing Card

---

## 📋 Listing Metadata

| Field | Value |
|-------|-------|
| **Title** | CircleTrade AI — Circle Agent Stack |
| **Subtitle** | 7 export-intelligence AI agents for UK businesses going global |
| **Author** | CircleTrade AI |
| **Version** | 1.0.0 |
| **Category** | Business Intelligence / Trade & Logistics |
| **License** | Commercial API |
| **App URL** | https://kadsam123.github.io/circletrade-ai/ |
| **API Base** | https://api.circletrade.ai |
| **Contact** | hello@circletrade.ai |

---

## 🏷️ Tags

`export` `trade` `customs` `HS-code` `tariff` `compliance` `sanctions` `market-intelligence` `UK-trade` `logistics` `export-plan` `ECJU` `FTA` `supply-chain` `AI-agent`

---

## 📝 Description

**CircleTrade AI** is an export intelligence platform built for UK businesses going global. The **Circle Agent Stack** is a suite of 7 specialist AI agents, each designed to solve a specific export problem — from classifying products into HS codes to generating boardroom-ready export strategy documents.

Whether you're a first-time exporter trying to understand customs duties, a freight forwarder checking dual-use licensing, or an export director mapping a 15-market growth strategy, the Circle Agent Stack gives you instant, data-backed intelligence at the point of decision.

**The Stack is built on:**
- Large language model reasoning over a curated trade ontology
- Live tariff databases covering 180+ destination markets
- World Bank / ITC Trade Map / IMF trade flow data for market scoring
- ECJU dual-use control lists, DTTRS, and UK/EU/OFAC sanctions registers
- A structured export plan generator compatible with UKEF and trade finance documentation standards

All agents are accessible via a clean REST API (OpenAPI 3.1 spec) and a hosted web app.

---

## ✨ Capabilities

### 7 Specialist Agents

| # | Agent | What It Does | Cost |
|---|-------|-------------|------|
| 1 | **HS Code Agent** | Classifies any product description into the correct HS/commodity code with confidence scoring | £0.10/call |
| 2 | **Tariff Agent** | Looks up MFN, FTA preferential, and GSP duty rates + VAT for any HS code × destination | £0.20/call |
| 3 | **RouteAgent** | Scores and ranks trade corridors (0–100) across duty cost, logistics, demand, regulation, risk | £0.50/call |
| 4 | **MarketAgent** | Matches your product to the highest-opportunity global markets using demand signals & import trends | £0.50/call |
| 5 | **OpportunityAgent** | Full 15-market opportunity scan with boardroom-ready narrative per market | £1.00/call |
| 6 | **ComplianceAgent** | PASS/REVIEW/BLOCK export compliance check: dual-use, sanctions, licences, certifications | £0.75/call |
| 7 | **ExportPlanAgent** | 8-section export strategy document with financial model, market entry mode & 12-month action plan | £2.50/call |
| — | **Full Pipeline** | All 7 agents in sequence — best value | £5.00/call |

### Platform Capabilities
- ✅ REST API with OpenAPI 3.1 spec — integrate into any system
- ✅ Bearer token authentication — enterprise-ready
- ✅ Structured JSON output — pipe into ERP, CRM, or order management
- ✅ Markdown export plan output — ready for board papers and UKEF applications
- ✅ Chain agents automatically — HS Code → Tariff → Compliance in one workflow
- ✅ 180+ destination markets covered for tariff data
- ✅ UK Dual-Use List, DTTRS, UK/EU/OFAC/UN sanctions registers

---

## 💬 Example Prompts

These prompts work with the CircleTrade AI web app or via the API:

1. **HS Classification**
   > *"Classify: brushless DC electric motors, 24V, 500W, used in industrial conveyor systems."*

2. **Tariff Lookup**
   > *"What's the import duty for HS 1509.10 olive oil exported from the UK to the USA?"*

3. **Route Scoring**
   > *"Rank the best trade corridors for exporting UK-made gin to Southeast Asia — score at least 8 markets."*

4. **Market Discovery**
   > *"Which 5 markets have the highest opportunity score for plant-based food products?"*

5. **Opportunity Scan**
   > *"Run a full 15-market opportunity scan for my luxury Scottish shortbread brand."*

6. **Compliance Check**
   > *"Check export compliance for night-vision equipment (HS 9013.20) being shipped to Saudi Arabia."*

7. **Export Plan**
   > *"Generate a full UKEF-ready export plan for my Welsh craft beer brand entering the Japanese market."*

8. **Full Pipeline**
   > *"Run the full Circle Agent Stack pipeline for HS 8414.59 industrial fans to Saudi Arabia."*

---

## 🚀 Setup Instructions

### Option A: Use the Hosted Web App (No Setup Required)
1. Visit **https://kadsam123.github.io/circletrade-ai/**
2. Create a free account
3. Start querying agents immediately via the chat interface

### Option B: API Integration

#### Prerequisites
- CircleTrade AI API key (obtain at https://kadsam123.github.io/circletrade-ai/api-keys)
- HTTP client (curl, fetch, axios, requests, etc.)

#### Quick Start — HS Code Classification
```bash
curl -X POST https://api.circletrade.ai/v1/agents/hs-code \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "product_description": "cold-pressed extra virgin olive oil in 500ml glass bottles",
    "country_extension": "UK"
  }'
```

#### Quick Start — Tariff Lookup
```bash
curl -X POST https://api.circletrade.ai/v1/agents/tariff \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "hs_code": "1509.10",
    "destination_country": "US",
    "origin_country": "GB"
  }'
```

#### Quick Start — Full Pipeline
```bash
curl -X POST https://api.circletrade.ai/v1/pipeline/full \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "product_description": "Welsh craft beer pale ales",
    "target_markets": ["JP", "AU"],
    "business_context": "£800K revenue craft brewery, 8 staff, first export"
  }'
```

#### Python SDK (Coming Soon)
```python
# pip install circletrade-ai
from circletrade import CircleTradeClient

client = CircleTradeClient(api_key="YOUR_API_KEY")

# Classify a product
result = client.hs_code.classify(
    product_description="cold-pressed extra virgin olive oil in 500ml glass bottles",
    country_extension="UK"
)
print(result.primary_result.hs_code)  # "1509.10"

# Run a full opportunity scan
scan = client.opportunity.scan(
    product_description="luxury Scottish shortbread",
    markets_to_scan=15
)
for market in scan.priority_markets:
    print(f"{market.market}: {market.opportunity_score}/100")
```

### Option C: Fork on Replit

1. Click **"Use Template"** on this Replit listing
2. Set environment variable: `CIRCLETRADE_API_KEY=your_key_here`
3. Run `main.py` to start the interactive CLI demo
4. Or run `server.py` to expose a local API proxy

#### Environment Variables
```env
CIRCLETRADE_API_KEY=your_api_key_here
CIRCLETRADE_API_BASE=https://api.circletrade.ai
CIRCLETRADE_DEFAULT_ORIGIN=GB
```

#### Replit File Structure (Template)
```
circletrade-demo/
├── main.py              # Interactive CLI demo — all 7 agents
├── server.py            # FastAPI proxy server
├── agents/
│   ├── hs_code.py       # HS Code Agent wrapper
│   ├── tariff.py        # Tariff Agent wrapper
│   ├── route.py         # RouteAgent wrapper
│   ├── market.py        # MarketAgent wrapper
│   ├── opportunity.py   # OpportunityAgent wrapper
│   ├── compliance.py    # ComplianceAgent wrapper
│   └── export_plan.py   # ExportPlanAgent wrapper
├── pipeline.py          # Full pipeline orchestrator
├── requirements.txt     # httpx, fastapi, uvicorn, pydantic
├── .env.example         # Environment variable template
└── README.md            # Getting started guide
```

---

## 📊 Example Output Preview

### HS Code Agent Response
```json
{
  "agent": "hs-code",
  "primary_result": {
    "hs_code": "1509.10",
    "description": "Virgin olive oil and its fractions",
    "confidence": 0.97
  },
  "country_extensions": { "UK": "15091010" },
  "rationale": "Extra virgin confirmed by 'cold-pressed' qualifier. HS 1509.10 applies."
}
```

### ComplianceAgent Response
```json
{
  "agent": "compliance",
  "overall_result": "REVIEW",
  "flags": [{
    "flag_code": "DUAL_USE_LICENCE",
    "severity": "HIGH",
    "detail": "HS 8542.31 appears on UK Dual-Use List Category 3A001...",
    "reference": "UK Strategic Export Control List — 3A001"
  }],
  "sanctions_check": { "UK_sanctions": "CLEAR", "OFAC_SDN": "CLEAR" }
}
```

---

## 💰 Pricing

| Agent | Per Call | Notes |
|-------|----------|-------|
| HS Code Agent | £0.10 | Cheapest entry point |
| Tariff Agent | £0.20 | |
| RouteAgent | £0.50 | Up to 25 corridors |
| MarketAgent | £0.50 | Up to 50 markets |
| OpportunityAgent | £1.00 | 15+ markets, full brief |
| ComplianceAgent | £0.75 | 4 sanctions registers |
| ExportPlanAgent | £2.50 | 8-section document |
| **Full Pipeline** | **£5.00** | **Best value** |

> Volume discounts available. Contact hello@circletrade.ai for enterprise pricing.

---

## 📚 Resources

| Resource | Link |
|----------|------|
| 🌐 App | https://kadsam123.github.io/circletrade-ai/ |
| 📖 API Docs | https://api.circletrade.ai/docs |
| 🔑 API Keys | https://kadsam123.github.io/circletrade-ai/api-keys |
| ⚖️ Legal | https://kadsam123.github.io/circletrade-ai/legal |
| 📧 Support | hello@circletrade.ai |

---

## ⚠️ Important Limitations

- **Not legal advice**: Tariff rates and compliance flags are indicative. Verify with ECJU and national customs authorities before filing or shipping.
- **Not financial advice**: Export plan financial models are estimates. Engage an accountant for formal projections.
- **Data currency**: Tariff data updated monthly. Sanctions data updated daily. Market data may lag by 12–18 months for some countries.
- **Physical goods only**: HS Code and Tariff agents cover physical goods. Services and digital goods require a different approach.
- **UK origin default**: All agents assume GB as the export origin unless explicitly overridden.

---

*Built with ❤️ by CircleTrade AI · Helping UK businesses export smarter · [circletrade-ai](https://kadsam123.github.io/circletrade-ai/)*
