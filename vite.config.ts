import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { build } from 'esbuild';
import { rm } from 'fs/promises';
import type { IncomingMessage, ServerResponse } from 'http';
import path from 'path';
import { pathToFileURL } from 'url';
import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from 'vite';

// bundle an api route with esbuild, the way vercel does, so commonjs packages work in dev too
async function loadApiRoute(root: string, name: string) {
  const outfile = path.join(root, 'node_modules', '.dev-api', `${name}-${Date.now()}.mjs`);
  await build({
    entryPoints: [path.join(root, 'api', `${name}.ts`)],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    logLevel: 'silent',
    // let bundled commonjs code call require() for node built-ins
    banner: { js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);" },
  });
  try {
    return await import(pathToFileURL(outfile).href);
  } finally {
    await rm(outfile, { force: true });
  }
}

// in dev, serve /merch like vercel does (cleanUrls) and run the files in api/ as routes,
// so `bun run dev` works without the vercel cli
function devRoutes(): Plugin {
  return {
    name: 'chalant-dev-routes',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const url = new URL(req.url ?? '/', 'http://localhost');

        if (url.pathname === '/merch' || url.pathname === '/merch/') {
          req.url = '/merch.html' + url.search;
          return next();
        }

        if (!url.pathname.startsWith('/api/')) return next();

        try {
          const name = url.pathname.slice('/api/'.length).replace(/[^a-z0-9-]/gi, '');
          const mod = await loadApiRoute(server.config.root, name);
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);
          const body = chunks.length ? Buffer.concat(chunks) : undefined;
          const request = new Request(url, {
            method: req.method,
            headers: req.headers as Record<string, string>,
            body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body,
          });
          const response: Response = await mod.default(request);
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (error) {
          console.error(error);
          res.statusCode = 500;
          res.end('dev api error');
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // expose .env.local to the api handlers in dev (vercel sets these in production)
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));

  return {
    plugins: [react(), tailwindcss(), devRoutes()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          merch: path.resolve(__dirname, 'merch.html'),
        },
      },
    },
  };
});
