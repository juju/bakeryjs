export default {
  roots: ["<rootDir>"],
  testEnvironment: "jsdom",
  testMatch: ["<rootDir>test/?(*.)+(spec|test).[tj]s"],
  transform: {
    "^.+\\.(t|j)s$": "ts-jest"
  },
  preset: "ts-jest",
  setupFilesAfterEnv: ["<rootDir>/jestSetup.js"],
};
