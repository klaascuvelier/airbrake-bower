(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var global=typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {};var Client, merge;

merge = require('./util/merge.coffee');

Client = (function() {
  function Client(processor, reporter) {
    this._projectId = 0;
    this._projectKey = '';
    this._context = {};
    this._params = {};
    this._env = {};
    this._session = {};
    this._processor = processor;
    this._reporters = [];
    this._filters = [];
    if (reporter) {
      this.addReporter(reporter);
    }
  }

  Client.prototype.setProject = function(id, key) {
    this._projectId = id;
    return this._projectKey = key;
  };

  Client.prototype.addContext = function(context) {
    return merge(this._context, context);
  };

  Client.prototype.setEnvironmentName = function(envName) {
    return this._context.environment = envName;
  };

  Client.prototype.addParams = function(params) {
    return merge(this._params, params);
  };

  Client.prototype.addEnvironment = function(env) {
    return merge(this._env, env);
  };

  Client.prototype.addSession = function(session) {
    return merge(this._session, session);
  };

  Client.prototype.addReporter = function(reporter) {
    return this._reporters.push(reporter);
  };

  Client.prototype.addFilter = function(filter) {
    return this._filters.push(filter);
  };

  Client.prototype.push = function(err) {
    var defContext, _ref,
      _this = this;
    defContext = {
      language: 'JavaScript',
      sourceMapEnabled: true
    };
    if ((_ref = global.navigator) != null ? _ref.userAgent : void 0) {
      defContext.userAgent = global.navigator.userAgent;
    }
    if (global.location) {
      defContext.url = String(global.location);
    }
    return this._processor(err.error || err, function(name, errInfo) {
      var filterFn, notice, reporterFn, _i, _j, _len, _len1, _ref1, _ref2;
      notice = {
        notifier: {
          name: 'Airbrake JS ' + name,
          version: '0.3.5',
          url: 'https://github.com/airbrake/airbrake-js'
        },
        errors: [errInfo],
        context: merge(defContext, _this._context, err.context),
        params: merge({}, _this._params, err.params),
        environment: merge({}, _this._env, err.environment),
        session: merge({}, _this._session, err.session)
      };
      _ref1 = _this._filters;
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        filterFn = _ref1[_i];
        if (!filterFn(notice)) {
          return;
        }
      }
      _ref2 = _this._reporters;
      for (_j = 0, _len1 = _ref2.length; _j < _len1; _j++) {
        reporterFn = _ref2[_j];
        reporterFn(notice, {
          projectId: _this._projectId,
          projectKey: _this._projectKey
        });
      }
    });
  };

  Client.prototype.wrap = function(fn) {
    var airbrakeWrap;
    airbrakeWrap = function() {
      var args, exc;
      try {
        return fn.apply(this, arguments);
      } catch (_error) {
        exc = _error;
        args = Array.prototype.slice.call(arguments);
        return Airbrake.push({
          error: exc,
          params: {
            "arguments": args
          }
        });
      }
    };
    return airbrakeWrap;
  };

  return Client;

})();

