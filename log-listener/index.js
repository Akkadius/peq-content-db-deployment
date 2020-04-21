const axios        = require('axios');
const alwaysTail   = require('./lib/always-tail');
const fs           = require('fs')
const util         = require('util')
const path         = require('path')
const logWatchPath = process.env.LOG_WATCH_PATH;
let filesToWatch   = [];
let watchInstances = [];

console.log("LOG_WATCH_PATH [%s]", logWatchPath);

/**
 * Clear watches
 */
function clearWatches() {
  console.log("Clearing watches [%s]", watchInstances.length);
  watchInstances.forEach(instance => {
    instance.unwatch();
  });

  watchInstances = [];
  filesToWatch   = [];
}

function setNewWatches() {
  fs.readdirSync(logWatchPath).forEach(file => {
    if (file.includes(".log")) {
      filesToWatch.push(file);
    }
  });

  filesToWatch.forEach(file => {
    const watchFile = path.join(logWatchPath, file);
    let stats       = fs.statSync(watchFile);
    let seconds     = (new Date().getTime() - stats.mtime) / 1000;

    if (seconds > 86400) {
      // console.log("File hasn't been modified in the past day, skipping [%s]", watchFile)
      return;
    }

    console.log("Setting watch [%s]", watchFile);

    let tail = new alwaysTail(watchFile, '\n');
    tail.on('line', function (data) {
      const line = JSON.parse(data);
      if (line.query) {
        sendQueryLogRelay(line)
      } 
      // else if (line.event && line.event === "MySQL_Client_Connect_OK") {
      //   sendAuditLogRelay(line)
      // }
    });

    tail.on('error', function (data) {
      console.log('error:', data);
    });

    tail.watch();

    watchInstances.push(tail);
  });
}

setInterval(function () {
  processLoop();
}, 3600 * 1000);

function processLoop() {
  clearWatches();
  setNewWatches();
}

processLoop();

console.log("Starting main loop");

// process.exit(1);

/**
 * Tail
 */
// tail.on('line', function (data) {
//     if (data.includes("Invalid login attempt")) {
//         return false;
//     }
//
//     const projectedString = messageBuffer + data;
//     if (projectedString.length > 1950) {
//         sendMessage(messageBuffer);
//         messageBuffer = '';
//     }
//     messageBuffer += data + '\n';
// });
//
// tail.on('error', function (data) {
//     console.log('error:', data);
// });

// tail.watch();

/**
 * Send loop
 */
// setInterval(function () {
//     if (messageBuffer.trim() === '') {
//         return false;
//     }
//
//     sendMessage(messageBuffer);
//     messageBuffer = '';
//
// }, 5000);


function sendQueryLogRelay(line) {
  let message = '';
  message += util.format('**User** [%s] ', line.username);
  message += util.format('**Rows Affected / Sent** [%s / %s] ', line.rows_affected, line.rows_sent);
  message += util.format('**Query Time (Seconds)** [%s] ', parseFloat(line.duration_us / 1000000));
  message += util.format('**Client** [%s] ', line.client);
  // message += util.format('**Time** [%s] ', line.starttime);

  axios.post(process.env.DISCORD_WEBHOOK, {
      content: message + '\n```sql\n' + line.query + '\n```'
    }
  ).catch(function (error) {
    console.log(error);
  });
}

function sendAuditLogRelay(line) {
  let message = '';
  message += util.format('**User** [%s] ', line.username);
  message += util.format('**Event** [%s] ', line.event);
  message += util.format('**Client** [%s] ', line.client_addr);

  axios.post(process.env.DISCORD_WEBHOOK, {
      content: message
    }
  ).catch(function (error) {
    console.log(error);
  });
}
