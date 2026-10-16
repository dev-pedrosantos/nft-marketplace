import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { MobileTabBar } from '@/components/layout/mobile-tab-bar'
import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader, type HeaderSection } from '@/components/layout/site-header'
import { cn } from '@/lib/utils'

interface PageShellProps {
  active: HeaderSection
  /** The Mercado-flow screens use the header without its hairline. */
  divider?: boolean
  /** Content under the header inside the design's "Top" frame (32px gap). */
  children: ReactNode
  /** Sections after "Top", separated by the 96px rhythm of the desktop frames. */
  after?: ReactNode
  /** Mobile frames without the bottom tab bar (detail, cart, checkout) use their own chrome. */
  tabBar?: boolean
  className?: string
}

/** Same outer frame as the home page: 1200px column, 120px gutters at 1440. */
export function PageShell({ active, divider = true, children, after, tabBar = false, className }: PageShellProps) {
  return (
    <>
      <div
        className={cn(
          'mx-auto flex w-full max-w-[1440px] flex-col gap-12 md:gap-24 md:px-10 md:py-6 xl:px-[120px]',
          tabBar ? 'pb-[150px]' : 'pb-0',
          className,
        )}
      >
        <div className="flex flex-col md:gap-8">
          <SiteHeader active={active} divider={divider} className="hidden md:flex" />
          <main id="conteudo" className="flex min-w-0 flex-col">
            {children}
          </main>
        </div>
        {after}
        <SiteFooter className="hidden md:flex" />
      </div>
      {tabBar && <MobileTabBar className="md:hidden" />}
    </>
  )
}

/** Breadcrumb of the desktop buying-flow frames ("Início / Mercado / Carrinho"). */
export interface BreadcrumbItem {
  label: string
  to?: '/' | '/carrinho'
  hash?: string
}

export function Breadcrumb({ items, className }: { items: BreadcrumbItem[]; className?: string }) {
  return (
    <nav aria-label="Trilha de navegação" className={cn('hidden text-[15px] leading-4 font-bold md:block', className)}>
      <ol className="flex flex-wrap items-center whitespace-pre">
        {items.map((item, index) => (
          <li key={item.label} className="flex items-center">
            {index > 0 && <span aria-hidden> / </span>}
            {item.to ? (
              <Link to={item.to} hash={item.hash} className="hover:text-highlight">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
