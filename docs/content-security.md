# Content security

`ContentSecurityService` configures generated library styles for a document or a composed subtree. It is a Foundation service, with no custom element or visual component.

```ts
import { ContentSecurityService } from '@tweakpad/ui';

// Use the unpredictable nonce supplied by your server for this response.
const security = new ContentSecurityService(document, { nonce: responseNonce });
await import('@tweakpad/ui/register');

// Dispose when this provider is no longer needed.
security.dispose();
```

Create the service before registering/upgrading controls. The server's `Content-Security-Policy` must authorize the same nonce. Load the package's `styles.css` through an allowed stylesheet link or your bundler's CSP-aware stylesheet handling; the service does not configure a bundler's development CSS injection.

| API                                           | Type / default                                                | Behavior                                                                                                                                            |
| --------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `new ContentSecurityService(scope, options?)` | `Document \| HTMLElement \| ShadowRoot`; options default `{}` | Installs policy at this scope.                                                                                                                      |
| `nonce`                                       | `string \| undefined`; undefined                              | Applied before insertion to every generated library style element. When supplied, styles use nonce-bearing elements rather than constructed sheets. |
| `disableStyleElements`                        | `boolean`; false                                              | Suppresses all generated style resources, including constructed sheets.                                                                             |
| `options`                                     | Readonly copy of current options                              | Reading or modifying the returned copy does not change policy.                                                                                      |
| `update(options)`                             | Complete replacement                                          | Applies immediately to connected resources; omitted properties return to their defaults.                                                            |
| `dispose()`                                   | Idempotent                                                    | Removes this provider and restores the next applicable policy; subsequent updates do nothing.                                                       |

The nearest scope replaces the outer policy, including its defaults. Multiple services at the same scope use the most recently installed undisposed service. Policy follows composed ancestry and the logical owner of portaled controls. Moving/reconnecting controls resolves the new scope and document. Without a service, the owning window's existing `litNonce` remains supported.

Structural styles, presentation recipes, registered native parts, portal styles, Navigation Panel views, Toast containers, and temporary resize cursor styles all use the same resource owner. Policy changes preserve component instances, editable state, focus, and form participation. Removing or replacing a generated resource leaves consumer-authored styles and adopted stylesheets intact.

For environments that forbid injected style resources:

```ts
const security = new ContentSecurityService(document, {
  disableStyleElements: true,
});
```

Suppression removes library-generated layout and appearance as well as paint. Native semantics and interactions remain available; provide your own permitted styles through the documented public parts and styling boundaries. The service does not strip consumer styling hooks or interaction geometry written through CSSOM. It does not generate scripts, configure HTTP headers, or grant permission to otherwise prohibited resources.

The Lit render boundary survives suppression and restoration, so live updates do not replace rendered controls. Disconnected elements release policy subscriptions; reconnection reconciles styles with the current policy and owner realm.
