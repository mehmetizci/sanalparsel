'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import type { FeatureCollection } from 'geojson';
import type { ConsultantProfile, DroneSettings, NearbyPlace } from '@/types';

interface ProjectState {
  step: number;
  parcelGeoJSON: FeatureCollection | null;
  parcelCenter: [number, number] | null;
  parcelName: string;
  customDescription: string;
  consultantProfile: Partial<ConsultantProfile>;
  droneSettings: DroneSettings;
  nearbyPlaces: NearbyPlace[];
  narrationText: string;
  isRendering: boolean;
  renderProgress: number;
  videoUrl: string | null;
}

interface ProjectActions {
  setStep: (step: number) => void;
  setParcel: (
    geojson: FeatureCollection,
    center: [number, number],
    name: string
  ) => void;
  setCustomDescription: (desc: string) => void;
  setConsultantProfile: (profile: Partial<ConsultantProfile>) => void;
  setDroneSettings: (settings: Partial<DroneSettings>) => void;
  setNearbyPlaces: (places: NearbyPlace[]) => void;
  setNarrationText: (text: string) => void;
  setRendering: (isRendering: boolean, progress?: number) => void;
  setVideoUrl: (url: string | null) => void;
  reset: () => void;
}

type ProjectContextType = ProjectState & ProjectActions;

const defaultDroneSettings: DroneSettings = {
  altitude: 200,
  duration: 45,
  resolution: { width: 1080, height: 1920, label: 'Dikey (9:16)', aspectRatio: '9:16' },
  cameraAngles: [
    { name: 'Kuzeydoğu', heading: 45, pitch: -30, altitude: 200, duration: 10 },
    { name: 'Güneybatı', heading: 225, pitch: -30, altitude: 200, duration: 10 },
    { name: 'Kuşbakışı', heading: 0, pitch: -90, altitude: 300, duration: 10 },
    { name: 'Alçak Uçuş', heading: 90, pitch: -15, altitude: 100, duration: 10 },
  ],
};

const initialState: ProjectState = {
  step: 0,
  parcelGeoJSON: null,
  parcelCenter: null,
  parcelName: '',
  customDescription: '',
  consultantProfile: {},
  droneSettings: defaultDroneSettings,
  nearbyPlaces: [],
  narrationText: '',
  isRendering: false,
  renderProgress: 0,
  videoUrl: null,
};

const ProjectContext = createContext<ProjectContextType>({
  ...initialState,
  setStep: () => {},
  setParcel: () => {},
  setCustomDescription: () => {},
  setConsultantProfile: () => {},
  setDroneSettings: () => {},
  setNearbyPlaces: () => {},
  setNarrationText: () => {},
  setRendering: () => {},
  setVideoUrl: () => {},
  reset: () => {},
});

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ProjectState>(initialState);

  const setStep = useCallback((step: number) => {
    setState((s) => ({ ...s, step }));
  }, []);

  const setParcel = useCallback(
    (geojson: FeatureCollection, center: [number, number], name: string) => {
      setState((s) => ({
        ...s,
        parcelGeoJSON: geojson,
        parcelCenter: center,
        parcelName: name,
      }));
    },
    []
  );

  const setCustomDescription = useCallback((desc: string) => {
    setState((s) => ({ ...s, customDescription: desc }));
  }, []);

  const setConsultantProfile = useCallback(
    (profile: Partial<ConsultantProfile>) => {
      setState((s) => ({
        ...s,
        consultantProfile: { ...s.consultantProfile, ...profile },
      }));
    },
    []
  );

  const setDroneSettings = useCallback(
    (settings: Partial<DroneSettings>) => {
      setState((s) => ({
        ...s,
        droneSettings: { ...s.droneSettings, ...settings },
      }));
    },
    []
  );

  const setNearbyPlaces = useCallback((places: NearbyPlace[]) => {
    setState((s) => ({ ...s, nearbyPlaces: places }));
  }, []);

  const setNarrationText = useCallback((text: string) => {
    setState((s) => ({ ...s, narrationText: text }));
  }, []);

  const setRendering = useCallback(
    (isRendering: boolean, progress?: number) => {
      setState((s) => ({
        ...s,
        isRendering,
        renderProgress: progress ?? s.renderProgress,
      }));
    },
    []
  );

  const setVideoUrl = useCallback((url: string | null) => {
    setState((s) => ({ ...s, videoUrl: url }));
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return (
    <ProjectContext.Provider
      value={{
        ...state,
        setStep,
        setParcel,
        setCustomDescription,
        setConsultantProfile,
        setDroneSettings,
        setNearbyPlaces,
        setNarrationText,
        setRendering,
        setVideoUrl,
        reset,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjectStore() {
  return useContext(ProjectContext);
}
