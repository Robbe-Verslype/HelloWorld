import { defineConfig } from 'astro/config';

export default defineConfig({
  // Alle CSS in de pagina zelf zetten: geen losse stijlbestanden die kunnen ontbreken
  build: { inlineStylesheets: 'always' },
});
