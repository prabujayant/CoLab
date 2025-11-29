import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';

export const MetricsDashboard = () => {
    const [metrics, setMetrics] = useState<any>(null);
    const token = useAuthStore((state) => state.token);

    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                const response = await fetch('http://localhost:3000/api/metrics', {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                const data = await response.json();
                setMetrics(data);
            } catch (error) {
                console.error('Error fetching metrics:', error);
            }
        };

        fetchMetrics();
        const interval = setInterval(fetchMetrics, 5000);
        return () => clearInterval(interval);
    }, [token]);

    if (!metrics) return <div className="p-8">Loading metrics...</div>;

    // Helper to get value from prom-client json format
    const getValue = (name: string) => {
        const metric = metrics.find((m: any) => m.name === name);
        return metric ? metric.values[0].value : 'N/A';
    };

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-8 text-gray-800">System Metrics</h1>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Custom Metrics */}
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-semibold mb-4 text-blue-600">Application Stats</h2>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center border-b pb-2">
                                <span className="text-gray-600">Active Connections</span>
                                <span className="text-2xl font-bold">{getValue('active_connections')}</span>
                            </div>
                            <div className="flex justify-between items-center border-b pb-2">
                                <span className="text-gray-600">Document Updates</span>
                                <span className="text-2xl font-bold">{getValue('document_updates_total')}</span>
                            </div>
                        </div>
                    </div>

                    {/* System Metrics */}
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-semibold mb-4 text-green-600">System Resources</h2>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center border-b pb-2">
                                <span className="text-gray-600">Memory Usage (Heap)</span>
                                <span className="text-2xl font-bold">
                                    {(getValue('nodejs_heap_size_used_bytes') / 1024 / 1024).toFixed(2)} MB
                                </span>
                            </div>
                            <div className="flex justify-between items-center border-b pb-2">
                                <span className="text-gray-600">CPU Usage (User)</span>
                                <span className="text-2xl font-bold">
                                    {getValue('process_cpu_user_seconds_total').toFixed(2)}s
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold mb-4 text-gray-700">Raw Data</h2>
                    <pre className="bg-gray-50 p-4 rounded overflow-auto max-h-96 text-xs">
                        {JSON.stringify(metrics, null, 2)}
                    </pre>
                </div>
            </div>
        </div>
    );
};
