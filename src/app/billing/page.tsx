'use client'

import { AppShell, StepHeader, ProgressBar } from '@/components/layout'
import { GlassCard, PrimaryButton } from '@/components/mobile'

const packages = [
  { credits: 5, price: 99, label: 'Starter', color: '#2563EB' },
  { credits: 12, price: 179, label: 'Pro', color: '#7C3AED', popular: true },
  { credits: 30, price: 349, label: 'Business', color: '#22C55E' },
]

export default function BillingPage() {
  return (
    <AppShell title="Krediler">
      <StepHeader 
        title="Kredi Paketleri" 
        description="İhtiyacınıza uygun paketi seçin"
      />

      <div className="space-y-4 mb-6">
        {/* Current balance */}
        <GlassCard className="text-center">
          <p className="text-gray-400 text-sm">Mevcut Kredi</p>
          <p className="text-4xl font-bold text-white mt-2">8</p>
          <p className="text-gray-400 text-sm mt-1">video</p>
        </GlassCard>

        {/* Packages */}
        {packages.map((pkg) => (
          <GlassCard 
            key={pkg.label}
            className={`cursor-pointer hover:bg-[#143660] transition-colors ${
              pkg.popular ? 'border-[#7C3AED]' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${pkg.color}20` }}
                >
                  <span className="text-xl">💎</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{pkg.label}</span>
                    {pkg.popular && (
                      <span className="text-xs bg-[#7C3AED] text-white px-2 py-0.5 rounded-full">
                        Popüler
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm">{pkg.credits} video kredisi</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-white">₺{pkg.price}</p>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* CTA */}
      <PrimaryButton className="w-full">
        Paket Satın Al
      </PrimaryButton>
    </AppShell>
  )
}