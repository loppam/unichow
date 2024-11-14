import { db } from '../firebase/config';
import type { SystemMetrics, Instance } from '../types/metrics';
import { cacheService } from './cacheService';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, orderBy, limit } from 'firebase/firestore';

const SCALE_UP_THRESHOLD = 80; // CPU/Memory threshold for scaling up
const SCALE_DOWN_THRESHOLD = 20; // CPU/Memory threshold for scaling down
const MAX_INSTANCES = 10;
const MIN_INSTANCES = 2;

export const loadBalancerService = {
  async distributeLoad() {
    const servers = await this.getAvailableServers();
    const currentLoad = await this.getCurrentLoad();
    
    return this.calculateOptimalDistribution(servers, currentLoad);
  },

  async scaleResources(metrics: SystemMetrics) {
    if (metrics.cpu > SCALE_UP_THRESHOLD || metrics.memory > SCALE_UP_THRESHOLD) {
      await this.scaleUp();
    } else if (metrics.cpu < SCALE_DOWN_THRESHOLD && metrics.memory < SCALE_DOWN_THRESHOLD) {
      await this.scaleDown();
    }
  },

  async getCurrentMetrics(): Promise<SystemMetrics> {
    // Try to get from cache first
    const cached = await cacheService.get<SystemMetrics>('system_metrics');
    if (cached) return cached;

    // Get metrics from database
    const metricsRef = collection(db, 'system_metrics');
    const snapshot = await getDocs(query(metricsRef, orderBy('timestamp', 'desc'), limit(1)));
    const metrics = snapshot.docs[0]?.data() as SystemMetrics || {
      cpu: 0,
      memory: 0,
      network: 0,
      instances: []
    };

    // Cache the result
    cacheService.set('system_metrics', metrics);
    return metrics;
  },

  async getAvailableServers(): Promise<Instance[]> {
    const serversRef = collection(db, 'servers');
    const q = query(serversRef, where('status', '==', 'healthy'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      region: doc.data().region,
      status: doc.data().status,
      load: doc.data().load
    }));
  },

  async getCurrentLoad(): Promise<Record<string, number>> {
    const servers = await this.getAvailableServers();
    return servers.reduce((acc, server) => ({
      ...acc,
      [server.id]: server.load
    }), {});
  },

  calculateOptimalDistribution(servers: Instance[], load: Record<string, number>) {
    // Sort servers by current load
    const sortedServers = [...servers].sort((a, b) => a.load - b.load);
    
    // Distribute load evenly among available servers
    const distribution: Record<string, number> = {};
    let currentIndex = 0;
    
    Object.entries(load).forEach(([_, value]) => {
      distribution[sortedServers[currentIndex].id] = value;
      currentIndex = (currentIndex + 1) % sortedServers.length;
    });
    
    return distribution;
  },

  async scaleUp() {
    const currentInstances = await this.getAvailableServers();
    if (currentInstances.length >= MAX_INSTANCES) return;

    const serversRef = collection(db, 'servers');
    await addDoc(serversRef, {
      region: this.selectOptimalRegion(currentInstances),
      status: 'initializing',
      load: 0,
      createdAt: new Date().toISOString()
    });
  },

  async scaleDown() {
    const currentInstances = await this.getAvailableServers();
    if (currentInstances.length <= MIN_INSTANCES) return;

    // Find the server with the lowest load
    const serverToRemove = currentInstances
      .sort((a, b) => a.load - b.load)[0];

    await deleteDoc(doc(db, 'servers', serverToRemove.id));
  },

  selectOptimalRegion(currentInstances: Instance[]): string {
    const regions = ['us-east', 'us-west', 'eu-west', 'asia-east'];
    const regionCounts = currentInstances.reduce((acc, instance) => ({
      ...acc,
      [instance.region]: (acc[instance.region] || 0) + 1
    }), {} as Record<string, number>);

    // Select the region with the least instances
    return regions.reduce((optimal, region) => 
      (regionCounts[region] || 0) < (regionCounts[optimal] || 0) ? region : optimal
    );
  }
}; 