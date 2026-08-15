/* ============================================================
   CircleBrain — Orchestration, Routing & Notifications
   Drives the 5-step export intelligence pipeline, aggregates
   module outputs into a unified recommendation, and triggers
   customer alerts.
   ============================================================ */
window.CT = window.CT || {};

CT.circleBrain = (() => {

  // Helper delay
  const _delay = ms => new Promise(res => setTimeout(res, ms));

  // ── Pipeline Orchestrator ─────────────────────────────────
  async function runPipeline(customerId, onStep) {
    const customer = CT.store.getCustomer(customerId);
    if (!customer) throw new Error(`Customer ${customerId} not found`);

    const apiConfig = CT.store.getApiConfig();
    const results = {};

    if (apiConfig.mode === 'live') {
      // ─ Step 1: Ingest ────────────────────────────────────────
      await onStep('ingest', 'running', null);
      await _delay(600);
      const ingestResult = {
        customer:      customer.name,
        products:      customer.products.length,
        targetMarkets: customer.targetMarkets.length,
        budget:        customer.budget,
        riskTolerance: customer.riskTolerance,
      };
      results.ingest = ingestResult;
      await onStep('ingest', 'done', ingestResult);

      // Make live API request to Railway server with correct payload mapping
      const firstProduct = customer.products[0] || { name: 'Goods', category: 'machinery', hsCode: '8479.89' };
      const payload = {
        customer: customer.name,
        product: {
          name: firstProduct.name,
          description: `B2B export shipment of ${firstProduct.name} (category: ${firstProduct.category || 'machinery'})`,
          origin_country: customer.country || 'US',
          destination_country: customer.targetMarkets[0] || 'DE',
          hs_code_hint: firstProduct.hsCode || '8479.89'
        },
        additional_requirements: ['document_extraction']
      };

      try {
        const response = await fetch(`${apiConfig.url}/api/pipeline`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiConfig.key
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || `Server error: ${response.status}`);
        }

        const apiResult = await response.json();

        // Find route output from pipeline steps
        const routeStep = apiResult.pipeline_steps.find(s => s.module === 'MeridianFlow:Route');
        const routeData = {
          bestRoute: {
            name: routeStep ? routeStep.output.best_route : 'USA → EU',
            score: routeStep ? routeStep.output.score : 79,
            transitDays: routeStep ? routeStep.output.transit_days : 12,
            costIndex: 2.5,
            recommendation: 'Reliable trade corridor route.'
          }
        };

        // Find tariff output from pipeline steps
        const tariffStep = apiResult.pipeline_steps.find(s => s.module === 'TradeMatch:Tariff');
        const marketData = {
          bestMatch: {
            market: { name: customer.targetMarkets[0], code: customer.targetMarkets[0] },
            score: routeStep ? routeStep.output.score : 79,
            tariff: tariffStep ? tariffStep.output.tariff_rate : 12,
            recommendation: 'Low-tariff trade opportunity.'
          }
        };

        // Find compliance output from pipeline steps
        const complianceStep = apiResult.pipeline_steps.find(s => s.module === 'DDTRS:Compliance');
        const complianceData = {
          avgRisk: complianceStep && complianceStep.output.license_required ? 4.5 : 1.2,
          results: customer.products.map(p => ({
            product: p.name,
            compliance: {
              licenseRequired: complianceStep ? complianceStep.output.license_required : false,
              sanctioned: complianceStep ? complianceStep.output.sanctioned : false
            }
          })),
          blocked: [],
          highRisk: []
        };

        // Update steps UI
        await onStep('meridian', 'done', routeData);
        await onStep('tradematch', 'done', marketData);
        await onStep('ddtrs', 'done', complianceData);

        // ─ Step 5: Aggregate ─────────────────────────────────────
        await onStep('aggregate', 'running', null);
        await _delay(600);

        const report = {
          customer:        customer.name,
          timestamp:       new Date().toISOString(),
          bestRoute:       routeData.bestRoute.name,
          bestMarket:      marketData.bestMatch.market.name,
          transitDays:     routeData.bestRoute.transitDays,
          tariffRate:      marketData.bestMatch.tariff,
          riskScore:       complianceData.avgRisk,
          opportunityScore: Math.round(routeData.bestRoute.score * 100) || 79,
          licenseRequired: complianceData.results.some(r => r.compliance.licenseRequired),
          blockedRoutes:   complianceData.results.some(r => r.compliance.sanctioned) ? 1 : 0,
          recommendation:  complianceData.results.some(r => r.compliance.licenseRequired) 
            ? '⚠️ Review required — compliance attention and export permit needed' 
            : '🚀 Proceed — excellent opportunity with low compliance risk',
          nextAction:      complianceData.results.some(r => r.compliance.licenseRequired)
            ? 'Apply for export license via relevant authority'
            : 'Book capacity on preferred corridor',
          marketplace_metadata: apiResult.marketplace_metadata || null
        };
        results.report = report;

        _generateNotification(customer, report);

        let logMsg = `Pipeline complete (LIVE API) — Route: ${report.bestRoute}, Market: ${report.bestMarket}, Opp: ${report.opportunityScore}/100, Risk: ${report.riskScore}/10`;
        if (report.marketplace_metadata) {
          logMsg += ` [Cost: $${report.marketplace_metadata.price_per_execution_usd}]`;
        }

        CT.store.addLog({
          module: 'CB',
          message: logMsg,
          customerId: customer.id,
          customer:   customer.name,
        });

        CT.store.addPipelineRun({ customerId: customer.id, customer: customer.name, timestamp: new Date().toISOString(), report });
        
        // Refresh opportunities list
        CT.store.setOpportunities(CT.tradeMatch.getAllOpportunities(CT.store.getCustomers()));

        await onStep('aggregate', 'done', report);
        return results;

      } catch (err) {
        console.error('[CircleBrain Live API Error]', err);
        await onStep('meridian', 'error', err.message);
        await onStep('tradematch', 'error', err.message);
        await onStep('ddtrs', 'error', err.message);
        await onStep('aggregate', 'error', err.message);
        throw err;
      }
    } else {
      // ─ Step 1: Ingest (MOCK SIMULATION) ─────────────────────
      await onStep('ingest', 'running', null);
      await _delay(700);
      const ingestResult = {
        customer:      customer.name,
        products:      customer.products.length,
        targetMarkets: customer.targetMarkets.length,
        budget:        customer.budget,
        riskTolerance: customer.riskTolerance,
      };
      results.ingest = ingestResult;
      await onStep('ingest', 'done', ingestResult);

      // ─ Step 2: Meridian Flow ─────────────────────────────────
      await onStep('meridian', 'running', null);
      await _delay(1100);
      results.routes = CT.meridianFlow.runForCustomer(customer);
      await onStep('meridian', 'done', results.routes);

      // ─ Step 3: TradeMatch ────────────────────────────────────
      await onStep('tradematch', 'running', null);
      await _delay(950);
      results.matches = CT.tradeMatch.runForCustomer(customer);
      await onStep('tradematch', 'done', results.matches);

      // ─ Step 4: DDTRS ─────────────────────────────────────────
      await onStep('ddtrs', 'running', null);
      await _delay(1050);
      results.compliance = CT.ddtrs.runForCustomer(customer);
      await onStep('ddtrs', 'done', results.compliance);

      // ─ Step 5: Aggregate ─────────────────────────────────────
      await onStep('aggregate', 'running', null);
      await _delay(800);
      const report = _generateReport(customer, results);
      results.report = report;

      _generateNotification(customer, report);

      CT.store.addLog({
        module: 'CB',
        message: `Pipeline complete (MOCK) — Route: ${report.bestRoute}, Market: ${report.bestMarket}, Opp: ${report.opportunityScore}/100, Risk: ${report.riskScore}/10`,
        customerId: customer.id,
        customer:   customer.name,
      });

      CT.store.addPipelineRun({ customerId: customer.id, customer: customer.name, timestamp: new Date().toISOString(), report });
      CT.store.updateStats({ complianceChecks: CT.store.getStats().complianceChecks + results.compliance.results.length });

      // Refresh global opportunities list
      CT.store.setOpportunities(CT.tradeMatch.getAllOpportunities(CT.store.getCustomers()));

      await onStep('aggregate', 'done', report);
      return results;
    }
  }

  // ── Report Generation ─────────────────────────────────────
  function _generateReport(customer, results) {
    const bestRoute  = results.routes?.bestRoute   || null;
    const bestMatch  = results.matches?.bestMatch  || null;
    const avgRisk    = results.compliance?.avgRisk || 0;
    const oppScore   = bestMatch?.score || 0;
    const tariffRate = bestMatch?.tariff || 0;

    return {
      customer:        customer.name,
      timestamp:       new Date().toISOString(),
      bestRoute:       bestRoute?.name || 'N/A',
      bestMarket:      bestMatch?.market?.name || 'N/A',
      transitDays:     bestRoute?.transitDays || 'N/A',
      tariffRate,
      riskScore:       parseFloat(avgRisk.toFixed(1)),
      opportunityScore: oppScore,
      licenseRequired: (results.compliance?.results || []).some(r => r.compliance.licenseRequired),
      blockedRoutes:   results.compliance?.blocked?.length || 0,
      recommendation:  _recommendation(oppScore, avgRisk),
      nextAction:      _nextAction(customer, results),
    };
  }

  // Helper rules
  function _recommendation(opp, risk) {
    if (opp >= 80 && risk <= 3) return '🚀 Proceed — excellent opportunity with low compliance risk';
    if (opp >= 70 && risk <= 5) return '✅ Proceed with preparation — good opportunity, minor compliance steps required';
    if (opp >= 60)              return '⚠️ Review required — moderate opportunity, compliance attention needed';
    return '🔍 Further analysis recommended — challenging market or compliance conditions';
  }

  function _nextAction(customer, results) {
    const actions = [];
    if (results.compliance?.highRisk?.length)    actions.push('Review high-risk shipment destinations');
    if (results.compliance?.results?.some(r => r.compliance.licenseRequired)) actions.push('Apply for export license via relevant authority');
    if (results.routes?.bestRoute?.score > 80)   actions.push(`Book capacity on ${results.routes.bestRoute.name} corridor`);
    if (results.matches?.bestMatch)              actions.push(`Contact ${results.matches.bestMatch.market?.name} trade representatives`);
    return actions.length ? actions.join(' → ') : 'Maintain current export strategy';
  }

  // ── Customer Notification Generator ──────────────────────
  function _generateNotification(customer, report) {
    const type = report.licenseRequired ? 'compliance' : 'route';
    const title = report.licenseRequired ? '⚠️ Export Licence Required' : '💡 Recommended Corridor Route Found';
    const message = report.licenseRequired
      ? `License required for exporting ${customer.products[0]?.name || 'cargo'} to ${report.bestMarket}. Click to review.`
      : `Optimal shipping corridor configured: ${report.bestRoute} (${report.transitDays} days).`;

    CT.store.addNotification({
      type,
      title,
      message,
      customer: report.customer,
      customerId: customer.id
    });
  }

  function initialize() {
    console.log('[CircleBrain] Initialized.');
  }

  return { runPipeline, initialize };
})();
