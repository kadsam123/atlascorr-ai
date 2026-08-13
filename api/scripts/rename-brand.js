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

function renameBrand() {
  console.log('🌀 Running Codebase Renaming Script (CircleTrade AI -> AtlasTrade AI)...');

  FILES_TO_RENAME.forEach(filePath => {
    if (!fs.existsSync(filePath)) {
      console.log(`[WARN] File not found: ${filePath}`);
      return;
    }

    try {
      let content = fs.readFileSync(filePath, 'utf8');

      // Perform string replacements
      content = content.replace(/CircleTrade AI/g, 'AtlasTrade AI');
      content = content.replace(/circletrade-ai/g, 'atlastrade-ai');
      content = content.replace(/CircleTrade/g, 'AtlasTrade');
      content = content.replace(/circletrade/g, 'atlastrade');

      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Renamed references in: ${path.basename(filePath)}`);
    } catch (err) {
      console.error(`❌ Failed to edit: ${filePath}. Error: ${err.message}`);
    }
  });

  console.log('\n🎉 Global Renaming Complete.');
}

renameBrand();
