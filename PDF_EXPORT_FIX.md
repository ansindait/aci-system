# PDF Export Fix - Firebase Storage Images

## Masalah
Export PDF tidak berhasil mengambil gambar dari Firebase Storage karena masalah CORS (Cross-Origin Resource Sharing).

## Penyebab
1. **CORS Restrictions**: Firebase Storage secara default membatasi akses cross-origin
2. **Image Loading Error**: Browser tidak dapat mengakses gambar Firebase untuk canvas
3. **Missing Error Handling**: Tidak ada fallback yang proper ketika gambar gagal dimuat

## Solusi yang Diterapkan

### 1. Perbaikan Kode PDF Export
- Menambahkan fungsi `loadImageForPDF()` dengan error handling yang lebih baik
- Implementasi dua metode loading gambar:
  - **Metode 1**: Fetch sebagai blob untuk handle CORS
  - **Metode 2**: Direct image loading sebagai fallback
- Menambahkan logging untuk debugging
- Placeholder yang informatif untuk gambar yang gagal dimuat

### 2. Konfigurasi CORS Firebase Storage
File yang dibuat:
- `firebase-storage-cors.json` - Konfigurasi CORS
- `setup-firebase-cors.sh` - Script untuk mengatur CORS

### 3. Langkah-langkah Setup CORS

#### Prerequisites:
1. Install Google Cloud SDK: https://cloud.google.com/sdk/docs/install
2. Login ke Firebase: `firebase login`
3. Set project ID: `export FIREBASE_PROJECT_ID=your-project-id`

#### Setup CORS:
```bash
# Buat script executable
chmod +x setup-firebase-cors.sh

# Jalankan script
./setup-firebase-cors.sh
```

#### Manual Setup (Alternatif):
```bash
# Set CORS configuration manually
gsutil cors set firebase-storage-cors.json gs://YOUR_PROJECT_ID.appspot.com
```

### 4. Testing
Setelah setup CORS:
1. Upload gambar baru ke Firebase Storage
2. Coba export PDF
3. Periksa console browser untuk log loading gambar
4. Gambar seharusnya berhasil dimuat dalam PDF

## Troubleshooting

### Jika gambar masih gagal dimuat:
1. **Periksa Console**: Lihat error messages di browser console
2. **Verifikasi CORS**: Pastikan CORS sudah diset dengan benar
3. **Test URL**: Coba buka URL gambar langsung di browser
4. **Check Permissions**: Pastikan Firebase Storage rules mengizinkan read access

### Error Messages yang Umum:
- `CORS error`: CORS belum dikonfigurasi
- `Image failed to load`: URL gambar tidak valid atau tidak accessible
- `HTTP 403`: Permission denied, cek Firebase Storage rules

## Firebase Storage Rules (Opsional)
Untuk memastikan akses read yang proper, pastikan rules Firebase Storage seperti ini:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true; // Untuk development
      allow write: if request.auth != null; // Hanya user yang login
    }
  }
}
```

## Catatan Penting
- CORS configuration memerlukan waktu beberapa menit untuk aktif
- Pastikan menggunakan HTTPS untuk production
- Test dengan gambar yang baru diupload setelah setup CORS 