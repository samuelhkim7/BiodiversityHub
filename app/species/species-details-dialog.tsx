import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { createBrowserSupabaseClient } from "@/lib/client-utils";
import { type Database } from "@/lib/schema";
import { zodResolver } from "@hookform/resolvers/zod";
// import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type BaseSyntheticEvent, type MouseEvent } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

type Species = Database["public"]["Tables"]["species"]["Row"] & {
  author_display_name?: string;
};

const kingdoms = z.enum(["Animalia", "Plantae", "Fungi", "Protista", "Archaea", "Bacteria"]);

// Use Zod to define the shape + requirements of a Species entry; used in form validation
const speciesSchema = z.object({
  scientific_name: z
    .string()
    .trim()
    .min(1)
    .transform((val) => val?.trim()),
  common_name: z
    .string()
    .nullable()
    // Transform empty string or only whitespace input to null before form submission, and trim whitespace otherwise
    .transform((val) => (!val || val.trim() === "" ? null : val.trim())),
  kingdom: kingdoms,
  total_population: z.number().int().positive().min(1).nullable(),
  image: z
    .string()
    .url()
    .nullable()
    // Transform empty string or only whitespace input to null before form submission, and trim whitespace otherwise
    .transform((val) => (!val || val.trim() === "" ? null : val.trim())),
  description: z
    .string()
    .nullable()
    // Transform empty string or only whitespace input to null before form submission, and trim whitespace otherwise
    .transform((val) => (!val || val.trim() === "" ? null : val.trim())),
});

type FormData = z.infer<typeof speciesSchema>;

export default function SpeciesDetailsDialog({ species, currentUser }: { species: Species; currentUser: string }) {
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);

  const [authorDisplayName, setAuthorDisplayName] = useState<string | undefined>(species.author_display_name);

  const navigateToDetails = () => {
    router.push("/species/" + species.id);
  };

  // Fetch author's display name
  useEffect(() => {
    const fetchAuthorDisplayName = async () => {
      const supabase = createBrowserSupabaseClient();
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", species.author)
          .single();

        if (error) {
          toast({
            title: "Error fetching author's display name.",
            description: error.message,
            variant: "destructive",
          });
        } else {
          setAuthorDisplayName(data?.display_name);
        }
      } catch (error) {
        console.error("Could not fetch species details:", error);
      }
    };

    // If authorDisplayName is not already set, fetch it.
    if (!authorDisplayName) {
      void fetchAuthorDisplayName();
    }
  }, [species.author, authorDisplayName]);

  const defaultValues: Partial<FormData> = {
    scientific_name: species.scientific_name,
    common_name: species.common_name,
    kingdom: species.kingdom,
    total_population: species.total_population,
    image: species.image,
    description: species.description,
  };
  const form = useForm<FormData>({
    resolver: zodResolver(speciesSchema),
    defaultValues,
    mode: "onChange",
  });

  const onSubmit = async (input: FormData) => {
    const supabase = createBrowserSupabaseClient();

    const { error } = await supabase.from("species").update(input).eq("id", species.id);

    if (error) {
      return toast({
        title: "Something went wrong.",
        description: error.message,
        variant: "destructive",
      });
    }

    setIsEditing(false);

    form.reset(input);

    router.refresh();

    return toast({
      title: "Changes saved!",
      description: "Saved your changes to " + input.scientific_name + ".",
    });
  };

  const startEditing = (e: MouseEvent) => {
    e.preventDefault();
    setIsEditing(true);
  };

  const handleCancel = (e: MouseEvent) => {
    e.preventDefault();
    if (!window.confirm("Revert all unsaved changes?")) {
      return;
    }
    form.reset(defaultValues);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this species? This action cannot be undone.")) {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.from("species").delete().eq("id", species.id);

      if (error) {
        alert("An error occurred while deleting the species.");
      }

      router.refresh(); // Refresh the page or navigate away after deletion
      setIsEditing(false);

      return toast({
        title: "Species deleted successfully.",
        description: "The species" + species.scientific_name + "has been deleted.",
      });
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="mt-3 w-full">Learn More</Button>
      </DialogTrigger>
      <DialogContent className="max-h-screen overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{species.scientific_name}</DialogTitle>
          {species.common_name && <DialogDescription>{species.common_name}</DialogDescription>}
          {authorDisplayName && <p className="mt-2 text-sm">Species Author: {authorDisplayName}</p>}
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={(e: BaseSyntheticEvent) => void form.handleSubmit(onSubmit)(e)}>
            <div className="grid w-full items-center gap-4">
              <FormField
                control={form.control}
                name="scientific_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scientific Name</FormLabel>
                    <FormControl>
                      <Input readOnly={!isEditing} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="common_name"
                render={({ field }) => {
                  // We must extract value from field and convert a potential defaultValue of `null` to "" because inputs can't handle null values: https://github.com/orgs/react-hook-form/discussions/4091
                  const { value, ...rest } = field;
                  return (
                    <FormItem>
                      <FormLabel>Common Name</FormLabel>
                      <FormControl>
                        <Input readOnly={!isEditing} value={value ?? ""} {...rest} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              <FormField
                control={form.control}
                name="kingdom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kingdom</FormLabel>
                    <Select onValueChange={(value) => field.onChange(kingdoms.parse(value))} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>

                      <SelectContent>
                        <SelectGroup>
                          {kingdoms.options.map((kingdom, index) => (
                            <SelectItem key={index} value={kingdom}>
                              {kingdom}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="total_population"
                render={({ field }) => {
                  const { value, ...rest } = field;
                  return (
                    <FormItem>
                      <FormLabel>Total population</FormLabel>
                      <FormControl>
                        {/* Using shadcn/ui form with number: https://github.com/shadcn-ui/ui/issues/421 */}
                        <Input
                          readOnly={!isEditing}
                          type="number"
                          value={value ?? ""}
                          {...rest}
                          onChange={(event) => field.onChange(+event.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              <FormField
                control={form.control}
                name="image"
                render={({ field }) => {
                  // We must extract value from field and convert a potential defaultValue of `null` to "" because inputs can't handle null values: https://github.com/orgs/react-hook-form/discussions/4091
                  const { value, ...rest } = field;
                  return (
                    <FormItem>
                      <FormLabel>Image URL</FormLabel>
                      <FormControl>
                        <Input readOnly={!isEditing} value={value ?? ""} {...rest} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => {
                  // We must extract value from field and convert a potential defaultValue of `null` to "" because textareas can't handle null values: https://github.com/orgs/react-hook-form/discussions/4091
                  const { value, ...rest } = field;
                  return (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea readOnly={!isEditing} value={value ?? ""} {...rest} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              {species.author === currentUser && (
                <div className="flex">
                  {isEditing ? (
                    <>
                      <Button type="submit" className="ml-1 mr-1 flex-auto">
                        Confirm
                      </Button>
                      <Button onClick={handleCancel} type="button" className="ml-1 mr-1 flex-auto" variant="secondary">
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button onClick={startEditing} type="button" className="ml-1 mr-1 flex-auto">
                        Edit Species
                      </Button>
                      <Button
                        onClick={() => {
                          void handleDelete();
                        }}
                        type="button"
                        className="ml-1 mr-1 flex-auto"
                        variant="destructive"
                      >
                        Delete Species
                      </Button>
                    </>
                  )}
                </div>
              )}
              <Button onClick={navigateToDetails} className="my-4">
                View Full Details
              </Button>
            </div>
          </form>
          {/* Add the new button for linking to the species detail page */}
        </Form>
      </DialogContent>
    </Dialog>
  );
}
