/** PATCH /media/id/:id body: the gallery's description and its complete tag set. */
export interface GalleryUpdateDto {
    description?: string;
    tags: string[];
}

/** PUT /media/image/id/:id body. */
export interface ImageUpdateDto {
    description?: string;
    primaryImage?: number;
}

/** POST /media/tag/new body. */
export interface TagDto {
    id?: string;
    name: string;
    description: string;
}
