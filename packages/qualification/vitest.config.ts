import { mergeConfig } from "vitest/config";
import { createBaseVitestConfig } from "../../vitest.shared.js";

export default mergeConfig(createBaseVitestConfig(), {});
