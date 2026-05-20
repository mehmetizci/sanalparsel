const ELEVENLABS_URL = 'https://api.elevenlabs.io/v1';

export interface Voice {
  id: string;
  name: string;
  category: string;
  description: string;
}

export interface VoicesResponse {
  voices: Voice[];
}

const DEFAULT_VOICES: Voice[] = [
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', category: 'professional', description: 'Genç kadın, profesyonel' },
  { id: 'AZnzlk1XWvJpzmDeyGkG', name: 'Sam', category: 'professional', description: 'Yetişkin erkek, profesyonel' },
  { id: '_EXwoCqP6dJMVL1fENcA', name: 'Anna', category: 'professional', description: 'Yetişkin kadın, profesyonel' },
];

export async function getVoices(): Promise<Voice[]> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  
  if (!apiKey) {
    return DEFAULT_VOICES;
  }

  try {
    const response = await fetch(`${ELEVENLABS_URL}/voices`, {
      headers: {
        'xi-api-key': apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    const data: VoicesResponse = await response.json();
    return data.voices.slice(0, 10);
  } catch (error) {
    console.error('ElevenLabs API Error:', error);
    return DEFAULT_VOICES;
  }
}

export interface TTSRequest {
  text: string;
  voiceId?: string;
  modelId?: string;
}

export async function generateSpeech(request: TTSRequest): Promise<ArrayBuffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  
  if (!apiKey) {
    throw new Error('No API key configured');
  }

  const voiceId = request.voiceId || DEFAULT_VOICES[0].id;
  const modelId = request.modelId || 'eleven_multilingual_v2';

  try {
    const response = await fetch(
      `${ELEVENLABS_URL}/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text: request.text,
          model_id: modelId,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    const audioData = await response.arrayBuffer();
    return audioData;
  } catch (error) {
    console.error('ElevenLabs TTS Error:', error);
    throw error;
  }
}