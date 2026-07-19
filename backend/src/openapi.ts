export const openapi = {
  openapi: '3.1.0',
  info: { title: 'Jachty API', version: '0.1.0', description: 'Informational sailing application API. Not a certified navigation system.' },
  servers: [{ url: '/api/v1' }],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: {
      Error: {
        type: 'object', required: ['error'], properties: { error: { type: 'object', required: ['code', 'message', 'requestId'], properties: {
          code: { type: 'string' }, message: { type: 'string' }, details: { type: 'object' }, requestId: { type: 'string' },
        } } },
      },
      Coordinate: { type: 'object', required: ['latitude', 'longitude'], properties: { latitude: { type: 'number' }, longitude: { type: 'number' } } },
      LocationSample: { type: 'object', required: ['clientGeneratedId', 'latitude', 'longitude', 'accuracy', 'recordedAt'], properties: {
        clientGeneratedId: { type: 'string', format: 'uuid' }, latitude: { type: 'number' }, longitude: { type: 'number' },
        accuracy: { type: 'number' }, speed: { type: ['number', 'null'] }, heading: { type: ['number', 'null'] }, recordedAt: { type: 'string', format: 'date-time' },
      } },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/auth/register': { post: { security: [], summary: 'Register sailor account', responses: { '201': { description: 'Registered' }, '400': { description: 'Invalid input' } } } },
    '/auth/login': { post: { security: [], summary: 'Create a token session', responses: { '200': { description: 'Authenticated' }, '401': { description: 'Invalid credentials' } } } },
    '/auth/refresh': { post: { security: [], summary: 'Rotate refresh token', responses: { '200': { description: 'New token pair' } } } },
    '/users/me': { get: { summary: 'Current profile', responses: { '200': { description: 'Profile' } } }, patch: { summary: 'Update profile', responses: { '200': { description: 'Updated' } } } },
    '/ports': { get: { summary: 'Search active ports', responses: { '200': { description: 'Port list' } } }, post: { summary: 'Submit or create a port', responses: { '201': { description: 'Created' } } } },
    '/routes': { get: { summary: 'List owned routes', responses: { '200': { description: 'Route list' } } }, post: { summary: 'Create route', responses: { '201': { description: 'Created' } } } },
    '/locations/batch': { post: { summary: 'Store a batch of GPS samples', responses: { '202': { description: 'Accepted' } } } },
    '/traffic/points': { get: { summary: 'Privacy-filtered active positions', responses: { '200': { description: 'Positions' } } } },
    '/traffic/heatmap': { get: { summary: 'Aggregated traffic cells', responses: { '200': { description: 'Heatmap cells' } } } },
    '/admin/traffic-simulation': { get: { summary: 'Get demo traffic simulation status', responses: { '200': { description: 'Simulation status' } } } },
    '/admin/traffic-simulation/reset': { post: { summary: 'Reset and start demo traffic simulation', responses: { '200': { description: 'Simulation started' } } } },
    '/admin/traffic-simulation/stop': { post: { summary: 'Stop demo traffic simulation', responses: { '200': { description: 'Simulation stopped' } } } },
    '/alerts': { get: { summary: 'List active alerts; optionally filter by user or official source', responses: { '200': { description: 'Alert list' } } }, post: { summary: 'Immediately publish a rate-limited report', responses: { '201': { description: 'Created' }, '429': { description: 'Per-user alert quota exceeded' } } } },
    '/conversations': { get: { summary: 'List conversations', responses: { '200': { description: 'Conversation list' } } }, post: { summary: 'Start port conversation', responses: { '201': { description: 'Created' } } } },
  },
} as const;
