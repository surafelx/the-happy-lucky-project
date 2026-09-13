import { Hero } from "@/components/home/Hero";
import { Doors } from "@/components/home/Doors";
import { PillarsSection } from "@/components/home/PillarsSection";
import { Mission } from "@/components/home/Mission";
import { CampaignPreview } from "@/components/home/CampaignPreview";
import { ShopPreview } from "@/components/home/ShopPreview";
import { SundayStrip } from "@/components/home/SundayStrip";
import { Tasters } from "@/components/home/Tasters";
import { Ticker } from "@/components/Ticker";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Ticker
        items={[
          "Sundays",
          "Studios",
          "School fees",
          "Laptops",
          "One library",
          "Showcase nights",
          "Small coins",
          "Big luck",
        ]}
      />
      <Doors />
      <PillarsSection />
      <Mission />
      <CampaignPreview />
      <ShopPreview />
      <SundayStrip />
      <Tasters />
    </>
  );
}