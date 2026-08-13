# Circle Agent Stack — Developer API

**Base URL:** `http://localhost:3000` (local) | `https://api.atlastrade.ai` (production)  
**Auth:** `X-API-Key: ct-demo-key-2026`  
**Content-Type:** `application/json`  
**Version:** 1.0.0

---

## Quick Start

```bash
# 1. Install dependencies
cd api && npm install

# 2. Start the server
npm start

# 3. Test the health check
curl http://localhost:3000/
```

**Expected response:**
```json
{
  "service": "AtlasTrade Agent Stack API",
  "version": "1.0.0",
  "status": "healthy"
}
```

---

## Authentication

All `/api/*` endpoints require an API key passed in the request header:

```
X-API-Key: ct-demo-key-2026
```

Missing or invalid keys return `401 Unauthorized`.

---

## Endpoints

### 1. HS Code Agent
**`POST /api/hs-code`**  
Extract the correct HS code from a plain-language product description.

**Request:**
```json
{ "product_description": "organic turmeric powder" }
```
**Response:**
```json
{
  "hs_code": "0910.30",
  "confidence": "high",
  "category": "food",
  "description": "organic turmeric powder",
  "source": "DDTRS"
}
```
**Pricing:** £0.10/call

---

### 2. Tariff Agent
**`POST /api/tariff`**  
Look up the applicable tariff rate for an HS code + destination pair.

**Request:**
```json
{
  "hs_code": "6117.10",
  "destination_code": "UAE",
  "category": "textiles"
}
```
**Response:**
```json
{
  "tariff_rate": 5,
  "destination": "UAE",
  "category": "textiles",
  "hs_code": "6117.10",
  "currency": "percent",
  "source": "TradeMatch"
}
```
**Pricing:** £0.20/call

---

### 3. RouteAgent
**`POST /api/route`**  
Score and rank trade corridors for any origin–destination pair.

**Request:**
```json
{
  "origin": "UK",
  "destination": "UAE",
  "product_category": "textiles"
}
```
**Response:**
```json
{
  "routes": [
    {
      "name": "UK → UAE",
      "score": 87,
      "transit_days": 9,
      "cost_index": 3.2,
      "port_efficiency": 91,
      "political_risk": 12,
      "recommendation": "✅ Highly recommended — excellent corridor efficiency"
    }
  ],
  "best_route": { "...": "..." },
  "source": "MeridianFlow"
}
```
**Pricing:** £0.50/call

---

### 4. MarketAgent
**`POST /api/market`**  
Match a product category to the highest-opportunity destination markets.

**Request:**
```json
{
  "product_category": "food",
  "target_markets": ["SGP", "UAE", "HKG"]
}
```
**Response:**
```json
{
  "matches": [
    {
      "market": { "name": "Singapore", "code": "SGP" },
      "score": 94,
      "tariff": 0,
      "import_growth": 6.1,
      "gdp_growth": 3.8,
      "recommendation": "Strong opportunity"
    }
  ],
  "best_market": { "...": "..." },
  "source": "TradeMatch"
}
```
**Pricing:** £0.50/call

---

### 5. ComplianceAgent
**`POST /api/compliance`**  
Run a full DDTRS compliance check against sanctions, licenses, and dual-use regulations.

**Request:**
```json
{
  "product_description": "portable ultrasound device",
  "destination": "Brazil",
  "category": "medical"
}
```
**Response:**
```json
{
  "passed": true,
  "hs_code": "9018.12",
  "sanctioned": false,
  "license_required": true,
  "warnings": [
    { "type": "LICENSE", "message": "FDA Export Permit / CE Mark required" }
  ],
  "issues": [],
  "risk_score": 4.2,
  "check_body": "FDA / EMA",
  "source": "DDTRS"
}
```
**Pricing:** £0.75/call

---

### 6. OpportunityAgent
**`POST /api/opportunity`**  
Full opportunity scan across 15+ global markets for a product category.

