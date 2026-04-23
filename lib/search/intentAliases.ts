export type IntentDef = {
  finalQuery: string;
  sectorSlug: string;
  aliases: string[];
};

export const INTENT_ALIASES: Record<string, IntentDef> = {
  gasfiter: {
    finalQuery: "gasfiter",
    sectorSlug: "hogar_construccion",
    aliases: [
      "gasfiter",
      "gafiter",
      "gasfitero",
      "filtracion",
      "fuga de agua",
      "llave rota",
      "calefont",
      "destape",
      "destapes",
      "se me tapo el baño",
      "se tapo el baño",
      "baño tapado",
      "cañeria tapada",
      "ducha tapada",
    ],
  },

  electricista: {
    finalQuery: "electricista",
    sectorSlug: "hogar_construccion",
    aliases: [
      "electricista",
      "corte electrico",
      "salto el automatico",
      "enchufe malo",
      "problema electrico",
      "tablero electrico",
      "se corto la luz",
    ],
  },

  fletes: {
    finalQuery: "fletes",
    sectorSlug: "transporte_fletes",
    aliases: [
      "flete",
      "fletes",
      "mudanza",
      "mudanzas",
      "traslado",
      "llevar muebles",
      "camion para mudanza",
      "camion de mudanza",
    ],
  },

  reparto_paqueteria: {
    finalQuery: "fletes",
    sectorSlug: "transporte_fletes",
    aliases: [
      "reparto paqueteria",
      "reparto de paqueteria",
      "reparto paquetería",
      "reparto de paquetería",
      "envio paquetes",
      "envío paquetes",
      "envio de paquetes",
      "envío de paquetes",
      "envio encomiendas",
      "envío encomiendas",
      "mensajeria",
      "mensajería",
      "repartidor",
      "servicio de reparto",
      "reparto express",
      "delivery paquetes",
      "traslado de paqueteria",
      "traslado de paquetería",
    ],
  },

  peluqueria: {
    finalQuery: "peluqueria",
    sectorSlug: "belleza_estetica",
    aliases: [
      "peluqueria",
      "peluquería",
      "pelukeria",
      "corte de pelo",
      "barberia",
      "barbería",
    ],
  },

  veterinaria: {
    finalQuery: "veterinaria",
    sectorSlug: "mascotas",
    aliases: [
      "veterinaria",
      "veterinario",
      "mi perro esta mal",
      "mi gato esta mal",
      "vacuna perro",
      "vacuna gato",
    ],
  },

  mecanico: {
    finalQuery: "mecanico",
    sectorSlug: "automotriz",
    aliases: [
      "mecanico",
      "mecánico",
      "taller mecanico",
      "taller mecánico",
      "ajuste de frenos",
      "cambio de aceite",
      "alineacion",
      "mantencion auto",
      "revision tecnica",
    ],
  },

  panaderia: {
    finalQuery: "panaderia",
    sectorSlug: "alimentacion",
    aliases: [
      "panaderia",
      "panadería",
      "pan amasado",
      "hallullas",
      "marraquetas",
      "empanadas",
    ],
  },

  pasteleria: {
    finalQuery: "pasteleria",
    sectorSlug: "alimentacion",
    aliases: [
      "pasteleria",
      "pastelería",
      "reposteria",
      "repostería",
      "tortas",
      "queques",
      "kuchen",
      "cupcakes",
      "postres",
    ],
  },
};
