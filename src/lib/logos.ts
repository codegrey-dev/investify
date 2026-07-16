import AAPL from "@/assets/logos/AAPL.webp";
import TSLA from "@/assets/logos/TSLA.webp";
import NVDA from "@/assets/logos/NVDA.webp";
import MSFT from "@/assets/logos/MSFT.webp";
import BTC from "@/assets/logos/BTC.webp";
import NIKE from "@/assets/logos/NIKE.webp";
import SHOP from "@/assets/logos/SHOP.webp";
import ABNB from "@/assets/logos/ABNB.webp";
import STRP from "@/assets/logos/STRP.webp";
import MTN from "@/assets/logos/mtn-logo.webp";
import Telecel from "@/assets/logos/telecel.jpg";
import AirtelTigo from "@/assets/logos/AirtelTigo.jpg";

const map: Record<string, string> = {
  AAPL,
  TSLA,
  NVDA,
  MSFT,
  BTC,
  NIKE,
  SHOP,
  ABNB,
  STRP,
};

export function tickerLogo(ticker: string): string | undefined {
  return map[ticker.toUpperCase()];
}

export function networkLogo(network: string): string | undefined {
  const netMap: Record<string, string> = {
    MTN,
    TELECEL: Telecel,
    AIRTELTIGO: AirtelTigo,
  };
  return netMap[network.toUpperCase()];
}
