"use client";

import { useEffect, useState, useCallback } from "react";
import { AspectRatioKey, StylePresetKey } from "./types";

export const STORAGE_KEY = "microstock_studio_settings_v1";
export const SETTINGS_CHANGE_EVENT = "microstock_settings_changed";

export interface AppSettings {
  geminiApiKey: string;
  imageProvider: "pollinations" | "imagen";
  metadataProvider: "gemini";
  defaultAspectRatio: AspectRatioKey;
  defaultStyle: StylePresetKey;
}

export const DEFAULT_SETTINGS: AppSettings = {
  geminiApiKey: "",
  imageProvider: "pollinations",
  metadataProvider: "gemini",
  defaultAspectRatio: "16:9",
  defaultStyle: "commercial-photo",
};

// In-memory set of subscriber callbacks for instant same-tab reactive updates
const subscribers = new Set<(settings: AppSettings) => void>();

function notifySubscribers(settings: AppSettings): void {
  subscribers.forEach((callback) => {
    try {
      callback(settings);
    } catch (err) {
      console.error("Error in settings subscriber callback:", err);
    }
  });
}

/**
 * Validates whether a given string matches the standard Google AI Studio / Gemini API key format.
 * Format: starts with 'AIzaSy' followed by 30 to 45 URL-safe base64 characters.
 */
export function isValidGeminiApiKey(key: string): boolean {
  if (!key || typeof key !== "string") {
    return false;
  }
  const trimmed = key.trim();
  return /^AIzaSy[A-Za-z0-9_-]{30,45}$/.test(trimmed);
}

/**
 * Retrieves the currently stored application settings from LocalStorage.
 * Safe in Next.js SSR / Node environments (returns DEFAULT_SETTINGS if window is undefined).
 */
export function getStoredSettings(): AppSettings {
  if (typeof window === "undefined" || !window.localStorage) {
    return { ...DEFAULT_SETTINGS };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_SETTINGS };
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return { ...DEFAULT_SETTINGS };
    }

    // Merge with DEFAULT_SETTINGS to ensure any newly added fields have defaults
    return {
      geminiApiKey:
        typeof parsed.geminiApiKey === "string"
          ? parsed.geminiApiKey
          : DEFAULT_SETTINGS.geminiApiKey,
      imageProvider:
        parsed.imageProvider === "imagen" || parsed.imageProvider === "pollinations"
          ? parsed.imageProvider
          : DEFAULT_SETTINGS.imageProvider,
      metadataProvider: "gemini",
      defaultAspectRatio:
        typeof parsed.defaultAspectRatio === "string"
          ? parsed.defaultAspectRatio
          : DEFAULT_SETTINGS.defaultAspectRatio,
      defaultStyle:
        typeof parsed.defaultStyle === "string"
          ? parsed.defaultStyle
          : DEFAULT_SETTINGS.defaultStyle,
    };
  } catch (err) {
    console.warn("Failed to read settings from localStorage, falling back to defaults:", err);
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Saves partial settings updates to LocalStorage and notifies reactive listeners.
 * Safe in SSR / Node environments.
 */
export function saveStoredSettings(settings: Partial<AppSettings>): AppSettings {
  const current = getStoredSettings();
  const updated: AppSettings = {
    ...current,
    ...settings,
    metadataProvider: "gemini", // always fixed to gemini for metadata
  };

  if (typeof window !== "undefined" && window.localStorage) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      if (typeof window.dispatchEvent === "function") {
        window.dispatchEvent(
          new CustomEvent(SETTINGS_CHANGE_EVENT, { detail: updated })
        );
      }
    } catch (err) {
      console.warn("Failed to save settings to localStorage:", err);
    }
  }

  notifySubscribers(updated);
  return updated;
}

/**
 * Clears stored settings from LocalStorage and resets to defaults.
 * Safe in SSR / Node environments.
 */
export function clearStoredSettings(): void {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      if (typeof window.dispatchEvent === "function") {
        window.dispatchEvent(
          new CustomEvent(SETTINGS_CHANGE_EVENT, { detail: { ...DEFAULT_SETTINGS } })
        );
      }
    } catch (err) {
      console.warn("Failed to clear settings from localStorage:", err);
    }
  }

  notifySubscribers({ ...DEFAULT_SETTINGS });
}

/**
 * Subscribes to settings updates (both intra-tab and cross-tab storage changes).
 * Returns an unsubscribe cleanup function.
 */
export function subscribeSettings(callback: (settings: AppSettings) => void): () => void {
  subscribers.add(callback);

  let storageHandler: ((event: StorageEvent) => void) | null = null;
  let customHandler: ((event: Event) => void) | null = null;

  if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
    // Cross-tab synchronization via standard StorageEvent
    storageHandler = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        callback(getStoredSettings());
      }
    };
    window.addEventListener("storage", storageHandler);

    // Intra-tab custom event for external components
    customHandler = (event: Event) => {
      const customEvent = event as CustomEvent<AppSettings>;
      if (customEvent.detail) {
        callback(customEvent.detail);
      } else {
        callback(getStoredSettings());
      }
    };
    window.addEventListener(SETTINGS_CHANGE_EVENT, customHandler);
  }

  return () => {
    subscribers.delete(callback);
    if (typeof window !== "undefined" && typeof window.removeEventListener === "function") {
      if (storageHandler) {
        window.removeEventListener("storage", storageHandler);
      }
      if (customHandler) {
        window.removeEventListener(SETTINGS_CHANGE_EVENT, customHandler);
      }
    }
  };
}

/**
 * React hook to reactively consume and mutate application settings in UI components.
 */
export function useSettings(): {
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => AppSettings;
  resetSettings: () => void;
  isLoaded: boolean;
} {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setSettings(getStoredSettings());
    setIsLoaded(true);

    const unsubscribe = subscribeSettings((newSettings) => {
      setSettings(newSettings);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    const updated = saveStoredSettings(partial);
    setSettings(updated);
    return updated;
  }, []);

  const resetSettings = useCallback(() => {
    clearStoredSettings();
    setSettings({ ...DEFAULT_SETTINGS });
  }, []);

  return {
    settings,
    updateSettings,
    resetSettings,
    isLoaded,
  };
}
