import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabase';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  speed: number | null;
  batteryLevel: number | null;
}

interface UseGPSTrackingOptions {
  enabled: boolean;
  intervalMs?: number;
  userId: string;
  note?: string;
  tripId?: number | null;
}

interface UseGPSTrackingResult {
  isTracking: boolean;
  permissionState: 'prompt' | 'granted' | 'denied' | 'unavailable';
  lastLocation: LocationData | null;
  error: string | null;
}

const UPDATE_INTERVAL_DEFAULT = 30000;

async function getBatteryLevel(): Promise<number | null> {
  try {
    const nav = navigator as any;
    if ('getBattery' in nav) {
      const battery = await nav.getBattery();
      return Math.round(battery.level * 100);
    }
  } catch {
    // Battery API not available
  }
  return null;
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export { haversineDistance };

export function useGPSTracking({
  enabled,
  intervalMs = UPDATE_INTERVAL_DEFAULT,
  userId,
  note,
  tripId,
}: UseGPSTrackingOptions): UseGPSTrackingResult {
  const [isTracking, setIsTracking] = useState(false);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'unavailable'>('prompt');
  const [lastLocation, setLastLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSentRef = useRef<number>(0);
  const noteRef = useRef<string | undefined>(note);
  const tripIdRef = useRef<number | null | undefined>(tripId);

  useEffect(() => {
    noteRef.current = note;
  }, [note]);

  useEffect(() => {
    tripIdRef.current = tripId;
  }, [tripId]);

  // Push note changes to the most recent location record immediately
  useEffect(() => {
    if (!enabled || !userId || !note) return;
    const timeout = setTimeout(async () => {
      try {
        const { data: latest } = await supabase
          .from('employee_locations')
          .select('id')
          .eq('user_id', userId)
          .order('timestamp', { ascending: false })
          .limit(1)
          .single();
        if (latest) {
          const { error } = await supabase
            .from('employee_locations')
            .update({ note })
            .eq('id', latest.id);
          if (error) console.error('[GPS] Note update failed:', error.message);
        }
      } catch (err) {
        console.error('[GPS] Note update exception:', err);
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [note, enabled, userId]);

  const uploadLocation = useCallback(async (loc: LocationData, currentNote?: string) => {
    const record: Record<string, any> = {
      user_id: userId,
      latitude: loc.latitude,
      longitude: loc.longitude,
      accuracy: loc.accuracy,
      speed: loc.speed,
      battery_level: loc.batteryLevel,
      timestamp: new Date(loc.timestamp).toISOString(),
      note: currentNote || null,
    };
    if (tripIdRef.current) {
      record.trip_id = tripIdRef.current;
    }
    const { data, error } = await supabase.from('employee_locations').insert(record);
    if (error) {
      console.error('[GPS] Location insert failed:', error.message, error.details, error.hint);
      setError(`Location upload failed: ${error.message}`);
    } else {
      setError(null);
    }
  }, [userId]);

  const handlePosition = useCallback(async (position: GeolocationPosition) => {
    const now = Date.now();
    if (now - lastSentRef.current < intervalMs) return;

    const batteryLevel = await getBatteryLevel();
    const loc: LocationData = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: position.timestamp,
      speed: position.coords.speed,
      batteryLevel,
    };

    setLastLocation(loc);
    lastSentRef.current = now;
    await uploadLocation(loc, noteRef.current);
  }, [intervalMs, uploadLocation]);

  const handleError = useCallback((err: GeolocationPositionError) => {
    switch (err.code) {
      case err.PERMISSION_DENIED:
        setPermissionState('denied');
        setError('Location permission denied. Please enable location access in your browser settings.');
        break;
      case err.POSITION_UNAVAILABLE:
        setError('Location information is unavailable.');
        break;
      case err.TIMEOUT:
        setError('Location request timed out.');
        break;
      default:
        setError('An unknown location error occurred.');
    }
  }, []);

  useEffect(() => {
    if (!enabled || !userId) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsTracking(false);
      return;
    }

    if (!navigator.geolocation) {
      setPermissionState('unavailable');
      setError('Geolocation is not supported by this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      () => {
        setPermissionState('granted');
        setError(null);
      },
      (err) => handleError(err),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
    );

    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      handleError,
      {
        enableHighAccuracy: false,
        timeout: 30000,
        maximumAge: intervalMs,
      }
    );

    setIsTracking(true);

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, userId, handlePosition, handleError, intervalMs]);

  return { isTracking, permissionState, lastLocation, error };
}
