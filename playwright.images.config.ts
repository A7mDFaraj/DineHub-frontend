import { defineConfig } from "@playwright/test";
import base from "./playwright.ocr.config";

export default defineConfig({ ...base, testDir: "./tests/images", timeout: 45000 });
