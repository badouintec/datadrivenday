import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { schemaTypes } from './src/sanity/schemaTypes';

const projectId = process.env.SANITY_PROJECT_ID ?? process.env.PUBLIC_SANITY_PROJECT_ID ?? 'replace-me';
const dataset = process.env.SANITY_DATASET ?? process.env.PUBLIC_SANITY_DATASET ?? 'production';

export default defineConfig({
  name: 'datadrivenday',
  title: 'Data Driven Day',
  projectId,
  dataset,
  plugins: [structureTool()],
  schema: {
    types: schemaTypes
  }
});