**Request:**
```json
{
  "product_category": "textiles",
  "budget": 45000
}
```
**Response:**
```json
{
  "opportunities": [
    {
      "market": "Singapore",
      "market_code": "SGP",
      "region": "SE Asia",
      "score": 94,
      "tariff": 0,
      "import_growth": 6.1
    }
  ],
  "total": 15,
  "source": "TradeMatch"
}
```
**Pricing:** £1.00/call

---

### 7. Full Pipeline
**`POST /api/pipeline`**  
Run the complete 5-step AtlasTrade AI pipeline for an SME customer profile.

**Request:**
```json
{
  "customer_name": "Hargreaves Textiles Ltd",
  "origin_country": "UK",
  "products": [
    { "name": "Merino Wool Scarves", "category": "textiles", "hs_code": "6117.10" }
  ],
  "target_markets": ["UAE", "Japan", "Australia"],
  "budget": 45000,
  "risk_tolerance": "medium"
}
```
**Response:**
```json
{
  "customer": "Hargreaves Textiles Ltd",
  "best_route": "UK → UAE",
  "best_market": "United Arab Emirates",
  "tariff_rate": 5,
  "risk_score": 1.8,
  "opportunity_score": 91,
  "license_required": false,
  "recommendation": "🚀 Proceed — excellent opportunity with low compliance risk",
  "next_action": "Book capacity on UK → UAE corridor → Contact UAE trade representatives",
  "pipeline_steps": [ { "...": "..." } ],
  "timestamp": "2026-08-11T17:00:00.000Z"
}
```
**Pricing:** £5.00/call

---

### 8. ExportPlanAgent
**`POST /api/export-plan`**  
Generate a complete, structured export strategy document.

**Request:**
```json
{
  "company_name": "Artisan Foods Co.",
  "product": "Truffle-Infused Olive Oil",
  "origin": "Italy",
  "target_market": "Singapore",
  "budget": 30000
}
```
**Response:**
```json
{
  "executive_summary": "...",
  "recommended_route": { "...": "..." },
  "market_analysis": { "...": "..." },
  "compliance_checklist": [ { "item": "...", "status": "pass", "action": "..." } ],
  "tariff_breakdown": { "...": "..." },
  "risk_assessment": { "...": "..." },
  "timeline": [ { "phase": "...", "weeks": "1-2", "actions": [] } ],
  "estimated_costs": { "logistics": 3200, "compliance": 800, "tariffs": 0, "total": 4000 }
}
```
**Pricing:** £2.50/call

---

## Usage Monitoring

```bash
# View last 100 API calls (no auth required)
curl http://localhost:3000/api/usage
```

---

## Error Codes

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| `UNAUTHORIZED` | 401 | Missing or invalid API key |
| `VALIDATION_ERROR` | 400 | Missing required fields in request body |
| `NOT_FOUND` | 404 | Endpoint does not exist |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected server error |

---

## Pricing Summary

| Agent | Endpoint | Price |
|-------|----------|-------|
| HS Code Agent | POST /api/hs-code | £0.10/call |
| Tariff Agent | POST /api/tariff | £0.20/call |
| RouteAgent | POST /api/route | £0.50/call |
| MarketAgent | POST /api/market | £0.50/call |
| OpportunityAgent | POST /api/opportunity | £1.00/call |
| ComplianceAgent | POST /api/compliance | £0.75/call |
| ExportPlanAgent | POST /api/export-plan | £2.50/call |
| Full Pipeline | POST /api/pipeline | £5.00/call |

Growth plan includes **100 agent calls/month**. Additional calls billed at rates above.

---

## Deploy to Railway / Render / Fly.io

```bash
# Railway
npm install -g @railway/cli
railway init && railway up

# Render — add render.yaml:
# services:
#   - type: web
#     name: atlastrade-api
#     env: node
#     buildCommand: npm install
#     startCommand: npm start

# Environment variables required:
# API_KEY=your-production-key-here
# PORT=3000
```

---

*Circle Agent Stack API — Part of AtlasTrade AI*  
*https://kadsam123.github.io/atlastrade-ai/*
