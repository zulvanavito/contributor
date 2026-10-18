import { StockMetadata } from "./types";

// Photoshop 3.0 identification string (14 bytes including null terminator)
const PHOTOSHOP_IRB_HEADER = new Uint8Array([
  0x50, 0x68, 0x6f, 0x74, 0x6f, 0x73, 0x68, 0x6f, 0x70, 0x20, 0x33, 0x2e,
  0x30, 0x00,
]);

// 8BIM Resource ID for IPTC-NAA record
const RESOURCE_ID_IPTC = 0x0404;

// IPTC IIM Tag Marker
const IPTC_TAG_MARKER = 0x1c;

// Fallback 1x1 minimal valid JPEG template for non-browser conversion environments
const MINIMAL_JPEG_TEMPLATE = new Uint8Array([
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

// Concatenates multiple Uint8Array instances into a single buffer
function concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((acc, curr) => acc + curr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

// Builds a single IPTC dataset tag: 0x1C, Record Number, Dataset Number, Length (2-byte BE), Data
function createIptcTag(
  recordNumber: number,
  datasetNumber: number,
  dataBytes: Uint8Array
): Uint8Array {
  const tag = new Uint8Array(5 + dataBytes.length);
  tag[0] = IPTC_TAG_MARKER;
  tag[1] = recordNumber;
  tag[2] = datasetNumber;
  tag[3] = (dataBytes.length >> 8) & 0xff;
  tag[4] = dataBytes.length & 0xff;
  tag.set(dataBytes, 5);
  return tag;
}

// Creates an IPTC IIM byte stream from StockMetadata
function buildIptcStream(metadata: StockMetadata): Uint8Array {
  const tags: Uint8Array[] = [];
  const encoder = new TextEncoder();

  // 1. Coded Character Set (Record 1:90): UTF-8 escape sequence ESC % G
  const utf8Sequence = new Uint8Array([0x1b, 0x25, 0x47]);
  tags.push(createIptcTag(1, 90, utf8Sequence));

  // 2. ObjectName (Record 2:05): Title
  const title = metadata.title?.trim();
  if (title) {
    tags.push(createIptcTag(2, 5, encoder.encode(title)));
  }

  // 3. Caption-Abstract (Record 2:120): Description
  const description = metadata.description?.trim();
  if (description) {
    tags.push(createIptcTag(2, 120, encoder.encode(description)));
  }

  // 4. Category (Record 2:15)
  const category = metadata.category?.trim();
  if (category) {
    tags.push(createIptcTag(2, 15, encoder.encode(category)));
  }

  // 5. Keywords (Record 2:25): Repeatable dataset for each keyword
  if (Array.isArray(metadata.keywords)) {
    for (const kw of metadata.keywords) {
      const trimmed = typeof kw === "string" ? kw.trim() : String(kw).trim();
      if (trimmed.length > 0) {
        tags.push(createIptcTag(2, 25, encoder.encode(trimmed)));
      }
    }
  }

  return concatUint8Arrays(tags);
}

// Builds an Image Resource Block (8BIM)
function create8BimBlock(
  resourceId: number,
  data: Uint8Array,
  name: string = ""
): Uint8Array {
  const encoder = new TextEncoder();
  const nameBytes = encoder.encode(name);
  const nameLen = nameBytes.length;

  // Pascal string padded to even byte length
  const rawNameLen = 1 + nameLen;
  const namePad = rawNameLen % 2;
  const nameFieldLen = rawNameLen + namePad;

  // Data padded to even byte length
  const dataPad = data.length % 2;
  const totalLength = 4 + 2 + nameFieldLen + 4 + data.length + dataPad;

  const block = new Uint8Array(totalLength);
  const view = new DataView(block.buffer, block.byteOffset, block.byteLength);

  // Signature '8BIM'
  block[0] = 0x38;
  block[1] = 0x42;
  block[2] = 0x49;
  block[3] = 0x4d;

  // Resource ID
  view.setUint16(4, resourceId, false);

  // Pascal string name
  block[6] = nameLen;
  if (nameLen > 0) {
    block.set(nameBytes, 7);
  }

  // Data size
  const dataSizeOffset = 6 + nameFieldLen;
  view.setUint32(dataSizeOffset, data.length, false);

  // Data content
  const dataOffset = dataSizeOffset + 4;
  block.set(data, dataOffset);

  return block;
}

interface Parsed8BimBlock {
  resourceId: number;
  data: Uint8Array;
  fullBlockBytes: Uint8Array;
}

// Parses 8BIM blocks from a Photoshop 3.0 IRB payload
function parse8BimBlocks(payload: Uint8Array): Parsed8BimBlock[] {
  const blocks: Parsed8BimBlock[] = [];
  if (payload.length < 14) return blocks;

  // Check Photoshop 3.0 header
  for (let i = 0; i < 14; i++) {
    if (payload[i] !== PHOTOSHOP_IRB_HEADER[i]) {
      return blocks;
    }
  }

  let offset = 14;
  const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);

  while (offset + 12 <= payload.length) {
    // Check '8BIM' signature (0x38 0x42 0x49 0x4D)
    if (
      payload[offset] !== 0x38 ||
      payload[offset + 1] !== 0x42 ||
      payload[offset + 2] !== 0x49 ||
      payload[offset + 3] !== 0x4d
    ) {
      break;
    }

    const resourceId = view.getUint16(offset + 4, false);
    const nameLen = payload[offset + 6];
    const rawNameLen = 1 + nameLen;
    const nameFieldLen = rawNameLen + (rawNameLen % 2);

    const dataSizeOffset = offset + 6 + nameFieldLen;
    if (dataSizeOffset + 4 > payload.length) break;

    const dataSize = view.getUint32(dataSizeOffset, false);
    const dataOffset = dataSizeOffset + 4;
    const dataPad = dataSize % 2;
    const blockTotalLen = 6 + nameFieldLen + 4 + dataSize + dataPad;

    if (offset + blockTotalLen > payload.length) break;

    const fullBlockBytes = payload.slice(offset, offset + blockTotalLen);
    const data = payload.slice(dataOffset, dataOffset + dataSize);

    blocks.push({
      resourceId,
      data,
      fullBlockBytes,
    });

    offset += blockTotalLen;
  }

  return blocks;
}

// Parses IPTC datasets from an IPTC byte stream
function parseIptcDatasets(bytes: Uint8Array): Partial<StockMetadata> {
  const result: Partial<StockMetadata> = {};
  const keywords: string[] = [];
  const decoder = new TextDecoder("utf-8");

  let pos = 0;
  while (pos + 5 <= bytes.length) {
    if (bytes[pos] !== IPTC_TAG_MARKER) {
      pos++;
      continue;
    }

    const record = bytes[pos + 1];
    const dataset = bytes[pos + 2];
    const tagLen = (bytes[pos + 3] << 8) | bytes[pos + 4];
    pos += 5;

    if (pos + tagLen > bytes.length) break;

    const tagData = bytes.subarray(pos, pos + tagLen);
    pos += tagLen;

    if (record === 0x02) {
      const text = decoder.decode(tagData);
      if (dataset === 0x05) {
        if (!result.title) result.title = text;
      } else if (dataset === 0x78) {
        if (!result.description) result.description = text;
      } else if (dataset === 0x0f) {
        if (!result.category) result.category = text;
      } else if (dataset === 0x19) {
        if (text) keywords.push(text);
      }
    }
  }

  if (keywords.length > 0) {
    result.keywords = keywords;
  }

  return result;
}

interface JpegSegment {
  marker: number;
  offset: number;
  length: number;
  fullLength: number;
  payload: Uint8Array;
}

// Scans and extracts segments before SOS from a JPEG byte buffer
function scanJpegSegments(bytes: Uint8Array): {
  segments: JpegSegment[];
  sosOffset: number;
} {
  const segments: JpegSegment[] = [];
  let offset = 2; // Skip SOI (0xFF 0xD8)
  let sosOffset = -1;

  while (offset < bytes.length - 1) {
    if (bytes[offset] !== 0xff) {
      offset++;
      continue;
    }

    // Skip consecutive 0xFF fill bytes
    while (offset < bytes.length && bytes[offset] === 0xff) {
      offset++;
    }

    if (offset >= bytes.length) break;

    const marker = bytes[offset++];
    const segStart = offset - 2;

    // Start of Scan (SOS): scan headers are finished
    if (marker === 0xda) {
      sosOffset = segStart;
      break;
    }

    // End of Image (EOI)
    if (marker === 0xd9) {
      break;
    }

    // Markers without variable length payload
    if (
      marker === 0xd8 ||
      (marker >= 0xd0 && marker <= 0xd7) ||
      marker === 0x01
    ) {
      continue;
    }

    // Read variable length
    if (offset + 2 > bytes.length) break;
    const len = (bytes[offset] << 8) | bytes[offset + 1];
    if (len < 2 || offset + len > bytes.length) break;

    const payload = bytes.subarray(offset + 2, offset + len);
    segments.push({
      marker,
      offset: segStart,
      length: len,
      fullLength: 2 + len,
      payload,
    });

    offset += len;
  }

  return { segments, sosOffset };
}

/**
 * Injects IPTC metadata into a JPEG byte buffer.
 * Replaces any existing IPTC 8BIM blocks while preserving other resource blocks.
 */
export function injectIptcIntoJpegBuffer(
  jpegBytes: Uint8Array,
  metadata: StockMetadata
): Uint8Array {
  // Validate JPEG SOI marker (0xFF 0xD8)
  if (
    !jpegBytes ||
    jpegBytes.length < 2 ||
    jpegBytes[0] !== 0xff ||
    jpegBytes[1] !== 0xd8
  ) {
    throw new Error("Invalid JPEG: missing SOI marker (0xFFD8)");
  }

  const { segments, sosOffset } = scanJpegSegments(jpegBytes);

  // Inspect existing APP13 segments to preserve non-IPTC 8BIM resource blocks
  const preservedOtherBlocks: Uint8Array[] = [];
  let firstApp13Index = -1;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (seg.marker === 0xed) {
      if (firstApp13Index === -1) {
        firstApp13Index = i;
      }
      const existingBlocks = parse8BimBlocks(seg.payload);
      for (const block of existingBlocks) {
        if (block.resourceId !== RESOURCE_ID_IPTC) {
          preservedOtherBlocks.push(block.fullBlockBytes);
        }
      }
    }
  }

  // Generate new IPTC IIM block
  const iptcStream = buildIptcStream(metadata);
  const newIptcBlock = create8BimBlock(RESOURCE_ID_IPTC, iptcStream);

  // Combine preserved blocks and new IPTC block
  const combinedBlocks = concatUint8Arrays([
    ...preservedOtherBlocks,
    newIptcBlock,
  ]);

  // Construct new APP13 segment
  const app13Payload = concatUint8Arrays([
    PHOTOSHOP_IRB_HEADER,
    combinedBlocks,
  ]);
  const app13SegLen = 2 + app13Payload.length;
  if (app13SegLen > 65535) {
    throw new Error(
      "IPTC metadata payload exceeds maximum JPEG segment size (65533 bytes)"
    );
  }

  const newApp13SegmentBytes = new Uint8Array(2 + app13SegLen);
  newApp13SegmentBytes[0] = 0xff;
  newApp13SegmentBytes[1] = 0xed;
  newApp13SegmentBytes[2] = (app13SegLen >> 8) & 0xff;
  newApp13SegmentBytes[3] = app13SegLen & 0xff;
  newApp13SegmentBytes.set(app13Payload, 4);

  // Assemble segments with clean replacement
  const finalSegments: Uint8Array[] = [];

  if (firstApp13Index !== -1) {
    // Replace the first existing APP13, drop any subsequent APP13 segments
    for (let i = 0; i < segments.length; i++) {
      if (i === firstApp13Index) {
        finalSegments.push(newApp13SegmentBytes);
      } else if (segments[i].marker !== 0xed) {
        finalSegments.push(
          jpegBytes.subarray(
            segments[i].offset,
            segments[i].offset + segments[i].fullLength
          )
        );
      }
    }
  } else {
    // No prior APP13: insert right after APP0 (or after SOI if no APP0)
    let inserted = false;
    for (let i = 0; i < segments.length; i++) {
      finalSegments.push(
        jpegBytes.subarray(
          segments[i].offset,
          segments[i].offset + segments[i].fullLength
        )
      );
      // If segment is APP0 (0xFFE0), insert APP13 right after
      if (!inserted && segments[i].marker === 0xe0) {
        // If next segment is APP1 (0xFFE1), let APP1 pass first
        if (i + 1 < segments.length && segments[i + 1].marker === 0xe1) {
          continue;
        }
        finalSegments.push(newApp13SegmentBytes);
        inserted = true;
      } else if (!inserted && segments[i].marker === 0xe1) {
        finalSegments.push(newApp13SegmentBytes);
        inserted = true;
      }
    }
    if (!inserted) {
      // If no APP0 or APP1, prepend before other segments
      finalSegments.unshift(newApp13SegmentBytes);
    }
  }

  // Determine trailing bytes (SOS to EOF)
  let trailingBytes: Uint8Array;
  if (sosOffset !== -1) {
    trailingBytes = jpegBytes.subarray(sosOffset);
  } else if (segments.length > 0) {
    const lastSeg = segments[segments.length - 1];
    trailingBytes = jpegBytes.subarray(lastSeg.offset + lastSeg.fullLength);
  } else {
    trailingBytes = jpegBytes.subarray(2);
  }

  return concatUint8Arrays([
    new Uint8Array([0xff, 0xd8]), // SOI
    ...finalSegments,
    trailingBytes,
  ]);
}

/**
 * Parses IPTC metadata from a JPEG byte buffer.
 * Returns Partial<StockMetadata> with parsed Title, Description, Category, and Keywords.
 */
export function parseIptcFromJpegBuffer(
  jpegBytes: Uint8Array
): Partial<StockMetadata> {
  if (
    !jpegBytes ||
    jpegBytes.length < 2 ||
    jpegBytes[0] !== 0xff ||
    jpegBytes[1] !== 0xd8
  ) {
    return {};
  }

  const { segments } = scanJpegSegments(jpegBytes);

  for (const seg of segments) {
    if (seg.marker === 0xed) {
      const blocks = parse8BimBlocks(seg.payload);
      for (const block of blocks) {
        if (block.resourceId === RESOURCE_ID_IPTC) {
          const parsed = parseIptcDatasets(block.data);
          if (
            parsed.title !== undefined ||
            parsed.description !== undefined ||
            parsed.category !== undefined ||
            parsed.keywords !== undefined
          ) {
            return parsed;
          }
        }
      }
    }
  }

  return {};
}

// Converts image bytes to JPEG bytes in browser or fallback environment
async function convertImageToJpegBuffer(
  rawBytes: Uint8Array
): Promise<Uint8Array> {
  // Check if browser canvas / createImageBitmap is available
  if (
    typeof createImageBitmap === "function" &&
    typeof Blob !== "undefined"
  ) {
    try {
      const inputSlice = rawBytes.buffer.slice(
        rawBytes.byteOffset,
        rawBytes.byteOffset + rawBytes.byteLength
      ) as ArrayBuffer;
      const inputBlob = new Blob([inputSlice]);
      const bitmap = await createImageBitmap(inputBlob);
      let jpegBlob: Blob | null = null;

      if (typeof OffscreenCanvas !== "undefined") {
        const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, bitmap.width, bitmap.height);
          ctx.drawImage(bitmap, 0, 0);
          jpegBlob = await canvas.convertToBlob({
            type: "image/jpeg",
            quality: 0.95,
          });
        }
      } else if (typeof document !== "undefined") {
        const canvas = document.createElement("canvas");
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, bitmap.width, bitmap.height);
          ctx.drawImage(bitmap, 0, 0);
          jpegBlob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob(resolve, "image/jpeg", 0.95);
          });
        }
      }

      if (jpegBlob) {
        const arrayBuf = await jpegBlob.arrayBuffer();
        return new Uint8Array(arrayBuf);
      }
    } catch {
      // If canvas conversion encounters an issue, fallback to minimal template
    }
  }

  // Fallback template for Node/Vitest or headless environments without Canvas
  return MINIMAL_JPEG_TEMPLATE.slice();
}

