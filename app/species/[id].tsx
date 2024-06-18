import { createBrowserSupabaseClient } from "@/lib/client-utils";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
// import { toast } from '@/components/ui/use-toast';
import { type Database } from "@/lib/schema";
import Image from "next/image";

type Species = Database["public"]["Tables"]["species"]["Row"] & {
  author_display_name?: string;
};

const SpeciesDetailPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const [species, setSpecies] = useState<Species | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSpecies = async () => {
      if (typeof id !== "number") return; // Do not proceed if the id is not a number

      setLoading(true);
      const supabase = createBrowserSupabaseClient();
      try {
        const { data, error } = await supabase.from("species").select("*").eq("id", id).single();

        if (error) {
          throw error;
        }
        setSpecies(data);
      } catch (error) {
        console.error("Could not fetch species details:", error);
        // Implement a toast notification or another form of error handling
      } finally {
        setLoading(false);
      }
    };

    void fetchSpecies();
  }, [id]);

  if (loading) return <div>Loading...</div>;
  if (!species) return <div>Species not found.</div>;

  return (
    <div>
      <h1>{species.scientific_name}</h1>
      {species.common_name && <p>{species.common_name}</p>}
      <p>Kingdom: {species.kingdom}</p>
      {species.total_population && <p>Total Population: {species.total_population}</p>}
      {species.image && <Image src={species.image} alt={species.scientific_name} width={500} height={300} />}
      <p>Description: {species.description}</p>
      {/* ... other species details ... */}
    </div>
  );
};

export default SpeciesDetailPage;
