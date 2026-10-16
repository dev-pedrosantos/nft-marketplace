import { formatDayAndMonth } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { BlogPost } from '../types'

export function BlogPostCard({ post, className }: { post: BlogPost; className?: string }) {
  return (
    <article className={cn('flex flex-col overflow-hidden rounded-[8px] bg-surface-card', className)}>
      <img
        src={post.imageUrl}
        alt=""
        loading="lazy"
        className="h-[195px] w-full object-cover"
      />
      <div className="flex flex-1 flex-col items-start gap-2 px-4 pt-3 pb-4">
        <p className="text-xs leading-4 font-medium whitespace-pre-wrap text-muted-foreground">
          <time dateTime={post.publishedAt}>{formatDayAndMonth(post.publishedAt)}</time>
          {`  |  Leitura de ${post.readingTimeMinutes} min`}
        </p>
        <h3 className="text-base leading-[normal] font-bold text-heading">{post.title}</h3>
        <p className="text-xs leading-4 font-medium text-muted-foreground">{post.excerpt}</p>
        <span className="mt-auto flex gap-1 text-xs text-highlight">
          <span className="leading-[14px] font-bold">Ler mais</span>
          <span aria-hidden>→</span>
        </span>
      </div>
    </article>
  )
}
