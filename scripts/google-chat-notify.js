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
      if (status === 'passed' || status === 'ok') {
        passed += 1;
      } else if (status === 'failed' || status === 'broken') {
        failed += 1;
      } else {
        // fallback: if has `errors` or `error`, treat as failed
        if (t.error || t.errors) {
          failed += 1;
        } else {
          passed += 1;
        }
      }
    }

    return { total, passed, failed };
  }

  // Search recursively for any of the keys
  const found = { total: null, passed: null, failed: null };
  function walk(o) {
    if (!o || typeof o !== 'object') {
      return;
    }
    for (const k of Object.keys(o)) {
      if (found.total === null && /total/i.test(k) && typeof o[k] === 'number') {
        found.total = o[k];
      }
      if (found.passed === null && /pass(es)?/i.test(k) && typeof o[k] === 'number') {
        found.passed = o[k];
      }
      if (found.failed === null && /fail(ure|ed|s)?/i.test(k) && typeof o[k] === 'number') {
        found.failed = o[k];
      }
      if (typeof o[k] === 'object') {
        walk(o[k]);
      }
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
    const buf = fs.readFileSync(path);
    // Try UTF-8 first
    let content = buf.toString('utf8');
    if (content.charCodeAt(0) === 0xfeff) {
      content = content.slice(1);
    }
    try {
      return JSON.parse(content);
    } catch {
      // Try utf16le (PowerShell on Windows often creates UTF-16LE output)
      try {
        content = buf.toString('utf16le');
        if (content.charCodeAt(0) === 0xfeff) {
          content = content.slice(1);
        }
        return JSON.parse(content);
      } catch {
        // Last attempt: attempt to strip any non-printable prefix by slicing at the first
        // occurrence of a JSON opening char ({ or [) or newline/carriage return.
        const candidates = ['{', '[', '\n', '\r'];
        const idxs = candidates.map((c) => content.indexOf(c)).filter((i) => i !== -1);
        const idx = idxs.length ? Math.min(...idxs) : -1;
        if (idx !== -1) {
          content = content.slice(idx);
        }
        return JSON.parse(content);
      }
    }
  } catch (err) {
    console.error('Failed to read or parse JSON file:', path, err && err.message);
    return null;
  }
}

