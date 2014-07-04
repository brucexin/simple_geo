var colors = require('colors'),
    argv = require('optimist').argv,
    portfinder = require('portfinder'),
    opener = require('opener');

var restify = require('restify');
var reader = require('maxmind-db-reader');


if (argv.h || argv.help) {
  console.log([
    "usage: http-server [path] [options]",
    "",
    "options:",
    "  -p                 Port to use [8080]",
    "  -a                 Address to use [0.0.0.0]",
    "  -d                 maxmind data path",
    "  -s --silent        Suppress log messages from output",
    "  --cors             Enable CORS via the 'Access-Control-Allow-Origin' header",
    "  -h --help          Print this list and exit."
  ].join('\n'));
  process.exit();
}

var port = argv.p || parseInt(process.env.PORT, 10),
    host = argv.a || '0.0.0.0',
    log = (argv.s || argv.silent) ? (function () {}) : console.log,
    requestLogger;

if (!argv.s && !argv.silent) {
  requestLogger = function(req) {
    log('[%s] "%s %s" "%s"', (new Date).toUTCString(), req.method.cyan, req.url.cyan, req.headers['user-agent']);
  }
}

if (!port) {
  portfinder.basePort = 8080;
  portfinder.getPort(function (err, port) {
    if (err) throw err;
    listen(port);
  });
} else {
  listen(port);
}


//var city_db = reader.openSync('./data/GeoLite2-City.mmdb')
var city_db = reader.openSync(argv.d);

function lookup_geo(req, res, next) {
  console.log("request req.params:"+JSON.stringify(req.params));
  var info = city_db.getGeoDataSync(req.params.ip);
  res.send(info);
  next();
}
function listen(port) {
  var options = {
    logFn: requestLogger
  };

  if (argv.cors) {
    options.headers = { 'Access-Control-Allow-Origin': '*' };
  }

  var server = restify.createServer();
  server.get('/ip/:ip', lookup_geo);

  server.listen(port, host, function() {
    log('Starting up http-server, '
      + ' on port: '.yellow
      + port.toString().cyan);
    log('Hit CTRL-C to stop the server');

//    if (argv.o) {
//      opener('http://127.0.0.1:' + port.toString());
//    }
  });
}


if (process.platform !== 'win32') {
  //
  // Signal handlers don't work on Windows.
  //
  process.on('SIGINT', function () {
    log('http-server stopped.'.red);
    process.exit();
  });
}
