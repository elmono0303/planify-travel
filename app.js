/**
 * ==============================================================================
 * PLANIFY: Plataforma Inteligente para la Planificación de Viajes
 * Arquitectura Frontend: Vanilla JavaScript (ES6+)
 * ------------------------------------------------------------------------------
 * Módulos / Responsabilidades:
 *  1. Estado Global de la Aplicación (State Management)
 *  2. Diccionario de Códigos Meteorológicos WMO (Open-Meteo)
 *  3. Servicio de Persistencia (localStorage)
 *  4. Consumo Asíncrono de APIs (REST Countries & Open-Meteo)
 *  5. Renderizado Reactivo y Manipulación del DOM
 *  6. Delegación de Eventos (Event Delegation Pattern)
 *  7. Sistema de Notificaciones Toast & Accesibilidad
 * ==============================================================================
 */

'use strict';

// ==============================================================================
// 1. ESTADO GLOBAL DE LA APLICACIÓN (APPLICATION STATE)
// ==============================================================================
const AppState = {
  countries: [],               // Lista completa de países descargados
  filteredCountries: [],       // Lista filtrada por búsqueda, región y vista
  favorites: new Set(),        // Set en memoria con los códigos cca3 favoritos
  currentView: 'explore',      // 'explore' | 'favorites'
  searchQuery: '',             // Término de búsqueda actual
  selectedRegion: 'all',       // Región seleccionada ('all' o nombre de región)
  sortBy: 'name-asc',          // Criterio de ordenamiento ('name-asc', 'name-desc', 'pop-desc', 'pop-asc')
  activeCountryWeather: null,  // País actualmente visualizado en el modal
  isLoadingCountries: true     // Indicador de carga inicial
};

// ==============================================================================
// 2. DICCIONARIO WMO: INTERPRETACIÓN METEOROLÓGICA (OPEN-METEO V1)
// ==============================================================================
/**
 * Los códigos WMO (Organización Meteorológica Mundial) son números estándar.
 * Este mapa traduce cada código a una etiqueta legible en español, un ícono visual
 * y un consejo de viaje inteligente acorde a las condiciones atmosféricas.
 */
const WMO_WEATHER_CODES = {
  0: {
    label: 'Cielo Despejado',
    iconDay: '☀️',
    iconNight: '🌙',
    advice: '¡Clima inmejorable! Ideal para turismo al aire libre, fotografía y caminatas.'
  },
  1: {
    label: 'Mayormente Despejado',
    iconDay: '🌤️',
    iconNight: '🌤️',
    advice: 'Excelente día para pasear. Recuerda llevar gafas de sol y mantenerte hidratado.'
  },
  2: {
    label: 'Parcialmente Nublado',
    iconDay: '⛅',
    iconNight: '☁️',
    advice: 'Condiciones muy agradables. La nubosidad parcial reduce el calor directo.'
  },
  3: {
    label: 'Nublado',
    iconDay: '☁️',
    iconNight: '☁️',
    advice: 'Cielo cubierto. Temperatura fresca, perfecta para museos y centros culturales.'
  },
  45: {
    label: 'Niebla Densa',
    iconDay: '🌫️',
    iconNight: '🌫️',
    advice: 'Visibilidad reducida. Precaución en carreteras y traslados matutinos.'
  },
  48: {
    label: 'Niebla con Escarcha',
    iconDay: '🌫️',
    iconNight: '🌫️',
    advice: 'Sensación gélida. Viste abrigo térmico y calzado con buena tracción.'
  },
  51: {
    label: 'Llovizna Ligera',
    iconDay: '🌦️',
    iconNight: '🌦️',
    advice: 'Briznas intermitentes. Un chubasquero liviano o paraguas pequeño será suficiente.'
  },
  53: {
    label: 'Llovizna Moderada',
    iconDay: '🌦️',
    iconNight: '🌦️',
    advice: 'Pavimento resbaladizo. Considera calzado impermeable si caminas la ciudad.'
  },
  55: {
    label: 'Llovizna Densa',
    iconDay: '🌧️',
    iconNight: '🌧️',
    advice: 'Humedad constante. Recomendado planificar visitas a galerías y restaurantes cubiertos.'
  },
  61: {
    label: 'Lluvia Leve',
    iconDay: '🌧️',
    iconNight: '🌧️',
    advice: 'Lluvia suave. Lleva paraguas a mano para no interrumpir tu itinerario.'
  },
  63: {
    label: 'Lluvia Moderada',
    iconDay: '🌧️',
    iconNight: '🌧️',
    advice: 'Precipitaciones constantes. Ideal para disfrutar de cafeterías y gastronomía local.'
  },
  65: {
    label: 'Lluvia Intensa',
    iconDay: '🌧️',
    iconNight: '🌧️',
    advice: 'Lluvia fuerte. Evita actividades de montaña o excursiones descubiertas.'
  },
  71: {
    label: 'Nevada Ligera',
    iconDay: '❄️',
    iconNight: '❄️',
    advice: 'Nevada suave de postal. Viste ropa en capas y guantes cálidos.'
  },
  73: {
    label: 'Nevada Moderada',
    iconDay: '❄️',
    iconNight: '❄️',
    advice: 'Acumulación de nieve. Calzado impermeable y abrigo térmico indispensables.'
  },
  75: {
    label: 'Nevada Fuerte',
    iconDay: '❄️',
    iconNight: '❄️',
    advice: 'Condiciones invernales severas. Verifica el estado del transporte público.'
  },
  77: {
    label: 'Granos de Nieve / Aguanieve',
    iconDay: '🌨️',
    iconNight: '🌨️',
    advice: 'Frío extremo y aguanieve. Protégete adecuadamente del viento helado.'
  },
  80: {
    label: 'Chubascos Leves',
    iconDay: '🌦️',
    iconNight: '🌦️',
    advice: 'Chubascos pasajeros. El sol podría asomarse entre nubes en poco tiempo.'
  },
  81: {
    label: 'Chubascos Moderados',
    iconDay: '🌧️',
    iconNight: '🌧️',
    advice: 'Lluvias súbitas. Ten un refugio o museo cerca por si arrecia la precipitación.'
  },
  82: {
    label: 'Chubascos Violentos',
    iconDay: '⛈️',
    iconNight: '⛈️',
    advice: 'Descargas de agua repentinas. Pospón traslados en moto o caminatas en parques.'
  },
  85: {
    label: 'Chubascos de Nieve',
    iconDay: '🌨️',
    iconNight: '🌨️',
    advice: 'Ráfagas de nieve. Excelente para deportes de invierno si estás equipado.'
  },
  86: {
    label: 'Chubascos Fuertes de Nieve',
    iconDay: '🌨️',
    iconNight: '🌨️',
    advice: 'Nieve abundante. Abrígate al máximo y confirma la apertura de atracciones turísticas.'
  },
  95: {
    label: 'Tormenta Eléctrica',
    iconDay: '⛈️',
    iconNight: '⛈️',
    advice: 'Actividad eléctrica detectada. Permanece bajo techo y evita espacios abiertos.'
  },
  96: {
    label: 'Tormenta con Granizo Leve',
    iconDay: '⛈️',
    iconNight: '⛈️',
    advice: 'Tormenta y granizo menudo. Resguárdate y no te expongas a la intemperie.'
  },
  99: {
    label: 'Tormenta con Granizo Severo',
    iconDay: '⛈️',
    iconNight: '⛈️',
    advice: 'Alerta de granizo fuerte. Busca protección sólida inmediata hasta que cese.'
  }
};

