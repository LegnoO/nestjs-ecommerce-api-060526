import { EventEmitter2 } from '@nestjs/event-emitter';
import { Injectable } from '@nestjs/common';
import { UserRegisteredEvent } from '@/src/modules/auth/events/user-registered.event';

export interface AppEventMap {
  'user.registered': UserRegisteredEvent;
}

@Injectable()
export class TypedEventEmitter {
  constructor(private readonly emitter: EventEmitter2) {}

  emit<K extends keyof AppEventMap>(event: K, payload: AppEventMap[K]): void {
    this.emitter.emit(event, payload);
  }
}
