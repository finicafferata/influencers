import { serverTrpc } from '@/lib/trpc/server';

export default async function HealthPage() {
  let status = 'unknown';
  try {
    const result = await serverTrpc.health.check.query();
    status = result.status;
  } catch {
    status = 'error — API not running';
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Health Check</h1>
      <p>API status: <strong>{status}</strong></p>
    </div>
  );
}
