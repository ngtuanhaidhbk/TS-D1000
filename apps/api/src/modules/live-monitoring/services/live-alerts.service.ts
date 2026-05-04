import { Injectable, NotFoundException } from '@nestjs/common';
import { LiveMonitoringRepository } from '../repositories/live-monitoring.repository';
import type { RuntimeAlert, AlertsResponse } from '../entities/live-monitoring.entities';

@Injectable()
export class LiveAlertsService {
  constructor(private readonly repository: LiveMonitoringRepository) {}

  async getAlerts(roomId: string, status: string = 'ACTIVE', page: number = 1, pageSize: number = 20): Promise<AlertsResponse> {
    const limit = Math.min(pageSize, 100);
    const offset = (page - 1) * limit;

    const alerts = this.repository.getActiveAlerts(roomId);

    const filtered = alerts.filter((a) => !status || a.status === status);
    const paginatedAlerts = filtered.slice(offset, offset + limit);

    return {
      alerts: paginatedAlerts.map((alert) => ({
        id: alert.id,
        severity: alert.severity,
        source: alert.source,
        message: alert.message,
        status: alert.status,
        acknowledgedBy: alert.acknowledgedBy,
        acknowledgedAt: alert.acknowledgedAt,
        createdAt: alert.createdAt,
      })),
      total: filtered.length,
    };
  }

  async acknowledgeAlert(alertId: string, userId: string): Promise<RuntimeAlert> {
    const alert = this.repository.getAlertById(alertId);

    if (!alert) {
      throw new NotFoundException(`Alert not found: ${alertId}`);
    }

    const updated = this.repository.acknowledgeAlert(alertId, userId);

    return {
      id: updated.id,
      severity: updated.severity,
      source: updated.source,
      message: updated.message,
      status: updated.status,
      acknowledgedBy: updated.acknowledgedBy || undefined,
      acknowledgedAt: updated.acknowledgedAt,
      createdAt: updated.createdAt,
    };
  }
}
