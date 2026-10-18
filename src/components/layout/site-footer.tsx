import { Link } from '@tanstack/react-router'
import facebookIcon from '@/assets/social/facebook.svg'
import instagramIcon from '@/assets/social/instagram.svg'
import linkedinIcon from '@/assets/social/linkedin.svg'
import twitterIcon from '@/assets/social/twitter.svg'
import youtubeIcon from '@/assets/social/youtube.svg'
import { ComingSoon } from '@/components/coming-soon'
import { NewsletterForm } from '@/features/newsletter/components/newsletter-form'
import { cn } from '@/lib/utils'

const HIGHLIGHTS = [
  {
    letter: 'W',
    title: 'Segurança da carteira',
    description: 'Proteja sua carteira e colecione arte digital verificada com confiança.',
  },
  {
    letter: 'C',
    title: 'Criadores em destaque',
    description: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.',
  },
  {
    letter: 'D',
    title: 'Alertas de lançamentos',
    description:
      'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.',
  },
]

interface FooterLink {
  label: string
  to?: '/conta/perfil' | '/conta/pedidos' | '/conta/favoritos'
  /** Catalog collection id the item filters the home listing by. */
  collection?: string
}

const LINK_COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: 'Meu perfil',
    links: [
      { label: 'Meu perfil', to: '/conta/perfil' },
      { label: 'Minha coleção' },
      { label: 'Atividade', to: '/conta/pedidos' },
      { label: 'Estúdio do criador' },
      { label: 'Lista de interesse', to: '/conta/favoritos' },
    ],
  },
  {
    title: 'Central de ajuda',
    links: [
      { label: 'Central de ajuda' },
      { label: 'Como comprar NFTs' },
      { label: 'Carteira e segurança' },
      { label: 'Política do mercado' },
      { label: 'Denunciar item' },
    ],
  },
  {
    title: 'Coleções',
    links: [
      { label: 'Arte digital', collection: 'digital-art' },
      { label: 'Fotografia', collection: 'photography' },
      { label: 'Música', collection: 'music' },
      { label: 'Arte 3D', collection: '3d-art' },
      { label: 'Utilidade', collection: 'utility' },
    ],
  },
]

const linkClass = 'hover:text-highlight'

function FooterLinkItem({ link }: { link: FooterLink }) {
  if (link.to) {
    return (
      <Link to={link.to} className={linkClass}>
        {link.label}
      </Link>
    )
  }
  if (link.collection) {
    return (
      <Link to="/" search={{ collection: link.collection }} hash="catalogo" className={linkClass}>
        {link.label}
      </Link>
    )
  }
  return (
    <ComingSoon feature={link.label} className={linkClass}>
      {link.label}
    </ComingSoon>
  )
}

const SOCIAL_LINKS = [
  { label: 'Facebook', icon: facebookIcon },
  { label: 'Instagram', icon: instagramIcon },
  { label: 'Twitter', icon: twitterIcon },
  { label: 'LinkedIn', icon: linkedinIcon },
  { label: 'YouTube', icon: youtubeIcon },
]

export function SiteFooter({ className }: { className?: string }) {
  return (
    <footer className={cn('flex flex-col', className)}>
      <div className="bg-surface-card p-6 md:p-8 wide:h-[250px]">
        <div className="grid gap-8 md:grid-cols-3 wide:flex wide:h-full wide:items-start wide:gap-0">
          {HIGHLIGHTS.map((item, index) => (
            <div key={item.letter} className="contents">
              {index > 0 && <span aria-hidden className="hidden w-px self-stretch bg-primary wide:block" />}
              <div className="flex flex-col gap-3 wide:min-w-0 wide:flex-1 wide:px-4">
                <span className="grid size-[74px] place-items-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                  {item.letter}
                </span>
                <h2 className="text-[17px] leading-4 font-bold wide:whitespace-nowrap">{item.title}</h2>
                <p className="text-sm leading-[22px] text-muted-foreground wide:w-[204px]">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
          <span aria-hidden className="hidden w-px self-stretch bg-primary wide:block" />
          <NewsletterForm className="md:col-span-3 wide:h-full wide:w-[357px] wide:px-4" />
        </div>
      </div>

      <div className="grid gap-4 bg-surface-dark p-6 text-sm leading-[22px] sm:grid-cols-2 md:p-8 wide:flex wide:h-[88px] wide:items-center wide:gap-[92px]">
        <p className="py-2 leading-[normal] font-bold tracking-[1.4px] wide:flex-1">KURIO</p>
        <p className="wide:flex-1 wide:whitespace-nowrap">
          Feito para colecionadores,
          <br />
          criadores e cultura
        </p>
        <a href="mailto:contato@email.com" className="hover:text-highlight wide:flex-1">
          contato@email.com
        </a>
        <a href="tel:+551140028922" className="hover:text-highlight wide:w-[228px]">
          +55 11 4002 8922
        </a>
      </div>

      <div className="flex flex-col items-center gap-1.5">
        <div className="grid w-full gap-8 bg-surface-card p-6 sm:grid-cols-2 md:p-8 lg:grid-cols-4 wide:flex wide:h-[236px] wide:gap-[124px]">
          {LINK_COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title} className="flex flex-col gap-2 wide:flex-1">
              <h2 className="text-lg leading-4 font-bold">{column.title}</h2>
              <ul className="text-sm leading-[30px]">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <FooterLinkItem link={link} />
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div className="flex flex-col gap-8 wide:w-[228px]">
            <div className="flex flex-col gap-5">
              <h2 className="text-lg leading-4 font-bold">Redes sociais</h2>
              <ul className="flex items-center gap-2.5">
                {SOCIAL_LINKS.map((social) => (
                  <li key={social.label} className="relative size-[30px]">
                    <img
                      src={social.icon}
                      alt={social.label}
                      className="absolute -inset-px size-8 max-w-none"
                    />
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-3">
              <h2 className="text-lg leading-4 font-bold">Carteiras compatíveis</h2>
              <p className="flex h-[26px] items-center justify-center rounded-[6px] border border-border-soft bg-surface-dark pl-2 text-[9px] leading-[normal] font-bold tracking-[0.1px] whitespace-pre text-highlight">
                {'METAMASK  •  WALLETCONNECT  •  COINBASE'}
              </p>
            </div>
          </div>
        </div>
        <p className="text-center text-sm leading-[30px]">
          © 2026 Kurio. Propriedade digital para todos.
        </p>
      </div>
    </footer>
  )
}
