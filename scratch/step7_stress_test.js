/* ============================================================================
   STEP 7 — Full Pipeline Stress Test (Final QA)
   Tests:
     1. Individual agent endpoints (HS, Tariff, Compliance, Route, Export Plan)
     2. Full dossier batch pipeline — UNPAID (fallback mode)
     3. Payment Agent — create wallet, pay, verify proof
     4. Full dossier batch pipeline — PAID (premium enrichment)
     5. Cross-pipeline consistency (no contradictions, no missing fields)
     6. Multi-corridor load (3 HS codes × 3 corridors = 9 dossiers per batch)
   ============================================================================ */

const API = process.env.API_URL || 'https://atlascorr-agent-api-production.up.railway.app';
const KEY = process.env.API_KEY || 'ct-demo-key-2026';

const TEST_PAYLOAD = {
  hs_code: '0901.11',
  origin_country: 'CA',
  destination_country: 'DE',
  cargo_value: 50000,
  mode: 'sea',
  category: 'food'
};

const BATCH_PAYLOAD = {
  origin_country: 'CA',
  corridors: ['DE', 'AE', 'FR'],
  hs_codes: ['0901.11', '7318.15', '6204.43'],
  mode: 'sea',
  min_cargo_value: 30000
};

const AGENT_WALLET = '0xa98f487e4521bcbfbec7e5f55698addee5239700b5';

// ── Counters ──────────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const failures = [];

function assert(label, condition, detail) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    failures.push({ label, detail });
    console.log(`  ❌ ${label} — ${detail || 'FAILED'}`);
  }
}

async function call(method, path, body) {
  const url = `${API}${path}`;
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': KEY
    }
  };
  if (body && method !== 'GET') opts.body = JSON.stringify(body);
  const t0 = Date.now();
  const res = await fetch(url, opts);
  const ms = Date.now() - t0;
  const data = await res.json().catch(() => null);
  return { status: res.status, data, ms };
}

// ── TEST SUITES ───────────────────────────────────────────────────────────────

async function testHSCode() {
  console.log('\n═══ 1/8  HS Code Classification Agent ═══');
  const { status, data, ms } = await call('POST', '/api/hs-code', {
    name: 'Roasted coffee beans',
    description: 'Arabica coffee beans, roasted, bulk pack',
    origin_country: 'CA',
    destination_country: 'DE'
  });
  assert('HTTP 200', status === 200, `Got ${status}`);
  assert('hs_code present', data && data.hs_code, 'Missing hs_code');
  assert('confidence_baseline > 0', data && data.confidence_baseline > 0, `confidence_baseline = ${data?.confidence_baseline}`);
  assert('reasoning present', data && typeof data.reasoning === 'string' && data.reasoning.length > 5, 'Missing reasoning');
  assert('qa_supervisor present', data && data.qa_supervisor, 'Missing qa_supervisor');
  assert(`Response < 5s (${ms}ms)`, ms < 5000, `${ms}ms`);
  return data;
}

async function testTariff() {
  console.log('\n═══ 2/8  Tariff Agent ═══');
  const { status, data, ms } = await call('POST', '/api/tariff', {
    hs_code: TEST_PAYLOAD.hs_code,
    origin_country: TEST_PAYLOAD.origin_country,
    destination_country: TEST_PAYLOAD.destination_country
  });
  assert('HTTP 200', status === 200, `Got ${status}`);
  assert('hs_code matches', data && data.hs_code === TEST_PAYLOAD.hs_code, `Got ${data?.hs_code}`);
  assert('duty_rate_pct is number', data && typeof data.duty_rate_pct === 'number', 'Not a number');
  assert('duty_rate_pct >= 0', data && data.duty_rate_pct >= 0, `Got ${data?.duty_rate_pct}`);
  assert('enrichment object present', data && data.enrichment, 'Missing enrichment');
  assert('qa_supervisor present', data && data.qa_supervisor, 'Missing qa_supervisor');
  assert('qa_supervisor.status valid', data && ['APPROVED_CORE','APPROVED_WITH_ENRICHMENT','DEGRADED','DEGRADED_CORE_ONLY'].includes(data.qa_supervisor?.status), `Got ${data?.qa_supervisor?.status}`);
  assert('self_reflection_log is array', data && Array.isArray(data.qa_supervisor?.self_reflection_log), 'Not an array');
  assert(`Response < 8s (${ms}ms)`, ms < 8000, `${ms}ms`);
  return data;
}

