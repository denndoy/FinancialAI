# Panduan Lengkap Go-Live di Vercel

Panduan ini dibuat untuk mempercepat aplikasi siap dipakai user production dengan alur aman:
1. Migration database terkontrol.
2. Deployment stabil.
3. Verifikasi fitur inti setelah deploy.

## 1. Target Hasil

Setelah semua langkah di bawah selesai:
1. Database production sudah sinkron dengan migration terbaru.
2. Build dan deploy production sukses di Vercel.
3. Alur utama aplikasi terverifikasi: login, transaksi, upload receipt, dashboard, export.

## 2. Prasyarat

1. Repo sudah ada di GitHub.
2. Branch utama: `main`.
3. Workflow migration sudah ada di repo:
   - `.github/workflows/prisma-migrate-deploy.yml`
4. Database production PostgreSQL sudah aktif.
5. Semua kredensial Azure (Blob + Vision) sudah siap.

## 3. Setup Secret GitHub (untuk auto migration)

1. Buka GitHub repository.
2. Masuk ke `Settings` -> `Secrets and variables` -> `Actions`.
3. Klik `New repository secret`.
4. Isi:
   - Name: `PRODUCTION_DATABASE_URL`
   - Value: connection string PostgreSQL production (wajib SSL).
5. Simpan.

Catatan penting:
1. Gunakan URL production asli, bukan database lokal/dev.
2. Jangan simpan secret di file repo.

## 4. Jalankan Migration Sekali Secara Manual (verifikasi awal)

1. Buka tab `Actions` di GitHub.
2. Pilih workflow `Prisma Migrate Deploy`.
3. Klik `Run workflow`.
4. Pilih branch `main`, lalu jalankan.
5. Pastikan semua step hijau, terutama step `Run Prisma migrate deploy`.

## 5. Konfigurasi Environment Variable di Vercel

1. Buka Vercel Project.
2. Masuk ke `Settings` -> `Environment Variables`.
3. Isi minimal variabel berikut untuk environment Production:
   - `DATABASE_URL`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL`
   - `AZURE_STORAGE_CONNECTION_STRING`
   - `AZURE_CONTAINER_NAME`
   - `AZURE_VISION_ENDPOINT`
   - `AZURE_VISION_KEY`
   - `ADMIN_USERNAME` (opsional)
4. Setelah update env, lakukan redeploy.

Catatan:
1. `DATABASE_URL` di Vercel boleh sama dengan secret GitHub `PRODUCTION_DATABASE_URL`, tapi dikelola terpisah.
2. Pastikan `NEXTAUTH_URL` adalah domain production final.

## 6. Trigger Deploy Ulang

Pilih salah satu cara:
1. Dari Vercel dashboard: `Redeploy` project production.
2. Atau lakukan push commit kecil ke branch `main`.

## 7. Smoke Test Wajib Setelah Deploy

Lakukan urut dari atas ke bawah:
1. Register user baru.
2. Login user.
3. Tambah transaksi manual.
4. Upload receipt.
5. Simpan hasil receipt ke transaksi.
6. Buka dashboard, cek total dan chart.
7. Export CSV.
8. Export PDF.
9. Cek endpoint health:
   - `GET /api/health`

Jika semua lolos, aplikasi siap dipakai user.

## 8. SOP Rilis Selanjutnya

Setiap ada perubahan schema Prisma:
1. Buat migration di lokal.
2. Commit file migration ke repo (`prisma/migrations/**`).
3. Push ke `main`.
4. Workflow `Prisma Migrate Deploy` akan otomatis jalan.
5. Pantau hasil workflow sebelum validasi fitur.

## 9. Perintah Lokal yang Berguna (opsional)

### Cek status migration

```powershell
npx prisma migrate status
```

### Jalankan migration deploy manual dari lokal

```powershell
$env:DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB?sslmode=require"
npx prisma migrate deploy
```

### Verifikasi build sebelum push

```powershell
npm run lint
npx next build
```

## 10. Troubleshooting Cepat

### Kasus A: Workflow migration gagal karena secret kosong

Gejala:
- Step `Validate production database secret` gagal.

Solusi:
1. Pastikan secret `PRODUCTION_DATABASE_URL` sudah dibuat.
2. Ulangi Run workflow.

### Kasus B: Migration gagal karena koneksi database

Gejala:
- Error auth/host/firewall saat `prisma migrate deploy`.

Solusi:
1. Cek username/password/host di URL.
2. Pastikan aturan firewall DB mengizinkan koneksi dari GitHub Actions/Vercel sesuai kebijakan jaringan.
3. Pastikan parameter SSL benar.

### Kasus C: Build lokal gagal karena cache lama

Gejala:
- `PageNotFoundError` untuk route yang sebenarnya ada.

Solusi:
1. Hapus folder `.next`.
2. Jalankan ulang `npx next build`.

### Kasus D: Build lokal gagal EPERM Prisma (Windows)

Gejala:
- Gagal rename file `query_engine-windows.dll.node`.

Solusi:
1. Tutup proses Node/Prisma yang masih jalan.
2. Ulangi build.
3. Jika perlu, reinstall dependency (`node_modules`) lalu jalankan lagi.

## 11. Checklist Go-Live Ringkas

1. Secret GitHub `PRODUCTION_DATABASE_URL` terpasang.
2. Workflow migration manual pertama sukses.
3. Env Vercel production lengkap.
4. Redeploy production sukses.
5. Smoke test 9 langkah sukses.
6. Monitoring awal 24 jam pertama aktif.

Selesai. Setelah ini aplikasi sudah siap dipakai secara production dengan alur migration yang konsisten.