import React, { useState } from 'react';
import {
  ArrowUpRight,
  ArrowRight,
  Truck,
  RotateCcw,
  ShieldCheck,
  Lock,
  Heart,
} from 'lucide-react';
import {
  resolveProductImage,
  getProductColorVariants,
  resolveColourHex,
  type CategoryDto,
  type ProductDto,
} from '../services/storeApi';

interface HomeViewProps {
  categories: CategoryDto[];
  featuredProducts: ProductDto[];
  loading: boolean;
  onExploreCatalog: (categoryId?: number | null) => void;
  onSelectProduct: (productId: number, initialColour?: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  categories,
  featuredProducts,
  loading,
  onExploreCatalog,
  onSelectProduct,
}) => {
  // Subtle interactive mouse parallax for the Hero stage
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [likedIds, setLikedIds] = useState<number[]>([]);
  const [selectedCardColours, setSelectedCardColours] = useState<
    Record<number, string>
  >({});

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    setMousePos({ x, y });
  };

  const toggleWishlist = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setLikedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="w-full bg-[#060608] text-[#F4F4F6] select-none">
      {/* =====================================================================
          1. MONUMENTAL HERO STAGE — GIANT PURE "KF" GRAPHIC MARK (NO TEXT)
             Inspired by GAZU + JENSMARK + Mindly Reference Compositions
      ===================================================================== */}
      <section
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setMousePos({ x: 0, y: 0 })}
        className="relative min-h-[86vh] w-full overflow-hidden flex flex-col justify-between px-6 sm:px-12 lg:px-20 py-12 lg:py-16 border-b border-white/[0.08] bg-gradient-to-b from-[#0A0B0E] via-[#060608] to-[#060608]"
      >
        {/* Architectural Construction Grid Lines SVG behind the KF Emblem */}
        <svg
          className="pointer-events-none absolute inset-0 w-full h-full opacity-20"
          viewBox="0 0 1440 800"
          fill="none"
          preserveAspectRatio="none"
        >
          <line
            x1="0"
            y1="230"
            x2="1440"
            y2="230"
            stroke="white"
            strokeWidth="0.6"
            className="animate-draw-line"
          />
          <line
            x1="0"
            y1="570"
            x2="1440"
            y2="570"
            stroke="white"
            strokeWidth="0.6"
            className="animate-draw-line"
          />
          <line
            x1="420"
            y1="800"
            x2="890"
            y2="0"
            stroke="white"
            strokeWidth="0.6"
            className="animate-draw-line"
          />
          <line
            x1="540"
            y1="800"
            x2="1010"
            y2="0"
            stroke="white"
            strokeWidth="0.6"
            className="animate-draw-line"
          />
          <line
            x1="930"
            y1="0"
            x2="930"
            y2="800"
            stroke="white"
            strokeWidth="0.6"
            className="animate-draw-line"
          />
        </svg>

        {/* Subtle radial spotlight behind center subject */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[680px] h-[680px] rounded-full bg-white/[0.04] blur-[130px]" />

        {/* TOP ROW: Left Editorial Tagline & Right Rotating Seal */}
        <div className="relative z-20 max-w-[1400px] w-full mx-auto flex items-start justify-between">
          <div className="animate-reveal-up">
            <p className="font-display text-xs sm:text-sm uppercase tracking-[0.34em] leading-[1.9] text-[#D8DAE3]">
              STREETWEAR
              <br />
              THAT MOVES
              <br />
              WITH YOU.
            </p>
            <div className="w-10 h-[1.5px] bg-white mt-4" />
          </div>

          {/* Rotating Circular Editorial Stamp (Inspired by Reference Image 3) */}
          <div className="hidden sm:flex relative w-24 h-24 items-center justify-center">
            <svg
              viewBox="0 0 100 100"
              className="w-full h-full animate-spin-slow opacity-75"
            >
              <defs>
                <path
                  id="circlePath"
                  d="M 50, 50 m -36, 0 a 36,36 0 1,1 72,0 a 36,36 0 1,1 -72,0"
                />
              </defs>
              <text
                fill="#E2E4E9"
                fontSize="7.4"
                fontWeight="600"
                letterSpacing="2.5"
              >
                <textPath href="#circlePath">
                  • HEAVYWEIGHT 500 GSM • CAIRO ATELIER
                </textPath>
              </text>
            </svg>
            <div className="absolute w-2 h-2 rotate-45 bg-white" />
          </div>
        </div>

        {/* CENTER MONUMENTAL STAGE: Giant Pure KF Graphic Mark + Layered Model Cutout */}
        <div className="relative z-10 my-auto py-6 flex items-center justify-center">
          {/* Giant Pure KF Graphic Logo (WITHOUT TEXT) */}
          <div
            style={{
              transform: `translate3d(${mousePos.x * -14}px, ${mousePos.y * -10}px, 0)`,
              transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            className="w-full max-w-[880px] flex items-center justify-center pointer-events-none animate-mark-in"
          >
            <img
              src="/kf-mark.svg"
              alt="KF Emblem"
              className="w-[84vw] sm:w-[72vw] lg:w-[820px] h-auto object-contain opacity-95 drop-shadow-[0_25px_70px_rgba(0,0,0,0.95)]"
            />
          </div>

          {/* Center Foreground Editorial Hoodie Portrait Card overlapping the Giant KF Mark */}
          <div
            style={{
              transform: `translate3d(${mousePos.x * 16}px, ${mousePos.y * 12}px, 0)`,
              transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            onClick={() =>
              featuredProducts[0]
                ? onSelectProduct(featuredProducts[0].id)
                : onExploreCatalog(1)
            }
            className="absolute z-20 w-[230px] sm:w-[290px] lg:w-[330px] aspect-[3/4] overflow-hidden bg-[#0D0E12] border border-white/20 shadow-[0_35px_90px_rgba(0,0,0,0.95)] cursor-pointer group"
          >
            <img
              src="/hero-hoodie.jpg"
              alt="500 GSM Heavyweight Hoodie"
              className="w-full h-full object-cover object-left filter grayscale-[20%] contrast-125 transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/20" />
            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
              <div>
                <span className="block font-display text-[9px] uppercase tracking-[0.26em] text-white/70">
                  ARCHIVE // 01
                </span>
                <span className="block font-brand text-xs font-bold uppercase tracking-wider text-white mt-0.5">
                  500 GSM OBSIDIAN HOODIE
                </span>
              </div>
              <span className="w-7 h-7 rounded-full bg-white text-[#060608] flex items-center justify-center transition-transform duration-300 group-hover:rotate-45">
                <ArrowUpRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

          {/* Floating Orbital Spec Card — Left (Inspired by Reference Image 3) */}
          <div
            style={{
              transform: `translate3d(${mousePos.x * 24}px, ${mousePos.y * -16}px, 0) rotate(-4deg)`,
              transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            className="hidden lg:flex absolute left-[8%] xl:left-[13%] top-[18%] z-30 flex-col gap-1.5 px-5 py-4 bg-white/[0.06] backdrop-blur-xl border border-white/20 shadow-2xl w-52"
          >
            <span className="text-[9px] font-display uppercase tracking-[0.26em] text-[#9EA2B3]">
              MATERIAL DENSITY
            </span>
            <span className="font-brand text-xs font-bold uppercase tracking-wider text-white">
              500 GSM COMBED FLEECE
            </span>
            <span className="text-[11px] text-[#B4B6C2] leading-snug">
              Double-lined hood. Zero drawstring minimal construction.
            </span>
          </div>

          {/* Floating Orbital Spec Card — Right (Inspired by Reference Image 3) */}
          <div
            style={{
              transform: `translate3d(${mousePos.x * -22}px, ${mousePos.y * 18}px, 0) rotate(4deg)`,
              transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            className="hidden lg:flex absolute right-[8%] xl:right-[13%] bottom-[16%] z-30 flex-col gap-1.5 px-5 py-4 bg-white/[0.06] backdrop-blur-xl border border-white/20 shadow-2xl w-52"
          >
            <span className="text-[9px] font-display uppercase tracking-[0.26em] text-[#9EA2B3]">
              PROPORTION SYSTEM
            </span>
            <span className="font-brand text-xs font-bold uppercase tracking-wider text-white">
              BOXY DROP-SHOULDER
            </span>
            <span className="text-[11px] text-[#B4B6C2] leading-snug">
              Tailored for an architectural oversized menswear drape.
            </span>
          </div>
        </div>

        {/* BOTTOM ROW: Left Sharp Rectangular CTA + Right "NEW COLLECTION 2026" */}
        <div className="relative z-20 max-w-[1400px] w-full mx-auto flex flex-col sm:flex-row sm:items-end justify-between gap-6 pt-4">
          <div className="flex items-center gap-7">
            <button
              type="button"
              onClick={() => onExploreCatalog(null)}
              className="px-8 py-4 bg-white hover:bg-[#E2E4E9] text-[#060608] font-display text-[11px] font-bold uppercase tracking-[0.24em] transition-all duration-300 cursor-pointer shadow-[0_10px_30px_rgba(255,255,255,0.18)]"
            >
              SHOP NOW
            </button>

            <button
              type="button"
              onClick={() => onExploreCatalog(1)}
              className="py-2 font-display text-[11px] font-bold uppercase tracking-[0.22em] text-white border-b border-white hover:opacity-75 transition cursor-pointer"
            >
              EXPLORE NEW IN
            </button>
          </div>

          <div className="text-left sm:text-right">
            <p className="font-display text-xs uppercase tracking-[0.32em] leading-[1.85] text-[#D8DAE3]">
              NEW
              <br />
              COLLECTION
              <br />
              2026
            </p>
            <div className="w-8 h-[1.5px] bg-white mt-2 sm:ml-auto" />
          </div>
        </div>
      </section>

      {/* =====================================================================
          2. 3-COLUMN DARK ARCHITECTURAL DIVISION BAR (Matches GAZU Reference)
      ===================================================================== */}
      <section className="w-full bg-[#0B0C0F] border-b border-white/[0.08]">
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/[0.08]">
          {[
            {
              id: categories[0]?.id ?? 1,
              title: categories[0]?.categoryName ?? 'HEAVYWEIGHT HOODIES',
              desc: '500 GSM oversized fleece silhouettes.',
              cta: 'SHOP HOODIES',
              img: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=500&q=80',
            },
            {
              id: categories[1]?.id ?? 2,
              title: categories[1]?.categoryName ?? 'TECH & ZIP HOODIES',
              desc: 'Two-way matte chrome zip outerwear.',
              cta: 'SHOP ZIP & TECH',
              img: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=500&q=80',
            },
            {
              id: categories[2]?.id ?? 3,
              title: categories[2]?.categoryName ?? 'TEES & CARGOS',
              desc: '300 GSM boxy tees & utility cargos.',
              cta: 'SHOP ESSENTIALS',
              img: 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?auto=format&fit=crop&w=500&q=80',
            },
          ].map((item) => (
            <div
              key={item.title}
              onClick={() => onExploreCatalog(item.id)}
              className="group p-6 sm:p-8 lg:p-10 flex items-center gap-6 hover:bg-white/[0.02] transition cursor-pointer"
            >
              <div className="w-24 h-28 sm:w-28 sm:h-32 shrink-0 overflow-hidden bg-[#14151B]">
                <img
                  src={item.img}
                  alt={item.title}
                  className="w-full h-full object-cover object-center filter grayscale-[25%] transition-transform duration-500 group-hover:scale-108"
                />
              </div>
              <div className="space-y-2">
                <h3 className="font-brand text-sm sm:text-base font-bold uppercase tracking-wider text-white">
                  {item.title}
                </h3>
                <p className="text-xs text-[#8E91A0] leading-relaxed">
                  {item.desc}
                </p>
                <span className="inline-flex items-center gap-1.5 pt-2 font-display text-[10px] font-bold uppercase tracking-[0.22em] text-white border-b border-white/60 pb-0.5 group-hover:border-white">
                  <span>{item.cta}</span>
                  <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =====================================================================
          3. ARCHITECTURAL BRAND IDENTITY BENTO GRID (Matches JENSMARK Reference)
      ===================================================================== */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-8 py-20 lg:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* TILE 1 (Top-Left): Pure KF Mark with Architectural Construction Grid */}
          <div className="lg:col-span-4 relative aspect-square bg-[#0A0A0D] border border-white/[0.1] overflow-hidden flex items-center justify-center p-10 group">
            <svg
              className="pointer-events-none absolute inset-0 w-full h-full opacity-30"
              viewBox="0 0 400 400"
              fill="none"
            >
              {/* Horizontal construction lines */}
              <line x1="0" y1="138" x2="400" y2="138" stroke="white" strokeWidth="0.6" />
              <line x1="0" y1="185" x2="400" y2="185" stroke="white" strokeWidth="0.6" />
              <line x1="0" y1="262" x2="400" y2="262" stroke="white" strokeWidth="0.6" />
              {/* Vertical construction lines */}
              <line x1="305" y1="0" x2="305" y2="400" stroke="white" strokeWidth="0.6" />
              <line x1="278" y1="0" x2="278" y2="400" stroke="white" strokeWidth="0.6" />
              {/* Diagonal construction tangents matching the KF slant */}
              <line x1="40" y1="400" x2="310" y2="0" stroke="white" strokeWidth="0.6" />
              <line x1="95" y1="400" x2="365" y2="0" stroke="white" strokeWidth="0.6" />
              <line x1="155" y1="400" x2="400" y2="35" stroke="white" strokeWidth="0.6" />
            </svg>

            <img
              src="/kf-mark.svg"
              alt="KF Geometric Construction"
              className="relative z-10 w-4/5 h-auto object-contain opacity-45 group-hover:opacity-85 transition-opacity duration-500"
            />

            <div className="absolute bottom-4 left-5 right-5 flex items-center justify-between text-[10px] font-display uppercase tracking-[0.22em] text-[#686B7A]">
              <span>MONOGRAM // KF</span>
              <span>GRID 1:1.618</span>
            </div>
          </div>

          {/* TILE 2 (Top-Center): Brand Personalities Floating Pills + Arrow Circle */}
          <div
            onClick={() => onExploreCatalog(null)}
            className="lg:col-span-5 relative min-h-[380px] bg-[#0A0A0D] border border-white/[0.1] overflow-hidden p-7 flex flex-col justify-between cursor-pointer group"
          >
            {/* Giant Tonal KF Watermark in Background */}
            <img
              src="/kf-mark.svg"
              alt=""
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[88%] h-auto object-contain opacity-[0.06]"
            />

            <div className="relative z-10 flex items-center justify-between text-[11px] font-display tracking-wide text-[#7D8091]">
              <span>Brand</span>
              <span>Personalities</span>
            </div>

            {/* Angled Pill Tags matching Reference Image 1 */}
            <div className="relative z-10 my-auto py-6 flex flex-col items-center justify-center gap-4">
              <div className="flex items-center gap-5 w-full justify-center">
                <span className="px-6 py-2.5 rounded-full bg-white text-[#060608] font-display text-sm sm:text-base font-bold tracking-tight -rotate-12 shadow-xl transition-transform duration-500 group-hover:-rotate-6">
                  • Modern
                </span>
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white text-[#060608] flex items-center justify-center shadow-xl transition-transform duration-500 group-hover:rotate-45">
                  <ArrowUpRight className="w-7 h-7 stroke-[2]" />
                </div>
              </div>

              <span className="px-7 py-2.5 rounded-full bg-white text-[#060608] font-display text-sm sm:text-base font-bold tracking-tight -rotate-[18deg] -ml-14 shadow-xl transition-transform duration-500 group-hover:-rotate-12">
                • Premium
              </span>

              <div className="flex flex-wrap items-center justify-center gap-4 pt-1">
                <span className="px-6 py-2.5 rounded-full bg-white text-[#060608] font-display text-sm sm:text-base font-bold tracking-tight shadow-xl">
                  • Heavyweight
                </span>
                <span className="px-6 py-2.5 rounded-full bg-white text-[#060608] font-display text-sm sm:text-base font-bold tracking-tight rotate-[16deg] shadow-xl transition-transform duration-500 group-hover:rotate-6">
                  • Confident
                </span>
              </div>
            </div>

            <div className="relative z-10 flex items-center justify-between text-[10px] font-display uppercase tracking-[0.22em] text-[#686B7A]">
              <span>KHALIFA WEAR HOUSE</span>
              <span>CAIRO // 2026</span>
            </div>
          </div>

          {/* TILE 3 (Right): Swiss Editorial Portrait & Callout Matrix */}
          <div className="lg:col-span-3 relative min-h-[380px] bg-[#0D0E12] border border-white/[0.1] overflow-hidden flex flex-col justify-between">
            <div className="relative flex-1 min-h-[250px] overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1516826957135-700dedea698c?auto=format&fit=crop&w=800&q=85"
                alt="Editorial Streetwear"
                className="w-full h-full object-cover object-center filter grayscale contrast-125"
              />
              <div className="absolute inset-0 bg-black/45" />

              <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-[9px] font-display uppercase tracking-[0.22em] text-white/80">
                <span>NEW BRAND</span>
                <span>2026</span>
              </div>

              {/* Minimal Swiss Coordinate Callouts */}
              <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 grid grid-cols-2 gap-y-5 text-[9px] font-display uppercase tracking-[0.18em] text-white">
                <div>
                  <span className="block text-white/60">WEIGHT</span>
                  <span className="font-bold">500 GSM</span>
                </div>
                <div className="text-right">
                  <span className="block text-white/60">SILHOUETTE</span>
                  <span className="font-bold">MODERN FITS</span>
                </div>
                <div>
                  <span className="block text-white/60">GRADE</span>
                  <span className="font-bold">PREMIUM QUALITY</span>
                </div>
                <div className="text-right">
                  <span className="block text-white/60">RELEASE</span>
                  <span className="font-bold">LIMITED EDITION</span>
                </div>
              </div>
            </div>

            {/* Bottom Swiss Typography Block matching Reference Image 1 */}
            <div className="p-5 bg-[#070709] border-t border-white/[0.1] flex items-end justify-between gap-3">
              <div>
                <p className="font-display text-sm font-bold uppercase leading-tight tracking-wider text-white">
                  MODERN &nbsp;&nbsp;&nbsp;&nbsp; EVERYDAY
                  <br />
                  FITS &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; WEAR &nbsp; ©
                </p>
                <p className="text-[10px] text-[#7D8091] mt-2 leading-relaxed">
                  Engineered heavyweight cotton hoodies built for daily urban armor.
                </p>
              </div>
              <img
                src="/kf-mark.svg"
                alt="KF"
                className="h-5 w-auto object-contain shrink-0 opacity-90"
              />
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          4. EDITORIAL SPLIT BANNER ("NEW SEASON // HEAVYWEIGHT VIBES")
             Inspired by GAZU Reference Image 2
      ===================================================================== */}
      <section className="w-full bg-[#101116] border-y border-white/[0.08] overflow-hidden">
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 items-center">
          <div className="lg:col-span-5 p-8 sm:p-14 lg:p-16 space-y-6">
            <span className="font-display text-xs uppercase tracking-[0.34em] text-[#9EA2B3] block">
              NEW SEASON
            </span>
            <h2 className="font-brand text-4xl sm:text-5xl font-extrabold uppercase leading-[1.06] tracking-wide text-white">
              NEW
              <br />
              VIBES
            </h2>
            <p className="text-sm text-[#B4B6C2] max-w-sm leading-relaxed">
              Discover our 500 GSM pigment-dyed hoodies, articulated two-way zip outerwear, and
              heavyweight street essentials.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => onExploreCatalog(null)}
                className="px-8 py-4 bg-white hover:bg-[#E2E4E9] text-[#060608] font-display text-[11px] font-bold uppercase tracking-[0.24em] transition cursor-pointer"
              >
                EXPLORE COLLECTION
              </button>
            </div>
          </div>

          <div className="lg:col-span-7 relative h-[360px] sm:h-[460px] overflow-hidden bg-[#08090C]">
            <img
              src="/new-vibes-hoodies.png"
              alt="New Season Heavyweight Collection"
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#101116] via-transparent to-transparent" />
            <img
              src="/kf-mark.svg"
              alt=""
              className="pointer-events-none absolute right-8 bottom-6 h-16 w-auto object-contain opacity-25"
            />
          </div>
        </div>
      </section>

      {/* =====================================================================
          5. 4-PILLAR SERVICE GUARANTEE BAR (Matches GAZU Reference)
      ===================================================================== */}
      <section className="w-full bg-[#090A0D] border-b border-white/[0.08]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-9 grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex items-center gap-4">
            <Truck className="w-6 h-6 text-white shrink-0 stroke-[1.5]" />
            <div>
              <h4 className="font-display text-xs font-bold uppercase tracking-[0.18em] text-white">
                FAST DELIVERY
              </h4>
              <p className="text-[11px] text-[#8E91A0] mt-0.5">
                Quick &amp; safe dispatch across Egypt
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <RotateCcw className="w-6 h-6 text-white shrink-0 stroke-[1.5]" />
            <div>
              <h4 className="font-display text-xs font-bold uppercase tracking-[0.18em] text-white">
                EASY RETURNS
              </h4>
              <p className="text-[11px] text-[#8E91A0] mt-0.5">
                Within 14 days of delivery
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <ShieldCheck className="w-6 h-6 text-white shrink-0 stroke-[1.5]" />
            <div>
              <h4 className="font-display text-xs font-bold uppercase tracking-[0.18em] text-white">
                QUALITY ASSURED
              </h4>
              <p className="text-[11px] text-[#8E91A0] mt-0.5">
                100% combed 500 GSM fleece
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Lock className="w-6 h-6 text-white shrink-0 stroke-[1.5]" />
            <div>
              <h4 className="font-display text-xs font-bold uppercase tracking-[0.18em] text-white">
                SECURE CHECKOUT
              </h4>
              <p className="text-[11px] text-[#8E91A0] mt-0.5">
                Verified stock &amp; payment protection
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          6. "BEST OF KHALIFA" — MINIMALIST EDITORIAL PRODUCT GRID
             Matches GAZU Reference Image 2
      ===================================================================== */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-8 py-20 lg:py-24">
        <div className="flex items-end justify-between mb-10">
          <h2 className="font-brand text-xl sm:text-2xl font-extrabold uppercase tracking-wider text-white">
            BEST OF KHALIFA
          </h2>

          <button
            type="button"
            onClick={() => onExploreCatalog(null)}
            className="font-display text-xs font-bold uppercase tracking-[0.22em] text-white border-b border-white pb-1 hover:opacity-75 transition cursor-pointer"
          >
            VIEW ALL
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="aspect-[3/4] bg-white/[0.03] border border-white/[0.08] animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.slice(0, 6).map((product) => {
              const isLiked = likedIds.includes(product.id);
              const variants = getProductColorVariants(product);
              const activeColour =
                selectedCardColours[product.id] ??
                variants[0]?.colour ??
                product.colour ??
                'Obsidian Black';
              const activeVariant =
                variants.find(
                  (v) => v.colour.toLowerCase() === activeColour.toLowerCase()
                ) ?? variants[0];
              const displayImage =
                activeVariant?.image ||
                resolveProductImage(product.image, product.id);

              return (
                <div
                  key={product.id}
                  onClick={() => onSelectProduct(product.id, activeColour)}
                  className="group cursor-pointer flex flex-col"
                >
                  {/* Sharp 3:4 Portrait Image Frame */}
                  <div className="relative aspect-[3/4] w-full bg-[#101116] border border-white/[0.09] overflow-hidden mb-3.5">
                    <img
                      key={displayImage}
                      src={displayImage}
                      alt={`${product.productName} - ${activeColour}`}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          '/product-placeholder.svg';
                      }}
                      className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

                    {/* Top-Right Wishlist Circle Button (Matches GAZU Reference) */}
                    <button
                      type="button"
                      onClick={(e) => toggleWishlist(e, product.id)}
                      aria-label="Save to wishlist"
                      className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-[#060608] flex items-center justify-center transition cursor-pointer shadow-md"
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          isLiked ? 'fill-[#060608] text-[#060608]' : 'text-[#060608]'
                        }`}
                      />
                    </button>

                    {/* Slide-Up Quick Select Bar on Hover */}
                    <div className="absolute inset-x-0 bottom-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-black/85 backdrop-blur-md border-t border-white/15 flex items-center justify-between">
                      <span className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                        SELECT SIZE ({product.size || 'S–XXL'})
                      </span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-white" />
                    </div>
                  </div>

                  {/* Small Colored Circles (Swatches) */}
                  {variants.length > 0 && (
                    <div
                      className="flex items-center gap-2 mb-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {variants.map((variant) => {
                        const isSelected =
                          variant.colour.toLowerCase() ===
                          activeColour.toLowerCase();
                        return (
                          <button
                            key={variant.colour}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCardColours((prev) => ({
                                ...prev,
                                [product.id]: variant.colour,
                              }));
                            }}
                            title={variant.colour}
                            aria-label={`Preview ${product.productName} in ${variant.colour}`}
                            className={`w-4 h-4 rounded-full transition-all cursor-pointer ${
                              isSelected
                                ? 'ring-2 ring-white ring-offset-2 ring-offset-[#060608] scale-110'
                                : 'opacity-75 hover:opacity-100 hover:scale-110 border border-white/30'
                            }`}
                            style={{
                              backgroundColor: resolveColourHex(
                                variant.colour,
                                variant.colorHex
                              ),
                            }}
                          />
                        );
                      })}
                      {variants.length > 1 && (
                        <span className="text-[9px] font-display uppercase tracking-wider text-[#9EA2B3] ml-1">
                          {variants.length} COLORS
                        </span>
                      )}
                    </div>
                  )}

                  {/* Minimalist Editorial Product Meta */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-display text-[10px] uppercase tracking-[0.2em] text-[#7D8091]">
                        {product.categoryName || 'HOODIES'} • {activeColour}
                      </p>
                      <h3 className="font-display text-sm font-bold uppercase tracking-wide text-white mt-0.5 group-hover:underline">
                        {product.productName}
                      </h3>
                    </div>
                    <span className="font-brand text-xs sm:text-sm font-bold text-white shrink-0">
                      {product.unitPrice.toLocaleString()} EGP
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
