import { Link, useNavigate } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import activityIcon from '@/assets/account/activity.svg'
import downloadIcon from '@/assets/account/download.svg'
import heartIcon from '@/assets/account/heart.svg'
import logoutIcon from '@/assets/account/logout.svg'
import offersIcon from '@/assets/account/offers.svg'
import sidebarDivider from '@/assets/account/sidebar-divider.svg'
import supportIcon from '@/assets/account/support.svg'
import userActiveIcon from '@/assets/account/user-active.svg'
import userIcon from '@/assets/account/user.svg'
import walletActiveIcon from '@/assets/account/wallet-active.svg'
import walletIcon from '@/assets/account/wallet.svg'
import { PageShell } from '@/components/layout/page-shell'
import { IconFrame } from '@/components/ui/icon-frame'
import { useLogout } from '@/features/auth/api'
import { cn } from '@/lib/utils'

export type AccountSection = 'profile' | 'wallets' | 'orders' | 'favorites'

type AccountPath = '/conta/perfil' | '/conta/carteiras' | '/conta/pedidos' | '/conta/favoritos'

/** Icon geometry from the design: outer box, optional inner box, optional stroke bleed. */
interface IconSpec {
  size: string
  inner?: string
  bleed?: string
}

function SidebarIcon({ src, spec }: { src: string; spec: IconSpec }) {
  return <IconFrame src={src} className={spec.size} inner={spec.inner} bleed={spec.bleed} />
}

interface NavEntry {
  label: string
  icon: string
  activeIcon?: string
  spec: IconSpec
  gap: string
  section?: AccountSection
  to?: AccountPath
}

const NAV: NavEntry[] = [
  {
    label: 'Dados do perfil',
    icon: userIcon,
    activeIcon: userActiveIcon,
    spec: { size: 'size-[18px]' },
    gap: 'gap-4',
    section: 'profile',
    to: '/conta/perfil',
  },
  {
    label: 'Carteiras',
    icon: walletIcon,
    activeIcon: walletActiveIcon,
    spec: { size: 'size-5', inner: 'inset-[8.33%_14.59%_10.42%_16.67%]' },
    gap: 'gap-3',
    section: 'wallets',
    to: '/conta/carteiras',
  },
  {
    label: 'Atividade',
    icon: activityIcon,
    spec: { size: 'size-[18px]' },
    gap: 'gap-3',
    section: 'orders',
    to: '/conta/pedidos',
  },
  {
    label: 'Lista de interesse',
    icon: heartIcon,
    spec: { size: 'size-4' },
    gap: 'gap-3',
    section: 'favorites',
    to: '/conta/favoritos',
  },
  {
    label: 'Ofertas',
    icon: offersIcon,
    spec: {
      size: 'size-[18px]',
      inner: 'inset-[9.79%_10.05%_10.2%_10.21%]',
      bleed: 'inset-[-5.21%_-5.22%_-5.21%_-5.23%]',
    },
    gap: 'gap-3',
  },
  {
    label: 'Arquivos baixados',
    icon: downloadIcon,
    spec: {
      size: 'size-[18px]',
      inner: 'inset-[11.46%_11.46%_11.01%_11.46%]',
      bleed: 'inset-[-5.37%_-5.4%_-5.38%_-5.41%]',
    },
    gap: 'gap-3',
  },
  {
    label: 'Suporte',
    icon: supportIcon,
    spec: { size: 'size-[18px]', inner: 'inset-[12.5%_10.42%]', bleed: 'inset-[-5.56%_-5.26%]' },
    gap: 'gap-3',
  },
]

const LOGOUT_SPEC: IconSpec = {
  size: 'size-5',
  inner: 'inset-[11.46%_9.2%_11.46%_9.41%]',
  bleed: 'inset-[-4.86%_-4.61%_-4.87%_-4.61%]',
}

export function AccountLayout({ section, children }: { section: AccountSection; children: ReactNode }) {
  const logout = useLogout()
  const navigate = useNavigate()

  const signOut = () =>
    logout.mutate(undefined, {
      onSettled: () => void navigate({ to: '/', replace: true }),
    })

  return (
    <PageShell active="home" tabBar>
      <div className="flex flex-col gap-6 px-6 pt-10 md:px-0 md:pt-0 lg:flex-row lg:items-start lg:gap-7">
        <nav
          aria-label="Minha conta"
          className="flex shrink-0 flex-col bg-surface-card py-2 max-lg:overflow-x-auto lg:w-[310px]"
        >
          <p className="p-2.5 text-lg leading-4 font-bold">Meu perfil</p>
          <ul className="flex max-lg:flex-row max-lg:flex-wrap lg:flex-col">
            {NAV.map((entry) => {
              const active = entry.section === section
              const content = (
                <>
                  <SidebarIcon src={active && entry.activeIcon ? entry.activeIcon : entry.icon} spec={entry.spec} />
                  <span className="text-[15px] leading-[45px] whitespace-nowrap text-highlight">{entry.label}</span>
                </>
              )
              const rowClass = cn(
                'flex w-full items-center px-4',
                entry.gap,
                active && 'border-l-6 border-primary',
              )
              return (
                <li key={entry.label} className="lg:w-full">
                  {entry.to ? (
                    <Link to={entry.to} aria-current={active ? 'page' : undefined} className={rowClass}>
                      {content}
                    </Link>
                  ) : (
                    // Destinations not covered by the challenge stay visible but inert.
                    <span aria-disabled className={cn(rowClass, 'cursor-not-allowed opacity-80')} title="Em breve">
                      {content}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
          <img src={sidebarDivider} alt="" className="block h-px w-full max-w-none opacity-40" />
          <button
            type="button"
            onClick={signOut}
            disabled={logout.isPending}
            className="flex h-10 w-full items-center gap-2 px-4 text-[15px] leading-[15px] font-bold text-highlight"
          >
            <SidebarIcon src={logoutIcon} spec={LOGOUT_SPEC} />
            {logout.isPending ? 'Saindo…' : 'Sair'}
          </button>
        </nav>

        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </PageShell>
  )
}