/**
 * Obtiene la interpretación legible para un código WMO dado.
 * @param {number} code - Código WMO numérico.
 * @param {number} isDay - 1 si es de día, 0 si es de noche.
 * @returns {object} Metadatos del clima.
 */
function getWmoDetails(code, isDay = 1) {
  const meta = WMO_WEATHER_CODES[code];
  if (!meta) {
    return {
      label: 'Tiempo Variable',
      icon: isDay ? '🌤️' : '🌙',
      advice: 'Revisa periódicamente el pronóstico local antes de salir.'
    };
  }
  return {
    label: meta.label,
    icon: isDay ? meta.iconDay : meta.iconNight,
    advice: meta.advice
  };
}

// ==============================================================================
// 3. PERSISTENCIA EN LOCALSTORAGE (SERVICE)
// ==============================================================================
const STORAGE_KEY = 'planify_favorites_v2';

/**
 * Carga los favoritos guardados en el navegador.
 * Maneja posibles excepciones de JSON corrupto limpiamente.
 * @returns {Set<string>} Conjunto de códigos cca3.
 */
function loadFavoritesFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch (error) {
    console.warn('[Planify] No se pudieron leer los favoritos de localStorage:', error);
    return new Set();
  }
}

/**
 * Persiste los favoritos actuales en el localStorage.
 */
function persistFavoritesToStorage() {
  try {
    const arrayFavorites = Array.from(AppState.favorites);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arrayFavorites));
  } catch (error) {
    console.error('[Planify] Error al guardar favoritos en localStorage:', error);
  }
}

/**
 * Alterna el estado favorito de un país (Toggle).
 * @param {string} cca3 - Código del país.
 * @param {string} countryName - Nombre común para la notificación.
 * @returns {boolean} true si ahora es favorito, false si fue removido.
 */
function toggleFavoriteCountry(cca3, countryName = 'Destino') {
  const isFav = AppState.favorites.has(cca3);
  if (isFav) {
    AppState.favorites.delete(cca3);
    showToast(`Eliminado de favoritos`, countryName, 'coral');
  } else {
    AppState.favorites.add(cca3);
    showToast(`Añadido a favoritos ❤️`, countryName, 'success');
  }

  // Persistir en disco del navegador
  persistFavoritesToStorage();

  // Actualizar contadores y vista
  updateFavoritesBadges();
  updateCardFavoriteVisual(cca3, !isFav);

  // Si estamos en la pestaña "Mis Favoritos", refrescar el filtrado
  if (AppState.currentView === 'favorites') {
    applyFiltersAndRender();
  }

  return !isFav;
}

// ==============================================================================
// 4. CONSUMO DE APIS (FETCH & ASYNC/AWAIT)
// ==============================================================================

/**
 * Fallback dataset: Conjunto de seguridad con 24 destinos clave.
 * Garantiza que si la red universitaria bloquea o limita REST Countries,
 * la aplicación continúe funcionando a la perfección para la evaluación académica.
 */
