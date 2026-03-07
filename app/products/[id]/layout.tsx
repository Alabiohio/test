import { supabase } from "@/lib/supabase";
import { Metadata } from "next";

type Props = {
    params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;

    const { data: product } = await supabase
        .from("products")
        .select("title, description, image_url, price")
        .eq("id", id)
        .single();

    if (!product) {
        return {
            title: "Product Not Found | Campwork",
        };
    }

    return {
        title: `${product.title} - $${product.price} | Campwork`,
        description: product.description,
        openGraph: {
            title: product.title,
            description: product.description,
            images: [product.image_url],
            type: "website",
        },
        twitter: {
            card: "summary_large_image",
            title: product.title,
            description: product.description,
            images: [product.image_url],
        },
    };
}

export default function ProductLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
