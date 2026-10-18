# Dokumen Desain: Microstock Contributor Studio

**Tanggal:** 18 Oktober 2026  
**Topik:** Microstock Contributor Studio (Generator Gambar AI & Ekstraktor Metadata Stok Foto)  
**Target Platform:** Vercel (Free Tier / Hobby Plan) — Next.js, TypeScript, Tailwind CSS  
**Status:** Siap Disetujui  

---

## 1. Maksud dan Tujuan (Intent & The Why)

Kontributor mikrostock yang menjual karya visual di platform seperti Adobe Stock, Shutterstock, Freepik, dan iStock menghadapi hambatan kerja yang berulang dan menyita banyak waktu:
1. Membuat atau mencari ilustrasi dan foto berkualitas komersial tinggi.
2. Menyusun metadata komersial yang patuh standar—terutama judul, deskripsi, kategori, serta 30 hingga 50 kata kunci (*keywords*) bertarget dalam bahasa Inggris.
3. Mengetik atau menyalin (*copy-paste*) tag dan judul tersebut satu per satu ke dalam formulir unggah kontributor.

**Microstock Contributor Studio** memecahkan masalah ini melalui satu aplikasi web terpadu. Pengguna dapat membuat gambar baru dari teks (*prompt*) atau mengunggah gambar yang sudah ada, menghasilkan metadata standar mikrostock secara otomatis menggunakan AI, menyalin metadata dengan satu klik, dan mengunduh file JPEG yang metadatanya sudah otomatis tertanam (IPTC/EXIF) sehingga saat diunggah ke Adobe Stock atau Shutterstock, seluruh kolom judul dan kata kunci langsung terisi otomatis.

---

## 2. Tujuan, Batasan Luar (Non-Goals), dan Anti-Goals

### Tujuan (Goals)
- **Dua Alur Kerja Utama:**
  - *Mode 1 (Generate Gambar AI):* Membuat gambar stok komersial dari prompt teks (mendukung prompt bahasa Indonesia dengan tombol penyempurna ke bahasa Inggris komersial).
  - *Mode 2 (Analisis Gambar yang Ada):* Drag-and-drop unggah gambar milik pengguna (PNG, JPEG, WebP) untuk ekstraksi metadata instan.
- **100% Bebas Biaya (Zero-Cost / Tanpa Kartu Kredit):**
  - *Generator Gambar:* Menggunakan engine gratis tanpa perlu kartu kredit atau akun berbayar (Pollinations / Flux.1 Schnell) sebagai pengaturan awal (*default*), dengan opsi menambahkan API key berbayar (seperti Google Imagen 3 atau model lain) di masa depan.
  - *Ekstraktor Metadata:* Menggunakan Google Gemini 1.5/2.0 Flash Vision melalui kuota *Free Tier* Google AI Studio (tanpa wajib kartu kredit).
  - *Hosting:* Berjalan mulus di Vercel Free Tier (Hobby Plan).
- **Antarmuka Bersih & Aksesibel (ShadCN UI & Antislop Standard):**
  - Menggunakan komponen **ShadCN UI** berbasis Radix UI dan Tailwind CSS untuk tampilan yang konsisten, modern, dan profesional.
  - Menerapkan prinsip ketat **Antislop** (Craftsmanship Standard C-1 s/d C-5): bebas elemen klise AI, hierarki visual jelas, kontras warna memenuhi standar WCAG AA (4.5:1), navigasi keyboard penuh (Tab/Enter/Escape), serta penanganan lengkap untuk semua kondisi UI (kondisi kosong/empty state, loading state dengan skeleton yang jelas, dan error state yang informatif).
- **Metadata Standar Mikrostock Global:**
  - Menghasilkan Judul komersial yang kaya kata kunci (5–15 kata).
  - Menghasilkan Deskripsi yang informatif dan tepat sasaran.
  - Menentukan Kategori utama yang relevan (misalnya: Bisnis, Teknologi, Gaya Hidup, Makanan, Alam).
  - Menghasilkan 30–50 kata kunci (*keywords*) dalam bahasa Inggris, diurutkan berdasarkan tingkat relevansi.