const FALLBACK_COUNTRIES = [
  {
    name: { common: 'España', official: 'Reino de España' },
    capital: ['Madrid'],
    region: 'Europe',
    subregion: 'Southern Europe',
    population: 47351567,
    cca2: 'ES',
    cca3: 'ESP',
    latlng: [40.4168, -3.7038],
    capitalInfo: { latlng: [40.4168, -3.7038] },
    flags: { svg: 'https://flagcdn.com/es.svg', png: 'https://flagcdn.com/w320/es.png' }
  },
  {
    name: { common: 'Francia', official: 'República Francesa' },
    capital: ['París'],
    region: 'Europe',
    subregion: 'Western Europe',
    population: 67391582,
    cca2: 'FR',
    cca3: 'FRA',
    latlng: [46.2276, 2.2137],
    capitalInfo: { latlng: [48.8566, 2.3522] },
    flags: { svg: 'https://flagcdn.com/fr.svg', png: 'https://flagcdn.com/w320/fr.png' }
  },
  {
    name: { common: 'Japón', official: 'Estado de Japón' },
    capital: ['Tokio'],
    region: 'Asia',
    subregion: 'Eastern Asia',
    population: 125836021,
    cca2: 'JP',
    cca3: 'JPN',
    latlng: [36.2048, 138.2529],
    capitalInfo: { latlng: [35.6762, 139.6503] },
    flags: { svg: 'https://flagcdn.com/jp.svg', png: 'https://flagcdn.com/w320/jp.png' }
  },
  {
    name: { common: 'Italia', official: 'República Italiana' },
    capital: ['Roma'],
    region: 'Europe',
    subregion: 'Southern Europe',
    population: 59554023,
    cca2: 'IT',
    cca3: 'ITA',
    latlng: [41.8719, 12.5674],
    capitalInfo: { latlng: [41.9028, 12.4964] },
    flags: { svg: 'https://flagcdn.com/it.svg', png: 'https://flagcdn.com/w320/it.png' }
  },
  {
    name: { common: 'Colombia', official: 'República de Colombia' },
    capital: ['Bogotá'],
    region: 'Americas',
    subregion: 'South America',
    population: 50882884,
    cca2: 'CO',
    cca3: 'COL',
    latlng: [4.5709, -74.2973],
    capitalInfo: { latlng: [4.7110, -74.0721] },
    flags: { svg: 'https://flagcdn.com/co.svg', png: 'https://flagcdn.com/w320/co.png' }
  },
  {
    name: { common: 'México', official: 'Estados Unidos Mexicanos' },
    capital: ['Ciudad de México'],
    region: 'Americas',
    subregion: 'North America',
    population: 128932753,
    cca2: 'MX',
    cca3: 'MEX',
    latlng: [23.6345, -102.5528],
    capitalInfo: { latlng: [19.4326, -99.1332] },
    flags: { svg: 'https://flagcdn.com/mx.svg', png: 'https://flagcdn.com/w320/mx.png' }
  },
  {
    name: { common: 'Reino Unido', official: 'Reino Unido de Gran Bretaña e Irlanda del Norte' },
    capital: ['Londres'],
    region: 'Europe',
    subregion: 'Northern Europe',
    population: 67215293,
    cca2: 'GB',
    cca3: 'GBR',
    latlng: [55.3781, -3.4360],
    capitalInfo: { latlng: [51.5074, -0.1278] },
    flags: { svg: 'https://flagcdn.com/gb.svg', png: 'https://flagcdn.com/w320/gb.png' }
  },
  {
    name: { common: 'Estados Unidos', official: 'Estados Unidos de América' },
    capital: ['Washington, D.C.'],
    region: 'Americas',
    subregion: 'North America',
    population: 329484123,
    cca2: 'US',
    cca3: 'USA',
    latlng: [37.0902, -95.7129],
    capitalInfo: { latlng: [38.8951, -77.0364] },
    flags: { svg: 'https://flagcdn.com/us.svg', png: 'https://flagcdn.com/w320/us.png' }
  },
  {
    name: { common: 'Alemania', official: 'República Federal de Alemania' },
    capital: ['Berlín'],
    region: 'Europe',
    subregion: 'Western Europe',
    population: 83240525,
    cca2: 'DE',
    cca3: 'DEU',
    latlng: [51.1657, 10.4515],
    capitalInfo: { latlng: [52.5200, 13.4050] },
    flags: { svg: 'https://flagcdn.com/de.svg', png: 'https://flagcdn.com/w320/de.png' }
  },
  {
    name: { common: 'Australia', official: 'Mancomunidad de Australia' },
    capital: ['Canberra'],
    region: 'Oceania',
    subregion: 'Australia and New Zealand',
    population: 25687041,
    cca2: 'AU',
    cca3: 'AUS',
    latlng: [-25.2744, 133.7751],
    capitalInfo: { latlng: [-35.2809, 149.1300] },
    flags: { svg: 'https://flagcdn.com/au.svg', png: 'https://flagcdn.com/w320/au.png' }
  },
  {
    name: { common: 'Brasil', official: 'República Federativa del Brasil' },
    capital: ['Brasilia'],
    region: 'Americas',
    subregion: 'South America',
    population: 212559417,
    cca2: 'BR',
    cca3: 'BRA',
    latlng: [-14.2350, -51.9253],
    capitalInfo: { latlng: [-15.7975, -47.8919] },
    flags: { svg: 'https://flagcdn.com/br.svg', png: 'https://flagcdn.com/w320/br.png' }
  },
  {
    name: { common: 'Canadá', official: 'Canadá' },
    capital: ['Ottawa'],
    region: 'Americas',
    subregion: 'North America',
    population: 38005238,
    cca2: 'CA',
    cca3: 'CAN',
    latlng: [56.1304, -106.3468],
    capitalInfo: { latlng: [45.4215, -75.6972] },
    flags: { svg: 'https://flagcdn.com/ca.svg', png: 'https://flagcdn.com/w320/ca.png' }
  },
  {
    name: { common: 'Argentina', official: 'República Argentina' },
    capital: ['Buenos Aires'],
    region: 'Americas',
    subregion: 'South America',
    population: 45376763,
    cca2: 'AR',
    cca3: 'ARG',
    latlng: [-38.4161, -63.6167],
    capitalInfo: { latlng: [-34.6037, -58.3816] },
    flags: { svg: 'https://flagcdn.com/ar.svg', png: 'https://flagcdn.com/w320/ar.png' }
  },
  {
    name: { common: 'Corea del Sur', official: 'República de Corea' },
    capital: ['Seúl'],
    region: 'Asia',
    subregion: 'Eastern Asia',
    population: 51780579,
    cca2: 'KR',
    cca3: 'KOR',
    latlng: [35.9078, 127.7669],
    capitalInfo: { latlng: [37.5665, 126.9780] },
    flags: { svg: 'https://flagcdn.com/kr.svg', png: 'https://flagcdn.com/w320/kr.png' }
  },
  {
    name: { common: 'Egipto', official: 'República Árabe de Egipto' },
    capital: ['El Cairo'],
    region: 'Africa',
    subregion: 'Northern Africa',
    population: 102334404,
    cca2: 'EG',
    cca3: 'EGY',
    latlng: [26.8206, 30.8025],
    capitalInfo: { latlng: [30.0444, 31.2357] },
    flags: { svg: 'https://flagcdn.com/eg.svg', png: 'https://flagcdn.com/w320/eg.png' }
  },
  {
    name: { common: 'Sudáfrica', official: 'República de Sudáfrica' },
    capital: ['Pretoria'],
    region: 'Africa',
    subregion: 'Southern Africa',
    population: 59308690,
    cca2: 'ZA',
    cca3: 'ZAF',
    latlng: [-30.5595, 22.9375],
    capitalInfo: { latlng: [-25.7479, 28.2293] },
    flags: { svg: 'https://flagcdn.com/za.svg', png: 'https://flagcdn.com/w320/za.png' }
  },
  {
    name: { common: 'Tailandia', official: 'Reino de Tailandia' },
    capital: ['Bangkok'],
    region: 'Asia',
    subregion: 'South-Eastern Asia',
    population: 69799978,
    cca2: 'TH',
    cca3: 'THA',
    latlng: [15.8700, 100.9925],
    capitalInfo: { latlng: [13.7563, 100.5018] },
    flags: { svg: 'https://flagcdn.com/th.svg', png: 'https://flagcdn.com/w320/th.png' }
  },
  {
    name: { common: 'Noruega', official: 'Reino de Noruega' },
    capital: ['Oslo'],
    region: 'Europe',
    subregion: 'Northern Europe',
    population: 5379475,
    cca2: 'NO',
    cca3: 'NOR',
    latlng: [60.4720, 8.4689],
    capitalInfo: { latlng: [59.9139, 10.7522] },
    flags: { svg: 'https://flagcdn.com/no.svg', png: 'https://flagcdn.com/w320/no.png' }
  },
  {
    name: { common: 'Suiza', official: 'Confederación Suiza' },
    capital: ['Berna'],
    region: 'Europe',
    subregion: 'Western Europe',
    population: 8654622,
    cca2: 'CH',
    cca3: 'CHE',
    latlng: [46.8182, 8.2275],
    capitalInfo: { latlng: [46.9480, 7.4474] },
    flags: { svg: 'https://flagcdn.com/ch.svg', png: 'https://flagcdn.com/w320/ch.png' }
  },
  {
    name: { common: 'Grecia', official: 'República Helénica' },
    capital: ['Atenas'],
    region: 'Europe',
    subregion: 'Southern Europe',
    population: 10715549,
    cca2: 'GR',
    cca3: 'GRC',
    latlng: [39.0742, 21.8243],
    capitalInfo: { latlng: [37.9838, 23.7275] },
    flags: { svg: 'https://flagcdn.com/gr.svg', png: 'https://flagcdn.com/w320/gr.png' }
  },
  {
    name: { common: 'Portugal', official: 'República Portuguesa' },
    capital: ['Lisboa'],
    region: 'Europe',
    subregion: 'Southern Europe',
    population: 10305564,
    cca2: 'PT',
    cca3: 'PRT',
    latlng: [39.3999, -8.2245],
    capitalInfo: { latlng: [38.7223, -9.1393] },
    flags: { svg: 'https://flagcdn.com/pt.svg', png: 'https://flagcdn.com/w320/pt.png' }
  },
  {
    name: { common: 'Perú', official: 'República del Perú' },
    capital: ['Lima'],
    region: 'Americas',
    subregion: 'South America',
    population: 32971846,
    cca2: 'PE',
    cca3: 'PER',
    latlng: [-9.1900, -75.0152],
    capitalInfo: { latlng: [-12.0464, -77.0428] },
    flags: { svg: 'https://flagcdn.com/pe.svg', png: 'https://flagcdn.com/w320/pe.png' }
  },
  {
    name: { common: 'Turquía', official: 'República de Turquía' },
    capital: ['Ankara'],
    region: 'Asia',
    subregion: 'Western Asia',
    population: 84339067,
    cca2: 'TR',
    cca3: 'TUR',
    latlng: [38.9637, 35.2433],
    capitalInfo: { latlng: [39.9334, 32.8597] },
    flags: { svg: 'https://flagcdn.com/tr.svg', png: 'https://flagcdn.com/w320/tr.png' }
  },
  {
    name: { common: 'Marruecos', official: 'Reino de Marruecos' },
    capital: ['Rabat'],
    region: 'Africa',
    subregion: 'Northern Africa',
    population: 36910560,
    cca2: 'MA',
    cca3: 'MAR',
    latlng: [31.7917, -7.0926],
    capitalInfo: { latlng: [34.0209, -6.8416] },
    flags: { svg: 'https://flagcdn.com/ma.svg', png: 'https://flagcdn.com/w320/ma.png' }
  }
];

