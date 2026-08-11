/* ============================================================
   DDTRS — Dynamic Duty, Trade & Risk System
   Extracts HS codes from product descriptions, runs compliance
   checks against sanctions / dual-use rules, and scores risk.
   ============================================================ */
window.CT = window.CT || {};

CT.ddtrs = (() => {

  function extractHSCode(productDescription) {
    if (!productDescription) return '9999.00';
    const lower = productDescription.toLowerCase();
    for (const [kw, code] of Object.entries(CT.data.hsCodes)) {
      if (lower.includes(kw)) return code;
    }
    return '9999.00';
  }

  function checkCompliance(product, destination) {
    const cat   = product.category || CT.tradeMatch.getCategoryFromHS(product.hsCode);
    const rules = CT.data.complianceRules[cat] || {};
    const destL = (destination || '').toLowerCase();

    const sanctioned = CT.data.sanctionedCountries.some(
      c => destL.includes(c.toLowerCase())
    );

    const issues   = [];
    const warnings = [];
    let licenseRequired = false;

    if (sanctioned) {
      issues.push({ type: 'BLOCK', message: `Destination "${destination}" is on the sanctions list. Shipment blocked.` });
    }

    if (rules.requiresLicense) {
      licenseRequired = true;
      warnings.push({ type: 'LICENSE', message: `${rules.licenseType} required — apply via ${rules.checkBody}` });
    }

    if (rules.dualUse) {
      warnings.push({ type: 'DUAL_USE', message: `Dual-use classification — verify ECCN/EAR99 status with ${rules.checkBody}` });
    }

    if (rules.certRequired) {
      warnings.push({ type: 'CERT', message: `${rules.certRequired} required — verify with ${rules.checkBody}` });
    }

    return {
      passed: issues.length === 0,
      sanctioned,
      licenseRequired,
      issues,
      warnings,
      checkBody: rules.checkBody || 'National Trade Authority',
    };
  }

  function getRiskScore(product, destination) {
    const cat        = product.category || 'general';
    const compliance = checkCompliance(product, destination);

    let score = 0;
    if (compliance.sanctioned)     score += 10;
    if (compliance.licenseRequired) score +=  3;
    score += compliance.warnings.length * 1.4;

    const baseRisk = { medical:2.2, electronics:2.5, machinery:1.6, textiles:0.6, food:1.1 };
    score += baseRisk[cat] || 1.0;
    score += Math.random() * 1.3; // realistic variance

    return Math.min(10, parseFloat(score.toFixed(1)));
  }

  function runForCustomer(customer) {
    const results = [];

    customer.products.forEach(product => {
      customer.targetMarkets.forEach(market => {
        const compliance = checkCompliance(product, market);
        const riskScore  = getRiskScore(product, market);
        const hsCode     = product.hsCode || extractHSCode(product.name);

        results.push({
          product:    product.name,
          productId:  product.id,
          destination: market,
          hsCode,
          compliance,
          riskScore,
        });
      });
    });

    const blocked  = results.filter(r => !r.compliance.passed);
    const highRisk = results.filter(r => r.riskScore >= 6);
    const avgRisk  = results.length
      ? results.reduce((a, b) => a + b.riskScore, 0) / results.length
      : 0;

    CT.store.addLog({
      module: 'DD',
      message: `DDTRS checks: ${results.length} total, ${blocked.length} blocked, ${highRisk.length} high-risk, avg risk ${avgRisk.toFixed(1)}/10`,
      customerId: customer.id,
      customer:   customer.name,
    });

    return { results, blocked, highRisk, avgRisk };
  }

  return { extractHSCode, checkCompliance, getRiskScore, runForCustomer };
})();
