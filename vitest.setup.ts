// Lit announces its development build once per module graph, and every test file is its own graph.
(globalThis as { litIssuedWarnings?: Set<string> }).litIssuedWarnings = new Set(['dev-mode']);
