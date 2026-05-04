import { Injectable } from '@nestjs/common';
import { LiveMonitoringRepository } from '../repositories/live-monitoring.repository';
import type { RuntimeEventResponse } from '../entities/live-monitoring.entities';
import { CameraTriggerResult } from '../../runtime/entities/runtime.entities';

@Injectable()
export class LiveEventsService {
  constructor(private readonly repository: LiveMonitoringRepository) {}

  async getEventFeed(
    roomId: string,
    options: {
      eventType?: string;
      unitId?: string;
      result?: string;
      from?: string;
      to?: string;
      page: number;
      pageSize: number;
    },
  ) {
    const limit = Math.min(options.pageSize, 100);
    const offset = (options.page - 1) * limit;

    const parsedOptions = {
      eventType: options.eventType,
      unitId: options.unitId,
      result: options.result,
      from: options.from ? new Date(options.from) : undefined,
      to: options.to ? new Date(options.to) : undefined,
      limit,
      offset,
    };

    const { items, total } = await this.repository.getRuntimeEvents(roomId, parsedOptions);

    return {
      items: items.map((item) => ({
        eventId: item.id,
        eventType: item.eventType,
        unitId: item.unitId,
        unitName: item.unitName,
        result:
          item.result === CameraTriggerResult.SUCCESS
            ? 'SUCCESS'
            : item.result === CameraTriggerResult.FAILED
              ? 'FAILED'
              : 'SKIPPED',
        receivedAt: item.occurredAt,
        processedAt: null,
      })) as RuntimeEventResponse[],
      pagination: {
        page: options.page,
        pageSize: limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
