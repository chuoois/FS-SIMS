import { lazy } from 'react';

export const lazyNamed = (loadModule, exportName) =>
  lazy(() =>
    loadModule().then((module) => {
      const Component = module[exportName];

      if (!Component) {
        throw new Error(`Module does not export "${exportName}".`);
      }

      return { default: Component };
    })
  );
