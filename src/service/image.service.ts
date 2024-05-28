
//declare var require: any
//const Buffer = require('buffer').Buffer;

class ImageService {
  private _PARAM_LOCATION = 'email';
  private _PARAM_FRONTCLOUD = 'https://d34wc8uzk8vrsx.cloudfront.net';

  constructor() { }

  loadImage600x300(image) {
    const resizedImage = this.resizeWithInS3(image, {
      "resize": {
        "width": 600,
        "height": 300,
        "fit": "cover"
      }
    });

    return `${this._PARAM_FRONTCLOUD}/${resizedImage}`;
  }

  loadImage200x200(image) {
    const resizedImage = this.resizeWithInS3(image, {
      "resize": {
        "width": 200,
        "height": 200,
        "fit": "cover"
      }
    });

    return `${this._PARAM_FRONTCLOUD}/${resizedImage}`;
  }

  /**
   * Setup Signature so that a specific bucket and key are resized with the resized serverless app that is running along with the edits
   * being applied
   * @param key
   * @param edits
   */
  public resizeWithInS3(key: string, edits: EditProperties) {

    if (this._PARAM_LOCATION) {
      key = `${this._PARAM_LOCATION}/${key}`;
    }

    const imageRequest = JSON.stringify({
      bucket: "tomvisions-original-images",
      key: key,
      edits: edits
    })

    return `${Buffer.from(imageRequest).toString('base64')}`;
}
}

export interface EditProperties {
  "resize": {
    width?: number,
    height?: number,
    fit?: string
  }
}

export const imageService = new ImageService();