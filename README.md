# Studio Kontributor Mikrostock

Aplikasi berbasis web modern yang dirancang khusus untuk mempermudah alur kerja kontributor mikrostock (Adobe Stock, Shutterstock, Freepik, Getty Images). Menghasilkan gambar berkualitas tinggi, menyempurnakan prompt bahasa Indonesia ke bahasa Inggris standar komersial, menganalisis metadata SEO, serta menanam metadata IPTC langsung ke dalam file JPEG di sisi browser pengguna.

100% kompatibel dengan **Vercel Free Tier (Hobby Plan)** tanpa memerlukan database berbayar atau server berat.

---

## Fitur Utama

1. **Generator Gambar Gratis & Cepat**
   - Menggunakan provider default Pollinations.ai yang dapat digunakan langsung tanpa perlu registrasi akun atau kartu kredit.
   - Mendukung integrasi opsional dengan model FLUX, Stable Diffusion XL, atau Google Imagen.
   - Pilihan aspek rasio fleksibel (1:1 Square, 16:9 Landscape, 4:3 Standard, 9:16 Portrait/Story).
   - Kontrol seed numerik untuk pengulangan hasil variasi gambar.

2. **Penyempurna Prompt Dwibahasa (Prompt Enhancer)**
   - Masukkan konsep ide dalam bahasa Indonesia santai (contoh: "kopi hangat di meja kayu pagi hari").
   - Secara otomatis diterjemahkan dan diperkaya menjadi prompt fotografi stok komersial berbahasa Inggris dengan detail pencahayaan, komposisi, sudut kamera, dan gaya visual.
   - Dilengkapi sistem fallback aturan lokal (*offline rule-based enhancer*) sehingga tetap berfungsi meskipun kuota API sedang habis.

3. **Penganalisis Metadata Komersial Otomatis**
   - Menghasilkan Judul (*Title*) yang padat, deskriptif, dan ramah mesin pencari stok (SEO).
   - Menghasilkan Deskripsi (*Caption*) lengkap yang menjelaskan subjek utama dan konteks gambar.
   - Menghasilkan 30 hingga 50 Kata Kunci (*Keywords*) bertarget tinggi dalam bahasa Inggris, diurutkan berdasarkan relevansi komersial.
   - Dilengkapi fitur interaktif untuk menambah, mengedit, atau menghapus tag kata kunci sebelum diekspor.

4. **Penanam Metadata IPTC di Sisi Klien (Client-Side Injector)**
   - Menanam data IPTC IIM (*Information Interchange Model*) langsung ke dalam struktur byte JPEG (segmen APP13 Photoshop 3.0) di peramban pengguna.
   - Kompatibel langsung dengan sistem upload Adobe Stock, Shutterstock, dan Freepik. Begitu file JPEG diunggah, judul dan puluhan kata kunci akan terisi otomatis tanpa perlu mengetik manual satu per satu.
   - Berjalan murni di memori browser (Web APIs & TypedArray), tanpa mengirim file gambar ke server pihak ketiga untuk pelestarian privasi.

5. **Manajemen Kunci API Aman di LocalStorage**
   - Masukkan Google Gemini API Key Anda sendiri langsung melalui dialog Pengaturan (*Settings Dialog*).
   - Kunci disimpan secara lokal di peramban pengguna (*browser localStorage*) dan dikirim langsung melalui header request yang terisolasi.
   - Server tidak pernah menyimpan atau mencatat kunci API Anda ke dalam basis data.

6. **Desain Bersih & Kepatuhan Antislop**
   - Antarmuka Studio dua kolom yang rapi (*Split-View Workbench*): konfigurasi di sisi kiri, pratinjau dan inspeksi metadata di sisi kanan.
   - Mendukung Tema Gelap (*Dark Mode*) dan Tema Terang (*Light Mode*) dengan kontras tinggi standar WCAG AA.
   - Responsif di perangkat ponsel pintar, tablet, maupun layar desktop lebar.
   - Navigasi ramah keyboard penuh (`Tab`, `Shift+Tab`, `Enter`, `Escape`).

---

## Panduan Menjalankan Secara Lokal

### Prasyarat
- Node.js versi 18.17.0 atau lebih baru (disarankan Node.js 20 LTS)
- Pengelola paket npm (atau pnpm / yarn)

### Langkah Instalasi

1. **Clone repositori ini:**
   ```bash
   git clone https://github.com/username/microstock-contributor-studio.git
   cd microstock-contributor-studio
   ```

2. **Install seluruh dependensi:**
   ```bash
   npm install
   ```

3. **(Opsional) Konfigurasi Environment Variable:**
   Buat file `.env.local` di direktori utama jika Anda ingin menyediakan API Key server default:
   ```env
   GEMINI_API_KEY=AIzaSy...kunci_gemini_anda
   ```
   *Catatan:* Langkah ini opsional. Pengguna tetap dapat memasukkan kunci API secara mandiri melalui tombol Pengaturan di antarmuka web.

4. **Jalankan server pengembangan lokal:**
   ```bash
   npm run dev
   ```

5. **Buka peramban:**
   Akses `http://localhost:3000` di browser favorit Anda.

---

## Panduan Deploy 1-Klik ke Vercel (Free Tier)

