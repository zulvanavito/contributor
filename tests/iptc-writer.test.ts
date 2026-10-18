import { describe, it, expect } from "vitest";
import {
  injectIptcIntoJpegBuffer,
  parseIptcFromJpegBuffer,
  injectIptcMetadata,
} from "@/lib/iptc-writer";
import { StockMetadata } from "@/lib/types";

// Minimal valid 1x1 JPEG bytes (SOI, APP0, DQT, SOF0, DHT, SOS, scan data, EOI)
const MINIMAL_JPEG = new Uint8Array([
  0xff, 0xd8, // SOI
  0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01,
  0x00, 0x48, 0x00, 0x48, 0x00, 0x00, // APP0 (JFIF)
  0xff, 0xdb, 0x00, 0x43, 0x00, // DQT
  0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09, 0x09,
  0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12, 0x13,
  0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20, 0x24,
  0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29, 0x2c,
  0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32, 0x3c,
  0x2e, 0x33, 0x34, 0x32,
  0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11,
  0x00, // SOF0
  0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01, 0x01, 0x01,
  0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02,
  0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, // DHT
  0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, // SOS
  0x7f, 0x00, // Scan data
  0xff, 0xd9, // EOI
]);

// Helper to count markers in a JPEG buffer
function countMarkerOccurrences(bytes: Uint8Array, markerByte: number): number {
  let count = 0;
  for (let i = 0; i < bytes.length - 1; i++) {
    if (bytes[i] === 0xff && bytes[i + 1] === markerByte) {
      count++;
    }
  }
  return count;
}

