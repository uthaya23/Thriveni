/**
 * Centralized Logging Utility
 * Provides consistent logging across the application
 */

class Logger {
  static info(message, meta = {}) {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, Object.keys(meta).length ? meta : '');
  }

  static warn(message, meta = {}) {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, Object.keys(meta).length ? meta : '');
  }

  static error(message, error = null, meta = {}) {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error?.stack || error, Object.keys(meta).length ? meta : '');
  }

  static debug(message, meta = {}) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, Object.keys(meta).length ? meta : '');
    }
  }
}

module.exports = Logger;