import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import type { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class TokenService {
  constructor(private readonly jwtService: JwtService) {}

  async sign(payload: JwtPayload): Promise<string> {
    return this.jwtService.signAsync(payload);
  }

  getExpiresAt(secondsFromNow: number, now: Date = new Date()): string {
    return new Date(now.getTime() + secondsFromNow * 1000).toISOString();
  }
}
