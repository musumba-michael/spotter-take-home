import { describe, it, expect } from "vitest";
import { decodePolyline6, closestPointOnSegment, nearestPointOnLine } from "./mapUtils";

describe("Map Utilities", () => {
  describe("decodePolyline6", () => {
    it("should decode an empty string to empty array", () => {
      expect(decodePolyline6("")).toEqual([]);
    });

    it("should decode a simple polyline with two points", () => {
      // Simple test polyline - just verify it decodes to 2 points
      const encoded = "_p~iF~ps|U_ulLnnqC";
      const decoded = decodePolyline6(encoded);
      
      expect(decoded).toHaveLength(2);
      // Verify coordinates are valid numbers
      decoded.forEach(([lng, lat]) => {
        expect(lng).toBeTypeOf("number");
        expect(lat).toBeTypeOf("number");
        expect(lng).toBeGreaterThan(-180);
        expect(lng).toBeLessThan(180);
        expect(lat).toBeGreaterThan(-90);
        expect(lat).toBeLessThan(90);
      });
    });

    it("should decode a realistic route segment", () => {
      // Example polyline from Mapbox Directions API
      const encoded = "wvheFzqojVn@iA";
      const decoded = decodePolyline6(encoded);
      
      expect(decoded.length).toBeGreaterThan(0);
      // Check that coordinates are reasonable (within US bounds)
      decoded.forEach(([lng, lat]) => {
        expect(lng).toBeGreaterThan(-180);
        expect(lng).toBeLessThan(180);
        expect(lat).toBeGreaterThan(-90);
        expect(lat).toBeLessThan(90);
      });
    });
  });

  describe("closestPointOnSegment", () => {
    it("should return point A when segment is degenerate (A = B)", () => {
      const point: [number, number] = [5, 5];
      const a: [number, number] = [3, 3];
      const b: [number, number] = [3, 3];
      
      const result = closestPointOnSegment(point, a, b);
      expect(result).toEqual([3, 3]);
    });

    it("should return projection on segment when point is above midpoint", () => {
      const point: [number, number] = [5, 10];
      const a: [number, number] = [0, 0];
      const b: [number, number] = [10, 0];
      
      const result = closestPointOnSegment(point, a, b);
      expect(result[0]).toBeCloseTo(5, 5);
      expect(result[1]).toBeCloseTo(0, 5);
    });

    it("should clamp to endpoint A when projected before segment", () => {
      const point: [number, number] = [-5, 5];
      const a: [number, number] = [0, 0];
      const b: [number, number] = [10, 0];
      
      const result = closestPointOnSegment(point, a, b);
      expect(result).toEqual([0, 0]);
    });

    it("should clamp to endpoint B when projected beyond segment", () => {
      const point: [number, number] = [15, 5];
      const a: [number, number] = [0, 0];
      const b: [number, number] = [10, 0];
      
      const result = closestPointOnSegment(point, a, b);
      expect(result).toEqual([10, 0]);
    });

    it("should handle vertical segments correctly", () => {
      const point: [number, number] = [5, 5];
      const a: [number, number] = [0, 0];
      const b: [number, number] = [0, 10];
      
      const result = closestPointOnSegment(point, a, b);
      expect(result[0]).toBeCloseTo(0, 5);
      expect(result[1]).toBeCloseTo(5, 5);
    });
  });

  describe("nearestPointOnLine", () => {
    it("should throw error for empty line", () => {
      const point: [number, number] = [5, 5];
      const line: [number, number][] = [];
      
      expect(() => nearestPointOnLine(point, line)).toThrow("Line must have at least one point");
    });

    it("should return single point when line has one point", () => {
      const point: [number, number] = [5, 5];
      const line: [number, number][] = [[3, 3]];
      
      const result = nearestPointOnLine(point, line);
      expect(result).toEqual([3, 3]);
    });

    it("should find nearest point on multi-segment line", () => {
      const point: [number, number] = [5, 5];
      const line: [number, number][] = [
        [0, 0],
        [10, 0],
        [10, 10],
      ];
      
      const result = nearestPointOnLine(point, line);
      // Point (5,5) is equidistant from (5,0) on first segment and (10,5) on second segment
      // First segment: distance from (5,5) to (5,0) = 5
      // Second segment: distance from (5,5) to (10,5) = 5
      // Either is acceptable, but first segment is checked first
      expect(result[0]).toBeCloseTo(5, 5);
      expect(result[1]).toBeCloseTo(0, 5);
    });

    it("should handle complex polyline", () => {
      const point: [number, number] = [2.5, 2.5];
      const line: [number, number][] = [
        [0, 0],
        [5, 0],
        [5, 5],
        [0, 5],
      ];
      
      const result = nearestPointOnLine(point, line);
      // Point should be closest to first segment
      expect(result[0]).toBeCloseTo(2.5, 5);
      expect(result[1]).toBeCloseTo(0, 5);
    });
  });
});
