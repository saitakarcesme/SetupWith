import professionalCatalogOne from "./professional-catalog-1.json" with { type: "json" };
import professionalCatalogTwo from "./professional-catalog-2.json" with { type: "json" };
import professionalCatalogThree from "./professional-catalog-3.json" with { type: "json" };

const professionalCatalog = [
  ...professionalCatalogOne,
  ...professionalCatalogTwo,
  ...professionalCatalogThree,
];

export default professionalCatalog;
