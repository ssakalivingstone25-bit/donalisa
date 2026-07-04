import type { Movie } from '@/types';

export function fuzzySearchMovies(movies: Movie[], query: string): Movie[] {
  if (!query.trim()) return movies;
  const q = query.toLowerCase().trim();
  
  return movies
    .map((movie) => {
      const title = movie.title.toLowerCase();
      const desc = movie.description.toLowerCase();
      
      // 1. Exact title match or starts with title
      if (title === q) return { movie, score: 100 };
      if (title.startsWith(q)) return { movie, score: 80 };
      
      // 2. Substring in title
      const titleIndex = title.indexOf(q);
      if (titleIndex !== -1) {
        return { movie, score: 60 - titleIndex };
      }
      
      // 3. Substring in description
      const descIndex = desc.indexOf(q);
      if (descIndex !== -1) {
        return { movie, score: 40 - descIndex };
      }
      
      // 4. Fuzzy character matching (characters appear in sequence)
      let score = 0;
      let patternIdx = 0;
      for (let i = 0; i < title.length; i++) {
        if (title[i] === q[patternIdx]) {
          patternIdx++;
          if (patternIdx === q.length) {
            score = 10;
            break;
          }
        }
      }
      
      if (score > 0) {
        return { movie, score };
      }
      
      return { movie, score: 0 };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.movie);
}
