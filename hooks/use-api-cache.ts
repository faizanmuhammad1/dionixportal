import { useRef, useCallback } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  promise?: Promise<T>;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds (default: 30 seconds)
  staleWhileRevalidate?: boolean; // Return stale data while revalidating
}

// Global cache store
const cache = new Map<string, CacheEntry<any>>();

// In-flight requests to prevent duplicate API calls
const inFlightRequests = new Map<string, Promise<any>>();

/**
 * Custom hook for cached API fetching with request deduplication
 */
export function useApiCache() {
  const defaultTtl = 30 * 1000; // 30 seconds default

  const getCacheKey = useCallback((url: string, options?: RequestInit): string => {
    const method = options?.method || 'GET';
    const body = options?.body ? JSON.stringify(options.body) : '';
    return `${method}:${url}:${body}`;
  }, []);

  const isExpired = useCallback((entry: CacheEntry<any>, ttl: number): boolean => {
    return Date.now() - entry.timestamp > ttl;
  }, []);

  const fetchWithCache = useCallback(
    async <T = any>(
      url: string,
      options?: RequestInit & { cache?: CacheOptions }
    ): Promise<T> => {
      const cacheOptions = options?.cache || {};
      const ttl = cacheOptions.ttl ?? defaultTtl;
      const staleWhileRevalidate = cacheOptions.staleWhileRevalidate ?? true;
      
      const cacheKey = getCacheKey(url, options);
      const cached = cache.get(cacheKey);

      // Return cached data if still valid
      if (cached && !isExpired(cached, ttl)) {
        return cached.data;
      }

      // If there's an in-flight request for this URL, return that promise
      if (inFlightRequests.has(cacheKey)) {
        return inFlightRequests.get(cacheKey)!;
      }

      // Create new fetch request
      const fetchPromise = (async () => {
        try {
          // If we have stale data and revalidation is enabled, return it immediately
          if (cached && staleWhileRevalidate) {
            // Start revalidation in background
            fetch(url, { ...options, cache: undefined })
              .then(async (res) => {
                if (res.ok) {
                  const data = await res.json();
                  cache.set(cacheKey, {
                    data,
                    timestamp: Date.now(),
                  });
                }
              })
              .catch(() => {
                // Silently fail background revalidation
              });
            
            return cached.data;
          }

          // Make the actual request
          const response = await fetch(url, {
            ...options,
            cache: undefined, // Remove cache option from fetch
            headers: {
              ...options?.headers,
              'Cache-Control': 'no-cache', // Let our cache handle it
            },
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();

          // Store in cache
          cache.set(cacheKey, {
            data,
            timestamp: Date.now(),
          });

          return data;
        } finally {
          // Remove from in-flight requests
          inFlightRequests.delete(cacheKey);
        }
      })();

      // Store in-flight request
      inFlightRequests.set(cacheKey, fetchPromise);

      return fetchPromise;
    },
    [defaultTtl, getCacheKey, isExpired]
  );

  const invalidateCache = useCallback((url?: string) => {
    if (url) {
      // Invalidate specific URL pattern
      const pattern = url.includes('*') ? new RegExp(url.replace(/\*/g, '.*')) : null;
      if (pattern) {
        for (const key of cache.keys()) {
          if (pattern.test(key)) {
            cache.delete(key);
          }
        }
      } else {
        // Invalidate exact match or prefix
        for (const key of cache.keys()) {
          if (key.includes(url)) {
            cache.delete(key);
          }
        }
      }
    } else {
      // Clear all cache
      cache.clear();
    }
    // Also clear in-flight requests
    inFlightRequests.clear();
  }, []);

  const clearExpired = useCallback(() => {
    const now = Date.now();
    for (const [key, entry] of cache.entries()) {
      // Check if expired (using default TTL)
      if (now - entry.timestamp > defaultTtl * 2) {
        cache.delete(key);
      }
    }
  }, [defaultTtl]);

  return {
    fetch: fetchWithCache,
    invalidate: invalidateCache,
    clearExpired,
  };
}

/**
 * Clear expired cache entries periodically
 */
if (typeof window !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    const defaultTtl = 30 * 1000;
    for (const [key, entry] of cache.entries()) {
      if (now - entry.timestamp > defaultTtl * 2) {
        cache.delete(key);
      }
    }
  }, 60000); // Clean up every minute
}

