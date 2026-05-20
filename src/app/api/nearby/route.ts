import { NextRequest, NextResponse } from 'next/server';

interface NearbyPlace {
  name: string;
  type: string;
  distance: number;
  unit: string;
}

const TYPE_CONFIG: Record<string, { keywords: string[]; label: string }> = {
  hospital: { keywords: ['hastane', 'hospital', 'sağlık', 'tıp'], label: 'Hastane' },
  school: { keywords: ['okul', 'school', 'üniversite', 'üniversity'], label: 'Okul' },
  market: { keywords: ['market', 'a101', 'bim', 'şok', 'migros'], label: 'Market' },
  highway: { keywords: ['otoyol', 'highway', 'd020', 'd300'], label: 'Otoyol' },
  beach: { keywords: ['plaj', 'beach', 'deniz', 'sahil'], label: 'Plaj' },
  'shopping mall': { keywords: ['avm', 'mall', 'alışveriş', 'shopping'], label: 'AVM' },
  'city center': { keywords: ['merkez', 'center', 'şehir', 'city'], label: 'Merkez' },
};

const generateMockPlaces = (lat: number, lng: number): NearbyPlace[] => {
  const types = Object.keys(TYPE_CONFIG);
  const places: NearbyPlace[] = [];

  for (let i = 0; i < 5; i++) {
    const type = types[i % types.length];
    const distance = 0.5 + Math.random() * 3;
    
    places.push({
      name: `${TYPE_CONFIG[type].label} ${i + 1}`,
      type,
      distance: Math.round(distance * 10) / 10,
      unit: 'km',
    });
  }

  return places.sort((a, b) => a.distance - b.distance);
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  if (!lat || !lng) {
    return NextResponse.json(
      { error: 'lat and lng parameters required' },
      { status: 400 }
    );
  }

  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);

  if (isNaN(latitude) || isNaN(longitude)) {
    return NextResponse.json(
      { error: 'Invalid coordinates' },
      { status: 400 }
    );
  }

  const places = generateMockPlaces(latitude, longitude);

  return NextResponse.json({ places });
}