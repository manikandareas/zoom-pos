import { CatalogManager } from "@/components/admin/catalog-manager";
import { listCategories, listMenuItems } from "@/lib/data/catalog-admin";

export const metadata = {
  title: "Catalog - Hotel Zoom",
};

export default async function AdminCatalogPage() {
  const [categories, menuItems] = await Promise.all([
    listCategories(),
    listMenuItems(),
  ]);

  return <CatalogManager categories={categories} menuItems={menuItems} />;
}
