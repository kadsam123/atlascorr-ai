'use strict';

/**
 * Autonomously detects gaps in request queries and routes them to mock/simulated 
 * partners in the Circle Agent Marketplace, implementing Mode B (Router Agent).
 * 
 * Gaps handled:
 * 1. corporate_identity_verification (Orthogonal Tomba / email finder)
 * 2. document_extraction (Stableenrich / invoice parsing)
 * 3. lead_enrichment (Orthogonal PredictLeads)
 * 4. financial_analysis (AIsa Macro interest rates)
 */
function detectAndRouteGaps(reqBody) {
  const gaps = [];
  const searchPayload = JSON.stringify(reqBody).toLowerCase();

  // 1. Detect Corporate Identity Verification Gap
  if (searchPayload.includes('verify') || searchPayload.includes('audit') || searchPayload.includes('auth') || searchPayload.includes('identity')) {
    gaps.push({
      service_name: 'IdentityVerifierAgent',
      gap_type: 'corporate_identity_verification',
      cost_usd: 0.40,
      partner_endpoint: 'https://np.orthogonal.com/tomba/v1/companies/find',
      description: 'Verifies registration number, tax status, and ownership verification of the corporate partner.',
      status: 'success',
      result: {
        company_status: 'ACTIVE_REGISTERED',
        tax_id_verified: true,
        risk_tier: 'LOW_RISK',
        source: 'Orthogonal-Tomba'
      }
    });
  }

  // 2. Detect Document Extraction Gap
  if (searchPayload.includes('pdf') || searchPayload.includes('invoice') || searchPayload.includes('packing list') || searchPayload.includes('bill of lading')) {
    gaps.push({
      service_name: 'DocParserAgent',
      gap_type: 'document_extraction',
      cost_usd: 0.25,
      partner_endpoint: 'https://stableenrich.dev/apis/v1/doc-extractor',
      description: 'Automatically parses commercial packing lists, custom bills, and invoices to extract weight, units, and values.',
      status: 'success',
      result: {
        extracted_fields: {
          weight_kg: 1250,
          currency: 'USD',
          invoice_total: 45000,
          shipper_verified: true
        },
        source: 'Stableenrich-Extractor'
      }
    });
  }

  // 3. Detect Lead Enrichment Gap
  if (searchPayload.includes('lead') || searchPayload.includes('buyer') || searchPayload.includes('competitor') || searchPayload.includes('customers')) {
    gaps.push({
      service_name: 'LeadFinderAgent',
      gap_type: 'lead_enrichment',
      cost_usd: 0.50,
      partner_endpoint: 'https://np.orthogonal.com/predictleads/v3/companies/find',
      description: 'Crawls active technographics, hiring signals, and buyer intents in the target trade corridor.',
      status: 'success',
      result: {
        leads_found: 3,
        primary_buyer: 'Gulf Logistics Hub Ltd',
        technographic_fit: 'EXCELLENT',
        source: 'Orthogonal-PredictLeads'
      }
    });
  }

  // 4. Force manual inputs/additional requirements flags
  if (Array.isArray(reqBody.additional_requirements)) {
    reqBody.additional_requirements.forEach(req => {
      const typeClean = (req || '').toLowerCase().trim();
      
      if (typeClean === 'financial_analysis' && !gaps.some(g => g.gap_type === 'financial_analysis')) {
        gaps.push({
          service_name: 'FinancialScoringAgent',
          gap_type: 'financial_analysis',
          cost_usd: 0.75,
          partner_endpoint: 'https://api.aisa.one/apis/v2/financial/macro/interest-rates',
          description: 'Fetches central bank macro interest rates, local inflation averages, and exchange rate volatility scores.',
          status: 'success',
          result: {
            bank_rate_pct: 4.25,
            inflation_avg_pct: 2.1,
            market_risk_label: 'STABLE',
            source: 'AIsa-Macro'
          }
        });
      }
    });
  }

  // Calculate costs for Billing Transparency Layer
  const coreCost = 5.00; // Base pipeline orchestration fee
  const externalCost = gaps.reduce((sum, g) => sum + g.cost_usd, 0);
  const totalCost = coreCost + externalCost;

  return {
    has_gaps: gaps.length > 0,
    dispatched_gaps: gaps,
    orchestration_ledger: gaps.length > 0 ? {
      status: 'DELEGATED_MARKETPLACE',
      explanation: 'This request requires specialized intelligence. CircleTrade AI has autonomously dispatched your gap requests to certified Circle Marketplace partner agents.',
      billing_transparency: {
        core_orchestrator_cost_usd: coreCost,
        external_agents_cost_usd: externalCost,
        total_aggregate_cost_usd: totalCost,
        payment_method: 'Stripe Metered Usage Ledger'
      }
    } : null
  };
}

module.exports = { detectAndRouteGaps };
