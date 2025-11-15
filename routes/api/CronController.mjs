import express from 'express';
import cronService from '#root/services/Cron.mjs';
import logger from '#root/services/Logger.mjs';
import { hasToken } from '#root/services/Policy.mjs';

const router = express.Router();

router.post('/cron/:jobName', hasToken, runJobByName);
router.get('/cron', hasToken, getJobs);

async function runJobByName(req, res) {
  const { jobName } = req.params;

  try {
    const job = cronService.getJobs().find(({ name }) => name === jobName);
    if (!job)
      return res.status(404).json({ message: `Job ${jobName} not found` });
    logger.info(
      `Manually triggering cron job: ${jobName} with query: ${JSON.stringify(
        req.query
      )}`
    );
    const result = await job._callbacks[0](req.query);
    res.json(result);
  } catch (error) {
    res
      .status(500)
      .json({ message: `Failed to run job ${jobName}: ${error.message}` });
  }
}

async function getJobs(res) {
  try {
    const jobs = cronService.getJobs().map((job) => ({
      name: job.name,
      time: job.cronTime.source,
      enabled: job.running,
    }));
    res.json({ jobs });
  } catch (_error) {
    res.status(500).json({ message: 'Failed to retrieve active cron jobs' });
  }
}

export default router;