async function testCompliance() {
  console.log('\n═══ 3/8  Compliance Agent ═══');
  const { status, data, ms } = await call('POST', '/api/compliance', {
    hs_code: TEST_PAYLOAD.hs_code,
    origin_country: TEST_PAYLOAD.origin_country,
    destination_country: TEST_PAYLOAD.destination_country,
    cargo_value: TEST_PAYLOAD.cargo_value
  });
  assert('HTTP 200', status === 200, `Got ${status}`);
  assert('compliant is boolean', data && typeof data.compliant === 'boolean', `Got ${typeof data?.compliant}`);
  assert('required_documents is array', data && Array.isArray(data.required_documents), 'Not an array');
  assert('required_documents.length > 0', data && data.required_documents?.length > 0, 'Empty');
  assert('enrichment object present', data && data.enrichment, 'Missing enrichment');
  assert('qa_supervisor present', data && data.qa_supervisor, 'Missing qa_supervisor');
  assert(`Response < 8s (${ms}ms)`, ms < 8000, `${ms}ms`);
  return data;
}

async function testRouteScore() {
  console.log('\n═══ 4/8  Route Scoring Agent ═══');
  const { status, data, ms } = await call('POST', '/api/route-score', {
    origin_country: TEST_PAYLOAD.origin_country,
    destination_country: TEST_PAYLOAD.destination_country,
    mode: TEST_PAYLOAD.mode,
    cargo_value: TEST_PAYLOAD.cargo_value
  });
  assert('HTTP 200', status === 200, `Got ${status}`);
  assert('route_score is number', data && typeof data.route_score === 'number', `Got ${typeof data?.route_score}`);
  assert('route_score in [0,1]', data && data.route_score >= 0 && data.route_score <= 1, `Got ${data?.route_score}`);
  assert('base_transit_time_days > 0', data && data.base_transit_time_days > 0, `Got ${data?.base_transit_time_days}`);
  assert('base_cost_estimate_usd > 0', data && data.base_cost_estimate_usd > 0, `Got ${data?.base_cost_estimate_usd}`);
  assert('enrichment object present', data && data.enrichment, 'Missing enrichment');
  assert('qa_supervisor present', data && data.qa_supervisor, 'Missing qa_supervisor');
  assert(`Response < 8s (${ms}ms)`, ms < 8000, `${ms}ms`);
  return data;
}

async function testExportPlan() {
  console.log('\n═══ 5/8  Export Plan Agent ═══');
  const { status, data, ms } = await call('POST', '/api/export-plan', {
    hs_code: TEST_PAYLOAD.hs_code,
    origin_country: TEST_PAYLOAD.origin_country,
    destination_country: TEST_PAYLOAD.destination_country,
    mode: TEST_PAYLOAD.mode,
    cargo_value: TEST_PAYLOAD.cargo_value
  });
  assert('HTTP 200', status === 200, `Got ${status}`);
  assert('core_steps is array', data && Array.isArray(data.core_steps), 'Not an array');
  assert('core_steps.length > 0', data && data.core_steps?.length > 0, 'Empty');
  assert('enrichment object present', data && data.enrichment, 'Missing enrichment');
  assert('qa_supervisor present', data && data.qa_supervisor, 'Missing qa_supervisor');
  assert(`Response < 8s (${ms}ms)`, ms < 8000, `${ms}ms`);
  return data;
}

