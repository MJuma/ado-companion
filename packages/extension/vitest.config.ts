import solid from 'vite-plugin-solid';
import { defineConfig } from 'vitest/config';
import { WxtVitest } from 'wxt/testing';

export default defineConfig({
    plugins: [solid(), WxtVitest()],
    resolve: {
        conditions: ['development', 'browser'],
    },
    test: {
        globals: false,
        environment: 'jsdom',
        include: ['src/**/*.spec.{ts,tsx}'],
        exclude: ['**/node_modules/**', '**/.{idea,git,cache,output,temp,wxt}/**'],
        passWithNoTests: false,
        retry: 0,
        setupFiles: ['./src/test-setup.ts'],
        typecheck: {
            enabled: true,
            tsconfig: 'tsconfig.spec.json',
        },
        coverage: {
            enabled: true,
            provider: 'v8',
            reporter: ['text', 'cobertura'],
            // Coverage is enforced on pure logic in src/lib. Entrypoints and UI
            // components are DOM/browser glue, validated via build + manual
            // testing. Scoping `include` to src/lib (rather than excluding the
            // glue) prevents a future top-level src/ file from averaging in.
            include: ['src/lib/**/*.{ts,tsx}'],
            exclude: ['**/*.d.ts', '**/*.spec.{ts,tsx}', '**/*.mock.ts'],
            thresholds: {
                statements: 85,
                branches: 80,
                functions: 85,
                lines: 85,
            },
        },
    },
});
