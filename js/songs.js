/* Risyad Music — data lagu manual oleh developer.
 * Cara tambah lagu:
 *  1. Taruh file MP3 di assets/music/  (contoh: song-10.mp3, tanpa spasi)
 *  2. Taruh cover di assets/covers/    (contoh: song-10.jpg)
 *  3. Tambahkan object baru di array `songs` di bawah ini.
 * Tidak ada admin panel / upload / database / backend.
 */
const songs = [
  {
    id: 1,
    title: "Dj Ngapain Repot",
    artist: "Risyad",
    album: "Langit Pertama",
    cover: "assets/covers/song-1.jpg",
    src: "assets/music/repot.mp3",
    category: "Popular"
  },
  {
    id: 2,
    title: "Apalah Arti Menunggu",
    artist: "Raisa",
    album: "Menunggu",
    cover: "assets/covers/song-2.jpg",
    src: "assets/music/raisa.mp3",
    category: "Popular"
  },
  {
    id: 3,
    title: "DJ Body Pata Pata",
    artist: "Risyad",
    album: "Neon & Hujan",
    cover: "assets/covers/song-3.jpg",
    src: "assets/music/dj-body-pata-pata.mp3",
    category: "Chill"
  },
  {
    id: 4,
    title: "Sesi Potret",
    artist: "Ari Lesmana",
    album: "Neon & Hujan",
    cover: "assets/covers/song-4.jpg",
    src: "assets/music/sesi-potret.mp3",
    category: "Chill"
  },
  {
    id: 5,
    title: "Mantan Terindah",
    artist: "Kahitna",
    album: "Soulmate",
    cover: "assets/covers/song-5.jpg",
    src: "assets/music/mantan-terindah.mp3",
    category: "Chill"
  },
  {
    id: 6,
    title: "Titik Nadir",
    artist: "Kahitna",
    album: "Soulmate",
    cover: "assets/covers/song-6.jpg",
    src: "assets/music/titik-nadir.mp3",
    category: "Chill"
  },
  {
    id: 7,
    title: "Firasat",
    artist: "Marcell",
    album: "Firasat",
    cover: "assets/covers/song-7.jpg",
    src: "assets/music/firasat.mp3",
    category: "Popular"
  },
  {
    id: 8,
    title: "To Love You More",
    artist: "Celine Dion",
    album: "Falling Into You",
    cover: "assets/covers/song-8.jpg",
    src: "assets/music/love-you-more.mp3",
    category: "Popular"
  },
  {
    id: 9,
    title: "Shape Of My Heart",
    artist: "Backstreet Boys",
    album: "Millennium",
    cover: "assets/covers/song-9.jpg",
    src: "assets/music/shape-of-my-heart.mp3",
    category: "Popular"
  }
];
// Fix 9: Map O(1) untuk lookup — dipakai ui.js & player.js & queue
const songMap = new Map(songs.map((s) => [String(s.id), s]));
