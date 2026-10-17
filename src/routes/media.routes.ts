import { H3 } from "h3";
import { GalleryController } from "../controllers/gallery.controller";
import { ImageController } from "../controllers/image.controller";
import { TagController } from "../controllers/tag.controller";

const mediaRouter = new H3();

// Routes that share a path (e.g. GET/PUT/DELETE /image/id/:id) must use the same param name:
// h3 merges them into one route and only the first-registered name is ever returned.

// Gallery
mediaRouter.post("/id/:id",                                                              GalleryController.apiGetGalleryById);
mediaRouter.patch("/id/:id",                                                             GalleryController.apiUpdateGalleryById);
mediaRouter.post("/page-index/:pageIndex/page-size/:pageSize/:sort/:order",           GalleryController.apiGetAllGalleries);
mediaRouter.post("/publish",                                                             GalleryController.apiPublishGallery);

// Image
mediaRouter.get("/image/gallery/:imagesByGalleryId/:pageIndex/:pageSize/:sort/:order",                  ImageController.apiGetAllImagesByGallery);
//mediaRouter.post("/image/id/:id/reorder",                                                      ImageController.apiImagesOrder);
mediaRouter.post("/id/:galleryId/update/:id/order/:order",                              ImageController.apiUpdateOrderImage);
mediaRouter.get("/primary/logged/:logged",                                               ImageController.apiGetAllPrimaryImages);
mediaRouter.get("/tag/list/frontend",                                                    ImageController.apiGetAllPrimaryImages);
mediaRouter.post("/image/page-index/:pageIndex/page-size/:pageSize/:sort/:order",     ImageController.apiGetAllImages);
mediaRouter.get("/image/id/:id",                                                         ImageController.apiGetImage);
mediaRouter.put("/image/id/:id",                                                         ImageController.apiUpdateImage);
mediaRouter.delete("/image/id/:id",                                                      ImageController.apiDeleteImage);

// Tag
mediaRouter.post("/tag/page-index/:pageIndex/page-size/:pageSize/:sort/:query",       TagController.apiGetAllTags);
mediaRouter.post("/tag/list",                                                            TagController.apiGetAllTagsAsLabelValues);
mediaRouter.post("/tag/new",                                                             TagController.apiCreateTag);
/*

// Temporary: catch-all debug route — add this FIRST
mediaRouter.get("/**", defineEventHandler((event) => {
    console.log("mediaRouter HIT:", event.path);
    return { path: event.path };
}));
*/

export { mediaRouter };