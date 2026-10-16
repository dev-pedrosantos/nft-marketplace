import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import cartBadge from '@/assets/icons/cart-badge.svg'
import cartIcon from '@/assets/icons/cart.svg'
import logoutIcon from '@/assets/icons/logout.svg'
import searchIcon from '@/assets/icons/search.svg'
import headerDivider from '@/assets/home/header-divider.svg'
import navActiveUnderline from '@/assets/home/nav-active-underline.svg'
import { Button } from '@/components/ui/button'
import { cartQueries } from '@/features/cart/api'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  to?: '/'
}

// Only the home route exists so far; the other items have no destination yet.
const NAV_ITEMS: NavItem[] = [
  { label: 'Início', to: '/' },
  { label: 'Mercado' },
  { label: 'Criadores' },
  { label: 'Aprenda' },
]

export function SiteHeader({ className }: { className?: string }) {
  const { data: cart } = useQuery(cartQueries.summary())

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
          {NAV_ITEMS.map((item) =>
            item.to ? (
              <Link
                key={item.label}
                to={item.to}
                className="flex flex-col gap-6 text-base leading-[normal]"
                activeProps={{ className: 'font-bold text-highlight' }}
                inactiveProps={{ className: 'text-foreground' }}
                activeOptions={{ exact: true }}
              >
                {({ isActive }) => (
                  <>
                    {item.label}
                    <span className="relative h-0 w-full">
                      {isActive && (
                        <img
                          src={navActiveUnderline}
                          alt=""
                          className="absolute inset-x-0 -top-[3px] block h-[3px] w-full max-w-none"
                        />
                      )}
                    </span>
                  </>
                )}
              </Link>
            ) : (
              <span key={item.label} className="text-base leading-[normal] text-foreground">
                {item.label}
              </span>
            ),
          )}
        </nav>

        <div className="flex items-center gap-7">
          <button type="button" aria-label="Buscar" className="size-5">
            <img src={searchIcon} alt="" className="block size-full" />
          </button>

          <button
            type="button"
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
          </button>

          <Button
            type="button"
            className="h-[35px] w-[100px] gap-1 rounded-[6px] px-0 text-base font-medium leading-[normal]"
          >
            <span className="relative size-5">
              <img
                src={logoutIcon}
                alt=""
                className="absolute top-[2.29px] left-[1.84px] h-[16.917px] w-[17.778px] max-w-none"
              />
            </span>
            Entrar
          </Button>
        </div>
      </div>

      {/* The 0.3px hairline is drawn 1px tall at reduced opacity so browsers don't drop it. */}
      <img src={headerDivider} alt="" className="block h-px w-full max-w-none opacity-40" />
    </header>
  )
}
