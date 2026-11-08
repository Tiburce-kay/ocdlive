import { useEffect, useRef, useState, type ReactNode } from 'react'
import { faqs, packs, reservationUrl, whatsappUrl, type Pack } from './data'
import ReservePage from './ReservePage'

type CategoryId = 'all' | 'short' | 'long' | 'announcement' | 'sales' | 'monthly'
type IconName = Pack['icon'] | 'arrow' | 'check' | 'chevron' | 'clock' | 'message' | 'pin' | 'play' | 'search' | 'spark' | 'user' | 'userplus'

const categories: { id: CategoryId; label: string; icon: IconName }[] = [
  { id: 'all', label: 'Toutes les formules', icon: 'spark' },
  { id: 'short', label: 'Lives de 1 h 30', icon: 'clock' },
  { id: 'long', label: 'Formats 4 heures', icon: 'broadcast' },
  { id: 'announcement', label: 'Avec annonce', icon: 'megaphone' },
  { id: 'sales', label: 'Vente & vidéo', icon: 'shop' },
  { id: 'monthly', label: 'Partenariat mensuel', icon: 'calendar' },
]

const categorySlugs: Record<Exclude<CategoryId, 'all'>, string[]> = {
  short: ['live-1h30', 'live-annonce'],
  long: ['live-4h', 'live-vente-annonce', 'video-live'],
  announcement: ['live-annonce', 'live-vente-annonce', 'video-live', 'mensuel'],
  sales: ['live-vente-annonce', 'video-live'],
  monthly: ['mensuel'],
}

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const shapes: Record<IconName, ReactNode> = {
    arrow: <><path d="M7 17 17 7" /><path d="M7 7h10v10" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m6 9 6 6 6-6" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    message: <><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z" /><path d="M8 12h.01M12 12h.01M16 12h.01" /></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    play: <><circle cx="12" cy="12" r="9" /><path d="m10 8 6 4-6 4z" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></>,
    spark: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z" /><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" /></>,
    broadcast: <><path d="M2 12a10 10 0 0 1 20 0" /><path d="M5 12a7 7 0 0 1 14 0" /><path d="M8 12a4 4 0 0 1 8 0" /><circle cx="12" cy="16" r="1" /></>,
    megaphone: <><path d="m3 11 18-5v12L3 13z" /><path d="M11 15.2 13 21H8l-1.5-6.3" /><path d="M21 10v4" /></>,
    shop: <><path d="M3 9 5 4h14l2 5" /><path d="M4 9v11h16V9" /><path d="M9 20v-6h6v6" /><path d="M3 9a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0" /></>,
    video: <><rect x="3" y="5" width="13" height="14" rx="2" /><path d="m16 10 5-3v10l-5-3" /><path d="m8 10 4 2-4 2z" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /><path d="m8 15 2 2 5-5" /></>,
    user: <><circle cx="12" cy="8" r="3.4" /><path d="M5 20a7 7 0 0 1 14 0" /></>,
    userplus: <><circle cx="10" cy="8" r="3.4" /><path d="M3.5 20a6.5 6.5 0 0 1 13 0" /><path d="M18 5.5v5m2.5-2.5h-5" /></>,
  }

  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {shapes[name]}
    </svg>
  )
}

function Brand() {
  return (
    <a className="brand" href="/" aria-label="OCD Live — accueil">
      <span className="brand-mark" aria-hidden="true"><i /><b /></span>
      <span className="brand-word">OCD<span>LIVE</span></span>
    </a>
  )
}

