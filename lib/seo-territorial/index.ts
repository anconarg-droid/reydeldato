export {
  getBaseUrl,
  buildCanonical,
  getRobotsForTerritorialPage,
  buildMetadataComuna,
  buildMetadataSegment,
} from "./metadata";
export type { RobotsOption } from "./metadata";

export {
  getComunaBySlug,
  getSubcategoriaBySlug,
  getCategoriaBySlug,
  resolveSegment,
} from "./data";
export type { ComunaRow, CategoriaRow, SubcategoriaRow, ResolvedSegment } from "./data";
