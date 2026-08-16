# AtlasCorr AI — Agent Stack Specification

AtlasCorr AI uses eight agents:

## 1. HS Agent
Purpose: Classify product into HS code.  
Outputs: HS code, category, deterministic fallback.

## 2. Tariff Agent
Purpose: Compute duties and taxes.  
Outputs: duty %, tariff notes, enrichment (spikes, seasonal).

## 3. Compliance Agent
Purpose: Identify required documents and regulatory burden.  
Outputs: doc list, risk flags, enrichment (extra docs).

## 4. Route Agent
Purpose: Evaluate logistics.  
Outputs: cost, transit time, reliability, enrichment (congestion).

## 5. Export Plan Agent
Purpose: Generate workflow steps.  
Outputs: step list, timeline, enrichment (extra steps).

## 6. QA Supervisor Agent
Purpose: Validate consistency.  
Outputs: reflection logs, contradiction flags, fallback triggers.

## 7. Dossier Engine
Purpose: Aggregate corridor intelligence.  
Outputs: dossier summary, corridor comparison.

## 8. Strategy Agent
Purpose: Generate narrative export strategy.  
Outputs: structured report, recommendations.
