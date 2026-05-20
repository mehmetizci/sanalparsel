const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1';

export interface NarrationRequest {
  parcelName: string;
  description?: string;
  nearbyPlaces: Array<{
    name: string;
    type: string;
    distance: number;
  }>;
  language?: string;
}

export interface NarrationResponse {
  text: string;
  fullDescription: string;
  investmentAnalysis: string;
}

const PLACE_TYPES = [
  'hospital',
  'school',
  'market',
  'highway',
  'beach',
  'shopping mall',
  'city center',
] as const;

function formatNearbyPlaces(places: NarrationRequest['nearbyPlaces']): string {
  if (places.length === 0) return 'Çevrede sosyal tesisler bulunmaktadır.';
  
  const formatted = places
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 5)
    .map((p) => `${p.name} (${p.type}, ${p.distance.toFixed(1)} km)`)
    .join(', ');
  
  return formatted;
}

export async function generateNarration(
  request: NarrationRequest
): Promise<NarrationResponse> {
  const nearbyInfo = formatNearbyPlaces(request.nearbyPlaces);
  
  const systemPrompt = `Sen Türk gayrimenkul sektöründe uzmanlaşmış bir yapay zeka danışmanlısın. 
Görevin, gayrimenkul parselleri için profesyonel, sinematik ve yatırım odaklı anlatım metinleri oluşturmaktır.

KURALLAR:
1. Türkçe yaz
2. Yatırım odaklı, Premium ton kullan
3. Sinematik ve profesyonel anlatım tarzı tuttur
4. Kısa ve etkili cümleler kur
5. Çevre bilgilerini doğal şekilde dahil et
6. coğrafi konum avantajlarını vurgula

Yakın yerler bilgisi: ${nearbyInfo}`;

  const userPrompt = request.description
    ? `Parsel: ${request.parcelName}\nMevcut açıklama: ${request.description}`
    : `${request.parcelName} konumlu parsel için profesyonel bir gayrimenkul tanıtım metni oluştur. Konum: ${nearbyInfo}`;

  try {
    const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('No API key configured');
    }

    const response = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'SanalParsel',
      },
      body: JSON.stringify({
        model: 'qwen/qwen-2.5-72b-instruct',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    return {
      text: content,
      fullDescription: content,
      investmentAnalysis: content,
    };
  } catch (error) {
    console.error('OpenRouter API Error:', error);
    
    const fallbackText = `${request.parcelName} konumunda yer alan bu özel parsel, ${nearbyInfo} yakınlığı ile yatırımcılar için benzersiz fırsatlar sunmaktadır.`;
    
    return {
      text: fallbackText,
      fullDescription: fallbackText,
      investmentAnalysis: fallbackText,
    };
  }
}

export async function generateInvestmentAnalysis(
  parcelName: string,
  location: string,
  nearbyPlaces: NarrationRequest['nearbyPlaces']
): Promise<string> {
  const nearbyInfo = formatNearbyPlaces(nearbyPlaces);
  
  const systemPrompt = `Sen Türk gayrimenkul yatırım analistisin. 
Görevin, gayrimenkul parselleri için kısa ve etkili yatırım analizi metinleri oluşturmaktır.`;

  const userPrompt = `${parcelName} (${location}) konumlu parsel için yatırım analizi yap. Yakın yerler: ${nearbyInfo}`;

  try {
    const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return `Bu parsel, ${nearbyInfo} yakınlığı ile yatırım değeri yüksek bir lokasyonda bulunmaktadır.`;
    }

    const response = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'SanalParsel',
      },
      body: JSON.stringify({
        model: 'qwen/qwen-2.5-72b-instruct',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 300,
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      return `Bu parsel, ${nearbyInfo} yakınlığı ile yatırım değeri yüksek bir lokasyonda bulunmaktadır.`;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (error) {
    console.error('OpenRouter API Error:', error);
    return `Bu parsel, ${nearbyInfo} yakınlığı ile yatırım değeri yüksek bir lokasyonda bulunmaktadır.`;
  }
}

export { PLACE_TYPES };