import { NextRequest, NextResponse } from "next/server";

const TONE_PROMPTS: Record<string, { instruction: string; style: string; focus: string }> = {
  corporate: {
    instruction: "Profesyonel, resmi ve güvenilir bir ton kullanın. Emlak sektöründe uzman bir danışman gibi konuşun.",
    style: "Rahat ve profesyonel, güven veren",
    focus: "Konum avantajları, altyapı, yaşam kalitesi",
  },
  investment: {
    instruction: "Yatırım değeri ve finansal fırsatlara vurgu yapın. Kentsel dönüşüm ve gelecek potansiyeline dikkat çekin. Kesin kazanç vaadinde bulunmayın.",
    style: "Analitik ve gelecek odaklı, güven veren",
    focus: "Bölge potansiyeli, ulaşım projeleri, değer artış beklentisi",
  },
  social: {
    instruction: "Sosyal medya için enerjik, dikkat çekici ve kısa cümleler kullanın. Genç kitleye hitap edin. Reels/TikTok formatına uygun olsun.",
    style: "Enerjik ama ciddi, dikkat çekici",
    focus: "Hızla dikkat çeken özellikler, sosyal medya uygunluğu",
  },
  short: {
    instruction: "Çok özet ve etkili bilgi verin. En önemli noktaları vurgulayın. 60-90 kelime arasında tutun.",
    style: "Net, hızlı ve öz",
    focus: "Temel bilgiler, hızlı seslendirme",
  },
  premium: {
    instruction: "Lüks segment için sofistike, zarif ve yüksek kaliteli bir dil kullanın. Prestijli bir yaşam tarzı vurgulayın.",
    style: "Sofistike, lüks ve prestijli",
    focus: "Lüks yaşam, prestij, üst segment avantajlar",
  },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      tone, 
      city, 
      district, 
      neighborhood, 
      area, 
      property_type, 
      custom_note,
      nearbyPlaces = [],
      videoDuration = 30,
      cameraModes = [],
    } = body;

    const apiKey = process.env.OPENROUTER_API_KEY;
    
    if (!apiKey) {
      const fallbackText = generateFallbackText(city, district, neighborhood, area, tone, nearbyPlaces);
      return NextResponse.json({ text: fallbackText });
    }

    const toneConfig = TONE_PROMPTS[tone as keyof typeof TONE_PROMPTS] || TONE_PROMPTS.corporate;
    
    // Format location
    const locationDesc = [neighborhood, district, city].filter(Boolean).join(", ");
    
    // Format area
    const areaNum = parseFloat(area) || 0;
    const areaDesc = areaNum > 0 ? `${areaNum.toLocaleString("tr-TR")} metrekare` : "";
    
    // Format nearby places
    const selectedPOIs = nearbyPlaces.filter((p: { selected?: boolean }) => p.selected).slice(0, 5);
    const poiList = selectedPOIs.length > 0 
      ? `Yakın Çevre: ${selectedPOIs.map((p: { name: string; distanceText: string; category: string }) => `${p.name} (${p.distanceText})`).join(", ")}`
      : "";
    
    // Format camera modes
    const cameraModeLabels: Record<string, string> = {
      orbit_360: "360° Dönüş",
      spiral_descent: "Spiral İniş",
      top_view: "Tepe Görünüm",
      low_fly: "Alçak Geçiş",
      four_corners: "4 Köşe Turu",
    };
    const cameraDesc = cameraModes.length > 0 
      ? `Video Süresi: ${videoDuration} saniye | Kamera Modları: ${cameraModes.map((m: string) => cameraModeLabels[m] || m).join(", ")}`
      : `Video Süresi: ${videoDuration} saniye`;

    // Word limit based on mode
    const wordLimits: Record<string, number> = {
      corporate: 150,
      investment: 180,
      social: 80,
      short: 90,
      premium: 140,
    };
    const maxWords = wordLimits[tone] || 150;

    const prompt = `Sen Türk emlak sektöründe uzman bir AI asistanısın. Aşağıdaki bilgilere dayanarak tek parça halinde, akıcı bir tanıtım metni oluştur:

📍 KONUM BİLGİSİ
${locationDesc || "Belirtilmedi"}

📐 ALAN
${areaDesc || "Belirtilmedi"}

🏠 MÜLK TİPİ
${property_type || "Parsel"}

${poiList ? `🗺️ YAKIN ÇEVRE\n${poiList}\n` : ""}
🎬 VİDEO AYARLARI
${cameraDesc}

${custom_note ? `📝 ÖZEL NOT\n${custom_note}\n` : ""}
━━━━━━━━━━━━━━━━━━━━━━
TARZ: ${toneConfig.style}
ODAK: ${toneConfig.focus}
━━━━━━━━━━━━━━━━━━━━━━

Kurallar:
- ${toneConfig.instruction}
- Maksimum ${maxWords} kelime kullan
- Seslendirme için optimize et (düzgün telaffuz, doğal duraklar)
- Türkçe yanıt ver
- Abartılı vaatlerden kaçın
- Kesin kazanç vaadinde bulunma
- Sadece bilgi ver, yatırım tavsiyesi yapma
- Metin ${maxWords} kelimeyi geçmesin

Tanıtım Metni:`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "anthropic/claude-3-haiku",
        messages: [
          { role: "system", content: "Sen Türk emlak sektöründe uzman bir AI asistanısın. Kısa, etkili ve profesyonel tanıtım metinleri oluştur." },
          { role: "user", content: prompt },
        ],
        max_tokens: 600,
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    
    if (data.choices && data.choices[0]?.message?.content) {
      return NextResponse.json({ text: data.choices[0].message.content.trim() });
    }

    const fallbackText = generateFallbackText(city, district, neighborhood, area, tone, nearbyPlaces);
    return NextResponse.json({ text: fallbackText });
  } catch (error) {
    console.error("AI generation error:", error);
    const fallbackText = generateFallbackText("", "", "", "", "corporate", []);
    return NextResponse.json({ text: fallbackText });
  }
}

function generateFallbackText(
  city: string,
  district: string,
  neighborhood: string,
  area: string,
  _tone: string,
  nearbyPlaces: { name?: string; distanceText?: string; selected?: boolean }[] = []
): string {
  const location = [neighborhood, district, city].filter(Boolean).join(" ");
  const areaNum = parseFloat(area) || 0;
  const areaDesc = areaNum > 0 ? `${areaNum.toLocaleString("tr-TR")} metrekare` : "";

  let baseText = `${location ? location + " bölgesinde" : "Bu"} yer alan parsel${areaDesc ? `, ${areaDesc} alanıyla` : ""} dikkat çekici bir yatırım fırsatı sunmaktadır.`;
  
  // Add nearby places info if available
  const selectedPOIs = nearbyPlaces.filter(p => p.selected).slice(0, 3);
  if (selectedPOIs.length > 0) {
    const poiNames = selectedPOIs.map(p => p.name).filter(Boolean).join(", ");
    baseText += ` Yakın çevresinde ${poiNames} gibi önemli noktalar bulunmaktadır.`;
  }

  return baseText + " Detaylı bilgi için emlak danışmanınızla iletişime geçin.";
}