import { CronJob } from 'cron';
import logger from './Logger.mjs';

export default {
  jobs: [],

  async init() {
    try {
      const results = [];
      const { default: crons } = await import('#root/config/cron.mjs');
      crons
        .filter((cron) => cron.enabled)
        .forEach(({ name, time, jobs }) => {
          this.createJob(name, time, async () => {
            logger.info(`Cron: ${name} running at ${new Date().toISOString()}`);
            for (const { fn, params = [] } of jobs)
              results.push(await fn(...params));
            logger.info(
              `Cron: ${name} finished at ${new Date().toISOString()}`
            );
            return results;
          });
        });
      logger.info(
        `Initialized cron jobs: ${this.jobs.map((job) => job.name).join(', ')}`
      );
      return results;
    } catch (error) {
      logger.warn(`Error initializing cron jobs: ${error}`);
      throw {
        success: false,
        message: error.message,
      };
    }
  },

  getJobs() {
    return this.jobs;
  },

  deleteJobs() {
    this.jobs.forEach((job) => job.stop());
    this.jobs.length = 0;
  },

  createJob(name, time, onTick) {
    const job = new CronJob(time, onTick, null, true, 'Europe/Rome');
    job.name = name;
    this.jobs.push(job);
  },
};
