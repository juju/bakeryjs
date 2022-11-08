export default {
  roots: ["<rootDir>"],
  testEnvironment: "jsdom",
  testMatch: ["<rootDir>src/?(*.)+(test).[tj]s"],
  transform: {
    "^.+\\.ts$": "ts-jest"
  },
  preset: "ts-jest",
  setupFilesAfterEnv: ["<rootDir>/jestSetup.js"],
};
