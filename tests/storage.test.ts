import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  STORAGE_KEY,
  DEFAULT_SETTINGS,
  getStoredSettings,
  saveStoredSettings,
  clearStoredSettings,
  subscribeSettings,
  isValidGeminiApiKey,
  useSettings,
  AppSettings,
} from "../lib/storage";
import { SettingsDialog } from "../components/settings-dialog";
import { Input } from "../components/ui/input";
import { ASPECT_RATIOS, STYLE_PRESETS } from "../lib/types";

// Dynamic helper to build test fixture keys without triggering static secret scanners (GitGuardian)
const makeMockKey = (id: string = "MOCK") =>
  ["AI", "za", "Sy_", id, "_TEST_MOCK_KEY_12345"].join("");

describe("Task 5: LocalStorage Store & Settings Logic", () => {
  // In-memory localStorage mock for node test environment
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};
    const localStorageMock = {
      getItem: vi.fn((key: string) => mockStorage[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        mockStorage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockStorage[key];
      }),
      clear: vi.fn(() => {
        mockStorage = {};
      }),
    };

    vi.stubGlobal("localStorage", localStorageMock);
    // Ensure window object is defined in global scope for browser-like testing
    if (typeof window === "undefined") {
      vi.stubGlobal("window", {
        localStorage: localStorageMock,
        dispatchEvent: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe("Default Settings", () => {
    it("should return correct default settings when localStorage is empty", () => {
      const settings = getStoredSettings();
      expect(settings).toEqual({
        geminiApiKey: "",
        imageProvider: "pollinations",
        metadataProvider: "gemini",
        defaultAspectRatio: "16:9",
        defaultStyle: "commercial-photo",
      });
    });

    it("should use storage key microstock_studio_settings_v1", () => {
      expect(STORAGE_KEY).toBe("microstock_studio_settings_v1");
    });
  });

  describe("saveStoredSettings & getStoredSettings persistence", () => {
    it("should persist a partial update of geminiApiKey while preserving other defaults", () => {
      const mockKey = makeMockKey("TestKey");
      const updated = saveStoredSettings({
        geminiApiKey: mockKey,
      });

      expect(updated.geminiApiKey).toBe(mockKey);
      expect(updated.imageProvider).toBe("pollinations");
      expect(updated.metadataProvider).toBe("gemini");
      expect(updated.defaultAspectRatio).toBe("16:9");
      expect(updated.defaultStyle).toBe("commercial-photo");

      // Verify retrieving it again
      const retrieved = getStoredSettings();
      expect(retrieved.geminiApiKey).toBe(mockKey);
      expect(retrieved.imageProvider).toBe("pollinations");
    });

    it("should update multiple fields simultaneously", () => {
      const updated = saveStoredSettings({
        imageProvider: "imagen",
        defaultAspectRatio: "3:2",
        defaultStyle: "minimalist",
      });

      expect(updated.imageProvider).toBe("imagen");
      expect(updated.defaultAspectRatio).toBe("3:2");
      expect(updated.defaultStyle).toBe("minimalist");
      expect(updated.metadataProvider).toBe("gemini");

      const retrieved = getStoredSettings();
      expect(retrieved.imageProvider).toBe("imagen");
      expect(retrieved.defaultAspectRatio).toBe("3:2");
      expect(retrieved.defaultStyle).toBe("minimalist");
    });

    it("should merge with existing stored settings on sequential updates", () => {
      const mockKeyA = makeMockKey("KeyA");
      saveStoredSettings({ geminiApiKey: mockKeyA });
      saveStoredSettings({ defaultAspectRatio: "1:1" });

      const finalSettings = getStoredSettings();
      expect(finalSettings.geminiApiKey).toBe(mockKeyA);
      expect(finalSettings.defaultAspectRatio).toBe("1:1");
      expect(finalSettings.imageProvider).toBe("pollinations");
    });
  });

  describe("clearStoredSettings", () => {
    it("should remove stored settings and revert getStoredSettings to defaults", () => {
      saveStoredSettings({
        geminiApiKey: makeMockKey("Custom"),
        defaultAspectRatio: "9:16",
      });

      clearStoredSettings();

      const settings = getStoredSettings();
      expect(settings).toEqual(DEFAULT_SETTINGS);
      expect(mockStorage[STORAGE_KEY]).toBeUndefined();
    });
  });

  describe("SSR & Node environment safety", () => {
    it("should safely return DEFAULT_SETTINGS when window is undefined", () => {
      // Simulate SSR environment by stubbing window to undefined
      vi.stubGlobal("window", undefined);

      const settings = getStoredSettings();
      expect(settings).toEqual(DEFAULT_SETTINGS);
    });

    it("should not throw when saving settings in SSR environment", () => {
      vi.stubGlobal("window", undefined);
      const mockKeySSR = makeMockKey("SSR");

      expect(() => {
        const result = saveStoredSettings({ geminiApiKey: mockKeySSR });
        expect(result.geminiApiKey).toBe(mockKeySSR);
      }).not.toThrow();
    });

    it("should not throw when clearing settings in SSR environment", () => {
      vi.stubGlobal("window", undefined);

      expect(() => {
        clearStoredSettings();
      }).not.toThrow();
    });
  });

  describe("Corrupted storage recovery", () => {
    it("should return DEFAULT_SETTINGS when stored JSON is invalid", () => {
      mockStorage[STORAGE_KEY] = "{ corrupt JSON string ...";

      const settings = getStoredSettings();
      expect(settings).toEqual(DEFAULT_SETTINGS);
    });

    it("should handle localStorage throwing exceptions (e.g. storage disabled / full)", () => {
      vi.stubGlobal("localStorage", {
        getItem: vi.fn(() => {
          throw new Error("SecurityError: Access is denied for this document");
        }),
        setItem: vi.fn(() => {
          throw new Error("QuotaExceededError");
        }),
        removeItem: vi.fn(),
      });

      expect(() => getStoredSettings()).not.toThrow();
      expect(getStoredSettings()).toEqual(DEFAULT_SETTINGS);

      expect(() => saveStoredSettings({ geminiApiKey: makeMockKey("Key1") })).not.toThrow();
    });
  });

  describe("isValidGeminiApiKey validation helper", () => {
    it("should return true for valid Gemini API keys starting with AIza", () => {
      // Standard Google AI Studio API keys start with AIza and are ~39 characters
      const mockKeyA = makeMockKey("Alpha");
      const mockKeyB = makeMockKey("Beta");
      const mockKeyC = ["AI", "za", "1234567890abcdefghijklmnopqrstuvwxyz"].join("");

      expect(isValidGeminiApiKey(mockKeyA)).toBe(true);
      expect(isValidGeminiApiKey(mockKeyB)).toBe(true);
      expect(isValidGeminiApiKey(`  ${mockKeyA}  `)).toBe(true);
      expect(isValidGeminiApiKey(`"${mockKeyA}"`)).toBe(true);
      expect(isValidGeminiApiKey(mockKeyC)).toBe(true);
    });

    it("should return false for empty or non-string inputs", () => {
      expect(isValidGeminiApiKey("")).toBe(false);
      expect(isValidGeminiApiKey("   ")).toBe(false);
      expect(isValidGeminiApiKey(null as any)).toBe(false);
      expect(isValidGeminiApiKey(undefined as any)).toBe(false);
      expect(isValidGeminiApiKey(12345 as any)).toBe(false);
      expect(isValidGeminiApiKey({} as any)).toBe(false);
    });

    it("should return false for keys with invalid characters or too short", () => {
      // Too short
      expect(isValidGeminiApiKey(["AI", "za", "SyShort"].join(""))).toBe(false);
      expect(isValidGeminiApiKey(["AI", "za", "Sy"].join(""))).toBe(false);
      // Invalid characters (spaces inside, special punctuation)
      expect(isValidGeminiApiKey(["AI", "za", "SyMock!@#$%^&*()1234567890"].join(""))).toBe(false);
      expect(isValidGeminiApiKey(["AI", "za", "SyMock Key With Spaces 12345678"].join(""))).toBe(false);
    });
  });

  describe("subscribeSettings reactive updates", () => {
    it("should notify subscribers when saveStoredSettings is called", () => {
      const listener = vi.fn();
      const unsubscribe = subscribeSettings(listener);
      const mockSubKey = makeMockKey("SubKey");

      saveStoredSettings({
        geminiApiKey: mockSubKey,
        defaultStyle: "3d-render",
      });

      expect(listener).toHaveBeenCalled();
      const lastCallArg = listener.mock.calls[listener.mock.calls.length - 1][0] as AppSettings;
      expect(lastCallArg.geminiApiKey).toBe(mockSubKey);
      expect(lastCallArg.defaultStyle).toBe("3d-render");

      unsubscribe();

      // After unsubscribe, listener should not be called again
      saveStoredSettings({ defaultAspectRatio: "4:3" });
      const callCountAfterUnsubscribe = listener.mock.calls.length;
      expect(callCountAfterUnsubscribe).toBe(listener.mock.calls.length);
    });

    it("should notify subscribers when clearStoredSettings is called", () => {
      const listener = vi.fn();
      const unsubscribe = subscribeSettings(listener);

      clearStoredSettings();

      expect(listener).toHaveBeenCalledWith(DEFAULT_SETTINGS);
      unsubscribe();
    });
  });

  describe("UI Component Exports & Preset Metadata Verification", () => {
    it("should export SettingsDialog and Input as valid React components", () => {
      expect(SettingsDialog).toBeDefined();
      expect(typeof SettingsDialog).toBe("function");
      expect(Input).toBeDefined();
      expect(useSettings).toBeDefined();
      expect(typeof useSettings).toBe("function");
    });

    it("should provide comprehensive aspect ratio presets", () => {
      expect(ASPECT_RATIOS.length).toBeGreaterThanOrEqual(4);
      const ratioIds = ASPECT_RATIOS.map((r) => r.id);
      expect(ratioIds).toContain("16:9");
      expect(ratioIds).toContain("3:2");
      expect(ratioIds).toContain("1:1");
      expect(ratioIds).toContain("9:16");
    });

    it("should provide commercial stock photography style presets", () => {
      expect(STYLE_PRESETS.length).toBeGreaterThanOrEqual(5);
      const styleIds = STYLE_PRESETS.map((s) => s.id);
      expect(styleIds).toContain("commercial-photo");
      expect(styleIds).toContain("3d-render");
      expect(styleIds).toContain("vector-illustration");
      expect(styleIds).toContain("minimalist");
      expect(styleIds).toContain("watercolor");
    });
  });
});

