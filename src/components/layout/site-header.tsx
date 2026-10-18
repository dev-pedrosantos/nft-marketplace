import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useId, useRef, useState } from 'react'
import cartBadge from '@/assets/icons/cart-badge.svg'
import cartIcon from '@/assets/icons/cart.svg'
import logoutIcon from '@/assets/icons/logout.svg'
import searchIcon from '@/assets/icons/search.svg'
import headerDivider from '@/assets/home/header-divider.svg'
import navActiveUnderline from '@/assets/home/nav-active-underline.svg'
import { ComingSoon } from '@/components/coming-soon'
import { buttonVariants } from '@/components/ui/button'
import { useSession, useViewerKey } from '@/features/auth/session-store'
import { cartQueries } from '@/features/cart/api'
import { cn } from '@/lib/utils'

export type HeaderSection = 'home' | 'market'

interface SiteHeaderProps {
  /** Highlighted nav item: "Início" on home and account screens, "Mercado" in the buying flow. */
  active?: HeaderSection
  /** The hairline belongs to the host screen; the buying-flow screens have none. */
  divider?: boolean
  className?: string
}

const navItemClass = 'flex flex-col gap-6 text-base leading-[normal]'

function NavLabel({ label, active }: { label: string; active: boolean }) {
  return (
    <>
      {label}
      <span className="relative h-0 w-full">
        {active && (
          <img
            src={navActiveUnderline}
            alt=""
            className="absolute inset-x-0 -top-[3px] block h-[3px] w-full max-w-none"
          />
        )}
      </span>
    </>
  )
}

export function SiteHeader({ active = 'home', divider = true, className }: SiteHeaderProps) {
  const viewer = useViewerKey()
  const session = useSession()
  const { data: cart } = useQuery(cartQueries.summary(viewer))

  return (
    <header className={cn('flex w-full flex-col', className)}>
      <div className="flex w-full items-start justify-between">
        <Link
          to="/"
          className="h-[34.3px] pt-[8.15px] text-sm font-bold tracking-[1.4px] xl:w-40"
        >
          KURIO
        </Link>

        <nav aria-label="Principal" className="flex items-start gap-6 xl:gap-10">
          <Link
            to="/"
            aria-current={active === 'home' ? 'page' : undefined}
            className={cn(navItemClass, active === 'home' ? 'font-bold text-highlight' : 'text-foreground')}
          >
            <NavLabel label="Início" active={active === 'home'} />
          </Link>
          <Link
            to="/"
            hash="catalogo"
            aria-current={active === 'market' ? 'page' : undefined}
            className={cn(navItemClass, active === 'market' ? 'font-bold text-highlight' : 'text-foreground')}
          >
            <NavLabel label="Mercado" active={active === 'market'} />
          </Link>
          {/* No destination exists for these items in the design yet. */}
          <ComingSoon feature="Criadores" className="text-base leading-[normal] text-foreground">
            Criadores
          </ComingSoon>
          <ComingSoon feature="Aprenda" className="text-base leading-[normal] text-foreground">
            Aprenda
          </ComingSoon>
        </nav>

        <div className="flex items-center gap-7">
          <HeaderSearch />

          <Link
            to="/carrinho"
            aria-label={`Carrinho${cart ? `, ${cart.itemCount} itens` : ''}`}
            className="relative grid place-items-start"
          >
            <img src={cartIcon} alt="" className="col-start-1 row-start-1 h-6 w-[24.004px]" />
            {cart && cart.itemCount > 0 && (
              <>
                <img
                  src={cartBadge}
                  alt=""
                  className="col-start-1 row-start-1 ml-[13px] -mt-0.5 size-5 max-w-none"
                />
                <span className="col-start-1 row-start-1 ml-5 mt-[1.5px] text-[10px] leading-[normal] font-medium text-ink">
                  {cart.itemCount}
                </span>
              </>
            )}
          </Link>

          {session ? (
            <Link
              to="/conta/perfil"
              title={session.user.displayName}
              className={cn(
                buttonVariants(),
                'h-[35px] max-w-[160px] min-w-[100px] gap-1 rounded-[6px] px-2 text-base font-medium leading-[normal]',
              )}
            >
              <span className="truncate">{session.user.displayName}</span>
            </Link>
          ) : (
            <Link
              to="."
              search={(previous) => ({ ...previous, auth: 'login' as const })}
              className={cn(
                buttonVariants(),
                'h-[35px] w-[100px] gap-1 rounded-[6px] px-0 text-base font-medium leading-[normal]',
              )}
            >
              <span className="relative size-5">
                <img
                  src={logoutIcon}
                  alt=""
                  className="absolute top-[2.29px] left-[1.84px] h-[16.917px] w-[17.778px] max-w-none"
                />
              </span>
              Entrar
            </Link>
          )}
        </div>
      </div>

      {/* The 0.3px hairline is drawn 1px tall at reduced opacity so browsers don't drop it. */}
      {divider && <img src={headerDivider} alt="" className="block h-px w-full max-w-none opacity-40" />}
    </header>
  )
}

/** The design only has the icon; it opens a compact field that searches the catalog. */
function HeaderSearch() {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Buscar"
        aria-expanded={open}
        aria-controls={inputId}
        onClick={() => setOpen((current) => !current)}
        className="block size-5"
      >
        <img src={searchIcon} alt="" className="block size-full" />
      </button>
      {open && (
        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault()
            setOpen(false)
            void navigate({ to: '/', search: { q: value.trim() || undefined }, hash: 'catalogo' })
          }}
          className="absolute top-8 right-0 z-30 flex w-72 overflow-hidden rounded-[6px] border border-primary bg-surface-card shadow-lg"
        >
          <label htmlFor={inputId} className="sr-only">
            Buscar NFTs
          </label>
          <input
            id={inputId}
            ref={inputRef}
            type="search"
            value={value}
            placeholder="Explorar coleções"
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setOpen(false)
            }}
            className="h-10 min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-subtle"
          />
          <button type="submit" className="bg-primary px-3 text-sm font-bold text-primary-foreground">
            Buscar
          </button>
        </form>
      )}
    </div>
  )
}
