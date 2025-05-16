const axios = require('axios');
const alwaysTail = require('./lib/always-tail');
const fs = require('fs');
const util = require('util');
const path = require('path');

const logWatchPath = process.env.LOG_WATCH_PATH;
let watchInstances = [];

console.log("LOG_WATCH_PATH [%s]", logWatchPath);

/**
 * Clear existing watches
 */
function clearWatches() {
  console.log("Clearing watches [%s]", watchInstances.length);
  watchInstances.forEach((instance) => instance.unwatch());
  watchInstances = [];
}

/**
 * Get the latest modified file based on a filename pattern
 */
function getLatestFile(pattern) {
  const files = fs
    .readdirSync(logWatchPath)
    .filter((file) => file.match(pattern)) // Filter based on the pattern
    .map((file) => {
      const filePath = path.join(logWatchPath, file);
      const stats = fs.statSync(filePath);
      return { file, mtime: stats.mtime };
    });

  if (files.length === 0) return null;

  files.sort((a, b) => b.mtime - a.mtime); // Sort by most recent
  return files[0].file; // Return the most recent file
}

/**
 * Set up new watches for the latest audit and query logs
 */
function setNewWatches() {
  const latestAuditLog = getLatestFile(/^audit-log\.log\.\d+$/);
  const latestQueryLog = getLatestFile(/^queries\.log\.\d+$/);

  const filesToWatch = [latestAuditLog, latestQueryLog].filter(Boolean); // Remove null if any

  filesToWatch.forEach((file) => {
    const watchFile = path.join(logWatchPath, file);
    console.log("Setting watch [%s]", watchFile);

    let tail = new alwaysTail(watchFile, '\n');
    tail.on('line', (data) => {
      try {
        const line = JSON.parse(data);
        if (line.query) {
          if (
            line.username.includes('peq_editor') ||
            line.username.includes('monocle')
          ) return;
          sendQueryLogRelay(line);
        } else if (
          line.event === 'MySQL_Client_Connect_OK' &&
          !['192.99.119', '68.112.138.157'].some((addr) => line.client_addr.includes(addr)) &&
          !['ro', 'peq', 'peq_test_server_sandbox', 'peq_server_tgc', 'server', 'peq_editor'].includes(line.username)
        ) {
          sendAuditLogRelay(line);
        }
      } catch (error) {
        console.log('Error parsing log line:', error);
      }
    });

    tail.on('error', (error) => console.log('Error:', error));
    tail.watch();
    watchInstances.push(tail);
  });
}

/**
 * Periodically reset watches
 */
setInterval(() => processLoop(), 3600 * 1000);

function processLoop() {
  clearWatches();
  setNewWatches();
}

processLoop();
console.log("Starting main loop");

function sendQueryLogRelay(line) {
  let message = '';
  message += util.format('**User** [%s] ', line.username);
  message += util.format('**Rows Affected / Sent** [%s / %s] ', line.rows_affected, line.rows_sent);
  message += util.format('**Query Time (Seconds)** [%s] ', parseFloat(line.duration_us / 1000000));
  message += util.format('**Client** [%s] ', line.client);

  axios.post(process.env.DISCORD_WEBHOOK, {
    content: message + '\n```sql\n' + line.query + '\n```',
  }).catch((error) => console.log(error));
}

function sendAuditLogRelay(line) {
  let message = '';
  message += util.format('**User** [%s] ', line.username);
  message += util.format('**Event** [%s] ', line.event);
  message += util.format('**Client** [%s] ', line.client_addr);

  axios.post(process.env.DISCORD_WEBHOOK, { content: message }).catch((error) => console.log(error));
}

const web = require('./app/web');
