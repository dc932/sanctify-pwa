export type ContentStatus = 'published' | 'review' | 'under_review' | 'draft' | 'scheduled';

export type ContentType = 'music' | 'podcast' | 'blog' | 'video';

export interface Publication {
  id: string;
  title: string;
  type: ContentType;
  plays: string;
  likes: number;
  status: ContentStatus;
  scheduledDate?: string;
  category: string;
}

export const ACC = '#E0B95B'; // Acento dorado del Creator Studio

export const metaCategories = [
  'Música',
  'Oración',
  'Podcast',
  'Formación',
  'Video',
];

export const liturgicalTimes = [
  'Tiempo Ordinario',
  'Adviento',
  'Navidad',
  'Cuaresma',
  'Semana Santa',
  'Pascua',
  'Pentecostés',
];

export const samplePublications: Publication[] = [
  { id: '1', title: 'Ave Maria — Semana Santa', type: 'music', plays: '24.1K', likes: 1446, status: 'published', category: 'Música' },
  { id: '2', title: 'Reflexión: El silencio interior', type: 'podcast', plays: '9.8K', likes: 588, status: 'published', category: 'Podcast' },
  { id: '3', title: 'Lectio Divina: Isaías 43', type: 'blog', plays: '6.2K', likes: 372, status: 'under_review', category: 'Formación' },
  { id: '4', title: 'Cantos de Adviento Vol. 1', type: 'music', plays: '31.4K', likes: 1884, status: 'published', category: 'Música' },
  { id: '5', title: 'Oración de la mañana — Serie completa', type: 'podcast', plays: '18.9K', likes: 1134, status: 'published', category: 'Oración' },
  { id: '6', title: 'Meditación: El Camino de la Cruz', type: 'blog', plays: '0', likes: 0, status: 'draft', category: 'Oración' },
  { id: '7', title: 'Salmo 23 — Lectura contemplativa', type: 'blog', plays: '0', likes: 0, status: 'scheduled', scheduledDate: '2026-10-15T08:00', category: 'Formación' },
];
export interface TranscriptSegment {
  start: number; // en segundos
  end: number;   // en segundos
  text: string;
}