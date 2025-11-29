import os from 'os';

interface Metrics {
    activeConnections: number;
    httpRequests: number;
    wsMessages: number;
    lastSnapshotDuration: number;
    system: {
        memoryUsage: NodeJS.MemoryUsage;
        cpuLoad: number[];
        uptime: number;
    };
}

class MetricsService {
    private metrics: Metrics = {
        activeConnections: 0,
        httpRequests: 0,
        wsMessages: 0,
        lastSnapshotDuration: 0,
        system: {
            memoryUsage: process.memoryUsage(),
            cpuLoad: os.loadavg(),
            uptime: process.uptime()
        }
    };

    incrementConnections() {
        this.metrics.activeConnections++;
    }

    decrementConnections() {
        this.metrics.activeConnections = Math.max(0, this.metrics.activeConnections - 1);
    }

    incrementHttpRequests() {
        this.metrics.httpRequests++;
    }

    incrementWsMessages() {
        this.metrics.wsMessages++;
    }

    setLastSnapshotDuration(duration: number) {
        this.metrics.lastSnapshotDuration = duration;
    }

    getMetrics(): Metrics {
        return {
            ...this.metrics,
            system: {
                memoryUsage: process.memoryUsage(),
                cpuLoad: os.loadavg(),
                uptime: process.uptime()
            }
        };
    }
}

export const metricsService = new MetricsService();
