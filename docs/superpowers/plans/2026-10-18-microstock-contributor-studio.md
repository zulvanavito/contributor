# Microstock Contributor Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun aplikasi web studio mikrostock modern (Next.js + ShadCN UI + Tailwind CSS) yang siap dideploy ke Vercel Free Tier untuk menghasilkan gambar AI komersial (100% gratis), menganalisis gambar untuk mengekstrak metadata stok foto (judul, deskripsi, kategori, 30–50 kata kunci dalam bahasa Inggris via Gemini Flash Free Tier), menyalin metadata dengan satu klik, dan mengunduh file JPEG dengan metadata IPTC otomatis tertanam.

**Architecture:** Menggunakan arsitektur terpisah (*decoupled providers*) di mana pembuatan gambar (Pollinations/Flux) dan ekstraksi metadata (Gemini Flash Vision) berjalan independen. Seluruh manipulasi biner file gambar (injeksi IPTC) dan penyimpanan API Key dilakukan secara privat di sisi klien (*browser-side / localStorage*), menjaga konsumsi kuota Vercel Free Tier tetap 0 dan bebas dari *serverless timeout*.

**Tech Stack:** Next.js 14+ (App Router, TypeScript), Tailwind CSS, ShadCN UI (Radix UI primitives, Lucide Icons, Sonner toast), `@google/genai` / REST API Google AI Studio, `piexifjs` / pure TypeScript IPTC buffer writer.

