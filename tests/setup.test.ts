import { describe, it, expect } from "vitest";
import { cn } from "../lib/utils";
import { Button } from "../components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent } from "../components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectTrigger, SelectContent, SelectItem } from "../components/ui/select";
import { Skeleton } from "../components/ui/skeleton";
import { Toaster } from "../components/ui/sonner";

describe("Task 1: Project Setup and ShadCN UI Core Verification", () => {
  describe("Utility function cn()", () => {
    it("should merge simple class strings", () => {
      const result = cn("text-sm", "font-bold");
      expect(result).toBe("text-sm font-bold");
    });

    it("should ignore falsy and conditional values", () => {
      const condition = false;
      const result = cn("flex", condition && "hidden", null, undefined, "items-center");
      expect(result).toBe("flex items-center");
    });

    it("should resolve conflicting tailwind classes with twMerge", () => {
      const result = cn("px-2 py-1", "p-4");
      expect(result).toBe("p-4");
    });

    it("should resolve background color conflicts", () => {
      const result = cn("bg-red-500", "bg-blue-500");
      expect(result).toBe("bg-blue-500");
    });
  });

  describe("ShadCN UI Component Exports", () => {
    it("should export all requested core components as valid React components or objects", () => {
      expect(Button).toBeDefined();
      expect(Card).toBeDefined();
      expect(CardHeader).toBeDefined();
      expect(CardTitle).toBeDefined();
      expect(CardDescription).toBeDefined();
      expect(CardContent).toBeDefined();
      expect(CardFooter).toBeDefined();
      expect(Badge).toBeDefined();
      expect(Dialog).toBeDefined();
      expect(DialogContent).toBeDefined();
      expect(Tabs).toBeDefined();
      expect(TabsList).toBeDefined();
      expect(TabsTrigger).toBeDefined();
      expect(TabsContent).toBeDefined();
      expect(Textarea).toBeDefined();
      expect(Select).toBeDefined();
      expect(SelectTrigger).toBeDefined();
      expect(SelectContent).toBeDefined();
      expect(SelectItem).toBeDefined();
      expect(Skeleton).toBeDefined();
      expect(Toaster).toBeDefined();
    });
  });
});
