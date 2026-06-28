import { useEffect, useState } from "react";
import type { GettyImageRef } from "../types/gettyImages";
import { lookupGettyEditorialImage } from "../services/GettyImagesClient";

/** Cold tier — fetch editorial image once per phrase. */
export function useGettyImage(phrase: string | null | undefined): {
  image: GettyImageRef | null;
  loading: boolean;
} {
  const [image, setImage] = useState<GettyImageRef | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const query = phrase?.trim();
    if (!query) {
      setImage(null);
      setLoading(false);
      return;
    }

    const ac = new AbortController();
    setLoading(true);

    void lookupGettyEditorialImage(query).then((result) => {
      if (ac.signal.aborted) return;
      setImage(result);
      setLoading(false);
    });

    return () => ac.abort();
  }, [phrase]);

  return { image, loading };
}
