import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { packs, whatsappUrl, type Pack } from './data'
import './reserve.css'

type PackItem = Pack & { apiId: number }
type Mode = 'onsite' | 'remote'
type StepId = 1 | 2 | 3 | 4
type Slot = { start: string; end: string; is_available: boolean; status?: string; message?: string }
type Hold = { kind: 'api' | 'demo'; code: string; confirmUrl?: string; successUrl?: string }
type PaymentMethodId = 'flooz' | 'tmoney' | 'card'
type PaymentPhase = 'choose' | 'processing' | 'done'
type FormState = {
  tiktok_handle: string
  business_name: string
  full_name: string
  phone: string
  email: string
  activity_type: string
  activity_description: string
  consent: boolean
}
type FormErrors = Partial<Record<keyof FormState, string>>

const API_BASE = 'https://ocd-live.fly.dev'
const HOLD_SECONDS = 15 * 60

const packItems: PackItem[] = packs.map((pack, index) => ({ ...pack, apiId: index + 1 }))

const announcementSlugs = new Set(['live-annonce', 'live-vente-annonce', 'video-live', 'mensuel'])

const activityTypes = [
  'Prêt-à-porter, Mode & Habillement',
  'Chaussures, Maroquinerie & Accessoires',
  'Beauté, Cosmétiques, Parfums & Coiffure',
  'Bijouterie, Montres & Joaillerie',
  'Restauration, Pâtisserie & Traiteur',
  'Agroalimentaire & Produits locaux',
  'Smartphones, High-Tech & Électronique',
  'Décoration d’intérieur, Mobilier & Artisanat',
  'Santé, Bien-être & Soins naturels',
  'Services, Agence & Freelance',
  'Éducation, Coaching & Formation',
  'Événementiel & Divertissement',
  'Autre',
]

const paymentMethods: { id: PaymentMethodId; label: string; detail: string }[] = [
  { id: 'flooz', label: 'Flooz', detail: 'Moov Togo' },
  { id: 'tmoney', label: 'T-Money', detail: 'Togocom' },
  { id: 'card', label: 'Carte', detail: 'Visa · Mastercard' },
]

const steps: { id: StepId; label: string }[] = [
  { id: 1, label: 'La formule' },
  { id: 2, label: 'Le créneau' },
  { id: 3, label: 'Tes infos' },
  { id: 4, label: 'Le paiement' },
]

// ── Utilitaires ──────────────────────────────────────────────────────────────

const pad = (value: number) => String(value).padStart(2, '0')

const toISODate = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

const todayISO = () => toISODate(new Date())

const addDays = (iso: string, days: number) => {
  const date = new Date(`${iso}T12:00:00`)
  date.setDate(date.getDate() + days)
  return toISODate(date)
}

const parseISO = (iso: string) => new Date(`${iso}T12:00:00`)