- **Kontrol Clipboard & Salin Cepat:**
  - Tombol 1-klik salin untuk Judul, Deskripsi, dan Kategori.
  - Tombol "Copy All Keywords" (string dipisahkan tanda koma, langsung siap tempel di portal kontributor).
  - Kemampuan menghapus atau menambah tag kata kunci secara interaktif.
- **Metadata IPTC Otomatis Tertanam:**
  - Menanamkan metadata IPTC/EXIF (Judul/ObjectName, Deskripsi/Caption, dan Keywords) langsung ke dalam data biner file JPEG saat diunduh.
  - Memastikan file yang di-*drag-and-drop* ke Adobe Stock Contributor dan Shutterstock langsung terisi metadatanya tanpa salin-tempel manual.
- **Manajemen Pengaturan API Mandiri:**
  - Menu Pengaturan (*Settings Modal*) di website untuk memasukkan dan mengganti API Key Gemini (tersimpan aman di `localStorage` browser pengguna).
  - Arsitektur terpisah (*decoupled*) agar pengguna bisa mengganti model generator gambar atau penganalisis metadata secara independen di kemudian hari.

### Batasan Luar (Non-Goals)
- **Unggah Otomatis Langsung via FTP/API ke Portal Agensi:** Tidak melakukan auto-upload langsung ke akun Adobe Stock atau Shutterstock (agensi mikrostock sering memperbarui sistem proteksi/2FA dan mengharuskan persetujuan lisensi manual oleh kontributor di situs mereka).
- **Sistem Akun / Database Server yang Rumit:** Versi 1 tidak membutuhkan login, registrasi, maupun database eksternal; semua preferensi dan API key disimpan di browser pengguna (*client-side*).
- **Format Video / Vektor EPS:** Fokus rilis awal adalah ilustrasi dan foto format raster (JPEG/PNG).

### Anti-Goals (Hal yang Dilarang Keras)
- **Metadata Selain Bahasa Inggris:** Dilarang menghasilkan judul atau kata kunci dalam bahasa selain bahasa Inggris, karena sistem kurasi global mikrostock akan langsung menolaknya.
- **Ketergantungan Biaya Awal / Kartu Kredit:** Sistem tidak boleh mewajibkan kartu kredit untuk menjalankan fungsi intinya.
- **Membebani Batas Serverless Vercel Free Tier:** Penanaman metadata IPTC dan pengunduhan file harus diproses di sisi klien (*client-side browser*) agar tidak membebani batas kuota dan durasi fungsi Vercel Free Tier (10–60 detik limit).

---

## 3. Batasan Teknis (Constraints)

- **Vercel Free Tier (Hobby Plan):**
  - Batas eksekusi Serverless Function maksimal 10–60 detik.
  - Batas ukuran request payload.
  - Solusi: Seluruh manipulasi biner file gambar (injeksi IPTC) dan trigger download dilakukan langsung di browser (*browser-side*), sehingga server Vercel hanya bertindak sebagai perantara ringan (*proxy*) panggilan API AI.
- **Standar Teknis Mikrostock (Adobe Stock & Shutterstock):**
  - Resolusi minimum: 4 Megapiksel (misal: 2048x2048 atau 2560x1440 piksel).
  - Format file: JPEG standar dengan profil warna sRGB.
  - Ukuran file maksimal: di bawah 100 MB.
- **Kompatibilitas Standar IPTC:**
  - Menulis record standar IPTC IIM (2:05 Judul, 2:120 Deskripsi, 2:25 Keywords) yang dapat dibaca secara akurat oleh sistem parser Adobe Stock dan Shutterstock.

---

## 4. Rancangan Arsitektur & Alur Antarmuka Pengguna

