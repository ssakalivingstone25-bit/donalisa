import { Movie } from '@/types';

// Let's define some premium public streams with working video URLs
export const sampleMovies: Movie[] = [
  {
    id: 'sintel-cinematic',
    title: 'Sintel',
    description: 'A young girl named Sintel searches for her baby dragon companion, Scales. Along her journey, she meets an ancient master, learns to survive, and discovers a heart-wrenching truth about her lost pet and the passage of time. A breathtaking open-source cinematic showcase created by the Blender Foundation.',
    posterUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=80',
    videoUrl: 'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8', // Premium HLS Stream
    trailerUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    duration: 888, // 14 min 48 sec
    releaseYear: 2010,
    rating: 'PG-13',
    categories: ['Adventure', 'Animation', 'Drama'],
    trending: true,
    featured: true,
    viewCount: 14205,
    uploadedBy: 'admin_donalisa',
    createdAt: new Date('2026-01-10').toISOString(),
  },
  {
    id: 'big-buck-bunny',
    title: 'Big Buck Bunny',
    description: 'A giant, hilarious, and warm-hearted rabbit decides to take sweet revenge on three mischievous forest rodents who bullied him and destroyed his beloved forest environment. A timeless, beautifully crafted animated comedy.',
    posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=1200&q=80',
    videoUrl: 'https://test-streams.mux.dev/x36xhg/x36xhg.m3u8', // HLS stream
    trailerUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    duration: 596, // 9 min 56 sec
    releaseYear: 2008,
    rating: 'G',
    categories: ['Comedy', 'Animation', 'Kids'],
    trending: true,
    featured: false,
    viewCount: 9850,
    uploadedBy: 'admin_donalisa',
    createdAt: new Date('2026-02-15').toISOString(),
  },
  {
    id: 'tears-of-steel',
    title: 'Tears of Steel',
    description: 'Set in an alternate apocalyptic future in Amsterdam, a group of scientists and soldiers attempt to save the earth from giant, rampaging biomechanical robots. They use a neural simulation to rewrite history and repair a tragic heartbreak from their past.',
    posterUrl: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=600&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4', // MP4 stream
    trailerUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    duration: 734, // 12 min 14 sec
    releaseYear: 2012,
    rating: 'Sci-Fi',
    categories: ['Sci-Fi', 'Action', 'Drama'],
    trending: false,
    featured: true,
    viewCount: 7421,
    uploadedBy: 'admin_donalisa',
    createdAt: new Date('2026-03-20').toISOString(),
  },
  {
    id: 'elephants-dream',
    title: 'Elephants Dream',
    description: 'Two men, Proog and Emo, wander through an incredibly surreal, mechanical, and infinitely expanding computer-like universe. They struggle with their opposing worldviews, sparking a dramatic clash between logical progress and artistic chaos.',
    posterUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', // MP4
    trailerUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    duration: 653, // 10 min 53 sec
    releaseYear: 2006,
    rating: 'PG',
    categories: ['Sci-Fi', 'Animation'],
    trending: false,
    featured: false,
    viewCount: 3120,
    uploadedBy: 'admin_donalisa',
    createdAt: new Date('2026-04-01').toISOString(),
  },
  {
    id: 'sub-demo-video',
    title: 'Cinematic Subtitle Test',
    description: 'A special test sequence designed specifically to showcase the advanced features of the Donalisa Custom Video Player, including real-time subtitle translation, speed toggling, and adaptive bitrates.',
    posterUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1200&q=80',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', // Quick MP4 stream
    trailerUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    duration: 15, // 15 seconds test
    releaseYear: 2026,
    rating: 'G',
    categories: ['Documentary'],
    trending: true,
    featured: false,
    viewCount: 18902,
    uploadedBy: 'admin_donalisa',
    createdAt: new Date('2026-06-25').toISOString(),
  }
];

export const englishSubtitleContent = `WEBVTT

1
00:00:01.000 --> 00:00:04.000
[Narrator] Welcome to DONALISA.

2
00:00:04.500 --> 00:00:08.500
Experience premium cinematic streaming with custom high-performance controls.

3
00:00:09.000 --> 00:00:11.500
Adjust the speed and toggle multi-language subtitles instantly.

4
00:00:12.000 --> 00:00:15.000
Press 'T' for Theater Mode or 'F' for Fullscreen. Enjoy the show!
`;

export const spanishSubtitleContent = `WEBVTT

1
00:00:01.000 --> 00:00:04.000
[Narrador] Bienvenido a DONALISA.

2
00:00:04.500 --> 00:00:08.500
Disfruta de la transmisión de cine premium con controles personalizados de alto rendimiento.

3
00:00:09.000 --> 00:00:11.500
Ajusta la velocidad y cambia los subtítulos multilingües al instante.

4
00:00:12.000 --> 00:00:15.000
Presiona 'T' para el modo teatro o 'F' para pantalla completa. ¡Disfruta la película!
`;

export const frenchSubtitleContent = `WEBVTT

1
00:00:01.000 --> 00:00:04.000
[Narrateur] Bienvenue sur DONALISA.

2
00:00:04.500 --> 00:00:08.500
Vivez une expérience de streaming cinéma haut de gamme avec des contrôles sur mesure.

3
00:00:09.000 --> 00:00:11.500
Ajustez la vitesse et changez les sous-titres multilingues instantanément.

4
00:00:12.000 --> 00:00:15.000
Appuyez sur 'T' pour le mode cinéma ou 'F' pour le plein écran. Bon spectacle!
`;

// Creates safe object URLs for multi-language subtitles to completely bypass browser cross-origin limits
export function createSubtitleBlobUrl(content: string): string {
  if (typeof window === 'undefined') return '';
  const blob = new Blob([content], { type: 'text/vtt;charset=utf-8' });
  return URL.createObjectURL(blob);
}
