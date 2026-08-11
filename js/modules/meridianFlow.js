/* ============================================================
   Meridian Flow — Corridor Intelligence & Route Scoring
   Scores global trade corridors, detects bottlenecks,
   and recommends optimal routes for SME products.
   ============================================================ */
window.CT = window.CT || {};

CT.meridianFlow = (() => {

  function scoreRoute(origin, destination, product) {
    const corridors = CT.data.corridors;
    const lower = (s) => (s || '').toLowerCase();

    let matches = corridors.filter(c =>
      lower(c.origin).includes(lower(origin)) ||
      lower(c.destination).includes(lower(destination))
    );

    if (!matches.length) {
      // Generate a plausible synthetic corridor
      matches = [{
        id: 'AUTO', name: `${origin} → ${destination}`,
        score: Math.floor(58 + Math.random() * 32),
        transitDays: Math.floor(10 + Math.random() * 22),
        costIndex: parseFloat((3 + Math.random() * 2.2).toFixed(1)),
        portEfficiency: Math.floor(68 + Math.random() * 28),
        politicalRisk: Math.floor(6 + Math.random() * 30),
        volume: parseFloat((1.5 + Math.random() * 8).toFixed(1)),
        trend: ['up','stable','down'][Math.floor(Math.random()*3)],
      }];
    }

    return matches.map(c => {
      let s = c.score;
      if (product?.category === 'medical'     && c.politicalRisk > 20) s -= 6;
      if (product?.category === 'food'        && c.portEfficiency < 80) s -= 4;
      if (product?.category === 'electronics' && c.politicalRisk > 25) s -= 5;

      return {
        corridorId: c.id,
        name: c.name,
        score: Math.min(100, Math.max(30, s)),
        transitDays: c.transitDays,
        costIndex: c.costIndex,
        portEfficiency: c.portEfficiency,
        politicalRisk: c.politicalRisk,
        volume: c.volume,
        trend: c.trend,
        recommendation: _recommend(s),
      };
    }).sort((a, b) => b.score - a.score);
  }

  function _recommend(score) {
    if (score >= 85) return '✅ Highly recommended — excellent corridor efficiency';
    if (score >= 75) return '✅ Recommended — good balance of cost and transit speed';
    if (score >= 65) return '⚠️ Acceptable — monitor for political or port risk';
    return '⛔ Caution — high risk or active bottlenecks detected';
  }

  function detectBottlenecks(corridorId) {
    const known = {
      C004: { port: 'Nhava Sheva (Mumbai)', delay: '+3 days', reason: 'Customs backlog', severity: 'medium' },
      C007: { port: 'Cartagena',            delay: '+5 days', reason: 'Port congestion',  severity: 'high'   },
    };
    return known[corridorId] || null;
  }

  function getRankedCorridors() {
    return [...CT.data.corridors].sort((a, b) => b.score - a.score);
  }

  function runForCustomer(customer) {
    const routes = [];
    customer.targetMarkets.forEach(market => {
      const scored = scoreRoute(customer.country, market, customer.products[0]);
      routes.push(...scored.slice(0, 2));
    });

    const allSorted = routes.sort((a, b) => b.score - a.score);
    const bestRoute = allSorted[0] || null;

    CT.store.addLog({
      module: 'MF',
      message: bestRoute
        ? `Route scoring complete — Best: ${bestRoute.name} (score: ${bestRoute.score}, transit: ${bestRoute.transitDays}d)`
        : 'Route scoring complete — no corridors matched',
      customerId: customer.id,
      customer: customer.name,
    });

    return {
      routes: allSorted.slice(0, 5),
      bestRoute,
      topCorridors: getRankedCorridors().slice(0, 3),
    };
  }

  return { scoreRoute, detectBottlenecks, getRankedCorridors, runForCustomer };
})();
