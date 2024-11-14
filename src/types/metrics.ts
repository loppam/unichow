export interface SystemMetrics {
  cpu: number;
  memory: number;
  network: number;
  instances: Instance[];
}

export interface Instance {
  id: string;
  region: string;
  status: 'healthy' | 'unhealthy';
  load: number;
} 