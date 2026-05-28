"use client";

interface CreditPackageCardProps {
  pkg: {
    id: string;
    name: string;
    videos: number;
    price: number;
  };
  onSelect: (pkg: { id: string; name: string; videos: number; price: number }) => void;
  recommended?: boolean;
}

export default function CreditPackageCard({ pkg, onSelect, recommended }: CreditPackageCardProps) {
  return (
    <div
      onClick={() => onSelect(pkg)}
      className={`glass rounded-2xl p-6 cursor-pointer transition-all duration-200 ${
        recommended
          ? "border-primary border-2 relative overflow-hidden"
          : "border-white/10 hover:border-white/20 hover:scale-[1.02]"
      }`}
    >
      {recommended && (
        <div className="absolute top-0 right-0 bg-primary text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
          Popüler
        </div>
      )}
      <div className="text-center">
        <h3 className="text-white font-bold text-xl mb-2">{pkg.name}</h3>
        <p className="text-4xl font-bold gradient-text mb-1">{pkg.videos} Video</p>
        <p className="text-muted text-sm mb-4">
          {pkg.price.toLocaleString("tr-TR")} TL
        </p>
        <p className="text-muted text-sm">
          Video başı {Math.round(pkg.price / pkg.videos)} TL
        </p>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSelect(pkg);
        }}
        className={`w-full mt-6 py-3 rounded-xl font-semibold transition-all ${
          recommended
            ? "bg-gradient-to-r from-primary to-blue-600 text-white hover:from-blue-600 hover:to-primary"
            : "bg-card text-white border border-white/10 hover:border-white/20"
        }`}
      >
        Satın Al
      </button>
    </div>
  );
}