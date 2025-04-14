import { ApiCache } from '../cache';

describe('ApiCache', () => {
  let cache: ApiCache;

  beforeEach(() => {
    cache = new ApiCache();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('should store and retrieve values', () => {
    const testKey = 'test_key';
    const testData = { id: 1, name: 'Test' };

    cache.set(testKey, testData);

    const retrieved = cache.get(testKey);
    expect(retrieved).toEqual(testData);
  });

  test('should return undefined for non-existent keys', () => {
    const nonExistentKey = 'non_existent_key';

    const result = cache.get(nonExistentKey);

    expect(result).toBeUndefined();
  });

  test('should expire entries after TTL', () => {
    const testKey = 'test_key';
    const testData = { id: 1, name: 'Test' };

    // Use a shorter TTL for testing
    cache = new ApiCache({ ttl: 1000 }); // 1 second TTL

    cache.set(testKey, testData);

    // Time travel to just before expiration
    jest.advanceTimersByTime(999);
    expect(cache.get(testKey)).toEqual(testData);

    // Time travel past expiration
    jest.advanceTimersByTime(2);
    expect(cache.get(testKey)).toBeUndefined();
  });

  test('should not cache when disabled', () => {
    const testKey = 'test_key';
    const testData = { id: 1, name: 'Test' };

    cache = new ApiCache({ enabled: false });

    cache.set(testKey, testData);

    const retrieved = cache.get(testKey);
    expect(retrieved).toBeUndefined();
  });

  test('should clear all entries', () => {
    const key1 = 'key1';
    const key2 = 'key2';

    cache.set(key1, 'value1');
    cache.set(key2, 'value2');

    expect(cache.size()).toBe(2);

    cache.clear();

    expect(cache.size()).toBe(0);
    expect(cache.get(key1)).toBeUndefined();
    expect(cache.get(key2)).toBeUndefined();
  });

  test('should invalidate specific entries', () => {
    const key1 = 'key1';
    const key2 = 'key2';

    cache.set(key1, 'value1');
    cache.set(key2, 'value2');

    cache.invalidate(key1);

    expect(cache.get(key1)).toBeUndefined();
    expect(cache.get(key2)).toEqual('value2');
  });

  test('should reconfigure with new options', () => {
    const testKey = 'test_key';
    const testData = { id: 1, name: 'Test' };

    // Start with default options (cache enabled)
    cache.set(testKey, testData);
    expect(cache.get(testKey)).toEqual(testData);

    // Disable cache
    cache.configure({ enabled: false });

    // Should no longer retrieve existing values
    expect(cache.get(testKey)).toBeUndefined();

    // New values should not be stored
    cache.set('new_key', 'new_value');
    expect(cache.get('new_key')).toBeUndefined();

    // Re-enable cache
    cache.configure({ enabled: true });

    // Should be able to store and retrieve again
    cache.set('re_enabled_key', 'value');
    expect(cache.get('re_enabled_key')).toEqual('value');
  });
});
