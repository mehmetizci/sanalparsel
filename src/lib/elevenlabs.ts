const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel - Premium female voice

interface ElevenLabsConfig {
  apiKey: string;
  voiceId?: string;
}

interface TextToSpeechRequest {
  text: string;
  voiceId?: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
}

interface AudioResponse {
  audioUrl?: string;
  audioBase64?: string;
  duration: number;
}

const DEFAULT_VOICES = [
  {
    id: '21m00Tcm4TlvDq8ikWAM',
    name: 'Rachel',
    gender: 'female',
    description: 'Türkçe için optimize edilmiş, premium kadın sesi',
  },
  {
    id: 'CJqr7Z8o3qIUo3cFQomo',
    name: 'Aris',
    gender: 'male',
    description: 'Türkçe için optimize edilmiş, premium erkek sesi',
  },
  {
    id: 'N2lCVl8o3qIUo3cFQomo',
    name: 'Emre',
    gender: 'male',
    description: 'Genç, dinamik erkek sesi',
  },
  {
    id: 'r3HZ7Z8o3qIUo3cFQomo',
    name: 'Zeynep',
    gender: 'female',
    description: 'Sıcak, premium kadın sesi',
  },
];

export class ElevenLabsService {
  private apiKey: string;
  private voiceId: string;

  constructor(config: ElevenLabsConfig) {
    this.apiKey = config.apiKey;
    this.voiceId = config.voiceId || DEFAULT_VOICE_ID;
  }

  async textToSpeech(request: TextToSpeechRequest): Promise<AudioResponse> {
    const voiceId = request.voiceId || this.voiceId;
    const modelId = request.modelId || 'eleven_multilingual_v2';

    try {
      const response = await fetch(
        `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': this.apiKey,
          },
          body: JSON.stringify({
            text: request.text,
            model_id: modelId,
            voice_settings: {
              stability: request.stability ?? 0.5,
              similarity_boost: request.similarityBoost ?? 0.75,
              style: request.style ?? 0.3,
              use_speaker_boost: request.useSpeakerBoost ?? true,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`ElevenLabs API Error: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString('base64');

      return {
        audioBase64: base64,
        duration: base64.length / 16000,
      };
    } catch (error) {
      console.error('ElevenLabs TTS Error:', error);
      throw error;
    }
  }

  static getDefaultVoices() {
    return DEFAULT_VOICES;
  }
}

export function createElevenLabsService(): ElevenLabsService {
  const apiKey = process.env.ELEVENLABS_API_KEY || '';
  
  if (!apiKey) {
    console.warn('ELEVENLABS_API_KEY not configured');
  }

  return new ElevenLabsService({
    apiKey,
    voiceId: process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID,
  });
}

export const TURKISH_VOICES = DEFAULT_VOICES;