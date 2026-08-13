'use strict';

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..', '..');

const FILES_TO_RENAME = [
  path.join(ROOT_DIR, 'index.html'),
  path.join(ROOT_DIR, 'landing.html'),
  path.join(ROOT_DIR, 'pricing.html'),
  path.join(ROOT_DIR, 'js', 'app.js'),
  path.join(ROOT_DIR, 'js', 'ui', 'dashboard.js'),
  path.join(ROOT_DIR, 'js', 'ui', 'marketplace.js'),
  path.join(ROOT_DIR, 'api', 'server.js'),
  path.join(ROOT_DIR, 'api', 'README.md'),
  path.join(ROOT_DIR, 'antigravity', 'workflow-spec.md'),
  path.join('C:', 'Users', 'kissa', '.gemini', 'antigravity', 'brain', '2db186bc-9c7f-4504-a34c-d84b511d544c', 'submission_qa_briefing.md'),
  path.join('C:', 'Users', 'kissa', '.gemini', 'antigravity', 'brain', '2db186bc-9c7f-4504-a34c-d84b511d544c', 'monetization_readiness_report.md'),
  path.join('C:', 'Users', 'kissa', '.gemini', 'antigravity', 'brain', '2db186bc-9c7f-4504-a34c-d84b511d544c', 'post_submission_roadmap.md'),
  path.join('C:', 'Users', 'kissa', '.gemini', 'antigravity', 'brain', '2db186bc-9c7f-4504-a34c-d84b511d544c', 'stripe_autonomous_invoice.md')
];

function revertBrand() {
  console.log('🌀 Reverting Codebase Brand (AtlasTrade AI -> CircleTrade AI)...');

  FILES_TO_RENAME.forEach(filePath => {
    if (!fs.existsSync(filePath)) {
      console.log(`[WARN] File not found: ${filePath}`);
      return;
    }

    try {
      let content = fs.readFileSync(filePath, 'utf8');

      // Revert replacements back to CircleTrade
      content = content.replace(/AtlasTrade AI/g, 'CircleTrade AI');
      content = content.replace(/atlastrade-ai/g, 'circletrade-ai');
      content = content.replace(/AtlasTrade/g, 'CircleTrade');
      content = content.replace(/atlastrade/g, 'circletrade');

      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Reverted references in: ${path.basename(filePath)}`);
    } catch (err) {
      console.error(`❌ Failed to edit: ${filePath}. Error: ${err.message}`);
    }
  });

  console.log('\n🎉 Brand Reversion Complete.');
}

revertBrand();
