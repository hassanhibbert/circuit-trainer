import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// newer node versions have their own localStorage global that hides jsdom's
Object.defineProperty(globalThis, "localStorage", { value: globalThis.jsdom.window.localStorage, configurable: true });

afterEach(() => {
  cleanup();
  localStorage.clear();
});
