'use client';

import { useState, useCallback, useRef } from 'react';
import { 
  Composition, 
  Folder, 
  useVideoConfig, 
  useCurrentFrame,
  interpolate,
  spring,
  Extrapolate,
  Audio,
  Img,
  Sequence,
} from '@remotion/client';

interface RemotionVideoCompositionProps {
  parcelName: string;
  description?: string;
  narrationText?: string;
  consultantProfile: {
    fullName?: string;
    phone?: string;
    officeName?: string;
    officeAddress?: string;
    certificateNumber?: string;
    profilePhotoUrl?: string;
    companyLogoUrl?: string;
  };
  brandingOptions: {
    showProfilePhoto: boolean;
    showFullName: boolean;
    showPhoneNumber: boolean;
    showCompanyName: boolean;
    showOfficeAddress: boolean;
    showAuthorizationCertificate: boolean;
    showLogo: boolean;
  };
  nearbyPlaces: Array<{
    name: string;
    type: string;
    distance: number;
    unit: string;
  }>;
  mapImageUrl?: string;
  duration?: 30 | 45 | 60;
}

const RESOLUTION = {
  width: 1080,
  height: 1920,
  fps: 30,
};

const BACKGROUND = '#0a0a0a';

function ConsultantOverlay({ 
  profile, 
  brandingOptions,
  frame 
}: { 
  profile: RemotionVideoCompositionProps['consultantProfile'];
  brandingOptions: RemotionVideoCompositionProps['brandingOptions'];
  frame: number;
}) {
  const opacity = interpolate(
    frame,
    [60, 90],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  const translateX = interpolate(
    frame,
    [60, 90],
    [-100, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <div style={{
      position: 'absolute',
      bottom: 80,
      left: 40,
      right: 40,
      padding: 24,
      backgroundColor: 'rgba(17, 17, 17, 0.85)',
      borderRadius: 20,
      border: '1px solid rgba(255, 255, 255, 0.12)',
      backdropFilter: 'blur(30px)',
      opacity,
      transform: `translateX(${translateX}px)`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {brandingOptions.showProfilePhoto && profile.profilePhotoUrl && (
          <img
            src={profile.profilePhotoUrl}
            alt={profile.fullName}
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              objectFit: 'cover',
              border: '2px solid rgba(239, 68, 68, 0.3)',
            }}
          />
        )}
        <div style={{ flex: 1 }}>
          {brandingOptions.showFullName && (
            <p style={{ 
              fontSize: 18, 
              fontWeight: 700, 
              color: 'white',
              margin: 0,
            }}>
              {profile.fullName}
            </p>
          )}
          {brandingOptions.showCompanyName && profile.officeName && (
            <p style={{ 
              fontSize: 14, 
              color: '#888',
              margin: '4px 0 0',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}>
              📍 {profile.officeName}
            </p>
          )}
        </div>
        {brandingOptions.showLogo && profile.companyLogoUrl && (
          <img
            src={profile.companyLogoUrl}
            alt="Logo"
            style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'contain' }}
          />
        )}
      </div>
      <div style={{ 
        marginTop: 16, 
        paddingTop: 16, 
        borderTop: '1px solid rgba(255,255,255,0.1)',
      }}>
        {brandingOptions.showPhoneNumber && profile.phone && (
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', margin: 0 }}>
            📞 {profile.phone}
          </p>
        )}
        {brandingOptions.showOfficeAddress && profile.officeAddress && (
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', margin: '4px 0 0' }}>
            {profile.officeAddress}
          </p>
        )}
        {brandingOptions.showAuthorizationCertificate && profile.certificateNumber && (
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', margin: '4px 0 0' }}>
            Yetki No: {profile.certificateNumber}
          </p>
        )}
      </div>
    </div>
  );
}

function NearbyPlacesOverlay({ 
  places, 
  frame 
}: { 
  places: RemotionVideoCompositionProps['nearbyPlaces'];
  frame: number;
}) {
  const placeElements = places.slice(0, 5);
  
  const typeLabels: Record<string, string> = {
    hospital: 'Hastane',
    school: 'Okul',
    market: 'Market',
    highway: 'Otoyol',
    beach: 'Plaj',
    'shopping mall': 'AVM',
    'city center': 'Merkez',
  };

  return (
    <div style={{
      position: 'absolute',
      top: 200,
      left: 40,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      {placeElements.map((place, index) => {
        const opacity = interpolate(
          frame,
          [120 + index * 30, 150 + index * 30],
          [0, 1],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
        );
        
        const translateX = interpolate(
          frame,
          [120 + index * 30, 150 + index * 30],
          [-50, 0],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
        );

        return (
          <div key={index} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 16px',
            backgroundColor: 'rgba(17, 17, 17, 0.8)',
            borderRadius: 12,
            border: '1px solid rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(20px)',
            opacity,
            transform: `translateX(${translateX}px)`,
          }}>
            <div style={{
              padding: 8,
              borderRadius: 8,
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
            }}>
              <span style={{ fontSize: 16 }}>📍</span>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ 
                fontSize: 14, 
                fontWeight: 600, 
                color: 'white',
                margin: 0,
              }}>
                {place.name}
              </p>
              <p style={{ 
                fontSize: 12, 
                color: '#888',
                margin: 0,
              }}>
                {typeLabels[place.type] || place.type}
              </p>
            </div>
            <span style={{ 
              fontSize: 12, 
              color: '#ef4444',
              fontWeight: 600,
            }}>
              {place.unit === 'km' ? `${place.distance.toFixed(1)} km` : `${place.distance} m`}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function RemotionVideoComposition({
  parcelName,
  description,
  narrationText,
  consultantProfile,
  brandingOptions,
  nearbyPlaces,
  mapImageUrl,
  duration = 30,
}: RemotionVideoCompositionProps) {
  const frame = useCurrentFrame();
  const config = useVideoConfig();

  const progress = interpolate(
    frame,
    [0, config fps * duration],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const mapOpacity = interpolate(
    frame,
    [0, 30],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const titleOpacity = interpolate(
    frame,
    [30, 60],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const titleScale = interpolate(
    frame,
    [30, 60],
    [0.8, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <div style={{
      width: config.width,
      height: config.height,
      backgroundColor: BACKGROUND,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Map Background */}
      {mapImageUrl ? (
        <img
          src={mapImageUrl}
          alt="Map"
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: mapOpacity,
          }}
        />
      ) : (
        <div style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #0a0a0a 50%, #16213e 100%)',
          opacity: mapOpacity,
        }} />
      )}

      {/* Title */}
      <div style={{
        position: 'absolute',
        top: 80,
        left: 40,
        right: 40,
        opacity: titleOpacity,
        transform: `scale(${titleScale})`,
      }}>
        <h1 style={{
          fontSize: 42,
          fontWeight: 800,
          color: 'white',
          margin: 0,
          textShadow: '0 2px 20px rgba(0,0,0,0.5)',
        }}>
          {parcelName}
        </h1>
        {description && (
          <p style={{
            fontSize: 20,
            color: 'rgba(255,255,255,0.7)',
            margin: '12px 0 0',
          }}>
            {description}
          </p>
        )}
      </div>

      {/* Nearby Places */}
      {nearbyPlaces.length > 0 && (
        <NearbyPlacesOverlay places={nearbyPlaces} frame={frame} />
      )}

      {/* Consultant Overlay */}
      <ConsultantOverlay 
        profile={consultantProfile} 
        brandingOptions={brandingOptions}
        frame={frame}
      />

      {/* Progress Bar */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.1)',
      }}>
        <div style={{
          width: `${progress * 100}%`,
          height: '100%',
          backgroundColor: '#ef4444',
        }} />
      </div>
    </div>
  );
}

export { RESOLUTION };
export default RemotionVideoComposition;