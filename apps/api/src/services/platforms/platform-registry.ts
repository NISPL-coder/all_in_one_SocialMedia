import { PlatformType } from '@socialhub/shared';
import { IPlatformService } from './base-platform.service';
import { LinkedInService } from './linkedin.service';
import { FacebookService } from './facebook.service';
import { InstagramService } from './instagram.service';
import { GoogleBusinessService } from './google-business.service';

export class PlatformRegistry {
  private services: Map<PlatformType, IPlatformService> = new Map();

  constructor() {
    this.register(new LinkedInService());
    this.register(new FacebookService());
    this.register(new InstagramService());
    this.register(new GoogleBusinessService());
  }

  public register(service: IPlatformService) {
    this.services.set(service.platform, service);
  }

  public getService(platform: PlatformType): IPlatformService {
    const service = this.services.get(platform);
    if (!service) {
      throw new Error(`Unsupported platform: ${platform}`);
    }
    return service;
  }
}

export const platformRegistry = new PlatformRegistry();
