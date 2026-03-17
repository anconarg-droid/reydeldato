/**
 * Batería de casos reales de emprendimientos chilenos para validar la clasificación
 * de punta a punta. Cada caso simula cómo escribe un emprendedor.
 */

export type CasoClasificacion = {
  id: string;
  nombre_emprendimiento: string;
  descripcion_negocio: string;
  /** Keywords que el emprendedor ingresó manualmente (opcional) */
  keywords_usuario?: string[];
  /** Keywords que simulan la extracción por IA (para el test, cuando no hay keywords_usuario) */
  keywords_ia_simulados?: string[];
  /** Subcategoría esperada (slug) para validar el resultado */
  subcategoria_esperada: string;
};

/** Al menos 30 casos realistas para validación de clasificación */
export const BATERIA_CASOS_REALES: CasoClasificacion[] = [
  {
    id: "pan-1",
    nombre_emprendimiento: "Panadería La Esquina",
    descripcion_negocio:
      "Hacemos pan amasado, hallullas y dobladitas recién horneados todos los días. También vendemos pasteles y tortas por encargo. Atención en Maipú.",
    keywords_usuario: ["pan", "panadería", "tortas"],
    subcategoria_esperada: "panaderia",
  },
  {
    id: "pan-2",
    nombre_emprendimiento: "Pan y Dulces Doña María",
    descripcion_negocio:
      "Panadería de barrio con más de 20 años. Pan batido, coliza, marraqueta. Repostería y queques para cumpleaños.",
    keywords_ia_simulados: ["panadería", "pan", "repostería"],
    subcategoria_esperada: "panaderia",
  },
  {
    id: "past-1",
    nombre_emprendimiento: "Dulce Repostería",
    descripcion_negocio:
      "Tortas personalizadas para matrimonios y cumpleaños. Cupcakes, cheesecake y postres. Trabajo con reserva previa.",
    keywords_usuario: ["tortas", "repostería", "cumpleaños"],
    subcategoria_esperada: "pasteleria",
  },
  {
    id: "past-2",
    nombre_emprendimiento: "Pastelería Artesanal Lo Barnechea",
    descripcion_negocio:
      "Pasteles y tortas artesanales. Kuchen, brazo de reina, tortas de novios. Delivery en sector oriente.",
    keywords_ia_simulados: ["pastelería", "tortas", "repostería"],
    subcategoria_esperada: "pasteleria",
  },
  {
    id: "emp-1",
    nombre_emprendimiento: "Empanadas Donde la Nona",
    descripcion_negocio:
      "Empanadas de horno y fritas. De pino, queso, jamón queso y napolitana. Encargos para 18 y fiestas.",
    keywords_usuario: ["empanadas", "pino", "hornadas"],
    subcategoria_esperada: "empanadas",
  },
  {
    id: "gas-1",
    nombre_emprendimiento: "Gasfitería Rápida",
    descripcion_negocio:
      "Reparación de cañerías, destape de baños y cocina. Instalación de artefactos. Urgencias y cotizaciones sin compromiso.",
    keywords_usuario: ["gasfiter", "cañerías", "destape"],
    subcategoria_esperada: "gasfiter",
  },
  {
    id: "gas-2",
    nombre_emprendimiento: "Plomería y Gasfitería San Miguel",
    descripcion_negocio:
      "Servicio de plomería a domicilio. Reparamos fugas, cambiamos llaves y hacemos instalaciones. Presupuesto gratis.",
    keywords_ia_simulados: ["plomero", "plomería", "gasfiter"],
    subcategoria_esperada: "gasfiter",
  },
  {
    id: "elec-1",
    nombre_emprendimiento: "Electricista Domicilio",
    descripcion_negocio:
      "Instalaciones eléctricas, reparación de tableros y cortes. Certificado. Trabajo en Santiago y alrededores.",
    keywords_usuario: ["electricista", "instalaciones"],
    subcategoria_esperada: "electricista",
  },
  {
    id: "vulc-1",
    nombre_emprendimiento: "Vulcanización Las Condes",
    descripcion_negocio:
      "Reparación de neumáticos, parche y cambio de cubiertas. Atención rápida. También hacemos balanceo.",
    keywords_usuario: ["vulcanización", "neumáticos", "parche"],
    subcategoria_esperada: "vulcanizacion",
  },
  {
    id: "mec-1",
    nombre_emprendimiento: "Taller Mecánico El Rápido",
    descripcion_negocio:
      "Mecánica general, cambio de aceite, frenos y revisión técnica. Más de 15 años de experiencia.",
    keywords_usuario: ["mecánico", "taller", "revisión técnica"],
    subcategoria_esperada: "mecanico",
  },
  {
    id: "mec-2",
    nombre_emprendimiento: "AutoServicio Juan",
    descripcion_negocio:
      "Reparación de autos, motor y suspensión. Diagnóstico computacional. Estamos en La Florida.",
    keywords_ia_simulados: ["mecánico", "taller", "reparación autos"],
    subcategoria_esperada: "mecanico",
  },
  {
    id: "flet-1",
    nombre_emprendimiento: "Fletes y Mudanzas Pepe",
    descripcion_negocio:
      "Mudanzas a todo Chile. Fletes chicos y grandes. Embalaje y traslado de muebles. Cotizo sin compromiso.",
    keywords_usuario: ["fletes", "mudanzas", "traslado"],
    subcategoria_esperada: "fletes",
  },
  {
    id: "flet-2",
    nombre_emprendimiento: "Camión a la Orden",
    descripcion_negocio:
      "Servicio de flete para carga y mudanza. Santiago y regiones. Precios accesibles.",
    keywords_ia_simulados: ["fletes", "mudanza", "carga"],
    subcategoria_esperada: "fletes",
  },
  {
    id: "vet-1",
    nombre_emprendimiento: "Clínica Veterinaria Patitas",
    descripcion_negocio:
      "Atención veterinaria para perros y gatos. Consultas, vacunas, cirugías y peluquería canina. Horario extendido.",
    keywords_usuario: ["veterinaria", "perros", "gatos"],
    subcategoria_esperada: "veterinaria",
  },
  {
    id: "vet-2",
    nombre_emprendimiento: "Veterinario a Domicilio",
    descripcion_negocio:
      "Visito a tu mascota en la casa. Vacunas, desparasitación y consultas. Zona norte de Santiago.",
    keywords_ia_simulados: ["veterinario", "mascotas", "vacunas"],
    subcategoria_esperada: "veterinaria",
  },
  {
    id: "ferr-1",
    nombre_emprendimiento: "Ferretería El Martillo",
    descripcion_negocio:
      "Ferretería de barrio. Herramientas, pinturas, tornillos y materiales de construcción. Abierto de lunes a sábado.",
    keywords_usuario: ["ferretería", "herramientas", "construcción"],
    subcategoria_esperada: "ferreteria",
  },
  {
    id: "clas-1",
    nombre_emprendimiento: "Clases de Matemáticas",
    descripcion_negocio:
      "Reforzamiento escolar y preparación PSU/PAES. Matemáticas y física. Profesor con experiencia. Presencial y online.",
    keywords_usuario: ["clases", "matemáticas", "reforzamiento"],
    subcategoria_esperada: "clases",
  },
  {
    id: "clas-2",
    nombre_emprendimiento: "Academia de Inglés Kids",
    descripcion_negocio:
      "Clases de inglés para niños y adultos. Niveles básico a avanzado. Metodología entretenida.",
    keywords_ia_simulados: ["clases", "inglés", "idiomas"],
    subcategoria_esperada: "clases",
  },
  {
    id: "pelu-1",
    nombre_emprendimiento: "Peluquería Unisex Centro",
    descripcion_negocio:
      "Cortes de pelo para hombres y mujeres. Tinturas, peinados y barba. Atención con hora reservada.",
    keywords_usuario: ["peluquería", "cortes", "tintura"],
    subcategoria_esperada: "peluqueria",
  },
  {
    id: "pelu-2",
    nombre_emprendimiento: "Belleza y Estilo",
    descripcion_negocio:
      "Peluquería y estética. Cortes, peinados para eventos y tratamientos capilares. Providencia.",
    keywords_ia_simulados: ["peluquería", "cortes", "estética"],
    subcategoria_esperada: "peluqueria",
  },
  {
    id: "pizz-1",
    nombre_emprendimiento: "Pizzería Napolitana",
    descripcion_negocio:
      "Pizzas artesanales al horno de barro. Masa madre y ingredientes frescos. Delivery y local en Ñuñoa.",
    keywords_usuario: ["pizzas", "napolitana", "delivery"],
    subcategoria_esperada: "pizzas",
  },
  {
    id: "pizz-2",
    nombre_emprendimiento: "Pizza a la Piedra",
    descripcion_negocio:
      "Pizzas familiares y por porción. También pastas y calzones. Envíos a domicilio.",
    keywords_ia_simulados: ["pizzas", "pizza", "delivery"],
    subcategoria_esperada: "pizzas",
  },
  {
    id: "comida-1",
    nombre_emprendimiento: "Comida Casera Delivery",
    descripcion_negocio:
      "Platos caseros del día. Cazuela, porotos, pastel de choclo. Llevamos a tu casa o trabajo en la comuna.",
    keywords_usuario: ["comida casera", "delivery", "almuerzos"],
    subcategoria_esperada: "comida_casera",
  },
  {
    id: "comida-2",
    nombre_emprendimiento: "Olla Común Solidaria",
    descripcion_negocio:
      "Comida para llevar y delivery. Menú diario económico. Atención en población.",
    keywords_ia_simulados: ["comida casera", "delivery", "menú"],
    subcategoria_esperada: "comida_casera",
  },
  {
    id: "pan-3",
    nombre_emprendimiento: "Pan Integral Saludable",
    descripcion_negocio:
      "Pan integral, de centeno y sin gluten. Opciones para diabéticos. Pedidos con anticipación.",
    keywords_ia_simulados: ["pan", "panadería", "integral"],
    subcategoria_esperada: "panaderia",
  },
  {
    id: "past-3",
    nombre_emprendimiento: "Tortas para Eventos",
    descripcion_negocio:
      "Tortas de bodas, bautizos y cumpleaños. Diseño a gusto del cliente. Presupuesto sin compromiso.",
    keywords_usuario: ["tortas", "eventos", "bodas"],
    subcategoria_esperada: "pasteleria",
  },
  {
    id: "emp-2",
    nombre_emprendimiento: "Empanadas de Mariscos",
    descripcion_negocio:
      "Empanadas de mariscos, camarón y queso. Producto fresco. Ventas por encargo y para empresas.",
    keywords_ia_simulados: ["empanadas", "mariscos", "encargo"],
    subcategoria_esperada: "empanadas",
  },
  {
    id: "gas-3",
    nombre_emprendimiento: "Servicio de Plomería 24/7",
    descripcion_negocio:
      "Emergencias de gasfitería. Destape, fugas y instalaciones. Atendemos rápido en Santiago.",
    keywords_ia_simulados: ["gasfiter", "plomería", "destape"],
    subcategoria_esperada: "gasfiter",
  },
  {
    id: "elec-2",
    nombre_emprendimiento: "Soluciones Eléctricas",
    descripcion_negocio:
      "Electricidad domiciliaria y comercial. Instalación de luminarias y tableros. Certificado SEC.",
    subcategoria_esperada: "electricista",
  },
  {
    id: "vulc-2",
    nombre_emprendimiento: "Parche y Vulca",
    descripcion_negocio:
      "Vulcanización y reparación de neumáticos. Cambio de cubiertas y balanceo. San Bernardo.",
    subcategoria_esperada: "vulcanizacion",
  },
  {
    id: "mec-3",
    nombre_emprendimiento: "Mecánica Diesel",
    descripcion_negocio:
      "Especialistas en motores diesel. Camiones y maquinaria. Revisión y reparación.",
    keywords_ia_simulados: ["mecánico", "diesel", "taller"],
    subcategoria_esperada: "mecanico",
  },
  {
    id: "flet-3",
    nombre_emprendimiento: "Mudanzas Express",
    descripcion_negocio:
      "Mudanzas nacionales. Embalaje incluido. Camiones con personal. Cotización por WhatsApp.",
    subcategoria_esperada: "fletes",
  },
  {
    id: "vet-3",
    nombre_emprendimiento: "Veterinaria Mascotas Felices",
    descripcion_negocio:
      "Clínica veterinaria. Consultas, cirugías, radiografía y ecografía. Planes de salud para mascotas.",
    keywords_ia_simulados: ["veterinaria", "clínica", "mascotas"],
    subcategoria_esperada: "veterinaria",
  },
  {
    id: "ferr-2",
    nombre_emprendimiento: "Casa de la Construcción",
    descripcion_negocio:
      "Ferretería y materiales. Cemento, fierro, madera y herramientas. Despacho a obra.",
    keywords_ia_simulados: ["ferretería", "construcción", "herramientas"],
    subcategoria_esperada: "ferreteria",
  },
  {
    id: "clas-3",
    nombre_emprendimiento: "Preuniversitario Popular",
    descripcion_negocio:
      "Preparación PAES y PTU. Lenguaje y matemáticas. Clases grupales e individuales. Precios accesibles.",
    keywords_ia_simulados: ["clases", "preuniversitario", "PAES"],
    subcategoria_esperada: "clases",
  },
  {
    id: "pelu-3",
    nombre_emprendimiento: "Barbería Clásica",
    descripcion_negocio:
      "Corte de pelo y barba al estilo clásico. Tijera y máquina. Ambiente tranquilo. Reserva tu hora.",
    keywords_ia_simulados: ["peluquería", "barbería", "corte"],
    subcategoria_esperada: "peluqueria",
  },
  {
    id: "pizz-3",
    nombre_emprendimiento: "Pizza y Pasta",
    descripcion_negocio:
      "Pizzas a la piedra y pastas frescas. Menú ejecutivo al mediodía. Delivery disponible.",
    keywords_ia_simulados: ["pizzas", "pizza", "delivery"],
    subcategoria_esperada: "pizzas",
  },
  {
    id: "comida-3",
    nombre_emprendimiento: "Almuerzos a Domicilio",
    descripcion_negocio:
      "Comida casera con delivery. Menú del día, porciones abundantes. Zona centro y sur de Santiago.",
    keywords_ia_simulados: ["comida casera", "delivery", "almuerzos"],
    subcategoria_esperada: "comida_casera",
  },
];
