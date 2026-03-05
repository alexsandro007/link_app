import { ApiReference } from '@scalar/nextjs-api-reference';

/**
 * GET /api/docs
 *
 * Renders the interactive Scalar API reference UI for the Linkery OpenAPI spec.
 * Open http://localhost:3000/api/docs in your browser.
 */
export const GET = ApiReference({
  url: '/openapi.json',
  pageTitle: 'Linkery API Reference',
  theme: 'purple',
});
