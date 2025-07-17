import { BannerCarousel } from "@/components/BannerCarousel";

export default function Dashboard() {
  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-bold text-bakery-brown mb-6">Bem-vindo à Bread Byte Bakehouse</h1>
      <BannerCarousel />
    </div>
  );
}