async function testPaymentFlow() {
  console.log('\n═══ 6/8  Payment Agent — Full Flow ═══');

  // 6a. Create wallet
  console.log('  ── 6a. Create wallet');
  const cw = await call('POST', '/api/payment/create-wallet', {});
  assert('Create wallet: 201', cw.status === 201, `Got ${cw.status}`);
  assert('wallet.address present', cw.data?.wallet?.address, 'Missing address');
  assert('wallet.balance_usdc >= 0', cw.data?.wallet?.balance_usdc >= 0, `Got ${cw.data?.wallet?.balance_usdc}`);

  // 6b. Pay
  console.log('  ── 6b. Execute payment');
  const pay = await call('POST', '/api/payment/pay', { sender_address: AGENT_WALLET, amount: 0.01 });
  assert('Pay: 200', pay.status === 200, `Got ${pay.status}`);
  assert('transaction.tx_hash present', pay.data?.transaction?.tx_hash, 'Missing tx_hash');
  assert('transaction.explorer_url present', pay.data?.transaction?.explorer_url, 'Missing explorer_url');
  assert('transaction.amount_usdc === 0.01', pay.data?.transaction?.amount_usdc === 0.01, `Got ${pay.data?.transaction?.amount_usdc}`);
  assert('wallet_balance_usdc < 100', pay.data?.wallet_balance_usdc < 100, `Got ${pay.data?.wallet_balance_usdc}`);
  assert('timestamp present', pay.data?.timestamp, 'Missing timestamp');

  const txHash = pay.data?.transaction?.tx_hash;

  // 6c. Proof
  console.log('  ── 6c. Verify proof');
  if (txHash) {
    const proof = await call('GET', `/api/payment/proof?tx=${txHash}`);
    assert('Proof: 200', proof.status === 200, `Got ${proof.status}`);
    assert('confirmed === true', proof.data?.confirmed === true, `Got ${proof.data?.confirmed}`);
    assert('block_number > 0', proof.data?.block_number > 0, `Got ${proof.data?.block_number}`);
    assert('confirmations >= 1', proof.data?.confirmations >= 1, `Got ${proof.data?.confirmations}`);
  } else {
    assert('Proof skipped (no tx_hash)', false, 'Could not test proof without tx_hash');
  }

  return txHash;
}

async function testDossierBatchUnpaid() {
  console.log('\n═══ 7/8  Dossier Batch — UNPAID (Fallback Mode) ═══');
  const { status, data, ms } = await call('POST', '/api/dossier-batch', BATCH_PAYLOAD);
  assert('HTTP 200', status === 200, `Got ${status}`);
  assert('dossiers is array', data && Array.isArray(data.dossiers), 'Not an array');

  const expected = BATCH_PAYLOAD.hs_codes.length * BATCH_PAYLOAD.corridors.length;
  assert(`dossiers.length === ${expected}`, data?.dossiers?.length === expected, `Got ${data?.dossiers?.length}`);
  assert('portfolio_summary present', data?.portfolio_summary, 'Missing portfolio_summary');
  assert('request_id present', data?.request_id, 'Missing request_id');
  assert('timestamp present', data?.timestamp, 'Missing timestamp');

  // Validate every dossier entry
  let allValid = true;
  let contradictions = 0;
  (data?.dossiers || []).forEach((d, i) => {
    if (!d.hs_code || !d.destination_country || !d.tariff || !d.compliance || !d.route || !d.export_plan || !d.summary) {
      allValid = false;
    }
    // Check no negative values
    if (d.tariff.duty_rate < 0 || d.compliance.risk_score < 0 || d.route.transit_days < 0 || d.route.cost_usd < 0) {
      contradictions++;
    }
    // Check suitability rating is valid
    if (!['HIGH', 'MEDIUM', 'LOW'].includes(d.summary.suitability)) {
      contradictions++;
    }
  });
  assert('All dossiers have required fields', allValid, 'Missing fields in some dossiers');
  assert('No contradictions (negative values, invalid ratings)', contradictions === 0, `${contradictions} contradictions`);
  assert(`Response < 90s (${ms}ms)`, ms < 90000, `${ms}ms`);
  return data;
}