const formatLongDate = (iso: string) =>
  parseISO(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

const capitalize = (value: string) => {
  const [first, ...rest] = value.trim()
  return first ? `${first.toLocaleUpperCase('fr-FR')}${rest.join('')}` : value
}

const shortDayLabel = (iso: string) => parseISO(iso).toLocaleDateString('fr-FR', { weekday: 'short' })
const shortDayNumber = (iso: string) => parseISO(iso).getDate()
const shortMonthLabel = (iso: string) => parseISO(iso).toLocaleDateString('fr-FR', { month: 'short' })

const slotHour = (start: string) => Number(start.slice(0, 2))

// ── Récupération des créneaux ────────────────────────────────────────────────

const demoBaseSlots: { start: string; end: string }[] = [
  { start: '09:00', end: '10:30' },
  { start: '10:30', end: '12:00' },
  { start: '14:00', end: '15:30' },
  { start: '15:30', end: '17:00' },
  { start: '17:00', end: '18:30' },
  { start: '18:30', end: '20:00' },
  { start: '20:30', end: '22:00' },
]

function demoSlots(date: string): Slot[] {
  const seed = [...date].reduce((sum, char) => sum + char.charCodeAt(0), 0)
  const now = new Date()
  const isToday = date === todayISO()
  return demoBaseSlots.map((base, index) => {
    const booked = (seed + index * 7) % 4 === 0
    const past = isToday && slotHour(base.start) <= now.getHours() + 1
    return { ...base, is_available: !booked && !past, status: booked ? 'booked' : past ? 'past' : 'open' }
  })
}

async function fetchAvailability(packId: number, date: string): Promise<{ list: Slot[]; demo: boolean }> {
  try {
    const response = await fetch(`${API_BASE}/api/availability?pack_id=${packId}&date=${date}`, {
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) throw new Error('unavailable')
    const data = (await response.json()) as { available_starts?: { start: string }[]; all_slots?: Slot[] }
    const all = data.all_slots ?? []
    if (!all.length) throw new Error('empty')
    const available = new Set((data.available_starts ?? []).map((slot) => slot.start))
    return {
      list: all.map((slot) => ({ ...slot, is_available: Boolean(slot.is_available ?? available.has(slot.start)) })),
      demo: false,
    }
  } catch {
    return { list: demoSlots(date), demo: true }
  }
}

async function requestHold(payload: Record<string, string>): Promise<Hold> {
  const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? ''
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' }
  if (csrf) headers['X-CSRF-TOKEN'] = csrf
  try {
    const response = await fetch(`${API_BASE}/api/holds`, { method: 'POST', headers, body: JSON.stringify(payload) })
    const data = (await response.json().catch(() => ({}))) as { code?: string; confirm_url?: string; success_url?: string; message?: string }
    if (!response.ok) {
      if (response.status === 429) throw new Error('Trop de tentatives en peu de temps. Patiente une minute avant de réessayer.')
      throw new Error(data.message || 'Le créneau semble indisponible à cet instant exact. Réessaie ou contacte l’équipe sur WhatsApp.')
    }
    if (!data.code) throw new Error('Réponse inattendue du serveur de réservation.')
    return { kind: 'api', code: data.code, confirmUrl: data.confirm_url, successUrl: data.success_url }
  } catch (error) {
    if (import.meta.env.DEV && error instanceof TypeError) {
      // Backend injoignable en local (aperçu hors du domaine ocd-live.fly.dev) : mode démonstration.
      return { kind: 'demo', code: `OCD-DEMO-${pad(new Date().getHours())}${pad(new Date().getMinutes())}` }
    }
    throw new Error('Impossible de joindre le serveur de réservation. Vérifie ta connexion et réessaie, ou finalise directement avec l’équipe sur WhatsApp.')
  }
}

async function confirmPayment(hold: Hold): Promise<string | undefined> {
  if (hold.kind === 'demo') return undefined
  try {
    const response = await fetch(`${API_BASE}${hold.confirmUrl ?? ''}`, {
      headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    })
    const data = (await response.json().catch(() => ({}))) as { redirect?: string }
    return data.redirect ?? hold.successUrl
  } catch {
    return hold.successUrl ?? `${API_BASE}/`
  }
}

// ── Design system local ─────────────────────────────────────────────────────

type ReserveIcon =
  | 'arrow' | 'back' | 'check' | 'chevron' | 'spark' | 'calendar' | 'clock' | 'pin' | 'globe'
  | 'shield' | 'message' | 'lock' | 'user' | 'building' | 'mail' | 'phone' | 'tag' | 'video'
  | 'x' | 'alert' | 'card' | 'coins' | 'download' | 'star' | 'hand'

function Icon({ name, size = 18 }: { name: ReserveIcon; size?: number }) {
  const shapes: Record<ReserveIcon, ReactNode> = {
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    back: <path d="M10 8 4 12l6 4M4 12h16" />,
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m6 9 6 6 6-6" />,
    spark: <path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z" />,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /><path d="m8 15 2 2 5-5" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.5 3.5 5.6 3.5 9s-1 6.5-3.5 9m0-18C9.5 5.5 8.5 8.6 8.5 12s1 6.5 3.5 9" /></>,
    shield: <path d="M12 3 5 5.5v5.2c0 4.4 3 8 7 10.3 4-2.3 7-5.9 7-10.3V5.5L12 3Zm-2.8 8.7 2 2 3.6-3.9" />,
    message: <><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z" /><path d="M8 12h.01M12 12h.01M16 12h.01" /></>,
    lock: <><rect x="5" y="10.5" width="14" height="10" rx="2.4" /><path d="M8 10.5V7.6a4 4 0 0 1 8 0v2.9" /></>,
    user: <><circle cx="12" cy="8" r="3.4" /><path d="M5 20a7 7 0 0 1 14 0" /></>,
    building: <><rect x="4" y="3.5" width="16" height="17" rx="1.6" /><path d="M9 7.5h2m2 0h2M9 11h2m2 0h2M9 14.5h2m2 0h2M10 20.5v-2.6h4v2.6" /></>,
    mail: <><rect x="3.5" y="5.5" width="17" height="13" rx="2" /><path d="m4 7 8 6 8-6" /></>,
    phone: <path d="M5 4h4l1.6 4-2.2 1.7a12.6 12.6 0 0 0 5.9 5.9L16 13.4l4 1.6v4a1.9 1.9 0 0 1-2.1 2A15.6 15.6 0 0 1 3 6.1 1.9 1.9 0 0 1 5 4Z" />,
    tag: <><path d="M3 11V4.2A1.2 1.2 0 0 1 4.2 3H11l9 9-7 7-9-9a1.2 1.2 0 0 1-1-.9" /><circle cx="7.4" cy="7.4" r="1.4" /></>,
    video: <><rect x="3" y="5" width="13" height="14" rx="2" /><path d="m16 10 5-3v10l-5-3" /><path d="m8 10 4 2-4 2z" /></>,
    x: <path d="M6 6l12 12M18 6 6 18" />,
    alert: <><circle cx="12" cy="12" r="9" /><path d="M12 8v4.5" /><path d="M12 16h.01" /></>,
    card: <><rect x="3" y="5.5" width="18" height="13" rx="2.4" /><path d="M3 10h18" /></>,
    coins: <><circle cx="9.5" cy="9.5" r="5.5" /><path d="M14.2 6.6a5.5 5.5 0 1 1-1.6 10.8" /><path d="m18 21 2.8-1.2a7.5 7.5 0 0 0-4.4-9" /></>,
    download: <path d="M12 4v11m-5-4 5 5 5-5M5 20h14" />,
    star: <path d="M12 3.5 14.4 9l5.8.5-4.4 3.9 1.3 5.7-5.1-3-5.1 3 1.3-5.7L3.8 9.5 9.6 9 12 3.5Z" />,
    hand: <><path d="M8 12V5.6a1.5 1.5 0 0 1 3 0V11m0-4.4a1.5 1.5 0 0 1 3 0V11m0-2.9a1.5 1.5 0 0 1 3 0V13c0 4.5-2.4 7.5-6.6 7.5A5.9 5.9 0 0 1 4.9 17L3.5 13a1.6 1.6 0 0 1 2.9-1.2L8 14" /></>,
  }
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {shapes[name]}
    </svg>
  )
}

// ── Petit composant réutilisable pour les champs ─────────────────────────────

type FieldProps = {
  id: keyof FormState
  label: string
  hint?: string
  required?: boolean
  error?: string
  type?: 'text' | 'tel' | 'email' | 'select' | 'textarea'
  value: string
  placeholder?: string
  autoComplete?: string
  onChange: (value: string) => void
  onBlur?: () => void
  icon: ReserveIcon
  options?: string[]
}

function Field({ id, label, hint, required, error, type = 'text', value, placeholder, autoComplete, onChange, onBlur, icon, options }: FieldProps) {
  const inputClass = `rb-field__input ${error ? 'rb-field__input--error' : ''}`
  return (
    <div className={`rb-field ${type === 'textarea' ? 'rb-field--wide' : ''}`}>
      <label className="rb-field__label" htmlFor={`field-${id}`}>
        <Icon name={icon} size={14} /> {label} {required && <em>*</em>}
      </label>
      {type === 'select' ? (
        <select id={`field-${id}`} className={inputClass} value={value} onChange={(event) => onChange(event.target.value)} onBlur={onBlur}>
          <option value="" disabled>-- Choisis ton secteur --</option>
          {options?.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      ) : type === 'textarea' ? (
        <textarea id={`field-${id}`} rows={2} className={inputClass} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} onBlur={onBlur} />
      ) : (
        <input
          id={`field-${id}`}
          type={type}
          className={inputClass}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          aria-invalid={Boolean(error)}
        />
      )}
      {error ? (
        <p className="rb-field__error"><Icon name="alert" size={12} /> {error}</p>
      ) : hint ? (
        <p className="rb-field__hint">{hint}</p>
      ) : null}
    </div>
  )
}

// ── Page de réservation ──────────────────────────────────────────────────────

function ReservePage() {
  const [step, setStep] = useState<StepId>(1)
  const [maxStep, setMaxStep] = useState<StepId>(1)
  const [selectedPack, setSelectedPack] = useState<PackItem | undefined>(() => {
    const slug = new URLSearchParams(window.location.search).get('pack')
    return packItems.find((item) => item.slug === slug)
  })
  const [mode, setMode] = useState<Mode>('onsite')
  const [selectedDate, setSelectedDate] = useState(todayISO())
  const [stripStart, setStripStart] = useState(todayISO())
  const [customDateOpen, setCustomDateOpen] = useState(false)
  const [allSlots, setAllSlots] = useState<Slot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [slotWarning, setSlotWarning] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [form, setForm] = useState<FormState>({
    tiktok_handle: '',
    business_name: '',
    full_name: '',
    phone: '',
    email: '',
    activity_type: '',
    activity_description: '',
    consent: true,
  })
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [hold, setHold] = useState<Hold | null>(null)
  const [holdError, setHoldError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [paymentPhase, setPaymentPhase] = useState<PaymentPhase>('choose')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId>('flooz')
  const [countdown, setCountdown] = useState(HOLD_SECONDS)
  const [redirectUrl, setRedirectUrl] = useState('')
  const stepAnchor = useRef<HTMLDivElement>(null)

  const chooseDate = (iso: string) => {
    setSelectedDate(iso)
    setSelectedTime('')
  }

  const stripDays = useMemo(() => Array.from({ length: 14 }, (_, index) => addDays(stripStart, index)), [stripStart])

  const groupedSlots = useMemo(() => {
    const groups = [
      { id: 'morning', label: 'Matinée', slots: [] as Slot[] },
      { id: 'afternoon', label: 'Après-midi', slots: [] as Slot[] },
      { id: 'evening', label: 'En soirée', slots: [] as Slot[] },
    ]
    allSlots.forEach((slot) => {
      const hour = slotHour(slot.start)
      ;(hour < 12 ? groups[0] : hour < 17 ? groups[1] : groups[2]).slots.push(slot)
    })
    return groups.filter((group) => group.slots.length > 0)
  }, [allSlots])

  const isTimeAvailable = (time: string) => allSlots.some((slot) => slot.start === time && slot.is_available)

  useEffect(() => {
    document.title = 'Réserver ton live — OCD Live'
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#f5f5f7')
    document.querySelector('meta[name="description"]')?.setAttribute('content', 'Réserve ton créneau en direct sur House of Challenge avec Bovann : formule, date et paiement officiel — à Lomé ou à distance.')
    document.documentElement.classList.remove('js-motion')
  }, [])

  useEffect(() => {
    if (!selectedPack) return
    let cancelled = false
    setLoadingSlots(true)
    setSlotWarning('')
    fetchAvailability(selectedPack.apiId, selectedDate).then((result) => {
      if (cancelled) return
      setAllSlots(result.list)
      setLoadingSlots(false)
      const available = result.list.filter((slot) => slot.is_available)
      if (!available.length) {
        setSelectedTime('')
        setSlotWarning(
          result.list.length > 0 && result.list.every((slot) => slot.status === 'past')
            ? 'Les créneaux du jour sont déjà passés. Choisis une date à venir dans l’agenda.'
            : 'Tous les créneaux de cette date sont déjà réservés. Choisis une autre date dans l’agenda.',
        )
      } else if (!available.some((slot) => slot.start === selectedTime)) {
        setSelectedTime(available[0].start)
      }
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPack?.apiId, selectedDate])

  useEffect(() => {
    if (step !== 4 || paymentPhase !== 'choose' || !hold) return
    setCountdown(HOLD_SECONDS)
    const interval = window.setInterval(() => {
      setCountdown((value) => Math.max(0, value - 1))
    }, 1000)
    return () => window.clearInterval(interval)
  }, [step, hold?.code, paymentPhase])

  const goToStep = (next: StepId) => {
    if (next > maxStep || next > 4) return
    setStep(next)
    requestAnimationFrame(() => {
      stepAnchor.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const advanceStep = (next: StepId) => {
    setStep(next)
    setMaxStep((current) => (next > current ? next : current))
    requestAnimationFrame(() => {
      stepAnchor.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const validateStep3 = (): boolean => {
    const errors: FormErrors = {}
    if (!form.tiktok_handle.trim()) errors.tiktok_handle = 'Ton pseudo TikTok est indispensable pour le live.'
    else if (!/^@?[A-Za-z0-9_.]{2,30}$/.test(form.tiktok_handle.trim())) errors.tiktok_handle = 'Format attendu : @toncompte (lettres, chiffres, point, tiret bas).'
    if (!form.full_name.trim() || form.full_name.trim().length < 3) errors.full_name = 'Indique ton nom complet pour le reçu officiel.'
    if (!form.phone.trim() || !/^\+?[0-9][0-9\s.-]{7,14}$/.test(form.phone.trim())) errors.phone = 'Numéro invalide, exemple : +228 90 00 00 00.'
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) errors.email = 'Cet email recevra le reçu PDF, il doit être valide.'
    if (!form.activity_type) errors.activity_type = 'Sélectionne le secteur qui correspond le mieux.'
    if (!form.activity_description.trim() || form.activity_description.trim().length < 10) errors.activity_description = 'Décris ton activité en quelques mots (10 caractères minimum).'
    if (!form.consent) errors.consent = 'Merci d’accepter les conditions pour continuer.'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const normalizeTiktok = () => {
    setForm((current) => ({ ...current, tiktok_handle: withAt(current.tiktok_handle.trim()) }))
  }

  const withAt = (handle: string) => (handle.startsWith('@') ? handle : `@${handle}`)

  const submitInfos = async () => {
    if (step !== 3 || !selectedPack) return
    if (!isTimeAvailable(selectedTime)) {
      setSlotWarning('Le créneau sélectionné n’est plus disponible. Choisis-en un autre à l’étape précédente.')
      goToStep(2)
      return
    }
    if (!validateStep3()) return
    normalizeTiktok()
    setIsSubmitting(true)
    setHoldError('')
    try {
      const result = await requestHold({
        pack_id: String(selectedPack.apiId),
        mode,
        starts_at: `${selectedDate} ${selectedTime}`,
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        country: 'TG',
        tiktok_handle: withAt(form.tiktok_handle.trim()),
        business_name: form.business_name.trim(),
        business_description: form.activity_description.trim(),
        activity_type: form.activity_type,
        consent: 'on',
      })
      setHold(result)
      advanceStep(4)
    } catch (error) {
      setHold(null)
      setHoldError(error instanceof Error ? error.message : 'Une erreur inconnue est survenue.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const pay = async () => {
    if (!hold || countdown === 0) return
    setPaymentPhase('processing')
    const target = await confirmPayment(hold)
    window.setTimeout(() => {
      setPaymentPhase('done')
      if (target) {
        setRedirectUrl(target)
        window.setTimeout(() => { window.location.href = target }, 2600)
      }
    }, 1700)
  }

  const quickDates = useMemo(() => {
    const today = todayISO()
    const nextWeekday = (weekDay: number) => {
      const date = new Date()
      const delta = (weekDay - date.getDay() + 7) % 7 || 7
      date.setDate(date.getDate() + delta)
      return toISODate(date)
    }
    return [
      { label: 'Aujourd’hui', iso: today },
      { label: 'Demain', iso: addDays(today, 1) },
      { label: 'Samedi', iso: nextWeekday(6) },
      { label: 'Dans 7 jours', iso: addDays(today, 7) },
    ]
  }, [])

  const compactDate = (iso: string) => parseISO(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

  const countdownLabel = `${pad(Math.floor(countdown / 60))}:${pad(countdown % 60)}`

  const modeLabel = mode === 'onsite' ? 'Salle OCD · Lomé' : 'À distance · TikTok Live'
  const packValid = Boolean(selectedPack)
  const slotValid = Boolean(selectedTime) && isTimeAvailable(selectedTime)
  const formValid = validateRequiredForm()

  function validateRequiredForm(): boolean {
    const trimmed = (value: string) => value.trim().length > 0
    return trimmed(form.tiktok_handle) && trimmed(form.full_name) && trimmed(form.phone) && trimmed(form.email)
      && Boolean(form.activity_type) && trimmed(form.activity_description) && form.consent
  }

  return (
    <div className="rb-page">
      <a className="rb-skip" href="#rb-content">Aller au contenu principal</a>

      {/* En-tête */}
      <header className="rb-head">
        <div className="rb-shell rb-head__inner">
          <a className="rb-head__back" href="/"><Icon name="back" size={17} /> Retour au site</a>
          <span className="rb-brand"><b>OCD</b>LIVE<span>·Réservation officielle</span></span>
          <span className="rb-head__secure"><Icon name="lock" size={14} /> Réservation sécurisée</span>
        </div>
      </header>

      {/* Progression mobile */}
      <div className="rb-mobile-progress" aria-hidden="true">
        <span style={{ width: `${(step / 4) * 100}%` }} />
      </div>

      <main className="rb-shell rb-layout" id="rb-content">
        {/* Colonne latérale — récapitulatif vivant */}
        <aside className="rb-aside" aria-label="Récapitulatif de ta réservation">
          <div className="rb-aside__card">
            <nav className="rb-steps" aria-label="Étapes de réservation">
              {steps.map((entry) => {
                const isDone = step > entry.id
                const isCurrent = step === entry.id
                const reachable = entry.id <= maxStep
                const content = (
                  <>
                    <span className={`rb-steps__dot ${isDone ? 'rb-steps__dot--done' : ''} ${isCurrent ? 'rb-steps__dot--current' : ''}`}>
                      {isDone ? <Icon name="check" size={13} /> : entry.id}
                    </span>
                    <span className="rb-steps__label">{entry.label}</span>
                  </>
                )
                return reachable ? (
                  <button key={entry.id} type="button" className={`rb-steps__item ${isCurrent ? 'rb-steps__item--current' : ''}`} onClick={() => goToStep(entry.id)} aria-current={isCurrent ? 'step' : undefined}>
                    {content}
                  </button>
                ) : (
                  <div key={entry.id} className="rb-steps__item" aria-disabled="true">{content}</div>
                )
              })}
            </nav>
          </div>

          <div className="rb-aside__card rb-recap">
            <p className="rb-recap__kicker">TON RÉCAPITULATIF</p>
            <div className="rb-recap__line">
              <Icon name="video" size={15} />
              <span><small>Formule</small><strong>{selectedPack ? selectedPack.name : 'À choisir'}</strong></span>
            </div>
            <div className="rb-recap__line">
              <Icon name="pin" size={15} />
              <span><small>Lieu</small><strong>{selectedPack ? modeLabel : '—'}</strong></span>
            </div>
            <div className="rb-recap__line">
              <Icon name="calendar" size={15} />
              <span><small>Date</small><strong>{selectedPack && maxStep >= 2 ? capitalize(formatLongDate(selectedDate)) : '—'}</strong></span>
            </div>
            <div className="rb-recap__line">
              <Icon name="clock" size={15} />
              <span><small>Heure</small><strong>{selectedTime || '—'} {selectedTime && `→ ${allSlots.find((slot) => slot.start === selectedTime)?.end ?? ''}`}</strong></span>
            </div>
            <div className="rb-recap__total">
              <span>Total</span>
              <strong>{selectedPack ? selectedPack.price : '—'}</strong>
            </div>
          </div>

          <ul className="rb-assurance">
            <li><Icon name="shield" size={15} /> Créneau bloqué 15 min le temps du paiement</li>
            <li><Icon name="download" size={15} /> Reçu PDF officiel avec QR code de vérification</li>
            <li><Icon name="globe" size={15} /> Lomé en présentiel ou à distance, même tarif</li>
          </ul>

          <a className="rb-aside__help" href={whatsappUrl} target="_blank" rel="noreferrer">
            <Icon name="message" size={17} />
            <span><small>UN DOUTE, UNE QUESTION ?</small><strong>L’équipe répond sur WhatsApp</strong></span>
            <Icon name="arrow" size={15} />
          </a>
        </aside>

        {/* Colonne principale — les étapes */}
        <div className="rb-main" ref={stepAnchor}>
          {/* ÉTAPE 1 — LA FORMULE */}
          {step === 1 && (
            <section className="rb-pane" aria-labelledby="step1-title">
              <header className="rb-pane__head">
                <p className="rb-pane__eyebrow">ÉTAPE 1 / 4</p>
                <h1 id="step1-title">Choisis la <em>formule</em> de ton direct</h1>
                <p className="rb-pane__sub">Chaque formule est un passage en direct sur le compte officiel @HouseOfChallenge avec Bovann. Présentiel à Lomé, ou à distance — tarif identique.</p>
              </header>

              <div className="rb-packs" role="radiogroup" aria-label="Formules de live">
                {packItems.map((pack) => {
                  const active = selectedPack?.slug === pack.slug
                  return (
                    <button
                      key={pack.slug}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      className={`rb-pack ${active ? 'rb-pack--active' : ''}`}
                      onClick={() => { setSelectedPack(pack); setSelectedTime('') }}
                    >
                      <span className="rb-pack__check"><Icon name="check" size={13} /></span>
                      <span className="rb-pack__body">
                        <span className="rb-pack__eyebrow">{pack.eyebrow}</span>
                        <span className="rb-pack__name">{pack.name}</span>
                        <span className="rb-pack__desc">{pack.description}</span>
                        <span className="rb-pack__tags">
                          <span className="rb-chip"><Icon name="clock" size={11} /> {pack.duration}</span>
                          {announcementSlugs.has(pack.slug) ? <span className="rb-chip rb-chip--warm"><Icon name="spark" size={11} /> Annonce incluse</span> : null}
                        </span>
                      </span>
                      <span className="rb-pack__price">{pack.price}</span>
                    </button>
                  )
                })}
              </div>

              <div className="rb-block">
                <p className="rb-block__title">Comment veux-tu intervenir ?</p>
                <div className="rb-modes">
                  <button type="button" className={`rb-mode ${mode === 'onsite' ? 'rb-mode--active' : ''}`} aria-pressed={mode === 'onsite'} onClick={() => setMode('onsite')}>
                    <Icon name="building" size={19} />
                    <span><strong>Présentiel</strong><small>Salle OCD Live · Lomé, Togo</small></span>
                  </button>
                  <button type="button" className={`rb-mode ${mode === 'remote' ? 'rb-mode--active' : ''}`} aria-pressed={mode === 'remote'} onClick={() => setMode('remote')}>
                    <Icon name="globe" size={19} />
                    <span><strong>À distance</strong><small>Depuis chez toi, via TikTok Live</small></span>
                  </button>
                </div>
              </div>

              <footer className="rb-pane__foot">
                <button
                  type="button"
                  className="rb-btn rb-btn--primary"
                  disabled={!packValid}
                  onClick={() => advanceStep(2)}
                >
                  {packValid ? 'Choisir ma date et mon heure' : 'Sélectionne d’abord une formule'}
                  <Icon name="arrow" size={16} />
                </button>
                <p className="rb-pane__note"><Icon name="hand" size={13} /> Indécis ? L’équipe peut te conseiller la formule idéale <a href={whatsappUrl} target="_blank" rel="noreferrer">sur WhatsApp</a>.</p>
              </footer>
            </section>
          )}

          {/* ÉTAPE 2 — LE CRÉNEAU */}
          {step === 2 && (
            <section className="rb-pane" aria-labelledby="step2-title">
              <header className="rb-pane__head">
                <p className="rb-pane__eyebrow">ÉTAPE 2 / 4</p>
                <h1 id="step2-title">Quand veux-tu <em>passer</em> en direct ?</h1>
                <p className="rb-pane__sub">Disponibilités en temps réel pour la formule <strong>{selectedPack?.name}</strong> · heure de Lomé (GMT)</p>
              </header>

              <div className="rb-datebar">
                <button type="button" className="rb-datebar__nav" aria-label="Semaine précédente" disabled={stripStart <= todayISO()} onClick={() => setStripStart(addDays(stripStart, -7))}><Icon name="back" size={15} /></button>
                <p className="rb-datebar__month">
                  {capitalize(parseISO(stripDays[0]).toLocaleDateString('fr-FR', { month: 'long' }))}
                  {parseISO(stripDays[13]).getMonth() !== parseISO(stripDays[0]).getMonth() && ` — ${parseISO(stripDays[13]).toLocaleDateString('fr-FR', { month: 'long' })}`}
                </p>
                <button type="button" className="rb-datebar__nav" aria-label="Semaine suivante" onClick={() => setStripStart(addDays(stripStart, 7))}><Icon name="arrow" size={15} /></button>
              </div>

              <div className="rb-quick">
                {quickDates.map((quick) => (
                  <button key={quick.label} type="button" className={`rb-quick__chip ${selectedDate === quick.iso ? 'rb-quick__chip--active' : ''}`} onClick={() => { setStripStart(quick.iso); chooseDate(quick.iso) }}>
                    <span>{quick.label}</span><small>{compactDate(quick.iso)}</small>
                  </button>
                ))}
              </div>

              <div className="rb-strip" role="radiogroup" aria-label="Choisir une date">
                {stripDays.map((iso) => {
                  const active = selectedDate === iso
                  const isToday = iso === todayISO()
                  return (
                    <button key={iso} type="button" role="radio" aria-checked={active} className={`rb-day ${active ? 'rb-day--active' : ''}`} onClick={() => chooseDate(iso)}>
                      {isToday && <span className="rb-day__flag">Auj.</span>}
                      <small>{shortDayLabel(iso)}</small>
                      <strong>{shortDayNumber(iso)}</strong>
                      <span className="rb-day__month">{shortMonthLabel(iso)}</span>
                    </button>
                  )
                })}
              </div>

              <div className="rb-datelink">
                <button type="button" onClick={() => setCustomDateOpen((open) => !open)} aria-expanded={customDateOpen}>
                  <Icon name="calendar" size={14} /> Choisir une date plus précise <small>(disponible jusqu’à 90 jours)</small>
                </button>
                {customDateOpen && (
                  <input
                    type="date"
                    value={selectedDate}
                    min={todayISO()}
                    max={addDays(todayISO(), 90)}
                    onChange={(event) => { if (event.target.value) { setStripStart(event.target.value); chooseDate(event.target.value) } }}
                    aria-label="Date précise du live"
                  />
                )}
              </div>

              {slotWarning && (
                <div className="rb-alert rb-alert--warn" role="alert">
                  <Icon name="alert" size={17} />
                  <div><strong>Créneau indisponible</strong><p>{slotWarning}</p></div>
                </div>
              )}

              <div className="rb-block rb-slots">
                <div className="rb-slots__head">
                  <p className="rb-block__title">Horaires disponibles</p>
                  <div className="rb-legend">
                    <span><i className="rb-legend__free" /> Disponible</span>
                    <span><i className="rb-legend__busy" /> Déjà réservé</span>
                  </div>
                </div>

                {loadingSlots ? (
                  <div className="rb-loading"><span className="rb-loading__spin" aria-hidden="true" /><p>Vérification des disponibilités en direct…</p></div>
                ) : groupedSlots.length === 0 ? (
                  <p className="rb-empty">Aucun créneau ouvert pour cette date. Choisis une autre date dans l’agenda ci-dessus.</p>
                ) : (
                  groupedSlots.map((group) => (
                    <div key={group.id} className="rb-slots__group">
                      <p className="rb-slots__group-label">{group.label}</p>
                      <div className="rb-slots__grid">
                        {group.slots.map((slot) => {
                          const selected = selectedTime === slot.start
                          if (slot.is_available) {
                            return (
                              <button key={slot.start} type="button" className={`rb-slot ${selected ? 'rb-slot--selected' : ''}`} aria-pressed={selected} onClick={() => { setSelectedTime(slot.start); setSlotWarning('') }}>
                                <strong>{slot.start}</strong>
                                <small>→ {slot.end}</small>
                              </button>
                            )
                          }
                          return (
                            <button
                              key={slot.start}
                              type="button"
                              className={`rb-slot ${slot.status === 'past' ? 'rb-slot--past' : 'rb-slot--busy'}`}
                              onClick={() => setSlotWarning(
                                slot.status === 'booked'
                                  ? `Le créneau de ${slot.start} vient d’être réservé. Choisis un créneau libre.`
                                  : slot.message || `Le créneau de ${slot.start} est passé pour aujourd’hui.`,
                              )}
                            >
                              <strong>{slot.start}</strong>
                              <small>{slot.status === 'booked' ? 'Occupé' : 'Passé'}</small>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))
                )}
                {allSlots.some((slot) => !slot.is_available && slot.status === 'booked') && (
                  <p className="rb-demohint"><Icon name="hand" size={12} /> Les créneaux marqués « Occupé » sont des réservations déjà confirmées.</p>
                )}
              </div>

              <footer className="rb-pane__foot rb-pane__foot--split">
                <button type="button" className="rb-btn rb-btn--ghost" onClick={() => goToStep(1)}><Icon name="back" size={15} /> Revoir la formule</button>
                <button type="button" className="rb-btn rb-btn--primary" disabled={!slotValid} onClick={() => advanceStep(3)}>Valider ce créneau <Icon name="arrow" size={16} /></button>
              </footer>
            </section>
          )}

          {/* ÉTAPE 3 — INFOS */}
          {step === 3 && (
            <section className="rb-pane" aria-labelledby="step3-title">
              <header className="rb-pane__head">
                <p className="rb-pane__eyebrow">ÉTAPE 3 / 4</p>
                <h1 id="step3-title">Ton <em>identité</em> & ta marque</h1>
                <p className="rb-pane__sub">Ces informations préparent ton passage : elles apparaissent sur le reçu officiel et servent à annoncer ton live.</p>
              </header>

              {holdError && (
                <div className="rb-alert rb-alert--error" role="alert">
                  <Icon name="alert" size={17} />
                  <div><strong>Blocage du créneau impossible</strong><p>{holdError}</p></div>
                </div>
              )}

              <div className="rb-form">
                <Field id="tiktok_handle" icon="video" label="Ton compte TikTok" required type="text" value={form.tiktok_handle} placeholder="@toncompte" autoComplete="off" error={formErrors.tiktok_handle} hint="C’est sur ce compte que tu interviendras en direct." onChange={(value) => setForm((current) => ({ ...current, tiktok_handle: value }))} onBlur={validateStep3} />
                <Field id="business_name" icon="building" label="Nom de ton entreprise ou marque" type="text" value={form.business_name} placeholder="Ex. Koffi Fashion" autoComplete="organization" error={formErrors.business_name} onChange={(value) => setForm((current) => ({ ...current, business_name: value }))} />
                <Field id="full_name" icon="user" label="Nom & prénom(s)" required type="text" value={form.full_name} placeholder="Ex. Koffi Mensah" autoComplete="name" error={formErrors.full_name} onChange={(value) => setForm((current) => ({ ...current, full_name: value }))} onBlur={validateStep3} />
                <Field id="phone" icon="phone" label="WhatsApp / Téléphone" required type="tel" value={form.phone} placeholder="+228 90 00 00 00" autoComplete="tel" error={formErrors.phone} onChange={(value) => setForm((current) => ({ ...current, phone: value }))} onBlur={validateStep3} />
                <Field id="email" icon="mail" label="Email officiel" required type="email" value={form.email} placeholder="contact@tondomaine.com" autoComplete="email" error={formErrors.email} hint="Le reçu PDF officiel est envoyé à cette adresse, aucune publicité ne l’accompagne." onChange={(value) => setForm((current) => ({ ...current, email: value }))} onBlur={validateStep3} />
                <Field id="activity_type" icon="tag" label="Secteur principal" required type="select" value={form.activity_type} error={formErrors.activity_type} options={activityTypes} onChange={(value) => setForm((current) => ({ ...current, activity_type: value }))} onBlur={validateStep3} />
                <Field id="activity_description" icon="star" label="Ton activité — que présentes-tu en direct ?" required type="textarea" value={form.activity_description} placeholder="Ex. Vente de pagnes wax et accessoires importés de Dubaï" error={formErrors.activity_description} hint="Bovann prépare mieux ton passage avec quelques mots précis." onChange={(value) => setForm((current) => ({ ...current, activity_description: value }))} onBlur={validateStep3} />
              </div>

              <label className={`rb-consent ${formErrors.consent ? 'rb-consent--error' : ''}`}>
                <input type="checkbox" checked={form.consent} onChange={(event) => setForm((current) => ({ ...current, consent: event.target.checked }))} />
                <span>
                  J’accepte les <a href="https://ocd-live.fly.dev/cgv" target="_blank" rel="noreferrer">conditions générales</a> et je comprends que mon créneau est bloqué 15 minutes pendant le paiement.
                </span>
              </label>

              <footer className="rb-pane__foot rb-pane__foot--split">
                <button type="button" className="rb-btn rb-btn--ghost" onClick={() => goToStep(2)}><Icon name="back" size={15} /> Revoir le créneau</button>
                <button type="button" className="rb-btn rb-btn--primary" disabled={isSubmitting || !formValid} onClick={submitInfos}>
                  {isSubmitting ? <>Blocage du créneau… <span className="rb-mini-spin" /></> : <>Bloquer mon créneau 15 min <Icon name="arrow" size={16} /></>}
                </button>
              </footer>
            </section>
          )}

          {/* ÉTAPE 4 — PAIEMENT */}
          {step === 4 && hold && (
            <section className="rb-pane" aria-labelledby="step4-title">
              {paymentPhase !== 'done' ? (
                <>
                  <header className="rb-pane__head">
                    <p className="rb-pane__eyebrow">DERNIÈRE ÉTAPE</p>
                    <h1 id="step4-title">Règle ton <em>passage</em> — et c’est réservé</h1>
                    <p className="rb-pane__sub">Blocage <strong>n° {hold.code}</strong> validé. Ton créneau reste verrouillé : <span className={`rb-timer ${countdown < 120 ? 'rb-timer--low' : ''}`}><Icon name="clock" size={13} /> {countdownLabel}</span></p>
                  </header>

                  <div className="rb-payment">
                    <div className="rb-payment__summary">
                      <div><span>Formule</span><strong>{selectedPack?.name}</strong></div>
                      <div><span>Quand</span><strong>{capitalize(formatLongDate(selectedDate))} · {selectedTime}</strong></div>
                      <div><span>Comment</span><strong>{modeLabel}</strong></div>
                      <div><span>Pour</span><strong className="rb-payment__who">{withAt(form.tiktok_handle.trim())}</strong></div>
                      <div className="rb-payment__amount"><span>Montant</span><strong>{selectedPack?.price}</strong></div>
                    </div>

                    <div className="rb-payment__methods" role="radiogroup" aria-label="Moyen de paiement">
                      {paymentMethods.map((method) => (
                        <button
                          key={method.id}
                          type="button"
                          role="radio"
                          aria-checked={paymentMethod === method.id}
                          className={`rb-paylabel ${paymentMethod === method.id ? 'rb-paylabel--active' : ''}`}
                          onClick={() => setPaymentMethod(method.id)}
                        >
                          <Icon name={method.id === 'card' ? 'card' : 'coins'} size={18} />
                          <span><strong>{method.label}</strong><small>{method.detail}</small></span>
                        </button>
                      ))}
                    </div>

                    <div className="rb-payment__notice">
                      <Icon name="shield" size={15} />
                      <p>Après confirmation, tu reçois par email le reçu PDF officiel avec son QR code de vérification. Présente-le le jour du live.</p>
                    </div>

                    <button type="button" className="rb-btn rb-btn--pay" disabled={countdown === 0} onClick={pay}>
                      <Icon name="lock" size={15} /> Payer {selectedPack?.price} et confirmer
                    </button>
                    {countdown === 0 && (
                      <div className="rb-alert rb-alert--error" role="alert">
                        <Icon name="alert" size={16} />
                        <p>Les 15 minutes sont écoulées, le créneau a été libéré. Retourne à l’étape du créneau pour le bloquer à nouveau.</p>
                      </div>
                    )}
                    <button type="button" className="rb-btn rb-btn--link" onClick={() => goToStep(3)}>Modifier mes informations</button>
                  </div>
                </>
              ) : (
                <div className="rb-success" role="status">
                  <span className="rb-success__mark"><Icon name="check" size={34} /></span>
                  <p className="rb-success__eyebrow">C’EST CONFIRMÉ</p>
                  <h1>Réservation <em>validée.</em></h1>
                  <p className="rb-success__sub">
                    {hold.kind === 'api'
                      ? 'Ton reçu PDF officiel arrive à l’instant. Prépare-toi à rencontrer la communauté House of Challenge.'
                      : `Ton passage est programmé : ${capitalize(formatLongDate(selectedDate))} à ${selectedTime}. Ton reçu te sera envoyé par email.`}
                  </p>
                  <div className="rb-success__meta">
                    <span><small>N° de réservation</small><strong>{hold.code}</strong></span>
                    <span><small>Formule</small><strong>{selectedPack?.name}</strong></span>
                    <span><small>Quand</small><strong>{capitalize(formatLongDate(selectedDate))} · {selectedTime}</strong></span>
                  </div>
                  {redirectUrl && (
                    <div className="rb-success__redirect">
                      <span className="rb-mini-spin" aria-hidden="true" /> Ouvre ton reçu officiel… <small>{redirectUrl}</small>
                    </div>
                  )}
                  <a className="rb-btn rb-btn--ghost" href="/"><Icon name="back" size={15} /> Retour à l’accueil</a>
                </div>
              )}
            </section>
          )}
        </div>
      </main>

      <footer className="rb-foot">
        <div className="rb-shell rb-foot__inner">
          <span className="rb-brand rb-brand--footer"><b>OCD</b>LIVE</span>
          <p>« Les opportunités, c’est dehors » · Studio House of Challenge — Lomé, Togo</p>
          <nav aria-label="Liens légaux">
            <a href="https://ocd-live.fly.dev/cgv" target="_blank" rel="noreferrer">CGV</a>
            <a href="https://ocd-live.fly.dev/confidentialite" target="_blank" rel="noreferrer">Confidentialité</a>
            <a href={whatsappUrl} target="_blank" rel="noreferrer">WhatsApp</a>
          </nav>
        </div>
      </footer>
    </div>
  )
}

export default ReservePage
