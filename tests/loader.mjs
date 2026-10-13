// Phase 18 test loader: resolve extensionless relative TS imports
// (e.g. './indexer' -> './indexer.ts'). Test-only; sources unchanged.
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve as resolvePath } from 'node:path';

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (e) {
    if ((specifier.startsWith('./') || specifier.startsWith('../')) &&
        !/\.[a-z]+$/i.test(specifier.split('/').pop())) {
      const parentPath = context.parentURL
        ? fileURLToPath(context.parentURL)
        : process.cwd();
      const base = resolvePath(dirname(parentPath), specifier);
      for (const cand of [base + '.ts', base + '.tsx']) {
        if (existsSync(cand)) {
          return { url: pathToFileURL(cand).href, shortCircuit: true };
        }
      }
    }
    throw e;
  }
}
