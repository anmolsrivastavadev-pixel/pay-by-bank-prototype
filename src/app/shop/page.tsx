import { shopName } from "@/lib/config";
import ShopTill from "./shop-till";

export default function ShopPage() {
  return <ShopTill shopName={shopName()} />;
}
