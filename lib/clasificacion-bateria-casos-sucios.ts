/**
 * Segunda batería: casos "sucios" o ambiguos para estresar el motor de clasificación.
 * Lenguaje informal, coloquial, textos cortos, sinónimos no exactos, varios servicios mezclados,
 * descripciones por productos en vez de rubros formales.
 */

import type { CasoClasificacion } from "./clasificacion-bateria-casos-reales";

/** Al menos 20 casos más sucios/ambiguos para validación */
export const BATERIA_CASOS_SUCIOS: CasoClasificacion[] = [
  // Textos muy cortos pero válidos
  {
    id: "s-pan-1",
    nombre_emprendimiento: "Pan Doña Rosa",
    descripcion_negocio: "Vendo pan.",
    keywords_usuario: ["pan"],
    subcategoria_esperada: "panaderia",
  },
  {
    id: "s-gas-1",
    nombre_emprendimiento: "Gasfiter Urgente",
    descripcion_negocio: "Gasfiter urgente 24/7.",
    subcategoria_esperada: "gasfiter",
  },
  {
    id: "s-vulc-1",
    nombre_emprendimiento: "La Vulca",
    descripcion_negocio: "Parche y vulca. Rápido y barato.",
    subcategoria_esperada: "vulcanizacion",
  },
  {
    id: "s-flet-1",
    nombre_emprendimiento: "Flete Barato",
    descripcion_negocio: "Hacemos fletes. Cualquier cosa.",
    subcategoria_esperada: "fletes",
  },
  // Términos coloquiales
  {
    id: "s-pan-2",
    nombre_emprendimiento: "Las Masas",
    descripcion_negocio: "Hacemos masas, pan y dulces. Lo que pida.",
    keywords_ia_simulados: ["masas", "pan"],
    subcategoria_esperada: "panaderia",
  },
  {
    id: "s-gas-2",
    nombre_emprendimiento: "Arreglo Cañerías",
    descripcion_negocio: "Arreglo cañerías y todo lo que sea plomería. Presupuesto sin compromiso.",
    keywords_ia_simulados: ["cañerías", "plomero"],
    subcategoria_esperada: "gasfiter",
  },
  {
    id: "s-past-1",
    nombre_emprendimiento: "Repostero a Domicilio",
    descripcion_negocio: "Soy repostero, hago tortas y queques. Llevo a la casa.",
    keywords_ia_simulados: ["repostero", "tortas"],
    subcategoria_esperada: "pasteleria",
  },
  {
    id: "s-mec-1",
    nombre_emprendimiento: "Mecánico a Domicilio",
    descripcion_negocio: "Voy donde estés. Revisión y reparación de autos.",
    keywords_ia_simulados: ["mecánico", "autos"],
    subcategoria_esperada: "mecanico",
  },
  {
    id: "s-pelu-1",
    nombre_emprendimiento: "Cortes y Tintura",
    descripcion_negocio: "Cortes de pelo, tintura y peinados. Barato.",
    keywords_ia_simulados: ["cortes", "peluquería"],
    subcategoria_esperada: "peluqueria",
  },
  // Sinónimos no exactos
  {
    id: "s-emp-1",
    nombre_emprendimiento: "Empanadas Caseras",
    descripcion_negocio: "Empanadas de horno. De pino y queso. Encargos.",
    keywords_usuario: ["empanadas", "pino"],
    subcategoria_esperada: "empanadas",
  },
  {
    id: "s-elec-1",
    nombre_emprendimiento: "Luz y Cable",
    descripcion_negocio: "Instalaciones eléctricas y reparación. Electricista con experiencia.",
    keywords_ia_simulados: ["electricista", "electricidad"],
    subcategoria_esperada: "electricista",
  },
  {
    id: "s-vet-1",
    nombre_emprendimiento: "Doctor para Mascotas",
    descripcion_negocio: "Atiendo perros y gatos. Vacunas y consultas. Veterinario.",
    keywords_ia_simulados: ["veterinario", "mascotas"],
    subcategoria_esperada: "veterinaria",
  },
  {
    id: "s-ferr-1",
    nombre_emprendimiento: "Todo para la Obra",
    descripcion_negocio: "Ferretería. Herramientas, pintura, lo que necesites para construir.",
    keywords_ia_simulados: ["ferretería", "herramientas"],
    subcategoria_esperada: "ferreteria",
  },
  // Combinaciones de varios servicios
  {
    id: "s-mix-1",
    nombre_emprendimiento: "Pan y Pasteles",
    descripcion_negocio: "Panadería y pastelería. Pan, tortas, queques, empanadas. Todo.",
    keywords_ia_simulados: ["pan", "pastelería", "tortas"],
    subcategoria_esperada: "panaderia",
  },
  {
    id: "s-mix-2",
    nombre_emprendimiento: "Plomería y Electricidad",
    descripcion_negocio: "Hacemos gasfitería y electricidad. Una sola llamada.",
    keywords_ia_simulados: ["gasfiter", "electricista"],
    subcategoria_esperada: "gasfiter",
  },
  {
    id: "s-mix-3",
    nombre_emprendimiento: "Pizza y Empanadas",
    descripcion_negocio: "Pizzas y empanadas. Delivery. Rápido.",
    keywords_ia_simulados: ["pizzas", "empanadas"],
    subcategoria_esperada: "pizzas",
  },
  // Descripciones por productos, no rubros formales
  {
    id: "s-prod-1",
    nombre_emprendimiento: "Kuchen y Brazo de Reina",
    descripcion_negocio: "Vendo kuchen, brazo de reina y tortas. Por encargo.",
    keywords_ia_simulados: ["tortas", "repostería"],
    subcategoria_esperada: "pasteleria",
  },
  {
    id: "s-prod-2",
    nombre_emprendimiento: "Hallullas y Dobladitas",
    descripcion_negocio: "Pan recién hecho. Hallullas, dobladitas, marraqueta.",
    keywords_ia_simulados: ["pan", "panadería"],
    subcategoria_esperada: "panaderia",
  },
  {
    id: "s-prod-3",
    nombre_emprendimiento: "Cazuela y Porotos",
    descripcion_negocio: "Comida casera. Cazuela, porotos, pastel de choclo. Llevamos.",
    keywords_ia_simulados: ["comida casera", "delivery"],
    subcategoria_esperada: "comida_casera",
  },
  {
    id: "s-prod-4",
    nombre_emprendimiento: "Corte y Barba",
    descripcion_negocio: "Corte de pelo y afeitada. Estilo barbería. Reserva tu hora.",
    keywords_ia_simulados: ["barbería", "corte"],
    subcategoria_esperada: "peluqueria",
  },
  // Incompletos o con ruido
  {
    id: "s-inc-1",
    nombre_emprendimiento: "Clases",
    descripcion_negocio: "Damos clases. Matemática, lenguaje. Niños y adultos.",
    keywords_ia_simulados: ["clases", "matemática"],
    subcategoria_esperada: "clases",
  },
  {
    id: "s-inc-2",
    nombre_emprendimiento: "Mudanzas",
    descripcion_negocio: "Mudanzas. Flete. Lo que sea. Cotiza.",
    keywords_ia_simulados: ["mudanza", "flete"],
    subcategoria_esperada: "fletes",
  },
  {
    id: "s-inc-3",
    nombre_emprendimiento: "Almuerzos",
    descripcion_negocio: "Almuerzos a domicilio. Rico y barato. Menú del día.",
    keywords_ia_simulados: ["almuerzos", "delivery", "comida casera"],
    subcategoria_esperada: "comida_casera",
  },
  // Más coloquial / informal
  {
    id: "s-col-1",
    nombre_emprendimiento: "La Pizzeria",
    descripcion_negocio: "Pizza a la piedra nomas. Con delivery. Buenas ofertas.",
    keywords_ia_simulados: ["pizza", "pizzas"],
    subcategoria_esperada: "pizzas",
  },
  {
    id: "s-col-2",
    nombre_emprendimiento: "Vulca y Mecánico",
    descripcion_negocio: "Vulca y mecánica general. Neumáticos y motor. Un solo lugar.",
    keywords_ia_simulados: ["vulcanización", "mecánico"],
    subcategoria_esperada: "vulcanizacion",
  },
  {
    id: "s-col-3",
    nombre_emprendimiento: "Refuerzo Escolar",
    descripcion_negocio: "Refuerzo pa los cabros. Matemáticas y lo que necesiten.",
    keywords_ia_simulados: ["refuerzo", "clases", "matemáticas"],
    subcategoria_esperada: "clases",
  },
  {
    id: "s-col-4",
    nombre_emprendimiento: "Mascotas",
    descripcion_negocio: "Atención pa perros y gatos. Vacunas y consultas. Veterinario.",
    keywords_ia_simulados: ["veterinario", "mascotas"],
    subcategoria_esperada: "veterinaria",
  },
  {
    id: "s-col-5",
    nombre_emprendimiento: "Fierros y Herramientas",
    descripcion_negocio: "Ferretería. Fierros, herramientas, pintura. Lo que falte pa la obra.",
    keywords_ia_simulados: ["ferretería", "herramientas"],
    subcategoria_esperada: "ferreteria",
  },
];
