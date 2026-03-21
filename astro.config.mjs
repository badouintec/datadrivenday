import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import sanity from '@sanity/astro';
import { defineConfig } from 'astro/config';

const sanityProjectId = process.env.SANITY_PROJECT_ID ?? process.env.PUBLIC_SANITY_PROJECT_ID ?? 'replace-me';
const sanityDataset = process.env.SANITY_DATASET ?? process.env.PUBLIC_SANITY_DATASET ?? 'production';
const sanityStudioBasePath = process.env.SANITY_STUDIO_BASE_PATH ?? '/studio';

export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    imageService: 'compile',
    sessionKVBindingName: 'APP_SESSION'
  }),
  integrations: [
    sanity({
      projectId: sanityProjectId,
      dataset: sanityDataset,
      useCdn: false,
      studioBasePath: sanityStudioBasePath,
      stega: {
        studioUrl: sanityStudioBasePath
      }
    }),
    react()
  ],
  vite: {
    ssr: {
      target: 'webworker'
    },
    optimizeDeps: {
      exclude: ['hono', 'hono/cors', 'hono/logger']
    }
  }
});