Aplikasi ini dioptimalkan khusus untuk berjalan di Vercel Hobby Plan (100% Gratis):

### Langkah Deploy:

1. **Push kode Anda ke repositori GitHub / GitLab / Bitbucket.**
2. **Buka dashboard [Vercel](https://vercel.com/)** dan masuk dengan akun Anda.
3. Klik tombol **"Add New... -> Project"**.
4. Pilih repositori GitHub proyek ini dan klik **"Import"**.
5. Di bagian pengaturan proyek:
   - **Framework Preset:** Terdeteksi otomatis sebagai `Next.js`.
   - **Root Directory:** `./`
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`
   - **Environment Variables (Opsional):** Masukkan nama `GEMINI_API_KEY` dengan nilai API key Anda jika ingin menyediakannya sebagai default bersama, atau kosongkan jika ingin pengguna memasukkan kunci masing-masing via antarmuka.
6. Klik **"Deploy"**.
7. Dalam waktu kurang dari 2 menit, aplikasi Anda akan tayang dengan domain publik gratis (`https://proyek-anda.vercel.app`).

### Mengapa Sangat Hemat dan Kompatibel dengan Vercel Free Tier?
- **Ukuran Bundle Sangat Ringan:** First Load JS kurang dari 90 kB, jauh di bawah batas ambang performa Vercel.
- **Serverless Execution Cepat:** Operasi serverless hanya berupa pemanggilan API ringkas bertipe streaming/JSON (< 3 detik).
- **Pemrosesan Gambar Sisi Klien:** Penanaman metadata biner IPTC dilakukan 100% pada CPU browser pengguna menggunakan `Uint8Array`, sehingga tidak mengonsumsi memori fungsi serverless Vercel sama sekali.
- **Zero Database Maintenance:** Menggunakan `localStorage` browser pengguna untuk persistensi pengaturan.

---

## Panduan Mendapatkan Kunci API Google Gemini Gratis

1. Kunjungi [Google AI Studio](https://aistudio.google.com/).
2. Masuk menggunakan akun Google Anda.
3. Klik tombol **"Get API key"** di panel navigasi kiri.
4. Klik **"Create API key in new project"**.
5. Salin string kunci API yang dihasilkan (berawalan `AIzaSy...`).
6. Di aplikasi Studio Kontributor Mikrostock:
   - Klik ikon gerigi (Pengaturan) di pojok kanan atas.
   - Tempelkan kunci API ke kolom **Google Gemini API Key**.
   - Klik tombol **"Uji Koneksi"** untuk memastikan kunci aktif.
   - Klik **"Simpan Pengaturan"**.

*Tingkat Kuota Gratis Gemini:* Google AI Studio menyediakan kuota gratis hingga 15 Request Per Menit (RPM) untuk model Gemini 1.5 Flash, lebih dari cukup untuk alur kerja kontributor harian.

---

## Cara Kerja Penanaman Metadata IPTC (Standar Industri)

Pasar mikrostock internasional (Adobe Stock, Shutterstock, Freepik, dsb.) membaca data aset menggunakan standar metadata *IPTC Information Interchange Model (IIM)*:

- **Record 2:05 (Object Name / Document Title):** Menampung judul komersial gambar.
- **Record 2:25 (Keywords):** Menampung daftar kata kunci penelusuran (30 hingga 50 kata kunci terpisah).
- **Record 2:120 (Caption / Abstract):** Menampung deskripsi kontekstual gambar.

### Struktur Segmen JPEG:
Aplikasi membaca header biner file JPEG:
1. Memeriksa tanda awal berkas JPEG (`0xFFD8` / Start of Image).
2. Membentuk blok data IPTC dengan tag Photoshop 3.0 (`8BIM` di dalam segmen `APP13` / `0xFFED`).
3. Mengonversi string UTF-8 menjadi byte biner berstandar IPTC.
4. Menyelipkan segmen `APP13` tepat setelah marker `SOI` atau segmen `APP0` / `APP1`.
5. Menghasilkan blob berkas JPEG baru yang siap diunduh.

Saat Anda mengunggah file hasil unduhan ke dashboard kontributor Adobe Stock atau Shutterstock, seluruh kolom judul dan kata kunci akan terdeteksi dan terisi secara otomatis tanpa perlu input manual.

---

## Skrip dan Pengujian Otomatis

Proyek ini dilengkapi pengujian otomatis menyeluruh:

```bash
# Menjalankan seluruh pengujian unit dan komponen (Vitest)
npm test

# Menjalankan verifikasi tipe TypeScript
npx tsc --noEmit

# Menjalankan build optimasi produksi Next.js
npm run build
```

Semua pengujian (103 tes) mencakup:
- Generator byte IPTC dan pembacaan segmen APP13 JPEG (`tests/iptc-writer.test.ts`).
- Abstraksi AI provider dan penanganan error (`tests/providers.test.ts`).
- Pembersihan dan pengayaan prompt dwibahasa (`tests/enhance-prompt.test.ts`).
- Pemulihan data LocalStorage dan manajemen API key (`tests/storage.test.ts`).
- Komponen antarmuka pengguna studio dan kepatuhan antislop (`tests/studio-ui.test.ts`).

---

## Lisensi

Didistribusikan di bawah Lisensi MIT. Bebas digunakan untuk keperluan pribadi maupun komersial.
