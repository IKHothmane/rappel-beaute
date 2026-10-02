import { Queue } from "bullmq";

export const JOB_QUEUE_NAMES = ["emails", "notifications", "reminders", "reports"] as const;

export type JobQueueName = (typeof JOB_QUEUE_NAMES)[number];

export type JobCounts = {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
};

export type JobsHealthStatus = "ok" | "degraded" | "error" | "skipped";

const EMPTY_COUNTS: JobCounts = {
  waiting: 0,
  active: 0,
  completed: 0,
  failed: 0,
  delayed: 0,
};

export function jobsStatusFromCounts(counts: JobCounts, workers: number): JobsHealthStatus {
  if (counts.failed > 0) return "degraded";
  if (counts.waiting > 0 && workers === 0) return "degraded";
  return "ok";
}

export async function readJobsHealth() {
  const checkedAt = new Date().toISOString();
  if (!process.env.REDIS_URL) {
    return {
      status: "skipped" as const,
      checkedAt,
      workers: 0,
      counts: null as JobCounts | null,
      queues: [] as { name: JobQueueName; counts: JobCounts; workers: number }[],
      message: "REDIS_URL absent",
    };
  }

  const queues = JOB_QUEUE_NAMES.map(
    (name) =>
      new Queue(name, {
        connection: {
          url: process.env.REDIS_URL,
          maxRetriesPerRequest: 1,
          connectTimeout: 3000,
          commandTimeout: 3000,
          enableOfflineQueue: false,
          retryStrategy: () => null,
        },
      }),
  );

  try {
    const details = await Promise.all(
      queues.map(async (queue) => {
        const [raw, workers] = await Promise.all([
          queue.getJobCounts("waiting", "active", "completed", "failed", "delayed"),
          queue.getWorkers().then((list) => list.length).catch(() => 0),
        ]);
        const counts: JobCounts = {
          waiting: raw.waiting ?? 0,
          active: raw.active ?? 0,
          completed: raw.completed ?? 0,
          failed: raw.failed ?? 0,
          delayed: raw.delayed ?? 0,
        };
        return { name: queue.name as JobQueueName, counts, workers };
      }),
    );
    const counts = details.reduce<JobCounts>(
      (total, queue) => ({
        waiting: total.waiting + queue.counts.waiting,
        active: total.active + queue.counts.active,
        completed: total.completed + queue.counts.completed,
        failed: total.failed + queue.counts.failed,
        delayed: total.delayed + queue.counts.delayed,
      }),
      { ...EMPTY_COUNTS },
    );
    const workers = details.reduce((total, queue) => total + queue.workers, 0);
    return {
      status: jobsStatusFromCounts(counts, workers),
      checkedAt,
      workers,
      counts,
      queues: details,
      message: null as string | null,
    };
  } catch {
    return {
      status: "error" as const,
      checkedAt,
      workers: 0,
      counts: null,
      queues: [],
      message: "Redis ou BullMQ injoignable",
    };
  } finally {
    await Promise.all(queues.map((queue) => queue.close().catch(() => undefined)));
  }
}
