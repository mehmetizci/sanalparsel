interface StepHeaderProps {
  title: string
  description?: string
  step?: number
  totalSteps?: number
}

export default function StepHeader({ title, description, step, totalSteps }: StepHeaderProps) {
  return (
    <div className="mb-6">
      {step && totalSteps && (
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
          <span>Adım {step}/{totalSteps}</span>
        </div>
      )}
      <h1 className="text-2xl font-bold text-white">{title}</h1>
      {description && (
        <p className="text-gray-400 mt-1">{description}</p>
      )}
    </div>
  )
}