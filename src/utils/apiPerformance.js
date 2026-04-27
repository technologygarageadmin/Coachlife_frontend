/**
 * API Performance Monitoring Utility
 * Tracks and logs API call timing to identify performance bottlenecks
 */

const DEBUG = import.meta.env.MODE === 'development';

const apiMetrics = {
  calls: [],
  
  // Track an API call
  trackCall: (endpoint, duration, success = true, error = null) => {
    const metric = {
      endpoint,
      duration,
      success,
      error,
      timestamp: new Date().toISOString()
    };
    
    apiMetrics.calls.push(metric);
    
    // Keep only last 100 calls
    if (apiMetrics.calls.length > 100) {
      apiMetrics.calls.shift();
    }
    
    // Log slow API calls (> 1 second)
    if (DEBUG && duration > 1000) {
      console.warn(`SLOW API CALL: ${endpoint} took ${duration}ms`);
    }
    
    return metric;
  },
  
  // Get average response time for an endpoint
  getAverageTime: (endpoint) => {
    const calls = apiMetrics.calls.filter(c => c.endpoint === endpoint && c.success);
    if (calls.length === 0) return 0;
    
    const total = calls.reduce((sum, c) => sum + c.duration, 0);
    return total / calls.length;
  },
  
  // Get all metrics summary
  getSummary: () => {
    const endpoints = {};
    
    apiMetrics.calls.forEach(call => {
      if (!endpoints[call.endpoint]) {
        endpoints[call.endpoint] = {
          count: 0,
          totalTime: 0,
          errors: 0,
          avgTime: 0
        };
      }
      
      endpoints[call.endpoint].count++;
      endpoints[call.endpoint].totalTime += call.duration;
      if (!call.success) endpoints[call.endpoint].errors++;
      endpoints[call.endpoint].avgTime = endpoints[call.endpoint].totalTime / endpoints[call.endpoint].count;
    });
    
    return endpoints;
  },
  
  // Log metrics to console
  logSummary: () => {
    if (!DEBUG) return;
    
    const summary = apiMetrics.getSummary();
    console.table(summary);
  },
  
  // Clear all metrics
  clear: () => {
    apiMetrics.calls = [];
  }
};

// Create a wrapper for fetch calls
export const trackedFetch = async (url, options = {}) => {
  const startTime = performance.now();
  
  try {
    const response = await fetch(url, options);
    const duration = Math.round(performance.now() - startTime);
    
    apiMetrics.trackCall(
      new URL(url).pathname,
      duration,
      response.ok,
      response.ok ? null : `HTTP ${response.status}`
    );
    
    return response;
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    apiMetrics.trackCall(
      new URL(url).pathname,
      duration,
      false,
      error.message
    );
    throw error;
  }
};

export default apiMetrics;
