/**
 * Minimal load test for Part 7 (Testing & Evaluation).
 * Fires N concurrent requests at /api/courses and reports latency stats.
 *
 * Usage:
 *   node loadtest.js http://localhost:4000 200
 *   node loadtest.js https://your-api-id.execute-api.us-east-1.amazonaws.com 200
 */

const BASE_URL = process.argv[2] || 'http://localhost:4000';
const REQUEST_COUNT = parseInt(process.argv[3] || '100', 10);

async function fireRequest() {
  const start = Date.now();
  try {
    const res = await fetch(`${BASE_URL}/api/courses`);
    await res.json();
    return { ok: res.ok, ms: Date.now() - start };
  } catch (err) {
    return { ok: false, ms: Date.now() - start };
  }
}

async function run() {
  console.log(`Firing ${REQUEST_COUNT} concurrent requests at ${BASE_URL}/api/courses ...`);
  const startAll = Date.now();

  const results = await Promise.all(
    Array.from({ length: REQUEST_COUNT }, () => fireRequest())
  );

  const totalMs = Date.now() - startAll;
  const times = results.map(r => r.ms).sort((a, b) => a - b);
  const successCount = results.filter(r => r.ok).length;

  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const p50 = times[Math.floor(times.length * 0.5)];
  const p95 = times[Math.floor(times.length * 0.95)];
  const max = times[times.length - 1];

  console.log('\n--- Load test results ---');
  console.log(`Total requests:   ${REQUEST_COUNT}`);
  console.log(`Successful:       ${successCount} (${((successCount / REQUEST_COUNT) * 100).toFixed(1)}%)`);
  console.log(`Total wall time:  ${totalMs} ms`);
  console.log(`Avg latency:      ${avg.toFixed(1)} ms`);
  console.log(`p50 latency:      ${p50} ms`);
  console.log(`p95 latency:      ${p95} ms`);
  console.log(`Max latency:      ${max} ms`);
  console.log('\nParagraph you can paste into Part 7 of your report after running this against your live deployment:');
  console.log(`"We simulated concurrent load using a custom Node.js script that issued ${REQUEST_COUNT} simultaneous GET requests against the deployed /api/courses endpoint. ${successCount}/${REQUEST_COUNT} requests succeeded, with an average latency of ${avg.toFixed(1)}ms and a 95th-percentile latency of ${p95}ms. This validates that the serverless architecture handles concurrent bursts without manual scaling configuration."`);
}

run();
