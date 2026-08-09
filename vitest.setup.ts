import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// RTL's queries (including `screen`) search document.body by default, so
// without cleanup between tests, an earlier test's un-unmounted render
// stays in the DOM and later `getByRole` calls see multiple matches.
afterEach(() => {
  cleanup();
});
