export type Job = {
    id: string;
    title: string;
    description: string;
    budget: number;
    category: string;
    status: 'open' | 'in-progress' | 'completed';
    created_at: string;
    client_id: string;
    location?: string;
    skills_required?: string[];
    deadline?: string;
};

export type Profile = {
    id: string;
    username: string;
    full_name: string;
    avatar_url?: string;
    bio?: string;
    university?: string;
    role: 'student' | 'client' | 'admin';
    created_at: string;
    skills?: string[];
    social_links?: Record<string, string>;
};

export type Proposal = {
    id: string;
    job_id: string;
    freelancer_id: string;
    cover_letter: string;
    bid_amount: number;
    estimated_days: number;
    status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
    created_at: string;
    profiles?: Profile;
};

export type Notification = {
    id: string;
    user_id: string;
    title: string;
    message: string;
    link?: string;
    is_read: boolean;
    created_at: string;
};

export type Product = {
    id: string;
    title: string;
    description: string;
    price: number;
    category: string;
    location?: string;
    image_url: string;
    status: 'active' | 'sold';
    seller_id: string;
    created_at: string;
    profiles?: Profile;
};
export type Conversation = {
    id: string;
    participant_1: string;
    participant_2: string;
    job_id?: string;
    product_id?: string;
    last_message?: string;
    updated_at: string;
    created_at: string;
    profiles?: Profile; // Used for the "other" person in listings
    products?: Product;
    jobs?: Job;
    other_profile?: Profile;
    unread_count?: number;
    is_typing?: boolean;
};

export type Message = {
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    image_url?: string;
    is_read: boolean;
    created_at: string;
};