### 4.1 Tata Letak & Komponen (ShadCN UI - Studio Tunggal Split View)
Komponen antarmuka dibangun menggunakan pustaka **ShadCN UI** (Radix UI + Tailwind CSS) dengan palet monokromatik netral profesional (Zinc/Slate) dan aksen warna fungsional:
- **Panel Sisi Kiri (Input & Kontrol):**
  - Pengalih Mode: ShadCN `Tabs` ("Buat Gambar Baru" dan "Upload Gambar Sendiri").
  - *Pada Tab Buat Gambar:*
    - Kolom teks prompt menggunakan ShadCN `Textarea` dengan placeholder deskriptif.
    - Tombol "✨ Enhance Prompt" (ShadCN `Button` variant outline) untuk menerjemahkan dan memperkaya prompt bahasa Indonesia menjadi bahasa Inggris komersial sebelum digenerate.
    - Pilihan Rasio Aspek (ShadCN `Select` atau toggle group berlabel: 16:9 Landscape, 3:2 Foto, 1:1 Persegi, 9:16 Potret).
    - Pilihan Preset Gaya (ShadCN `Select`: Commercial Photography, 3D Render, Vector Illustration, Minimalist, Watercolor).
    - Tombol utama: ShadCN `Button` ("⚡ Generate Gambar & Metadata") dengan state loading terintegrasi (*spinner*).
  - *Pada Tab Upload Gambar:*
    - Area drag-and-drop file gambar dengan validasi tipe mime (JPEG, PNG, WebP) dan thumbnail pratinjau.
    - Tombol utama: ShadCN `Button` ("🔍 Analisis Metadata Gambar").
- **Panel Sisi Kanan (Pratinjau & Hasil Metadata):**
  - Area pratinjau gambar resolusi tinggi dengan aspek rasio terjaga dan mode lightbox.
  - Kartu Metadata Mikrostock (ShadCN `Card`):
    - Kolom Judul (*Title*) + ShadCN `Button` salin cepat (*copy*) dengan indikator toast sukses (Sonner).
    - Kolom Deskripsi (*Description*) + tombol salin cepat.
    - Lencana Kategori (ShadCN `Badge`).
    - Kumpulan chip kata kunci (*keywords*) menggunakan ShadCN `Badge` interaktif (dapat dihapus/ditambah) + indikator jumlah (contoh: "48 / 50") + tombol "Salin Semua Tag (Koma)".
  - Tombol Aksi Pengunduhan:
    - Tombol Utama: ShadCN `Button` variant default ("💾 Unduh JPEG (IPTC Tertanam)") — file langsung terisi judul dan kata kunci di dalamnya.
    - Tombol Sekunder: ShadCN `Button` variant ghost ("Unduh Mentah" atau "Salin JSON").
- **Bilah Atas (Header Bar):**
  - Identitas Produk: Microstock Contributor Studio.
  - Tombol Pengaturan (ShadCN `Dialog` / Modal Settings) untuk konfigurasi API Key.
  - Tombol Tema (Dark/Light mode toggle berbasis `next-themes`).
- **Resiliensi UI (Antislop C-4):**
  - Menyiapkan Empty State (sebelum gambar dibuat/diunggah).
  - Menyiapkan Loading Skeleton (ShadCN `Skeleton`) saat API memproses.
  - Menyiapkan Error State (ShadCN `Alert`) dengan pesan yang jelas jika kuota habis atau jaringan bermasalah.

### 4.2 Arsitektur Sistem
```
[Browser Pengguna]
   │
   ├── Antarmuka React / Next.js (Tailwind CSS)
   ├── Penyimpanan Lokal (LocalStorage: Simpan API Key & Preferensi)
   ├── Injektor IPTC Browser (Menanamkan metadata ke file JPEG secara lokal)
   │
   ▼
[Serverless API Vercel]
   ├── /api/generate-image -> Memanggil Generator Flux (Pollinations) / Google Imagen 3
   └── /api/analyze-metadata -> Memanggil Gemini Flash Vision API (Google AI Studio)
```

