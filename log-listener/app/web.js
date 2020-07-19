/**
 * Web
 */

const express      = require('express');
const cookieParser = require('cookie-parser');
const logger       = require('morgan');
const app          = express();
const debug        = require('debug')('peq-admin:http');
const http         = require('http');
const recursive    = require('recursive-readdir');
const fs           = require('fs')


const port = normalizePort(process.argv[2] || '3000');
app.set('port', port);

/**
 * Create HTTP server.
 */
var server = http.createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */
server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

/**
 * Normalize a port into a number, string, or false.
 */
function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    return val;
  }

  if (port >= 0) {
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */
function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */
function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug('Listening on ' + bind);
  console.log('[www] Listening on ' + bind);
}

/**
 * Express
 */
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());

/**
 * For Development
 * @type {any}
 */
var cors = require('cors')
app.use(
  cors(
    {
      origin: [
        'http://localhost:8080',
        'http://192.168.98.200:8080',
        'http://docker:8080',
        'http://localhost:5000'
      ],
      exposedHeaders: ['Content-Disposition']
    }
  )
);

const LOG_PATH = "/opt/logs/proxysql/";

/**
 * Very quick service; not really worried about outside access so throwing something very quick in
 * here to at least add a little bit of obscurity
 */
app.use(function(req, res, next) {
  const key = "eyJleHAiOjE1OTQ0NTM2NzMsInVzZXIiOiJhZG1pbiIsImlhdCI6MTU5Mzg0ODg3M30";
  if (!req.headers.authorization) {
    return res.status(403).json({ error: 'No credentials sent!' });
  }
  else if (req.headers.authorization.substring(7, req.headers.authorization.length) !== key) {
    return res.status(403).json({ error: 'Credentials invalid!' });
  }

  next();
});

/**
 * API
 */
app.get('/api/v1/logs/list', async function (req, res, next) {
  let logFiles = (await recursive(LOG_PATH)).filter(function (e) {
    return e.includes(".log");
  });

  let entries = [];
  logFiles.forEach((file) => {
    const stat = fs.fstatSync(fs.openSync(file, 'r'));
    entries.push(
      {
        file: file,
        size: stat.size,
        atime: stat.atimeMs,
        mtime: stat.mtimeMs,
        ctime: stat.ctimeMs
      }
    );
  })

  res.json(entries);
});

app.get('/api/v1/logs/view/:file', async function (req, res, next) {
  let response = {};
  if (req.params.file.includes(LOG_PATH)) {
    const file = fs.readFileSync(req.params.file, 'utf8');
    response   = {fileContents: file};
  } else {
    response = {error: "Invalid path!"};
  }

  res.json(response);
});


/**
 * After other routes are not found
 */
app.get('*', function (req, res, next) {
  res.send("Not found").status(404);
});


module.exports = app;