function PackCard({ pack, index }: { pack: Pack; index: number }) {
  return (
    <article className="pack-product" data-reveal id={`pack-${pack.slug}`} style={{ transitionDelay: `${(index % 2) * 70}ms` }}>
      <div className={`product-art product-art--${index + 1}`} aria-hidden="true">
        <span className="art-code">OCD LIVE <b>/{String(index + 1).padStart(2, '0')}</b></span>
        <span className="art-orbit art-orbit--one" />
        <span className="art-orbit art-orbit--two" />
        <span className="art-icon"><Icon name={pack.icon} size={42} /></span>
        <span className="art-duration">{pack.duration}</span>
      </div>
      <div className="product-info">
        <div className="product-meta"><span>{pack.eyebrow}</span><span className="product-dot" /></div>
        <h3>{pack.name}</h3>
        <p className="product-description">{pack.description}</p>
        <ul className="product-benefits">
          {pack.benefits.map((benefit) => <li key={benefit}><Icon name="check" size={14} />{benefit}</li>)}
        </ul>
        <div className="product-buy">
          <strong className="product-price">{pack.price}</strong>
          <a href={`${reservationUrl(pack.slug)}`} aria-label={`Réserver la formule ${pack.name}`} className="buy-button">Réserver <Icon name="arrow" size={16} /></a>
        </div>
      </div>
    </article>
  )
}

