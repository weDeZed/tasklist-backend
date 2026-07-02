import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/__tests__/**/*.test.ts"],
    testTimeout: 15000,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "json-summary"],
      reportsDirectory: "coverage",
      include: ["src/**/*.ts"],
  exclude: [
        '**/__tests__/**',      
        '**/*.test.ts',         
        '**/*.e2e.test.ts',     
        'prisma/**',            
        'src/app.ts'            
      ],
    },
    reporters: ["default", "junit"],
    outputFile: {
      junit: "reports/junit.xml",
    },
  },
});
