/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        isolatedModules: true,
        diagnostics: { warnOnly: true },
      },
    ],
  },
  setupFiles: ["./tests/setup/env.ts"],
  testMatch: ["**/tests/**/*.test.ts"],
  modulePathIgnorePatterns: ["<rootDir>/dist/"],
};
