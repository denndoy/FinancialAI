# Vercel Deployment Checklist

Checklist produksi untuk AI Personal Finance Tracker (Next.js + Prisma + Azure services).

Status legend:
- [ ] Belum
- [x] Selesai

## 1) Prasyarat Repo
- [ ] Semua perubahan sudah commit dan push ke GitHub
- [ ] Migration Prisma terbaru sudah ikut di `prisma/migrations`
- [ ] `npm run build` sukses di lokal
- [ ] `npm test` sukses di lokal

## 2) Infrastruktur Data & Integrasi
- [ ] Azure PostgreSQL aktif dan dapat diakses dari internet/public endpoint yang aman
- [ ] Azure Blob Storage + container siap
- [ ] Azure Vision endpoint + key valid
- [ ] Connection string production tersedia

## 3) Setup Project di Vercel
- [ ] Import repository ke Vercel
- [ ] Framework terdeteksi Next.js
- [ ] Build command: `npm run build`
- [ ] Install command: `npm install`

## 4) Environment Variables (Production)
- [ ] `DATABASE_URL`
- [ ] `NEXTAUTH_SECRET`
- [ ] `NEXTAUTH_URL` (domain production)
- [ ] `AZURE_STORAGE_CONNECTION_STRING`
- [ ] `AZURE_CONTAINER_NAME`
- [ ] `AZURE_VISION_ENDPOINT`
- [ ] `AZURE_VISION_KEY`
- [ ] `ADMIN_USERNAME` (opsional)

## 5) Prisma Migration
- [ ] Jalankan `npx prisma migrate deploy` ke database production
- [ ] Verifikasi `npx prisma migrate status` menunjukkan up to date

## 6) Deploy
- [ ] Trigger deploy production dari Vercel
- [ ] Tidak ada build/runtime error di deployment logs

## 7) Smoke Test Wajib
- [ ] Register user baru
- [ ] Login berhasil
- [ ] Upload receipt berhasil
- [ ] OCR berhasil / fallback manual muncul saat OCR gagal
- [ ] Save transaksi berhasil
- [ ] Dashboard tampil benar
- [ ] Export CSV berhasil
- [ ] Export PDF berhasil

## 8) Hardening
- [ ] Semua secret hanya di Vercel Project Settings
- [ ] Domain production HTTPS aktif
- [ ] Monitoring dan alert aktif (Vercel + Azure)
- [ ] Backup/retention database terkonfigurasi

## 9) Operasional Rilis Selanjutnya
- [ ] Setiap rilis baru: jalankan `prisma migrate deploy` sebelum/bersamaan deploy
- [ ] Validasi endpoint health (`/api/health`)
- [ ] Pantau error 24 jam pertama setelah release
