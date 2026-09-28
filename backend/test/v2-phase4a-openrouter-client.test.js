import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

// Set up env vars for tests so the bypass is disabled.
process.env.NODE_ENV = 'production';
process.env.DATABASE_URL = 'postgresql://localhost:5432/klarix_prod';
process.env.GEMINI_API_KEY = 'test_key';

// Mock fetch globally
const originalFetch = global.fetch;

// We will track what was sent to Gemini
let geminiRequestPayload = null;

mock.method(global, 'fetch', async (url, options) => {
  if (url.toString().includes('generateContent')) {
    geminiRequestPayload = JSON.parse(options.body);
    const jsonRes = {
        candidates: [{ content: { parts: [{ text: "{ \"test\": \"response\" }" }] } }]
      };
    return {
      ok: true,
      json: async () => jsonRes,
      text: async () => JSON.stringify(jsonRes)
    };
  }

  // Handle media fetch for normal URLs
  if (url.toString() === 'https://example.com/test.jpg') {
    // Return a fake JPEG buffer
    const buffer = Buffer.from('FFD8FFE000104A46494600010100000100010000FFDB0043', 'hex');
    const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    return {
      ok: true,
      headers: { get: () => 'image/jpeg' },
      arrayBuffer: async () => ab
    };
  }
  
  // Handle media fetch for malformed MIME URL
  if (url.toString() === 'https://example.com/malformed') {
    // Return a valid PNG but with malformed/missing headers
    const buffer = Buffer.from('89504E470D0A1A0A0000000D49484452000001000000010008060000005C72A866', 'hex');
    const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    return {
      ok: true,
      headers: { get: () => 'application/octet-stream' },
      arrayBuffer: async () => ab
    };
  }

  // Handle video
  if (url.toString() === 'https://example.com/test.mp4') {
    const buffer = Buffer.from('0000001C667479706D703432000000006D70343269736F6D', 'hex'); // ftyp mp42
    const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    return {
      ok: true,
      headers: { get: () => 'video/mp4' },
      arrayBuffer: async () => ab
    };
  }

  // Handle video
  if (url.toString().includes('upload/v1beta/files')) {
    return { ok: true, json: async () => ({ file: { uri: 'test_file_uri', name: 'test_file_name' } }) };
  }
  
  if (url.toString().includes('generativelanguage.googleapis.com/v1beta/test_file_name')) {
    return { ok: true, json: async () => ({ state: 'ACTIVE' }) };
  }

  return originalFetch(url, options);
});

// Import after setting env and mocks
const { callAgent } = await import('../services/openRouterClient.js');

test('openRouterClient - parses data URI MIME type correctly and sets config', async () => {
  geminiRequestPayload = null;
  const userMessage = [
    { type: 'image_url', image_url: { url: 'data:image/png;base64,iVBORw0KGgo=' } }
  ];
  await callAgent('test prompt', userMessage);
  
  assert.ok(geminiRequestPayload);
  
  // Verify generationConfig parameters for 3.8 compatibility
  assert.equal(geminiRequestPayload.generationConfig.temperature, undefined);
  assert.equal(geminiRequestPayload.generationConfig.responseMimeType, 'application/json');

  const part = geminiRequestPayload.contents[0].parts.find(p => p.inline_data);
  assert.equal(part.inline_data.mime_type, 'image/png');
  assert.equal(part.inline_data.data, 'iVBORw0KGgo=');
});

test('openRouterClient - derives JPEG MIME type from valid HTTP URL', async () => {
  geminiRequestPayload = null;
  const userMessage = [
    { type: 'image_url', image_url: { url: 'https://example.com/test.jpg' } }
  ];
  await callAgent('test prompt', userMessage);
  
  assert.ok(geminiRequestPayload);
  const part = geminiRequestPayload.contents[0].parts.find(p => p.inline_data);
  assert.equal(part.inline_data.mime_type, 'image/jpeg');
  assert.ok(part.inline_data.data.length > 0);
});

test('openRouterClient - derives PNG MIME type from magic bytes when header is generic', async () => {
  geminiRequestPayload = null;
  const userMessage = [
    { type: 'image_url', image_url: { url: 'https://example.com/malformed' } }
  ];
  await callAgent('test prompt', userMessage);
  
  assert.ok(geminiRequestPayload);
  const part = geminiRequestPayload.contents[0].parts.find(p => p.inline_data);
  assert.equal(part.inline_data.mime_type, 'image/png');
  assert.ok(part.inline_data.data.length > 0);
});

test('openRouterClient - processes carousel with multiple slides', async () => {
  geminiRequestPayload = null;
  const userMessage = [
    { type: 'image_url', image_url: { url: 'https://example.com/test.jpg' } },
    { type: 'image_url', image_url: { url: 'https://example.com/test.jpg' } }
  ];
  await callAgent('test prompt', userMessage);
  
  assert.ok(geminiRequestPayload);
  
  const textParts = geminiRequestPayload.contents[0].parts.filter(p => p.text);
  assert.ok(textParts.some(p => p.text.includes('[Carousel Slide #1]')));
  assert.ok(textParts.some(p => p.text.includes('[Carousel Slide #2]')));
  
  const inlineParts = geminiRequestPayload.contents[0].parts.filter(p => p.inline_data);
  assert.equal(inlineParts.length, 2);
});

test('openRouterClient - processes video and uses file API', async () => {
  geminiRequestPayload = null;
  const userMessage = [
    { type: 'image_url', image_url: { url: 'https://example.com/test.mp4' } }
  ];
  await callAgent('test prompt', userMessage);
  
  assert.ok(geminiRequestPayload);
  
  // Should contain file_data, not inline_data
  const inlineParts = geminiRequestPayload.contents[0].parts.filter(p => p.inline_data);
  assert.equal(inlineParts.length, 0);
  
  const fileDataPart = geminiRequestPayload.contents[0].parts.find(p => p.file_data);
  assert.ok(fileDataPart);
  assert.equal(fileDataPart.file_data.mime_type, 'video/mp4');
  assert.equal(fileDataPart.file_data.file_uri, 'test_file_uri');
});
