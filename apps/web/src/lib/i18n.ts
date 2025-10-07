import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Translation resources
const resources = {
  en: {
    translation: {
      app: {
        title: 'AI eBook Creator',
        subtitle: 'Create professional eBooks with AI assistance - powered by GOAP architecture',
      },
      navigation: {
        home: 'Home',
        about: 'About',
        contact: 'Contact',
        language: 'Language',
        theme: 'Theme',
        darkMode: 'Dark Mode',
        lightMode: 'Light Mode',
      },
      hero: {
        title: 'Create Amazing eBooks with AI',
        subtitle: 'Transform your ideas into professional eBooks using advanced AI technology and GOAP architecture',
        cta: 'Start Creating',
        features: 'Learn More',
      },
      form: {
        inputType: {
          label: 'Input Type',
        },
        content: {
          label: 'Content',
        },
        language: {
          label: 'Language',
        },
        tone: {
          label: 'Tone',
          casual: 'Casual',
          professional: 'Professional',
          academic: 'Academic',
        },
        generate: 'Generate eBook',
        generating: 'Generating...',
        reset: 'Reset',
      },
      generation: {
        title: 'Generate Your eBook',
        progress: {
          title: 'Generation Progress',
        },
        error: {
          title: 'Generation Error',
          generic: 'An error occurred during generation. Please try again.',
        },
        completed: 'eBook Generated Successfully!',
        chapters: 'Generated {{count}} chapters',
        starting: 'Starting generation...',
      },
      progress: {
        title: 'Progress',
        stages: 'Generation Stages',
        active: 'Active',
        estimated: 'Estimated time remaining',
        error: {
          title: 'Error occurred',
        },
        stages: {
          enhancing_prompt: 'Enhancing prompt',
          planning_content: 'Planning content structure',
          generating_chapters: 'Generating chapters',
          checking_grammar: 'Checking grammar and style',
          finalizing: 'Finalizing eBook',
        },
      },
      features: {
        title: 'Powerful Features',
        subtitle: 'Everything you need to create professional eBooks',
        aiPowered: {
          title: 'AI-Powered Generation',
          description: 'Advanced AI models generate high-quality content tailored to your needs',
        },
        multiLanguage: {
          title: 'Multi-Language Support',
          description: 'Create eBooks in English and German with native language understanding',
        },
        realTime: {
          title: 'Real-Time Progress',
          description: 'Watch your eBook come to life with live progress tracking and updates',
        },
        responsive: {
          title: 'Responsive Design',
          description: 'Works perfectly on desktop, tablet, and mobile devices',
        },
        export: {
          title: 'Multiple Export Formats',
          description: 'Export your eBooks as PDF, EPUB, HTML, or DOCX formats',
        },
        grammarCheck: {
          title: 'Grammar & Style Check',
          description: 'Built-in grammar checking and style enhancement for professional quality',
        },
      },
      result: {
        title: 'Your eBook is Ready!',
        summary: 'Summary',
        chapters: 'Chapters',
        metadata: 'Details',
        export: 'Export Options',
        download: 'Download',
        view: 'View Chapter',
        edit: 'Edit',
        wordCount: '{{count}} words',
        readingTime: '~{{minutes}} min read',
      },
      footer: {
        copyright: '© 2025 AI eBook Creator. All rights reserved.',
        madeWith: 'Made with ❤️ using AI and modern web technologies',
      },
      errors: {
        generic: 'Something went wrong. Please try again.',
        network: 'Network error. Please check your connection.',
        validation: 'Please check your input and try again.',
        rateLimit: 'Too many requests. Please wait a moment.',
        server: 'Server error. Please try again later.',
      },
    },
  },
  de: {
    translation: {
      app: {
        title: 'KI eBook Creator',
        subtitle: 'Erstellen Sie professionelle eBooks mit KI-Unterstützung - angetrieben von GOAP-Architektur',
      },
      navigation: {
        home: 'Startseite',
        about: 'Über uns',
        contact: 'Kontakt',
        language: 'Sprache',
        theme: 'Design',
        darkMode: 'Dunkler Modus',
        lightMode: 'Heller Modus',
      },
      hero: {
        title: 'Erstellen Sie erstaunliche eBooks mit KI',
        subtitle: 'Verwandeln Sie Ihre Ideen in professionelle eBooks mit fortschrittlicher KI-Technologie und GOAP-Architektur',
        cta: 'Jetzt erstellen',
        features: 'Mehr erfahren',
      },
      form: {
        inputType: {
          label: 'Eingabetyp',
        },
        content: {
          label: 'Inhalt',
        },
        language: {
          label: 'Sprache',
        },
        tone: {
          label: 'Tonfall',
          casual: 'Locker',
          professional: 'Professionell',
          academic: 'Akademisch',
        },
        generate: 'eBook erstellen',
        generating: 'Wird erstellt...',
        reset: 'Zurücksetzen',
      },
      generation: {
        title: 'Ihr eBook erstellen',
        progress: {
          title: 'Erstellungsfortschritt',
        },
        error: {
          title: 'Erstellungsfehler',
          generic: 'Ein Fehler ist bei der Erstellung aufgetreten. Bitte versuchen Sie es erneut.',
        },
        completed: 'eBook erfolgreich erstellt!',
        chapters: '{{count}} Kapitel erstellt',
        starting: 'Erstellung wird gestartet...',
      },
      progress: {
        title: 'Fortschritt',
        stages: 'Erstellungsphasen',
        active: 'Aktiv',
        estimated: 'Geschätzte verbleibende Zeit',
        error: {
          title: 'Fehler aufgetreten',
        },
        stages: {
          enhancing_prompt: 'Eingabe wird verbessert',
          planning_content: 'Inhaltsstruktur wird geplant',
          generating_chapters: 'Kapitel werden erstellt',
          checking_grammar: 'Grammatik und Stil werden geprüft',
          finalizing: 'eBook wird finalisiert',
        },
      },
      features: {
        title: 'Leistungsstarke Funktionen',
        subtitle: 'Alles was Sie brauchen, um professionelle eBooks zu erstellen',
        aiPowered: {
          title: 'KI-gestützte Erstellung',
          description: 'Fortgeschrittene KI-Modelle generieren hochwertige Inhalte nach Ihren Bedürfnissen',
        },
        multiLanguage: {
          title: 'Mehrsprachige Unterstützung',
          description: 'Erstellen Sie eBooks in Deutsch und Englisch mit nativem Sprachverständnis',
        },
        realTime: {
          title: 'Echtzeit-Fortschritt',
          description: 'Sehen Sie zu, wie Ihr eBook entsteht mit Live-Fortschrittsverfolgung',
        },
        responsive: {
          title: 'Responsives Design',
          description: 'Funktioniert perfekt auf Desktop, Tablet und mobilen Geräten',
        },
        export: {
          title: 'Mehrere Exportformate',
          description: 'Exportieren Sie Ihre eBooks als PDF, EPUB, HTML oder DOCX',
        },
        grammarCheck: {
          title: 'Grammatik- & Stilprüfung',
          description: 'Eingebaute Grammatikprüfung und Stilverbesserung für professionelle Qualität',
        },
      },
      result: {
        title: 'Ihr eBook ist bereit!',
        summary: 'Zusammenfassung',
        chapters: 'Kapitel',
        metadata: 'Details',
        export: 'Export-Optionen',
        download: 'Herunterladen',
        view: 'Kapitel anzeigen',
        edit: 'Bearbeiten',
        wordCount: '{{count}} Wörter',
        readingTime: '~{{minutes}} Min. Lesezeit',
      },
      footer: {
        copyright: '© 2025 KI eBook Creator. Alle Rechte vorbehalten.',
        madeWith: 'Mit ❤️ erstellt unter Verwendung von KI und modernen Web-Technologien',
      },
      errors: {
        generic: 'Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut.',
        network: 'Netzwerkfehler. Bitte überprüfen Sie Ihre Verbindung.',
        validation: 'Bitte überprüfen Sie Ihre Eingabe und versuchen Sie es erneut.',
        rateLimit: 'Zu viele Anfragen. Bitte warten Sie einen Moment.',
        server: 'Serverfehler. Bitte versuchen Sie es später erneut.',
      },
    },
  },
};

// Initialize i18n
export const initializeI18n = async () => {
  if (!i18n.isInitialized) {
    await i18n
      .use(LanguageDetector)
      .use(initReactI18next)
      .init({
        resources,
        fallbackLng: 'en',
        debug: process.env.NODE_ENV === 'development',
        
        detection: {
          order: ['localStorage', 'navigator', 'htmlTag'],
          lookupLocalStorage: 'ai-ebook-creator-language',
          caches: ['localStorage'],
        },
        
        interpolation: {
          escapeValue: false, // React already escapes
        },
        
        react: {
          useSuspense: false,
        },
      });
  }
  
  return i18n;
};

export { i18n };
export default i18n;