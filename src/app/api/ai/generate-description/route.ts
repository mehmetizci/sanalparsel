import { NextRequest, NextResponse } from "next/server";

const TONE_PROMPTS = {
  corporate: "Profesyonel, resmi ve güvenilir bir ton kullanın. Emlak sektöründe uzman bir danışman gibi konuşun.",
  investment: "Yatırım değeri ve finansal fırsatlara vurgu yapın. Kentsel dönüşüm ve gelecek potansiyeline dikkat çekin.",
  social: "Sosyal medya için enerjik, dikkat çekici ve kısa cümleler kullanın. Genç kitleye hitap edin.",
  short: "Özet ve etkili bilgi verin. En önemli noktaları vurgulayın.",
  premium: "Lüks segment için sofistike, zarif ve yüksek kaliteli bir dil kullanın.",
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tone, city, district, neighborhood, area, property_type, custom_note } = body;

    const apiKey = process.env.OPENROUTER_API_KEY;
    
    if (!apiKey) {
      const fallbackText = generateFallbackText(city, district, neighborhood, area, tone);
      return NextResponse.json({ text: fallbackText });
    }

    const tonePrompt = TONE_PROMPTS[tone as keyof typeof TONE_PROMPTS] || TONE_PROMPTS.corporate;
    
    const locationDesc = [neighborhood, district, city].filter(Boolean).join(", ");
    const areaDesc = area ? `${parseFloat(area).toLocaleString("tr-TR")} metrekare` : "";

    const prompt = `Sen Türk emlak sektöründe uzman bir AI asistanısın. Aşağıdaki bilgilere dayanarak tek parça halinde, dikkat çekici bir tanıtım metni oluştur:

Konum: ${locationDesc}
Alan: ${areaDesc}
Mülk Tipi: ${property_type || "Parsel"}
${custom_note ? `Özel Not: ${custom_note}` : ""}

Kurallar:
- ${tonePrompt}
- Maksimum 200 kelime kullan
- Seslendirme için optimize et (düzgün telaffuz)
- Türkçe yanıt ver
- Abartılı vaatlerden kaçın
- Yatırım tavsiyesi gibi kesin ifadeler kullanma
- Sadece bilgi ver, satış vaadi yapma

Metin:`;

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
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    
    if (data.choices && data.choices[0]?.message?.content) {
      return NextResponse.json({ text: data.choices[0].message.content.trim() });
    }

    const fallbackText = generateFallbackText(city, district, neighborhood, area, tone);
    return NextResponse.json({ text: fallbackText });
  } catch (error) {
    console.error("AI generation error:", error);
    const fallbackText = generateFallbackText("", "", "", "", "corporate");
    return NextResponse.json({ text: fallbackText });
  }
}

function generateFallbackText(
  city: string,
  district: string,
  neighborhood: string,
  area: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _tone: string
): string {
  const location = [neighborhood, district, city].filter(Boolean).join(" ");
  const areaDesc = area ? `${parseFloat(area).toLocaleString("tr-TR")} metrekare` : "";

  const baseText = `${location ? location + " bölgesinde" : "Bu"} yer alan parsel${areaDesc ? `, ${areaDesc} alanıyla` : ""} dikkat çekici bir yatırım fırsatı sunmaktadır.`;

  return baseText + " Detaylı bilgi için emlak danışmanınızla iletişime geçin.";
}