function Catalogue() {
  const [activeCategory, setActiveCategory] = useState<CategoryId>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const accountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!accountOpen) return
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) setAccountOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAccountOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [accountOpen])

  const normalizedSearch = searchTerm.trim().toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const visiblePacks = packs.filter((pack) => {
    const matchesCategory = activeCategory === 'all' || categorySlugs[activeCategory].includes(pack.slug)
    const searchableText = [pack.name, pack.eyebrow, pack.description, pack.duration, pack.price, ...pack.benefits]
      .join(' ').toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    return matchesCategory && (!normalizedSearch || searchableText.includes(normalizedSearch))
  })

  useEffect(() => {
    document.title = 'OCD Live — Les opportunités, c’est dehors'
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#f5f5f5')
    document.querySelector('meta[name="description"]')?.setAttribute('content', 'Présente ton activité en direct sur House of Challenge. Choisis une formule OCD Live, à Lomé ou à distance, et réserve ton créneau.')
    document.documentElement.classList.add('js-motion')
    const elements = document.querySelectorAll<HTMLElement>('[data-reveal]:not(.in-view)')
    if (!('IntersectionObserver' in window)) {
      elements.forEach((element) => element.classList.add('in-view'))
      document.documentElement.classList.remove('js-motion')
      return
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view')
          observer.unobserve(entry.target)
        }
      })
    }, { threshold: 0.1, rootMargin: '0px 0px -28px 0px' })
    elements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [activeCategory, searchTerm])

  const chooseCategory = (category: CategoryId) => {
    setActiveCategory(category)
    setMenuOpen(false)
  }

  return (
    <>
      <div className="announcement-bar">
        <div className="store-shell announcement-inner">
          <span className="announcement-brand"><span className="announcement-live" /> EN DIRECT SUR <strong>@HouseOfChallenge</strong></span>
          <span className="announcement-location"><Icon name="pin" size={14} /> Studio House of Challenge · Lomé, Togo</span>
          <a href={whatsappUrl} target="_blank" rel="noreferrer">Une question ? Écris-nous <Icon name="arrow" size={13} /></a>
        </div>
      </div>

      <header className="store-header" id="top">
        <div className="store-shell header-main">
          <Brand />
          <form className="search-field" role="search" onSubmit={(event) => { event.preventDefault(); event.currentTarget.querySelector('input')?.blur(); document.getElementById('catalogue')?.scrollIntoView({ behavior: 'smooth' }) }}>
            <Icon name="search" size={19} />
            <label className="sr-only" htmlFor="offer-search">Rechercher parmi les formules</label>
            <input id="offer-search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Rechercher parmi les formules" />
            {searchTerm && <button className="clear-search" type="button" aria-label="Effacer la recherche" onClick={() => setSearchTerm('')}>×</button>}
            <button className="search-submit" type="submit" aria-label="Voir les résultats"><Icon name="arrow" size={16} /></button>
          </form>
          <div className="header-actions">
            <a className="header-help" href={whatsappUrl} target="_blank" rel="noreferrer"><span className="help-icon"><Icon name="message" size={18} /></span><span><small>UN CONSEIL ?</small><strong>Parle à l’équipe</strong></span></a>
            <div className="auth-drop" ref={accountRef}>
              <button type="button" className="auth-toggle" aria-haspopup="menu" aria-expanded={accountOpen} aria-label="Mon compte — se connecter ou s’inscrire" onClick={() => setAccountOpen(current => !current)}>
                <Icon name="user" size={19} />
              </button>
              {accountOpen && (
                <div className="auth-menu" role="menu" aria-label="Options de compte">
                  <a role="menuitem" href="/connexion" onClick={() => setAccountOpen(false)}><Icon name="user" size={15} /><span><strong>Se connecter</strong><small>Accéder à mon espace</small></span></a>
                  <a role="menuitem" href="/inscription" onClick={() => setAccountOpen(false)}><Icon name="userplus" size={15} /><span><strong>S’inscrire</strong><small>Créer mon compte OCD Live</small></span></a>
                </div>
              )}
            </div>
            <a className="header-book" href={reservationUrl()}>Réserver <Icon name="arrow" size={16} /></a>
          </div>
          <button className={`menu-toggle ${menuOpen ? 'menu-toggle--open' : ''}`} aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><span /><span /><span /></button>
        </div>
        <nav className={`store-nav ${menuOpen ? 'store-nav--open' : ''}`} aria-label="Navigation principale">
          <div className="store-shell store-nav-inner">
            <a className="nav-catalogue" href="#catalogue"><span className="catalogue-icon"><i /><i /><i /><i /></span>Catalogue des lives</a>
            <a href="#catalogue" onClick={() => chooseCategory('all')}>Toutes les formules</a>
            <a href="#catalogue" onClick={() => chooseCategory('announcement')}>Visibilité & annonces</a>
            <a href="#process">Comment ça marche</a>
            <a href="#faq">Questions fréquentes</a>
            <a className="nav-help-link" href={whatsappUrl} target="_blank" rel="noreferrer"><Icon name="message" size={13} /> Une question ? Écris-nous</a>
            <span className="nav-note">Lomé ou à distance <i /></span>
          </div>
        </nav>
      </header>

      <main>
        <section className="store-hero" aria-labelledby="hero-title">
          <div className="store-shell">
            <div className="hero-banner hero-banner--photo">
              <img className="hero-bg-img" src="/assets/hero-bovann-ocd-afrique.webp" alt="Bovann au studio OCD Live devant la carte de l’Afrique" fetchPriority="high" />
              <span className="hero-bg-shade" aria-hidden="true" />
              <div className="hero-copy">
                <p className="hero-glass-badge"><span className="badge-pulse" aria-hidden="true" /> DIRECT OFFICIEL · @HouseOfChallenge</p>
                <p className="hero-kicker"><span className="hero-kicker-mark"><Icon name="spark" size={14} /></span> LA SCÈNE OCD LIVE · LOMÉ & PARTOUT</p>
                <h1 id="hero-title">Ton business<br />a sa place <span>en direct.</span></h1>
                <p className="hero-description">Présente et vends tes produits à la communauté House of Challenge, avec Bovann — en studio à Lomé ou depuis chez toi.</p>
                <div className="hero-actions">
                  <a className="hero-primary" href="#catalogue">Explorer les formules <Icon name="arrow" size={17} /></a>
                  <a className="hero-secondary" href={reservationUrl()}>Réserver mon créneau</a>
                </div>
                <div className="hero-facts"><span><b>06</b> formats</span><i /><span><b>90</b> jours d’avance</span><i /><span><b>15</b> min de blocage</span></div>
              </div>
              <a className="hero-float-card" href="#catalogue">
                <span className="hero-float-icon"><Icon name="calendar" size={19} /></span>
                <span className="hero-float-text"><small>TON PROCHAIN LIVE</small><strong>Commence par choisir ton format</strong></span>
                <Icon name="arrow" size={16} />
              </a>
            </div>
          </div>
        </section>

        <section className="service-strip" aria-label="Les avantages OCD Live">
          <div className="store-shell service-strip-inner">
            <div><span className="service-icon"><Icon name="check" size={17} /></span><span><strong>Zéro double réservation</strong><small>Ton créneau est bloqué avant paiement</small></span></div>
            <div><span className="service-icon service-icon--orange"><Icon name="calendar" size={17} /></span><span><strong>Un reçu officiel</strong><small>PDF avec QR code de vérification</small></span></div>
            <div><span className="service-icon service-icon--dark"><Icon name="pin" size={17} /></span><span><strong>À Lomé ou à distance</strong><small>Même tarif, même audience</small></span></div>
          </div>
        </section>

        <section className="catalog-section" id="catalogue" aria-labelledby="catalogue-title">
          <div className="store-shell">
            <div className="catalog-heading" data-reveal>
              <div><p className="section-kicker">CHOISIS TON FORMAT</p><h2 id="catalogue-title">Le catalogue <span>OCD Live</span></h2></div>
              <p>Six façons de donner de la visibilité à ton activité. Trouve la formule qui te correspond.</p>
            </div>

            <div className="catalog-layout">
              <aside className="catalog-sidebar" aria-label="Filtrer les formules">
                <div className="sidebar-section">
                  <div className="sidebar-title"><span>CATÉGORIES</span><span className="category-count">{visiblePacks.length}</span></div>
                  <div className="category-list" role="group" aria-label="Catégories de formules">
                    {categories.map((category) => {
                      const count = category.id === 'all' ? packs.length : packs.filter((pack) => categorySlugs[category.id as Exclude<CategoryId, 'all'>].includes(pack.slug)).length
                      return <button className={`category-button ${activeCategory === category.id ? 'category-button--active' : ''}`} key={category.id} onClick={() => chooseCategory(category.id)} aria-pressed={activeCategory === category.id}><span className="category-label"><Icon name={category.icon} size={16} />{category.label}</span><span className="category-count">{count}</span></button>
                    })}
                  </div>
                </div>
                <div className="sidebar-promo">
                  <span className="promo-stars"><Icon name="spark" size={18} /></span>
                  <p className="promo-label">À TON RYTHME</p>
                  <h3>Ton audience, où que tu sois.</h3>
                  <p>Choisis le studio à Lomé ou connecte-toi à distance. Le tarif ne change pas.</p>
                  <a href={whatsappUrl} target="_blank" rel="noreferrer">Parler à l’équipe <Icon name="arrow" size={15} /></a>
                </div>
              </aside>

              <div className="catalog-main">
                <div className="catalog-toolbar">
                  <div><strong>{visiblePacks.length} formule{visiblePacks.length !== 1 ? 's' : ''}</strong><span>{activeCategory === 'all' ? 'à découvrir' : `dans « ${categories.find((category) => category.id === activeCategory)?.label} »`}</span></div>
                  <span className="catalog-tag"><i /> OFFRES OFFICIELLES</span>
                </div>
                {visiblePacks.length > 0 ? <div className="product-grid">{visiblePacks.map((pack) => <PackCard key={pack.slug} pack={pack} index={packs.findIndex((item) => item.slug === pack.slug)} />)}</div> : <div className="empty-state"><Icon name="search" size={26} /><strong>Aucune formule trouvée</strong><span>Essaie un autre terme ou affiche toutes les offres.</span><button onClick={() => { setSearchTerm(''); chooseCategory('all') }}>Réinitialiser les filtres</button></div>}
              </div>
            </div>

            <div className="quick-compare" data-reveal>
              <div className="quick-compare-heading"><span className="compare-icon"><Icon name="spark" size={17} /></span><div><strong>Un repère rapide</strong><small>Les durées et tarifs, en un coup d’œil</small></div></div>
              <div className="quick-compare-list">{packs.map((pack) => <a href={`#pack-${pack.slug}`} key={`quick-${pack.slug}`}><span>{pack.name}</span><small>{pack.duration}</small><strong>{pack.price}</strong><Icon name="arrow" size={14} /></a>)}</div>
            </div>
          </div>
        </section>

        <section className="process-section" id="process" aria-labelledby="process-title">
          <div className="store-shell process-panel">
            <div className="process-intro" data-reveal><p className="section-kicker section-kicker--light">C’EST SIMPLE</p><h2 id="process-title">De ta formule<br />au <span>direct.</span></h2><p>Trois étapes et tout est prêt pour rencontrer la communauté House of Challenge.</p><a href={reservationUrl()}>Choisir mon créneau <Icon name="arrow" size={16} /></a></div>
            <div className="process-steps">
              <article className="process-card" data-reveal><span className="process-number">01</span><span className="process-card-icon"><Icon name="spark" size={20} /></span><h3>Choisis ta formule</h3><p>Le pack adapté à ton budget et à tes objectifs, à Lomé ou à distance.</p></article>
              <article className="process-card" data-reveal style={{ transitionDelay: '90ms' }}><span className="process-number">02</span><span className="process-card-icon process-card-icon--orange"><Icon name="calendar" size={20} /></span><h3>Bloque ton créneau</h3><p>Choisis date et heure. Le créneau reste bloqué 15 minutes pour finaliser le paiement.</p></article>
              <article className="process-card" data-reveal style={{ transitionDelay: '180ms' }}><span className="process-number">03</span><span className="process-card-icon process-card-icon--green"><Icon name="check" size={20} /></span><h3>Passe en direct</h3><p>Reçois ton reçu PDF avec QR code, puis présente-toi ou connecte-toi le jour J.</p></article>
            </div>
          </div>
        </section>

        <section className="faq-section" id="faq" aria-labelledby="faq-title">
          <div className="store-shell faq-layout">
            <div className="faq-heading" data-reveal><p className="section-kicker">ON T’EXPLIQUE</p><h2 id="faq-title">Avant de<br /><span>passer en direct.</span></h2><p>Les réponses utiles pour préparer ton live en toute tranquillité.</p><a className="faq-contact" href={whatsappUrl} target="_blank" rel="noreferrer"><Icon name="message" size={18} />Encore une question ? Écris-nous</a></div>
            <div className="faq-list" data-reveal>{faqs.map((item, index) => {const isOpen = openFaq === index;return <article className={`faq-item ${isOpen ? 'faq-item--open' : ''}`} key={item.question}><h3><button id={`faq-question-${index}`} aria-expanded={isOpen} aria-controls={`faq-answer-${index}`} onClick={() => setOpenFaq(isOpen ? null : index)}><span>{item.question}</span><span className="faq-toggle"><Icon name="chevron" size={16} /></span></button></h3><div className="faq-answer" id={`faq-answer-${index}`} role="region" aria-labelledby={`faq-question-${index}`} aria-hidden={!isOpen}><div><p>{item.answer}</p></div></div></article>})}</div>
          </div>
        </section>

        <section className="closing-section" aria-labelledby="closing-title">
          <div className="store-shell closing-banner" data-reveal><div className="closing-copy"><p className="section-kicker section-kicker--light">LES OPPORTUNITÉS, C’EST DEHORS</p><h2 id="closing-title">Prêt à passer<br />à l’<span>action ?</span></h2><p>Choisis ton format et réserve ton passage sur House of Challenge.</p><a className="closing-button" href={reservationUrl()}>Réserver mon live <Icon name="arrow" size={17} /></a></div><div className="closing-decoration" aria-hidden="true"><span className="closing-orbit closing-orbit--one" /><span className="closing-orbit closing-orbit--two" /><span className="closing-play"><Icon name="play" size={35} /></span><span className="closing-spark"><Icon name="spark" size={24} /></span></div></div>
        </section>
      </main>

      <footer className="store-footer">
        <div className="store-shell footer-main"><div className="footer-brand"><Brand /><p>Le direct officiel pour les entrepreneurs et créateurs OCD.</p></div><div className="footer-column"><strong>EXPLORER</strong><a href="#catalogue">Les formules</a><a href="#process">Comment ça marche</a><a href="#faq">Questions fréquentes</a></div><div className="footer-column"><strong>STUDIO</strong><span>House of Challenge</span><span>Lomé, Togo</span><span>Présentiel & à distance</span></div><div className="footer-column"><strong>CONTACT</strong><a href={whatsappUrl} target="_blank" rel="noreferrer">WhatsApp OCD Live</a><a href="https://ocd-live.fly.dev/cgv" target="_blank" rel="noreferrer">Conditions générales</a><a href="https://ocd-live.fly.dev/confidentialite" target="_blank" rel="noreferrer">Confidentialité</a></div></div>
        <div className="store-shell footer-bottom"><span>© {new Date().getFullYear()} OCD Live · Les opportunités, c’est dehors.</span><span>Des offres conçues pour ton prochain direct.</span></div>
      </footer>
    </>
  )
}

