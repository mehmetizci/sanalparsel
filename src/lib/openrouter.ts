const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1';

export interface NarrationRequest {
  parcelName: string;
  description?: string;
  nearbyPlaces: Array<{
    name: string;
    type: string;
    distance: number;
  }>;
}

export interface NarrationResponse {
  text: string;
  fullDescription: string;
  investmentAnalysis: string;
}

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
5. Çevre bilgilerini doğal şekilde dahil et`;

  const userPrompt = request.description
    ? `Parsel: ${request.parcelName}\nAçıklama: ${request.description}`
    : `${request.parcelName} konumlu parsel için profesyonel bir gayrimenkul tanıtım metni oluştur.`;

  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    
    if (!apiKey) {
      throw new Error('No API key configured');
    }

    const response = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
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
    
    return {
      text: `${request.parcelName} konumunda yer alan bu özel parsel, ${nearbyInfo} yakınlığı ile yatırımcılar için benzersiz fırsatlar sunmaktadır.`,
      fullDescription: `${request.parcelName} konumunda yer alan bu özel parsel, ${nearbyInfo} yakınlığı ile yatırımcılar için benzersiz fırsatlar sunmaktadır.`,
      investmentAnalysis: `${request.parcelName} konumunda yer alan bu özel parsel, ${nearbyInfo} yakınlığı ile yatırımcılar için benzersiz fırsatlar sunmaktadır.`,
    };
  }
}