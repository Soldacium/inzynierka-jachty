import type { DataSource } from 'typeorm';
import type { Server as SocketServer } from 'socket.io';
import { AuthService } from './modules/auth/auth.service.js';
import { TokenService } from './modules/auth/token.service.js';
import type { MailService } from './services/mail.service.js';
import { SmtpMailService } from './services/mail.service.js';
import { TrafficSimulationService } from './modules/traffic/traffic-simulation.service.js';
import { HistoricalAisService } from './modules/traffic/historical-ais.service.js';

export interface RealtimePublisher {
  emitToRoom(room: string, event: string, data: unknown): void;
}

export class AppContext {
  readonly tokenService = new TokenService();
  readonly authService: AuthService;
  readonly trafficSimulation: TrafficSimulationService;
  readonly historicalAis = new HistoricalAisService();
  io?: SocketServer;

  constructor(
    readonly dataSource: DataSource,
    mailService: MailService = new SmtpMailService(),
  ) {
    this.authService = new AuthService(dataSource, this.tokenService, mailService);
    this.trafficSimulation = new TrafficSimulationService((event, data) => {
      this.emitToRoom('traffic:global', event, data);
    });
  }

  emitToRoom(room: string, event: string, data: unknown): void {
    this.io?.to(room).emit(event, { eventId: crypto.randomUUID(), occurredAt: new Date().toISOString(), data });
  }
}
