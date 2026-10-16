import { Link } from '@tanstack/react-router'
import tabCart from '@/assets/icons/tab-cart.svg'
import tabHeart from '@/assets/icons/tab-heart.svg'
import tabHome from '@/assets/icons/tab-home.svg'
import scanBottomLeft from '@/assets/icons/tab-scan-bottom-left.svg'
import scanBottomRight from '@/assets/icons/tab-scan-bottom-right.svg'
import scanLine from '@/assets/icons/tab-scan-line.svg'
import scanTopLeft from '@/assets/icons/tab-scan-top-left.svg'
import scanTopRight from '@/assets/icons/tab-scan-top-right.svg'
import tabUser from '@/assets/icons/tab-user.svg'
import tabBarCenter from '@/assets/home/tab-bar-center.svg'
import tabBarBackground from '@/assets/home/tab-bar.svg'
import { cn } from '@/lib/utils'

const SCAN_PIECES = [
  { src: scanTopLeft, className: 'left-[1.3px] top-0 h-[10.31px] w-[10.39px]' },
  { src: scanTopRight, className: 'left-[15.1px] top-0 h-[10.3px] w-[10.39px]' },
  { src: scanLine, className: 'left-0 top-[11.1px] h-[1.79px] w-[26.82px]' },
  { src: scanBottomLeft, className: 'left-[1.3px] top-[13.7px] h-[10.31px] w-[10.35px]' },
  { src: scanBottomRight, className: 'left-[15.1px] top-[13.7px] h-[10.25px] w-[10.32px]' },
]

// Horizontal positions are relative to the 414px-wide frame.
const tabItemClass = 'absolute top-[71px] grid size-5 -translate-x-1/2 place-items-center'

export function MobileTabBar({ className }: { className?: string }) {
  return (
    <nav
      aria-label="Navegação inferior"
      className={cn(
        'pointer-events-none fixed inset-x-0 bottom-0 z-40 h-[126px] overflow-x-clip',
        className,
      )}
    >
      <div className="absolute inset-x-0 top-[31px] bottom-0">
        <img
          src={tabBarBackground}
          alt=""
          className="absolute -top-[42.13%] -left-[7.25%] h-[163.19%] w-[114.5%] max-w-none"
        />
      </div>

      <button
        type="button"
        aria-label="Escanear"
        className="pointer-events-auto absolute top-0 left-1/2 size-[65px] -translate-x-1/2"
      >
        <img src={tabBarCenter} alt="" className="absolute inset-0 size-full" />
        <span className="absolute top-[21px] left-[19px] h-6 w-[26.82px]">
          {SCAN_PIECES.map((piece) => (
            <img
              key={piece.src}
              src={piece.src}
              alt=""
              className={cn('absolute max-w-none', piece.className)}
            />
          ))}
        </span>
      </button>

      <Link
        to="/"
        aria-label="Início"
        className={cn(tabItemClass, 'pointer-events-auto left-[11.11%]')}
      >
        <img src={tabHome} alt="" className="h-[16.67px] w-[15.83px]" />
      </Link>
      <Link
        to="/conta/favoritos"
        aria-label="Favoritos"
        className={cn(tabItemClass, 'pointer-events-auto top-[72px] left-[28.5%]')}
      >
        <img src={tabHeart} alt="" className="h-[17.79px] w-5" />
      </Link>
      <Link
        to="/carrinho"
        aria-label="Carrinho"
        className={cn(tabItemClass, 'pointer-events-auto left-[72.95%]')}
      >
        <img src={tabCart} alt="" className="size-5" />
      </Link>
      <Link
        to="/conta/perfil"
        aria-label="Perfil"
        className={cn(tabItemClass, 'pointer-events-auto left-[87.92%]')}
      >
        <img src={tabUser} alt="" className="size-5" />
      </Link>
    </nav>
  )
}
