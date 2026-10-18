import arrowRightPrimary from '@/assets/icons/arrow-right-primary.svg'
import heroBannerMobile from '@/assets/home/hero-banner-mobile.svg'
import heroDotsMobile from '@/assets/home/hero-dots-mobile.svg'
import heroDots from '@/assets/home/hero-dots.svg'
import emeraldApe from '@/assets/nfts/emerald-ape.webp'
import neonVessel from '@/assets/nfts/neon-vessel.webp'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const CATALOG_SECTION_ID = 'catalogo'

export function HomeHero({ className }: { className?: string }) {
  return (
    <section
      aria-labelledby="home-hero-title"
      className={cn('flex items-center xl:h-[450px] xl:pl-10', className)}
    >
      <div className="flex w-full items-center justify-between gap-10">
        <div className="flex w-full max-w-[600px] flex-col items-end gap-11">
          <div className="flex w-full flex-col items-start gap-8">
            <div className="flex w-full flex-col gap-1">
              <div className="flex flex-col gap-2">
                <p className="text-sm leading-4 font-medium tracking-[1.4px]">
                  Bem-vindo à Kurio
                </p>
                <h1
                  id="home-hero-title"
                  className="text-[30px] leading-[48px] font-bold lg:text-[36px] lg:leading-[58px] xl:text-[43px] xl:leading-[70px]"
                >
                  <span className="block">SEJA DONO DO FUTURO</span>
                  <span className="block">DA ARTE DIGITAL</span>
                </h1>
              </div>
              <p className="max-w-[557px] text-sm leading-6 text-muted-foreground">
                Descubra NFTs selecionados de criadores emergentes e consagrados.
                Colecione arte digital rara, apoie artistas e tenha uma parte da
                cultura da internet.
              </p>
            </div>
            <Button
              asChild
              className="h-10 w-[140px] rounded-[6px] pr-9 pl-7 text-base leading-5 font-bold"
            >
              <a href={`#${CATALOG_SECTION_ID}`}>EXPLORAR</a>
            </Button>
          </div>
          <img src={heroDots} alt="" className="h-2 w-10" />
        </div>

        <img
          src={emeraldApe}
          alt="Emerald Ape, NFT em destaque"
          fetchPriority="high"
          className="aspect-square w-[42%] max-w-[450px] shrink-0 rounded-[24px] object-cover"
        />
      </div>
    </section>
  )
}

export function MobileHeroBanner({ className }: { className?: string }) {
  return (
    <section
      aria-labelledby="mobile-hero-title"
      className={cn(
        'relative isolate flex h-[190px] flex-col overflow-hidden rounded-[12px] px-4 pt-[5.5px]',
        className,
      )}
    >
      <img
        src={heroBannerMobile}
        alt=""
        className="absolute inset-0 -z-10 size-full max-w-none"
      />
      <div className="flex h-[156px] items-start justify-between gap-2">
        <div className="flex w-[188px] flex-col">
          <p className="text-xs leading-4 font-medium">Bem-vindo à Kurio</p>
          <h1
            id="mobile-hero-title"
            className="mt-1.5 w-[190px] text-lg leading-[29px] font-bold"
          >
            <span className="block">SEJA DONO DA</span>
            <span className="block">CULTURA DIGITAL</span>
          </h1>
          <p className="mt-1.5 text-xs leading-[18px] text-muted-foreground">
            Descubra NFTs selecionados de criadores do mundo todo.
          </p>
          <a
            href={`#${CATALOG_SECTION_ID}`}
            className="flex items-center gap-2 text-xs leading-[14px] font-bold text-highlight"
          >
            EXPLORAR
            <span className="relative size-4">
              <img
                src={arrowRightPrimary}
                alt=""
                className="absolute top-1/2 left-1/2 h-[11.5px] w-[9.53px] max-w-none -translate-1/2 -rotate-90"
              />
            </span>
          </a>
        </div>
        <div className="mt-[5px] grid shrink-0 place-items-start">
          <img
            src={emeraldApe}
            alt=""
            className="col-start-1 row-start-1 size-[138px] rounded-[16px] object-cover"
          />
          <img
            src={neonVessel}
            alt=""
            className="col-start-1 row-start-1 mt-[88px] ml-[14px] size-[58px] rounded-[16px] object-cover"
          />
        </div>
      </div>
      <img src={heroDotsMobile} alt="" className="mx-auto mt-4 h-[7px] w-[33px]" />
    </section>
  )
}
