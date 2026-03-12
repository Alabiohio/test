import { createClient } from "@/lib/supabase-server";
import { JobsContent } from "./JobsContent";

export default async function JobsPage() {
    const supabase = await createClient();

    const { data: jobs, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching jobs in server component:", error);
    }

    return <JobsContent initialJobs={jobs || []} />;
}
