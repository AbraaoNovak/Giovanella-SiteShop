/**
 * ============================================================================
 * CONFIGURAÇÃO CENTRAL DO SITE
 * ----------------------------------------------------------------------------
 * Este é o ÚNICO arquivo que precisa ser editado para alterar dados de contato,
 * rótulos de seções e integrações externas.
 *
 * Os valores marcados com `data-config` no HTML são sincronizados
 * automaticamente em tempo de execução (ver src/js/modules/config-bind.js),
 * portanto o HTML já contém o valor correto (bom para SEO) e este arquivo
 * permanece como fonte da verdade para futuras alterações.
 * ============================================================================
 */

export const SITE = {
  /** Nome comercial usado em textos, schema.org e mensagens de WhatsApp. */
  businessName: 'Giovanella Escola Estética Animal',

  /** Domínio final de produção. */
  siteUrl: 'https://www.escolabanhoetosarosigiovanella.com.br',

  contact: {
    /** Telefone formatado para exibição. */
    phoneDisplay: '(47) 99608-6955',
    /** Telefone em formato E.164 para links `tel:`. */
    phoneE164: '+5547996086955',
    /** Número do WhatsApp em formato internacional, apenas dígitos. */
    whatsapp: '5547996086955',
  },

  address: {
    street: 'Rua Elly Soares, 511',
    district: 'Bairro Floresta',
    city: 'Joinville',
    state: 'SC',
    postalCode: '', // TODO: INSERIR CEP
    country: 'BR',
    /** Endereço completo em uma linha (usado no Google Maps). */
    get full() {
      return `${this.street}, ${this.district}, ${this.city} - ${this.state}, Brasil`;
    },
  },

  /**
   * Rótulo da seção de patrocínio.
   * O proprietário informou "Patriocinio". Mantido exatamente como solicitado.
   * Para alterar futuramente para "Patrocínio", basta mudar aqui.
   */
  labels: {
    sponsorship: 'Patriocinio',
  },

  /** Mensagens padrão de WhatsApp (codificadas com encodeURIComponent no uso). */
  messages: {
    default:
      'Olá! Gostaria de saber mais sobre a Giovanella Escola Estética Animal.',
    /** @param {string} courseName */
    course: (courseName) =>
      `Olá! Tenho interesse em saber mais sobre o curso ${courseName} da Giovanella Escola Estética Animal.`,
  },

  integrations: {
    /**
     * Google Analytics 4.
     * Deixe vazio para desabilitar. O site funciona normalmente sem ele.
     * TODO: CONFIGURAR GOOGLE ANALYTICS (preencher com o ID real, ex.: 'G-XXXXXXXXXX')
     */
    gaMeasurementId: import.meta.env?.VITE_GA_MEASUREMENT_ID || '',

    /**
     * Google Maps.
     * A implementação padrão usa o embed público (sem API Key e sem custo).
     * Se futuramente for usada a Maps JavaScript API, a chave deve vir de
     * variável de ambiente — NUNCA versionada no repositório.
     */
    googleMapsApiKey: import.meta.env?.VITE_GOOGLE_MAPS_API_KEY || '',

    /**
     * Google Reviews (avaliações reais).
     * Nenhuma avaliação é exibida enquanto não houver integração oficial.
     * Ver README → "Como integrar avaliações Google".
     * TODO: CONFIGURAR GOOGLE REVIEWS
     */
    googlePlaceId: import.meta.env?.VITE_GOOGLE_PLACE_ID || '',
  },
};

/** Chave usada no localStorage para o consentimento de cookies (LGPD). */
export const CONSENT_STORAGE_KEY = 'giovanella:consent:v1';
