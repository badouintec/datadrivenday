import { sanityClient } from 'sanity:client';
import { samplePosts, site } from '../../data/site';

export interface BlogPostCard {
  title: string;
  category: string;
  excerpt: string;
  slug: string;
  publishedAt?: string;
}

export interface EventSettingsView {
  eventName: string;
  eventDate: string;
  city: string;
  registrationUrl?: string;
  heroMessage: string;
}

function isSanityConfigured() {
  const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID;
  const dataset = import.meta.env.PUBLIC_SANITY_DATASET;

  return Boolean(projectId && dataset && projectId !== 'replace-me');
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

export async function getBlogPosts() {
  const fallbackPosts: BlogPostCard[] = samplePosts.map((post) => ({
    ...post,
    slug: slugify(post.title)
  }));

  if (!isSanityConfigured()) {
    return { posts: fallbackPosts, source: 'fallback' as const };
  }

  try {
    const posts = await sanityClient.fetch<BlogPostCard[]>(`
      *[_type == "article" && defined(slug.current)]
        | order(coalesce(publishedAt, _createdAt) desc)[0...6] {
          title,
          category,
          excerpt,
          "slug": slug.current,
          publishedAt
        }
    `);

    if (!Array.isArray(posts) || posts.length === 0) {
      return { posts: fallbackPosts, source: 'fallback' as const };
    }

    return { posts, source: 'sanity' as const };
  } catch {
    return { posts: fallbackPosts, source: 'fallback' as const };
  }
}

export async function getEventSettings() {
  const fallbackSettings: EventSettingsView = {
    eventName: site.name,
    eventDate: site.eventDate,
    city: site.location,
    heroMessage: site.tagline
  };

  if (!isSanityConfigured()) {
    return { settings: fallbackSettings, source: 'fallback' as const };
  }

  try {
    const settings = await sanityClient.fetch<EventSettingsView | null>(`
      *[_type == "eventSettings"][0] {
        eventName,
        eventDate,
        city,
        registrationUrl,
        heroMessage
      }
    `);

    if (!settings?.eventName) {
      return { settings: fallbackSettings, source: 'fallback' as const };
    }

    return {
      settings: {
        ...fallbackSettings,
        ...settings
      },
      source: 'sanity' as const
    };
  } catch {
    return { settings: fallbackSettings, source: 'fallback' as const };
  }
}