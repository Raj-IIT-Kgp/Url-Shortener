import { Injectable, Logger } from '@nestjs/common';

interface GeoData {
    country: string | null;
    city: string | null;
}

@Injectable()
export class GeoService {
    private readonly logger = new Logger(GeoService.name);

    async lookup(ip: string): Promise<GeoData> {
        // Skip lookup for loopback / private IPs
        if (!ip || ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
            return { country: null, city: null };
        }

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 2000); // 2s timeout

            const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,city`, {
                signal: controller.signal,
            });
            clearTimeout(timeout);

            if (!res.ok) return { country: null, city: null };

            const data = await res.json();
            if (data.status !== 'success') return { country: null, city: null };

            return {
                country: data.country ?? null,
                city: data.city ?? null,
            };
        } catch {
            this.logger.warn(`Geo lookup failed for IP ${ip}`);
            return { country: null, city: null };
        }
    }
}
