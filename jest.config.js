module.exports = {
  roots: ["<rootDir>"],
  testEnvironment: "jsdom",
  testMatch: ["<rootDir>test/?(*.)+(spec|test).[tj]s?(x)"],
  setupFilesAfterEnv: ["<rootDir>/jestSetup.js"],
};
