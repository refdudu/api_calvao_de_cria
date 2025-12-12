#!/usr/bin/env node
'use strict';

const fs = require('fs');
const https = require('https');
const { URL } = require('url');

function findCounts(obj) {
  // Look for common keys for totals/passed/failed across reporters
  const candidates = [
    { total: 'numTotalTests', passed: 'numPassedTests', failed: 'numFailedTests' },
    { total: 'total', passed: 'passed', failed: 'failed' },
    { total: 'tests', passed: 'passes', failed: 'failures' },
    { total: 'totalTests', passed: 'passedTests', failed: 'failedTests' },
  ];

  for (const cand of candidates) {
    if (obj && typeof obj[cand.total] === 'number') {
      return { total: obj[cand.total] || 0, passed: obj[cand.passed] || 0, failed: obj[cand.failed] || 0 };
    }
  }

  // If there's a tests array, aggregate by its status
  if (Array.isArray(obj.tests)) {
    let total = 0,
      passed = 0,
      failed = 0;
    for (const t of obj.tests) {
      total += 1;
      const status = (t.status || '').toLowerCase();
      if (status === 'passed' || status === 'ok') passed += 1;
      else if (status === 'failed' || status === 'broken') failed += 1;
      else {
        // fallback: if has `errors` or `error`, treat as failed
        if (t.error || t.errors) failed += 1;
        else passed += 1;
      }
    }

    return { total, passed, failed };
  }

  // Search recursively for any of the keys
  const found = { total: null, passed: null, failed: null };
  function walk(o) {
    if (!o || typeof o !== 'object') return;
    for (const k of Object.keys(o)) {
      if (found.total === null && /total/i.test(k) && typeof o[k] === 'number') found.total = o[k];
      if (found.passed === null && /pass(es)?/i.test(k) && typeof o[k] === 'number') found.passed = o[k];
      if (found.failed === null && /fail(ure|ed|s)?/i.test(k) && typeof o[k] === 'number') found.failed = o[k];
      if (typeof o[k] === 'object') walk(o[k]);
    }
  }
  walk(obj);

  const total = found.total || (found.passed || 0) + (found.failed || 0);
  const passed = found.passed || 0;
  const failed = found.failed || 0;

  return { total, passed, failed };
}

function safeParseJson(path) {
  try {
    const content = fs.readFileSync(path, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    console.error('Failed to read or parse JSON file:', path, err && err.message);
    return null;
  }
}

function sendToGoogleChat(webhookUrl, text) {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(webhookUrl);
      const payload = JSON.stringify({ text });

      const options = {
        method: 'POST',
        hostname: url.hostname,
        path: url.pathname + url.search,
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'Content-Length': Buffer.byteLength(payload),
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ status: res.statusCode, body: data });
          } else {
            reject(new Error(`Non-2xx response: ${res.statusCode} - ${data}`));
          }
        });
      });

      req.on('error', (err) => reject(err));
      req.write(payload);
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

const DEFAULT_GOOGLE_CHAT_WEBHOOK_URL = 'https://chat.googleapis.com/v1/spaces/AAQA5s2Ta7Y/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=wI9G_cl-QIwLLCYwMoB8y5McIFMfeY8rj4XRkFth6L0';

(async function main() {
  const reportPath = process.argv[2] || 'test-report.json';
  const webhookUrl = process.env.GOOGLE_CHAT_WEBHOOK_URL || DEFAULT_GOOGLE_CHAT_WEBHOOK_URL;

  if (!webhookUrl) {
    console.error('No Google Chat webhook URL available. Skipping notification.');
    process.exit(0);
  }
  if (process.env.GOOGLE_CHAT_WEBHOOK_URL) {
    console.log('Using GOOGLE_CHAT_WEBHOOK_URL from environment');
  } else {
    console.log('No env webhook found; using hardcoded default webhook');
  }

  const reportJson = safeParseJson(reportPath);
  if (!reportJson) {
    console.error('No valid test report JSON found. Exiting without sending notification.');
    process.exit(0);
  }

  const counts = findCounts(reportJson);
  const total = counts.total || 0;
  const passed = counts.passed || 0;
  const failed = counts.failed || 0;
  const emoji = failed > 0 ? '❌' : '✅';

  const repo = process.env.GITHUB_REPOSITORY || '';
  const ref = process.env.GITHUB_REF || '';
  const runUrl = process.env.GITHUB_RUN_ID ? `https://github.com/${repo}/actions/runs/${process.env.GITHUB_RUN_ID}` : '';

  let message = `${emoji} Test result: ${failed > 0 ? 'Some tests failed' : 'All tests passed'}\n`;
  message += `• Total: ${total}\n`;
  message += `• Passed: ${passed}\n`;
  message += `• Failed: ${failed}`;
  if (runUrl) message += `\n• Details: ${runUrl}`;
  if (ref) message += `\n• Ref: ${ref}`;

  try {
    const result = await sendToGoogleChat(webhookUrl, message);
    console.log('Notification sent to Google Chat:', result.status);
  } catch (err) {
    console.error('Failed to send notification to Google Chat:', err && err.message);
  }

  // Avoid failing the script in case of errors sending notification; keep exit 0
  process.exit(0);
})();