**Spec:** [docs/superpowers/specs/2026-10-18-microstock-contributor-studio-design.md](file:///d:/01%20Projects/contributor/docs/superpowers/specs/2026-10-18-microstock-contributor-studio-design.md)

---

## Global Constraints

- **Vercel Free Tier:** Serverless API routes harus ringan (hanya proxy API teks/URL); tidak boleh ada pemrosesan file biner berat di serverless function.
- **Antislop Mode 1 (DURING):**
  - Bebas dari em dash (`—`) di teks UI (R-02).
  - Desain sepenuhnya responsif di semua ukuran layar tanpa overflow horizontal (R-03).
  - Kontras teks memenuhi standar WCAG AA (minimal 4.5:1 untuk normal text, 3:1 untuk large text) (R-25).
  - Semua tombol dan link interaktif harus berfungsi nyata, tanpa tombol mati (R-26).
  - Tiga status UI wajib: Empty State, Loading Skeleton, dan Error State yang informatif (R-27).
  - Dapat dioperasikan penuh melalui keyboard (Tab, Enter, Escape) dengan indikator fokus yang jelas (R-32).
  - Palet warna konsisten monokromatik netral (Slate/Zinc) dengan aksen fungsional terarah (R-29, R-31).
- **100% Zero-Cost Out of the Box:** Generator gambar default (Pollinations/Flux) tidak memerlukan kartu kredit atau API key; ekstraktor metadata menggunakan Google AI Studio Free Tier API Key.
- **Standar Agensi Mikrostock:**
  - Metadata selalu dalam bahasa Inggris komersial yang relevan.
  - Gambar diekspor dengan resolusi di atas 4 Megapiksel (>2048px).
  - File JPEG menyematkan record standar IPTC IIM (2:05 ObjectName, 2:120 Caption-Abstract, 2:25 Keywords).

---

## Review Focus

1. **Gemini API Key Kosong atau Tidak Valid:** Menampilkan pesan error yang ramah di UI dengan tombol langsung membuka modal Settings untuk memasukkan/memperbaiki API Key.
2. **Unggah File Format/Ukuran Tidak Didukung:** Validasi di sisi klien menolak file non-gambar (hanya menerima JPEG, PNG, WebP) dan file > 25MB dengan notifikasi toast jelas.
3. **Kegagalan Jaringan / Timeout saat Generate Gambar:** Menampilkan error state dengan tombol coba lagi (*Retry*) tanpa mereset prompt yang sudah diketik pengguna.
4. **Prompt Kosong saat Klik Enhance:** Tombol dinonaktifkan jika prompt kosong, mencegah panggilan API yang sia-sia.
5. **Injeksi IPTC pada Format Non-JPEG:** Otomatis mengonversi canvas/data gambar PNG atau WebP ke JPEG biner berkualitas tinggi sebelum menyematkan IPTC dan mengunduh.

---

## Task Breakdown

### Task 1: Inisialisasi Proyek, Tailwind CSS & Konfigurasi ShadCN UI

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `components.json`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`
- Components: `components/ui/button.tsx`, `components/ui/card.tsx`, `components/ui/badge.tsx`, `components/ui/dialog.tsx`, `components/ui/tabs.tsx`, `components/ui/textarea.tsx`, `components/ui/select.tsx`, `components/ui/skeleton.tsx`
- Test: `tests/setup.test.ts`

**Interfaces:**
- Produces: Komponen dasar ShadCN UI, font sans inter/system, utilitas `cn()` (`lib/utils.ts`), dan ThemeProvider.

- [ ] **Step 1: Inisialisasi Next.js app dengan TypeScript & Tailwind**
  Jalankan scaffolding Next.js (App Router, Tailwind CSS, TypeScript).
- [ ] **Step 2: Konfigurasi `components.json` dan pasang komponen inti ShadCN UI**
  Pasang library Radix UI, Lucide React, class-variance-authority, clsx, tailwind-merge, dan sonner.
- [ ] **Step 3: Konfigurasi font & tema netral (Slate/Zinc) di `globals.css` sesuai antislop**
  Pastikan CSS variables mematuhi kontras WCAG AA di light dan dark mode.
- [ ] **Step 4: Buat unit test dasar verifikasi build dan utilitas `cn()`**
  Jalankan test dan pastikan `npm run build` berhasil.
- [ ] **Step 5: Commit**
  `git commit -m "chore: scaffold next.js project with shadcn ui and tailwind css"`

---

### Task 2: Provider Abstraction & Integrasi Model AI

**Files:**
- Create: `lib/types.ts`
- Create: `lib/providers/image-gen.ts`
- Create: `lib/providers/metadata-analysis.ts`
- Create: `app/api/generate-image/route.ts`
- Create: `app/api/analyze-metadata/route.ts`
- Test: `tests/providers.test.ts`

**Interfaces:**
- Consumes: Prompt string, image base64, API keys.
- Produces:
  ```typescript
  export interface StockMetadata {
    title: string;
    description: string;
    category: string;
    keywords: string[];
  }
  export interface ImageGenResult {
    imageUrl: string;
    width: number;
    height: number;
  }
  ```

- [ ] **Step 1: Tulis unit test untuk `PollinationsProvider` dan parser metadata Gemini**
  Uji bahwa prompt berhasil dikonstruksi menjadi URL Pollinations Flux resolusi tinggi (>2048px) dan parser JSON metadata mengekstrak title, description, category, dan 30-50 keywords.
- [ ] **Step 2: Implementasi tipe dan antarmuka di `lib/types.ts`**
  Definisikan `StockMetadata`, `ImageGenOptions`, `ImageGenProvider`, dan `MetadataAnalysisProvider`.
- [ ] **Step 3: Implementasi `PollinationsProvider` di `lib/providers/image-gen.ts`**
  Bangun URL gambar resolusi tinggi (misal `https://image.pollinations.ai/prompt/...`) dengan parameter lebar/tinggi >2048px dan seed acak.
- [ ] **Step 4: Implementasi `GeminiFlashProvider` di `lib/providers/metadata-analysis.ts`**
  Bangun prompt sistem Gemini Flash Vision yang ketat: output JSON valid, bahasa Inggris komersial, bebas trademark, 30-50 keywords berhierarki.
- [ ] **Step 5: Buat endpoint serverless `/api/generate-image` dan `/api/analyze-metadata`**
  Validasi payload, tangani error (API key tidak valid, kuota habis), dan kembalikan JSON terstruktur.
- [ ] **Step 6: Jalankan test dan verifikasi semua provider berfungsi**
- [ ] **Step 7: Commit**
  `git commit -m "feat: implement decoupled ai provider abstraction and api routes"`

---

### Task 3: Fitur Penyempurna Prompt (Enhance / Translate Prompt)

**Files:**
- Create: `app/api/enhance-prompt/route.ts`
- Modify: `lib/providers/metadata-analysis.ts`
- Test: `tests/enhance-prompt.test.ts`

**Interfaces:**
- Consumes: Prompt teks (bahasa Indonesia atau Inggris).
- Produces: `{ enhancedPrompt: string, originalPrompt: string }`

- [ ] **Step 1: Tulis unit test untuk enhance prompt API**
  Uji bahwa prompt bahasa Indonesia seperti "kedai kopi minimalis sore hari" diubah menjadi prompt bahasa Inggris komersial fotografi mikrostock.
- [ ] **Step 2: Implementasi prompt engineering untuk Gemini Flash di `/api/enhance-prompt`**
  Instruksikan model untuk menerjemahkan ke bahasa Inggris, menambahkan detail pencahayaan komersial, sudut kamera, komposisi bebas trademark, dan copy space.
- [ ] **Step 3: Jalankan test verifikasi**
- [ ] **Step 4: Commit**
  `git commit -m "feat: implement prompt enhancement and translation endpoint"`

---

### Task 4: Injektor Metadata IPTC Client-Side ke JPEG

**Files:**
- Create: `lib/iptc-writer.ts`
- Test: `tests/iptc-writer.test.ts`

**Interfaces:**
- Consumes: `imageBlob: Blob`, `metadata: StockMetadata`.
- Produces: `Promise<Blob>` (JPEG Blob yang sudah disisipkan record IPTC IIM: 2:05 Title, 2:120 Description, 2:25 Keywords).

- [ ] **Step 1: Tulis unit test untuk verifikasi penulisan segmen IPTC pada JPEG biner**
  Uji bahwa buffer JPEG yang diproses menghasilkan marker APP13 (`0xFFED`) yang valid dan memuat string Title serta Keywords.
- [ ] **Step 2: Implementasi utilitas penulisan IPTC biner di `lib/iptc-writer.ts`**
  Konstruksi blok biner IPTC IIM:
  - Record 2:05 (ObjectName / Title)
  - Record 2:120 (Caption-Abstract / Description)
  - Record 2:25 (Keywords berturut-turut untuk tiap tag)
  Sisipkan ke dalam segmen APP13 Photoshop Image Resource Block (IRB `0x0404`).
- [ ] **Step 3: Tambahkan fallback konversi canvas jika gambar sumber berformat PNG/WebP**
- [ ] **Step 4: Jalankan test dan verifikasi integritas file output**
- [ ] **Step 5: Commit**
  `git commit -m "feat: implement client-side jpeg iptc metadata injector"`

---

### Task 5: Modal Pengaturan (Settings Dialog) & LocalStorage Store

**Files:**
- Create: `lib/storage.ts`
- Create: `components/settings-dialog.tsx`
- Test: `tests/storage.test.ts`

**Interfaces:**
- Consumes: LocalStorage API.
- Produces: `useSettingsStore` hook / fungsi get/set API Key dan provider aktif.

- [ ] **Step 1: Tulis unit test untuk `lib/storage.ts`**
  Uji persistensi Gemini API key, preferensi model, dan default settings di browser storage.
- [ ] **Step 2: Implementasi `lib/storage.ts` dengan penanganan aman saat SSR (server-side rendering)**
- [ ] **Step 3: Buat komponen `components/settings-dialog.tsx` menggunakan ShadCN Dialog**
  Input password/text untuk Gemini API Key, tautan langsung ke Google AI Studio, tombol tes koneksi, dan tombol simpan.
- [ ] **Step 4: Verifikasi aksesibilitas keyboard (Escape menutup dialog, Tab fokus logis)**
- [ ] **Step 5: Commit**
  `git commit -m "feat: implement settings dialog and localstorage key management"`

---

### Task 6: Antarmuka Studio Utama (Studio Tunggal Split View)

**Files:**
- Create: `components/studio/studio-layout.tsx`
- Create: `components/studio/input-panel.tsx`
- Create: `components/studio/preview-panel.tsx`
- Create: `components/studio/metadata-card.tsx`
- Create: `components/studio/keyword-chips.tsx`
- Modify: `app/page.tsx`
- Test: `tests/studio-ui.test.ts`

**Interfaces:**
- Consumes: Task 2 API routes, Task 3 Enhance prompt, Task 4 IPTC writer, Task 5 Settings.
- Produces: Komponen halaman utama studio mikrostock lengkap.

- [ ] **Step 1: Buat `components/studio/input-panel.tsx`**
  - ShadCN Tabs: "Generate Baru" dan "Upload File".
  - Textarea prompt + tombol "✨ Enhance".
  - Select rasio aspek (16:9, 3:2, 1:1, 9:16) dan Preset Gaya.
  - Dropzone upload gambar dengan validasi format & ukuran.
  - Tombol aksi utama dengan status loading terintegrasi.
- [ ] **Step 2: Buat `components/studio/preview-panel.tsx` & `metadata-card.tsx`**
  - Area gambar resolusi tinggi dengan Empty State (ilustrasi/ikon bersahaja saat belum ada gambar) dan Loading Skeleton saat proses berlangsung.
  - Field Judul + Tombol Copy (dengan toast Sonner "Judul berhasil disalin").
  - Field Deskripsi + Tombol Copy.
  - Badge Kategori.
  - `keyword-chips.tsx`: Tampilan kata kunci interaktif (bisa klik untuk salin per kata, tombol hapus tag, input tambah tag baru) + Tombol "Salin Semua Tag (Koma)".
  - Tombol Utama "💾 Unduh JPEG (IPTC Tertanam)" dan tombol sekunder "Unduh Gambar Mentah".
- [ ] **Step 3: Integrasikan seluruh komponen di `components/studio/studio-layout.tsx` dan `app/page.tsx`**
- [ ] **Step 4: Pastikan kepatuhan Antislop (C-1 s/d C-5, R-02 tanpa em dash, R-03 responsif tanpa overflow, R-25 kontras teks AA)**
- [ ] **Step 5: Commit**
  `git commit -m "feat: implement complete split-view studio interface with shadcn ui"`

---

### Task 7: Verifikasi Menyeluruh, Audit Antislop & Optimasi Vercel Build

**Files:**
- Modify: `README.md`
- Create: `docs/superpowers/antislop-delivery-gate.md`
- Test: Build verification (`npm run build`), lint check (`npm run lint`), typecheck (`tsc --noEmit`)

- [ ] **Step 1: Jalankan typecheck dan verifikasi zero TypeScript errors**
  `npm run build`
- [ ] **Step 2: Uji coba alur kerja lengkap (End-to-End)**
  - Uji Mode 1: Ketik prompt -> Enhance -> Generate -> Metadata terisi -> Salin tags -> Unduh JPEG.
  - Uji Mode 2: Upload file -> Ekstraksi metadata -> Unduh JPEG.
- [ ] **Step 3: Verifikasi metadata IPTC di file JPEG hasil unduhan**
  Pastikan field ObjectName dan Keywords terbaca oleh parser gambar standar.
- [ ] **Step 4: Jalankan Antislop Delivery Gate checklist (Block 1 s/d 4) dan laporkan hasilnya**
- [ ] **Step 5: Buat dokumentasi panduan deploy ke Vercel di `README.md`**
- [ ] **Step 6: Commit**
  `git commit -m "chore: complete verification, antislop delivery gate, and vercel deployment guide"`

---

## Plan Verification

Setelah menyelesaikan seluruh task, verifikasi akhir mencakup:
1. `npm run build` sukses 100% tanpa error.
2. Pengguna dapat langsung membuka web, membuat gambar, dan menyalin metadata tanpa keluar biaya sepeser pun.
3. File JPEG yang diunduh langsung siap diunggah ke Adobe Stock Contributor dan Shutterstock Contributor dengan judul dan tag terisi otomatis.
