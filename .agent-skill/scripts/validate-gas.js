/**
 * script: validate-gas.js
 * Run this script locally (Node.js) before pushing code to clasp to ensure 
 * the project adheres to the Agent Skill constraints.
 * No interactive prompts are used.
 */

const fs = require('fs');
const path = require('path');

function validateGasCode() {
  const codeDir = path.resolve(__dirname, '../../src'); // Assuming source is in src
  if (!fs.existsSync(codeDir)) {
    console.error('[ERROR] Source directory /src not found.');
    console.error('-> FIX: Ensure your GAS scripts are placed in the /src directory before running this validation.');
    process.exit(1);
  }

  const files = fs.readdirSync(codeDir).filter(f => f.endsWith('.js') || f.endsWith('.gs'));
  let hasError = false;

  files.forEach(file => {
    const content = fs.readFileSync(path.join(codeDir, file), 'utf8');
    
    // Rule 1: No axios or fetch (must use UrlFetchApp)
    if (content.includes('axios.') || content.match(/\bfetch\(/)) {
      console.error(`[ERROR] File ${file} uses 'axios' or 'fetch()'.`);
      console.error('-> FIX: Replace with UrlFetchApp.fetch() as required by Google Apps Script constraints.');
      hasError = true;
    }

    // Rule 2: Deduplication awareness
    if (file.includes('fetchNews') && !content.includes('History')) {
      console.warn(`[WARNING] File ${file} might not be checking the 'History' tab for deduplication.`);
      console.warn('-> FIX: Ensure you read the History sheet to filter out duplicate NewsAPI articles.');
    }
  });

  if (hasError) {
    console.error('\nValidation FAILED. Please fix the above errors.');
    process.exit(1);
  } else {
    console.log('Validation PASSED. Code is compliant with Tech Stream Agent skills.');
    process.exit(0);
  }
}

validateGasCode();
