import expressRouter from 'express';

const mediaRouter = expressRouter.Router();

import {GalleryController} from "../controllers/gallery.controller";
import { ImageController } from '../controllers/image.controller';
import { TagController } from '../controllers/tag.controller';
import {EventController} from "../controllers/event.controller";
import {eventRouter} from "./event.routes";

mediaRouter.post("/id/:id", GalleryController.apiGetGalleryById);
mediaRouter.patch("/id/:id", GalleryController.apiUpdateGalleryById);


mediaRouter.get("/id/:id/image/:pageIndex?/:pageSize?/:sort?/:order?", ImageController.apiGetAllImagesByGallery);
mediaRouter.post("/id/:id/reorder", ImageController.apiImagesOrder);
mediaRouter.post("/id/:galleryId/update/:id/order/:order", ImageController.apiUpdateOrderImage);

mediaRouter.get("/primary/logged/:logged", ImageController.apiGetAllPrimaryImages);
mediaRouter.get("/tag/list/frontend", ImageController.apiGetAllPrimaryImages);

mediaRouter.post("/page-index/:pageIndex/page-size/:pageSize?/:sort?/:order?", GalleryController.apiGetAllGalleries);
mediaRouter.post("/image/page-index/:pageIndex/page-size/:pageSize/:sort?/:order?", ImageController.apiGetAllImages);
mediaRouter.get("/image/id/:id", ImageController.apiGetImage);
mediaRouter.put("/image/id/:id", ImageController.apiUpdateImage);
mediaRouter.delete("/image/id/:id", ImageController.apiDeleteImage);


mediaRouter.post("/tag/page-index/:pageIndex/page-size/:pageSize/:sort?/:query?", TagController.apiGetAllTags);
mediaRouter.post("/tag/list", TagController.apiGetAllTagsAsLabelValues);

mediaRouter.post("/tag/new", TagController.apiCreateTag);

mediaRouter.post("/publish", GalleryController.apiPublishGallery);
export { mediaRouter };