type Route = 'catalogue' | 'reserve'

function resolveRoute(pathname: string): Route {
  return /\/reserver\/?$/.test(pathname) ? 'reserve' : 'catalogue'
}

function App() {
  const [route, setRoute] = useState<Route>(() => resolveRoute(window.location.pathname))

  useEffect(() => {
    const syncRoute = () => setRoute(resolveRoute(window.location.pathname))
    window.addEventListener('popstate', syncRoute)
    return () => window.removeEventListener('popstate', syncRoute)
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
    if (route === 'reserve') {
      document.title = 'Réserver ton live — OCD Live'
      document.documentElement.classList.remove('js-motion')
    }
  }, [route])

  return (
    <>
      {route === 'reserve' ? <ReservePage /> : <Catalogue />}
      <OverflowProbe />
    </>
  )
}

function OverflowProbe() {
  const [report, setReport] = useState<string[]>([])
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (window.location.port !== '3000' && !new URLSearchParams(window.location.search).has('debug')) return
    let prevSignature = ''
    const scan = () => {
      const viewportWidth = document.documentElement.clientWidth
      const offenders: string[] = []
      for (const element of document.body.querySelectorAll('*')) {
        if (element.closest('#rb-probe')) continue
        const rect = element.getBoundingClientRect()
        if (rect.width > viewportWidth + 1 || rect.right > viewportWidth + 1) {
          const rawClassValue = (element as HTMLElement).className
          const classes = typeof rawClassValue === 'string' ? rawClassValue : ((rawClassValue as SVGAnimatedString | null)?.baseVal ?? '')
          const mainClass = classes.trim().split(/\s+/)[0] ?? ''
          offenders.push(`<${element.tagName.toLowerCase()}${mainClass ? '.' + mainClass : ''}> w=${Math.round(rect.width)} right=${Math.round(rect.right)} vw=${viewportWidth}`)
          if (offenders.length >= 10) break
        }
      }
      const signature = offenders.join('|')
      if (signature !== prevSignature) {
        prevSignature = signature
        setReport(offenders)
      }
    }
    scan()
    const timer = window.setInterval(scan, 1500)
    window.addEventListener('resize', scan)
    window.addEventListener('scroll', scan, { passive: true })
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('resize', scan)
      window.removeEventListener('scroll', scan)
    }
  }, [])

  if (!report.length || !visible) return null
  return (
    <div id="rb-probe" aria-hidden="true" style={{ position: 'fixed', left: 10, bottom: 10, zIndex: 9999, maxWidth: 'min(94vw, 430px)', maxHeight: '48vh', overflow: 'auto', padding: '12px 26px 12px 12px', borderRadius: 12, background: 'rgba(191, 34, 34, .95)', color: 'white', font: '600 10px/1.6 monospace', boxShadow: '0 12px 34px rgba(0,0,0,.4)' }}>
      <button type="button" aria-label="Fermer le rapport" onClick={() => setVisible(false)} style={{ position: 'absolute', top: 4, right: 8, border: 0, background: 'transparent', color: 'white', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
      <strong style={{ display: 'block', marginBottom: 6 }}>{report.length} élément(s) hors viewport :</strong>
      {report.map((line) => <div key={line} style={{ whiteSpace: 'nowrap' }}>{line}</div>)}
    </div>
  )
}

export default App
