/* ============================================================
   TradeMatch — Product-to-Market Matching & Tariff Lookup
   Scores all destination markets for each customer product,
   finds the best opportunity, and computes tariff rates.
   ============================================================ */
window.CT = window.CT || {};

CT.tradeMatch = (() => {

  function getOpportunityScore(market, product) {
    const cat    = product?.category || 'general';
    const tariff = _tariff(cat, market.code);

    const tariffScore   = Math.max(0, 100 - tariff * 5);
    const tradeScore    = market.easeOfTrade;
    const growthScore   = Math.min(100, market.importGrowth * 7.5);
    const categoryBonus = (market.bestCategories || []).includes(cat) ? 12 : 0;

    return Math.min(100, Math.round(
      tariffScore  * 0.35 +
      tradeScore   * 0.30 +
      growthScore  * 0.25 +
      categoryBonus * 0.10 +
      categoryBonus          // extra weight for category match
    ));
  }

  function _tariff(category, destCode) {
    const table = CT.data.tariffTable;
    if (table[category] && table[category][destCode] !== undefined) {
      return table[category][destCode];
    }
    return parseFloat((5 + Math.random() * 12).toFixed(1));
  }

  function lookupTariff(hsCode, destinationCode, category) {
    const cat = category || getCategoryFromHS(hsCode);
    return _tariff(cat, destinationCode);
  }

  function getCategoryFromHS(hsCode) {
    if (!hsCode) return 'general';
    const n = parseInt((hsCode || '').split('.')[0]);
    if (n >= 50  && n <= 63) return 'textiles';
    if (n >= 1   && n <= 24) return 'food';
    if (n >= 84  && n <= 85) return 'machinery';
    if (n >= 90  && n <= 91) return 'medical';
    return 'general';
  }

  function matchProduct(product, targetMarkets) {
    const allMarkets = CT.data.markets;
    const relevant = targetMarkets && targetMarkets.length
      ? allMarkets.filter(m =>
          targetMarkets.some(t =>
            m.code === t || m.name.toLowerCase().includes(t.toLowerCase()) || m.region.toLowerCase().includes(t.toLowerCase())
          )
        )
      : allMarkets;

    return relevant.map(market => {
      const score  = getOpportunityScore(market, product);
      const tariff = _tariff(product.category || 'general', market.code);
      return {
        market,
        score,
        tariff,
        recommendation: score >= 80 ? 'Strong opportunity'    :
                        score >= 65 ? 'Moderate opportunity'  : 'Challenging market',
      };
    }).sort((a, b) => b.score - a.score);
  }

  function getAllOpportunities(customers) {
    const opps = [];
    customers.forEach(customer => {
      customer.products.forEach(product => {
        const matches = matchProduct(product, customer.targetMarkets);
        matches.slice(0, 3).forEach(m => {
          opps.push({
            id: `OPP-${String(opps.length + 1).padStart(3,'0')}`,
            customer:     customer.name,
            customerId:   customer.id,
            customerFlag: customer.flag,
            product:      product.name,
            category:     product.category,
            market:       m.market.name,
            marketCode:   m.market.code,
            region:       m.market.region,
            score:        m.score,
            tariff:       m.tariff,
            gdpGrowth:    m.market.gdpGrowth,
            importGrowth: m.market.importGrowth,
          });
        });
      });
    });
    return opps.sort((a, b) => b.score - a.score).slice(0, 25);
  }

  function runForCustomer(customer) {
    const results = customer.products.map(product => ({
      product,
      matches: matchProduct(product, customer.targetMarkets).slice(0, 4),
    }));

    const bestMatch = results[0]?.matches[0] || null;

    CT.store.addLog({
      module: 'TM',
      message: bestMatch
        ? `Market matching — ${customer.products.length} products. Best: ${bestMatch.market.name} score ${bestMatch.score}, tariff ${bestMatch.tariff}%`
        : 'Market matching complete — no matches found',
      customerId: customer.id,
      customer:   customer.name,
    });

    return { results, bestMatch };
  }

  return { matchProduct, lookupTariff, getOpportunityScore, getAllOpportunities, runForCustomer, getCategoryFromHS };
})();
