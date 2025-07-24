export default function calculateReadingTime(text: string): {
  minutes: number;
  words: number;
} {
  const wordsPerMinute = 200; // Average reading speed
  const words = text.split(/\s+/).length; // Split by whitespace to count words
  const minutes: number = Math.ceil(words / wordsPerMinute);
  return { minutes, words };
}
