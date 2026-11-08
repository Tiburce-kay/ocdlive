export type Pack = {
  slug: string
  eyebrow: string
  name: string
  description: string
  duration: string
  price: string
  icon: 'clock' | 'broadcast' | 'megaphone' | 'shop' | 'video' | 'calendar'
  benefits: string[]
}

export const packs: Pack[] = [
  {
    slug: 'live-1h30',
    eyebrow: 'Live express',
    name: 'Live 1 h 30',
    description: 'Un premier passage en direct pour faire connaître ton activité.',
    duration: '1 h 30 de live',
    price: '15 000 FCFA',
    icon: 'clock',
    benefits: [
      'Passage live sur House of Challenge',
      'En présentiel à Lomé ou à distance',
      'Démonstration produit et échange avec l’audience',
    ],
  },
  {
    slug: 'live-4h',
    eyebrow: 'Format long',
    name: 'Live 4 heures',
    description: 'Plus de temps pour présenter, échanger et vendre.',
    duration: '4 h de live',
    price: '27 000 FCFA',
    icon: 'broadcast',
    benefits: [
      '4 heures complètes sur le compte officiel',
      'Tarif dégressif : 6 750 FCFA par heure',
      'En présentiel à Lomé ou à distance',
    ],
  },
  {
    slug: 'live-annonce',
    eyebrow: 'Visibilité plus',
    name: 'Live annoncé',
    description: 'Un rendez-vous annoncé en amont par Bovann.',
    duration: '1 h 30 + annonce',
    price: '40 000 FCFA',
    icon: 'megaphone',
    benefits: [
      'Live de 1 h 30 sur House of Challenge',
      'Annonce officielle avant la date',
      'Mobilisation de la communauté en amont',
    ],
  },
  {
    slug: 'live-vente-annonce',
    eyebrow: 'Vente & conversion',
    name: 'Live Vente Annoncé',
    description: 'Un direct pensé pour présenter ton offre commerciale.',
    duration: '4 h + annonce',
    price: '50 000 FCFA',
    icon: 'shop',
    benefits: [
      '4 heures complètes de live de vente',
      'Annonce de ton offre par Bovann',
      'Mise en avant de tes offres et contacts',
    ],
  },
  {
    slug: 'video-live',
    eyebrow: 'Le plus complet',
    name: 'Vidéo + live',
    description: 'Associe une vidéo business dédiée à ton passage en direct.',
    duration: 'Vidéo + annonce + 4 h',
    price: '75 000 FCFA',
    icon: 'video',
    benefits: [
      'Vidéo business dédiée publiée par Bovann',
      'Annonce officielle avant le live',
      '4 heures de direct avec Bovann',
    ],
  },
  {
    slug: 'mensuel',
    eyebrow: 'Partenaire VIP · pack mensuel',
    name: 'Partenaire du mois',
    description: 'Une présence régulière sur quatre semaines.',
    duration: '4 lives sur 30 jours',
    price: '150 000 FCFA',
    icon: 'calendar',
    benefits: [
      '4 lives de 1 h 30, un par semaine',
      'Annonce officielle avant chaque live',
      '1 vidéo business dédiée tournée par Bovann',
    ],
  },
]

export const faqs = [
  {
    question: 'Est-ce que je peux intervenir depuis n’importe où en Afrique ?',
    answer:
      'Oui. Tu peux réserver à distance depuis n’importe quel pays. Il te faut une bonne connexion internet, un compte TikTok actif et être disponible à l’heure convenue.',
  },
  {
    question: 'Quelle est la différence entre présentiel et à distance ?',
    answer:
      'En présentiel, tu viens à la salle OCD Live à Lomé. À distance, tu interviens depuis chez toi via TikTok Live. Le tarif est le même dans les deux cas.',
  },
  {
    question: 'Comment se passe le paiement ?',
    answer:
      'Tu peux régler par Mobile Money (Flooz ou T-Money) ou par carte. Après le paiement, tu reçois ton reçu PDF officiel avec un QR code de vérification.',
  },
  {
    question: 'Que se passe-t-il si je dois annuler ?',
    answer:
      'Contacte l’équipe OCD Live sur WhatsApp au moins 48 heures avant ta session pour convenir d’un report. Les annulations tardives ne sont pas remboursées, mais un report peut être envisagé.',
  },
  {
    question: 'Combien de temps à l’avance dois-je réserver ?',
    answer:
      'Les créneaux sont disponibles jusqu’à 90 jours à l’avance. Une fois ton créneau choisi, il est bloqué 15 minutes le temps de finaliser le paiement.',
  },
  {
    question: 'Que comprend le « Live annoncé » ?',
    answer:
      'En plus du live de 1 h 30, Bovann publie une annonce officielle avant la date de ton passage. Elle permet de mobiliser la communauté en amont du direct.',
  },
]

export const reservationUrl = (pack?: string) =>
  `/reserver${pack ? `?pack=${encodeURIComponent(pack)}` : ''}`

export const whatsappUrl = 'https://wa.me/2250586868619'
