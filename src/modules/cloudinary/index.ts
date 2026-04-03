import {
    AbstractFileProviderService,
    MedusaError,
  } from "@medusajs/framework/utils"
  import {
    FileTypes,
    Logger,
  } from "@medusajs/framework/types"
  import { v2 as cloudinary } from "cloudinary"
  import { Readable } from "stream"
  
  type CloudinaryOptions = {
    cloud_name: string
    api_key: string
    api_secret: string
  }
  
  export class CloudinaryFileService extends AbstractFileProviderService {
    static identifier = "cloudinary"
  
    private logger_: Logger
  
    constructor({ logger }: { logger: Logger }, options: CloudinaryOptions) {
      super()
      this.logger_ = logger
  
      cloudinary.config({
        cloud_name: options.cloud_name,
        api_key: options.api_key,
        api_secret: options.api_secret,
        secure: true,
      })
    }
  
    async upload(
      file: FileTypes.ProviderUploadFileDTO
    ): Promise<FileTypes.ProviderFileResultDTO> {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "abundish/products",
            resource_type: "auto",
            use_filename: true,
            unique_filename: true,
          },
          (error, result) => {
            if (error || !result) {
              this.logger_.error(`Cloudinary upload failed: ${error?.message}`)
              return reject(
                new MedusaError(
                  MedusaError.Types.UNEXPECTED_STATE,
                  `Cloudinary upload failed: ${error?.message}`
                )
              )
            }
            resolve({
              url: result.secure_url,
              key: result.public_id,
            })
          }
        )
  
        if (file.content) {
          // Buffer path
          const buffer = Buffer.isBuffer(file.content)
            ? file.content
            : Buffer.from(file.content as string, "binary")
          const readable = Readable.from(buffer)
          readable.pipe(uploadStream)
        } else {
          reject(
            new MedusaError(
              MedusaError.Types.INVALID_DATA,
              "No file content provided"
            )
          )
        }
      })
    }
  
    async delete(file: FileTypes.ProviderDeleteFileDTO): Promise<void> {
      try {
        await cloudinary.uploader.destroy(file.fileKey, {
          resource_type: "image",
        })
      } catch (e) {
        this.logger_.error(`Cloudinary delete failed: ${e.message}`)
      }
    }
  
    async getPresignedDownloadUrl(
      file: FileTypes.ProviderGetFileDTO
    ): Promise<string> {
      // Cloudinary URLs are already public — just reconstruct from public_id
      return cloudinary.url(file.fileKey, {
        secure: true,
        resource_type: "image",
      })
    }
  }
  
  export default CloudinaryFileService