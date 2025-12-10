import productRepository, { IProductRepository } from '../../repositories/product.repository';
import AppError from '../../utils/AppError';
import storage from '../../services/storage/storageFactory';
import productTransformer from '../../utils/transformers/product.transformer';
import { IImage } from '../../models/product.model';
import { ServiceResponse, ServiceResponseWithPagination } from '../../types/service.types';

const MAX_IMAGES = 5;

const DEFAULT_IMAGE = {
  url: 'https://res.cloudinary.com/da8t2uqtc/image/upload/v1759800581/unnamed_ccmpf2.jpg',
  public_id: 'unnamed_ccmpf2',
};

export interface IProductAdminService {
  createProduct(rawProductData: any, files?: any[]): Promise<ServiceResponse<any>>;
  listProducts(queryParams: any): Promise<ServiceResponseWithPagination<any[]>>;
  productDetails(productId: string): Promise<ServiceResponse<any>>;
  updateProduct(productId: string, updateData: any): Promise<ServiceResponse<any>>;
  deleteProduct(productId: string): Promise<ServiceResponse<null>>;
  updateProductImages(productId: string, ids: any): Promise<ServiceResponse<any>>;
  addProductImages(productId: string, rawData: any, files?: any[]): Promise<ServiceResponse<any>>;
  deleteProductImages(productId: string, ids: any): Promise<ServiceResponse<any>>;
}

export class ProductAdminService implements IProductAdminService {
  constructor(private productRepository: IProductRepository) {}

  private async normalizeImage(img: any) {
    if (img.public_id) {return img;}
    if (img.url) {return await storage.uploadFromUrl(img.url);}
    throw new AppError('Imagem inválida ou URL incorreta', 400);
  }

  // -------------------- CREATE PRODUCT --------------------
  async createProduct(rawProductData: any, files?: any[]) {
    const productData = { ...rawProductData };

    if (productData.images && typeof productData.images === 'string') {
      try {
        productData.images = JSON.parse(productData.images);
      } catch (err) {
        throw new AppError('Campo images inválido', 400);
      }
    }

    const images: any[] = [];

    const totalImagesIncoming =
      (files?.length || 0) + (Array.isArray(productData.images) ? productData.images.length : 0);
    if (totalImagesIncoming > MAX_IMAGES) {
      throw new AppError(`Produto não pode ter mais de ${MAX_IMAGES} imagens`, 400);
    }

    // Upload de arquivos
    if (files && files.length > 0) {
      const uploadedFiles = await Promise.all(
        files.map((file) => storage.uploadFromBuffer(file.buffer, Date.now().toString()))
      );
      images.push(...uploadedFiles);
    }

    // Upload de URLs
    if (productData.images && Array.isArray(productData.images)) {
      const uploadedUrls = await Promise.all(productData.images.map(this.normalizeImage));
      images.push(...uploadedUrls);
    }

    if (images.length === 0) {images.push(DEFAULT_IMAGE);}

    const newProduct = { ...productData, images };
    const product = await this.productRepository.create(newProduct);

    return {
      data: productTransformer.transformProductForAdmin(product),
      message: 'Produto criado com sucesso.',
      details: null,
    };
  }

  // -------------------- LIST PRODUCTS --------------------
  async listProducts(queryParams: any) {
    const filters: any = {};
    if (queryParams.search) {filters.name = { $regex: queryParams.search, $options: 'i' };}

    const limit = parseInt(queryParams.limit, 10) || 10;
    const page = parseInt(queryParams.page, 10) || 1;
    const skip = (page - 1) * limit;

    const sortField = queryParams.sortBy || 'createdAt';
    const sortOrder = queryParams.order || 'desc';
    const options = { limit, skip, sort: { [sortField]: sortOrder } as any };

    const { products, total } = await this.productRepository.findAllAdmin(filters, options);
    const productsTransformed = products.map(productTransformer.transformProductForAdmin);

    return {
      data: productsTransformed,
      message: 'Produtos retornados com sucesso.',
      details: {
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        limit,
      },
    };
  }

  // -------------------- PRODUCT DETAILS --------------------
  async productDetails(productId: string) {
    const product = await this.productRepository.findByIdPublic(productId);
    if (!product) {throw new AppError('Produto não encontrado.', 404);}

    return {
      data: productTransformer.transformProductForAdmin(product),
      message: 'Detalhes do produto retornados com sucesso.',
      details: null,
    };
  }

  // -------------------- UPDATE PRODUCT --------------------
  async updateProduct(productId: string, updateData: any) {
    const product = await this.productRepository.updateById(productId, updateData);
    if (!product) {throw new AppError('Produto não encontrado.', 404);}

    return {
      data: productTransformer.transformProductForAdmin(product),
      message: 'Produto atualizado com sucesso.',
      details: null,
    };
  }

  // -------------------- DELETE PRODUCT --------------------
  async deleteProduct(productId: string) {
    const product = await this.productRepository.hardDeleteById(productId);
    if (!product) {throw new AppError('Produto não encontrado.', 404);}

    return {
      data: null,
      message: 'Produto removido com sucesso.',
      details: null,
    };
  }

