import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api.service';
import { useAuthStore } from '../stores/authStore';

interface Metrics {
    activeConnections: number;
    httpRequests: number;
    wsMessages: number;
    lastSnapshotDuration: number;
    system: {
        memoryUsage: {
            rss: number;
            heapTotal: number;
            heapUsed: number;
            external: number;
        };
        cpuLoad: number[];
        uptime: number;
    };
}

const Dashboard: React.FC = () => {
    const [metrics, setMetrics] = useState<Metrics | null>(null);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);

    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                const response = await api.get('/metrics');
                setMetrics(response.data);
                setError(null);
            } catch (err) {
                console.error('Failed to fetch metrics', err);
                setError('Failed to load metrics');
            }
        };

        fetchMetrics();
        const interval = setInterval(fetchMetrics, 2000);

        return () => clearInterval(interval);
    }, []);

    const formatBytes = (bytes: number) => {
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        if (bytes === 0) return '0 Byte';
        const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)).toString());
        return Math.round(bytes / Math.pow(1024, i)) + ' ' + sizes[i];
    };

    const formatUptime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        return `${h}h ${m}m ${s}s`;
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-indigo-400">System Dashboard</h1>
                    <button
                        onClick={() => navigate('/')}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                    >
                        Back to Documents
                    </button>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-lg mb-8">
                        {error}
                    </div>
                )}

                {metrics ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Real-time Stats */}
                        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                            <h2 className="text-xl font-semibold mb-4 text-gray-300">Real-time Activity</h2>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400">Active Connections</span>
                                    <span className="text-2xl font-bold text-green-400">{metrics.activeConnections}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400">HTTP Requests</span>
                                    <span className="text-2xl font-bold text-blue-400">{metrics.httpRequests}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400">WS Messages</span>
                                    <span className="text-2xl font-bold text-purple-400">{metrics.wsMessages}</span>
                                </div>
                            </div>
                        </div>

                        {/* System Resources */}
                        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                            <h2 className="text-xl font-semibold mb-4 text-gray-300">System Resources</h2>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400">Memory (RSS)</span>
                                    <span className="text-lg font-mono text-yellow-400">
                                        {formatBytes(metrics.system.memoryUsage.rss)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400">Heap Used</span>
                                    <span className="text-lg font-mono text-yellow-400">
                                        {formatBytes(metrics.system.memoryUsage.heapUsed)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400">CPU Load (1m)</span>
                                    <span className="text-lg font-mono text-red-400">
                                        {metrics.system.cpuLoad[0].toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Performance */}
                        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                            <h2 className="text-xl font-semibold mb-4 text-gray-300">Performance</h2>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400">Uptime</span>
                                    <span className="text-lg font-mono text-teal-400">
                                        {formatUptime(metrics.system.uptime)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400">Last Snapshot</span>
                                    <span className="text-lg font-mono text-orange-400">
                                        {metrics.lastSnapshotDuration}ms
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center text-gray-400 py-12">Loading metrics...</div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