async function testDossierBatchPaid(txHash) {
  console.log('\n═══ 8/8  Dossier Batch — PAID (Premium Enrichment) ═══');
  const paidPayload = { ...BATCH_PAYLOAD, payment_tx_hash: txHash };
  const { status, data, ms } = await call('POST', '/api/dossier-batch', paidPayload);
  assert('HTTP 200', status === 200, `Got ${status}`);
  assert('dossiers is array', data && Array.isArray(data.dossiers), 'Not an array');

  const expected = BATCH_PAYLOAD.hs_codes.length * BATCH_PAYLOAD.corridors.length;
  assert(`dossiers.length === ${expected}`, data?.dossiers?.length === expected, `Got ${data?.dossiers?.length}`);

  // In paid mode, at least some agents should attempt enrichment
  let enrichedCount = 0;
  let contradictions = 0;
  let missingLogs = 0;
  (data?.dossiers || []).forEach(d => {
    const statuses = [d.tariff?.qa_status, d.compliance?.qa_status, d.route?.qa_status, d.export_plan?.qa_status];
    if (statuses.some(s => s === 'APPROVED_WITH_ENRICHMENT')) enrichedCount++;
    if (statuses.some(s => !s)) missingLogs++;
    // No negative values
    if (d.tariff?.duty_rate < 0 || d.compliance?.risk_score < 0) contradictions++;
    if (!['HIGH', 'MEDIUM', 'LOW'].includes(d.summary?.suitability)) contradictions++;
  });
  assert('No contradictions', contradictions === 0, `${contradictions} found`);
  assert('No missing QA statuses', missingLogs === 0, `${missingLogs} missing`);
  assert('portfolio_summary present', data?.portfolio_summary, 'Missing');
  assert(`Response < 120s (${ms}ms)`, ms < 120000, `${ms}ms`);
  return data;
}

// ── MAIN ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║   STEP 7 — Full Pipeline Stress Test (Final QA)            ║');
  console.log('║   Target: ' + API);
  console.log('║   Time:   ' + new Date().toISOString());
  console.log('╚══════════════════════════════════════════════════════════════╝');

  const t0 = Date.now();

  // Phase 1 — Individual agents
  await testHSCode();
  await testTariff();
  await testCompliance();
  await testRouteScore();
  await testExportPlan();

  // Phase 2 — Payment flow
  const txHash = await testPaymentFlow();

  // Phase 3 — Full pipeline without payment (fallback)
  await testDossierBatchUnpaid();

  // Phase 4 — Full pipeline with payment (premium enrichment)
  if (txHash) {
    await testDossierBatchPaid(txHash);
  } else {
    console.log('\n⚠️  Skipping paid batch test — no tx_hash from payment flow.');
  }

  // ── SUMMARY ─────────────────────────────────────────────────────────────────
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log(`║  STEP 7 RESULTS                                            ║`);
  console.log(`║  Passed: ${String(passed).padEnd(4)} Failed: ${String(failed).padEnd(4)} Total: ${String(passed + failed).padEnd(4)}       ║`);
  console.log(`║  Elapsed: ${elapsed}s                                        ║`);
  console.log(`╚══════════════════════════════════════════════════════════════╝`);

  if (failures.length > 0) {
    console.log('\n── FAILURES ──');
    failures.forEach((f, i) => console.log(`  ${i + 1}. ${f.label}: ${f.detail}`));
  }

  console.log(`\n${failed === 0 ? '🛡️  STEP 7 VERDICT: PASSED — Pipeline is judge-ready.' : '⚠️  STEP 7 VERDICT: ISSUES DETECTED — Review failures above.'}`);

  // Output JSON for artifact consumption
  const report = {
    step: 7,
    verdict: failed === 0 ? 'PASSED' : 'ISSUES_DETECTED',
    passed,
    failed,
    total: passed + failed,
    elapsed_seconds: parseFloat(elapsed),
    timestamp: new Date().toISOString(),
    failures
  };
  console.log('\n── JSON REPORT ──');
  console.log(JSON.stringify(report, null, 2));
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
