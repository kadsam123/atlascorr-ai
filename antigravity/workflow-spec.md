# AtlasTrade AI × Antigravity — Integration Specification

**Phase:** 4  
**Status:** Design-ready  
**Version:** 1.0

---

## Overview

Antigravity acts as the **orchestration and scaling layer** above the Circle Agent Stack:

- **Multi-agent workflows** — chains of Circle Agents working together
- **Task routing** — directing SME requests to the right agent automatically
- **Concurrent execution** — parallel agent calls for speed
- **Marketplace integration** — API gateway for external callers (GPT Store, Replit, AgentHub)
- **Monitoring** — agent health, SLAs, error recovery, billing

---

## Architecture

```
SME Request / External Caller
         │
         ▼
┌────────────────────────────┐
│       ANTIGRAVITY          │
│   Orchestration Layer      │
│  ┌──────────────────────┐  │
│  │   Workflow Router    │  │  ← maps intent to workflow
│  └──────────────────────┘  │
│  ┌──────────────────────┐  │
│  │  Execution Planner   │  │  ← serial / parallel / fan-out
│  └──────────────────────┘  │
│  ┌──────────────────────┐  │
│  │   Billing Manager    │  │  ← Stripe metered billing
│  └──────────────────────┘  │
└────────────┬───────────────┘
             │
    ┌────────▼─────────────┐
    │  Circle Agent Stack  │
    │  8 API endpoints     │
    └──────────────────────┘
```

---

## Workflow 1 — Full SME Pipeline (Daily)
**Trigger:** 6 AM cron or manual  
**Mode:** Parallel where possible — target < 8s total

```
Step 1: Ingest customer profile
Step 2: [parallel] Route Score + Market Match + Compliance
Step 3: Aggregate into unified report
Step 4: Dispatch notifications (async)
```

---

## Workflow 2 — Deep Market Scan
**Trigger:** "Find me new markets"  
**Mode:** Fan-out across 15 destinations simultaneously

```
Step 1: Extract HS code from product description
Step 2: [fan-out x15] Tariff lookup for each destination
Step 3: Rank opportunities by composite score
Step 4: Return top 5 with route recommendations
```

---

## Workflow 3 — Export Plan Generation
**Trigger:** "Build me an export plan"  
**Mode:** Parallel research → sequential assembly

```
Step 1: [parallel] Compliance + Route Analysis + Market Analysis
Step 2: ExportPlanAgent assembles full strategy document
```

---

## Workflow 4 — Bulk Compliance Sweep
**Trigger:** "Check all my products"  
**Mode:** Matrix fan-out (products × markets, max 10 concurrent)

```
Step 1: [matrix] ComplianceAgent for every product × market combo
Step 2: Risk aggregator summarises into priority matrix
```

---

## Task Routing Rules

| Natural language intent | Antigravity routes to |
|---|---|
| "Best route to [country]?" | RouteAgent |
| "What tariff on [product] to [country]?" | HSCodeAgent → TariffAgent |
| "Is this shipment compliant?" | ComplianceAgent |
| "Find new markets" | Deep Market Scan workflow |
| "Run my pipeline" | Full SME Pipeline workflow |
| "Build an export plan" | Export Plan workflow |
| "Check all products for compliance" | Bulk Compliance Sweep |
| Anything else | CircleBrain triage |

---

## Billing Integration (Stripe Metered)

| Agent | Price/call |
|---|---|
| HS Code Agent | £0.10 |
| Tariff Agent | £0.20 |
| RouteAgent | £0.50 |
| MarketAgent | £0.50 |
| ComplianceAgent | £0.75 |
| OpportunityAgent | £1.00 |
| ExportPlanAgent | £2.50 |
| Full Pipeline | £5.00 |

Growth plan includes 100 calls/month. Enterprise: unlimited.

---

## Marketplace API Gateway

External callers authenticate via `X-API-Key`. Each key is scoped to a plan with rate limits:

```
Starter:    60 req/hour
Growth:     600 req/hour  
Enterprise: unlimited
```

Routes: `POST /v1/hs-code` → `POST /api/hs-code` (internal)

---

## Monitoring SLAs

| Metric | Target |
|---|---|
| Single agent call | p95 < 2s |
| Full pipeline | p95 < 8s |
| Deep market scan | p95 < 15s |
| Export plan | p95 < 20s |
| Monthly availability | 99.5% |

---

## Implementation Timeline

| Phase | Work | Weeks |
|---|---|---|
| 4a | Deploy Circle Agent API to Railway/Render | 8–9 |
| 4b | Connect Antigravity router to Circle Agent endpoints | 9–10 |
| 4c | Stripe metered billing integration | 10 |
| 4d | API Gateway for marketplace callers | 11 |
| 4e | Monitoring, alerting, SLA dashboards | 12 |
