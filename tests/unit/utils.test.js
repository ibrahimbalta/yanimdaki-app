import { describe, it, expect } from 'vitest';
const utils = require('../../utils.js');

describe('utils.js unit tests', () => {
    describe('calculateDistance', () => {
        it('should calculate distance correctly between two points', () => {
            // İstanbul - Ankara approx distance
            const istanbul = { lat: 41.0082, lon: 28.9784 };
            const ankara = { lat: 39.9334, lon: 32.8597 };
            const distance = utils.calculateDistance(istanbul.lat, istanbul.lon, ankara.lat, ankara.lon);

            expect(distance).toBeGreaterThan(340);
            expect(distance).toBeLessThan(460);
        });

        it('should return 0 if any coordinate is missing', () => {
            expect(utils.calculateDistance(null, 28.9784, 39.9334, 32.8597)).toBe(0);
        });
    });

    describe('formatDistance', () => {
        it('should format meters correctly', () => {
            expect(utils.formatDistance(0.5)).toBe('500 m');
        });

        it('should format kilometers correctly', () => {
            expect(utils.formatDistance(5.2)).toBe('5.2 km');
        });
    });

    describe('formatPrice', () => {
        it('should format price with Turkish locale', () => {
            expect(utils.formatPrice(1250)).toBe('1.250');
            expect(utils.formatPrice(1000000)).toBe('1.000.000');
        });

        it('should return "0" for invalid inputs', () => {
            expect(utils.formatPrice(null)).toBe('0');
            expect(utils.formatPrice(undefined)).toBe('0');
            expect(utils.formatPrice('abc')).toBe('0');
        });
    });

    describe('normalizePhone', () => {
        it('should return last 10 digits', () => {
            expect(utils.normalizePhone('05321234567')).toBe('5321234567');
            expect(utils.normalizePhone('532 123 45 67')).toBe('5321234567');
        });
    });
});
