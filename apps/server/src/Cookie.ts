import { Response } from 'express';
import { DOMAIN_NAME, IS_OFFLINE } from './environment';

export default class Cookie {
  name: string;

  data: any;

  ttlMs: number;

  constructor(name: string, data: any, ttlMs: number) {
    this.name = name;
    this.data = data;
    this.ttlMs = ttlMs;
  }

  addTo(res: Response) {
    res.cookie(this.name, JSON.stringify(this.data), {
      httpOnly: true,
      expires: new Date(Date.now() + this.ttlMs),
      secure: Boolean(!IS_OFFLINE),
      sameSite: 'lax',
      domain: IS_OFFLINE ? undefined : DOMAIN_NAME,
      signed: true,
    });
  }
}
