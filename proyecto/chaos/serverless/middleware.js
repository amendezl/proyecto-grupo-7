import { getChaosConfig } from './ssm-config.js';

// Wrap a Lambda handler to inject latency and errors based on config.
// Usage:
//   const wrapped = withChaos(originalHandler);
//   exports.handler = wrapped;

export function withChaos(handler, opts = {}) {
  // opts: { ssmParamName?: string, envPrefix?: string }
  const ssmParam = opts.ssmParamName || process.env.CHAOS_SSM_PARAM || null;
  const envPrefix = opts.envPrefix || 'CHAOS_';

  let cachedConfig = null;

  async function resolveConfig() {
    if (cachedConfig) return cachedConfig;
    const fromEnv = {
      latency: Number(process.env[`${envPrefix}LATENCY_MS`] ?? 0),
      errorRate: Number(process.env[`${envPrefix}ERROR_RATE`] ?? 0),
      errorStatus: Number(process.env[`${envPrefix}ERROR_STATUS`] ?? 503),
      enabled: (process.env[`${envPrefix}ENABLED`] || 'false') === 'true'
    };

    if (ssmParam) {
      try {
        const ssmCfg = await getChaosConfig(ssmParam);
        cachedConfig = {
          latency: Number(ssmCfg.latency ?? fromEnv.latency ?? 0),
          errorRate: Number(ssmCfg.errorRate ?? fromEnv.errorRate ?? 0),
          errorStatus: Number(ssmCfg.errorStatus ?? fromEnv.errorStatus ?? 503),
          enabled: (typeof ssmCfg.enabled === 'boolean') ? ssmCfg.enabled : fromEnv.enabled
        };
        return cachedConfig;
      } catch (e) {
        console.warn('chaos: failed to fetch SSM param, falling back to env', e && e.message);
      }
    }

    cachedConfig = fromEnv;
    return cachedConfig;
  }

  return async function chaosWrapped(event, context, callback) {
    const cfg = await resolveConfig();

    // default: disabled
    if (!cfg.enabled) {
      return handler(event, context, callback);
    }

    // Decide error injection
    const roll = Math.random() * 100;
    if (cfg.errorRate > 0 && roll < cfg.errorRate) {
      // return injected error; if handler expects (event, context, callback), use callback
      const body = `Chaos injected error (status ${cfg.errorStatus})`;
      // If callback style
      if (typeof callback === 'function') {
        return callback(null, { statusCode: cfg.errorStatus, body });
      }
      // If Promise return (async handler)
      return { statusCode: cfg.errorStatus, body };
    }

    // latency injection
    if (cfg.latency && cfg.latency > 0) {
      await new Promise((r) => setTimeout(r, cfg.latency));
    }

    return handler(event, context, callback);
  };
}

export default withChaos;
