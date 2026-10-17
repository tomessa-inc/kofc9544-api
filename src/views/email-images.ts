import { imageUrl } from "./image-url";

/** Logos and banners used in notification emails (stored under email/ in the image bucket). */
export const emailImages = {
    logo100: (file: string) => imageUrl(`email/${file}`, { resize: { width: 100, height: 100, fit: "cover" } }),
    logo200: (file: string) => imageUrl(`email/${file}`, { resize: { width: 200, height: 200, fit: "cover" } }),
    banner: (file: string) => imageUrl(`email/${file}`, { resize: { width: 600, height: 300, fit: "cover" } }),
};