module.exports = Client;


},{"./util/merge.coffee":10}],2:[function(require,module,exports){
var global=typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {};var Client, client, err, processor, reporter, shim, _i, _len;

require("./util/compat.coffee");

Client = require('./client.coffee');

processor = require('./processors/stack.coffee');

reporter = require('./reporters/hybrid.coffee');

client = new Client(processor, reporter);

client.consoleReporter = require('./reporters/console.coffee');

shim = global.Airbrake;

global.Airbrake = client;

require("./util/slurp_config_from_dom.coffee")(client);

if (shim != null) {
  if (shim.wrap != null) {
    client.wrap = shim.wrap;
  }
  if (shim.onload != null) {
    shim.onload(client);
  }
  for (_i = 0, _len = shim.length; _i < _len; _i++) {
    err = shim[_i];
    client.push(err);
  }
}


},{"./client.coffee":1,"./processors/stack.coffee":3,"./reporters/console.coffee":4,"./reporters/hybrid.coffee":5,"./util/compat.coffee":8,"./util/slurp_config_from_dom.coffee":11}],3:[function(require,module,exports){
var fileLineColumnRe, funcAliasFileLineColumnRe, funcFileLineColumnRe, funcFileLineRe, parseStack, processor, typeMessageRe;

processor = function(e, cb) {
  return cb('stack', parseStack(e));
};

funcAliasFileLineColumnRe = /^\s{4}at\s(.+)\s\[as\s(\S+)\]\s\((?:(?:(.+):(\d+):(\d+))|native)\)$/;

funcFileLineColumnRe = /^\s{4}at\s(.+)\s\((?:(?:(.+):(\d+):(\d+))|native)\)$/;

fileLineColumnRe = /^\s{4}at\s(.+):(\d+):(\d+)$/;

typeMessageRe = /^\S+:\s.+$/;

funcFileLineRe = /^(.*)@(.+):(\d+)$/;

parseStack = function(e, stack) {
  var backtrace, column, i, line, lines, m, msg, type, _i, _len;
  stack = e.stack || '';
  lines = stack.split('\n');
  backtrace = [];
  for (i = _i = 0, _len = lines.length; _i < _len; i = ++_i) {
    line = lines[i];
    if (line === '') {
      continue;
    }
    m = line.match(funcAliasFileLineColumnRe);
    if (m) {
      backtrace.push({
        "function": m[1],
        file: m[3] || '',
        line: m[4] && parseInt(m[4]) || 0,
        column: m[5] && parseInt(m[5]) || 0
      });
      continue;
    }
    m = line.match(funcFileLineColumnRe);
    if (m) {
      backtrace.push({
        "function": m[1],
        file: m[2] || '',
        line: m[3] && parseInt(m[3]) || 0,
        column: m[4] && parseInt(m[4]) || 0
      });
      continue;
    }
    m = line.match(fileLineColumnRe);
    if (m) {
      backtrace.push({
        "function": '',
        file: m[1],
        line: parseInt(m[2], 10),
        column: parseInt(m[3], 10)
      });
      continue;
    }
    m = line.match(funcFileLineRe);
    if (m) {
      if (i === 0) {
        column = e.columnNumber || 0;
      } else {
        column = 0;
      }
      backtrace.push({
        "function": m[1],
        file: m[2],
        line: parseInt(m[3], 10),
        column: column
      });
      continue;
    }
    m = line.match(typeMessageRe);
    if (m) {
      continue;
    }
    if (typeof console !== "undefined" && console !== null) {
      if (typeof console.debug === "function") {
        console.debug("airbrake: can't parse", line);
      }
    }
    backtrace.push({
      "function": '',
      file: line,
      line: 0,
      column: 0
    });
  }
  if (backtrace.length === 0 && ((e.fileName != null) || (e.lineNumber != null) || (e.columnNumber != null))) {
    backtrace.push({
      "function": '',
      file: e.fileName || '',
      line: parseInt(e.lineNumber, 10) || 0,
      column: parseInt(e.columnNumber, 10) || 0
    });
  }
  if (e.message != null) {
    msg = e.message;
  } else {
    msg = String(e);
  }
  if (e.name != null) {
    type = e.name;
    msg = type + ': ' + msg;
  } else {
    type = '';
  }
  return {
    'type': type,
    'message': msg,
    'backtrace': backtrace
  };
};

module.exports = processor;


},{}],4:[function(require,module,exports){
var formatError, report;

formatError = function(err) {
  var rec, s, _i, _len, _ref;
  s = "";
  s += "" + err.message + "\n";
  _ref = err.backtrace;
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    rec = _ref[_i];
    if (rec["function"] !== '') {
      s += " at " + rec["function"];
    }
    if (rec.file !== '') {
      s += " in " + rec.file + ":" + rec.line;
      if (rec.column !== 0) {
        s += ":" + rec.column;
      }
    }
    s += '\n';
  }
  return s;
};

report = function(notice) {
  var err, _i, _len, _ref, _results;
  _ref = notice.errors;
  _results = [];
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    err = _ref[_i];
    _results.push(typeof console !== "undefined" && console !== null ? typeof console.log === "function" ? console.log(formatError(err)) : void 0 : void 0);
  }
  return _results;
};

