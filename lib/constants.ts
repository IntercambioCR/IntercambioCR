export const categories = [
  "Electrónica",
  "Hogar",
  "Decoración",
  "Cocina",
  "Oficina",
  "Escolar",
  "Juguetes",
  "Bebés",
  "Moda mujer",
  "Moda hombre",
  "Deportes",
  "Mascotas",
  "Herramientas",
  "Coleccionables",
  "Otros"
] as const;

export const conditions = [
  "Nuevo",
  "Como nuevo",
  "Muy bueno",
  "Bueno",
  "Aceptable"
] as const;

export const listingStatuses = [
  "Disponible",
  "Reservado",
  "En proceso",
  "Completado",
  "Cancelado"
] as const;

export const trustRules = [
  "Puedes aceptar créditos, aceptar otro artículo o elegir la mejor oferta recibida.",
  "Intercambio CR emite créditos solo cuando recibe e inspecciona artículos en Escazú Centro o Alajuela Centro.",
  "Los créditos entre usuarios solo se mueven mediante ofertas asociadas a publicaciones.",
  "Cada oferta requiere aprobación de ambas partes, con créditos retenidos hasta confirmar.",
  "Los créditos son saldo interno no redimible por efectivo y no equivalen a colones.",
  "Los artículos de valor alto o riesgo elevado requieren revisión administrativa."
];

export const forbiddenItems = [
  "Armas o artículos peligrosos",
  "Medicamentos, alcohol, tabaco o vapeadores",
  "Animales",
  "Documentos oficiales",
  "Falsificaciones o artículos robados",
  "Contenido adulto",
  "Servicios personales",
  "Alimentos preparados"
];

export const demoListings = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    title: "Silla ergonómica de oficina",
    category: "Oficina",
    condition: "Muy bueno",
    location: "Escazú",
    credits: 260,
    image: "/demo/silla-oficina-real.png",
    images: [
      "/demo/silla-oficina-real.png",
      "/demo/hero-intercambio-real.png"
    ]
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    title: "Set de cocina en acero inoxidable",
    category: "Cocina",
    condition: "Bueno",
    location: "Santa Ana",
    credits: 180,
    image: "/demo/cocina-acero-real.png",
    images: [
      "/demo/cocina-acero-real.png",
      "/demo/hero-intercambio-real.png"
    ]
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    title: "Nintendo Switch con controles",
    category: "Electrónica",
    condition: "Muy bueno",
    location: "San José",
    credits: 920,
    image: "/demo/consola-real.png",
    images: [
      "/demo/consola-real.png",
      "/demo/hero-intercambio-real.png"
    ]
  }
];
