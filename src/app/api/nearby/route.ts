import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { lat, lng } = await request.json();

    if (!lat || !lng) {
      return NextResponse.json(
        { error: 'Koordinatlar gerekli' },
        { status: 400 }
      );
    }

    const places = generateNearbyPlaces(lat, lng);

    return NextResponse.json({ places });
  } catch {
    return NextResponse.json(
      { error: 'İstek işlenemedi' },
      { status: 500 }
    );
  }
}

function generateNearbyPlaces(_lat: number, _lng: number) {
  const placeTemplates = [
    { name: 'Devlet Hastanesi', type: 'hospital', icon: '🏥', minDist: 1, maxDist: 5 },
    { name: 'İlköğretim Okulu', type: 'school', icon: '🏫', minDist: 0.5, maxDist: 3 },
    { name: 'Migros Market', type: 'supermarket', icon: '🛒', minDist: 0.3, maxDist: 2 },
    { name: 'Sahil', type: 'beach', icon: '🏖️', minDist: 1, maxDist: 10 },
    { name: 'Şehir Merkezi', type: 'city_center', icon: '🏙️', minDist: 2, maxDist: 8 },
    { name: 'AVM', type: 'shopping_mall', icon: '🏬', minDist: 1, maxDist: 6 },
    { name: 'Otoyol Bağlantısı', type: 'highway', icon: '🛣️', minDist: 0.5, maxDist: 4 },
  ];

  const shuffled = placeTemplates.sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 5);

  return selected.map((place) => {
    const dist =
      place.minDist + Math.random() * (place.maxDist - place.minDist);
    const rounded = Math.round(dist * 10) / 10;
    const isMeters = rounded < 1;

    return {
      name: place.name,
      type: place.type,
      distance: isMeters ? Math.round(rounded * 1000) : rounded,
      unit: isMeters ? 'm' : 'km',
      icon: place.icon,
    };
  });
}
