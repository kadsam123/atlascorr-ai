/* ============================================================
   CircleBrain — Orchestration, Routing & Notifications
   Drives the 5-step export intelligence pipeline, aggregates
   module outputs into a unified recommendation, and triggers
   customer alerts.
   ============================================================ */
window.CT = window.CT || {};

CT.circleBrain = (() => {

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

      // Make live API request to Railway server
      const payload = {
        customer_name: customer.name,
        origin_country: customer.country,
        products: customer.products.map(p => ({ name: p.name, category: p.category, hs_code: p.hsCode })),
        target_markets: customer.targetMarkets,
        budget: customer.budget,
        risk_tolerance: customer.riskTolerance
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

        // ─ Step 2: Meridian Flow ─────────────────────────────────
        await onStep('meridian', 'running', null);
        await _delay(800);
        const routeData = {
          bestRoute: {
            name: apiResult.best_route,
            score: apiResult.opportunity_score,
            transitDays: apiResult.transit_time || 15
          }
        };
        await onStep('meridian', 'done', routeData);

        // ─ Step 3: TradeMatch ────────────────────────────────────
        await onStep('tradematch', 'running', null);
        await _delay(800);
        const marketData = {
          bestMatch: {
            market: { name: apiResult.best_market, code: apiResult.best_market.slice(0,3).toUpperCase() },
            score: apiResult.opportunity_score,
            tariff: apiResult.tariff_rate
          }
        };
        await onStep('tradematch', 'done', marketData);

        // ─ Step 4: DDTRS ─────────────────────────────────────────
        await onStep('ddtrs', 'running', null);
        await _delay(800);
        const complianceData = {
          avgRisk: apiResult.risk_score,
          results: customer.products.map(p => ({
            product: p.name,
            compliance: {
              licenseRequired: apiResult.license_required,
              sanctioned: false
            }
          }))
        };
        await onStep('ddtrs', 'done', complianceData);

        // ─ Step 5: Aggregate ─────────────────────────────────────
        await onStep('aggregate', 'running', null);
        await _delay(600);

        const report = {
          customer:        customer.name,
          timestamp:       new Date().toISOString(),
          bestRoute:       apiResult.best_route || 'N/A',
          bestMarket:      apiResult.best_market || 'N/A',
          transitDays:     apiResult.transit_time || 'N/A',
          tariffRate:      apiResult.tariff_rate || 0,
          riskScore:       apiResult.risk_score,
          opportunityScore: apiResult.opportunity_score,
          licenseRequired: apiResult.license_required,
          blockedRoutes:   0,
          recommendation:  apiResult.recommendation,
          nextAction:      apiResult.next_action,
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
    const type =
      report.opportunityScore > 80 ? 'opportunity' :
      report.riskScore > 5         ? 'compliance'  : 'info';

    const title =
      type === 'opportunity' ? '🌟 High Opportunity Detected' :
      type === 'compliance'  ? '⚠️ Risk Flag Raised'          : '📊 Pipeline Complete';

    CT.store.addNotification({
      type,
      title,
      message: `${customer.name}: ${report.recommendation}. Best route: ${report.bestRoute}. Best market: ${report.bestMarket}.`,
      customer:   customer.name,
      customerId: customer.id,
    });
  }

  // ── Task Router ───────────────────────────────────────────
  function routeTask(task) {
    const { type, data } = task;
    switch (type) {
      case 'route_score':       return CT.meridianFlow.runForCustomer(data.customer);
      case 'market_match':      return CT.tradeMatch.runForCustomer(data.customer);
      case 'compliance_check':  return CT.ddtrs.runForCustomer(data.customer);
      default: console.warn(`[CircleBrain] Unknown task type: ${type}`);
    }
  }

  // ── Initialization ────────────────────────────────────────
  function initialize() {
    CT.store.setOpportunities(CT.tradeMatch.getAllOpportunities(CT.store.getCustomers()));
    CT.store.addLog({
      module: 'CB',
      message: 'CircleBrain initialized — Meridian Flow, TradeMatch, DDTRS all online',
      customerId: null,
      customer: 'System',
    });
  }

  function _delay(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  return { runPipeline, routeTask, initialize };
})();
