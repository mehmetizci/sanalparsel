import GlassCard from './GlassCard'

interface ParcelInfoCardProps {
  projectName: string
  shortName: string
  properties: {
    Il?: string
    Ilce?: string
    Mahalle?: string
    Ada?: string
    ParselNo?: string
    Alan?: string
    Nitelik?: string
  }
}

export default function ParcelInfoCard({ projectName, shortName, properties }: ParcelInfoCardProps) {
  return (
    <div className="space-y-4">
      {/* Project name display */}
      <GlassCard>
        <h2 className="text-xl font-bold text-white">{projectName}</h2>
        <p className="text-gray-400 text-sm mt-1">{shortName}</p>
      </GlassCard>

      {/* Properties grid */}
      <GlassCard>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(properties).map(([key, value]) => (
            <div key={key} className="bg-white/5 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-1">
                {key === 'Il' ? 'İl' : 
                 key === 'Ilce' ? 'İlçe' :
                 key === 'Mahalle' ? 'Mahalle' :
                 key === 'Ada' ? 'Ada' :
                 key === 'ParselNo' ? 'Parsel' :
                 key === 'Alan' ? 'Alan' :
                 key === 'Nitelik' ? 'Nitelik' : key}
              </p>
              <p className="text-white font-medium">{value || '-'}</p>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  )
}