function sendToGoogleChat(webhookUrl, payloadObject) {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(webhookUrl);
      const payload = JSON.stringify(payloadObject);

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

function escapeHtml(str) {
  if (!str) {
    return '';
  }
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildCardPayload(reportJson, counts, repo, ref, runUrl, emoji) {
  const { total = 0, passed = 0, failed = 0 } = counts || {};
  const title = `${emoji} Test result: ${failed > 0 ? 'Some tests failed' : 'All tests passed'}`;
  const subtitle = repo ? `${repo} ${ref ? `- ${ref}` : ''}` : ref || '';
  const statusText = failed > 0 ? 'FAILED' : 'SUCCESS';
  const statusColor = failed > 0 ? '#D32F2F' : '#2E7D32';

  // Build a compact HTML for the detailed list
  // compute test run duration (earliest start to latest end)
  let minStart = Number.POSITIVE_INFINITY;
  let maxEnd = 0;
  if (Array.isArray(reportJson.testResults)) {
    for (const fr of reportJson.testResults) {
      if (typeof fr.startTime === 'number' && fr.startTime < minStart) {
        minStart = fr.startTime;
      }
      if (typeof fr.endTime === 'number' && fr.endTime > maxEnd) {
        maxEnd = fr.endTime;
      }
    }
  }
  let durationText = '';
  if (minStart !== Number.POSITIVE_INFINITY && maxEnd > minStart) {
    const ms = Math.max(0, maxEnd - minStart);
    const secs = Math.round(ms / 1000);
    const mm = Math.floor(secs / 60);
    const ss = secs % 60;
    durationText = mm > 0 ? `${mm}m ${ss}s` : `${ss}s`;
  }

  // helper: get tag by path
  function getTag(p) {
    if (/tests[/\\]integration/.test(p)) {
      return 'integration';
    }
    if (/tests[/\\]unit/.test(p)) {
      return 'unit';
    }
    if (/tests[/\\]e2e/.test(p)) {
      return 'e2e';
    }
    return 'other';
  }

  // Build grouped HTML list by tag
  const groups = {};
  if (Array.isArray(reportJson.testResults)) {
    for (const fileResult of reportJson.testResults) {
      const filePath = fileResult.name || '';
      const tag = getTag(filePath);
      if (!groups[tag]) { groups[tag] = []; }
      const shortFilePath = filePath.replace(/^.*?tests[/\\]/i, 'tests/');
      if (Array.isArray(fileResult.assertionResults)) {
        for (const a of fileResult.assertionResults) {
          const status = (a.status || '').toLowerCase();
          const statusEmoji = status === 'passed' ? '✅' : status === 'failed' ? '❌' : '⚪';
          const fullTitle = ((a.ancestorTitles || []).join(' > ') + (a.ancestorTitles && a.ancestorTitles.length ? ' > ' : '') + (a.title || '')).trim();
          groups[tag].push({ title: fullTitle, statusEmoji, file: shortFilePath });
        }
      }
    }
  }

  // Build HTML for test groups, collapsed visually by tag
  let testHtml = '<div style="font-family: Arial, sans-serif; font-size: 12px;">';
  Object.keys(groups).forEach((g) => {
    testHtml += `<b>[${escapeHtml(g)}]</b><br/>`;
    groups[g].forEach((t) => {
      testHtml += `&nbsp;&nbsp;${t.statusEmoji} ${escapeHtml(t.title)} <i>(${escapeHtml(t.file)})</i><br/>`;
    });
    testHtml += '<br/>';
  });
  testHtml += '</div>';
  // Buttons for run and report
  const buttons = [];
  if (runUrl) {
    buttons.push({ text: 'View Run', onClick: { openLink: { url: runUrl } } });
  }
  if (process.env.REPORT_URL) {
    buttons.push({ text: 'View Report', onClick: { openLink: { url: process.env.REPORT_URL } } });
    if (String(process.env.REPORT_URL).toLowerCase().endsWith('.zip')) {
      buttons.unshift({ text: 'Download Report (.zip)', onClick: { openLink: { url: process.env.REPORT_URL } } });
    }
  }

  return {
    cardsV2: [
      {
        card: {
          header: {
            title,
            subtitle,
            imageUrl: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png',
            imageType: 'CIRCLE',
          },
          sections: [
            {
              widgets: [
                {
                  decoratedText: {
                    startIcon: { knownIcon: 'CONFIRMATION_NUMBER_ICON' },
                    text: `<b>Status:</b> <font color="${statusColor}">${escapeHtml(statusText)}</font>`,
                  },
                },
                { decoratedText: { startIcon: { materialIcon: { name: 'calendar_today' } }, text: `<b>Duration:</b> ${escapeHtml(durationText || 'N/A')}` } },
                { decoratedText: { startIcon: { knownIcon: 'TIMER' }, text: `<b>Total:</b> ${total} &nbsp;&nbsp; <b>Passed:</b> ${passed} &nbsp;&nbsp; <b>Failed:</b> ${failed}` } },
                { decoratedText: { startIcon: { knownIcon: 'PERSON' }, text: `<b>Executor:</b> ${escapeHtml(process.env.GITHUB_ACTOR || '')} &nbsp;&nbsp; <b>Branch:</b> ${escapeHtml(ref || '')}` } },
              ],
            },
            {
              widgets: buttons.length ? [{ buttonList: { buttons } }] : [],
            },
            {
              widgets: [{ textParagraph: { text: testHtml } }],
            },
          ],
        },
      },
    ],
  };

}

(async function main() {
  const reportPath = process.argv[2] || 'test-report.json';
  const webhookUrl = process.env.GOOGLE_CHAT_WEBHOOK_URL || DEFAULT_GOOGLE_CHAT_WEBHOOK_URL;
  const dryRun = process.env.DRY_RUN === '1' || process.argv.includes('--dry-run');

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
  if (runUrl) {
    message += `\n• Details: ${runUrl}`;
  }
  if (ref) {
    message += `\n• Ref: ${ref}`;
  }
  // Build per-test list (used for fallback plain-text logging)
  message += '\n\nDetailed test list:';

  try {
    if (Array.isArray(reportJson.testResults)) {
      for (const fileResult of reportJson.testResults) {
        const filePath = fileResult.name || '';
        // Determine tag by path
        const getTag = (p) => {
          if (/tests[/\\]integration/.test(p)) {
            return 'integration';
          }
          if (/tests[/\\]unit/.test(p)) {
            return 'unit';
          }
          if (/tests[/\\]e2e/.test(p)) {
            return 'e2e';
          }
          return 'other';
        };
        const tag = getTag(filePath);
        // Short file path for readability
        const shortFilePath = filePath.replace(/^.*?tests[/\\]/i, 'tests/');
        if (Array.isArray(fileResult.assertionResults)) {
          for (const a of fileResult.assertionResults) {
            const status = (a.status || '').toLowerCase();
            const statusEmoji = status === 'passed' ? '✅' : status === 'failed' ? '❌' : '⚪';
            // Full test name: ancestorTitles + title
            const fullTitle = ((a.ancestorTitles || []).join(' > ') + (a.ancestorTitles && a.ancestorTitles.length ? ' > ' : '') + (a.title || '')).trim();
            message += `\n• [${tag}] ${fullTitle} — ${statusEmoji} ${status.toUpperCase()} (${shortFilePath})`;
          }
        }
      }
    }
  } catch (err) {
    // Do not abort; append a simple fallback
    message += `\n\nCould not build detailed test list: ${err && err.message}`;
  }

  // Build card payload and send
  const cardPayload = buildCardPayload(reportJson, counts, repo, ref, runUrl, emoji);
  try {
    if (dryRun) {
      console.log('DRY RUN enabled — would send payload:');
      console.log(JSON.stringify(cardPayload, null, 2));
    } else {
      const result = await sendToGoogleChat(webhookUrl, cardPayload);
      console.log('Notification sent to Google Chat:', result.status);
    }
  } catch (err) {
    // Fallback: try sending a plain text message to the webhook
    console.error('Failed to send card to Google Chat, retrying as plain text message:', err && err.message);
    try {
      const fallbackResult = await sendToGoogleChat(webhookUrl, { text: message });
      console.log('Fallback notification sent to Google Chat:', fallbackResult.status);
    } catch (err2) {
      console.error('Failed to send notification to Google Chat:', err2 && err2.message);
    }
  }

  // Avoid failing the script in case of errors sending notification; keep exit 0
  process.exit(0);
})();