module.exports = report;


},{}],5:[function(require,module,exports){
if ('withCredentials' in new XMLHttpRequest()) {
  module.exports = require('./xhr.coffee');
} else {
  module.exports = require('./jsonp.coffee');
}


},{"./jsonp.coffee":6,"./xhr.coffee":7}],6:[function(require,module,exports){
var global=typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {};var cbCount, jsonifyNotice, report;

jsonifyNotice = require('../util/jsonify_notice.coffee');

cbCount = 0;

report = function(notice, opts) {
  var cbName, document, head, payload, removeScript, script, url;
  cbCount++;
  cbName = "airbrakeCb" + String(cbCount);
  global[cbName] = function(resp) {
    var _;
    if (typeof console !== "undefined" && console !== null) {
      if (typeof console.debug === "function") {
        console.debug("airbrake: error #%s was reported: %s", resp.id, resp.url);
      }
    }
    try {
      return delete global[cbName];
    } catch (_error) {
      _ = _error;
      return global[cbName] = void 0;
    }
  };
  payload = encodeURIComponent(jsonifyNotice(notice));
  url = "https://api.airbrake.io/api/v3/projects/" + opts.projectId + "/create-notice?key=" + opts.projectKey + "&callback=" + cbName + "&body=" + payload;
  document = global.document;
  head = document.getElementsByTagName('head')[0];
  script = document.createElement('script');
  script.src = url;
  removeScript = function() {
    return head.removeChild(script);
  };
  script.onload = removeScript;
  script.onerror = removeScript;
  return head.appendChild(script);
};

module.exports = report;


},{"../util/jsonify_notice.coffee":9}],7:[function(require,module,exports){
var global=typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {};var jsonifyNotice, report;

jsonifyNotice = require('../util/jsonify_notice.coffee');

report = function(notice, opts) {
  var payload, req, url;
  url = "https://api.airbrake.io/api/v3/projects/" + opts.projectId + "/notices?key=" + opts.projectKey;
  payload = jsonifyNotice(notice);
  req = new global.XMLHttpRequest();
  req.open('POST', url, true);
  req.setRequestHeader('Content-Type', 'application/json');
  req.send(payload);
  return req.onreadystatechange = function() {
    var resp;
    if (req.readyState === 4 && req.status === 201 && ((typeof console !== "undefined" && console !== null ? console.debug : void 0) != null)) {
      resp = JSON.parse(req.responseText);
      return console.debug("airbrake: error #%s was reported: %s", resp.id, resp.url);
    }
  };
};

module.exports = report;


},{"../util/jsonify_notice.coffee":9}],8:[function(require,module,exports){
if (!Array.prototype.indexOf) {
  Array.prototype.indexOf = function(obj, start) {
    var i, _i, _ref;
    start = start || 0;
    for (i = _i = start, _ref = this.length; start <= _ref ? _i < _ref : _i > _ref; i = start <= _ref ? ++_i : --_i) {
      if (this[i] === obj) {
        return i;
      }
    }
    return -1;
  };
}


},{}],9:[function(require,module,exports){
var jsonify, truncate;

truncate = function(src, n, depth) {
  var fn, nn, seen;
  if (n == null) {
    n = 1000;
  }
  if (depth == null) {
    depth = 4;
  }
  nn = 0;
  seen = [];
  fn = function(src, dd) {
    var dst, key, val;
    if (dd == null) {
      dd = 0;
    }
    if (typeof src !== 'object') {
      return src;
    }
    if (seen.indexOf(src) >= 0) {
      return '[Circular]';
    }
    seen.push(src);
    if (dd >= depth) {
      return '[Truncated]';
    }
    dst = {};
    for (key in src) {
      if (Object.prototype.hasOwnProperty.call(src, key)) {
        nn++;
        if (nn >= n) {
          break;
        }
        try {
          val = src[key];
        } catch (_error) {
          continue;
        }
        dst[key] = fn(val, dd + 1);
      }
    }
    return dst;
  };
  return fn(src);
};

jsonify = function(notice) {
  notice.params = truncate(notice.params);
  notice.environment = truncate(notice.environment);
  notice.session = truncate(notice.session);
  return JSON.stringify(notice);
};

module.exports = jsonify;


},{}],10:[function(require,module,exports){
var merge;

merge = function() {
  var dst, key, obj, objs, _i, _len;
  objs = Array.prototype.slice.call(arguments);
  dst = objs.shift() || {};
  for (_i = 0, _len = objs.length; _i < _len; _i++) {
    obj = objs[_i];
    for (key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        dst[key] = obj[key];
      }
    }
  }
  return dst;
};

module.exports = merge;


},{}],11:[function(require,module,exports){
var global=typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {};var attr;

attr = function(script, attrName) {
  return script.getAttribute("data-airbrake-" + attrName);
};

module.exports = function(client) {
  var envName, onload, projectId, projectKey, script, scripts, _i, _len, _results;
  scripts = global.document.getElementsByTagName('script');
  _results = [];
  for (_i = 0, _len = scripts.length; _i < _len; _i++) {
    script = scripts[_i];
    projectId = attr(script, 'project-id');
    projectKey = attr(script, 'project-key');
    if (projectId && projectKey) {
      client.setProject(projectId, projectKey);
    }
    envName = attr(script, 'environment-name');
    if (envName) {
      client.setEnvironmentName(envName);
    }
    onload = attr(script, 'onload');
    if (onload) {
      _results.push(global[onload](client));
    } else {
      _results.push(void 0);
    }
  }
  return _results;
};


},{}]},{},[2])