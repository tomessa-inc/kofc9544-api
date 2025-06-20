import {galleryMapper, tagMapper, paramsOptions, eventMapper,} from "../mapper/";

export class GalleryController {


    /**
     * Calling all galleries
     * @param req
     * @param res
     * @param next
     */
    public static async apiGetAllGalleries(req: any, res: any, next: any) {
        try {
            //        if (!galleryMapper.checkAuthenication(req.headers.authorization)) {
            //        return res.status(500).json({error: 'Not Authorized to access the API'})
            //      }

            const options: paramsOptions = { pageIndex: 1, pageSize: 10, filterQuery: "", sort: galleryMapper.DEFAULT_SORT, order: galleryMapper.DEFAULT_ORDER };
                
            Object.entries(req.params).map(([key, value]) => {
                if (value !== 'undefined') {
                    if (isNaN(Number(value))) {
                        options[key] = value;
                    } else {
                        options[key] = Number(value);
                    }
                }
            })

            const galleries = await galleryMapper.getAllGalleries(options);

            if (typeof galleries === 'string') {
                return res.status(500).json({ errors_string: galleries })
            }
            const paginationResults = galleryMapper.prepareListResults(galleries, options);

            console.log("the galleies")
            console.log(paginationResults);
            return res.status(200).json(paginationResults);

        } catch (error) {
            res.status(500).json({ error_main: error.toString() })
        }

    }

    public static async apiPublishGallery(req: any, res: any, next: any) {
        await galleryMapper.publishGallery();

        return res.status(200).json({result:"success"});
    }

    /**
   * Updating gallery based on ID
   * @param req
   * @param res
   * @param next
   */
    public static async apiUpdateGalleryById(req: any, res: any, next: any) {
        try {
            //        if (!galleryMapper.checkAuthenication(req.headers.authorization)) {
            //        return res.status(500).json({error: 'Not Authorized to access the API'})
            //      }
            console.log("update")
            const options: paramsOptions = { id: "string" };

            if (req.params.id) {
                options.id = req.params.id;
            }

            const gallery = await galleryMapper.updateGallery(options, req.body);

            if (typeof gallery === 'string') {
                return res.status(500).json({ errors_string: gallery })
            }

            return res.status(200).json(gallery);

        } catch (error) {
            res.status(500).json({ error_main: error.toString() })
        }
    }

    /**
   * Retreiving gallery based on id
   * @param req
   * @param res
   * @param next
   */
    public static async apiGetGalleryById(req: any, res: any, next: any) {
        try {
            //        if (!galleryMapper.checkAuthenication(req.headers.authorization)) {
            //        return res.status(500).json({error: 'Not Authorized to access the API'})
            //      }
            const options: paramsOptions = { id: "string" };

            if (req.params.id) {
                options.id = req.params.id;
            }

            const gallery = (await galleryMapper.getGalleryById(options))[0];
        console.log("the gall")
            console.log(gallery);
            if (typeof gallery === 'string') {
                return res.status(500).json({ errors_string: gallery })
            }

            if (gallery.Tags === null) {
                gallery.Tags = []
            }
            gallery.Tags = gallery.Tags.map((tag) => {
                console.log({"label":tag.name, "value":tag.id})
                return {"label":tag.name, "value":tag.id}
            })

            return res.status(200).json(gallery);

        } catch (error) {
            res.status(500).json({ error_main: error.toString() })
        }
    }
}
