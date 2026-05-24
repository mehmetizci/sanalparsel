-- SanalParsel Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    full_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    office_name TEXT,
    office_logo_url TEXT,
    office_address TEXT,
    license_no TEXT,
    default_show_name BOOLEAN DEFAULT true,
    default_show_phone BOOLEAN DEFAULT true,
    default_show_logo BOOLEAN DEFAULT true,
    default_show_avatar BOOLEAN DEFAULT false,
    default_show_license BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id)
);

-- Projects table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    short_title TEXT,
    geojson JSONB,
    properties JSONB,
    city TEXT,
    district TEXT,
    neighborhood TEXT,
    block_no TEXT,
    parcel_no TEXT,
    area TEXT,
    property_type TEXT,
    center_lat DOUBLE PRECISION,
    center_lon DOUBLE PRECISION,
    custom_note TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'analysis_ready', 'video_ready', 'completed')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Project settings table
CREATE TABLE project_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    duration INTEGER DEFAULT 30,
    height INTEGER DEFAULT 300,
    camera_modes TEXT[] DEFAULT ARRAY['orbit_360', 'spiral_descent'],
    camera_style TEXT DEFAULT 'cinematic',
    video_format TEXT DEFAULT 'reels',
    show_logo BOOLEAN DEFAULT true,
    show_name BOOLEAN DEFAULT true,
    show_phone BOOLEAN DEFAULT true,
    show_avatar BOOLEAN DEFAULT false,
    show_office BOOLEAN DEFAULT false,
    show_license BOOLEAN DEFAULT false,
    show_parcel_info BOOLEAN DEFAULT true,
    show_environment BOOLEAN DEFAULT true,
    show_subtitles BOOLEAN DEFAULT true,
    show_final_card BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(project_id)
);

-- Environment items table
CREATE TABLE environment_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    distance TEXT,
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION,
    selected BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    source TEXT DEFAULT 'osm',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Narrations table
CREATE TABLE narrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    text TEXT,
    tone TEXT DEFAULT 'corporate',
    voice_type TEXT DEFAULT 'female',
    audio_url TEXT,
    duration INTEGER,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(project_id)
);

-- Videos table
CREATE TABLE videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    video_url TEXT,
    thumbnail_url TEXT,
    format TEXT DEFAULT 'reels',
    duration INTEGER DEFAULT 30,
    status TEXT DEFAULT 'preparing' CHECK (status IN ('preparing', 'audio_creating', 'rendering', 'finalizing', 'completed', 'error')),
    render_error TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Credits table
CREATE TABLE credits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    amount INTEGER NOT NULL,
    source TEXT DEFAULT 'purchase',
    payment_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Payments table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    provider TEXT DEFAULT 'iyzico',
    package_name TEXT,
    amount DECIMAL(10,2),
    currency TEXT DEFAULT 'TRY',
    status TEXT DEFAULT 'pending',
    conversation_id TEXT,
    raw_response JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security (RLS)

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE environment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE narrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Profiles RLS
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Projects RLS
CREATE POLICY "Users can view own projects" ON projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own projects" ON projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own projects" ON projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own projects" ON projects FOR DELETE USING (auth.uid() = user_id);

-- Project settings RLS
CREATE POLICY "Users can view settings for own projects" ON project_settings FOR SELECT USING (
    EXISTS (SELECT 1 FROM projects WHERE id = project_id AND user_id = auth.uid())
);
CREATE POLICY "Users can manage settings for own projects" ON project_settings FOR ALL USING (
    EXISTS (SELECT 1 FROM projects WHERE id = project_id AND user_id = auth.uid())
);

-- Environment items RLS
CREATE POLICY "Users can view items for own projects" ON environment_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM projects WHERE id = project_id AND user_id = auth.uid())
);
CREATE POLICY "Users can manage items for own projects" ON environment_items FOR ALL USING (
    EXISTS (SELECT 1 FROM projects WHERE id = project_id AND user_id = auth.uid())
);

-- Narrations RLS
CREATE POLICY "Users can view narrations for own projects" ON narrations FOR SELECT USING (
    EXISTS (SELECT 1 FROM projects WHERE id = project_id AND user_id = auth.uid())
);
CREATE POLICY "Users can manage narrations for own projects" ON narrations FOR ALL USING (
    EXISTS (SELECT 1 FROM projects WHERE id = project_id AND user_id = auth.uid())
);

-- Videos RLS
CREATE POLICY "Users can view own videos" ON videos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own videos" ON videos FOR ALL USING (auth.uid() = user_id);

-- Credits RLS
CREATE POLICY "Users can view own credits" ON credits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own credits" ON credits FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Payments RLS
CREATE POLICY "Users can view own payments" ON payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own payments" ON payments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Functions

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (user_id, full_name)
    VALUES (new.id, new.raw_user_meta_data->>'full_name');
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auto-creating profile
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Indexes for performance
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_videos_user_id ON videos(user_id);
CREATE INDEX idx_videos_project_id ON videos(project_id);
CREATE INDEX idx_credits_user_id ON credits(user_id);
CREATE INDEX idx_environment_items_project_id ON environment_items(project_id);
CREATE INDEX idx_narrations_project_id ON narrations(project_id);

-- Storage buckets (run in Supabase dashboard or via API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('videos', 'videos', true);