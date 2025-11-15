import express from 'express';
import _ from 'lodash';
import config from '#root/config/config.mjs';
import logger from '#root/services/Logger.mjs';
import { isLoggedIn } from '#root/services/Policy.mjs';

const router = express.Router();

function buildArgArray(argsSpec, body) {
  //  ['a','b'] or [{'a', 1}, ...] where a is the name of the param and 1 is the default value
  if (!argsSpec?.length) return [];
  return argsSpec.map((spec) => {
    const name = _.isString(spec) ? spec : spec.name;
    if (Object.hasOwn(body || {}, name)) return body[name];
    if (_.isObject(spec) && 'default' in spec) return spec.default;
    throw new Error(`Missing param: ${name}`);
  });
}

router.post('/adm/scripts/:name', isLoggedIn, async (req, res) => {
  const { name } = req.params;
  const scriptCfg = config.scripts?.[name];
  if (!scriptCfg)
    return res.status(404).json({ message: `Script ${name} not found` });
  try {
    const mod = await import(scriptCfg.module);
    const exported =
      scriptCfg.export === 'default' ? mod?.default : mod?.[scriptCfg.export];
    const fn = scriptCfg.method ? exported?.[scriptCfg.method] : exported;
    if (!_.isFunction(fn))
      return res.status(500).json({
        message: `Export ${scriptCfg.export}${scriptCfg.method ? '.' + scriptCfg.method : ''} is not a function of ${scriptCfg.module}`,
      });
    const body = req.body;
    const args = buildArgArray(scriptCfg.args, body);
    logger.info(`Run script ${name} args=${JSON.stringify(args)}`);
    const result = await fn(...args);
    return res.status(200).json(result);
  } catch (err) {
    logger.error(`Script error ${name}: ${err?.message}`, { err });
    const msg = err?.message || 'Unknown error';
    const code = /Missing param/.test(msg) ? 400 : 500;
    return res.status(code).json({ message: msg });
  }
});
export default router;
