# Kirana — Music Player (PWA, No Database, No Backend)

Music player web modern, ringan, dan responsif. Terinspirasi pola UI streaming modern,
tetapi dengan branding, nama, warna accent, dan identitas visual original: **Kirana**.

- HTML + CSS + JavaScript murni (tanpa React/Vue/Angular, tanpa library besar)
- 1 elemen `<audio>` saja (HTML5 Audio API)
- Tanpa database / backend / login / API eksternal
- PWA installable (manifest + service worker)
- Responsif: HP kecil, HP besar, tablet, laptop, desktop

## 1. Struktur folder lengkap

```text
my-music-app/
├── index.html
├── manifest.json
├── service-worker.js
├── css/
│   └── style.css
├── js/
│   ├── songs.js
│   ├── storage.js
│   ├── player.js
│   ├── search.js
│   ├── ui.js
│   └── app.js
├── assets/
│   ├── music/
│   │   ├── song-1.mp3
│   │   ├── song-2.mp3
│   │   └── song-3.mp3
│   ├── covers/
│   │   ├── song-1.jpg
│   │   ├── song-2.jpg
│   │   └── song-3.jpg
│   ├── icons/
│   │   ├── icon-192.png
│   │   └── icon-512.png
│   └── ui/
└── README.md
```

> File `assets/music/*.mp3` bawaan adalah nada demo agar player langsung bisa dites.
> Ganti dengan MP3 asli milikmu (lihat bagian 2).

## 2. Cara menambahkan lagu

1. Masukkan file MP3 ke `assets/music/`, contoh: `song-4.mp3`
2. Masukkan cover ke `assets/covers/`, contoh: `song-4.jpg` (JPG/PNG, ideal 600×600)
3. Tambahkan object ke array di `js/songs.js`:

```js
{
  id: 4,
  title: "Judul Baru",
  artist: "Nama Artis",
  album: "Nama Album",
  cover: "assets/covers/song-4.jpg",
  src: "assets/music/song-4.mp3",
  category: "Popular"
}
```

Aturan:
- `id` harus unik (angka).
- `category: "Popular"` agar muncul di section Popular Songs.
- Tidak ada admin panel / upload / database — semua manual via coding.

## 3. Cara menjalankan PWA secara lokal

PWA + service worker **membutuhkan HTTP(S)**, tidak full jalan via `file://`.

### Opsi A — Node (ringan)
```powershell
npx serve my-music-app
# atau:
npx http-server my-music-app -p 8080
```
Lalu buka `http://localhost:3000` atau `http://localhost:8080`.

### Opsi B — Python
```powershell
cd my-music-app
python -m http.server 8080
```

### Opsi C — VS Code
Install extension **Live Server** → klik kanan `index.html` → Open with Live Server.

### Tes install PWA
1. Buka via `http://localhost:8080` di Chrome/Edge.
2. Ikon Install (⊕) di address bar → Install.
3. Di HP Android: menu ⋮ → Add to Home screen / Install app.
4. Aplikasi berjalan `display: standalone` seperti aplikasi native.

### Tes offline
1. Buka sekali saat online (app shell ter-cache).
2. Matikan internet → refresh → aplikasi tetap terbuka.
3. Audio yang sudah pernah diputar ikut ter-cache (maks 10 file, FIFO).

## Cache PWA (hemat & aman)

- `service-worker.js` hanya pre-cache app shell: HTML, CSS, JS, ikon.
- MP3 **tidak** di-cache saat install.
- Audio di-cache on-demand setelah diputar, dibatasi `MAX_AUDIO_CACHE = 10`
  dan file `< 25MB`. Ini menjaga storage & kuota tetap ringan.

## Fitur

- Home: greeting waktu, Recently Played (max 20, localStorage), Popular, All Songs
- Search real-time + debounce, filter title/artist/album, empty state
- Liked Songs (localStorage, persisten)
- Library: tab All / Liked / Recent
- Player: play/pause/resume, next/prev, seek, volume+mute (tersimpan),
  shuffle (hindari pengulangan langsung), repeat off/all/one, auto-next
- Mobile: mini player + full player overlay (tap untuk buka, ⌄/swipe untuk tutup),
  bottom navigation, touch target ≥44px, tanpa horizontal overflow
- Desktop: sidebar permanen + bottom player permanen, navigasi tanpa reload
  (audio tidak berhenti saat pindah halaman)

## Catatan lisensi aset

Gunakan hanya musik yang kamu miliki izinnya. File demo bawaan bebas diganti.
Branding Kirana (#FF5C38 + #7C6CF6, dark `#0b0e1a`) adalah identitas original
dan bukan milik Spotify.
