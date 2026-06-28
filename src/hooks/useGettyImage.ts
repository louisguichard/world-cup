import { useEffect, useState } from "react";
import type { GettyImageRef } from "../types/gettyImages";
import { lookupGettyEditorialImage } from "../services/GettyImagesClient";

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

    let cancelled = false;
    setLoading(true);

    void lookupGettyEditorialImage(query).then((result) => {
      if (!cancelled) {
        setImage(result);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [phrase]);

  return { image, loading };
}