/**
 * Petición asíncrona a REST Countries API (v3.1)
 * Filtra los campos específicos para minimizar consumo de ancho de banda y latencia.
 */
async function fetchCountries() {
  const SKELETON_EL = document.getElementById('loading-skeleton');
  const GRID_EL = document.getElementById('countries-grid');
  const ERROR_EL = document.getElementById('error-state');
  const STATUS_EL = document.getElementById('status-countries');

  try {
    AppState.isLoadingCountries = true;
    SKELETON_EL.classList.remove('hidden');
    GRID_EL.classList.add('hidden');
    ERROR_EL.classList.add('hidden');

    // Solicitud con límite de timeout a 9 segundos
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);

    const API_URL = 'https://restcountries.com/v3.1/all?fields=name,capital,region,subregion,population,flags,latlng,cca2,cca3,capitalInfo';
    
    let rawData;
    try {
      const response = await fetch(API_URL, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}: No fue posible obtener datos de REST Countries.`);
      }
      rawData = await response.json();
    } catch (netError) {
      console.warn('[Planify] REST Countries API no disponible o excedió timeout. Usando dataset local seguro:', netError);
      rawData = FALLBACK_COUNTRIES;
      if (STATUS_EL) {
        STATUS_EL.textContent = 'Modo Seguro (Local)';
        STATUS_EL.classList.remove('status-online');
      }
    }

    // Normalizar y almacenar países
    AppState.countries = rawData.map(c => ({
      name: c.name?.common || 'País Desconocido',
      officialName: c.name?.official || '',
      capital: Array.isArray(c.capital) && c.capital.length > 0 ? c.capital[0] : 'N/D',
      region: c.region || 'Desconocida',
      subregion: c.subregion || c.region || '',
      population: typeof c.population === 'number' ? c.population : 0,
      cca2: c.cca2 || '',
      cca3: c.cca3 || c.cca2 || Math.random().toString(),
      flagUrl: c.flags?.svg || c.flags?.png || '',
      latlng: c.latlng || [0, 0],
      capitalLatlng: c.capitalInfo?.latlng || c.latlng || [0, 0]
    }));

    // Actualizar indicador de totales
    const totalCountEl = document.getElementById('sidebar-total-count');
    if (totalCountEl) totalCountEl.textContent = AppState.countries.length;

    // Aplicar filtros iniciales y renderizar
    applyFiltersAndRender();

  } catch (criticalErr) {
    console.error('[Planify] Error crítico en fetchCountries:', criticalErr);
    SKELETON_EL.classList.add('hidden');
    ERROR_EL.classList.remove('hidden');
    const errText = document.getElementById('error-message');
    if (errText) errText.textContent = criticalErr.message || 'Error al conectar con los servidores.';
  } finally {
    AppState.isLoadingCountries = false;
    SKELETON_EL.classList.add('hidden');
  }
}

/**
 * Consulta la telemetría meteorológica a Open-Meteo API en tiempo real.
 * @param {number} latitude - Latitud geográfica
 * @param {number} longitude - Longitud geográfica
 * @returns {Promise<object>} Objeto con clima actual y diario
 */
async function fetchWeatherData(latitude, longitude) {
  // Coordenadas válidas
  const lat = Number(latitude).toFixed(4);
  const lon = Number(longitude).toFixed(4);

  const OPEN_METEO_URL = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(OPEN_METEO_URL, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Open-Meteo respondió con estado ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// ==============================================================================
// 5. RENDERIZADO REACTIVO Y MANIPULACIÓN DEL DOM
// ==============================================================================

/**
 * Formatea cantidades numéricas con separadores de miles estándar.
 * @param {number} num - Número a formatear
 * @returns {string} Cadena formateada (ej. 47.351.567)
 */
function formatNumber(num) {
  return new Intl.NumberFormat('es-ES').format(num);
}

/**
 * Aplica los criterios de búsqueda, región y ordenamiento al estado global,
 * y envía el subconjunto resultante a renderizar en la grilla.
 */
function applyFiltersAndRender() {
  const { countries, searchQuery, selectedRegion, sortBy, currentView, favorites } = AppState;

  let result = [...countries];

  // 1. Filtrado por vista de Favoritos
  if (currentView === 'favorites') {
    result = result.filter(c => favorites.has(c.cca3));
  }

  // 2. Filtrado por Región geográfica
  if (selectedRegion !== 'all') {
    result = result.filter(c => c.region.toLowerCase() === selectedRegion.toLowerCase());
  }

  // 3. Filtrado por Búsqueda de Texto (Nombre común, oficial, capital o código cca3)
  if (searchQuery.trim() !== '') {
    const query = searchQuery.toLowerCase().trim();
    result = result.filter(c => 
      c.name.toLowerCase().includes(query) ||
      c.capital.toLowerCase().includes(query) ||
      c.cca3.toLowerCase().includes(query) ||
      c.officialName.toLowerCase().includes(query)
    );
  }

  // 4. Ordenamiento (Sort)
  switch (sortBy) {
    case 'name-asc':
      result.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
      break;
    case 'name-desc':
      result.sort((a, b) => b.name.localeCompare(a.name, 'es', { sensitivity: 'base' }));
      break;
    case 'pop-desc':
      result.sort((a, b) => b.population - a.population);
      break;
    case 'pop-asc':
      result.sort((a, b) => a.population - b.population);
      break;
  }

  AppState.filteredCountries = result;
  renderCountriesGrid(result);
  renderFilterMetadata(result.length);
}

/**
 * Renderiza dinámicamente las tarjetas de país en el DOM.
 * @param {Array<object>} list - Países a renderizar
 */
function renderCountriesGrid(list) {
  const grid = document.getElementById('countries-grid');
  const emptyState = document.getElementById('empty-state');
  const emptyTitle = document.getElementById('empty-title');
  const emptyDesc = document.getElementById('empty-desc');

  if (!grid) return;

  // Manejo de Estado Vacío
  if (list.length === 0) {
    grid.classList.add('hidden');
    emptyState.classList.remove('hidden');

    if (AppState.currentView === 'favorites') {
      emptyTitle.textContent = 'Aún no tienes destinos favoritos';
      emptyDesc.textContent = 'Haz clic en el icono del corazón ❤️ en cualquier país para guardarlo en tu lista personal.';
    } else {
      emptyTitle.textContent = 'No se encontraron países';
      emptyDesc.textContent = 'Prueba ajustando el texto de búsqueda o cambiando el selector de región.';
    }
    return;
  }

  emptyState.classList.add('hidden');
  grid.classList.remove('hidden');

  // Construcción eficiente de HTML en un solo paso
  const htmlCards = list.map(country => {
    const isFav = AppState.favorites.has(country.cca3);
    const favActiveClass = isFav ? 'active' : '';
    const cardFavClass = isFav ? 'is-favorite' : '';

    return `
      <article class="country-card ${cardFavClass}" data-cca3="${country.cca3}" id="card-${country.cca3}">
        
        <!-- Media / Bandera -->
        <div class="card-media">
          <img 
            src="${country.flagUrl}" 
            alt="Bandera de ${country.name}" 
            class="country-flag-img" 
            loading="lazy"
            onerror="this.src='https://placehold.co/600x400/0d131f/00f2fe?text=${country.cca3}'"
          >
          <div class="card-media-overlay"></div>
          <span class="card-cca-badge">${country.cca3}</span>
          
          <!-- Botón de Favorito -->
          <button 
            type="button" 
            class="btn-card-fav ${favActiveClass}" 
            data-action="toggle-fav" 
            data-cca3="${country.cca3}" 
            data-country-name="${country.name}"
            aria-label="${isFav ? 'Eliminar de favoritos' : 'Añadir a favoritos'}"
            title="${isFav ? 'Eliminar de favoritos' : 'Añadir a favoritos'}"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
          </button>
        </div>

        <!-- Contenido / Geodatos -->
        <div class="card-content">
          <div class="country-title-row">
            <h3 class="country-name" title="${country.officialName || country.name}">${country.name}</h3>
            <p class="country-subregion">${country.subregion || country.region}</p>
          </div>

          <div class="card-details-list">
            <div class="detail-item">
              <span class="detail-label">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                Capital:
              </span>
              <strong class="detail-value" title="${country.capital}">${country.capital}</strong>
            </div>

            <div class="detail-item">
              <span class="detail-label">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="2" y1="12" x2="22" y2="12"></line>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                </svg>
                Región:
              </span>
              <strong class="detail-value">${country.region}</strong>
            </div>

            <div class="detail-item">
              <span class="detail-label">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                Población:
              </span>
              <strong class="detail-value">${formatNumber(country.population)}</strong>
            </div>
          </div>

          <!-- Botón de Acción Clima (Fase 2) -->
          <button 
            type="button" 
            class="btn-card-weather" 
            data-action="open-weather" 
            data-cca3="${country.cca3}"
          >
            <span>PROCESAR CLIMA →</span>
          </button>
        </div>

      </article>
    `;
  }).join('');

  grid.innerHTML = htmlCards;
}

/**
 * Renderiza la barra de chips y el contador dinámico de resultados.
 * @param {number} count - Total de resultados filtrados
 */
function renderFilterMetadata(count) {
  const counterEl = document.getElementById('results-counter');
  const chipsContainer = document.getElementById('active-chips-container');
  if (!counterEl || !chipsContainer) return;

  const total = AppState.countries.length;
  counterEl.innerHTML = `Mostrando <strong>${count}</strong> de <strong>${total}</strong> destinos`;

  // Construir chips activos
  const chips = [];

  if (AppState.currentView === 'favorites') {
    chips.push(`<span class="filter-chip">❤️ Mis Favoritos</span>`);
  }

  if (AppState.selectedRegion !== 'all') {
    chips.push(`
      <span class="filter-chip">
        Región: ${AppState.selectedRegion}
        <button class="filter-chip-remove" data-remove-filter="region">&times;</button>
      </span>
    `);
  }

  if (AppState.searchQuery.trim() !== '') {
    chips.push(`
      <span class="filter-chip">
        "${AppState.searchQuery.trim()}"
        <button class="filter-chip-remove" data-remove-filter="search">&times;</button>
      </span>
    `);
  }

  chipsContainer.innerHTML = chips.join('');
}

/**
 * Actualiza los badges de favoritos en el Sidebar y Header.
 */
function updateFavoritesBadges() {
  const count = AppState.favorites.size;
  const sideFav = document.getElementById('sidebar-fav-count');
  const headFav = document.getElementById('header-fav-counter');
  if (sideFav) sideFav.textContent = count;
  if (headFav) headFav.textContent = count;
}

/**
 * Sincroniza visualmente el botón de favorito de una tarjeta sin re-renderizar toda la grilla.
 * @param {string} cca3 - Código del país
 * @param {boolean} isFav - Estado actual
 */
function updateCardFavoriteVisual(cca3, isFav) {
  const card = document.getElementById(`card-${cca3}`);
  if (card) {
    if (isFav) {
      card.classList.add('is-favorite');
    } else {
      card.classList.remove('is-favorite');
    }
    const btn = card.querySelector(`[data-action="toggle-fav"]`);
    if (btn) {
      if (isFav) {
        btn.classList.add('active');
        btn.setAttribute('aria-label', 'Eliminar de favoritos');
        btn.title = 'Eliminar de favoritos';
      } else {
        btn.classList.remove('active');
        btn.setAttribute('aria-label', 'Añadir a favoritos');
        btn.title = 'Añadir a favoritos';
      }
    }
  }

  // Sincronizar también el botón dentro del modal si está abierto con ese país
  if (AppState.activeCountryWeather && AppState.activeCountryWeather.cca3 === cca3) {
    const modalFavBtn = document.getElementById('modal-fav-btn');
    if (modalFavBtn) {
      if (isFav) {
        modalFavBtn.classList.add('active');
      } else {
        modalFavBtn.classList.remove('active');
      }
    }
  }
}

// ==============================================================================
// 6. CONTROLADOR DEL MODAL METEOROLÓGICO (FASE 2)
// ==============================================================================

/**
 * Abre el modal y procesa el clima de un país mediante Open-Meteo.
 * @param {string} cca3 - Código del país seleccionado
 */
async function openWeatherModal(cca3) {
  const country = AppState.countries.find(c => c.cca3 === cca3);
  if (!country) return;

  AppState.activeCountryWeather = country;

  const modal = document.getElementById('weather-modal');
  const loader = document.getElementById('modal-loader');
  const errorBox = document.getElementById('modal-error');
  const content = document.getElementById('weather-content');
  const modalFavBtn = document.getElementById('modal-fav-btn');

  // Llenar datos de encabezado del país de inmediato
  document.getElementById('modal-country-flag').src = country.flagUrl;
  document.getElementById('modal-country-flag').alt = `Bandera de ${country.name}`;
  document.getElementById('modal-country-name').textContent = country.name;
  document.getElementById('modal-country-capital').textContent = `Capital: ${country.capital} • ${country.region}`;
  document.getElementById('modal-country-code').textContent = country.cca3;

  // Coordenadas: preferimos las de la capital, si no las generales
  const [lat, lon] = country.capitalLatlng && country.capitalLatlng.length === 2
    ? country.capitalLatlng
    : country.latlng;

  document.getElementById('modal-country-coords').textContent = `Lat: ${Number(lat).toFixed(2)}°, Lon: ${Number(lon).toFixed(2)}°`;

  // Estado del botón de favorito en el modal
  if (modalFavBtn) {
    if (AppState.favorites.has(country.cca3)) {
      modalFavBtn.classList.add('active');
    } else {
      modalFavBtn.classList.remove('active');
    }
  }

  // Mostrar modal y estado de carga
  modal.classList.remove('hidden');
  loader.classList.remove('hidden');
  errorBox.classList.add('hidden');
  content.classList.add('hidden');
  document.body.style.overflow = 'hidden'; // Evitar scroll de fondo

  try {
    // Petición a Open-Meteo
    const weatherData = await fetchWeatherData(lat, lon);
    renderWeatherDataInModal(weatherData, country);
    loader.classList.add('hidden');
    content.classList.remove('hidden');
  } catch (error) {
    console.error('[Planify] Error al procesar clima en modal:', error);
    loader.classList.add('hidden');
    errorBox.classList.remove('hidden');
    const errText = document.getElementById('modal-error-text');
    if (errText) {
      errText.textContent = `No pudimos obtener la telemetría climática para ${country.name} (${error.message || 'Error de conexión'}).`;
    }
  }
}

/**
 * Pinta los datos meteorológicos satelitales en los elementos del modal.
 * @param {object} data - Respuesta JSON de Open-Meteo
 * @param {object} country - Objeto país
 */
function renderWeatherDataInModal(data, country) {
  const current = data.current || {};
  const daily = data.daily || {};

  const temp = Math.round(current.temperature_2m ?? 0);
  const apparent = Math.round(current.apparent_temperature ?? temp);
  const humidity = current.relative_humidity_2m ?? 50;
  const wind = Math.round(current.wind_speed_10m ?? 0);
  const precip = (current.precipitation ?? 0).toFixed(1);
  const wmoCode = current.weather_code ?? 0;
  const isDay = current.is_day ?? 1;

  const wmo = getWmoDetails(wmoCode, isDay);

  // 1. Tarjeta Hero Clima
  document.getElementById('weather-main-icon').textContent = wmo.icon;
  document.getElementById('weather-temp').textContent = temp;
  document.getElementById('weather-condition').textContent = wmo.label;
  document.getElementById('weather-apparent').textContent = `${apparent}°C`;
  document.getElementById('weather-daynight-text').textContent = isDay ? 'Horario Diurno' : 'Horario Nocturno';
  document.getElementById('weather-timezone').textContent = `Zona horaria: ${data.timezone || 'Local'}`;

  // 2. Grilla de Telemetría
  document.getElementById('weather-humidity').textContent = `${humidity}%`;
  document.getElementById('humidity-meter-bar').style.width = `${Math.min(humidity, 100)}%`;

  document.getElementById('weather-wind').innerHTML = `${wind} <small>km/h</small>`;
  const windDescEl = document.getElementById('weather-wind-desc');
  if (wind < 12) windDescEl.textContent = 'Brisa suave';
  else if (wind < 28) windDescEl.textContent = 'Viento moderado';
  else windDescEl.textContent = 'Viento fuerte / ráfagas';

  document.getElementById('weather-precip').innerHTML = `${precip} <small>mm</small>`;
  const precipDescEl = document.getElementById('weather-precip-desc');
  if (Number(precip) === 0) precipDescEl.textContent = 'Sin precipitaciones';
  else if (Number(precip) < 3) precipDescEl.textContent = 'Llovizna leve';
  else precipDescEl.textContent = 'Precipitación activa';

  document.getElementById('weather-wmo-code').textContent = String(wmoCode).padStart(2, '0');

  // 3. Pronóstico diario (Próximos 5 días)
  const forecastStrip = document.getElementById('forecast-strip');
  if (forecastStrip && Array.isArray(daily.time)) {
    const daysHtml = daily.time.slice(0, 5).map((dateStr, index) => {
      const code = daily.weather_code ? daily.weather_code[index] : 0;
      const max = Math.round(daily.temperature_2m_max ? daily.temperature_2m_max[index] : 0);
      const min = Math.round(daily.temperature_2m_min ? daily.temperature_2m_min[index] : 0);
      const dayMeta = getWmoDetails(code, 1);

      // Obtener nombre abreviado del día (Lun, Mar, Mié, etc.)
      const dateObj = new Date(dateStr + 'T00:00:00');
      const dayName = dateObj.toLocaleDateString('es-ES', { weekday: 'short' });

      return `
        <div class="forecast-day-card" title="${dayMeta.label}">
          <span class="forecast-day-name">${dayName}</span>
          <span class="forecast-icon">${dayMeta.icon}</span>
          <div class="forecast-temps">
            <span class="forecast-max">${max}°</span>
            <span class="forecast-min">${min}°</span>
          </div>
        </div>
      `;
    }).join('');

    forecastStrip.innerHTML = daysHtml;
  }

  // 4. Consejo Inteligente de Viaje Planify (Smart Travel Insight)
  let customAdvice = wmo.advice;
  if (temp > 30) {
    customAdvice += ' El ambiente es caluroso en ' + country.capital + '; lleva ropa fresca y protector solar.';
  } else if (temp < 8) {
    customAdvice += ' Clima frío en ' + country.capital + '; viste abrigo térmico y bufanda para pasear.';
  }
  document.getElementById('travel-insight-text').textContent = customAdvice;
}

/**
 * Cierra cualquier modal abierto y restablece el scroll de la página.
 */
function closeModal() {
  const weatherModal = document.getElementById('weather-modal');
  const academicModal = document.getElementById('academic-modal');

  if (weatherModal) weatherModal.classList.add('hidden');
  if (academicModal) academicModal.classList.add('hidden');
  document.body.style.overflow = '';
  AppState.activeCountryWeather = null;
}

// ==============================================================================
// 7. SISTEMA DE NOTIFICACIONES TOAST
// ==============================================================================

/**
 * Muestra una notificación flotante estilo glass-neon.
 * @param {string} title - Título del mensaje
 * @param {string} msg - Texto descriptivo
 * @param {'success'|'coral'} type - Variante de color neón
 */
function showToast(title, msg, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'alert');

  const icon = type === 'coral' ? '💔' : '✨';

  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <div>
      <div class="toast-title">${title}</div>
      <div class="toast-msg">${msg}</div>
    </div>
  `;

  container.appendChild(toast);

  // Auto-remover tras 4 segundos
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 4000);
}