### 4.3 Pemisahan Provider AI (Decoupled Provider Architecture)
Untuk menjamin fleksibilitas dan keterbebasan dari biaya:
```typescript
export interface ImageGenProvider {
  id: string;
  name: string;
  generateImage(prompt: string, options: ImageGenOptions, apiKey?: string): Promise<string>;
}

export interface MetadataAnalysisProvider {
  id: string;
  name: string;
  analyzeMetadata(imageBase64: string, apiKey: string): Promise<StockMetadata>;
}
```
- **Penyedia Default:**
  - Pembuat Gambar: `PollinationsProvider` (100% gratis, tanpa API key, tanpa kartu kredit).
  - Penganalisis Metadata: `GeminiFlashProvider` (Memakai API Key gratis Google AI Studio).
- **Pengaturan Modular:**
  - Menu Pengaturan memisahkan konfigurasi generator gambar dan metadata, sehingga pengguna dapat mencampur penyedia mana pun kapan saja.

---

## 5. Keputusan Teknis Pengembang (Builder Calls)

1. **Kompatibilitas Penuh Vercel Free Tier:**
   Semua manipulasi file berat dilakukan di browser pengguna (*client-side*). Serverless function Next.js hanya mengalirkan payload API teks/URL yang sangat ringan, menjaga latensi tetap rendah dan konsumsi kuota Vercel tetap 0.
2. **Penyempurnaan Prompt Cerdas:**
   Disediakan tombol "✨ Enhance Prompt" agar kontributor dapat melihat dan mengedit terjemahan prompt bahasa Inggris sebelum gambar dibuat. Jika pengguna langsung menekan tombol "Generate", penyempurnaan prompt akan berjalan otomatis di latar belakang.
3. **Penyusunan Kata Kunci Standar Agensi:**
   Sistem prompt Gemini Vision diinstruksikan secara ketat untuk menyusun kata kunci berhirarki: subjek utama, aktivitas, lokasi/lingkungan, pencahayaan/suasana, dan konsep komersial (misal: "copy space", "no people", "commercial photography"), tanpa merek dagang terdaftar (*trademarks*).
4. **Jaminan Resolusi >4MP:**
   Generator gambar otomatis mengatur dimensi output agar memiliki resolusi di atas batas minimum 4 Megapiksel yang disyaratkan Adobe Stock dan Shutterstock.

---

## 6. Kriteria Verifikasi dan Keberhasilan (Acceptance Criteria)

1. **Dapat Dijalankan 100% Gratis:**
   Pengguna baru tanpa kartu kredit dapat langsung menghasilkan gambar dan mengekstrak metadata stok foto secara cuma-cuma.
2. **Pengaturan API Key Tersimpan Aman:**
   API key Gemini dapat dimasukkan di menu Pengaturan dan tetap tersimpan di `localStorage` saat halaman di-*refresh*.
3. **Uji Coba Dua Mode Kerja:**
   - Mode 1: Mengetik prompt -> menghasilkan gambar berkualitas tinggi -> metadata terisi otomatis.
   - Mode 2: Mengunggah gambar sendiri -> metadata stok foto terisi otomatis.
4. **Metadata Wajib Bahasa Inggris:**
   Seluruh judul, deskripsi, dan kata kunci selalu dihasilkan dalam bahasa Inggris yang akurat.
5. **Verifikasi Penanaman Metadata IPTC:**
   File JPEG yang diunduh melalui tombol "Unduh JPEG (IPTC Tertanam)" terbukti memiliki metadata di dalamnya saat diperiksa dengan ExifTool atau langsung dikenali otomatis saat diunggah ke Adobe Stock Contributor.
6. **Fungsi Tombol Salin:**
   Tombol salin judul, deskripsi, dan "Salin Semua Tag" berfungsi mulus dengan notifikasi (*toast*) visual.
7. **Build Bersih untuk Vercel:**
   Perintah `npm run build` berhasil tanpa galat (*zero TypeScript & lint errors*), dan siap dideploy ke Vercel Free Tier dengan sekali klik.
