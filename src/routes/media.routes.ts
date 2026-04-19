import { createRouter, defineEventHandler } from "h3";
import { GalleryController } from "../controllers/gallery.controller";
import { ImageController } from "../controllers/image.controller";
import { TagController } from "../controllers/tag.controller";

const mediaRouter = createRouter();

// Gallery
mediaRouter.post("/id/:getGalleryId",                                                              defineEventHandler(GalleryController.apiGetGalleryById));
mediaRouter.patch("/id/:updateGalleryId",                                                             defineEventHandler(GalleryController.apiUpdateGalleryById));
mediaRouter.post("/page-index/:pageIndex/page-size/:pageSize/:sort/:order",           defineEventHandler(GalleryController.apiGetAllGalleries));
mediaRouter.post("/publish",                                                             defineEventHandler(GalleryController.apiPublishGallery));

// Image
mediaRouter.get("/image/id/:imagesByGalleryId/:pageIndex/:pageSize/:sort/:order",                  defineEventHandler(ImageController.apiGetAllImagesByGallery));
//mediaRouter.post("/image/id/:id/reorder",                                                      defineEventHandler(ImageController.apiImagesOrder));
mediaRouter.post("/id/:galleryId/update/:id/order/:order",                              defineEventHandler(ImageController.apiUpdateOrderImage));
mediaRouter.get("/primary/logged/:logged",                                               defineEventHandler(ImageController.apiGetAllPrimaryImages));
mediaRouter.get("/tag/list/frontend",                                                    defineEventHandler(ImageController.apiGetAllPrimaryImages));
mediaRouter.post("/image/page-index/:pageIndex/page-size/:pageSize/:sort/:order",     defineEventHandler(ImageController.apiGetAllImages));
mediaRouter.get("/image/id/:getImageId",                                                         defineEventHandler(ImageController.apiGetImage));
mediaRouter.put("/image/id/:updateImageId",                                                         defineEventHandler(ImageController.apiUpdateImage));
mediaRouter.delete("/image/id/:deleteImageIder",                                                      defineEventHandler(ImageController.apiDeleteImage));

// Tag
mediaRouter.post("/tag/page-index/:pageIndex/page-size/:pageSize/:sort/:query",       defineEventHandler(TagController.apiGetAllTags));
mediaRouter.post("/tag/list",                                                            defineEventHandler(TagController.apiGetAllTagsAsLabelValues));
mediaRouter.post("/tag/new",                                                             defineEventHandler(TagController.apiCreateTag));
/*

// Temporary: catch-all debug route — add this FIRST
mediaRouter.get("/**", defineEventHandler((event) => {
    console.log("mediaRouter HIT:", event.path);
    return { path: event.path };
}));
*/

export { mediaRouter };