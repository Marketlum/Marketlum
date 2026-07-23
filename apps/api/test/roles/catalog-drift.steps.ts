// Not a cucumber suite: the `.steps.ts` suffix is required by the jest
// testMatch pattern. This is the spec 020 Q2.1 drift guard — it walks every
// registered controller route, applies the permission-inference rules, and
// asserts each resolves to a catalogued resource, so the PERMISSION_RESOURCES
// list (or a plugin's permissionResources) can never silently drift from the
// actual API surface.
import 'reflect-metadata';
import { ModulesContainer } from '@nestjs/core';
import { PATH_METADATA } from '@nestjs/common/constants';
import { PERMISSION_RESOURCES } from '@marketlum/shared';
import {
  inferResource,
  REQUIRE_PERMISSION_KEY,
  ALLOW_AUTHENTICATED_KEY,
} from '@marketlum/core';
import { nbpPlugin } from '@marketlum/plugin-nbp';
import { rdhyPlugin } from '@marketlum/plugin-rdhy';
import { bootstrapApp, teardownApp, getApp } from '../setup';
import { examplePlugin } from '../plugins/example/example.plugin';

// Controllers whose endpoints are authentication itself or self-service and
// therefore deliberately have no permission resource.
const EXEMPT_PREFIXES = new Set(['auth', 'api-keys']);

describe('Permission catalog drift guard', () => {
  beforeAll(async () => {
    await bootstrapApp();
  });
  afterAll(async () => {
    await teardownApp();
  });

  it('every controller route resolves to a catalogued permission resource', () => {
    const catalog = new Set<string>([
      ...PERMISSION_RESOURCES,
      ...(nbpPlugin.permissionResources ?? []),
      ...(rdhyPlugin.permissionResources ?? []),
      ...(examplePlugin.permissionResources ?? []),
    ]);

    const modulesContainer = getApp().get(ModulesContainer);
    const uncatalogued: string[] = [];
    let checkedRoutes = 0;

    for (const module of modulesContainer.values()) {
      for (const wrapper of module.controllers.values()) {
        const controllerClass = wrapper.metatype as new () => unknown;
        if (!controllerClass) continue;

        const prefix: string = Reflect.getMetadata(PATH_METADATA, controllerClass) ?? '';
        const firstSegment = prefix.split('/').filter(Boolean)[0] ?? '';
        if (EXEMPT_PREFIXES.has(firstSegment)) continue;
        if (Reflect.getMetadata(ALLOW_AUTHENTICATED_KEY, controllerClass)) continue;

        const classOverride: string | undefined = Reflect.getMetadata(
          REQUIRE_PERMISSION_KEY,
          controllerClass,
        );

        const prototype = controllerClass.prototype as Record<string, unknown>;
        for (const property of Object.getOwnPropertyNames(prototype)) {
          const handler = prototype[property];
          if (typeof handler !== 'function' || property === 'constructor') continue;
          const routePath = Reflect.getMetadata(PATH_METADATA, handler);
          if (routePath === undefined) continue;
          if (Reflect.getMetadata(ALLOW_AUTHENTICATED_KEY, handler)) continue;

          checkedRoutes += 1;
          const handlerOverride: string | undefined = Reflect.getMetadata(
            REQUIRE_PERMISSION_KEY,
            handler,
          );
          const override = handlerOverride ?? classOverride;
          const resource = override
            ? override.split(':')[0]
            : inferResource(`/${prefix}/${routePath}`.replace(/\/+/g, '/'));

          if (!catalog.has(resource)) {
            uncatalogued.push(`${prefix}/${routePath} -> ${resource}`);
          }
        }
      }
    }

    expect(checkedRoutes).toBeGreaterThan(100);
    expect(uncatalogued).toEqual([]);
  });
});