describe("IPTC Metadata Injector (Task 4)", () => {
  const sampleMetadata: StockMetadata = {
    title: "Scenic Fuji Mountain Sunset",
    description: "A serene sunset view over Mount Fuji with cherry blossoms in the foreground",
    category: "Landscape",
    keywords: [
      "fuji",
      "mountain",
      "sunset",
      "japan",
      "cherry blossom",
      "nature",
      "scenic",
    ],
  };

  describe("JPEG Validation & Error Handling", () => {
    it("should throw an error when injecting into non-JPEG bytes", () => {
      const nonJpeg = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x00, 0x00]);
      expect(() => injectIptcIntoJpegBuffer(nonJpeg, sampleMetadata)).toThrow(
        /invalid jpeg/i
      );
    });

    it("should throw an error when buffer is too short", () => {
      const emptyBuffer = new Uint8Array([]);
      expect(() => injectIptcIntoJpegBuffer(emptyBuffer, sampleMetadata)).toThrow(
        /invalid jpeg/i
      );
    });

    it("should return empty metadata when parsing non-JPEG buffer", () => {
      const nonJpeg = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x00, 0x00]);
      const parsed = parseIptcFromJpegBuffer(nonJpeg);
      expect(parsed).toEqual({});
    });

    it("should return empty metadata when parsing empty buffer", () => {
      const parsed = parseIptcFromJpegBuffer(new Uint8Array(0));
      expect(parsed).toEqual({});
    });

    it("should return empty metadata when parsing clean JPEG with no IPTC", () => {
      const parsed = parseIptcFromJpegBuffer(MINIMAL_JPEG);
      expect(parsed).toEqual({});
    });
  });

  describe("Binary Structure Verification (APP13 & Photoshop 3.0 IRB)", () => {
    it("should write APP13 (0xFFED) marker with Photoshop 3.0 IRB and 8BIM 0x0404 block", () => {
      const result = injectIptcIntoJpegBuffer(MINIMAL_JPEG, sampleMetadata);

      // Verify SOI is preserved
      expect(result[0]).toBe(0xff);
      expect(result[1]).toBe(0xd8);

      // Verify APP13 marker exists
      const app13Count = countMarkerOccurrences(result, 0xed);
      expect(app13Count).toBe(1);

      // Locate APP13
      let app13Offset = -1;
      for (let i = 0; i < result.length - 1; i++) {
        if (result[i] === 0xff && result[i + 1] === 0xed) {
          app13Offset = i;
          break;
        }
      }
      expect(app13Offset).toBeGreaterThan(0);

      // Verify Photoshop 3.0 header
      const headerBytes = result.slice(app13Offset + 4, app13Offset + 4 + 14);
      const headerString = new TextDecoder("ascii").decode(headerBytes);
      expect(headerString).toBe("Photoshop 3.0\0");

      // Verify 8BIM signature
      const bimOffset = app13Offset + 4 + 14;
      const bimSig = new TextDecoder("ascii").decode(
        result.slice(bimOffset, bimOffset + 4)
      );
      expect(bimSig).toBe("8BIM");

      // Verify Resource ID 0x0404 (IPTC-NAA)
      const resId = (result[bimOffset + 4] << 8) | result[bimOffset + 5];
      expect(resId).toBe(0x0404);
    });
  });

  describe("Round-Trip Metadata Verification", () => {
    it("should accurately round-trip full stock metadata", () => {
      const injected = injectIptcIntoJpegBuffer(MINIMAL_JPEG, sampleMetadata);
      const parsed = parseIptcFromJpegBuffer(injected);

      expect(parsed.title).toBe(sampleMetadata.title);
      expect(parsed.description).toBe(sampleMetadata.description);
      expect(parsed.category).toBe(sampleMetadata.category);
      expect(parsed.keywords).toEqual(sampleMetadata.keywords);
    });

    it("should handle UTF-8 characters and symbols properly", () => {
      const unicodeMetadata: StockMetadata = {
        title: "Pemandangan Indah Danau Toba & Gunung Bromo (2026)",
        description: "Foto pemandangan alam Indonesia dengan keindahan pegunungan - eksotis & memukau.",
        category: "Wisata Alam",
        keywords: [
          "danau toba",
          "gunung bromo",
          "keindahan alam",
          "indonesia",
          "pemandangan",
          "bäume & straße",
        ],
      };

      const injected = injectIptcIntoJpegBuffer(MINIMAL_JPEG, unicodeMetadata);
      const parsed = parseIptcFromJpegBuffer(injected);

      expect(parsed.title).toBe(unicodeMetadata.title);
      expect(parsed.description).toBe(unicodeMetadata.description);
      expect(parsed.category).toBe(unicodeMetadata.category);
      expect(parsed.keywords).toEqual(unicodeMetadata.keywords);
    });

    it("should handle partial metadata cleanly", () => {
      const partial: StockMetadata = {
        title: "Only Title Here",
        description: "",
        category: "",
        keywords: [],
      };

      const injected = injectIptcIntoJpegBuffer(MINIMAL_JPEG, partial);
      const parsed = parseIptcFromJpegBuffer(injected);

      expect(parsed.title).toBe("Only Title Here");
      expect(parsed.description).toBeUndefined();
      expect(parsed.keywords).toBeUndefined();
    });

    it("should handle keywords with whitespace by trimming them", () => {
      const metaWithSpaces: StockMetadata = {
        title: "Trimming Test",
        description: "Test description",
        category: "Test",
        keywords: ["  keyword one  ", "keyword two", "   ", "keyword three"],
      };

      const injected = injectIptcIntoJpegBuffer(MINIMAL_JPEG, metaWithSpaces);
      const parsed = parseIptcFromJpegBuffer(injected);

      expect(parsed.keywords).toEqual([
        "keyword one",
        "keyword two",
        "keyword three",
      ]);
    });
  });

  describe("Replacement & Updating of Existing APP13 Segments", () => {
    it("should cleanly replace existing IPTC metadata without duplicating APP13 segments", () => {
      // Step 1: Inject initial metadata
      const initialJpeg = injectIptcIntoJpegBuffer(MINIMAL_JPEG, {
        title: "Old Title",
        description: "Old Description",
        category: "Old Category",
        keywords: ["old1", "old2"],
      });

      expect(parseIptcFromJpegBuffer(initialJpeg).title).toBe("Old Title");
      expect(countMarkerOccurrences(initialJpeg, 0xed)).toBe(1);

      // Step 2: Inject updated metadata into the already-injected JPEG
      const updatedMetadata: StockMetadata = {
        title: "Brand New Title",
        description: "Brand New Description",
        category: "New Category",
        keywords: ["new1", "new2", "new3"],
      };

      const updatedJpeg = injectIptcIntoJpegBuffer(initialJpeg, updatedMetadata);
      const parsed = parseIptcFromJpegBuffer(updatedJpeg);

      // Verify updated values
      expect(parsed.title).toBe("Brand New Title");
      expect(parsed.description).toBe("Brand New Description");
      expect(parsed.category).toBe("New Category");
      expect(parsed.keywords).toEqual(["new1", "new2", "new3"]);

      // Verify no duplicate APP13 markers
      expect(countMarkerOccurrences(updatedJpeg, 0xed)).toBe(1);
    });

    it("should preserve other non-IPTC 8BIM resource blocks in existing APP13", () => {
      // Build a JPEG with an APP13 containing ResolutionInfo (0x03ED) + old IPTC (0x0404)
      const resInfoData = new Uint8Array([0x00, 0x48, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01]); // 8 bytes dummy resolution info
      const resInfoBlock = new Uint8Array(12 + resInfoData.length);
      // 8BIM
      resInfoBlock[0] = 0x38;
      resInfoBlock[1] = 0x42;
      resInfoBlock[2] = 0x49;
      resInfoBlock[3] = 0x4d;
      // Res ID 0x03ED
      resInfoBlock[4] = 0x03;
      resInfoBlock[5] = 0xed;
      // Empty name
      resInfoBlock[6] = 0x00;
      resInfoBlock[7] = 0x00;
      // Size 8
      resInfoBlock[8] = 0x00;
      resInfoBlock[9] = 0x00;
      resInfoBlock[10] = 0x00;
      resInfoBlock[11] = 0x08;
      resInfoBlock.set(resInfoData, 12);

      // Old IPTC block
      const oldIptcBlock = new Uint8Array(12 + 6);
      oldIptcBlock[0] = 0x38;
      oldIptcBlock[1] = 0x42;
      oldIptcBlock[2] = 0x49;
      oldIptcBlock[3] = 0x4d;
      oldIptcBlock[4] = 0x04;
      oldIptcBlock[5] = 0x04;
      oldIptcBlock[6] = 0x00;
      oldIptcBlock[7] = 0x00;
      oldIptcBlock[8] = 0x00;
      oldIptcBlock[9] = 0x00;
      oldIptcBlock[10] = 0x00;
      oldIptcBlock[11] = 0x06;
      // IPTC tag 2:05 old
      oldIptcBlock.set([0x1c, 0x02, 0x05, 0x00, 0x01, 0x58], 12); // 'X'

      // APP13 segment
      const psHeader = new TextEncoder().encode("Photoshop 3.0\0");
      const app13Payload = new Uint8Array(
        psHeader.length + resInfoBlock.length + oldIptcBlock.length
      );
      app13Payload.set(psHeader, 0);
      app13Payload.set(resInfoBlock, psHeader.length);
      app13Payload.set(oldIptcBlock, psHeader.length + resInfoBlock.length);

      const app13Seg = new Uint8Array(4 + app13Payload.length);
      app13Seg[0] = 0xff;
      app13Seg[1] = 0xed;
      const segLen = app13Payload.length + 2;
      app13Seg[2] = (segLen >> 8) & 0xff;
      app13Seg[3] = segLen & 0xff;
      app13Seg.set(app13Payload, 4);

      // Insert APP13 after APP0 in MINIMAL_JPEG
      const customJpeg = new Uint8Array(20 + app13Seg.length + (MINIMAL_JPEG.length - 20));
      customJpeg.set(MINIMAL_JPEG.subarray(0, 20), 0);
      customJpeg.set(app13Seg, 20);
      customJpeg.set(MINIMAL_JPEG.subarray(20), 20 + app13Seg.length);

      // Now inject new IPTC metadata
      const updated = injectIptcIntoJpegBuffer(customJpeg, {
        title: "Preserved Test",
        description: "Checking 0x03ED is preserved",
        category: "Tech",
        keywords: ["preserved"],
      });

      const parsed = parseIptcFromJpegBuffer(updated);
      expect(parsed.title).toBe("Preserved Test");

      // Verify that 0x03ED block is still present in the updated JPEG
      let has03ED = false;
      for (let i = 0; i < updated.length - 6; i++) {
        if (
          updated[i] === 0x38 &&
          updated[i + 1] === 0x42 &&
          updated[i + 2] === 0x49 &&
          updated[i + 3] === 0x4d &&
          updated[i + 4] === 0x03 &&
          updated[i + 5] === 0xed
        ) {
          has03ED = true;
          break;
        }
      }
      expect(has03ED).toBe(true);
    });
  });

  describe("Async Helper injectIptcMetadata", () => {
    it("should accept Uint8Array and return a Blob of type image/jpeg", async () => {
      const blob = await injectIptcMetadata(MINIMAL_JPEG, sampleMetadata);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe("image/jpeg");

      const arrayBuffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const parsed = parseIptcFromJpegBuffer(bytes);

      expect(parsed.title).toBe(sampleMetadata.title);
      expect(parsed.keywords).toEqual(sampleMetadata.keywords);
    });

    it("should accept ArrayBuffer and return a Blob with injected IPTC", async () => {
      const buffer = MINIMAL_JPEG.buffer.slice(
        MINIMAL_JPEG.byteOffset,
        MINIMAL_JPEG.byteOffset + MINIMAL_JPEG.byteLength
      );

      const blob = await injectIptcMetadata(buffer, sampleMetadata);
      expect(blob.type).toBe("image/jpeg");

      const arrayBuffer = await blob.arrayBuffer();
      const parsed = parseIptcFromJpegBuffer(new Uint8Array(arrayBuffer));
      expect(parsed.title).toBe(sampleMetadata.title);
    });

    it("should accept Blob and return a new Blob with injected IPTC", async () => {
      const inputBlob = new Blob([MINIMAL_JPEG], { type: "image/jpeg" });
      const outputBlob = await injectIptcMetadata(inputBlob, sampleMetadata);

      expect(outputBlob.type).toBe("image/jpeg");
      const ab = await outputBlob.arrayBuffer();
      const parsed = parseIptcFromJpegBuffer(new Uint8Array(ab));
      expect(parsed.title).toBe(sampleMetadata.title);
    });

    it("should handle non-JPEG image input (PNG) gracefully via converter fallback", async () => {
      // 8-byte PNG signature
      const pngHeader = new Uint8Array([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]);
      const pngBlob = new Blob([pngHeader], { type: "image/png" });

      const outputBlob = await injectIptcMetadata(pngBlob, sampleMetadata);
      expect(outputBlob.type).toBe("image/jpeg");

      const ab = await outputBlob.arrayBuffer();
      const parsed = parseIptcFromJpegBuffer(new Uint8Array(ab));
      expect(parsed.title).toBe(sampleMetadata.title);
    });

    it("should reject corrupted or unsupported non-image input", async () => {
      const textBlob = new Blob(["random text file contents"], {
        type: "text/plain",
      });

      await expect(
        injectIptcMetadata(textBlob, sampleMetadata)
      ).rejects.toThrow(/unsupported image format/i);
    });
  });
});