  // -------------------- UPDATE PRODUCT IMAGES --------------------
  async updateProductImages(productId: string, ids: any) {
    const product = await this.productRepository.findByIdAdmin(productId);
    if (!product) {throw new AppError('Produto não encontrado', 404);}

    const currentIds = product.images.map((img) => img._id?.toString());

    // Se veio errado (ex: { order: [...] }), proteger:
    const idsToOrder: string[] = Array.isArray(ids) ? ids : ids.ids;

    if (!Array.isArray(idsToOrder)) {
      throw new AppError('Formato inválido para ordenação de imagens', 400);
    }

    if (currentIds.length !== idsToOrder.length) {
      throw new AppError(
        'Número de imagens enviado não corresponde ao número de imagens do produto',
        400
      );
    }

    const hasDuplicates = new Set(idsToOrder).size !== idsToOrder.length;
    if (hasDuplicates) {
      throw new AppError('Não é permitido repetir a mesma imagem na ordenação', 400);
    }

    const allExist = idsToOrder.every((id) => currentIds.includes(id));
    if (!allExist) {
      throw new AppError('Foram enviados IDs de imagens que não pertencem a este produto', 400);
    }

    const reorderedImages = idsToOrder.map((id) =>
      product.images.find((img) => img._id?.toString() === id)
    );

    const mainImageUrl = reorderedImages[0]?.url;

    const updatedProduct = await this.productRepository.updateById(productId, {
      images: reorderedImages as any[],
      mainImageUrl: mainImageUrl,
    });

    if (!updatedProduct) {throw new AppError('Erro ao atualizar imagens', 500);}

    return {
      data: productTransformer.transformProductForAdmin(updatedProduct),
      message: 'Imagens reordenadas com sucesso',
    };
  }

  // -------------------- ADD PRODUCT IMAGES --------------------
  async addProductImages(productId: string, rawData: any, files?: any[]) {
    const product = await this.productRepository.findByIdAdmin(productId);
    if (!product) {throw new AppError('Produto não encontrado', 404);}

    const productData = { ...rawData };
    if (productData.images && typeof productData.images === 'string') {
      try {
        productData.images = JSON.parse(productData.images);
      } catch (err) {
        throw new AppError('Campo images inválido', 400);
      }
    }

    const imagesToAdd: any[] = [];
    const totalNewImages =
      (files?.length || 0) + (Array.isArray(productData.images) ? productData.images.length : 0);

    if (product.images.length + totalNewImages > MAX_IMAGES) {
      throw new AppError(`Produto não pode ter mais de ${MAX_IMAGES} imagens`, 400);
    }

    if (files && files.length > 0) {
      const uploadedFiles = await Promise.all(
        files.map((file) => storage.uploadFromBuffer(file.buffer, Date.now().toString()))
      );
      imagesToAdd.push(...uploadedFiles);
    }

    if (productData.images && Array.isArray(productData.images)) {
      const uploadedUrls = await Promise.all(productData.images.map(this.normalizeImage));
      imagesToAdd.push(...uploadedUrls);
    }

    if (imagesToAdd.length === 0) {throw new AppError('Nenhuma imagem enviada', 400);}

    product.images.push(...imagesToAdd);
    await this.productRepository.updateById(productId, product);

    return {
      message: 'Imagens adicionadas com sucesso',
      data: productTransformer.transformProductForAdmin(product),
      details: null,
    };
  }

  // -------------------- DELETE PRODUCT IMAGES --------------------
  async deleteProductImages(productId: string, ids: any) {
    const product = await this.productRepository.findByIdAdmin(productId);
    if (!product) {throw new AppError('Produto não encontrado', 404);}

    const currentIds = product.images.map((img) => img._id?.toString());

    // Normalizar: aceitar tanto req.body.ids quanto array puro
    const idsToDelete: string[] = Array.isArray(ids) ? ids : ids?.ids;

    if (!Array.isArray(idsToDelete)) {
      throw new AppError(
        'Formato inválido: esperado { "ids": ["id1","id2"] } ou um array direto',
        400
      );
    }

    if (idsToDelete.length === 0) {
      throw new AppError('É necessário enviar pelo menos um _id de imagem para remover', 400);
    }

    const allExist = idsToDelete.every((id) => currentIds.includes(id));
    if (!allExist) {
      throw new AppError('Foram enviados _ids de imagens que não pertencem a este produto', 400);
    }

    const remainingImages: any[] = [];
    const removedImages: any[] = [];

    product.images.forEach((img) => {
      if (idsToDelete.includes(img._id?.toString()!)) {
        removedImages.push(img);
      } else {
        remainingImages.push(img);
      }
    });

    if (removedImages.length === 0) {
      throw new AppError('Nenhuma imagem encontrada para remover. Verifique os _ids enviados', 400);
    }

    // Antes de deletar do Cloudinary, verificar se outras entidades usam essa mesma public_id
    for (const img of removedImages) {
      const otherProducts = await this.productRepository.findByImagePublicId(
        img.public_id,
        productId
      );
      if (otherProducts.length === 0) {
        await storage.delete(img.public_id);
      }
    }

    // Atualizar produto no banco
    product.images = remainingImages as any;
    product.mainImageUrl = remainingImages[0]?.url || null;

    await this.productRepository.updateById(productId, product);

    return {
      message: 'Imagens removidas com sucesso',
      data: productTransformer.transformProductForAdmin(product),
    };
  }
}

export default new ProductAdminService(productRepository);