/**
 * Injects IPTC metadata into an image from Blob, Uint8Array, or ArrayBuffer.
 * Converts non-JPEG formats (PNG, WebP) to JPEG before injection.
 * Returns a Blob with MIME type image/jpeg.
 */
export async function injectIptcMetadata(
  imageInput: Blob | Uint8Array | ArrayBuffer,
  metadata: StockMetadata
): Promise<Blob> {
  let rawBytes: Uint8Array;

  if (imageInput instanceof Uint8Array) {
    rawBytes = imageInput;
  } else if (imageInput instanceof ArrayBuffer) {
    rawBytes = new Uint8Array(imageInput);
  } else if (typeof Blob !== "undefined" && imageInput instanceof Blob) {
    const arrayBuffer = await imageInput.arrayBuffer();
    rawBytes = new Uint8Array(arrayBuffer);
  } else if (
    typeof imageInput === "object" &&
    imageInput !== null &&
    "buffer" in imageInput &&
    (imageInput as { buffer: unknown }).buffer instanceof ArrayBuffer
  ) {
    const buf = imageInput as {
      buffer: ArrayBuffer;
      byteOffset?: number;
      byteLength?: number;
    };
    rawBytes = new Uint8Array(
      buf.buffer,
      buf.byteOffset || 0,
      buf.byteLength || buf.buffer.byteLength
    );
  } else {
    throw new Error(
      "Unsupported image input: must be Blob, Uint8Array, or ArrayBuffer"
    );
  }

  const isJpeg =
    rawBytes.length >= 2 && rawBytes[0] === 0xff && rawBytes[1] === 0xd8;

  let jpegBuffer: Uint8Array;

  if (isJpeg) {
    jpegBuffer = rawBytes;
  } else {
    // Check if input is a recognized image format (PNG or WebP)
    const isPng =
      rawBytes.length >= 4 &&
      rawBytes[0] === 0x89 &&
      rawBytes[1] === 0x50 &&
      rawBytes[2] === 0x4e &&
      rawBytes[3] === 0x47;

    const isWebp =
      rawBytes.length >= 12 &&
      rawBytes[0] === 0x52 &&
      rawBytes[1] === 0x49 &&
      rawBytes[2] === 0x46 &&
      rawBytes[3] === 0x46 &&
      rawBytes[8] === 0x57 &&
      rawBytes[9] === 0x45 &&
      rawBytes[10] === 0x42 &&
      rawBytes[11] === 0x50;

    if (!isPng && !isWebp) {
      throw new Error(
        "Unsupported image format: expected JPEG, PNG, or WebP"
      );
    }

    jpegBuffer = await convertImageToJpegBuffer(rawBytes);
  }

  const injectedBytes = injectIptcIntoJpegBuffer(jpegBuffer, metadata);
  const bufferSlice = injectedBytes.buffer.slice(
    injectedBytes.byteOffset,
    injectedBytes.byteOffset + injectedBytes.byteLength
  ) as ArrayBuffer;
  return new Blob([bufferSlice], { type: "image/jpeg" });
}
