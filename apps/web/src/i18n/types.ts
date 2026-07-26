export type Language = 'es' | 'it';

export interface Dictionary {
  header: {
    brandName: string;
    brandTagline: string;
    navHome: string;
    navServices: string;
    navCalendar: string;
    navGallery: string;
    navTestimonials: string;
    navTeam: string;
    btnBook: string;
    btnAdmin: string;
  };
  hero: {
    badge: string;
    titleLine1: string;
    titleHighlight: string;
    titleLine2: string;
    description: string;
    ctaPrimary: string;
    ctaSecondary: string;
    statAppointments: string;
    statSatisfaction: string;
    statRating: string;
  };
  services: {
    badge: string;
    title: string;
    subtitle: string;
    categories: {
      all: string;
      hair: string;
      nails: string;
      lashes: string;
      facial: string;
      makeup: string;
    };
    durationLabel: string;
    btnBook: string;
  };
  booking: {
    badge: string;
    title: string;
    subtitle: string;
    step1Title: string;
    step2Title: string;
    step3Title: string;
    selectService: string;
    selectDate: string;
    selectTime: string;
    customerInfo: string;
    fullName: string;
    phone: string;
    email: string;
    notes: string;
    btnConfirm: string;
    btnBack: string;
    successTitle: string;
    successMessage: string;
    btnFinish: string;
  };
  gallery: {
    badge: string;
    title: string;
    subtitle: string;
    filters: {
      all: string;
      balayage: string;
      nails: string;
      lashes: string;
      facial: string;
    };
  };
  testimonials: {
    badge: string;
    title: string;
    subtitle: string;
  };
  team: {
    badge: string;
    title: string;
    subtitle: string;
    roleSofia: string;
    roleColorist: string;
    roleNailArtist: string;
  };
  chatbot: {
    title: string;
    subtitle: string;
    welcomeMsg: string;
    inputPlaceholder: string;
    presetQuestion1: string;
    presetQuestion2: string;
    presetQuestion3: string;
  };
  footer: {
    tagline: string;
    hoursTitle: string;
    hoursWeekdays: string;
    hoursSaturday: string;
    hoursSunday: string;
    locationTitle: string;
    rightsReserved: string;
  };
  admin: {
    title: string;
    welcome: string;
    tabs: {
      dashboard: string;
      calendar: string;
      customers: string;
      services: string;
      analytics: string;
    };
    waStatusConnected: string;
    waStatusDisconnected: string;
    metrics: {
      monthAppointments: string;
      newClients: string;
      monthRevenue: string;
      pendingAppointments: string;
    };
    table: {
      customer: string;
      service: string;
      dateTime: string;
      price: string;
      source: string;
      status: string;
      actions: string;
    };
  };
}