// ==============================================================================
// 8. DELEGACIÓN DE EVENTOS Y REGISTRO DE LISTENERS
// ==============================================================================

/**
 * Configura los eventos principales utilizando buenas prácticas de arquitectura:
 *  - Event Delegation en la grilla dinámica de países
 *  - Debounce en la búsqueda de texto
 *  - Cierre accesible de modales con Escape y clics fuera del diálogo
 */
function setupEventListeners() {
  
  // 1. Delegación de Eventos en la Grilla de Países (Evita cientos de listeners)
  const grid = document.getElementById('countries-grid');
  if (grid) {
    grid.addEventListener('click', (event) => {
      // a) Clic en botón "PROCESAR CLIMA →"
      const weatherBtn = event.target.closest('[data-action="open-weather"]');
      if (weatherBtn) {
        const cca3 = weatherBtn.dataset.cca3;
        if (cca3) openWeatherModal(cca3);
        return;
      }

      // b) Clic en botón de Favoritos en la tarjeta
      const favBtn = event.target.closest('[data-action="toggle-fav"]');
      if (favBtn) {
        const cca3 = favBtn.dataset.cca3;
        const name = favBtn.dataset.countryName || 'Destino';
        if (cca3) toggleFavoriteCountry(cca3, name);
        return;
      }
    });
  }

  // 2. Búsqueda en Tiempo Real con Debounce
  const searchInput = document.getElementById('search-input');
  const clearSearchBtn = document.getElementById('clear-search-btn');

  let debounceTimer;
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const val = e.target.value;
      if (clearSearchBtn) {
        clearSearchBtn.style.display = val.length > 0 ? 'block' : 'none';
      }

      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        AppState.searchQuery = val;
        applyFiltersAndRender();
      }, 200);
    });
  }

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
      }
      clearSearchBtn.style.display = 'none';
      AppState.searchQuery = '';
      applyFiltersAndRender();
    });
  }

  // 3. Filtro por Región Geográfica (<select>)
  const regionSelect = document.getElementById('region-filter');
  if (regionSelect) {
    regionSelect.addEventListener('change', (e) => {
      AppState.selectedRegion = e.target.value;
      applyFiltersAndRender();
    });
  }

  // 4. Ordenamiento de Países (<select>)
  const sortSelect = document.getElementById('sort-filter');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      AppState.sortBy = e.target.value;
      applyFiltersAndRender();
    });
  }

  // 5. Botón de Reset de Filtros
  const resetBtn = document.getElementById('btn-reset-filters');
  const emptyResetBtn = document.getElementById('btn-empty-reset');
  const resetFiltersAction = () => {
    AppState.searchQuery = '';
    AppState.selectedRegion = 'all';
    AppState.sortBy = 'name-asc';

    if (searchInput) searchInput.value = '';
    if (clearSearchBtn) clearSearchBtn.style.display = 'none';
    if (regionSelect) regionSelect.value = 'all';
    if (sortSelect) sortSelect.value = 'name-asc';

    applyFiltersAndRender();
  };

  if (resetBtn) resetBtn.addEventListener('click', resetFiltersAction);
  if (emptyResetBtn) emptyResetBtn.addEventListener('click', resetFiltersAction);

  // 6. Remover chips de filtro activo
  const chipsContainer = document.getElementById('active-chips-container');
  if (chipsContainer) {
    chipsContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-remove-filter]');
      if (!btn) return;
      const type = btn.dataset.removeFilter;
      if (type === 'region') {
        AppState.selectedRegion = 'all';
        if (regionSelect) regionSelect.value = 'all';
      } else if (type === 'search') {
        AppState.searchQuery = '';
        if (searchInput) searchInput.value = '';
        if (clearSearchBtn) clearSearchBtn.style.display = 'none';
      }
      applyFiltersAndRender();
    });
  }

  // 7. Navegación del Sidebar (Explorar vs Mis Favoritos)
  const navExplore = document.getElementById('nav-btn-explore');
  const navFavs = document.getElementById('nav-btn-favorites');
  const quickFavs = document.getElementById('btn-quick-favs');
  const viewTitle = document.getElementById('current-view-title');
  const viewSubtitle = document.getElementById('current-view-subtitle');

  const setView = (viewMode) => {
    AppState.currentView = viewMode;
    if (viewMode === 'favorites') {
      if (navExplore) navExplore.classList.remove('active');
      if (navFavs) navFavs.classList.add('active');
      if (viewTitle) viewTitle.textContent = 'Mis Destinos Favoritos';
      if (viewSubtitle) viewSubtitle.textContent = 'Consulta y analiza el clima de tus países guardados en el almacenamiento local.';
    } else {
      if (navExplore) navExplore.classList.add('active');
      if (navFavs) navFavs.classList.remove('active');
      if (viewTitle) viewTitle.textContent = 'Explorador de Destinos';
      if (viewSubtitle) viewSubtitle.textContent = 'Descubre información geográfica y analiza el clima en tiempo real antes de emprender tu viaje.';
    }
    applyFiltersAndRender();

    // En móviles, cerrar el sidebar tras elegir vista
    const sidebar = document.getElementById('app-sidebar');
    if (sidebar) sidebar.classList.remove('mobile-open');
  };

  if (navExplore) navExplore.addEventListener('click', () => setView('explore'));
  if (navFavs) navFavs.addEventListener('click', () => setView('favorites'));
  if (quickFavs) quickFavs.addEventListener('click', () => setView('favorites'));

  // 8. Botón Favorito dentro del Modal Meteorológico
  const modalFavBtn = document.getElementById('modal-fav-btn');
  if (modalFavBtn) {
    modalFavBtn.addEventListener('click', () => {
      if (AppState.activeCountryWeather) {
        toggleFavoriteCountry(AppState.activeCountryWeather.cca3, AppState.activeCountryWeather.name);
      }
    });
  }

  // 9. Reintentar Clima en Modal
  const modalRetryBtn = document.getElementById('modal-retry-btn');
  if (modalRetryBtn) {
    modalRetryBtn.addEventListener('click', () => {
      if (AppState.activeCountryWeather) {
        openWeatherModal(AppState.activeCountryWeather.cca3);
      }
    });
  }

  // 10. Reintentar Conexión General de Países
  const retryFetchBtn = document.getElementById('btn-retry-fetch');
  if (retryFetchBtn) {
    retryFetchBtn.addEventListener('click', fetchCountries);
  }

  // 11. Cierre de Modales (Botón X, Fondo exterior y Botón inferior)
  const weatherModal = document.getElementById('weather-modal');
  const closeWeatherBtn = document.getElementById('modal-close-btn');
  const bottomCloseWeather = document.getElementById('modal-bottom-close');

  if (closeWeatherBtn) closeWeatherBtn.addEventListener('click', closeModal);
  if (bottomCloseWeather) bottomCloseWeather.addEventListener('click', closeModal);

  if (weatherModal) {
    weatherModal.addEventListener('click', (e) => {
      if (e.target === weatherModal) closeModal();
    });
  }

  // Modal Académico / Documentación
  const academicModal = document.getElementById('academic-modal');
  const navAcademic = document.getElementById('nav-btn-academic');
  const closeAcademicBtn = document.getElementById('close-academic-modal-btn');
  const academicBottomClose = document.getElementById('academic-bottom-close');

  const openAcademicModal = () => {
    if (academicModal) {
      academicModal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    }
  };

  if (navAcademic) navAcademic.addEventListener('click', openAcademicModal);
  if (closeAcademicBtn) closeAcademicBtn.addEventListener('click', closeModal);
  if (academicBottomClose) academicBottomClose.addEventListener('click', closeModal);

  if (academicModal) {
    academicModal.addEventListener('click', (e) => {
      if (e.target === academicModal) closeModal();
    });
  }

  // Cerrar modales con la tecla Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
    }
  });

  // 12. Toggle de Sidebar en Dispositivos Móviles
  const mobileToggle = document.getElementById('mobile-sidebar-toggle');
  const sidebar = document.getElementById('app-sidebar');
  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      sidebar.classList.toggle('mobile-open');
    });

    document.addEventListener('click', (e) => {
      if (!sidebar.contains(e.target) && !mobileToggle.contains(e.target)) {
        sidebar.classList.remove('mobile-open');
      }
    });
  }
}

// ==============================================================================
// 9. INICIALIZACIÓN DE LA APLICACIÓN (INIT)
// ==============================================================================
document.addEventListener('DOMContentLoaded', () => {
  console.log('[Planify] Inicializando plataforma inteligente para viajes (Fase 2)...');

  // 1. Cargar favoritos previos de localStorage
  AppState.favorites = loadFavoritesFromStorage();
  updateFavoritesBadges();

  // 2. Configurar escuchadores de eventos
  setupEventListeners();

  // 3. Ejecutar petición de países
  fetchCountries();
});