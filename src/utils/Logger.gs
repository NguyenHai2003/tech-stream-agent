/**
 * src/utils/Logger.gs
 * Utilities to standardize logging and consistent error handling.
 */

const AppLogger = {
  info: function (task, status, extra) {
    this._write("log", task, { status: status, ...safeObject(extra) });
  },

  warn: function (task, message, extra) {
    this._write("warn", task, { warning: message, ...safeObject(extra) });
  },

  error: function (task, error, extra) {
    const base = {
      error: error && error.message ? error.message : String(error),
    };

    if (error && error.stack) {
      base.stack = error.stack;
    }

    this._write("error", task, { ...base, ...safeObject(extra) });
  },

  _write: function (level, task, payload) {
    const body = JSON.stringify({
      task: task,
      ...safeObject(payload),
      timestamp: new Date().toISOString(),
    });

    // Write to standard Google Apps Script Logger for easier debugging
    Logger.log(`[${level.toUpperCase()}] ${body}`);

    // Keep Cloud Logging (console)
    if (level === "warn") {
      console.warn(body);
      return;
    }

    if (level === "error") {
      console.error(body);
      return;
    }

    console.log(body);
  },
};

function runSafely(task, fn, options) {
  const config = options || {};

  try {
    return fn();
  } catch (error) {
    AppLogger.error(task, error, config.extra);
    if (config.rethrow) throw error;
    return config.fallback;
  }
}

function safeObject(value) {
  return value && typeof value === "object" ? value : {};
}
